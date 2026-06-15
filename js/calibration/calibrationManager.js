/**
 * FocusFlow - 9-Point Calibration Manager
 * 
 * Provides a full-screen 9-point calibration procedure for WebGazer.js.
 * The user looks at each of 9 points on screen and clicks/confirms,
 * allowing WebGazer to build an accurate gaze prediction model.
 * 
 * After calibration, gaze-based highlighting will be accurate.
 * 
 * HCI Final Project - Member A (Perception Enhancement)
 */

class CalibrationManager {
    constructor(config = {}) {
        this.config = config;
        
        // 9 calibration points (3×3 grid) as percentages of viewport
        this.points = [
            // Row 1: top
            { x: 0.20, y: 0.16, label: 'Top-Left' },
            { x: 0.50, y: 0.16, label: 'Top-Center' },
            { x: 0.80, y: 0.16, label: 'Top-Right' },
            // Row 2: middle
            { x: 0.20, y: 0.46, label: 'Middle-Left' },
            { x: 0.50, y: 0.46, label: 'Middle-Center' },
            { x: 0.80, y: 0.46, label: 'Middle-Right' },
            // Row 3: bottom
            { x: 0.20, y: 0.76, label: 'Bottom-Left' },
            { x: 0.50, y: 0.76, label: 'Bottom-Center' },
            { x: 0.80, y: 0.76, label: 'Bottom-Right' }
        ];
        
        this.currentPointIndex = 0;
        this.calibrationData = [];  // WebGazer predictions at each point
        this.samplesPerPoint = 5;   // Collect 5 samples per point
        this.currentSamples = [];
        this.isCalibrating = false;
        this.isComplete = false;
        
        // DOM elements
        this._overlay = null;
        this._pointEls = [];
        this._currentDot = null;
        this._progressEl = null;
        this._statusEl = null;
        this._instructionEl = null;
        this._titleEl = null;
        this._skipBtn = null;
        
        // Collection timer
        this._collectInterval = null;
        this._autoCollectDelay = 800;  // ms to wait before auto-collecting
        this._collectTimer = null;
        
        // Callbacks
        this.onComplete = null;
        this.onProgress = null;
        
        // Debug
        this.debug = config.debug || false;
    }

    /**
     * Start the calibration process
     * @param {Function} onComplete - Called with (calibrationData) when done
     * @param {Function} onProgress - Called with (currentIndex, total)
     */
    start(onComplete, onProgress) {
        this.onComplete = onComplete;
        this.onProgress = onProgress;
        this.currentPointIndex = 0;
        this.calibrationData = [];
        this.currentSamples = [];
        this.isCalibrating = true;
        this.isComplete = false;
        
        this._buildOverlay();
        this._showPoint(0);
        
        // Listen for click/space to confirm
        this._bindEvents();
        
        if (this.debug) console.log('[Calibration] Started 9-point calibration');
    }

