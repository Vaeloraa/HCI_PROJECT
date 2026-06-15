/**
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
FocusFlow.version = '2.6.0';

FocusFlow._t = function(key, params) {
    if (typeof I18n !== 'undefined') return I18n.t(key, params);
    return key;
};

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
    demoMode: true,                  // Mouse tracking by default (no camera)
    useWebGazer: false,
    saveData: true,
    showGazeDot: true,               // Gaze dot visible when eye tracking is active
    trackingMode: 'mouse',
    
    // Calibration config
    calibrationEnabled: true,
    calibrationRequired: true,
    
    // Member B config
    highlightIntensity: 0.15,
    dimIntensity: 0.35,
    dimDelay: 3000,
    
    // Member C config — dwell-triggered comprehension assist (not keyword cards)
    dwellForSummary: 10000,
    summaryBlockConfirmMs: 1500,
    summaryMaxSentences: 2,
    llmApiUrl: '/api/summarize',
    llmStatusUrl: '/api/llm/status',
    llmConcurrency: 3,
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
FocusFlow._autoTriggeredForBlock = new Set();
FocusFlow._blockSummaryCache = {};
FocusFlow._paragraphSummaries = {};
FocusFlow._comprehensionCardBlock = -1;
FocusFlow._assistCandidateBlock = -1;
FocusFlow._assistCandidateSince = 0;
FocusFlow._assistDwellBlock = -1;
FocusFlow._assistDwellStart = 0;
FocusFlow._assistPrefetchStartedFor = new Set();

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
FocusFlow._lastDashboardUpdateTs = 0;
FocusFlow._dashboardUpdateIntervalMs = 200;
FocusFlow._lastPipelineRunTs = 0;
FocusFlow._pipelineIntervalMs = 33; // ~30 FPS max processing
FocusFlow._summaryGenerationInProgress = new Set();
FocusFlow._allBlockTexts = [];
FocusFlow._initialized = false;
FocusFlow._calibrationDone = false;
FocusFlow._cameraGateVisible = false;
FocusFlow._cameraStartupInProgress = false;

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
    if (this._initialized) return;
    console.log('[FocusFlow] Initializing v' + this.version + '...');

    // 1. Initialize Member B first so default reading content is always visible.
    this.readingView = new ReadingView(this.config);
    console.log('[FocusFlow] ✅ Member B - Reading View loaded');

    // 2. Initialize Member A: Perception Layer
    this.perception = new PerceptionModule(this.config);
    console.log('[FocusFlow] ✅ Member A - Perception Layer loaded');

    // 3. Initialize Member A: Cognitive State Machine
    this.cognition = new StateMachine(this.config);
    console.log('[FocusFlow] ✅ Member A - Cognitive State Machine loaded');

    // 4. Initialize Member A: Decision Module
    this.decision = new DecisionModule(this.config);
    console.log('[FocusFlow] ✅ Member A - Decision Layer loaded');

    // 5. Initialize Member B: Visual Effects
    this.visualEffects = new VisualEffects(this.config);
    console.log('[FocusFlow] ✅ Member B - Visual Effects loaded');

    // 6. Initialize Member B: Focus Mode Manager
    this.focusMode = new FocusMode();
    console.log('[FocusFlow] ✅ Member B - Focus Mode Manager loaded');


    // 7. Initialize Member B: Debug Panel
    this.debugPanel = new DebugPanel();
    console.log('[FocusFlow] ✅ Member B - Debug Panel loaded');

    // 8. Initialize Member C: NLP + Analytics
    this.keywordExtractor = new KeywordExtractor(this.config);
    console.log('[FocusFlow] ✅ Member C - Keyword Extractor loaded (internal scoring)');

    this.analytics = new AttentionAnalytics(this.config);
    console.log('[FocusFlow] ✅ Member C - Attention Analytics loaded');

    // 9. Initialize Member C: LLM summary manager
    this.llmSummaryManager = new LLMSummaryManager(this.config);
    await this.llmSummaryManager.init();
    this.config.llmEnabled = this.llmSummaryManager.isEnabled();
    console.log('[FocusFlow] ✅ Member C - LLM Summary', this.config.llmEnabled ? 'enabled' : 'fallback mode');

    // 10. Initialize the reading content with all block word counts
    this._initBlockWordCounts();
    this._precomputeParagraphSummaries();

    document.addEventListener('focusflow-state-change', (event) => {
        const detail = event.detail || {};
        if (this.analytics && detail.currentState) {
            this.analytics.recordStateTransition(detail.previousState, detail.currentState);
        }
    });

    // 9. Input tracking — mouse by default; camera only after user enables eye tracking.
    this.startMouseTracking();
    this._announceTrackingMode('mouse', 'default');


    // 12. Show welcome prompt
    setTimeout(() => {
        this.visualEffects.showPrompt(
            '👋',
            this._t('welcome.title'),
            this._t('welcome.sub')
        );
    }, 1500);

    console.log('[FocusFlow] 🚀 All systems ready!');
    this._removeLegacyKeywordPanels();
    this._initialized = true;
};

/**
 * Initialize word counts for each paragraph block
 */
