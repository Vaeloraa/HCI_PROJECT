/**
 * webgazer-init.js — WebGazer 眼动追踪初始化与可视化
 * 
 * 校准流程: WebGazer 启动后会在屏幕上显示数字点,
 *           用户需要注视该点并点击，重复多次完成校准。
 *           本模块管理校准状态，并在校准完成后自动隐藏 UI。
 */

const GazeTracker = (function () {
    // ==================== 内部状态 ====================
    let kalmanFilter = null;
    let rawGaze = { x: 0, y: 0, valid: false, confidence: 0 };
    let smoothedGaze = { x: 0, y: 0, valid: false };
    let isWebGazerReady = false;     // 是否已就绪（收到首次眼动数据）
    let isCalibrating = false;       // 是否在校准中
    let initResolve = null;
    let initTimeout = null;
    let isInitializing = false;

    // 校准统计
    let calibrationClicks = 0;       // 用户已点击的校准点数
    let requiredClicks = 9;         // 需要的校准点数（默认 9 点）
    let calibrationStartTime = 0;

    // DOM
    let rawDot = null;
    let smoothDot = null;
    let calibrationHint = null;      // 校准提示文字

    // ==================== 初始化 ====================

    function init(options = {}) {
        if (isInitializing) {
            return new Promise((resolve) => {
                const poll = setInterval(() => {
                    if (!isInitializing) {
                        clearInterval(poll);
                        resolve(isWebGazerReady);
                    }
                }, 200);
            });
        }

        isInitializing = true;
        isWebGazerReady = false;
        isCalibrating = true;         // 进入校准模式
        calibrationClicks = 0;
        requiredClicks = options.calibrationPoints || 9;

        const {
            processNoise = 0.00005,
            measureNoise = 400,
            emaAlpha = 0.15,
            deadZone = 2,
        } = options;

        return new Promise((resolve) => {
            initResolve = resolve;

            kalmanFilter = new KalmanFilter2D({
                processNoise,
                measureNoise,
                emaAlpha,
                deadZone,
            });
            createDots();
            createCalibrationHint();

            if (typeof webgazer === 'undefined') {
                console.error('[GazeTracker] webgazer 未加载');
                finishInit(false);
                return;
            }

            try {
                // 配置本地 FaceMesh 模型
                if (typeof webgazer.params !== 'undefined') {
                    webgazer.params.faceMeshSolutionPath =
                        window.location.origin + '/js/mediapipe/face_mesh';
                    console.log('[GazeTracker] 模型路径: ' + webgazer.params.faceMeshSolutionPath);
                }

                // 重要: 监听 document 点击事件来统计校准点击
                document.addEventListener('click', onCalibrationClick);

                // 显示校准 UI（视频预览 + 脸部框 + 预测点）
                webgazer.showVideoPreview(true);
                webgazer.showFaceOverlay(true);
                webgazer.showFaceFeedbackBox(true);
                webgazer.showPredictionPoints(true);  // 关键：显示校准数字点

                console.log('[GazeTracker] 校准模式已开启');
                console.log('[GazeTracker] 请注视屏幕上的数字并点击它，重复 ' + requiredClicks + ' 次');

                // 启动 WebGazer
                webgazer
                    .setGazeListener(onGazeData)
                    .setRegression('ridge')
                    .setTracker('TFFacemesh')
                    .saveDataAcrossSessions(true)
                    .begin();

                // 超时检测 60 秒（给用户充足时间校准）
                initTimeout = setTimeout(() => {
                    if (!isWebGazerReady) {
                        console.warn('[GazeTracker] 初始化超时 (60s)');
                        finishInit(false);
                    }
                }, 60000);

            } catch (err) {
                console.error('[GazeTracker] 启动失败:', err);
                finishInit(false);
            }
        });
    }

    function finishInit(success) {
        isInitializing = false;
        isWebGazerReady = success;
        if (initTimeout) {
            clearTimeout(initTimeout);
            initTimeout = null;
        }
        if (success) {
            console.log('[GazeTracker] ✅ 初始化完成');
        }
        if (initResolve) {
            initResolve(success);
            initResolve = null;
        }
    }

    // ==================== 校准点击处理 ====================

    /**
     * 当用户在校准模式下点击屏幕上的数字点时触发
     */
    function onCalibrationClick(e) {
        if (!isCalibrating) return;

        calibrationClicks++;
        calibrationStartTime = calibrationStartTime || Date.now();
        console.log('[GazeTracker] 校准点 ' + calibrationClicks + '/' + requiredClicks);

        updateCalibrationHint();

        // 完成所需点击数后，结束校准
        if (calibrationClicks >= requiredClicks) {
            completeCalibration();
        }
    }

    function completeCalibration() {
        isCalibrating = false;
        document.removeEventListener('click', onCalibrationClick);

        const elapsed = ((Date.now() - calibrationStartTime) / 1000).toFixed(1);
        console.log('[GazeTracker] 🎯 校准完成！耗时 ' + elapsed + ' 秒');

        // 隐藏 WebGazer 校准 UI
        webgazer.showVideoPreview(false);
        webgazer.showFaceOverlay(false);
        webgazer.showFaceFeedbackBox(false);
        webgazer.showPredictionPoints(false);

        // 移除校准提示
        if (calibrationHint) {
            calibrationHint.remove();
            calibrationHint = null;
        }

        // 如果不是通过首次眼动数据标记的就绪，这里标记
        if (isInitializing) {
            finishInit(true);
        }
    }

    /** 强制提前结束校准（不依赖点击次数） */
    function forceFinishCalibration() {
        if (isCalibrating) {
            completeCalibration();
        }
    }

    // ==================== 校准提示 UI ====================

    function createCalibrationHint() {
        if (calibrationHint) return;

        calibrationHint = document.createElement('div');
        calibrationHint.id = 'calibration-hint';
        calibrationHint.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(16, 16, 36, 0.92);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 14px 28px;
            color: #fff;
            font-family: -apple-system, sans-serif;
            font-size: 14px;
            text-align: center;
            z-index: 200001;
            pointer-events: none;
        `;
        updateCalibrationHint();
        document.body.appendChild(calibrationHint);
    }

    function updateCalibrationHint() {
        if (!calibrationHint) return;
        const remaining = Math.max(0, requiredClicks - calibrationClicks);
        calibrationHint.innerHTML =
            '👁️ <strong>注视屏幕上的数字并点击它</strong><br>' +
            '<span style="color:#3cc878;">已校准 ' + calibrationClicks + ' / ' + requiredClicks + ' 点</span>' +
            (remaining > 0
                ? '&nbsp;&nbsp;<span style="color:#ffb43c;">还需 ' + remaining + ' 次</span>'
                : '&nbsp;&nbsp;<span style="color:#3cc878;">✅ 校准完成</span>');
    }

    // ==================== 视线回调 ====================

    let firstGazeDataReceived = false;

    function onGazeData(data, timestamp) {
        if (!data || data.x == null || data.y == null) {
            rawGaze.valid = false;
            smoothedGaze.valid = false;
            return;
        }

        // 首次收到有效数据
        if (!firstGazeDataReceived) {
            firstGazeDataReceived = true;
            console.log('[GazeTracker] 🎯 首次收到眼动数据，FaceMesh 模型加载完成');
            // 注意：不在这里 finishInit，等待校准点击完成
        }

        rawGaze.x = data.x;
        rawGaze.y = data.y;
        rawGaze.confidence = typeof data.confidence === 'number' ? data.confidence : 0.5;
        rawGaze.valid = true;

        if (kalmanFilter) {
            const filtered = kalmanFilter.update(data.x, data.y);
            smoothedGaze.x = filtered.x;
            smoothedGaze.y = filtered.y;
            smoothedGaze.valid = true;
        }

        updateDots();
    }

    // ==================== 可视化 ====================

    function createDots() {
        if (rawDot || smoothDot) return;

        rawDot = document.createElement('div');
        rawDot.id = 'gaze-raw-dot';
        rawDot.style.cssText = `
            position: fixed;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 2px dashed rgba(255, 70, 70, 0.6);
            background: rgba(255, 80, 80, 0.2);
            pointer-events: none;
            z-index: 99999;
            transform: translate(-50%, -50%);
            display: none;
        `;
        document.body.appendChild(rawDot);

        smoothDot = document.createElement('div');
        smoothDot.id = 'gaze-smooth-dot';
        smoothDot.style.cssText = `
            position: fixed;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: rgba(60, 140, 255, 0.9);
            box-shadow: 0 0 12px rgba(60, 140, 255, 0.5);
            pointer-events: none;
            z-index: 100000;
            transform: translate(-50%, -50%);
            display: none;
        `;
        document.body.appendChild(smoothDot);
    }

    function updateDots() {
        if (rawDot && rawGaze.valid) {
            rawDot.style.left = rawGaze.x + 'px';
            rawDot.style.top = rawGaze.y + 'px';
            rawDot.style.display = 'block';
        } else if (rawDot) {
            rawDot.style.display = 'none';
        }

        if (smoothDot && smoothedGaze.valid) {
            smoothDot.style.left = smoothedGaze.x + 'px';
            smoothDot.style.top = smoothedGaze.y + 'px';
            smoothDot.style.display = 'block';
        } else if (smoothDot) {
            smoothDot.style.display = 'none';
        }
    }

    // ==================== 公开接口 ====================

    function getRawGaze() { return { ...rawGaze }; }
    function getSmoothedGaze() { return { ...smoothedGaze }; }
    function isReady() { return isWebGazerReady && !isCalibrating; }
    function isCurrentlyCalibrating() { return isCalibrating; }
    function getCalibrationProgress() {
        return { calibrated: calibrationClicks, required: requiredClicks };
    }
    function getKalmanFilter() { return kalmanFilter; }

    function finishCalibration() {
        if (typeof webgazer === 'undefined') return;
        webgazer.showVideoPreview(false);
        webgazer.showFaceOverlay(false);
        webgazer.showFaceFeedbackBox(false);
        webgazer.showPredictionPoints(false);
    }

    function recalibrate() {
        if (typeof webgazer === 'undefined') return;

        firstGazeDataReceived = false;
        isWebGazerReady = false;
        isCalibrating = true;
        calibrationClicks = 0;
        calibrationStartTime = 0;

        document.addEventListener('click', onCalibrationClick);
        createCalibrationHint();

        webgazer.clearData();
        if (kalmanFilter) kalmanFilter.reset();

        webgazer.showVideoPreview(true);
        webgazer.showFaceOverlay(true);
        webgazer.showFaceFeedbackBox(true);
        webgazer.showPredictionPoints(true);
        webgazer.begin();

        console.log('[GazeTracker] 已重置，请重新注视并点击校准点');
    }

    function pause() {
        if (typeof webgazer !== 'undefined') webgazer.pause();
    }

    function resume() {
        if (typeof webgazer !== 'undefined') webgazer.resume();
    }

    return {
        init,
        getRawGaze,
        getSmoothedGaze,
        isReady,
        isCurrentlyCalibrating,
        getCalibrationProgress,
        forceFinishCalibration,
        getKalmanFilter,
        recalibrate,
        finishCalibration,
        pause,
        resume,
    };
})();

if (typeof window !== 'undefined') {
    window.GazeTracker = GazeTracker;
}