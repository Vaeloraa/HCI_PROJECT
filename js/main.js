/**ig
 * FocusFlow - Main Application Entry (Full Integration)
 * 
 * HCI Final Project: Adaptive Attention Management System for ADHD Readers
 * Based on WebGazer.js (Brown University)
 * 
 * Full 3-Member Integration Orchestrator:
 *   Member A (Perception + Cognition + Decision)
 *   Member B (Adaptive UI - ReadingView + VisualEffects)
 *   Member C (NLP - KeywordExtractor + Analytics)
 * 
 * This module initializes all subsystems and orchestrates the complete
 * data flow pipeline:
 *   Calibration → WebGazer / Mouse → Perception → Cognition → Decision → UI Effects
 *                                                                       → NLP Extraction
 *                                                                       → Analytics Logging
 */

// Global namespace
const FocusFlow = {};
FocusFlow.version = '2.3.0';

// Subsystem references
FocusFlow.perception = null;     // Member A: Gaze tracking
FocusFlow.cognition = null;      // Member A: State machine
FocusFlow.decision = null;       // Member A: Intervention logic
FocusFlow.readingView = null;    // Member B: Reading layout
FocusFlow.visualEffects = null;  // Member B: Adaptive UI
FocusFlow.focusMode = null;      // Member B: Focus mode manager
FocusFlow.debugPanel = null;     // Member B: Debug panel
FocusFlow.keywordExtractor = null; // Member C: NLP extraction
FocusFlow.analytics = null;      // Member C: Attention analytics
FocusFlow.calibration = null;    // Calibration manager
FocusFlow.calibrationData = null; // Calibration results

// Calibration offsets (adjust raw gaze to calibrated position)
FocusFlow.gazeOffsetX = 0;
FocusFlow.gazeOffsetY = 0;
FocusFlow.gazeScaleX = 1;
FocusFlow.gazeScaleY = 1;

// Configuration
FocusFlow.config = {
    debug: false,                    // Debug panel disabled by default
    demoMode: false,                 // Demo mode disabled by default
    useWebGazer: true,
    saveData: true,
    showGazeDot: true,               // Gaze dot visible by default
    trackingMode: 'gaze',
    
    // Calibration config
    calibrationEnabled: true,
    calibrationRequired: true,
    
    // Member B config
    highlightIntensity: 0.15,
    dimIntensity: 0.35,
    dimDelay: 3000,
    
    // Member C config
    keywordCount: 5,
    minWordLength: 3,
    dwellForKeywords: 8000,
};

// Gaze dot element reference
FocusFlow._gazeDotElement = null;
FocusFlow._gazeDotUI = null;

// Internal state
FocusFlow._gazeHistory = [];
FocusFlow._maxGazeHistory = 10;
FocusFlow._lastBlockIndex = -1;
FocusFlow._blockDwellStart = 0;
FocusFlow._blockChangeTime = 0;
FocusFlow._blockDwellForScroll = 0;
FocusFlow._keywordsShownForBlock = new Set();
FocusFlow._scrollDwellThreshold = 800;

FocusFlow._currentStateName = 'Normal';
FocusFlow._lastGazeTime = 0;
FocusFlow._offScreenStart = 0;
FocusFlow._wakeUpTriggered = false;
FocusFlow._lastDistractionPromptTime = 0;
FocusFlow._distractionPromptInterval = 5000;
FocusFlow._distractionAlertShown = false;
FocusFlow._lastStrugglePrompt = false;
FocusFlow._scrollDebounceTime = 600;
FocusFlow._wakeUpTimeoutMs = 8000;
FocusFlow._dimStartDelay = 1500;
FocusFlow._dimRampDuration = 3000;
FocusFlow._gazeOffBlockStart = 0;
FocusFlow._periodicPromptInterval = null;
FocusFlow._demoMouseHandler = null;
FocusFlow._demoScrollHandler = null;
FocusFlow._webGazerStarted = false;
FocusFlow._webGazerStarting = false;

// Gaze smoothing
FocusFlow._smoothedGazeX = 0;
FocusFlow._smoothedGazeY = 0;
FocusFlow._gazeSmoothFactor = 0.4;  // 0-1, higher = less smoothing
FocusFlow._gazeSamples = [];
FocusFlow._gazeSampleWindow = 5;     // Moving average window

/**
 * Initialize all FocusFlow subsystems
 */
