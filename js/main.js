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
    adaptiveTypography: false,       // Disabled — keep reading font size fixed
    highlightIntensity: 0.15,
    dimIntensity: 0.35,
    dimDelay: 3000,
    
    // Member C config — comprehension assist fires on Struggling state
    summaryMaxSentences: 2,
    llmApiUrl: '/api/summarize',
    llmTranslateUrl: '/api/translate',
    llmStatusUrl: '/api/llm/status',
    llmConcurrency: 3,
    llmTranslateConcurrency: 2,
};

// Gaze dot element reference
FocusFlow._gazeDotElement = null;
FocusFlow._gazeDotUI = null;

// Internal state
FocusFlow._gazeHistory = [];
FocusFlow._maxGazeHistory = 10;
FocusFlow._lastBlockIndex = -1;
FocusFlow._blockDwellStart = 0;
FocusFlow._wpmTrackIndex = -1;
FocusFlow._wpmTrackStart = 0;
FocusFlow._blockChangeTime = 0;
FocusFlow._blockSummaryCache = {};
FocusFlow._paragraphSummaries = {};
FocusFlow._comprehensionCardBlock = -1;
FocusFlow._lastStrategyId = 'none';
FocusFlow._lastActivationKey = 'none';
FocusFlow._interventionMilestones = {
    stateKey: '',
    distracted6: false,
    distracted12: false,
    struggling8: false
};