FocusFlow._initBlockWordCounts = function() {
    const blocks = this.readingView.blockElements;
    this._allBlockTexts = [];

    if (this.keywordExtractor) {
        this.keywordExtractor.reset();
    }

    for (let i = 0; i < blocks.length; i++) {
        const text = blocks[i].textContent || '';
        this._allBlockTexts.push(text);
        const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
        this.analytics.setBlockWordCount(i, wordCount);
        if (this.keywordExtractor) {
            this.keywordExtractor.updateVocabulary(text);
        }
    }
};

/**
 * Precompute paragraph summaries in the background for faster assist cards.
 */
FocusFlow._precomputeParagraphSummaries = async function() {
    this._paragraphSummaries = {};
    const docLang = this.readingView && typeof this.readingView.getDocumentLang === 'function'
        ? this.readingView.getDocumentLang()
        : 'en';

    if (this.llmSummaryManager) {
        this.llmSummaryManager.setDocumentLang(docLang);
        if (this.llmSummaryManager.isEnabled()) {
            this.llmSummaryManager.preloadDocument(this._allBlockTexts, docLang);
            return;
        }
    }

    if (typeof ParagraphSummarizer === 'undefined') return;
    this._allBlockTexts.forEach((text, index) => {
        window.setTimeout(() => {
            this._paragraphSummaries[index] = ParagraphSummarizer.summarize(text, { lang: docLang });
        }, index * 8);
    });
};

/**
 * Attempt to start WebGazer eye tracking (user gesture required).
 * Does not fall back to mouse — caller handles failure.
 * @returns {Promise<boolean>}
 */
FocusFlow._tryStartEyeTracking = async function() {
    if (typeof CameraAccess === 'undefined') {
        this._showCameraGate('unsupported');
        return false;
    }

    if (!CameraAccess.isSupported()) {
        this._showCameraGate('unsupported');
        return false;
    }

    if (!CameraAccess.isSecureEnough()) {
        this._showCameraGate('file');
        return false;
    }

    const started = await this.startWebGazer({ force: true });
    if (!started) {
        this._showCameraGate('denied');
        return false;
    }

    return true;
};

/**
 * @deprecated Auto-start removed — eye tracking begins only via enableCameraTracking().
 */
FocusFlow._bootstrapCameraTracking = async function() {
    return this.enableCameraTracking();
};

/**
 * Run calibration and gaze listener after WebGazer is live.
 */
FocusFlow._finishCameraStartup = async function() {
    if (this.config.trackingMode !== 'gaze') return;

    if (this.config.calibrationEnabled && !this._calibrationDone) {
        try {
            await this._runCalibration();
        } catch (err) {
            console.warn('[FocusFlow] Calibration failed, continuing:', err);
        }
    }

    this._setupGazeListener();
};

/**
 * User-gesture entry point for enabling camera tracking (gate button / retry).
 */
FocusFlow.enableCameraTracking = async function() {
    if (this._cameraStartupInProgress) return false;
    this._cameraStartupInProgress = true;

    const gateBtn = document.getElementById('ff-camera-gate-btn');
    if (gateBtn) {
        gateBtn.disabled = true;
        gateBtn.textContent = this._t('camera.gate.working');
    }

    try {
        this.stopMouseTracking();
        this.config.useWebGazer = true;
        this.config.demoMode = false;

        const started = await this._tryStartEyeTracking();
        if (!started) {
            this.switchToMouseTracking('camera unavailable');
            return false;
        }

        this._hideCameraGate();
        await this._finishCameraStartup();
        return true;
    } finally {
        this._cameraStartupInProgress = false;
        if (gateBtn) {
            gateBtn.disabled = false;
            gateBtn.textContent = this._cameraGateReason === 'denied'
                ? this._t('camera.gate.retry')
                : this._t('camera.gate.enable');
        }
    }
};

