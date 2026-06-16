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
FocusFlow.perception = null;
FocusFlow.cognition = null;
FocusFlow.decision = null;
FocusFlow.readingView = null;
FocusFlow.visualEffects = null;
FocusFlow.focusMode = null;
FocusFlow.debugPanel = null;
FocusFlow.keywordExtractor = null;
FocusFlow.analytics = null;
FocusFlow.calibration = null;
FocusFlow.calibrationData = null;

FocusFlow.gazeOffsetX = 0;
FocusFlow.gazeOffsetY = 0;
FocusFlow.gazeScaleX = 1;
FocusFlow.gazeScaleY = 1;

FocusFlow.config = {
    debug: false,
    demoMode: true,
    useWebGazer: false,
    saveData: true,
    showGazeDot: true,
    trackingMode: 'mouse',
    calibrationEnabled: true,
    calibrationRequired: true,
    adaptiveTypography: false,
    highlightIntensity: 0.15,
    dimIntensity: 0.35,
    dimDelay: 3000,
    summaryMaxSentences: 2,
    llmApiUrl: '/api/summarize',
    llmTranslateUrl: '/api/translate',
    llmInsightUrl: '/api/session-insight',
    llmStatusUrl: '/api/llm/status',
    llmConcurrency: 3,
    llmTranslateConcurrency: 2,
};

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

// One-Euro Filter state for gaze smoothing
FocusFlow._smoothGazeX = NaN;
FocusFlow._smoothGazeY = NaN;
FocusFlow._smoothGazeVelocityX = 0;
FocusFlow._smoothGazeVelocityY = 0;
FocusFlow._smoothLastTimestamp = 0;
FocusFlow._oneEuroMinCutoff = 0.8;
FocusFlow._oneEuroBeta = 0.007;
FocusFlow._oneEuroDerivCutoff = 1.0;
// Fixation detection
FocusFlow._fixationX = NaN;
FocusFlow._fixationY = NaN;
FocusFlow._fixationStartTime = 0;
FocusFlow._fixationRadius = 30;
FocusFlow._fixationMinDuration = 150;

FocusFlow._currentStateName = 'Normal';
FocusFlow._lastGazeTime = 0;
FocusFlow._lastGazeX = NaN;
FocusFlow._lastGazeY = NaN;
FocusFlow._outsidePanelSince = 0;
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
FocusFlow._pipelineIntervalMs = 100;
FocusFlow._calibrationLastGaze = null;
FocusFlow._summaryGenerationInProgress = new Set();
FocusFlow._translationInProgress = new Set();
FocusFlow._metaTranslationInProgress = new Set();
FocusFlow._documentTranslationInProgress = false;
FocusFlow._allBlockTexts = [];
FocusFlow._deepReadingSession = { active: false, startTime: null, endTime: null };
FocusFlow._simulationActive = false;
FocusFlow._initialized = false;
FocusFlow._calibrationDone = false;
FocusFlow._calibrationInProgress = false;
FocusFlow._cameraGateVisible = false;
FocusFlow._cameraStartupInProgress = false;

FocusFlow.init = async function() {
    if (this._initialized) return;
    console.log('[FocusFlow] Initializing v' + this.version + '...');

    this.readingView = new ReadingView(this.config);
    console.log('[FocusFlow] ✅ Member B - Reading View loaded');

    this.perception = new PerceptionModule(this.config);
    console.log('[FocusFlow] ✅ Member A - Perception Layer loaded');

    this.cognition = new StateMachine(this.config);
    console.log('[FocusFlow] ✅ Member A - Cognitive State Machine loaded (v' + this.cognition.version + ')');

    this.decision = new DecisionModule(this.config);
    console.log('[FocusFlow] ✅ Member A - Decision Layer loaded');

    this.visualEffects = new VisualEffects(this.config);
    console.log('[FocusFlow] ✅ Member B - Visual Effects loaded');

    this.focusMode = new FocusMode();
    this.focusMode.onChange((mode) => { this._syncDeepReadingControlsUI(); });
    console.log('[FocusFlow] ✅ Member B - Focus Mode Manager loaded');

    this.debugPanel = new DebugPanel();
    console.log('[FocusFlow] ✅ Member B - Debug Panel loaded');

    this.keywordExtractor = new KeywordExtractor(this.config);
    console.log('[FocusFlow] ✅ Member C - Keyword Extractor loaded (internal scoring)');

    this.analytics = new AttentionAnalytics(this.config);
    console.log('[FocusFlow] ✅ Member C - Attention Analytics loaded');

    this.llmSummaryManager = new LLMSummaryManager(this.config);
    await this.llmSummaryManager.init();
    this.config.llmEnabled = this.llmSummaryManager.isEnabled();
    console.log('[FocusFlow] ✅ Member C - LLM Summary', this.config.llmEnabled ? 'enabled' : 'fallback mode');

    this.llmTranslateManager = new LLMTranslateManager(this.config);
    await this.llmTranslateManager.init();
    this.config.llmTranslateEnabled = this.llmTranslateManager.isEnabled();
    console.log('[FocusFlow] ✅ Member C - LLM Translate', this.config.llmTranslateEnabled ? 'enabled' : 'unavailable');

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

    this.startMouseTracking();
    this._announceTrackingMode('mouse', 'default');

    setTimeout(() => {
        this.visualEffects.showPrompt('👋', this._t('welcome.title'), this._t('welcome.sub'));
    }, 1500);

    console.log('[FocusFlow] 🚀 All systems ready!');
    this._removeLegacyKeywordPanels();
    this._bindDeepReadingControls();
    this._syncDeepReadingControlsUI();
    this._initialized = true;
};

FocusFlow._initBlockWordCounts = function() {
    const blocks = this.readingView.blockElements;
    this._allBlockTexts = [];
    if (this.keywordExtractor) this.keywordExtractor.reset();
    for (let i = 0; i < blocks.length; i++) {
        const text = this.readingView.getBlockText(i);
        this._allBlockTexts.push(text);
        const wordCount = this.readingView.getBlockWordCount(i);
        this.analytics.setBlockWordCount(i, wordCount);
        if (this.keywordExtractor) this.keywordExtractor.updateVocabulary(text);
    }
};