FocusFlow.init = async function() {
    console.log('[FocusFlow] Initializing v' + this.version + '...');

    // 1. Initialize Member A: Perception Layer
    this.perception = new PerceptionModule(this.config);
    console.log('[FocusFlow] ✅ Member A - Perception Layer loaded');

    // 2. Initialize Member A: Cognitive State Machine
    this.cognition = new StateMachine(this.config);
    console.log('[FocusFlow] ✅ Member A - Cognitive State Machine loaded');

    // 3. Initialize Member A: Decision Module
    this.decision = new DecisionModule(this.config);
    console.log('[FocusFlow] ✅ Member A - Decision Layer loaded');

    // 4. Initialize Member B: Reading View
    this.readingView = new ReadingView(this.config);
    console.log('[FocusFlow] ✅ Member B - Reading View loaded');

    // 5. Initialize Member B: Visual Effects
    this.visualEffects = new VisualEffects(this.config);
    console.log('[FocusFlow] ✅ Member B - Visual Effects loaded');

    // 6. Initialize Member B: Focus Mode Manager
    this.focusMode = new FocusMode();
    console.log('[FocusFlow] ✅ Member B - Focus Mode Manager loaded');


    // 7. Initialize Member B: Debug Panel
    this.debugPanel = new DebugPanel();
    console.log('[FocusFlow] ✅ Member B - Debug Panel loaded');

    // 8. Initialize Member C: Keyword Extractor
    this.keywordExtractor = new KeywordExtractor(this.config);
    console.log('[FocusFlow] ✅ Member C - Keyword Extractor loaded');

    // 9. Initialize Member C: Attention Analytics
    this.analytics = new AttentionAnalytics(this.config);
    console.log('[FocusFlow] ✅ Member C - Attention Analytics loaded');

    // 8. Initialize the reading content with all block word counts
    this._initBlockWordCounts();

    // 9. Detect whether we are running in a secure context.
    //    getUserMedia (and therefore WebGazer's camera tracking) only works on
    //    https:// or http://localhost. Opening index.html directly via file://
    //    blocks the camera API, so we must warn the user and fall back to mouse.
    const isLocalFile = location.protocol === 'file:';
    const isSecureContext = !isLocalFile && (
        window.isSecureContext ||
        location.protocol === 'https:' ||
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1'
    );

    if (this.config.useWebGazer && !this.config.demoMode) {
        if (isLocalFile || !isSecureContext) {
            console.warn('[FocusFlow] ⚠️ Unsafe context (file:// or non-localhost); camera API unavailable');
            this._reportApiError(
                'WebGazer / Camera',
                'The page is opened through file://, so the browser blocks camera access',
                [
                    '• Use a local server instead (recommended):',
                    '   In the project folder, run  npx http-server -p 8080  or  python -m http.server 8080',
                    '   Then open  http://localhost:8080  in the browser',
                    '• Calibration will run in Mouse Mode; the 9 calibration points will still appear'
                ]
            );
            this.config.demoMode = false;
            this.config.useWebGazer = true;
            this.config.trackingMode = 'runtime-error';
            this._announceTrackingMode('runtime-error', 'file protocol blocks camera/model loading');
        } else {
            await this.startWebGazer();
        }

        // 10. Run the 9-point calibration regardless of webgazer/mouse mode.
        //     In mouse mode the user moves the cursor to each point; in webgazer
        //     mode they look at each point. Either way the 9 points are shown.
        if (this.config.calibrationEnabled && this.config.trackingMode === 'gaze') {
            await this._runCalibration();
        }

        // 11. Set up the real gaze listener (only if WebGazer actually started)
        if (this.config.trackingMode === 'gaze') {
            this._setupGazeListener();
        }
    } else {
        this.startDemoMode();

        // Still offer calibration in pure demo mode for a consistent experience
        if (this.config.calibrationEnabled) {
            await this._runCalibration();
        }
    }


    // 12. Show welcome prompt
    setTimeout(() => {
        this.visualEffects.showPrompt(
            '👋',
            'Welcome to FocusFlow!',
            'Your adaptive reading assistant. Start reading naturally.'
        );
    }, 1500);

    console.log('[FocusFlow] 🚀 All systems ready!');
};

/**
 * Initialize word counts for each paragraph block
 */
FocusFlow._initBlockWordCounts = function() {
    const blocks = this.readingView.blockElements;
    for (let i = 0; i < blocks.length; i++) {
        const text = blocks[i].textContent || '';
        const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
        this.analytics.setBlockWordCount(i, wordCount);
    }
};

/**
 * Run the 9-point calibration procedure
 * This asks the user to look at 9 points on screen to calibrate WebGazer
 */