FocusFlow._showCameraGate = function(reason) {
    this._cameraGateReason = reason || 'prompt';
    let gate = document.getElementById('ff-camera-gate');
    if (!gate) {
        gate = document.createElement('div');
        gate.id = 'ff-camera-gate';
        gate.className = 'ff-camera-gate';
        gate.innerHTML = `
            <div class="ff-camera-gate__card">
                <div class="ff-camera-gate__icon">📷</div>
                <h2 class="ff-camera-gate__title" data-i18n="camera.gate.title"></h2>
                <p class="ff-camera-gate__text" id="ff-camera-gate-text"></p>
                <button type="button" id="ff-camera-gate-btn" class="ff-btn ff-btn-primary"></button>
            </div>
        `;
        document.body.appendChild(gate);

        const btn = gate.querySelector('#ff-camera-gate-btn');
        btn.addEventListener('click', () => this.enableCameraTracking());
    }

    const title = gate.querySelector('.ff-camera-gate__title');
    const text = gate.querySelector('#ff-camera-gate-text');
    const btn = gate.querySelector('#ff-camera-gate-btn');
    const reasonKey = {
        denied: 'camera.gate.denied',
        file: 'camera.gate.file',
        unsupported: 'camera.gate.unsupported',
        prompt: 'camera.gate.prompt',
        unknown: 'camera.gate.prompt'
    }[this._cameraGateReason] || 'camera.gate.prompt';

    if (title) title.textContent = this._t('camera.gate.title');
    if (text) text.textContent = this._t(reasonKey);
    if (btn) {
        btn.textContent = this._cameraGateReason === 'denied'
            ? this._t('camera.gate.retry')
            : this._t('camera.gate.enable');
        btn.disabled = this._cameraGateReason === 'file' || this._cameraGateReason === 'unsupported';
    }

    gate.hidden = false;
    gate.classList.add('is-visible');
    this._cameraGateVisible = true;
};

FocusFlow._hideCameraGate = function() {
    const gate = document.getElementById('ff-camera-gate');
    if (!gate) return;
    gate.hidden = true;
    gate.classList.remove('is-visible');
    this._cameraGateVisible = false;
};

/**
 * Run the 9-point calibration procedure.
 * This asks the user to look at 9 points on screen to calibrate WebGazer.
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
                            this._t('calibration.complete.title'),
                            this._t('calibration.complete.sub', { accuracy: results.accuracy.toFixed(0) })
                        );
                    }
                    this._calibrationDone = true;
                } else {
                    // Calibration was skipped
                    console.log('[FocusFlow] ⏭️ Calibration skipped, using raw gaze data');
                    this.visualEffects.showPrompt(
                        '🖱️',
                        this._t('calibration.skipped.title'),
                        this._t('calibration.skipped.sub')
                    );
                }
                this._calibrationDone = true;
                
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
 * Set up WebGazer with FocusFlow integration.
 * Preflights camera permission before WebGazer.begin() for cross-browser reliability.
 * @returns {Promise<boolean>} true when gaze tracking is active
 */