FocusFlow._precomputeParagraphSummaries = async function() {
    this._paragraphSummaries = {};
    const docLang = this.readingView && typeof this.readingView.getDocumentLang === 'function'
        ? this.readingView.getDocumentLang() : 'en';
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

FocusFlow._tryStartEyeTracking = async function() {
    if (typeof CameraAccess === 'undefined') { this._showCameraGate('unsupported'); return false; }
    if (!CameraAccess.isSupported()) { this._showCameraGate('unsupported'); return false; }
    if (!CameraAccess.isSecureEnough()) { this._showCameraGate('file'); return false; }
    const started = await this.startWebGazer({ force: true });
    if (!started) { this._showCameraGate('denied'); return false; }
    return true;
};

FocusFlow._bootstrapCameraTracking = async function() { return this.enableCameraTracking(); };

FocusFlow._finishCameraStartup = async function() {
    if (this.config.trackingMode !== 'gaze') return;
    if (this.config.calibrationEnabled && !this._calibrationDone) {
        try { await this._runCalibration(); } catch (err) { console.warn('[FocusFlow] Calibration failed, continuing:', err); }
        if (this.config.trackingMode !== 'gaze') return;
    }
    this._setupGazeListener();
    if (typeof window.mountWebGazerPreview === 'function') window.mountWebGazerPreview();
    this._ensureWebGazerGazeDot();
    setTimeout(() => this._ensureWebGazerGazeDot(), 400);
};

FocusFlow.enableCameraTracking = async function() {
    if (this._cameraStartupInProgress) return false;
    this._cameraStartupInProgress = true;
    const gateBtn = document.getElementById('ff-camera-gate-btn');
    if (gateBtn) { gateBtn.disabled = true; gateBtn.textContent = this._t('camera.gate.working'); }
    try {
        this.stopMouseTracking();
        this.config.useWebGazer = true;
        this.config.demoMode = false;
        this._calibrationDone = false;
        const started = await this._tryStartEyeTracking();
        if (!started) { this.switchToMouseTracking('camera unavailable'); return false; }
        this._hideCameraGate();
        await this._finishCameraStartup();
        return true;
    } finally {
        this._cameraStartupInProgress = false;
        if (gateBtn) {
            gateBtn.disabled = false;
            gateBtn.textContent = this._cameraGateReason === 'denied' ? this._t('camera.gate.retry') : this._t('camera.gate.enable');
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
        gate.innerHTML = '<div class="ff-camera-gate__card"><div class="ff-camera-gate__icon">📷</div><h2 class="ff-camera-gate__title" data-i18n="camera.gate.title"></h2><p class="ff-camera-gate__text" id="ff-camera-gate-text"></p><button type="button" id="ff-camera-gate-btn" class="ff-btn ff-btn-primary"></button></div>';
        document.body.appendChild(gate);
        const btn = gate.querySelector('#ff-camera-gate-btn');
        btn.addEventListener('click', () => this.enableCameraTracking());
    }
    const title = gate.querySelector('.ff-camera-gate__title');
    const text = gate.querySelector('#ff-camera-gate-text');
    const btn = gate.querySelector('#ff-camera-gate-btn');
    const reasonKey = { denied: 'camera.gate.denied', file: 'camera.gate.file', unsupported: 'camera.gate.unsupported', prompt: 'camera.gate.prompt', unknown: 'camera.gate.prompt' }[this._cameraGateReason] || 'camera.gate.prompt';
    if (title) title.textContent = this._t('camera.gate.title');
    if (text) text.textContent = this._t(reasonKey);
    if (btn) {
        btn.textContent = this._cameraGateReason === 'denied' ? this._t('camera.gate.retry') : this._t('camera.gate.enable');
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
                if (typeof webgazer.showPredictionPoints === 'function') webgazer.showPredictionPoints(true);
                if (typeof webgazer.resume === 'function') webgazer.resume();
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
                            targetX: p.targetX, targetY: p.targetY,
                            gazeX: p.averageX, gazeY: p.averageY,
                            dx: p.averageX - p.targetX, dy: p.averageY - p.targetY
                        }));
                        this.gazeOffsetX = -results.averageOffsetX;
                        this.gazeOffsetY = -results.averageOffsetY;
                        this._calibrationOffsets = offsets;
                        console.log('[FocusFlow] ✅ Calibration complete!');
                        console.log('[FocusFlow]   Accuracy: ' + results.accuracy.toFixed(1) + 'px average error');
                        console.log('[FocusFlow]   Offset: (' + this.gazeOffsetX.toFixed(1) + ', ' + this.gazeOffsetY.toFixed(1) + ')');
                    }
                    this._calibrationDone = true;
                    if (this.visualEffects) {
                        const accuracy = results ? results.accuracy.toFixed(0) : '?';
                        this.visualEffects.showPrompt('🎯', this._t('calibration.complete.title'), this._t('calibration.complete.sub', { accuracy }));
                    }
                } else {
                    console.log('[FocusFlow] ⏭️ Calibration skipped, switching to mouse mode');
                    this.switchToMouseTracking('calibration skipped');
                    this._calibrationDone = true;
                    if (this.visualEffects) {
                        this.visualEffects.showPrompt('🖱️', this._t('calibration.skipped.title'), this._t('calibration.skipped.sub'));
                    }
                }
                if (typeof window.applyGazeDotVisibility === 'function') window.applyGazeDotVisibility();
                this._ensureWebGazerGazeDot();
                resolve(calibrationData);
            },
            (current, total) => {
                const pct = Math.round((current / total) * 100);
                console.log('[FocusFlow] Calibration progress: ' + (current + 1) + '/' + total + ' (' + pct + '%)');
            }
        );
    });
};