FocusFlow._currentStateName = 'Normal';
FocusFlow._lastGazeTime = 0;
FocusFlow._lastGazeX = NaN;
FocusFlow._lastGazeY = NaN;
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
FocusFlow._lastAnalyticsTs = 0;
FocusFlow._analyticsIntervalMs = 500;
FocusFlow._lastDashboardUpdateTs = 0;
FocusFlow._dashboardUpdateIntervalMs = 200;
FocusFlow._lastPipelineRunTs = 0;
FocusFlow._pipelineIntervalMs = 100; // ~10 FPS — leave CPU for WebGazer face mesh
FocusFlow._calibrationLastGaze = null;
FocusFlow._summaryGenerationInProgress = new Set();
FocusFlow._translationInProgress = new Set();
FocusFlow._metaTranslationInProgress = new Set();
FocusFlow._documentTranslationInProgress = false;
FocusFlow._allBlockTexts = [];
FocusFlow._simulationActive = false;
FocusFlow._initialized = false;
FocusFlow._calibrationDone = false;
FocusFlow._calibrationInProgress = false;
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
    console.log('[FocusFlow] ✅ Member A - Cognitive State Machine loaded (v' + this.cognition.version + ')');

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

    // 9b. Initialize Member C: LLM translate manager
    this.llmTranslateManager = new LLMTranslateManager(this.config);
    await this.llmTranslateManager.init();
    this.config.llmTranslateEnabled = this.llmTranslateManager.isEnabled();
    console.log('[FocusFlow] ✅ Member C - LLM Translate', this.config.llmTranslateEnabled ? 'enabled' : 'unavailable');

    // 10. Initialize the reading content with all block word counts
    this._initBlockWordCounts();
    this._precomputeParagraphSummaries();
    this._syncTranslateUI();

    const readingContent = document.getElementById('ff-reading-content');
    if (readingContent) {
        readingContent.addEventListener('content-loaded', () => {
            this._initBlockWordCounts();
            this._precomputeParagraphSummaries();
            this._syncTranslateUI();
        });
    }

    document.addEventListener('focusflow-state-change', (event) => {
        const detail = event.detail || {};
        if (this.analytics && detail.currentState) {
            this.analytics.recordStateTransition(detail.previousState, detail.currentState);
        }
        if (!this._initialized || !this.decision) return;
        // Gaze mode: interventions are driven by onGazeData — avoid duplicate work on state change.
        if (this.config.trackingMode === 'gaze' && this.config.useWebGazer && !this.config.demoMode) {
            return;
        }
        const state = detail.currentState;
        const features = detail.features || {};
        let gazeBlock = null;
        if (this.readingView && Number.isFinite(this._lastGazeX) && Number.isFinite(this._lastGazeY)) {
            gazeBlock = this.readingView.getBlockAtGaze(this._lastGazeX, this._lastGazeY);
        }
        this._applyInterventions(state, null, gazeBlock, features);
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
        const text = this.readingView.getBlockText(i);
        this._allBlockTexts.push(text);
        const wordCount = this.readingView.getBlockWordCount(i);
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
        if (this.config.trackingMode !== 'gaze') return;
    }

    this._setupGazeListener();

    if (typeof window.mountWebGazerPreview === 'function') {
        window.mountWebGazerPreview();
    }
    this._ensureWebGazerGazeDot();
    setTimeout(() => this._ensureWebGazerGazeDot(), 400);
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
        this._calibrationDone = false;

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
 * Run the 9-point calibration procedure (WebGazer handles gaze dot).
 */
FocusFlow._runCalibration = function() {
    return new Promise((resolve) => {
        console.log('[FocusFlow] 🎯 Starting 9-point calibration...');
        this._calibrationInProgress = true;
        this._calibrationLastGaze = null;

        if (window.webgazer) {
            try {
                if (typeof webgazer.setGazeListener === 'function') {
                    webgazer.setGazeListener((data) => {
                        if (!this._calibrationInProgress || !data) return;
                        if (Number.isFinite(data.x) && Number.isFinite(data.y)) {
                            this._calibrationLastGaze = { x: data.x, y: data.y };
                        }
                    });
                }
                if (typeof webgazer.showPredictionPoints === 'function') {
                    webgazer.showPredictionPoints(true);
                }
                if (typeof webgazer.resume === 'function') {
                    webgazer.resume();
                }
            } catch (e) {}
        }

        this.calibration = new CalibrationManager(this.config);

        this.calibration.start(
            (calibrationData) => {
                this._calibrationInProgress = false;

                if (calibrationData) {
                    this.calibrationData = calibrationData;
                    const results = this.calibration.getResults();

                    if (results) {
                        const offsets = results.points.map(p => ({
                            targetX: p.targetX,
                            targetY: p.targetY,
                            gazeX: p.averageX,
                            gazeY: p.averageY,
                            dx: p.averageX - p.targetX,
                            dy: p.averageY - p.targetY
                        }));

                        this.gazeOffsetX = -results.averageOffsetX;
                        this.gazeOffsetY = -results.averageOffsetY;
                        this._calibrationOffsets = offsets;

                        console.log('[FocusFlow] ✅ Calibration complete!');
                        console.log(`[FocusFlow]   Accuracy: ${results.accuracy.toFixed(1)}px average error`);
                        console.log(`[FocusFlow]   Offset: (${this.gazeOffsetX.toFixed(1)}, ${this.gazeOffsetY.toFixed(1)})`);
                    }

                    this._calibrationDone = true;

                    if (this.visualEffects) {
                        const accuracy = results ? results.accuracy.toFixed(0) : '?';
                        this.visualEffects.showPrompt(
                            '🎯',
                            this._t('calibration.complete.title'),
                            this._t('calibration.complete.sub', { accuracy })
                        );
                    }
                } else {
                    console.log('[FocusFlow] ⏭️ Calibration skipped, switching to mouse mode');
                    this.switchToMouseTracking('calibration skipped');
                    this._calibrationDone = true;

                    if (this.visualEffects) {
                        this.visualEffects.showPrompt(
                            '🖱️',
                            this._t('calibration.skipped.title'),
                            this._t('calibration.skipped.sub')
                        );
                    }
                }

                if (typeof window.applyGazeDotVisibility === 'function') {
                    window.applyGazeDotVisibility();
                }
                this._ensureWebGazerGazeDot();

                resolve(calibrationData);
            },
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
                .showFaceOverlay(false)
                .showFaceFeedbackBox(false)
                .showVideoPreview(true)
                .showPredictionPoints(this.config.showGazeDot && this.config.trackingMode !== 'mouse')
                .begin()
                .then(() => {
                    this._webGazerStarted = true;
                    this._webGazerStarting = false;
                    this.config.demoMode = false;
                    this.config.useWebGazer = true;
                    this.config.trackingMode = 'gaze';
                    if (typeof window.applyGazeDotVisibility === 'function') {
                        window.applyGazeDotVisibility();
                    }
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
    this._calibrationInProgress = false;

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
 * Keep WebGazer #webgazerGazeDot visible (lives on document.body).
 */
FocusFlow._ensureWebGazerGazeDot = function() {
    const isGaze = this.config.trackingMode === 'gaze';
    const show = this.config.showGazeDot !== false && isGaze;

    const custom = document.getElementById('ff-gaze-cursor');
    if (custom) {
        custom.style.display = 'none';
        custom.style.visibility = 'hidden';
        custom.style.opacity = '0';
    }

    if ((!show || !isGaze) && this.visualEffects) {
        this.visualEffects.hideGazeGlow();
    }

    try {
        if (window.webgazer) {
            if (typeof webgazer.showPredictionPoints === 'function') {
                webgazer.showPredictionPoints(show);
            }
            if (show && typeof webgazer.resume === 'function') {
                webgazer.resume();
            }
        }
    } catch (e) {}

    const dot = document.getElementById('webgazerGazeDot');
    if (!dot) return;

    if (!dot.parentNode || dot.parentNode !== document.body) {
        document.body.appendChild(dot);
    }

    if (show) {
        dot.style.display = 'block';
        dot.style.visibility = 'visible';
        dot.style.opacity = '0.7';
        dot.style.position = 'fixed';
        dot.style.zIndex = '99999';
        dot.style.pointerEvents = 'none';
    } else {
        dot.style.display = 'none';
    }
};

/**
 * Set up the post-calibration gaze listener with smoothing and offset correction.
 * Gaze position dot is rendered by WebGazer (showPredictionPoints).
 */
FocusFlow._setupGazeListener = function() {
    if (!window.webgazer) return;

    webgazer.setGazeListener((data, elapsedTime) => {
        if (data == null) return;

        const correctedData = this._applyCalibration(data);
        const smoothedData = this._smoothGaze(correctedData);

        this._lastGazeX = smoothedData.x;
        this._lastGazeY = smoothedData.y;

        const now = performance.now();
        if ((now - this._lastPipelineRunTs) < this._pipelineIntervalMs) {
            return;
        }
        this._lastPipelineRunTs = now;

        this.onGazeData(smoothedData, elapsedTime);
    });

    this._ensureWebGazerGazeDot();

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
 * Attach reading-area context so states distinguish "reading pause" from "left the page".
 */
FocusFlow._enrichFeaturesForCognition = function(features) {
    if (!features) return features;

    let onReadingContent = false;
    let readingBlockIndex = -1;
    let pointerInReadingPanel = false;

    const x = this._lastGazeX;
    const y = this._lastGazeY;
    const readingEl = document.getElementById('ff-reading-content');

    if (readingEl && Number.isFinite(x) && Number.isFinite(y)) {
        const r = readingEl.getBoundingClientRect();
        pointerInReadingPanel = y >= r.top && y <= r.bottom && x >= r.left && x <= r.right;
    }

    if (this.readingView && Number.isFinite(x) && Number.isFinite(y)) {
        const block = this.readingView.getBlockAtGaze(x, y);
        if (block) {
            onReadingContent = true;
            readingBlockIndex = block.index;
        }
    }

    features.onReadingContent = onReadingContent;
    features.readingBlockIndex = readingBlockIndex;
    features.pointerInReadingPanel = pointerInReadingPanel;

    const now = performance.now();
    let paragraphDwellTime = 0;
    if (pointerInReadingPanel && onReadingContent && readingBlockIndex >= 0) {
        if (readingBlockIndex !== this._lastBlockIndex || this._blockDwellStart <= 0) {
            this._lastBlockIndex = readingBlockIndex;
            this._blockDwellStart = now;
        }
        paragraphDwellTime = now - this._blockDwellStart;
    } else {
        this._lastBlockIndex = -1;
        this._blockDwellStart = 0;
    }
    features.paragraphDwellTime = paragraphDwellTime;

    return features;
};

/**
 * Periodic cognition update — keeps state machine and duration accurate without gaze/mouse movement.
 */
FocusFlow.runCognitionTick = function() {
    if (!this._initialized || !this.perception || !this.cognition || !this.decision) return;
    if (document.hidden || this._simulationActive || this._calibrationInProgress) return;

    const now = performance.now();

    const features = this._enrichFeaturesForCognition(this.perception.getFeatures());
    this.cognition.update(features, now);
    const state = this.cognition.getState();
    this._currentStateName = state.name;

    if (this.analytics && typeof this.analytics.tickActivity === 'function') {
        this.analytics.tickActivity(state.name);
    }

    // Gaze mode: full pipeline runs in onGazeData — only refresh state duration here.
    if (this.config.trackingMode === 'gaze' && this.config.useWebGazer && !this.config.demoMode) {
        return;
    }

    const strategy = this.decision.decide(state, features, {});

    let gazeBlock = null;
    if (this.readingView && Number.isFinite(this._lastGazeX) && Number.isFinite(this._lastGazeY)) {
        gazeBlock = this.readingView.getBlockAtGaze(this._lastGazeX, this._lastGazeY);
    }
    this._applyInterventions(state, strategy, gazeBlock, features);
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
    if (this._calibrationInProgress) return;

    const now = performance.now();

    if ((now - this._lastPipelineRunTs) < this._pipelineIntervalMs) {
        return;
    }
    this._lastPipelineRunTs = now;
    if (!data || !Number.isFinite(data.x) || !Number.isFinite(data.y)) return;

    this._lastGazeX = data.x;
    this._lastGazeY = data.y;
    this._lastGazeTime = now;
    
    // ============================================
    // MEMBER A: Perception Layer
    // ============================================
    this.perception.update(data, elapsedTime);
    const features = this._enrichFeaturesForCognition(this.perception.getFeatures());
    
    // ============================================
    // MEMBER A: Cognitive State Machine
    // ============================================
    this.cognition.update(features, elapsedTime);
    const currentState = this.cognition.getState();
    this._currentStateName = currentState.name;

    const gazeBlock = this.readingView.getBlockAtGaze(data.x, data.y);
    
    // ============================================
    // MEMBER A: Decision Layer
    // ============================================
    const strategy = this.decision.decide(currentState, features, {});
    this._applyInterventions(currentState, strategy, gazeBlock, features);
    const blockIndex = gazeBlock ? gazeBlock.index : -1;

    if (blockIndex >= 0 && blockIndex !== this._wpmTrackIndex) {
        if (this._wpmTrackIndex >= 0 && this._wpmTrackStart > 0) {
            const dwellMs = now - this._wpmTrackStart;
            this.analytics.recordBlockSpeed(this._wpmTrackIndex, dwellMs, currentState.name);
            this._updateReadingSpeedDisplay();
        }
        this._wpmTrackIndex = blockIndex;
        this._wpmTrackStart = now;
    } else if (blockIndex < 0) {
        this._wpmTrackIndex = -1;
        this._wpmTrackStart = 0;
    }
    
    // Update visual effects with gaze position (radial dim center, glow)
    if (this.visualEffects) {
        this.visualEffects.updateGazePosition(data.x, data.y);
    }
    
    // ============================================
    // MEMBER B: Adaptive Visual Effects (via InterventionExecutor)
    // ============================================
    // ============================================
    // MEMBER B: Set current block highlight
    // ============================================
    if (gazeBlock && gazeBlock.index !== this.readingView.currentHighlightIndex) {
        this.readingView.setCurrentBlock(gazeBlock.index);
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
        const wpm = this.analytics ? this.analytics.getLastReadingSpeed() : 0;
        this.debugPanel.setWpm(wpm);
        this.debugPanel.setDimLevel(this.visualEffects ? this.visualEffects.dimIntensity : 0);
        this.debugPanel.setEffectsCount(this.visualEffects ? this.visualEffects._activeEffectCount : 0);
        this.debugPanel.updateData({});
    }
    
    // ============================================
    // MEMBER C: Analytics Recording
    // ============================================
    if ((now - this._lastAnalyticsTs) >= this._analyticsIntervalMs) {
        const gazeData = {
            x: data.x,
            y: data.y,
            blockId: gazeBlock ? gazeBlock.blockId : null,
            blockIndex: blockIndex
        };
        this.analytics.recordGazeSample(gazeData, currentState.name);
        this._lastAnalyticsTs = now;
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
 * Reset per-state intervention milestone flags (1.md timed triggers).
 */
FocusFlow._resetInterventionMilestones = function(stateName) {
    this._interventionMilestones = {
        stateKey: stateName,
        distracted6: false,
        distracted12: false,
        struggling8: false
    };
};

/**
 * Apply intervention: resolve strategy from state, fire timed actions, sustain effects.
 */
FocusFlow._applyInterventions = function(state, strategy, gazeBlock, features) {
    if (typeof InterventionExecutor === 'undefined') return;

    const interventionStrategy = this.decision && this.decision.interventionStrategy;
    const resolved = interventionStrategy
        ? interventionStrategy.resolve(state)
        : (strategy || { id: 'none' });
    const displayState = interventionStrategy
        ? interventionStrategy.getDisplayState(state)
        : 'Idle';

    const ctx = {
        focusFlow: this,
        state,
        strategy: resolved,
        gazeBlock,
        features,
        displayState
    };

    if (this._interventionMilestones.stateKey !== state.name) {
        this._resetInterventionMilestones(state.name);

        if (state.name === 'Normal' || state.name === 'Idle') {
            InterventionExecutor.deactivateAll(ctx);
        } else if (state.name === 'Struggling') {
            InterventionExecutor.activate({ id: 'keyword_highlight' }, ctx, { force: true });
        } else if (state.name === 'Distracted') {
            InterventionExecutor.deactivateAll(ctx);
        }
    }

    const durationSec = (state.duration || 0) / 1000;

    if (state.name === 'Distracted') {
        if (durationSec >= 6 && !this._interventionMilestones.distracted6) {
            InterventionExecutor.activate({ id: 'floating_prompt' }, ctx);
            this._interventionMilestones.distracted6 = true;
        }
        if (durationSec >= 12 && !this._interventionMilestones.distracted12) {
            InterventionExecutor.activate({ id: 'sound_alert' }, ctx);
            this._interventionMilestones.distracted12 = true;
        }
    }

    if (state.name === 'Struggling') {
        if (durationSec >= 8 && !this._interventionMilestones.struggling8) {
            InterventionExecutor.activate({ id: 'summary_panel' }, ctx);
            this._interventionMilestones.struggling8 = true;
        }
    }

    InterventionExecutor.sustain(resolved, ctx);
};

/** @deprecated Use _applyInterventions */
FocusFlow._applyAdaptiveUI = function(state, strategy, gazeBlock, features) {
    this._applyInterventions(state, strategy, gazeBlock, features);
};


FocusFlow.requestComprehensionForBlock = function(blockIndex, options = {}) {
    const { manual = false, auto = false, struggleTrigger = false, simplified = false, dwellTime = 0 } = options;
    if (blockIndex < 0) return;

    const cached = this._blockSummaryCache[blockIndex];

    if (manual && cached) {
        this.reopenComprehensionForBlock(blockIndex);
        return;
    }

    if (auto && struggleTrigger && cached) {
        this._displayComprehensionCard(blockIndex, cached, dwellTime, { recordAnalytics: true });
        return;
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
    this._generateComprehensionForBlock(blockIndex, gazeBlock, dwellTime, { simplified });
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

FocusFlow._generateComprehensionForBlock = function(blockIndex, gazeBlock, dwellTime, options = {}) {
    const simplified = !!(options && options.simplified);
    const text = (this._allBlockTexts && this._allBlockTexts[blockIndex])
        ? this._allBlockTexts[blockIndex]
        : (gazeBlock && gazeBlock.element ? gazeBlock.element.textContent : '');

    const docLang = this.readingView && typeof this.readingView.getDocumentLang === 'function'
        ? this.readingView.getDocumentLang()
        : (typeof ParagraphSummarizer !== 'undefined' ? ParagraphSummarizer.detectLanguage(text) : 'en');

    this._displayComprehensionLoading(blockIndex, dwellTime);

    const summarizeLocal = () => {
        if (typeof ParagraphSummarizer === 'undefined') return null;
        return ParagraphSummarizer.summarize(text, {
            lang: docLang,
            maxChars: simplified ? 120 : undefined
        });
    };

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
                const local = summarizeLocal();
                if (local) {
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
            if (!summary) summary = summarizeLocal();
            finish(summary && summary.text, summary && summary.method);
        } catch (_) {
            this._summaryGenerationInProgress.delete(blockIndex);
        }
    }, 0);
};

FocusFlow._syncTranslateUI = function() {
    const rv = this.readingView;
    const enabled = !!(this.config && this.config.llmTranslateEnabled && this.llmTranslateManager && this.llmTranslateManager.isEnabled());
    const show = enabled && rv && typeof rv.isEnglishDocument === 'function' && rv.isEnglishDocument();

    if (rv && typeof rv.setTranslateActionsVisible === 'function') {
        rv.setTranslateActionsVisible(show);
    }

    const btn = document.getElementById('btn-translate-all');
    if (btn) {
        btn.hidden = !show || this._documentTranslationInProgress;
        if (show && !this._documentTranslationInProgress) {
            this._syncTranslateAllButton();
        }
    }
};

FocusFlow._syncTranslateAllButton = function() {
    const btn = document.getElementById('btn-translate-all');
    const rv = this.readingView;
    if (!btn || !rv) return;

    let key = 'reading.translateAll';
    if (typeof rv.hasAnyTranslation === 'function' && rv.hasAnyTranslation()) {
        if (typeof rv.hasAllTranslations === 'function'
            && rv.hasAllTranslations()
            && rv.areAllTranslationsVisible()) {
            key = 'reading.hideAllTranslations';
        } else {
            key = 'reading.showAllTranslations';
        }
    }

    btn.dataset.i18n = key;
    btn.textContent = this._t(key);
};

FocusFlow._applyBlockTranslation = function(blockIndex, translated, options = {}) {
    const visible = options.visible !== false;
    if (!this.readingView || blockIndex < 0) return;
    this.readingView.applyBlockTranslation(blockIndex, translated, visible);
};

FocusFlow.handleTranslateBlock = async function(blockIndex) {
    if (blockIndex < 0 || !this.readingView || !this.readingView.isEnglishDocument()) return;

    if (this.readingView.hasBlockTranslation(blockIndex)) {
        const visible = this.readingView.toggleBlockTranslation(blockIndex);
        this.readingView.updateTranslateButton(blockIndex, visible ? 'hide' : 'show');
        this._syncTranslateAllButton();
        return;
    }

    await this.translateBlock(blockIndex);
};

FocusFlow.handleTranslateMeta = async function(metaKey) {
    if (!metaKey || !this.readingView || !this.readingView.isEnglishDocument()) return;

    if (this.readingView.hasMetaTranslation(metaKey)) {
        const visible = this.readingView.toggleMetaTranslation(metaKey);
        this.readingView.updateMetaTranslateButton(metaKey, visible ? 'hide' : 'show');
        this._syncTranslateAllButton();
        return;
    }

    await this.translateMeta(metaKey);
};

FocusFlow.translateMeta = async function(metaKey) {
    if (!metaKey || !this.llmTranslateManager || !this.llmTranslateManager.isEnabled()) return;
    if (!this.readingView || !this.readingView.isEnglishDocument()) return;
    if (this._metaTranslationInProgress.has(metaKey)) return;

    const original = this.readingView.getOriginalMetaText(metaKey);
    if (!original || !original.trim()) return;

    this._metaTranslationInProgress.add(metaKey);
    this.readingView.updateMetaTranslateButton(metaKey, 'loading');

    try {
        const translated = await this.llmTranslateManager.translate(original);
        this.readingView.applyMetaTranslation(metaKey, translated, true);
        this.readingView.updateMetaTranslateButton(metaKey, 'hide');
        this._syncTranslateAllButton();
    } catch (err) {
        console.warn('[FocusFlow] Meta translation failed:', err);
        this.readingView.updateMetaTranslateButton(metaKey, 'idle');
        if (this.visualEffects) {
            this.visualEffects.showPrompt('⚠️', this._t('reading.translateError'), err.message || '');
        }
    } finally {
        this._metaTranslationInProgress.delete(metaKey);
    }
};

FocusFlow.translateBlock = async function(blockIndex) {
    if (blockIndex < 0 || !this.llmTranslateManager || !this.llmTranslateManager.isEnabled()) return;
    if (!this.readingView || !this.readingView.isEnglishDocument()) return;
    if (this._translationInProgress.has(blockIndex)) return;

    const original = this.readingView.getOriginalBlockText(blockIndex);
    if (!original || !original.trim()) return;

    this._translationInProgress.add(blockIndex);
    this.readingView.updateTranslateButton(blockIndex, 'loading');

    try {
        const translated = await this.llmTranslateManager.translate(original);
        this._applyBlockTranslation(blockIndex, translated, { visible: true });
        this.readingView.updateTranslateButton(blockIndex, 'hide');
        this._syncTranslateAllButton();
    } catch (err) {
        console.warn('[FocusFlow] Block translation failed:', err);
        this.readingView.updateTranslateButton(blockIndex, 'idle');
        if (this.visualEffects) {
            this.visualEffects.showPrompt('⚠️', this._t('reading.translateError'), err.message || '');
        }
    } finally {
        this._translationInProgress.delete(blockIndex);
    }
};

FocusFlow._translateDocumentMeta = async function(options = {}) {
    const rv = this.readingView;
    const onlyMissing = !!options.onlyMissing;
    const visible = options.visible !== false;
    if (!rv || !rv.container || !rv._originalDocument) return;

    const orig = rv._originalDocument;

    if (orig.title && (!onlyMissing || !rv.hasMetaTranslation('title'))) {
        const translated = await this.llmTranslateManager.translate(orig.title);
        rv.applyMetaTranslation('title', translated, visible);
        rv.updateMetaTranslateButton('title', visible ? 'hide' : 'show');
    }

    if (orig.subtitle && (!onlyMissing || !rv.hasMetaTranslation('subtitle'))) {
        const translated = await this.llmTranslateManager.translate(orig.subtitle);
        rv.applyMetaTranslation('subtitle', translated, visible);
        rv.updateMetaTranslateButton('subtitle', visible ? 'hide' : 'show');
    }

    const origHeadings = (orig.blocks || []).filter((b) => b.type === 'heading');
    for (let i = 0; i < origHeadings.length; i++) {
        const metaKey = `heading-${i}`;
        if (onlyMissing && rv.hasMetaTranslation(metaKey)) continue;
        const translated = await this.llmTranslateManager.translate(origHeadings[i].text);
        rv.applyMetaTranslation(metaKey, translated, visible);
        rv.updateMetaTranslateButton(metaKey, visible ? 'hide' : 'show');
    }
};

FocusFlow._updateTranslateAllProgress = function(current, total) {
    const btn = document.getElementById('btn-translate-all');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = this._t('reading.translateAllProgress', { current, total });
};

FocusFlow.translateEntireDocument = async function() {
    if (!this.llmTranslateManager || !this.llmTranslateManager.isEnabled()) return;
    if (!this.readingView || !this.readingView.isEnglishDocument()) return;
    if (this._documentTranslationInProgress) return;

    const rv = this.readingView;

    if (rv.hasAnyTranslation() && rv.hasAllTranslations()) {
        rv.setAllTranslationsVisible(!rv.areAllTranslationsVisible());
        this._syncTranslateAllButton();
        return;
    }

    const blockIndices = rv.getUntranslatedBlockIndices();
    const missingMeta = rv.getMissingMetaKeys();
    if (!blockIndices.length && !missingMeta.length) {
        rv.setAllTranslationsVisible(true);
        this._syncTranslateAllButton();
        return;
    }

    const total = blockIndices.length;
    this._documentTranslationInProgress = true;
    this._syncTranslateUI();
    this._updateTranslateAllProgress(0, Math.max(total, 1));

    try {
        await this._translateDocumentMeta({
            onlyMissing: rv.hasAnyTranslation(),
            visible: true
        });

        let done = 0;
        for (const index of blockIndices) {
            const original = rv.getOriginalBlockText(index);
            const translated = await this.llmTranslateManager.translate(original);
            this._applyBlockTranslation(index, translated, { visible: true });
            rv.updateTranslateButton(index, 'hide');
            done++;
            this._updateTranslateAllProgress(done, Math.max(total, 1));
        }

        rv.setAllTranslationsVisible(true);
        rv.markDocumentHasTranslations();
        this._syncTranslateAllButton();

        if (this.visualEffects) {
            this.visualEffects.showPrompt('🌐', this._t('reading.translateDone'), '');
        }
    } catch (err) {
        console.warn('[FocusFlow] Document translation failed:', err);
        if (this.visualEffects) {
            this.visualEffects.showPrompt('⚠️', this._t('reading.translateError'), err.message || '');
        }
    } finally {
        this._documentTranslationInProgress = false;
        this._syncTranslateUI();
        const btn = document.getElementById('btn-translate-all');
        if (btn) btn.disabled = false;
    }
};

/**
 * Open the end-of-session analytics report (heatmap + stats).
 */
FocusFlow.showSessionReport = function() {
    if (typeof SessionReport === 'undefined' || !this.analytics) return;
    SessionReport.show(this.analytics, this.readingView);
};

FocusFlow._updateReadingSpeedDisplay = function() {
    if (!this.analytics) return;
    const unit = this._t('metrics.wpm');
    const sessionSpeed = this.analytics.getReadingSpeed();

    const metric = document.getElementById('ff-metric-wpm');
    if (metric) {
        metric.textContent = sessionSpeed > 0 ? `${sessionSpeed} ${unit}` : '--';
    }
};

/**
 * Update the UI dashboard with current state info
 */
FocusFlow.updateDashboard = function(state, strategy, gazeBlock) {
    const interventionStrategy = this.decision && this.decision.interventionStrategy;
    const displayState = interventionStrategy
        ? interventionStrategy.getDisplayState(state)
        : (state && state.name) || 'Idle';
    const resolved = strategy || (interventionStrategy ? interventionStrategy.resolve(state) : { id: 'none' });

    const iconEl = document.getElementById('ff-state-icon');
    const nameEl = document.getElementById('ff-state-name');
    const durEl = document.getElementById('ff-state-duration');

    const displayIcons = {
        Focus: '🧠',
        LowDistraction: '👀',
        HighDistraction: '⚠️',
        LowStruggling: '🤔',
        HighStruggling: '😓',
        Idle: '⏳'
    };
    const displayColors = {
        Focus: '#4CAF50',
        LowDistraction: '#FF9800',
        HighDistraction: '#F44336',
        LowStruggling: '#FF5722',
        HighStruggling: '#D32F2F',
        Idle: '#94a3b8'
    };

    if (iconEl) {
        iconEl.textContent = displayIcons[displayState] || '🧠';
    }
    if (nameEl) {
        nameEl.textContent = (typeof I18n !== 'undefined')
            ? I18n.translateState(displayState)
            : displayState;
    }
    const descEl = document.getElementById('ff-state-desc');
    if (descEl) {
        descEl.textContent = (typeof I18n !== 'undefined')
            ? I18n.translateStateHint(displayState)
            : 'Focused reading';
    }
    if (durEl) {
        durEl.textContent = (state.duration / 1000).toFixed(1);
    }

    const strategyNameEl = document.getElementById('ff-strategy-name');
    const strategyDescEl = document.getElementById('ff-strategy-desc');
    const strategyText = (typeof I18n !== 'undefined')
        ? I18n.translateStrategy(resolved)
        : {
            name: resolved?.name || this._t('strategy.none'),
            desc: resolved?.description || this._t('strategy.waiting')
        };
    if (strategyNameEl) strategyNameEl.textContent = strategyText.name;
    if (strategyDescEl) strategyDescEl.textContent = strategyText.desc;

    const badgeEl = document.getElementById('ff-escalation-badge');
    if (badgeEl) {
        badgeEl.hidden = true;
    }

    const cardState = document.getElementById('card-state');
    if (cardState && state) {
        const color = displayColors[displayState] || '#1e293b';
        cardState.style.borderColor = color;
        cardState.style.boxShadow = `0 0 20px ${color}20`;
        if (nameEl) nameEl.style.color = color;
    }
    
    const summary = this.analytics.getSessionSummary();
    
    const wpmEl = document.getElementById('ff-metric-wpm');
    if (wpmEl) {
        wpmEl.textContent = summary.readingSpeed > 0
            ? summary.readingSpeed + ' ' + this._t('metrics.wpm')
            : '--';
    }
    
    const focusEl = document.getElementById('ff-metric-focus');
    if (focusEl) focusEl.textContent = summary.focusRatio + '%';
    
    const regEl = document.getElementById('ff-metric-regression');
    if (regEl) regEl.textContent = summary.regressionRate + this._t('metrics.perMin');
    
    const durMetricEl = document.getElementById('ff-metric-duration');
    if (durMetricEl) {
        const mins = summary.sessionDuration ?? summary.duration ?? 0;
        durMetricEl.textContent = mins + ' ' + this._t('metrics.min');
    }
    
    const distEl = document.getElementById('ff-metric-distractions');
    if (distEl) distEl.textContent = summary.distractionCount;
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
 * Reset cognitive state, interventions, and session data without stopping tracking.
 */
FocusFlow.resetSession = function(options) {
    const silent = !!(options && options.silent);
    if (!this._initialized) return;

    if (this._resetInterventionMilestones) {
        this._resetInterventionMilestones('Normal');
    }
    this._currentStateName = 'Normal';
    this._lastStrategyId = 'none';
    this._lastActivationKey = 'none';
    this._distractionAlertShown = false;
    this._lastStrugglePrompt = false;
    this._wakeUpTriggered = false;
    this._offScreenStart = 0;
    this._gazeOffBlockStart = 0;
    this._wpmTrackIndex = -1;
    this._wpmTrackStart = 0;

    if (this.perception) this.perception.reset();
    if (this.cognition) this.cognition.reset();
    if (this.decision) this.decision.reset();

    const ctx = { focusFlow: this };
    if (typeof InterventionExecutor !== 'undefined') {
        InterventionExecutor.reset(ctx);
    } else if (this.visualEffects) {
        this.visualEffects.reset();
    }

    if (this._blockSummaryCache) this._blockSummaryCache = {};
    if (this._summaryGenerationInProgress) this._summaryGenerationInProgress = new Set();
    this._comprehensionCardBlock = -1;

    if (this.analytics && typeof this.analytics.reset === 'function') {
        this.analytics.reset();
    }

    const state = this.cognition ? this.cognition.getState() : null;
    if (state && typeof this.updateDashboard === 'function') {
        const strategy = this.decision && this.decision.interventionStrategy
            ? this.decision.interventionStrategy.resolve(state)
            : { id: 'none' };
        this.updateDashboard(state, strategy, null);
    }

    if (!silent && this.visualEffects) {
        const title = (typeof I18n !== 'undefined') ? I18n.t('reset.done') : 'Reset complete';
        const hint = (typeof I18n !== 'undefined') ? I18n.t('reset.hint') : 'State and interventions cleared';
        this.visualEffects.showPrompt('🔄', title, hint);
    }

    console.log('[FocusFlow] Session reset');
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