FocusFlow.startWebGazer = async function(options) {
    const force = !!(options && options.force);

    if (this._webGazerStarted && !force) {
        this.config.demoMode = false;
        this.config.useWebGazer = true;
        this.config.trackingMode = 'gaze';
        this._announceTrackingMode('gaze');
        return true;
    }

    if (this._webGazerStarting) {
        return false;
    }

    if (typeof CameraAccess === 'undefined') {
        this._setCameraError('camera-error', 'camera helper unavailable');
        return false;
    }

    if (!CameraAccess.isSupported()) {
        this._reportApiError(
            'WebGazer / Camera',
            'Browser camera API (getUserMedia) unavailable',
            CameraAccess._suggestionsFor('unsupported')
        );
        this._setCameraError('camera-error', 'camera api unavailable');
        return false;
    }

    if (!CameraAccess.isSecureEnough()) {
        this._setCameraError('runtime-error', 'file protocol blocks camera/model loading');
        return false;
    }

    this._webGazerStarting = true;

    try {
        const stream = await CameraAccess.request();
        CameraAccess.release(stream);
    } catch (err) {
        const classified = err.code ? err : CameraAccess.classifyError(err);
        this._reportApiError('WebGazer / Camera', classified.summary, classified.suggestions);
        this._webGazerStarting = false;
        this._setCameraError('camera-error', classified.code || 'permission denied');
        return false;
    }

    if (force && this._webGazerStarted && typeof webgazer !== 'undefined' && typeof webgazer.end === 'function') {
        try {
            await webgazer.end();
        } catch (_) { /* ignore */ }
        this._webGazerStarted = false;
    }

    return new Promise((resolve) => {
        try {
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
                    resolve(true);
                })
                .catch((err) => {
                    const classified = CameraAccess.classifyError(err);
                    console.error('[FocusFlow] ❌ WebGazer failed:', classified.summary);
                    this._reportApiError('WebGazer / Camera', classified.summary, classified.suggestions);
                    this._webGazerStarted = false;
                    this._webGazerStarting = false;
                    this._setCameraError('camera-error', 'webgazer failed');
                    resolve(false);
                });
        } catch (e) {
            const classified = CameraAccess.classifyError(e);
            console.error('[FocusFlow] ❌ WebGazer init error:', classified.summary);
            this._reportApiError('WebGazer', classified.summary, classified.suggestions);
            this._webGazerStarted = false;
            this._webGazerStarting = false;
            this._setCameraError('camera-error', 'webgazer init error');
            resolve(false);
        }
    });
};

FocusFlow._setCameraError = function(mode, reason) {
    this.switchToMouseTracking(reason || mode);
};

/**
 * Report an API failure to the user via visualEffects and console.
 */