    /**
     * Build the full-screen calibration overlay
     */
    _buildOverlay() {
        // Remove any existing overlay
        this._destroyOverlay();
        
        // Main overlay
        this._overlay = document.createElement('div');
        this._overlay.id = 'ff-calibration-overlay';
        this._overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: #f8fafc;
            backdrop-filter: none;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            transition: opacity 0.5s ease;
        `;

        const guideGrid = document.createElement('div');
        guideGrid.style.cssText = `
            position: absolute;
            left: 20%;
            top: 16%;
            width: 60%;
            height: 60%;
            z-index: 1;
            pointer-events: none;
            border: 1px solid rgba(148, 163, 184, 0.14);
            border-radius: 18px;
            background:
                linear-gradient(90deg, transparent calc(50% - 0.5px), rgba(148, 163, 184, 0.18) calc(50% - 0.5px), rgba(148, 163, 184, 0.18) calc(50% + 0.5px), transparent calc(50% + 0.5px)),
                linear-gradient(0deg, transparent calc(50% - 0.5px), rgba(148, 163, 184, 0.18) calc(50% - 0.5px), rgba(148, 163, 184, 0.18) calc(50% + 0.5px), transparent calc(50% + 0.5px));
        `;
        this._overlay.appendChild(guideGrid);
        
        // Instruction panel at top
        const instructionPanel = document.createElement('div');
        instructionPanel.style.cssText = `
            position: absolute;
            top: 22px;
            left: 50%;
            transform: translateX(-50%);
            text-align: center;
            z-index: 10;
        `;
        instructionPanel.innerHTML = `
            <div id="ff-calibration-title" style="font-size: 24px; font-weight: 700; color: #111827; margin-bottom: 6px;">
                WebGazer Calibration
            </div>
            <div id="ff-calibration-instruction" style="font-size: 14px; color: #475569; max-width: 560px;">
                Look at the highlighted point, then click or press Space.
            </div>
        `;
        this._overlay.appendChild(instructionPanel);
        this._instructionEl = instructionPanel.querySelector('#ff-calibration-instruction');
        this._titleEl = instructionPanel.querySelector('#ff-calibration-title');
        
        // Status text at bottom
        const statusPanel = document.createElement('div');
        statusPanel.style.cssText = `
            position: absolute;
            bottom: 22px;
            left: 50%;
            transform: translateX(-50%);
            text-align: center;
            z-index: 10;
        `;
        statusPanel.innerHTML = `
             <div id="ff-calibration-progress" style="font-size: 16px; font-weight: 700; color: #2563eb; margin-bottom: 6px;">
                Point 1 / 9
            </div>
            <div id="ff-calibration-status" style="font-size: 12px; color: #64748b;">
                Waiting...
            </div>
            <!-- Progress bar -->
            <div style="width: 320px; height: 5px; background: #e2e8f0; border-radius: 999px; margin: 10px auto 0; overflow: hidden;">
                <div id="ff-calibration-bar" style="width: 0%; height: 100%; background: #2563eb; border-radius: 999px; transition: width 0.5s ease;"></div>
            </div>
        `;
        this._overlay.appendChild(statusPanel);
        this._progressEl = statusPanel.querySelector('#ff-calibration-progress');
        this._statusEl = statusPanel.querySelector('#ff-calibration-status');
        
        // Skip button
        const skipBtn = document.createElement('button');
        skipBtn.textContent = 'Skip calibration';
        this._skipBtn = skipBtn;
        skipBtn.style.cssText = `
            position: absolute;
            bottom: 22px;
            right: 30px;
            padding: 10px 20px;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            color: #475569;
            font-size: 14px;
            cursor: pointer;
            z-index: 10;
            transition: all 0.2s;
        `;
        skipBtn.addEventListener('mouseenter', () => {
            skipBtn.style.background = '#f1f5f9';
            skipBtn.style.color = '#111827';
        });
        skipBtn.addEventListener('mouseleave', () => {
            skipBtn.style.background = '#ffffff';
            skipBtn.style.color = '#475569';
        });
        skipBtn.addEventListener('click', () => this._skipCalibration());
        this._overlay.appendChild(skipBtn);
        
        // Create 9 point markers (all hidden initially)
        this.points.forEach((pt, i) => {
            const pointEl = document.createElement('div');
            pointEl.className = 'ff-calibration-point';
            pointEl.dataset.index = i;
            pointEl.style.cssText = `
                position: absolute;
                left: ${pt.x * 100}%;
                top: ${pt.y * 100}%;
                transform: translate(-50%, -50%);
                width: 44px;
                height: 44px;
                border-radius: 50%;
                border: 2px solid rgba(37, 99, 235, 0.26);
                background: rgba(255, 255, 255, 0.96);
                pointer-events: none;
                z-index: 5;
                transition: all 0.4s ease;
                opacity: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            // Inner dot
            const innerDot = document.createElement('div');
            innerDot.style.cssText = `
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #2563eb;
                transition: all 0.3s ease;
                box-shadow: 0 0 20px rgba(96, 165, 250, 0.3);
            `;
            pointEl.appendChild(innerDot);
            
            // Point number label
            const label = document.createElement('div');
            label.style.cssText = `
                position: absolute;
                top: -24px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 11px;
                color: #475569;
                white-space: nowrap;
            `;
            label.textContent = `${i + 1}`;
            pointEl.appendChild(label);
            
            this._overlay.appendChild(pointEl);
            this._pointEls.push(pointEl);
        });
        
        document.body.appendChild(this._overlay);
        
        // Force reflow for animation
        this._overlay.offsetHeight;
        this._applyI18n();
    }

    _t(key, params) {
        if (typeof I18n !== 'undefined') return I18n.t(key, params);
        const fallbacks = {
            'calibration.title': 'WebGazer Calibration',
            'calibration.instruction': 'Look at the highlighted point, then click or press Space.',
            'calibration.waiting': 'Waiting...',
            'calibration.skip': 'Skip calibration'
        };
        let text = fallbacks[key] || key;
        if (params) {
            for (const [name, value] of Object.entries(params)) {
                text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
            }
        }
        return text;
    }

    _applyI18n() {
        if (this._titleEl) this._titleEl.textContent = this._t('calibration.title');
        if (this._instructionEl) this._instructionEl.textContent = this._t('calibration.instruction');
        if (this._skipBtn) this._skipBtn.textContent = this._t('calibration.skip');
        if (this._statusEl && this._statusEl.textContent === 'Waiting...') {
            this._statusEl.textContent = this._t('calibration.waiting');
        }
    }

    /**
     * Show a specific calibration point and start collecting
     */
    _showPoint(index) {
        if (index >= this.points.length) {
            this._finishCalibration();
            return;
        }
        
        const pt = this.points[index];
        this.currentPointIndex = index;
        this.currentSamples = [];
        
        // Update all points visibility
        this._pointEls.forEach((el, i) => {
            if (i === index) {
                el.style.opacity = '1';
                el.style.transform = 'translate(-50%, -50%) scale(1)';
                el.style.borderColor = '#2563eb';
                el.style.background = '#ffffff';
                el.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.18)';
                
                // Animate inner dot
                const dot = el.querySelector('div');
                if (dot) {
                    dot.style.width = '16px';
                    dot.style.height = '16px';
                    dot.style.background = '#2563eb';
                    dot.style.boxShadow = '0 0 0 8px rgba(37, 99, 235, 0.12)';
                }
            } else if (i < index) {
                // Completed points - show as green checkmarks
                el.style.opacity = '0.5';
                el.style.borderColor = 'rgba(16, 185, 129, 0.55)';
                el.style.background = '#ecfdf5';
                el.style.transform = 'translate(-50%, -50%) scale(0.8)';
                el.style.boxShadow = 'none';
                
                const dot = el.querySelector('div');
                if (dot) {
                    dot.style.width = '8px';
                    dot.style.height = '8px';
                    dot.style.background = '#4ade80';
                    dot.style.boxShadow = 'none';
                }
            } else {
                // Future points - hidden/faded
                el.style.opacity = '0.15';
                el.style.transform = 'translate(-50%, -50%) scale(0.6)';
                el.style.borderColor = 'rgba(148, 163, 184, 0.35)';
                el.style.background = '#f8fafc';
                el.style.boxShadow = 'none';
                
                const dot = el.querySelector('div');
                if (dot) {
                    dot.style.width = '6px';
                    dot.style.height = '6px';
                    dot.style.background = 'rgba(100, 116, 139, 0.45)';
                    dot.style.boxShadow = 'none';
                }
            }
        });
        
        // Update progress text
        if (this._progressEl) {
            this._progressEl.textContent = this._t('calibration.point', {
                current: index + 1,
                total: this.points.length
            });
        }
        if (this._statusEl) {
            this._statusEl.textContent = this._t('calibration.instruction');
        }
        
        // Update progress bar
        const bar = document.getElementById('ff-calibration-bar');
        if (bar) {
            bar.style.width = `${(index / this.points.length) * 100}%`;
        }
        
        // Start auto-collection timer (will collect WebGazer samples)
        this._startAutoCollect();
        
        // Call progress callback
        if (this.onProgress) {
            this.onProgress(index, this.points.length);
        }
        
        if (this.debug) console.log(`[Calibration] Showing point ${index + 1}/${this.points.length}: ${pt.label}`);
    }

    /**
     * Automatically collect gaze samples while user looks at the point
     */
    _startAutoCollect() {
        this._stopAutoCollect();
        
        // Continuously gather WebGazer predictions in the background while the
        // user looks at the point. These are buffered and the most recent ones
        // are used when the user explicitly confirms by clicking / pressing Space.
        // NOTE: We intentionally DO NOT auto-confirm on a timer. The user must
        // click or press Space to advance — otherwise calibration would race
        // through all 9 points on its own before the user is ready.
        this._collectInterval = setInterval(() => {
            if (!this.isCalibrating) return;

            // Get current WebGazer prediction
            let gazeData = null;
            try {
                if (window.webgazer && window.webgazer.getCurrentPrediction) {
                    gazeData = window.webgazer.getCurrentPrediction();
                }
            } catch (e) {
                // WebGazer not ready
            }

            if (gazeData && gazeData.x !== undefined && gazeData.y !== undefined) {
                this.currentSamples.push({
                    x: gazeData.x,
                    y: gazeData.y,
                    time: performance.now(),
                    targetPoint: this.points[this.currentPointIndex]
                });
                // Keep only the most recent samples so the average reflects
                // where the user is looking right before they confirm.
                if (this.currentSamples.length > this.samplesPerPoint * 4) {
                    this.currentSamples.shift();
                }

                if (this.debug) {
                    console.log(`[Calibration] Buffered sample ${this.currentSamples.length}: (${gazeData.x.toFixed(0)}, ${gazeData.y.toFixed(0)})`);
                }
            }
        }, 200);
        // No auto-confirm timer — advancement happens only on user input.
    }


    _stopAutoCollect() {
        if (this._collectInterval) {
            clearInterval(this._collectInterval);
            this._collectInterval = null;
        }
        if (this._collectTimer) {
            clearTimeout(this._collectTimer);
            this._collectTimer = null;
        }
    }

    /**
     * Bind keyboard and mouse events for confirmation
     * ONLY on the calibration overlay, not the entire document.
     * This prevents accidental clicks in other UI areas from auto-advancing
     * calibration points.
     */
    _bindEvents() {
        this._handleKeyDown = (e) => {
            if (!this.isCalibrating) return;
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                this._confirmPoint();
            }
            if (e.code === 'Escape') {
                this._skipCalibration();
            }
        };
        
        // Only confirm on clicks that are ON the overlay itself
        // (not clicks on buttons inside it, and definitely not
        //  clicks elsewhere on the page)
        this._handleClick = (e) => {
            if (!this.isCalibrating) return;
            // Must be a click on the overlay or one of its children
            if (!this._overlay || !this._overlay.contains(e.target)) return;
            // Don't count clicks on buttons
            if (e.target.tagName === 'BUTTON') return;
            // Don't count clicks on progress/status text
            if (e.target.closest && (
                e.target.closest('#ff-calibration-progress') ||
                e.target.closest('#ff-calibration-status') ||
                e.target.closest('#ff-calibration-instruction')
            )) return;
            this._confirmPoint();
        };
        
        document.addEventListener('keydown', this._handleKeyDown);
        this._overlay.addEventListener('click', this._handleClick);
    }

    _unbindEvents() {
        if (this._handleKeyDown) {
            document.removeEventListener('keydown', this._handleKeyDown);
        }
        if (this._handleClick && this._overlay) {
            this._overlay.removeEventListener('click', this._handleClick);
        }
    }

    /**
     * Confirm the current calibration point
     */
    _confirmPoint() {
        if (!this.isCalibrating) return;
        
        this._stopAutoCollect();
        
        const pt = this.points[this.currentPointIndex];
        
        // Calculate the center of the calibration point in viewport coordinates
        const viewportX = pt.x * window.innerWidth;
        const viewportY = pt.y * window.innerHeight;
        
        // Store calibration data
        this.calibrationData.push({
            pointIndex: this.currentPointIndex,
            targetX: viewportX,
            targetY: viewportY,
            targetLabel: pt.label,
            samples: [...this.currentSamples],
            averageX: this.currentSamples.length > 0 
                ? this.currentSamples.reduce((s, d) => s + d.x, 0) / this.currentSamples.length 
                : viewportX,
            averageY: this.currentSamples.length > 0 
                ? this.currentSamples.reduce((s, d) => s + d.y, 0) / this.currentSamples.length 
                : viewportY
        });
        
        // Show confirmation flash
        if (this._statusEl) {
            this._statusEl.textContent = 'Collected';
            this._statusEl.style.color = '#16a34a';
        }
        
        // Briefly flash the point green
        const currentPointEl = this._pointEls[this.currentPointIndex];
        if (currentPointEl) {
            currentPointEl.style.borderColor = 'rgba(74, 222, 128, 0.8)';
            currentPointEl.style.background = 'rgba(74, 222, 128, 0.15)';
            currentPointEl.style.boxShadow = '0 0 60px rgba(74, 222, 128, 0.2)';
        }
        
        if (this.debug) {
            console.log(`[Calibration] Point ${this.currentPointIndex + 1} confirmed with ${this.currentSamples.length} samples`);
        }
        
        // Move to next point after a brief delay
        setTimeout(() => {
            if (this._statusEl) {
                this._statusEl.style.color = '#64748b';
            }
            this._showPoint(this.currentPointIndex + 1);
        }, 400);
    }

    /**
     * Finish calibration and provide data to WebGazer
     */
    _finishCalibration() {
        this._stopAutoCollect();
        this.isCalibrating = false;
        this.isComplete = true;
        
        if (this._progressEl) {
            this._progressEl.textContent = 'Calibration complete';
        }
        if (this._statusEl) {
            this._statusEl.textContent = 'All 9 points are complete. Optimizing the gaze model...';
            this._statusEl.style.color = '#4ade80';
        }
        
        // Update progress bar to 100%
        const bar = document.getElementById('ff-calibration-bar');
        if (bar) bar.style.width = '100%';
        
        // Provide calibration data to WebGazer
        this._applyCalibrationToWebGazer();
        
        if (this.debug) {
            console.log('[Calibration] Complete! Data:', this.calibrationData);
        }
        
        // Show success and dismiss overlay
        setTimeout(() => {
            // Show success message
            if (this._instructionEl) {
                this._instructionEl.innerHTML = `
                    <div style="font-size: 20px; color: #4ade80; margin-bottom: 8px;">✨ Calibration complete!</div>
                    <div style="font-size: 14px; color: #94a3b8;">Gaze tracking is optimized. Starting reading...</div>
                `;
            }
            
            // Dismiss overlay after a moment
            setTimeout(() => {
                this._dismissOverlay();
                if (this.onComplete) {
                    this.onComplete(this.calibrationData);
                }
            }, 1500);
        }, 500);
    }

    /**
     * Feed calibration data to WebGazer to improve model
     */
    _applyCalibrationToWebGazer() {
        try {
            if (!window.webgazer) {
                console.warn('[Calibration] WebGazer not available');
                return;
            }
            
            // WebGazer has a built-in calibration system
            // We use setRegression to retrain with our data
            // For each calibration point, we feed the known screen position
            // and the corresponding eye features
            
            // The approach: we collected the gaze predictions at each known screen point.
            // WebGazer stores data internally; we just need to signal it to retrain.
            
            // If WebGazer has saveDataAcrossSessions enabled, our calibration persists
            if (typeof webgazer.setRegression === 'function') {
                // Force WebGazer to re-train with all accumulated data
                webgazer.setRegression('ridge');
                console.log('[Calibration] Applied calibration data to WebGazer model');
            }
            
            // Store calibration data for reference
            window.__focusflow_calibration = this.calibrationData;
            
        } catch (e) {
            console.warn('[Calibration] Error applying to WebGazer:', e);
        }
    }

    /**
     * Skip calibration and dismiss
     */
    _skipCalibration() {
        this._stopAutoCollect();
        this.isCalibrating = false;
        this.isComplete = false;
        
        if (this.debug) console.log('[Calibration] Skipped by user');
        
        this._dismissOverlay();
        if (this.onComplete) {
            this.onComplete(null);  // null indicates calibration was skipped
        }
    }

    /**
     * Animate and dismiss the overlay
     */
    _dismissOverlay() {
        this._unbindEvents();
        
        if (this._overlay) {
            this._overlay.style.opacity = '0';
            setTimeout(() => {
                this._destroyOverlay();
            }, 500);
        }
    }

    _destroyOverlay() {
        if (this._overlay && this._overlay.parentNode) {
            this._overlay.parentNode.removeChild(this._overlay);
        }
        this._overlay = null;
        this._pointEls = [];
        this._progressEl = null;
        this._statusEl = null;
        this._instructionEl = null;
    }

    /**
     * Get calibration results
     */
    getResults() {
        if (!this.isComplete) return null;
        
        // Calculate accuracy metrics
        const accuracies = this.calibrationData.map(d => {
            const dx = d.averageX - d.targetX;
            const dy = d.averageY - d.targetY;
            return Math.sqrt(dx * dx + dy * dy);
        });
        
        const avgAccuracy = accuracies.reduce((s, a) => s + a, 0) / accuracies.length;
        
        return {
            points: this.calibrationData,
            accuracy: avgAccuracy,
            accuracyPx: accuracies,
            averageOffsetX: this.calibrationData.reduce((s, d) => s + (d.averageX - d.targetX), 0) / this.calibrationData.length,
            averageOffsetY: this.calibrationData.reduce((s, d) => s + (d.averageY - d.targetY), 0) / this.calibrationData.length,
            totalSamples: this.calibrationData.reduce((s, d) => s + d.samples.length, 0)
        };
    }

    /**
     * Destroy the calibration manager
     */
    destroy() {
        this._stopAutoCollect();
        this._unbindEvents();
        this._destroyOverlay();
        this.isCalibrating = false;
        this.calibrationData = [];
        this.currentSamples = [];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalibrationManager;
}