FocusFlow._runCalibration = function() {
    return new Promise((resolve) => {
        console.log('[FocusFlow] 🎯 Starting 9-point calibration...');
        
        this.calibration = new CalibrationManager(this.config);
        
        this.calibration.start(
            // onComplete callback
            (calibrationData) => {
                if (calibrationData) {
                    // Calibration completed
                    this.calibrationData = calibrationData;
                    const results = this.calibration.getResults();
                    
                    if (results) {
                        // Calculate per-point offsets
                        const offsets = results.points.map(p => ({
                            targetX: p.targetX,
                            targetY: p.targetY,
                            gazeX: p.averageX,
                            gazeY: p.averageY,
                            dx: p.averageX - p.targetX,
                            dy: p.averageY - p.targetY
                        }));
                        
                        // Compute overall offset (average offset across all 9 points)
                        // This is used as a global correction
                        this.gazeOffsetX = -results.averageOffsetX;
                        this.gazeOffsetY = -results.averageOffsetY;
                        
                        // Store detailed offsets per region for more precise correction
                        this._calibrationOffsets = offsets;
                        
                        console.log('[FocusFlow] ✅ Calibration complete!');
                        console.log(`[FocusFlow]   Accuracy: ${results.accuracy.toFixed(1)}px average error`);
                        console.log(`[FocusFlow]   Offset: (${this.gazeOffsetX.toFixed(1)}, ${this.gazeOffsetY.toFixed(1)})`);
                        
                        // Show success message
                        this.visualEffects.showPrompt(
                            '🎯',
                            'Calibration complete!',
                            `Gaze tracking calibrated with ${results.accuracy.toFixed(0)}px avg. accuracy.`
                        );
                    }
                } else {
                    // Calibration was skipped
                    console.log('[FocusFlow] ⏭️ Calibration skipped, using raw gaze data');
                    this.visualEffects.showPrompt(
                        '🖱️',
                        'Using mouse tracking',
                        'Calibration was skipped. Gaze will follow your mouse cursor.'
                    );
                }
                
                resolve();
            },
            // onProgress callback
            (current, total) => {
                const pct = Math.round((current / total) * 100);
                console.log(`[FocusFlow] Calibration progress: ${current + 1}/${total} (${pct}%)`);
            }
        );
    });
};

/**
 * Set up WebGazer with FocusFlow integration
 * Enhanced with detailed error reporting for getUserMedia / camera API failures
 */
FocusFlow.startWebGazer = async function() {
    return new Promise((resolve) => {
        if (this._webGazerStarted || this._webGazerStarting) {
            this.config.demoMode = false;
            this.config.useWebGazer = true;
            this.config.trackingMode = 'gaze';
            this._announceTrackingMode('gaze');
            resolve();
            return;
        }

        // --- Pre-check: browser camera API availability ---
        if (location.protocol === 'file:') {
            this._webGazerStarted = false;
            this._webGazerStarting = false;
            this.config.demoMode = false;
            this.config.useWebGazer = true;
            this.config.trackingMode = 'runtime-error';
            this._announceTrackingMode('runtime-error', 'file protocol blocks camera/model loading');
            resolve();
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn('[FocusFlow] ⚠️ getUserMedia API unavailable (non-HTTPS or unsupported browser)');
            this._reportApiError(
                'WebGazer / getUserMedia',
                'Browser camera API (getUserMedia) unavailable',
                [
                    '• Use HTTPS or http://localhost',
                    '• Or use the latest Chrome / Edge / Firefox',
                    '• Automatically switched to Demo Mode (mouse simulation)'
                ]
            );
            this.config.demoMode = false;
            this.config.useWebGazer = true;
            this.config.trackingMode = 'camera-error';
            this._announceTrackingMode('camera-error', 'camera api unavailable');
            resolve();
            return;
        }
        
        try {
            this._webGazerStarting = true;
            // Keep WebGazer's video preview + green face-mesh overlay visible
            // (this is the green tracking grid the user expects). Prediction
            // points stay off to avoid clutter. The video preview is positioned
            // by WebGazer itself; our sidebar canvas is a separate, lighter view.
            webgazer
                .setRegression('ridge')
                .saveDataAcrossSessions(true)
                .showVideo(true)
                .showFaceOverlay(true)
                .showFaceFeedbackBox(true)
                .showVideoPreview(true)
                .showPredictionPoints(this.config.showGazeDot && this.config.trackingMode !== 'mouse')
                .begin()

                .then(() => {
                    this._webGazerStarted = true;
                    this._webGazerStarting = false;
                    this.config.demoMode = false;
                    this.config.useWebGazer = true;
                    this.config.trackingMode = 'gaze';
                    this._announceTrackingMode('gaze');
                    console.log('[FocusFlow] ✅ WebGazer started successfully');
                    resolve();
                })
                .catch((err) => {
                    const msg = (err && err.message) || (err && err.toString()) || 'Unknown error';
                    console.error('[FocusFlow] ❌ WebGazer failed:', msg);
                    
                    // Classify WebGazer error for user-friendly message
                    if (msg.includes('getUserMedia') || msg.includes('NotAllowed') || msg.includes('Permission')) {
                        this._reportApiError(
                            'WebGazer / Camera',
                            'Camera permission denied - ' + msg,
                            [
                                '• Click the lock icon in the address bar and allow camera permission',
                                '• If permission was denied repeatedly, reset camera permission in browser settings',
                                '• Automatically switched to Demo Mode (mouse simulation)'
                            ]
                        );
                    } else if (msg.includes('NotReadable') || msg.includes('NotFound')) {
                        this._reportApiError(
                            'WebGazer / Camera',
                            'Camera device unavailable - ' + msg,
                            [
                                '• Check that the camera is connected correctly',
                                '• Close other apps using the camera, such as Zoom or Teams',
                                '• Automatically switched to Demo Mode'
                            ]
                        );
                    } else {
                        this._reportApiError(
                            'WebGazer',
                            'Startup failed: ' + msg,
                            [
                                '• Automatically switched to Demo Mode (mouse simulation)',
                                '• You can continue using all features'
                            ]
                        );
                    }
                    
                    this._webGazerStarted = false;
                    this._webGazerStarting = false;
                    this.config.demoMode = false;
                    this.config.useWebGazer = true;
                    this.config.trackingMode = 'camera-error';
                    this._announceTrackingMode('camera-error', 'webgazer failed');
                    resolve();
                });
        } catch (e) {
            const msg = (e && e.message) || (e && e.toString()) || 'Unknown error';
            console.error('[FocusFlow] ❌ WebGazer init error:', msg);
            
            this._reportApiError(
                'WebGazer',
                'Initialization exception: ' + msg,
                [
                    '• Automatically switched to Demo Mode (mouse simulation)',
                    '• You can continue using all features'
                ]
            );
            
            this._webGazerStarted = false;
            this._webGazerStarting = false;
            this.config.demoMode = false;
            this.config.useWebGazer = true;
            this.config.trackingMode = 'camera-error';
            this._announceTrackingMode('camera-error', 'webgazer init error');
            resolve();
        }
    });
};