FocusFlow._reportApiError = function(apiName, summary, suggestions) {
    console.error(`[FocusFlow] API issue [${apiName}]: ${summary}`);
    if (suggestions) {
        suggestions.forEach(s => console.warn('[FocusFlow]', s));
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

    try {
        if (window.webgazer && typeof window.webgazer.end === 'function') {
            webgazer.end();
        }
    } catch (e) {}

    try {
        if (window.webgazer && typeof window.webgazer.showPredictionPoints === 'function') {
            window.webgazer.showPredictionPoints(false);
        }
    } catch (e) {}

    this.config.demoMode = true;
    this.config.useWebGazer = false;
    this.config.trackingMode = 'mouse';

    this.startMouseTracking();
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
 * Mouse-based gaze simulation — default input when eye tracking is off.
 */
FocusFlow.startMouseTracking = function() {
    this.config.demoMode = true;
    this.config.useWebGazer = false;
    this.config.trackingMode = 'mouse';

    if (this._demoMouseHandler) {
        return;
    }
    console.log('[FocusFlow] 🖱️ Mouse tracking active (no camera)');

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
        this.onGazeData(demoData, elapsedTime);
    };
    document.addEventListener('mousemove', this._demoMouseHandler);

    this._demoScrollHandler = () => {
        const readingEl = document.getElementById('ff-reading-content');
        const scrollY = readingEl ? readingEl.scrollTop : window.scrollY;
        if (this.perception && this.perception.scrollAnalyzer) {
            this.perception.scrollAnalyzer.update(scrollY, 0);
        }
    };
    const readingEl = document.getElementById('ff-reading-content');
    if (readingEl) {
        readingEl.addEventListener('scroll', this._demoScrollHandler, { passive: true });
    }
    window.addEventListener('scroll', this._demoScrollHandler);
};

/**
 * Periodic cognition update — keeps state machine and duration accurate without gaze/mouse movement.
 */
FocusFlow.runCognitionTick = function() {
    if (!this._initialized || !this.perception || !this.cognition || !this.decision) return;
    if (document.hidden) return;

    const now = performance.now();
    const features = this.perception.getFeatures();
    this.cognition.update(features, now);
    const state = this.cognition.getState();
    this._currentStateName = state.name;
    this.decision.decide(state, features, {});
};

FocusFlow.stopMouseTracking = function() {
    if (this._demoMouseHandler) {
        document.removeEventListener('mousemove', this._demoMouseHandler);
        this._demoMouseHandler = null;
    }
    if (this._demoScrollHandler) {
        window.removeEventListener('scroll', this._demoScrollHandler);
        const readingEl = document.getElementById('ff-reading-content');
        if (readingEl) {
            readingEl.removeEventListener('scroll', this._demoScrollHandler);
        }
        this._demoScrollHandler = null;
    }
};

/** @deprecated Use startMouseTracking */
FocusFlow.startDemoMode = function() {
    this.startMouseTracking();
};

/** @deprecated Use stopMouseTracking */
FocusFlow.stopDemoMode = function() {
    this.stopMouseTracking();
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

    // Cap processing frequency to avoid UI stalls on high-frequency gaze events.
    if ((now - this._lastPipelineRunTs) < this._pipelineIntervalMs) {
        return;
    }
    this._lastPipelineRunTs = now;
    if (!data || !Number.isFinite(data.x) || !Number.isFinite(data.y)) return;
    
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
    // MEMBER C: Dwell-triggered comprehension assist
    // ============================================
    this._checkComprehensionAssist(blockIndex, gazeBlock, currentState);
    
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
    if ((now - this._lastDashboardUpdateTs) >= this._dashboardUpdateIntervalMs) {
        this.updateDashboard(currentState, strategy, gazeBlock);
        this._lastDashboardUpdateTs = now;
    }
    
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
        this.visualEffects.highlightElement(
            gazeBlock.element,
            state.name
        );
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
                this._t('prompt.stillThere.title'),
                this._t('prompt.stillThere.sub')
            );
            this.visualEffects.playSound('feedback');
        }
        
        if (state.duration > 5000) {
            const elapsedSinceLastPrompt = now - this._lastDistractionPromptTime;
            if (elapsedSinceLastPrompt > 10000) {
                this._lastDistractionPromptTime = now;
                const reminders = [
                    { icon: '💭', text: this._t('prompt.reminder1.text'), sub: this._t('prompt.reminder1.sub') },
                    { icon: '🎯', text: this._t('prompt.reminder2.text'), sub: this._t('prompt.reminder2.sub') },
                    { icon: '🌿', text: this._t('prompt.reminder3.text'), sub: this._t('prompt.reminder3.sub') },
                    { icon: '📖', text: this._t('prompt.reminder4.text'), sub: this._t('prompt.reminder4.sub') }
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
                        this._t('prompt.wakeup.title'),
                        this._t('prompt.wakeup.sub')
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
                this._t('prompt.struggling.title'),
                this._t('prompt.struggling.sub')
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
 * Show a comprehension summary when the user dwells on a paragraph long enough.
 * Uses its own dwell tracker (independent from _lastBlockIndex) and never auto-hides.
 */
FocusFlow._checkComprehensionAssist = function(blockIndex, gazeBlock, state) {
    const now = performance.now();
    const focusedStates = ['Normal', 'Struggling'];
    const confirmMs = this.config.summaryBlockConfirmMs || 1500;

    if (blockIndex < 0 || !gazeBlock || !focusedStates.includes(state.name)) {
        return;
    }

    if (blockIndex !== this._assistCandidateBlock) {
        this._assistCandidateBlock = blockIndex;
        this._assistCandidateSince = now;
        this._assistDwellBlock = -1;
        this._assistDwellStart = 0;
        return;
    }

    if ((now - this._assistCandidateSince) < confirmMs) {
        return;
    }

    if (this._assistDwellBlock !== blockIndex) {
        this._assistDwellBlock = blockIndex;
        this._assistDwellStart = now;
    }

    // Start LLM prefetch as soon as block is stable (while user is still reading)
    if (!this._assistPrefetchStartedFor.has(blockIndex) && this.llmSummaryManager) {
        this._assistPrefetchStartedFor.add(blockIndex);
        this.llmSummaryManager.onReadingBlock(blockIndex, this._allBlockTexts);
    }

    const dwellTime = now - this._assistDwellStart;
    if (dwellTime < this.config.dwellForSummary) return;
    if (this._autoTriggeredForBlock.has(blockIndex)) return;
    if (this._summaryGenerationInProgress.has(blockIndex)) return;

    this.requestComprehensionForBlock(blockIndex, { auto: true, dwellTime });
};

FocusFlow.requestComprehensionForBlock = function(blockIndex, options = {}) {
    const { manual = false, auto = false, dwellTime = 0 } = options;
    if (blockIndex < 0) return;

    const cached = this._blockSummaryCache[blockIndex];

    if (manual && cached) {
        this.reopenComprehensionForBlock(blockIndex);
        return;
    }

    if (auto) {
        if (this._autoTriggeredForBlock.has(blockIndex)) return;
        this._autoTriggeredForBlock.add(blockIndex);
        if (cached) {
            this._displayComprehensionCard(blockIndex, cached, dwellTime);
            return;
        }
    }

    if (this._summaryGenerationInProgress.has(blockIndex)) {
        this._displayComprehensionLoading(blockIndex, dwellTime);
        return;
    }

    this._summaryGenerationInProgress.add(blockIndex);
    const blockEl = this.readingView && typeof this.readingView.getBlockElement === 'function'
        ? this.readingView.getBlockElement(blockIndex)
        : null;
    const gazeBlock = blockEl ? { element: blockEl } : null;
    this._generateComprehensionForBlock(blockIndex, gazeBlock, dwellTime);
};

FocusFlow.reopenComprehensionForBlock = function(blockIndex) {
    const cached = this._blockSummaryCache[blockIndex];
    if (!cached) return;
    this._displayComprehensionCard(blockIndex, cached, (cached.dwellSeconds || 0) * 1000);
};

FocusFlow.closeComprehensionCard = function() {
    const blockIndex = this._comprehensionCardBlock;
    if (this.visualEffects) {
        this.visualEffects.hideComprehensionCard();
    }
    if (blockIndex >= 0 && this._blockSummaryCache[blockIndex] && this.readingView) {
        this.readingView.updateComprehensionButton(blockIndex, 'reopen');
    }
    this._comprehensionCardBlock = -1;
};

FocusFlow._displayComprehensionLoading = function(blockIndex, dwellTime) {
    const anchor = this.readingView && typeof this.readingView.getBlockElement === 'function'
        ? this.readingView.getBlockElement(blockIndex)
        : null;
    this._comprehensionCardBlock = blockIndex;
    if (this.readingView) {
        this.readingView.updateComprehensionButton(blockIndex, 'hidden');
    }
    if (this.visualEffects) {
        this.visualEffects.setComprehensionAnchor(anchor);
        this.visualEffects.showComprehensionLoading({
            blockIndex,
            paragraphNumber: blockIndex + 1,
            dwellSeconds: Math.round(dwellTime / 1000)
        });
    }
};

FocusFlow._displayComprehensionCard = function(blockIndex, cached, dwellTime, options = {}) {
    const anchor = this.readingView && typeof this.readingView.getBlockElement === 'function'
        ? this.readingView.getBlockElement(blockIndex)
        : null;
    this._comprehensionCardBlock = blockIndex;
    if (this.readingView) {
        this.readingView.updateComprehensionButton(blockIndex, 'hidden');
    }
    if (this.visualEffects) {
        this.visualEffects.setComprehensionAnchor(anchor);
        this.visualEffects.showComprehensionCard({
            blockIndex,
            paragraphNumber: blockIndex + 1,
            summary: cached.text,
            dwellSeconds: cached.dwellSeconds || Math.round(dwellTime / 1000),
            method: cached.method || 'unknown'
        });
    }
    if (options.recordAnalytics && this.analytics) {
        this.analytics.recordComprehensionAssist(blockIndex);
    }
};

FocusFlow._removeLegacyKeywordPanels = function() {
    document.querySelectorAll('[data-ff-legacy-keyword]').forEach((el) => el.remove());
    document.querySelectorAll('div').forEach((el) => {
        if (el.id === 'ff-comprehension-card') return;
        const style = el.style || {};
        const html = el.innerHTML || '';
        const isLegacyKeyword = style.position === 'fixed' && (
            html.includes('🔑') ||
            html.includes('KEY TERMS') ||
            html.includes('关键术语') ||
            html.includes('keyTerms')
        );
        if (isLegacyKeyword) el.remove();
    });
};

FocusFlow._generateComprehensionForBlock = function(blockIndex, gazeBlock, dwellTime) {
    const text = (this._allBlockTexts && this._allBlockTexts[blockIndex])
        ? this._allBlockTexts[blockIndex]
        : (gazeBlock && gazeBlock.element ? gazeBlock.element.textContent : '');

    const docLang = this.readingView && typeof this.readingView.getDocumentLang === 'function'
        ? this.readingView.getDocumentLang()
        : (typeof ParagraphSummarizer !== 'undefined' ? ParagraphSummarizer.detectLanguage(text) : 'en');

    this._displayComprehensionLoading(blockIndex, dwellTime);

    const finish = (summaryText, method) => {
        if (!summaryText) {
            this._summaryGenerationInProgress.delete(blockIndex);
            if (this.visualEffects) this.visualEffects.hideComprehensionCard();
            this._comprehensionCardBlock = -1;
            if (this.readingView) {
                const hasCache = !!this._blockSummaryCache[blockIndex];
                this.readingView.updateComprehensionButton(blockIndex, hasCache ? 'reopen' : 'generate');
            }
            return;
        }
        const payload = {
            text: summaryText,
            method: method || 'unknown',
            dwellSeconds: Math.round(dwellTime / 1000)
        };
        this._blockSummaryCache[blockIndex] = payload;
        this._displayComprehensionCard(blockIndex, payload, dwellTime, { recordAnalytics: true });
        this._summaryGenerationInProgress.delete(blockIndex);
    };

    const manager = this.llmSummaryManager;
    if (manager) {
        manager.getSummary(blockIndex, text, { lang: docLang })
            .then((result) => finish(result.text, result.method))
            .catch(() => {
                if (typeof ParagraphSummarizer !== 'undefined') {
                    const local = ParagraphSummarizer.summarize(text, { lang: docLang });
                    finish(local.text, local.method);
                } else {
                    this._summaryGenerationInProgress.delete(blockIndex);
                }
            });
        return;
    }

    window.setTimeout(() => {
        try {
            let summary = this._paragraphSummaries && this._paragraphSummaries[blockIndex];
            if (!summary && typeof ParagraphSummarizer !== 'undefined') {
                summary = ParagraphSummarizer.summarize(text, { lang: docLang });
            }
            finish(summary && summary.text, summary && summary.method);
        } catch (_) {
            this._summaryGenerationInProgress.delete(blockIndex);
        }
    }, 0);
};

/**
 * Open the end-of-session analytics report (heatmap + stats).
 */
FocusFlow.showSessionReport = function() {
    if (typeof SessionReport === 'undefined' || !this.analytics) return;
    SessionReport.show(this.analytics, this.readingView);
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
        nameEl.textContent = (typeof I18n !== 'undefined')
            ? I18n.translateState(state.name)
            : state.name;
    }
    const descEl = document.getElementById('ff-state-desc');
    if (descEl) {
        descEl.textContent = (typeof I18n !== 'undefined')
            ? I18n.translateStateDesc(state.name)
            : 'Focused reading';
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
        strategyNameEl.textContent = (strategy && strategy.name)
            ? strategy.name
            : this._t('strategy.none');
    }
    if (strategyDescEl) {
        strategyDescEl.textContent = (strategy && strategy.description)
            ? strategy.description
            : this._t('strategy.waiting');
    }
    
    const summary = this.analytics.getSessionSummary();
    
    const attnEl = document.getElementById('ff-metric-attention');
    if (attnEl) attnEl.textContent = summary.attentionScore + '%';
    
    const wpmEl = document.getElementById('ff-metric-wpm');
    if (wpmEl && summary.readingSpeed > 0) {
        wpmEl.textContent = summary.readingSpeed + ' ' + this._t('metrics.wpm');
    }
    
    const focusEl = document.getElementById('ff-metric-focus');
    if (focusEl) focusEl.textContent = summary.focusRatio + '%';
    
    const regEl = document.getElementById('ff-metric-regression');
    if (regEl) regEl.textContent = summary.regressionRate + this._t('metrics.perMin');
    
    const durMetricEl = document.getElementById('ff-metric-duration');
    if (durMetricEl) durMetricEl.textContent = summary.sessionDuration + ' ' + this._t('metrics.min');
    
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
        wpmBadge.textContent = summary.readingSpeed + ' ' + this._t('metrics.wpm');
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
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await FocusFlow.init();
    } catch (err) {
        console.error('[FocusFlow] Fatal startup error:', err);
        // Keep the app usable: at minimum show default reading content.
        if (!FocusFlow.readingView) {
            try {
                FocusFlow.readingView = new ReadingView(FocusFlow.config || {});
            } catch (fallbackErr) {
                console.error('[FocusFlow] ReadingView fallback failed:', fallbackErr);
            }
        }
    }
});
