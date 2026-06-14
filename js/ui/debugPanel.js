/**
 * FocusFlow - Debug Panel
 * 
 * Displays real-time debugging information:
 * - Gaze coordinates
 * - Current block info
 * - FPS counter
 * - Effect state
 * - Cognitive state
 * 
 * HCI Final Project - Member B (Frontend & Adaptive UI)
 */

class DebugPanel {
    constructor() {
        this._panel = null;
        this._visible = false;
        this._fps = 0;
        this._frameCount = 0;
        this._lastFpsTime = performance.now();
        this._data = {
            gazeX: '-',
            gazeY: '-',
            blockIndex: '-',
            blockId: '-',
            cognitiveState: '-',
            dimLevel: '0',
            focusMode: 'standard',
            wpm: '0',
            fps: '0',
            highlightActive: 'false',
            effectsActive: '0'
        };
        
        this._buildPanel();
        this._startFpsTracking();
        this._setupKeyboardShortcut();
    }

    /**
     * Build the debug panel DOM
     */
    _buildPanel() {
        this._panel = document.createElement('div');
        this._panel.className = 'ff-debug-panel';
        this._panel.id = 'ff-debug-panel';
        
        this._panel.innerHTML = `
            <div class="debug-title">🔧 Debug Panel</div>
            <div class="debug-row"><span class="debug-label">Gaze:</span><span class="debug-value" id="debug-gaze">- , -</span></div>
            <div class="debug-row"><span class="debug-label">Block:</span><span class="debug-value" id="debug-block">-</span></div>
            <div class="debug-row"><span class="debug-label">State:</span><span class="debug-value" id="debug-state">-</span></div>
            <div class="debug-row"><span class="debug-label">FPS:</span><span class="debug-value" id="debug-fps">0</span></div>
            <div class="debug-row"><span class="debug-label">Dim:</span><span class="debug-value" id="debug-dim">0%</span></div>
            <div class="debug-row"><span class="debug-label">Mode:</span><span class="debug-value" id="debug-mode">standard</span></div>
            <div class="debug-row"><span class="debug-label">WPM:</span><span class="debug-value" id="debug-wpm">0</span></div>
            <div class="debug-row"><span class="debug-label">Effects:</span><span class="debug-value" id="debug-effects">0</span></div>
        `;
        
        document.body.appendChild(this._panel);
    }

    /**
     * Start FPS tracking
     */
    _startFpsTracking() {
        const trackFps = () => {
            this._frameCount++;
            const now = performance.now();
            const elapsed = now - this._lastFpsTime;
            
            if (elapsed >= 1000) {
                this._fps = Math.round(this._frameCount / (elapsed / 1000));
                this._frameCount = 0;
                this._lastFpsTime = now;
                this._data.fps = String(this._fps);
                this._updateDisplay();
            }
            
            requestAnimationFrame(trackFps);
        };
        requestAnimationFrame(trackFps);
    }

    /**
     * Setup keyboard shortcut (Ctrl+Shift+D) to toggle panel
     */
    _setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    /**
     * Update debug data
     * @param {Object} data - Partial data to update
     */
    updateData(data) {
        Object.assign(this._data, data);
        this._updateDisplay();
    }

    /**
     * Update the panel display
     */
    _updateDisplay() {
        if (!this._visible || !this._panel) return;
        
        const get = (id) => document.getElementById(`debug-${id}`);
        
        const gazeEl = get('gaze');
        if (gazeEl) gazeEl.textContent = `${this._data.gazeX}, ${this._data.gazeY}`;
        
        const blockEl = get('block');
        if (blockEl) blockEl.textContent = `${this._data.blockIndex}: ${this._data.blockId}`;
        
        const stateEl = get('state');
        if (stateEl) stateEl.textContent = this._data.cognitiveState;
        
        const fpsEl = get('fps');
        if (fpsEl) fpsEl.textContent = this._data.fps;
        
        const dimEl = get('dim');
        if (dimEl) dimEl.textContent = `${Math.round(parseFloat(this._data.dimLevel) * 100)}%`;
        
        const modeEl = get('mode');
        if (modeEl) modeEl.textContent = this._data.focusMode;
        
        const wpmEl = get('wpm');
        if (wpmEl) wpmEl.textContent = this._data.wpm;
        
        const effectsEl = get('effects');
        if (effectsEl) effectsEl.textContent = this._data.effectsActive;
    }

    /**
     * Show the debug panel
     */
    show() {
        this._visible = true;
        if (this._panel) {
            this._panel.classList.add('visible');
            this._updateDisplay();
        }
    }

    /**
     * Hide the debug panel
     */
    hide() {
        this._visible = false;
        if (this._panel) {
            this._panel.classList.remove('visible');
        }
    }

    /**
     * Toggle the debug panel visibility
     */
    toggle() {
        if (this._visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Check if panel is visible
     * @returns {boolean}
     */
    isVisible() {
        return this._visible;
    }

    /**
     * Set gaze coordinates
     */
    setGaze(x, y) {
        this._data.gazeX = String(Math.round(x));
        this._data.gazeY = String(Math.round(y));
    }

    /**
     * Set block info
     */
    setBlock(index, id) {
        this._data.blockIndex = String(index);
        this._data.blockId = id || '-';
    }

    /**
     * Set cognitive state
     */
    setCognitiveState(state) {
        this._data.cognitiveState = state;
    }

    /**
     * Set dim level
     */
    setDimLevel(level) {
        this._data.dimLevel = String(level);
    }

    /**
     * Set focus mode
     */
    setFocusMode(mode) {
        this._data.focusMode = mode;
    }

    /**
     * Set WPM
     */
    setWpm(wpm) {
        this._data.wpm = String(wpm);
    }

    /**
     * Set active effects count
     */
    setEffectsCount(count) {
        this._data.effectsActive = String(count);
    }

    /**
     * Clean up
     */
    destroy() {
        if (this._panel && this._panel.parentNode) {
            this._panel.parentNode.removeChild(this._panel);
        }
        this._visible = false;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DebugPanel;
}