/**
 * Report an API failure to the user via visualEffects and console
 * @param {string} apiName - Name of the API that failed
 * @param {string} summary - Brief error summary
 * @param {string[]} suggestions - List of actionable suggestions
 */
FocusFlow._reportApiError = function(apiName, summary, suggestions) {
    console.error(`[FocusFlow] ❌ API call failed [${apiName}]: ${summary}`);
    if (suggestions) {
        suggestions.forEach(s => console.warn('[FocusFlow] 💡', s));
    }
    
    // Try to show via visualEffects if available
    if (this.visualEffects && typeof this.visualEffects.showPrompt === 'function') {
        setTimeout(() => {
            this.visualEffects.showPrompt(
                '⚠️',
                `${apiName} call failed`,
                summary + ' — switched to Demo Mode'
            );
        }, 500);
    }
    
    // Also dispatch a custom event for the page-level error handler
    const event = new CustomEvent('focusflow-api-error', {
        detail: { api: apiName, summary, suggestions }
    });
    document.dispatchEvent(event);
};

FocusFlow._reportApiError = function(apiName, summary, suggestions) {
    console.error(`[FocusFlow] API issue [${apiName}]: ${summary}`);
    if (suggestions) {
        suggestions.forEach(s => console.warn('[FocusFlow]', s));
    }

    if (this.visualEffects && typeof this.visualEffects.showPrompt === 'function') {
        setTimeout(() => {
            this.visualEffects.showPrompt(
                '⚠',
                `${apiName} needs attention`,
                summary + '. Check camera permission and retry.'
            );
        }, 500);
    }

    document.dispatchEvent(new CustomEvent('focusflow-api-error', {
        detail: { api: apiName, summary, suggestions }
    }));
};

FocusFlow._announceTrackingMode = function(mode, reason) {
    document.dispatchEvent(new CustomEvent('focusflow-tracking-mode', {
        detail: { mode, reason: reason || '' }
    }));
};

FocusFlow.switchToMouseTracking = function(reason) {
    this._webGazerStarted = false;
    this._webGazerStarting = false;
    this.config.demoMode = true;
    this.config.useWebGazer = false;
    this.config.trackingMode = 'mouse';

    try {
        if (window.webgazer && typeof window.webgazer.showPredictionPoints === 'function') {
            window.webgazer.showPredictionPoints(false);
        }
    } catch (e) {}

    this.startDemoMode();
    this._announceTrackingMode('mouse', reason);
};


/**
 * Set up the post-calibration gaze listener with smoothing and offset correction
 */
FocusFlow._setupGazeListener = function() {
    if (!window.webgazer) return;
    
    webgazer.setGazeListener((data, elapsedTime) => {
        if (data == null) return;
        
        // Apply calibration offset correction
        const correctedData = this._applyCalibration(data);
        
        // Apply smoothing
        const smoothedData = this._smoothGaze(correctedData);
        
        this.onGazeData(smoothedData, elapsedTime);
    });
    
    console.log('[FocusFlow] 👁️ Post-calibration gaze listener active');
};

