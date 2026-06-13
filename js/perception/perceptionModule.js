/**
 * FocusFlow - Perception Module (Orchestrator)
 * 
 * Perception Layer: Multi-source perception that combines:
 *   1. Visual attention (face presence, head pose, gaze region)
 *   2. Behavioral signals (mouse tracking, scroll analysis)
 *   3. Attention heatmap (dwell time distribution)
 * 
 * Output: Multi-modal feature vector for cognitive state machine
 * 
 * HCI Final Project - Member A
 */

class PerceptionModule {
    constructor(config) {
        this.config = config;
        
        // Initialize sub-modules
        this.faceDetection = new FaceDetection(config);
        this.headPose = new HeadPoseEstimation(config);
        this.gazeRegion = new GazeRegionMapping(config);
        this.mouseTracker = new MouseTracker(config);
        this.scrollAnalyzer = new ScrollAnalyzer(config);
        this.attentionHeatmap = new AttentionHeatmap(config);
        
        // Feature cache for last computed features
        this._lastFeatures = null;
        this._lastUpdateTime = 0;
        
        // Mouse event listeners
        this._setupMouseListeners();
        this._setupScrollListeners();
        
        // Debug mode
        this.debug = config.debug || false;
    }

    /**
     * Set up mouse event listeners
     */
    _setupMouseListeners() {
        document.addEventListener('mousemove', (e) => {
            this.mouseTracker.update(e.clientX, e.clientY);
            this.attentionHeatmap.addPoint(e.clientX, e.clientY, 0.5, 'mouse');
        });
        
        document.addEventListener('click', () => {
            this.mouseTracker.lastClickTime = performance.now();
        });
    }

    /**
     * Set up scroll event listeners
     */
    _setupScrollListeners() {
        window.addEventListener('scroll', () => {
            this.scrollAnalyzer.update(window.scrollY, 0);
        });
        
        window.addEventListener('wheel', (e) => {
            this.scrollAnalyzer.update(window.scrollY, e.deltaY);
        });
    }

    /**
     * Main update method - called from WebGazer gaze loop
     * @param {Object} data - WebGazer gaze data {x, y, eyeFeatures}
     * @param {number} elapsedTime - Time since WebGazer started
     */
    update(data, elapsedTime) {
        const now = performance.now();
        
        // 1. Update face detection from WebGazer tracker
        if (window.webgazer && window.webgazer.getTracker) {
            const facePositions = window.webgazer.getTracker().getPositions();
            this.faceDetection.update(facePositions);
            
            // 2. Update head pose estimation from face landmarks
            if (facePositions && facePositions.length > 0) {
                this.headPose.update(facePositions);
            }
        }
        
        // 3. Update gaze region mapping
        if (data && data.x !== undefined && data.y !== undefined) {
            this.gazeRegion.update(data.x, data.y, data.confidence || 0.5);
            this.attentionHeatmap.addPoint(data.x, data.y, data.confidence || 1.0, 'gaze');
        } else if (this.mouseTracker.isMoving) {
            // Fallback to mouse position if gaze data unavailable
            this.gazeRegion.update(this.mouseTracker.mouseX, this.mouseTracker.mouseY, 0.3);
        }
        
        this._lastUpdateTime = now;
        
        if (this.debug) {
            this._debugLog();
        }
    }

    /**
     * Compute and return multi-modal feature vector
     * @returns {Object} Features for state machine
     */
    getFeatures() {
        const faceFeatures = this.faceDetection.isFacePresent() ? {
            facePresent: this.faceDetection.isFacePresent(),
            faceAbsentDuration: this.faceDetection.getFaceAbsentDuration(),
            faceConfidence: this.faceDetection.faceConfidence
        } : {
            facePresent: false,
            faceAbsentDuration: this.faceDetection.getFaceAbsentDuration(),
            faceConfidence: this.faceDetection.faceConfidence
        };
        
        const poseFeatures = this.headPose.getFeatures();
        const gazeFeatures = this.gazeRegion.getFeatures();
        const mouseFeatures = this.mouseTracker.getFeatures();
        const scrollFeatures = this.scrollAnalyzer.getFeatures();
        const heatmapFeatures = this.attentionHeatmap.getFeatures();
        
        // Compute interaction activity (any user input recently)
        const now = performance.now();
        const interactionActive = this.mouseTracker.isMoving || 
                                  this.scrollAnalyzer.isScrolling ||
                                  this.mouseTracker.idleDuration < 3000;
        
        // Compute dwell time on current content area
        const dwellTime = gazeFeatures.dwellTime > 0 ? 
                          gazeFeatures.dwellTime : 
                          (this.scrollAnalyzer.isPaused ? this.scrollAnalyzer.pauseDuration : 0);
        
        this._lastFeatures = {
            ...faceFeatures,
            ...poseFeatures,
            ...gazeFeatures,
            ...mouseFeatures,
            ...scrollFeatures,
            ...heatmapFeatures,
            interactionActive,
            dwellTime,
            timestamp: this._lastUpdateTime
        };
        
        return this._lastFeatures;
    }

    /**
     * Get the last computed features without re-computing
     * @returns {Object|null}
     */
    getLastFeatures() {
        return this._lastFeatures;
    }

    /**
     * Debug logging
     */
    _debugLog() {
        if (Math.random() > 0.05) return; // Sample 5% of updates
        
        const features = this.getLastFeatures();
        if (!features) return;
        
        console.log('[Perception]', {
            face: features.facePresent ? '✅' : '❌',
            pose: `p:${features.pitch?.toFixed(1)} y:${features.yaw?.toFixed(1)}`,
            region: features.currentRegion,
            mouse: features.isMoving ? '🖱️' : '💤',
            scroll: features.isScrolling ? '📜' : '⏸️',
            dwell: (features.dwellTime / 1000).toFixed(1) + 's',
            interaction: features.interactionActive ? '✅' : '❌'
        });
    }

    /**
     * Reset all sub-modules
     */
    reset() {
        this.faceDetection.reset();
        this.headPose.reset();
        this.gazeRegion.reset();
        this.mouseTracker.reset();
        this.scrollAnalyzer.reset();
        this.attentionHeatmap.reset();
        this._lastFeatures = null;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerceptionModule;
}
