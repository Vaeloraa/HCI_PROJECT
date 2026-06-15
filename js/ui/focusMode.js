/**
 * FocusFlow - Focus Mode Manager
 * 
 * Manages focus modes:
 *   1. Standard - Full layout with sidebar
 *   2. Deep Focus - Full reading panel, hide sidebar
 *
 * HCI Final Project - Member B (Frontend & Adaptive UI)
 */

class FocusMode {
    constructor() {
        this._currentMode = 'standard'; // 'standard' | 'deep'
        this._previousMode = 'standard';
        this._body = document.body;
        this._onChangeCallbacks = [];
        this._keyboardListener = null;
        
        this._setupKeyboardShortcuts();
    }

    /**
     * Set up keyboard shortcuts for mode switching
     */
    _setupKeyboardShortcuts() {
        this._keyboardListener = (e) => {
            // Alt+1: Standard, Alt+2: Deep Focus
            if (e.altKey) {
                switch (e.key) {
                    case '1': this.setMode('standard'); break;
                    case '2': this.setMode('deep'); break;
                }
            }
            // Escape: Return to standard mode
            if (e.key === 'Escape' && this._currentMode !== 'standard') {
                this.setMode('standard');
            }
        };
        document.addEventListener('keydown', this._keyboardListener);
    }

    /**
     * Set the focus mode
     * @param {string} mode - 'standard' | 'deep'
     */
    setMode(mode) {
        if (mode === this._currentMode) return;
        if (!['standard', 'deep'].includes(mode)) return;

        this._previousMode = this._currentMode;
        this._currentMode = mode;

        // Remove all focus mode classes
        this._body.classList.remove('ff-focus-mode-deep');

        // Apply new mode
        switch (mode) {
            case 'deep':
                this._body.classList.add('ff-focus-mode-deep');
                break;
            case 'standard':
            default:
                // No class needed - standard mode
                break;
        }

        // Update toggle buttons
        this._updateToggleButtons();

        // Dispatch event
        this._body.dispatchEvent(new CustomEvent('focus-mode-changed', {
            detail: { mode, previousMode: this._previousMode }
        }));

        // Notify callbacks
        this._onChangeCallbacks.forEach(cb => {
            try { cb(mode, this._previousMode); } catch(e) { /* silent */ }
        });
    }

    /**
     * Get the current focus mode
     * @returns {string}
     */
    getCurrentMode() {
        return this._currentMode;
    }

    /**
     * Check if a specific mode is active
     * @param {string} mode
     * @returns {boolean}
     */
    isMode(mode) {
        return this._currentMode === mode;
    }

    /**
     * Register a callback for mode changes
     * @param {Function} callback - fn(newMode, previousMode)
     */
    onChange(callback) {
        if (typeof callback === 'function') {
            this._onChangeCallbacks.push(callback);
        }
    }

    /**
     * Update toggle button active states
     */
    _updateToggleButtons() {
        document.querySelectorAll('.ff-focus-toggle-btn').forEach(btn => {
            const btnMode = btn.dataset.focusMode;
            btn.classList.toggle('active', btnMode === this._currentMode);
        });
    }

    /**
     * Bind toggle buttons in the DOM
     * Buttons should have data-focus-mode="deep|standard"
     */
    bindToggleButtons() {
        document.querySelectorAll('.ff-focus-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.focusMode;
                if (mode) this.setMode(mode);
            });
        });
        this._updateToggleButtons();
    }

    /**
     * Create and return the focus mode toggle UI HTML
     * @returns {string} HTML string
     */
    static createToggleHTML() {
        const t = (key) => (typeof I18n !== 'undefined' ? I18n.t(key) : key);
        return `
            <div class="ff-segment-group ff-focus-toggle">
                <button type="button" class="ff-segment-btn ff-focus-toggle-btn active" data-focus-mode="standard" title="${t('focus.standardTitle')}">
                    <span class="ff-segment-icon">📖</span><span data-i18n="focus.standard">${t('focus.standard')}</span>
                </button>
                <button type="button" class="ff-segment-btn ff-focus-toggle-btn" data-focus-mode="deep" title="${t('focus.deepTitle')}">
                    <span class="ff-segment-icon">🔍</span><span data-i18n="focus.deep">${t('focus.deep')}</span>
                </button>
            </div>
        `;
    }

    /**
     * Clean up
     */
    destroy() {
        if (this._keyboardListener) {
            document.removeEventListener('keydown', this._keyboardListener);
        }
        this._onChangeCallbacks = [];
        this.setMode('standard');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FocusMode;
}