/**
 * Apply calibration offset to raw gaze data
 * Uses linear interpolation across the 9 calibration points
 */
FocusFlow._applyCalibration = function(data) {
    let adjustedX = data.x;
    let adjustedY = data.y;
    
    if (this._calibrationOffsets && this._calibrationOffsets.length >= 9) {
        // Use inverse distance weighting to interpolate offset
        // from the 9 calibration points to the current gaze position
        let totalWeight = 0;
        let offsetX = 0;
        let offsetY = 0;
        const eps = 50; // Minimum distance to avoid division by zero
        
        for (const pt of this._calibrationOffsets) {
            const dx = data.x - pt.targetX;
            const dy = data.y - pt.targetY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Weight = 1 / (distance + epsilon)
            const weight = 1 / (dist + eps);
            offsetX += weight * (-pt.dx);
            offsetY += weight * (-pt.dy);
            totalWeight += weight;
        }
        
        if (totalWeight > 0) {
            adjustedX = data.x + (offsetX / totalWeight);
            adjustedY = data.y + (offsetY / totalWeight);
        }
    } else {
        // Simple global offset
        adjustedX = data.x + this.gazeOffsetX;
        adjustedY = data.y + this.gazeOffsetY;
    }
    
    return {
        x: adjustedX,
        y: adjustedY,
        // Preserve original data
        _rawX: data.x,
        _rawY: data.y
    };
};

/**
 * Smooth gaze data using exponential moving average + median filter
 */
FocusFlow._smoothGaze = function(data) {
    // Add to sample window
    this._gazeSamples.push({ x: data.x, y: data.y, time: performance.now() });
    if (this._gazeSamples.length > this._gazeSampleWindow) {
        this._gazeSamples.shift();
    }
    
    // Compute median of recent samples (more robust than mean)
    if (this._gazeSamples.length >= 3) {
        const xs = this._gazeSamples.map(s => s.x).sort((a, b) => a - b);
        const ys = this._gazeSamples.map(s => s.y).sort((a, b) => a - b);
        const mid = Math.floor(xs.length / 2);
        const medianX = xs.length % 2 === 0 ? (xs[mid - 1] + xs[mid]) / 2 : xs[mid];
        const medianY = ys.length % 2 === 0 ? (ys[mid - 1] + ys[mid]) / 2 : ys[mid];
        
        // Exponential moving average blending
        if (this._smoothedGazeX === 0 && this._smoothedGazeY === 0) {
            this._smoothedGazeX = medianX;
            this._smoothedGazeY = medianY;
        } else {
            const alpha = this._gazeSmoothFactor;
            this._smoothedGazeX = alpha * medianX + (1 - alpha) * this._smoothedGazeX;
            this._smoothedGazeY = alpha * medianY + (1 - alpha) * this._smoothedGazeY;
        }
        
        return {
            x: this._smoothedGazeX,
            y: this._smoothedGazeY,
            _rawX: data._rawX !== undefined ? data._rawX : data.x,
            _rawY: data._rawY !== undefined ? data._rawY : data.y
        };
    }
    
    return data;
};

/**
 * Demo mode: simulate gaze data with mouse for testing
 */
FocusFlow.startDemoMode = function() {
    this.config.demoMode = true;
    this.config.useWebGazer = false;
    this.config.trackingMode = 'mouse';

    if (this._demoMouseHandler) {
        return;
    }
    console.log('[FocusFlow] 🖱️ Starting demo mode (mouse-based simulation)');
    
    this._demoMouseHandler = (e) => {
        const demoData = {
            x: e.clientX,
            y: e.clientY,
            eyeFeatures: {
                left: { imagex: 0, imagey: 0, width: 60, height: 30 },
                right: { imagex: 0, imagey: 0, width: 60, height: 30 }
            }
        };
        const elapsedTime = performance.now();
        
        // Simulate face presence with occasional dropouts
        this.perception.facePresent = Math.random() > 0.05;
        this.onGazeData(demoData, elapsedTime);
    };
    document.addEventListener('mousemove', this._demoMouseHandler);
    
    // Simulate scroll
    this._demoScrollHandler = () => {
        this.perception.lastScrollTime = performance.now();
        this.perception.scrollVelocity = Math.abs(window.scrollY - (this.perception._lastScrollY || 0));
        this.perception._lastScrollY = window.scrollY;
    };
    window.addEventListener('scroll', this._demoScrollHandler);
};

FocusFlow.stopDemoMode = function() {
    if (this._demoMouseHandler) {
        document.removeEventListener('mousemove', this._demoMouseHandler);
        this._demoMouseHandler = null;
    }
    if (this._demoScrollHandler) {
        window.removeEventListener('scroll', this._demoScrollHandler);
        this._demoScrollHandler = null;
    }
};