FocusFlow.startWebGazer = async function(options) {
    const force = !!(options && options.force);
    if (this._webGazerStarted && !force) {
        this.config.demoMode = false;
        this.config.useWebGazer = true;
        this.config.trackingMode = 'gaze';
        this._announceTrackingMode('gaze');
        return true;
    }
    if (this._webGazerStarting) return false;
    if (typeof CameraAccess === 'undefined') { this._setCameraError('camera-error', 'camera helper unavailable'); return false; }
    if (!CameraAccess.isSupported()) {
        this._reportApiError('WebGazer / Camera', 'Browser camera API (getUserMedia) unavailable', CameraAccess._suggestionsFor('unsupported'));
        this._setCameraError('camera-error', 'camera api unavailable');
        return false;
    }
    if (!CameraAccess.isSecureEnough()) { this._setCameraError('runtime-error', 'file protocol blocks camera/model loading'); return false; }
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
        try { await webgazer.end(); } catch (_) {}
        this._webGazerStarted = false;
    }
    return new Promise((resolve) => {
        try {
            webgazer.setRegression('ridge').saveDataAcrossSessions(true).showVideo(true).showFaceOverlay(false).showFaceFeedbackBox(false).showVideoPreview(true).showPredictionPoints(this.config.showGazeDot && this.config.trackingMode !== 'mouse').begin()
                .then(() => {
                    this._webGazerStarted = true;
                    this._webGazerStarting = false;
                    this.config.demoMode = false;
                    this.config.useWebGazer = true;
                    this.config.trackingMode = 'gaze';
                    if (typeof window.applyGazeDotVisibility === 'function') window.applyGazeDotVisibility();
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

FocusFlow._setCameraError = function(mode, reason) { this.switchToMouseTracking(reason || mode); };

FocusFlow._reportApiError = function(apiName, summary, suggestions) {
    console.error('[FocusFlow] API issue [' + apiName + ']: ' + summary);
    if (suggestions) suggestions.forEach(s => console.warn('[FocusFlow]', s));
    document.dispatchEvent(new CustomEvent('focusflow-api-error', { detail: { api: apiName, summary, suggestions } }));
};

FocusFlow._announceTrackingMode = function(mode, reason) {
    document.dispatchEvent(new CustomEvent('focusflow-tracking-mode', { detail: { mode, reason: reason || '' } }));
};

FocusFlow.switchToMouseTracking = function(reason) {
    this._calibrationInProgress = false;
    this._webGazerStarted = false;
    this._webGazerStarting = false;
    try { if (window.webgazer && typeof window.webgazer.end === 'function') webgazer.end(); } catch (e) {}
    try { if (window.webgazer && typeof window.webgazer.showPredictionPoints === 'function') window.webgazer.showPredictionPoints(false); } catch (e) {}
    this.config.demoMode = true;
    this.config.useWebGazer = false;
    this.config.trackingMode = 'mouse';
    this.startMouseTracking();
    this._announceTrackingMode('mouse', reason);
};

FocusFlow._ensureWebGazerGazeDot = function() {
    const isGaze = this.config.trackingMode === 'gaze';
    const show = this.config.showGazeDot !== false && isGaze;
    const custom = document.getElementById('ff-gaze-cursor');
    if (custom) { custom.style.display = 'none'; custom.style.visibility = 'hidden'; custom.style.opacity = '0'; }
    if ((!show || !isGaze) && this.visualEffects) this.visualEffects.hideGazeGlow();
    try {
        if (window.webgazer) {
            if (typeof webgazer.showPredictionPoints === 'function') webgazer.showPredictionPoints(show);
            if (show && typeof webgazer.resume === 'function') webgazer.resume();
        }
    } catch (e) {}
    const dot = document.getElementById('webgazerGazeDot');
    if (!dot) return;
    if (!dot.parentNode || dot.parentNode !== document.body) document.body.appendChild(dot);
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

FocusFlow._setupGazeListener = function() {
    if (!window.webgazer) return;
    webgazer.setGazeListener((data, elapsedTime) => {
        if (data == null) return;
        const correctedData = this._applyCalibration(data);
        const smoothedData = this._smoothGaze(correctedData);
        this._lastGazeX = smoothedData.x;
        this._lastGazeY = smoothedData.y;
        const now = performance.now();
        if ((now - this._lastPipelineRunTs) < this._pipelineIntervalMs) return;
        this._lastPipelineRunTs = now;
        this.onGazeData(smoothedData, elapsedTime);
    });
    this._ensureWebGazerGazeDot();
    console.log('[FocusFlow] 👁️ Post-calibration gaze listener active');
};

FocusFlow._applyCalibration = function(data) {
    let adjustedX = data.x;
    let adjustedY = data.y;
    if (this._calibrationOffsets && this._calibrationOffsets.length >= 9) {
        let totalWeight = 0;
        let offsetX = 0;
        let offsetY = 0;
        const eps = 50;
        for (const pt of this._calibrationOffsets) {
            const dx = data.x - pt.targetX;
            const dy = data.y - pt.targetY;
            const dist = Math.sqrt(dx * dx + dy * dy);
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
        adjustedX = data.x + this.gazeOffsetX;
        adjustedY = data.y + this.gazeOffsetY;
    }
    return { x: adjustedX, y: adjustedY, _rawX: data.x, _rawY: data.y };
};

/**
 * One-Euro Filter for gaze smoothing — low-latency adaptive noise reduction.
 * Reference: Casiez, Roussel, Vogel. CHI 2012.
 */
FocusFlow._smoothGaze = function(data) {
    const now = performance.now();
    const x = data.x;
    const y = data.y;

    if (!Number.isFinite(this._smoothGazeX) || !Number.isFinite(this._smoothGazeY)) {
        this._smoothGazeX = x;
        this._smoothGazeY = y;
        this._smoothLastTimestamp = now;
        this._smoothGazeVelocityX = 0;
        this._smoothGazeVelocityY = 0;
        return { x: x, y: y, _rawX: data._rawX !== undefined ? data._rawX : x, _rawY: data._rawY !== undefined ? data._rawY : y };
    }

    const dt = (now - this._smoothLastTimestamp) / 1000;
    if (dt <= 0 || dt > 1) {
        this._smoothGazeX = x;
        this._smoothGazeY = y;
        this._smoothLastTimestamp = now;
        this._smoothGazeVelocityX = 0;
        this._smoothGazeVelocityY = 0;
        return { x: x, y: y, _rawX: data._rawX !== undefined ? data._rawX : x, _rawY: data._rawY !== undefined ? data._rawY : y };
    }

    const oneEuroAlpha = function(fc, dt) {
        const tau = 1 / (2 * Math.PI * fc);
        return 1 / (1 + tau / dt);
    };

    const dxRaw = (x - this._smoothGazeX) / dt;
    const dyRaw = (y - this._smoothGazeY) / dt;
    const alphaDeriv = oneEuroAlpha(this._oneEuroDerivCutoff, dt);
    this._smoothGazeVelocityX = alphaDeriv * dxRaw + (1 - alphaDeriv) * this._smoothGazeVelocityX;
    this._smoothGazeVelocityY = alphaDeriv * dyRaw + (1 - alphaDeriv) * this._smoothGazeVelocityY;

    const speed = Math.sqrt(this._smoothGazeVelocityX * this._smoothGazeVelocityX + this._smoothGazeVelocityY * this._smoothGazeVelocityY);
    const cutoff = this._oneEuroMinCutoff + this._oneEuroBeta * speed;
    const alphaPos = oneEuroAlpha(cutoff, dt);

    this._smoothGazeX = alphaPos * x + (1 - alphaPos) * this._smoothGazeX;
    this._smoothGazeY = alphaPos * y + (1 - alphaPos) * this._smoothGazeY;
    this._smoothLastTimestamp = now;

    const fixationDist = Math.sqrt(
        (this._smoothGazeX - (this._fixationX || this._smoothGazeX)) ** 2 +
        (this._smoothGazeY - (this._fixationY || this._smoothGazeY)) ** 2
    );
    if (!Number.isFinite(this._fixationX) || fixationDist > this._fixationRadius) {
        this._fixationX = this._smoothGazeX;
        this._fixationY = this._smoothGazeY;
        this._fixationStartTime = now;
    }
    const isFixated = (now - this._fixationStartTime) >= this._fixationMinDuration;

    return {
        x: this._smoothGazeX,
        y: this._smoothGazeY,
        _rawX: data._rawX !== undefined ? data._rawX : x,
        _rawY: data._rawY !== undefined ? data._rawY : y,
        _isFixated: isFixated,
        _fixationDuration: now - this._fixationStartTime
    };
};

FocusFlow.startMouseTracking = function() {
    this.config.demoMode = true;
    this.config.useWebGazer = false;
    this.config.trackingMode = 'mouse';
    if (this._demoMouseHandler) return;
    console.log('[FocusFlow] 🖱️ Mouse tracking active (no camera)');
    this._demoMouseHandler = (e) => {
        const demoData = { x: e.clientX, y: e.clientY, eyeFeatures: { left: { imagex: 0, imagey: 0, width: 60, height: 30 }, right: { imagex: 0, imagey: 0, width: 60, height: 30 } } };
        this.onGazeData(demoData, performance.now());
    };
    document.addEventListener('mousemove', this._demoMouseHandler);
    this._demoScrollHandler = () => {
        const readingEl = document.getElementById('ff-reading-content');
        const scrollY = readingEl ? readingEl.scrollTop : window.scrollY;
        if (this.perception && this.perception.scrollAnalyzer) this.perception.scrollAnalyzer.update(scrollY, 0);
    };
    const readingEl = document.getElementById('ff-reading-content');
    if (readingEl) readingEl.addEventListener('scroll', this._demoScrollHandler, { passive: true });
    window.addEventListener('scroll', this._demoScrollHandler);
};

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
        if (block) { onReadingContent = true; readingBlockIndex = block.index; }
    }
    features.onReadingContent = onReadingContent;
    features.readingBlockIndex = readingBlockIndex;
    features.pointerInReadingPanel = pointerInReadingPanel;
    const now = performance.now();
    if (!pointerInReadingPanel) {
        if (!this._outsidePanelSince) this._outsidePanelSince = now;
    } else {
        this._outsidePanelSince = 0;
    }
    features.outsidePanelDuration = this._outsidePanelSince ? now - this._outsidePanelSince : 0;
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

FocusFlow.runCognitionTick = function() {
    if (!this._initialized || !this.perception || !this.cognition || !this.decision) return;
    if (document.hidden || this._simulationActive || this._calibrationInProgress) return;
    const now = performance.now();
    if (!Number.isFinite(this._lastGazeX) && this.perception.mouseTracker) {
        const mt = this.perception.mouseTracker;
        if (mt.lastMoveTime > 0) { this._lastGazeX = mt.mouseX; this._lastGazeY = mt.mouseY; }
    }
    const features = this._enrichFeaturesForCognition(this.perception.getFeatures());
    this.cognition.update(features, now);
    const state = this.cognition.getState();
    this._currentStateName = state.name;
    if (this.analytics && typeof this.analytics.tickActivity === 'function') this.analytics.tickActivity(state.name);
    const strategy = this.decision.decide(state, features, {});
    let gazeBlock = null;
    if (this.readingView && Number.isFinite(this._lastGazeX) && Number.isFinite(this._lastGazeY)) {
        gazeBlock = this.readingView.getBlockAtGaze(this._lastGazeX, this._lastGazeY);
    }
    this._applyInterventions(state, strategy, gazeBlock, features);
};

FocusFlow.stopMouseTracking = function() {
    if (this._demoMouseHandler) { document.removeEventListener('mousemove', this._demoMouseHandler); this._demoMouseHandler = null; }
    if (this._demoScrollHandler) {
        window.removeEventListener('scroll', this._demoScrollHandler);
        const readingEl = document.getElementById('ff-reading-content');
        if (readingEl) readingEl.removeEventListener('scroll', this._demoScrollHandler);
        this._demoScrollHandler = null;
    }
};

FocusFlow.startDemoMode = function() { this.startMouseTracking(); };
FocusFlow.stopDemoMode = function() { this.stopMouseTracking(); };

FocusFlow.onGazeData = function(data, elapsedTime) {
    if (this._calibrationInProgress) return;
    const now = performance.now();
    if ((now - this._lastPipelineRunTs) < this._pipelineIntervalMs) return;
    this._lastPipelineRunTs = now;
    if (!data || !Number.isFinite(data.x) || !Number.isFinite(data.y)) return;
    this._lastGazeX = data.x;
    this._lastGazeY = data.y;
    this._lastGazeTime = now;
    this.perception.update(data, elapsedTime);
    const features = this._enrichFeaturesForCognition(this.perception.getFeatures());
    this.cognition.update(features, elapsedTime);
    const currentState = this.cognition.getState();
    this._currentStateName = currentState.name;
    const gazeBlock = this.readingView.getBlockAtGaze(data.x, data.y);
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
    if (this.visualEffects) this.visualEffects.updateGazePosition(data.x, data.y);
    if (gazeBlock && gazeBlock.index !== this.readingView.currentHighlightIndex) {
        this.readingView.setCurrentBlock(gazeBlock.index);
    }
    if (this.debugPanel && this.debugPanel.isVisible()) {
        this.debugPanel.setGaze(data.x, data.y);
        if (gazeBlock) this.debugPanel.setBlock(gazeBlock.index, gazeBlock.blockId);
        this.debugPanel.setCognitiveState(
            (typeof I18n !== 'undefined')
                ? I18n.translateDisplayState(currentState.name, currentState.duration || 0)
                : currentState.name
        );
        this.debugPanel.setFocusMode(this.focusMode ? this.focusMode.getCurrentMode() : 'standard');
        const wpm = this.analytics ? this.analytics.getLastReadingSpeed() : 0;
        this.debugPanel.setWpm(wpm);
        this.debugPanel.setDimLevel(this.visualEffects ? this.visualEffects.dimIntensity : 0);
        this.debugPanel.setEffectsCount(this.visualEffects ? this.visualEffects._activeEffectCount : 0);
        this.debugPanel.updateData({});
    }
    if ((now - this._lastAnalyticsTs) >= this._analyticsIntervalMs) {
        const gazeData = { x: data.x, y: data.y, blockId: gazeBlock ? gazeBlock.blockId : null, blockIndex: blockIndex };
        this.analytics.recordGazeSample(gazeData, currentState.name);
        this._lastAnalyticsTs = now;
    }
    if ((now - this._lastDashboardUpdateTs) >= this._dashboardUpdateIntervalMs) {
        this.updateDashboard(currentState, strategy, gazeBlock);
        this._lastDashboardUpdateTs = now;
    }
    this._gazeHistory.push({ x: data.x, y: data.y, blockIndex: blockIndex, time: now, state: currentState.name });
    if (this._gazeHistory.length > this._maxGazeHistory) this._gazeHistory.shift();
    this._lastGazeTime = now;
};

FocusFlow._resetInterventionMilestones = function(stateName) {
    this._interventionMilestones = { stateKey: stateName, distracted6: false, distracted12: false, struggling8: false };
};

FocusFlow._applyInterventions = function(state, strategy, gazeBlock, features) {
    if (typeof InterventionExecutor === 'undefined') return;
    const interventionStrategy = this.decision && this.decision.interventionStrategy;
    const resolved = interventionStrategy ? interventionStrategy.resolve(state) : (strategy || { id: 'none' });
    const displayState = interventionStrategy ? interventionStrategy.getDisplayState(state) : 'Idle';
    const ctx = { focusFlow: this, state, strategy: resolved, gazeBlock, features, displayState };
    const prevKey = this._interventionMilestones.stateKey;
    if (prevKey !== state.name) {
        if (prevKey === 'Distracted') InterventionExecutor.deactivateAll(ctx);
        this._interventionMilestones.stateKey = state.name;
        if (state.name === 'Distracted') {
            this._interventionMilestones.distracted6 = false;
            this._interventionMilestones.distracted12 = false;
            InterventionExecutor._distractionFired6 = false;
            InterventionExecutor._distractionFired12 = false;
        } else if (state.name === 'Struggling') {
            this._interventionMilestones.struggling8 = false;
            InterventionExecutor.activate({ id: 'keyword_highlight' }, ctx, { force: true });
        } else if (state.name === 'Normal' || state.name === 'Idle') {
            if (prevKey !== 'Distracted') InterventionExecutor.deactivateAll(ctx);
            this._interventionMilestones.distracted6 = false;
            this._interventionMilestones.distracted12 = false;
            this._interventionMilestones.struggling8 = false;
        }
    }
    const durationSec = (state.duration || 0) / 1000;
    if (state.name === 'Struggling') {
        if (durationSec >= 8 && !this._interventionMilestones.struggling8) {
            InterventionExecutor.activate({ id: 'summary_panel' }, ctx);
            this._interventionMilestones.struggling8 = true;
        }
    }
    InterventionExecutor.sustain(resolved, ctx);
};

FocusFlow._applyAdaptiveUI = function(state, strategy, gazeBlock, features) {
    this._applyInterventions(state, strategy, gazeBlock, features);
};

FocusFlow.requestComprehensionForBlock = function(blockIndex, options) {
    options = options || {};
    if (blockIndex < 0) return;
    const cached = this._blockSummaryCache[blockIndex];
    if (options.manual && cached) { this.reopenComprehensionForBlock(blockIndex); return; }
    if (options.auto && options.struggleTrigger && cached) {
        this._displayComprehensionCard(blockIndex, cached, options.dwellTime || 0, { recordAnalytics: true, trigger: 'struggle' });
        return;
    }
    if (this._summaryGenerationInProgress.has(blockIndex)) { this._displayComprehensionLoading(blockIndex, options.dwellTime || 0); return; }
    this._summaryGenerationInProgress.add(blockIndex);
    const blockEl = this.readingView && typeof this.readingView.getBlockElement === 'function' ? this.readingView.getBlockElement(blockIndex) : null;
    this._generateComprehensionForBlock(blockIndex, blockEl ? { element: blockEl } : null, options.dwellTime || 0, { simplified: options.simplified, trigger: options.struggleTrigger ? 'struggle' : 'manual' });
};

FocusFlow._removeLegacyKeywordPanels = function() {
    document.querySelectorAll('[data-ff-legacy-keyword]').forEach((el) => el.remove());
    document.querySelectorAll('div').forEach((el) => {
        if (el.id === 'ff-comprehension-card') return;
        const style = el.style || {};
        const html = el.innerHTML || '';
        if (style.position === 'fixed' && (html.includes('🔑') || html.includes('KEY TERMS') || html.includes('关键术语') || html.includes('keyTerms'))) el.remove();
    });
};

FocusFlow.reopenComprehensionForBlock = function(blockIndex) {
    const cached = this._blockSummaryCache[blockIndex];
    if (!cached) return;
    this._displayComprehensionCard(blockIndex, cached, (cached.dwellSeconds || 0) * 1000);
};

FocusFlow.closeComprehensionCard = function() {
    const blockIndex = this._comprehensionCardBlock;
    if (this.visualEffects) this.visualEffects.hideComprehensionCard();
    if (blockIndex >= 0 && this._blockSummaryCache[blockIndex] && this.readingView) this.readingView.updateComprehensionButton(blockIndex, 'reopen');
    this._comprehensionCardBlock = -1;
};

FocusFlow._displayComprehensionLoading = function(blockIndex, dwellTime) {
    const anchor = this.readingView && typeof this.readingView.getBlockElement === 'function' ? this.readingView.getBlockElement(blockIndex) : null;
    this._comprehensionCardBlock = blockIndex;
    if (this.readingView) this.readingView.updateComprehensionButton(blockIndex, 'hidden');
    if (this.visualEffects) {
        this.visualEffects.setComprehensionAnchor(anchor);
        this.visualEffects.showComprehensionLoading({ blockIndex, paragraphNumber: blockIndex + 1, dwellSeconds: Math.round(dwellTime / 1000) });
    }
};

FocusFlow._displayComprehensionCard = function(blockIndex, cached, dwellTime, options) {
    options = options || {};
    const anchor = this.readingView && typeof this.readingView.getBlockElement === 'function' ? this.readingView.getBlockElement(blockIndex) : null;
    this._comprehensionCardBlock = blockIndex;
    if (this.readingView) this.readingView.updateComprehensionButton(blockIndex, 'hidden');
    if (this.visualEffects) {
        this.visualEffects.setComprehensionAnchor(anchor);
        this.visualEffects.showComprehensionCard({ blockIndex, paragraphNumber: blockIndex + 1, summary: cached.text, dwellSeconds: cached.dwellSeconds || Math.round(dwellTime / 1000), method: cached.method || 'unknown' });
    }
    if (options.recordAnalytics && this.analytics) this.analytics.recordComprehensionAssist(blockIndex, options.trigger || 'manual');
};

FocusFlow._generateComprehensionForBlock = function(blockIndex, gazeBlock, dwellTime, options) {
    options = options || {};
    const text = (this._allBlockTexts && this._allBlockTexts[blockIndex]) ? this._allBlockTexts[blockIndex] : (gazeBlock && gazeBlock.element ? gazeBlock.element.textContent : '');
    const docLang = this.readingView && typeof this.readingView.getDocumentLang === 'function' ? this.readingView.getDocumentLang() : (typeof ParagraphSummarizer !== 'undefined' ? ParagraphSummarizer.detectLanguage(text) : 'en');
    this._displayComprehensionLoading(blockIndex, dwellTime);
    const summarizeLocal = function() {
        if (typeof ParagraphSummarizer === 'undefined') return null;
        return ParagraphSummarizer.summarize(text, { lang: docLang, maxChars: options.simplified ? 120 : undefined });
    };
    const finish = (summaryText, method) => {
        if (!summaryText) {
            this._summaryGenerationInProgress.delete(blockIndex);
            if (this.visualEffects) this.visualEffects.hideComprehensionCard();
            this._comprehensionCardBlock = -1;
            if (this.readingView) this.readingView.updateComprehensionButton(blockIndex, !!this._blockSummaryCache[blockIndex] ? 'reopen' : 'generate');
            return;
        }
        const payload = { text: summaryText, method: method || 'unknown', dwellSeconds: Math.round(dwellTime / 1000) };
        this._blockSummaryCache[blockIndex] = payload;
        this._displayComprehensionCard(blockIndex, payload, dwellTime, { recordAnalytics: true, trigger: options.trigger || 'manual' });
        this._summaryGenerationInProgress.delete(blockIndex);
    };
    if (this.llmSummaryManager) {
        this.llmSummaryManager.getSummary(blockIndex, text, { lang: docLang }).then((result) => finish(result.text, result.method)).catch(() => {
            const local = summarizeLocal();
            if (local) finish(local.text, local.method); else this._summaryGenerationInProgress.delete(blockIndex);
        });
        return;
    }
    window.setTimeout(() => {
        try {
            let summary = this._paragraphSummaries && this._paragraphSummaries[blockIndex];
            if (!summary) summary = summarizeLocal();
            finish(summary && summary.text, summary && summary.method);
        } catch (_) { this._summaryGenerationInProgress.delete(blockIndex); }
    }, 0);
};

FocusFlow._syncTranslateUI = function() {
    const rv = this.readingView;
    const enabled = !!(this.config && this.config.llmTranslateEnabled && this.llmTranslateManager && this.llmTranslateManager.isEnabled());
    const show = enabled && rv && typeof rv.isEnglishDocument === 'function' && rv.isEnglishDocument();
    if (rv && typeof rv.setTranslateActionsVisible === 'function') rv.setTranslateActionsVisible(show);
    const btn = document.getElementById('btn-translate-all');
    if (btn) { btn.hidden = !show || this._documentTranslationInProgress; if (show && !this._documentTranslationInProgress) this._syncTranslateAllButton(); }
};

FocusFlow._syncTranslateAllButton = function() {
    const btn = document.getElementById('btn-translate-all');
    const rv = this.readingView;
    if (!btn || !rv) return;
    let key = 'reading.translateAll';
    if (typeof rv.hasAnyTranslation === 'function' && rv.hasAnyTranslation()) {
        if (typeof rv.hasAllTranslations === 'function' && rv.hasAllTranslations() && rv.areAllTranslationsVisible()) key = 'reading.hideAllTranslations';
        else key = 'reading.showAllTranslations';
    }
    btn.dataset.i18n = key;
    btn.textContent = this._t(key);
};

FocusFlow._applyBlockTranslation = function(blockIndex, translated, options) {
    options = options || {};
    if (!this.readingView || blockIndex < 0) return;
    this.readingView.applyBlockTranslation(blockIndex, translated, options.visible !== false);
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
        if (this.visualEffects) this.visualEffects.showPrompt('⚠️', this._t('reading.translateError'), err.message || '');
    } finally { this._metaTranslationInProgress.delete(metaKey); }
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
        if (this.visualEffects) this.visualEffects.showPrompt('⚠️', this._t('reading.translateError'), err.message || '');
    } finally { this._translationInProgress.delete(blockIndex); }
};

FocusFlow._translateDocumentMeta = async function(options) {
    options = options || {};
    const rv = this.readingView;
    if (!rv || !rv.container || !rv._originalDocument) return;
    const orig = rv._originalDocument;
    const visible = options.visible !== false;
    if (orig.title && (!options.onlyMissing || !rv.hasMetaTranslation('title'))) {
        const translated = await this.llmTranslateManager.translate(orig.title);
        rv.applyMetaTranslation('title', translated, visible);
        rv.updateMetaTranslateButton('title', visible ? 'hide' : 'show');
    }
    if (orig.subtitle && (!options.onlyMissing || !rv.hasMetaTranslation('subtitle'))) {
        const translated = await this.llmTranslateManager.translate(orig.subtitle);
        rv.applyMetaTranslation('subtitle', translated, visible);
        rv.updateMetaTranslateButton('subtitle', visible ? 'hide' : 'show');
    }
    const origHeadings = (orig.blocks || []).filter((b) => b.type === 'heading');
    for (let i = 0; i < origHeadings.length; i++) {
        const metaKey = 'heading-' + i;
        if (options.onlyMissing && rv.hasMetaTranslation(metaKey)) continue;
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
    if (rv.hasAnyTranslation() && rv.hasAllTranslations()) { rv.setAllTranslationsVisible(!rv.areAllTranslationsVisible()); this._syncTranslateAllButton(); return; }
    const blockIndices = rv.getUntranslatedBlockIndices();
    const missingMeta = rv.getMissingMetaKeys();
    if (!blockIndices.length && !missingMeta.length) { rv.setAllTranslationsVisible(true); this._syncTranslateAllButton(); return; }
    const total = blockIndices.length;
    this._documentTranslationInProgress = true;
    this._syncTranslateUI();
    this._updateTranslateAllProgress(0, Math.max(total, 1));
    try {
        await this._translateDocumentMeta({ onlyMissing: rv.hasAnyTranslation(), visible: true });
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
        if (this.visualEffects) this.visualEffects.showPrompt('🌐', this._t('reading.translateDone'), '');
    } catch (err) {
        console.warn('[FocusFlow] Document translation failed:', err);
        if (this.visualEffects) this.visualEffects.showPrompt('⚠️', this._t('reading.translateError'), err.message || '');
    } finally {
        this._documentTranslationInProgress = false;
        this._syncTranslateUI();
        const btn = document.getElementById('btn-translate-all');
        if (btn) btn.disabled = false;
    }
};

FocusFlow.showSessionReport = function(options) {
    options = options || {};
    if (typeof SessionReport === 'undefined' || !this.analytics) return;
    SessionReport.show(this.analytics, this.readingView, Object.assign({}, options, { llmManager: this.llmSummaryManager }));
};

FocusFlow.isDeepReadingSessionActive = function() {
    return !!(this._deepReadingSession && this._deepReadingSession.active);
};

FocusFlow.startDeepReadingSession = function() {
    if (!this._initialized) return;
    this.resetSession({ silent: true });
    if (typeof window.clearSidebarSessionData === 'function') window.clearSidebarSessionData();
    const startTime = Date.now();
    this._deepReadingSession = { active: true, startTime, endTime: null };
    if (this.analytics) this.analytics.sessionStart = startTime;
    this._syncDeepReadingControlsUI();
    if (this.visualEffects) this.visualEffects.showPrompt('📖', this._t('deepReading.started.title'), this._t('deepReading.started.sub'));
};

FocusFlow.endDeepReadingSession = function(options) {
    options = options || {};
    const session = this._deepReadingSession || {};
    const wasActive = !!session.active;
    if (wasActive) { session.active = false; session.endTime = Date.now(); this._deepReadingSession = session; }
    this._syncDeepReadingControlsUI();
    if (options.showReport !== false) {
        const reportOptions = { titleKey: 'report.deepSessionTitle', sessionStart: session.startTime || (this.analytics && this.analytics.sessionStart), sessionEnd: session.endTime || Date.now() };
        this.showSessionReport(reportOptions);
        if (wasActive && this.visualEffects && options.reason !== 'mode-exit') this.visualEffects.showPrompt('📊', this._t('deepReading.ended.title'), this._t('deepReading.ended.sub'));
    }
};

FocusFlow.endDeepReadingSessionOnModeExit = function() {
    if (!this.isDeepReadingSessionActive()) return;
    this.endDeepReadingSession({ showReport: true, reason: 'mode-exit' });
};

FocusFlow._syncDeepReadingControlsUI = function() {
    const controls = document.getElementById('ff-deep-reading-controls');
    const startBtn = document.getElementById('btn-deep-reading-start');
    const endBtn = document.getElementById('btn-deep-reading-end');
    const statusEl = document.getElementById('ff-deep-reading-status');
    const inDeep = this.focusMode && this.focusMode.isMode('deep');
    if (controls) controls.hidden = !inDeep;
    const active = this.isDeepReadingSessionActive();
    if (endBtn) endBtn.disabled = !active;
    if (startBtn) startBtn.disabled = false;
    if (statusEl) {
        if (active && this._deepReadingSession.startTime) {
            const elapsedSec = Math.floor((Date.now() - this._deepReadingSession.startTime) / 1000);
            const mins = Math.floor(elapsedSec / 60);
            const secs = elapsedSec % 60;
            statusEl.textContent = this._t('deepReading.statusActive', { time: mins + ':' + secs.toString().padStart(2, '0') });
        } else {
            statusEl.textContent = this._t('deepReading.statusIdle');
        }
    }
};

FocusFlow._bindDeepReadingControls = function() {
    const startBtn = document.getElementById('btn-deep-reading-start');
    const endBtn = document.getElementById('btn-deep-reading-end');
    if (startBtn && !startBtn.dataset.bound) { startBtn.dataset.bound = '1'; startBtn.addEventListener('click', () => this.startDeepReadingSession()); }
    if (endBtn && !endBtn.dataset.bound) { endBtn.dataset.bound = '1'; endBtn.addEventListener('click', () => this.endDeepReadingSession({ showReport: true })); }
};

FocusFlow._updateReadingSpeedDisplay = function() {
    if (!this.analytics) return;
    const unit = this._t('metrics.wpm');
    const sessionSpeed = this.analytics.getReadingSpeed();
    const metric = document.getElementById('ff-metric-wpm');
    if (metric) metric.textContent = sessionSpeed > 0 ? sessionSpeed + ' ' + unit : '--';
};

FocusFlow.updateDashboard = function(state, strategy, gazeBlock) {
    const interventionStrategy = this.decision && this.decision.interventionStrategy;
    const displayState = interventionStrategy ? interventionStrategy.getDisplayState(state) : (state && state.name) || 'Idle';
    const resolved = strategy || (interventionStrategy ? interventionStrategy.resolve(state) : { id: 'none' });
    const iconEl = document.getElementById('ff-state-icon');
    const nameEl = document.getElementById('ff-state-name');
    const durEl = document.getElementById('ff-state-duration');
    const displayIcons = { Focus: '🧠', LowDistraction: '👀', HighDistraction: '⚠️', LowStruggling: '🤔', HighStruggling: '😓', Idle: '⏳' };
    const displayColors = { Focus: '#4CAF50', LowDistraction: '#FF9800', HighDistraction: '#F44336', LowStruggling: '#FF5722', HighStruggling: '#D32F2F', Idle: '#94a3b8' };
    if (iconEl) iconEl.textContent = displayIcons[displayState] || '🧠';
    if (nameEl) nameEl.textContent = (typeof I18n !== 'undefined') ? I18n.translateState(displayState) : displayState;
    if (durEl) durEl.textContent = (state.duration / 1000).toFixed(1);
    const strategyNameEl = document.getElementById('ff-strategy-name');
    const strategyText = (typeof I18n !== 'undefined') ? I18n.translateStrategy(resolved) : { name: resolved && resolved.name || this._t('strategy.none'), desc: resolved && resolved.description || this._t('strategy.waiting') };
    if (strategyNameEl) strategyNameEl.textContent = strategyText.name;
    const cardState = document.getElementById('card-state');
    if (cardState && state) { const color = displayColors[displayState] || '#1e293b'; cardState.style.borderColor = color; cardState.style.boxShadow = '0 0 20px ' + color + '20'; if (nameEl) nameEl.style.color = color; }
    const summary = this.analytics.getSessionSummary();
    const wpmEl = document.getElementById('ff-metric-wpm');
    if (wpmEl) wpmEl.textContent = summary.readingSpeed > 0 ? summary.readingSpeed + ' ' + this._t('metrics.wpm') : '--';
    const focusEl = document.getElementById('ff-metric-focus');
    if (focusEl) focusEl.textContent = summary.focusRatio + '%';
    const regEl = document.getElementById('ff-metric-regression');
    if (regEl) regEl.textContent = summary.regressionRate + this._t('metrics.perMin');
    const durMetricEl = document.getElementById('ff-metric-duration');
    if (durMetricEl) { const mins = summary.sessionDuration || summary.duration || 0; durMetricEl.textContent = mins + ' ' + this._t('metrics.min'); }
    const distEl = document.getElementById('ff-metric-distractions');
    if (distEl) distEl.textContent = summary.distractionCount;
};

FocusFlow.getSessionSummary = function() { return this.analytics.getSessionSummary(); };

FocusFlow.toggleDebug = function() {
    this.config.debug = !this.config.debug;
    const debugPanel = document.getElementById('ff-debug-panel');
    if (debugPanel) debugPanel.style.display = this.config.debug ? 'block' : 'none';
    console.log('[FocusFlow] Debug mode:', this.config.debug);
};

FocusFlow.resetSession = function(options) {
    const silent = !!(options && options.silent);
    if (!this._initialized) return;
    if (this._resetInterventionMilestones) this._resetInterventionMilestones('Normal');
    this._currentStateName = 'Normal';
    this._lastStrategyId = 'none';
    this._lastActivationKey = 'none';
    this._distractionAlertShown = false;
    this._lastStrugglePrompt = false;
    this._wakeUpTriggered = false;
    this._offScreenStart = 0;
    this._outsidePanelSince = 0;
    this._gazeOffBlockStart = 0;
    this._wpmTrackIndex = -1;
    this._wpmTrackStart = 0;
    if (this.perception) this.perception.reset();
    if (this.cognition) this.cognition.reset();
    if (this.decision) this.decision.reset();
    const ctx = { focusFlow: this };
    if (typeof InterventionExecutor !== 'undefined') InterventionExecutor.reset(ctx);
    else if (this.visualEffects) this.visualEffects.reset();
    if (this._blockSummaryCache) this._blockSummaryCache = {};
    if (this._summaryGenerationInProgress) this._summaryGenerationInProgress = new Set();
    this._comprehensionCardBlock = -1;
    if (this.analytics && typeof this.analytics.reset === 'function') this.analytics.reset();
    const state = this.cognition ? this.cognition.getState() : null;
    if (state && typeof this.updateDashboard === 'function') {
        const strategy = this.decision && this.decision.interventionStrategy ? this.decision.interventionStrategy.resolve(state) : { id: 'none' };
        this.updateDashboard(state, strategy, null);
    }
    if (!silent && this.visualEffects) {
        const title = (typeof I18n !== 'undefined') ? I18n.t('reset.done') : 'Reset complete';
        const hint = (typeof I18n !== 'undefined') ? I18n.t('reset.hint') : 'State and interventions cleared';
        this.visualEffects.showPrompt('🔄', title, hint);
    }
    console.log('[FocusFlow] Session reset');
};

FocusFlow.shutdown = function() {
    if (this.calibration) this.calibration.destroy();
    if (this.analytics) this.analytics.destroy();
    if (this.visualEffects) this.visualEffects.reset();
    if (this.perception) this.perception.destroy();
    if (window.webgazer) webgazer.end();
    console.log('[FocusFlow] Shutdown complete');
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await FocusFlow.init();
    } catch (err) {
        console.error('[FocusFlow] Fatal startup error:', err);
        if (!FocusFlow.readingView) {
            try { FocusFlow.readingView = new ReadingView(FocusFlow.config || {}); } catch (fallbackErr) { console.error('[FocusFlow] ReadingView fallback failed:', fallbackErr); }
        }
    }
});