/**
 * Main gaze data handler - the complete pipeline
 * 
 * Pipeline:
 *   Member A: Perception → Cognition → Decision
 *   Member B: ReadingView mapping → VisualEffects rendering
 *   Member C: Keyword extraction → Analytics logging
 */
FocusFlow.onGazeData = function(data, elapsedTime) {
    const now = performance.now();
    
    // ============================================
    // MEMBER A: Perception Layer
    // ============================================
    this.perception.update(data, elapsedTime);
    const features = this.perception.getFeatures();
    
    // ============================================
    // MEMBER A: Cognitive State Machine
    // ============================================
    this.cognition.update(features, elapsedTime);
    const currentState = this.cognition.getState();
    this._currentStateName = currentState.name;
    
    // ============================================
    // MEMBER A: Decision Layer
    // ============================================
    const strategy = this.decision.decide(currentState, features, {});
    
    // ============================================
    // MEMBER B: Gaze-to-ReadingBlock Mapping
    // ============================================
    const gazeBlock = this.readingView.getBlockAtGaze(data.x, data.y);
    const blockIndex = gazeBlock ? gazeBlock.index : -1;
    const inReadingArea = gazeBlock !== null;
    
    // Update gaze cursor position (smooth following)
    if (this.readingView) {
        this.readingView.updateGazeCursor(data.x, data.y);
    }
    
    // Update visual effects with gaze position (radial dim center, glow)
    if (this.visualEffects) {
        this.visualEffects.updateGazePosition(data.x, data.y);
    }
    
    // ============================================
    // MEMBER B: Adaptive Visual Effects
    // ============================================
    this._applyAdaptiveUI(currentState, strategy, gazeBlock, features);
    
    // ============================================
    // MEMBER B: Adaptive Typography
    // ============================================
    if (this.readingView && typeof this.readingView.applyAdaptiveTypography === 'function') {
        this.readingView.applyAdaptiveTypography(currentState.name);
    }
    
    // ============================================
    // MEMBER B: Set current block for WPM tracking
    // ============================================
    if (gazeBlock && gazeBlock.index !== this._lastBlockIndex) {
        const text = gazeBlock.element ? gazeBlock.element.textContent || '' : '';
        this.readingView.setCurrentBlock(gazeBlock.index, text);
    }

    // ============================================
    // MEMBER B: Debug Panel Update
    // ============================================
    if (this.debugPanel && this.debugPanel.isVisible()) {
        this.debugPanel.setGaze(data.x, data.y);
        if (gazeBlock) {
            this.debugPanel.setBlock(gazeBlock.index, gazeBlock.blockId);
        }
        this.debugPanel.setCognitiveState(currentState.name);
        this.debugPanel.setFocusMode(this.focusMode ? this.focusMode.getCurrentMode() : 'standard');
        const wpm = this.readingView ? this.readingView.getWpm() : 0;
        this.debugPanel.setWpm(wpm);
        this.debugPanel.setDimLevel(this.visualEffects ? this.visualEffects.dimIntensity : 0);
        this.debugPanel.setEffectsCount(this.visualEffects ? this.visualEffects._activeEffectCount : 0);
        this.debugPanel.updateData({});
    }
    
    // ============================================
    // MEMBER C: Keyword Extraction (on dwell)
    // ============================================
    this._checkKeywordTrigger(blockIndex, gazeBlock);
    
    // ============================================
    // MEMBER C: Analytics Recording
    // ============================================
    const gazeData = {
        x: data.x,
        y: data.y,
        blockId: gazeBlock ? gazeBlock.blockId : null,
        blockIndex: blockIndex
    };
    this.analytics.recordGazeSample(gazeData, currentState.name, currentState.confidence);
    
    // Track distraction episodes
    if (currentState.name === 'Distracted' || currentState.name === 'OffScreen') {
        this.analytics.startDistraction(currentState.name);
    } else {
        this.analytics.endDistraction();
    }
    
    // ============================================
    // Update Dashboard UI
    // ============================================
    this.updateDashboard(currentState, strategy, gazeBlock);
    
    // ============================================
    // Track gaze history for smoothing
    // ============================================
    this._gazeHistory.push({
        x: data.x,
        y: data.y,
        blockIndex: blockIndex,
        time: now,
        state: currentState.name
    });
    if (this._gazeHistory.length > this._maxGazeHistory) {
        this._gazeHistory.shift();
    }
    
    this._lastGazeTime = now;
};

/**
 * Apply adaptive UI effects based on current state and strategy
 * Member B's core logic integrated with Member A's state output
 */
FocusFlow._applyAdaptiveUI = function(state, strategy, gazeBlock, features) {
    const now = performance.now();
    
    // ----- Row Highlighting -----
    if (gazeBlock && (state.name === 'Reading' || state.name === 'Normal')) {
        this.readingView.refreshBlockRects();
        this.visualEffects.highlightElement(
            gazeBlock.element,
            state.name
        );
        
        // Auto-scroll ONLY when:
        // 1. Gaze has been on this new block for at least _scrollDwellThreshold ms
        // 2. Block is significantly out of viewport center (>200px)
        if (gazeBlock.index !== this._lastBlockIndex) {
            this._blockDwellForScroll = now;
        }
        
        const scrollDwellElapsed = now - this._blockDwellForScroll;
        if (scrollDwellElapsed > this._scrollDwellThreshold) {
            const viewportCenter = window.innerHeight / 2;
            const blockCenter = gazeBlock.rect.top + gazeBlock.rect.height / 2;
            const distFromCenter = Math.abs(blockCenter - viewportCenter);
            const blockVisible = (gazeBlock.rect.top > 0 && gazeBlock.rect.bottom < window.innerHeight);
            
            if (distFromCenter > 200 && !blockVisible) {
                this.readingView.scrollToBlock(gazeBlock.index);
            }
        }
    } else {
        this.visualEffects.clearHighlight();
    }

    // ----- Dimming Logic -----
    let targetDim = 0;
    if (state.name === 'Distracted' || state.name === 'Struggling') {
        const dwellRatio = Math.min(1, Math.max(0, ((state.duration || 0) - 2000) / 5000));
        targetDim = dwellRatio * this.config.dimIntensity;
    }
    this.visualEffects.setDimLevel(targetDim);
    
    // ----- Distraction Alert -----
    if (state.name === 'Distracted') {
        if (state.duration > 500 && state.duration < 3000 && !this._distractionAlertShown) {
            this._distractionAlertShown = true;
            this.visualEffects.showPrompt(
                '👀',
                'Still there?',
                'It looks like you stepped away. Come back when you\'re ready.'
            );
            this.visualEffects.playSound('feedback');
        }
        
        if (state.duration > 5000) {
            const elapsedSinceLastPrompt = now - this._lastDistractionPromptTime;
            if (elapsedSinceLastPrompt > 10000) {
                this._lastDistractionPromptTime = now;
                const reminders = [
                    { icon: '💭', text: 'Come back when you\'re ready.', sub: 'Your reading is waiting.' },
                    { icon: '🎯', text: 'One sentence at a time.', sub: 'No need to catch up all at once.' },
                    { icon: '🌿', text: 'It\'s okay to take breaks.', sub: 'Just come back when you can.' },
                    { icon: '📖', text: 'You were making great progress.', sub: 'Pick up where you left off.' }
                ];
                const pick = reminders[Math.floor(Math.random() * reminders.length)];
                this.visualEffects.showPrompt(pick.icon, pick.text, pick.sub);
                this.visualEffects.playSound('feedback');
            }
        }
    } else {
        this._distractionAlertShown = false;
        this._lastDistractionPromptTime = 0;
    }

    // ----- Off-Screen Wake-Up -----
    if (state.name === 'OffScreen' || state.name === 'Distracted') {
        if (!this._wakeUpTriggered && (state.duration || 0) > 8000) {
            this._wakeUpTriggered = true;
            this._offScreenStart = now;
            
            setTimeout(() => {
                if (this._currentStateName === 'OffScreen' || this._currentStateName === 'Distracted') {
                    this.visualEffects.showWakeUpCue();
                    this.visualEffects.playSound('wakeup');
                    this.visualEffects.showPrompt(
                        '👀',
                        'Time to refocus!',
                        'You\'ve been away for a while. Pick up where you left off.'
                    );
                }
            }, 15000);
        }
    } else {
        this._wakeUpTriggered = false;
        
        if (this._lastBlockIndex === -1 && gazeBlock) {
            this.visualEffects.showPositiveFeedback();
            this.visualEffects.playSound('feedback');
        }
    }
    
    // ----- Reading Progress -----
    if (gazeBlock && gazeBlock.index >= 0) {
        const progress = this.readingView.getReadingProgress(gazeBlock.index);
        this.visualEffects.updateProgress(progress);
    }
    
    // ----- State-Specific Prompts -----
    if (state.name === 'Struggling' && !this._lastStrugglePrompt) {
        const duration = state.duration || 0;
        if (duration > 3000 && duration < 4000) {
            this.visualEffects.showPrompt(
                '🧠',
                'Take your time with this section.',
                'No rush — understanding matters more than speed.'
            );
            this._lastStrugglePrompt = true;
        }
    }
    if (state.name !== 'Struggling') {
        this._lastStrugglePrompt = false;
    }
    
    // Update last block index
    if (gazeBlock) {
        this._lastBlockIndex = gazeBlock.index;
    }
};


/**
 * Check if we should trigger keyword extraction
 */
FocusFlow._checkKeywordTrigger = function(blockIndex, gazeBlock) {
    const now = performance.now();
    
    if (blockIndex >= 0 && gazeBlock) {
        if (blockIndex !== this._lastBlockIndex) {
            this._blockDwellStart = now;
        }
        
        const dwellTime = now - this._blockDwellStart;
        
        if (dwellTime > this.config.dwellForKeywords && 
            !this._keywordsShownForBlock.has(blockIndex)) {
            
            this._keywordsShownForBlock.add(blockIndex);
            
            const allTexts = this.readingView.blockElements.map(el => el.textContent || '');
            const currentText = gazeBlock.element.textContent || '';
            
            const result = this.keywordExtractor.extractAll(
                currentText,
                blockIndex,
                allTexts
            );
            
            if (result.keywords.length > 0) {
                const displayKeywords = result.keywords.map(kw => ({
                    word: kw.word.replace(/-/g, ' '),
                    score: kw.score
                }));
                
                this.visualEffects.showKeywords(displayKeywords);
                this.visualEffects.playSound('keyword');
            }
        }
    }
};

/**
 * Update the UI dashboard with current state info
 */
FocusFlow.updateDashboard = function(state, strategy, gazeBlock) {
    const iconEl = document.getElementById('ff-state-icon');
    const nameEl = document.getElementById('ff-state-name');
    const durEl = document.getElementById('ff-state-duration');
    const confEl = document.getElementById('ff-state-confidence');
    
    if (iconEl) {
        const icons = { 'Normal': '🧠', 'Distracted': '👀', 'Struggling': '🤔', 'Recovering': '🔄', 'OffScreen': '🚶' };
        iconEl.textContent = icons[state.name] || '🧠';
    }
    if (nameEl) {
        nameEl.textContent = state.name;
    }
    if (durEl) {
        durEl.textContent = (state.duration / 1000).toFixed(1);
    }
    if (confEl) {
        confEl.textContent = (state.confidence * 100).toFixed(0) + '%';
    }
    
    const strategyNameEl = document.getElementById('ff-strategy-name');
    const strategyDescEl = document.getElementById('ff-strategy-desc');
    if (strategyNameEl) {
        strategyNameEl.textContent = strategy.name || 'No intervention';
    }
    if (strategyDescEl) {
        strategyDescEl.textContent = strategy.description || '';
    }
    
    const summary = this.analytics.getSessionSummary();
    
    const attnEl = document.getElementById('ff-metric-attention');
    if (attnEl) attnEl.textContent = summary.attentionScore + '%';
    
    const wpmEl = document.getElementById('ff-metric-wpm');
    if (wpmEl && summary.readingSpeed > 0) wpmEl.textContent = summary.readingSpeed + ' wpm';
    
    const focusEl = document.getElementById('ff-metric-focus');
    if (focusEl) focusEl.textContent = summary.focusRatio + '%';
    
    const regEl = document.getElementById('ff-metric-regression');
    if (regEl) regEl.textContent = summary.regressionRate + '/min';
    
    const durMetricEl = document.getElementById('ff-metric-duration');
    if (durMetricEl) durMetricEl.textContent = summary.sessionDuration + ' min';
    
    const distEl = document.getElementById('ff-metric-distractions');
    if (distEl) distEl.textContent = summary.distractionCount;
    
    if (summary.insight) {
        const insightEl = document.getElementById('ff-insight');
        if (insightEl) {
            insightEl.innerHTML = `${summary.insight.icon} ${summary.insight.message}`;
        }
    }
    
    const wpmBadge = document.getElementById('ff-wpm');
    if (wpmBadge && summary.readingSpeed > 0) {
        wpmBadge.textContent = summary.readingSpeed + ' wpm';
    }
    
    const scoreBadge = document.getElementById('ff-attention-score');
    if (scoreBadge) {
        scoreBadge.textContent = summary.attentionScore + '%';
    }
};

/**
 * Get session summary from analytics
 * @returns {Object}
 */
FocusFlow.getSessionSummary = function() {
    return this.analytics.getSessionSummary();
};

/**
 * Toggle debug mode on/off
 */
FocusFlow.toggleDebug = function() {
    this.config.debug = !this.config.debug;
    const debugPanel = document.getElementById('ff-debug-panel');
    if (debugPanel) {
        debugPanel.style.display = this.config.debug ? 'block' : 'none';
    }
    console.log('[FocusFlow] Debug mode:', this.config.debug);
};

/**
 * Clean up resources
 */
FocusFlow.shutdown = function() {
    if (this.calibration) {
        this.calibration.destroy();
    }
    if (this.analytics) {
        this.analytics.destroy();
    }
    if (this.visualEffects) {
        this.visualEffects.reset();
    }
    if (this.perception) {
        this.perception.destroy();
    }
    if (window.webgazer) {
        webgazer.end();
    }
    console.log('[FocusFlow] Shutdown complete');
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    FocusFlow.init();
});
