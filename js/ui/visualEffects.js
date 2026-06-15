/**
 * FocusFlow - VisualEffects Module (Enhanced)
 * 
 * Provides real-time visual feedback for gaze-based reading:
 * - Gradient highlight with breathing animation
 * - Radial dim overlay centered on gaze point
 * - Gaze glow / focus ring
 * - Wake-up floating particles
 * - Progress milestone celebrations
 * - Sound feedback on state transitions
 * - Enhanced positivity animations
 * 
 * HCI Final Project - Member B (Frontend & Adaptive UI)
 */

class VisualEffects {
    constructor(config) {
        this.config = config;
        this.currentState = 'Normal';
        this.dimOverlay = null;
        this.gazeGlow = null;
        this.wakeupOverlay = null;
        this.particleContainer = null;
        this.milestoneContainer = null;
        this.milestoneShown = new Set();
        
        // Highlight state
        this.currentHighlightEl = null;
        this._highlightAnimId = null;
        this._breathPhase = 0;
        
        // Dim state
        this.dimIntensity = 0;
        this.dimTargetIntensity = 0;
        this._dimAnimId = null;
        this._lastGazeX = 0;
        this._lastGazeY = 0;
        
        // Sound elements
        this.sounds = {};
        this.soundEnabled = true;
        
        // Active effects counter (for debug panel)
        this._activeEffectCount = 0;
        
        this._init();
    }

    /**
     * Initialize overlay elements and event listeners
     */
    _init() {
        this._ensureDimOverlay();
        this._ensureGazeGlow();
        this._ensureParticleContainer();
        this._ensureMilestoneContainer();
        this._preloadSounds();
    }

    // ─── DIM OVERLAY (Enhanced with Radial Gradient) ───

    _ensureDimOverlay() {
        if (!this.dimOverlay) {
            this.dimOverlay = document.getElementById('ff-dim-overlay');
            if (!this.dimOverlay) {
                this.dimOverlay = document.createElement('div');
                this.dimOverlay.id = 'ff-dim-overlay';
                this.dimOverlay.style.cssText = `
                    position: fixed;
                    top: 0; left: 0;
                    width: 100%; height: 100%;
                    pointer-events: none;
                    z-index: 90;
                    opacity: 0;
                    transition: opacity 0.5s ease;
                    background: radial-gradient(
                        ellipse 250px 250px at 50% 50%,
                        transparent 0%,
                        rgba(0,0,0,0) 30%,
                        rgba(0,0,0,0.6) 100%
                    );
                `;
                document.body.appendChild(this.dimOverlay);
            }
        }
    }

    /**
     * Set dim effect with radial gradient centered on gaze point
     * @param {number} intensity - 0 to 1
     * @param {number} [gazeX] - Viewport X coordinate
     * @param {number} [gazeY] - Viewport Y coordinate
     * @param {number} [width] - Gaze radius width
     * @param {number} [height] - Gaze radius height
     */
    setDim(intensity, gazeX, gazeY, width, height) {
        this.dimTargetIntensity = Math.max(0, Math.min(1, intensity));

        if (gazeX !== undefined) this._lastGazeX = gazeX;
        if (gazeY !== undefined) this._lastGazeY = gazeY;

        const w = width || 250;
        const h = height || 250;
        const cx = this._lastGazeX || window.innerWidth / 2;
        const cy = this._lastGazeY || window.innerHeight / 2;

        if (this.dimOverlay) {
            const alpha = 0.5 * this.dimTargetIntensity;
            this.dimOverlay.style.background = `
                radial-gradient(
                    ellipse ${w}px ${h}px at ${cx}px ${cy}px,
                    transparent 0%,
                    rgba(0,0,0,0.05) 40%,
                    rgba(0,0,0,${alpha}) 100%
                )
            `;
            this.dimOverlay.style.opacity = this.dimTargetIntensity > 0 ? '1' : '0';
        }

        this.dimIntensity = this.dimTargetIntensity;
    }

    /**
     * Animate dim intensity towards target using smooth easing
     */
    animateDim(intensity, gazeX, gazeY) {
        this.dimTargetIntensity = intensity;
        if (gazeX !== undefined) this._lastGazeX = gazeX;
        if (gazeY !== undefined) this._lastGazeY = gazeY;
    }

    /**
     * Process dim animation step (called from main loop)
     */
    processDimStep(deltaTime) {
        const speed = 2.0; // per second
        const diff = this.dimTargetIntensity - this.dimIntensity;
        
        if (Math.abs(diff) < 0.005) {
            this.dimIntensity = this.dimTargetIntensity;
        } else {
            this.dimIntensity += Math.sign(diff) * speed * deltaTime;
            this.dimIntensity = Math.max(0, Math.min(1, this.dimIntensity));
        }
        
        this.setDim(this.dimIntensity, this._lastGazeX, this._lastGazeY);
    }

    // ─── GAZE GLOW ───

    _ensureGazeGlow() {
        if (!this.gazeGlow) {
            this.gazeGlow = document.getElementById('ff-gaze-glow');
            if (!this.gazeGlow) {
                this.gazeGlow = document.createElement('div');
                this.gazeGlow.id = 'ff-gaze-glow';
                this.gazeGlow.style.cssText = `
                    position: fixed;
                    width: 120px;
                    height: 120px;
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 85;
                    background: radial-gradient(
                        circle,
                        rgba(107, 159, 255, 0.12) 0%,
                        rgba(107, 159, 255, 0.06) 30%,
                        rgba(107, 159, 255, 0.02) 60%,
                        transparent 100%
                    );
                    transform: translate(-50%, -50%);
                    opacity: 0;
                    transition: opacity 0.6s ease;
                    will-change: transform, left, top;
                `;
                document.body.appendChild(this.gazeGlow);
            }
        }
    }

    /**
     * Update gaze glow position and visibility
     * @param {number} x 
     * @param {number} y 
     * @param {boolean} active 
     */
    updateGazeGlow(x, y, active) {
        if (!this.gazeGlow) return;

        if (this.config && (this.config.showGazeDot === false || this.config.trackingMode === 'mouse')) {
            this.gazeGlow.style.opacity = '0';
            return;
        }
        
        this.gazeGlow.style.left = `${x}px`;
        this.gazeGlow.style.top = `${y}px`;
        this.gazeGlow.style.opacity = active ? '1' : '0';
        
        let glowSize = 120;
        let glowOpacity = 0.12;
        
        switch (this.currentState) {
            case 'Struggling':
                glowSize = 150;
                glowOpacity = 0.18;
                break;
            case 'Distracted':
                glowSize = 160;
                glowOpacity = 0.15;
                break;
            case 'Recovering':
                glowSize = 130;
                glowOpacity = 0.10;
                break;
            default:
                glowSize = 120;
                glowOpacity = 0.12;
        }
        
        this.gazeGlow.style.width = `${glowSize}px`;
        this.gazeGlow.style.height = `${glowSize}px`;
        this.gazeGlow.style.background = `
            radial-gradient(
                circle,
                rgba(107, 159, 255, ${glowOpacity}) 0%,
                rgba(107, 159, 255, ${glowOpacity * 0.5}) 30%,
                rgba(107, 159, 255, ${glowOpacity * 0.15}) 60%,
                transparent 100%
            )
        `;
    }

    /**
     * Hide gaze glow
     */
    hideGazeGlow() {
        if (this.gazeGlow) {
            this.gazeGlow.style.opacity = '0';
        }
    }

    // ─── GRADIENT HIGHLIGHT WITH BREATHING ───

    /**
     * Highlight a paragraph element with gradient + breathing animation
     * @param {HTMLElement} element 
     * @param {string} state 
     */
    highlightElement(element, state) {
        this._removeHighlight();
        
        if (!element) return;
        
        this.currentHighlightEl = element;
        this.currentState = state || 'Normal';
        
        let color1, color2, color3;
        
        switch (this.currentState) {
            case 'Distracted':
                color1 = 'rgba(255, 152, 0, 0.08)';
                color2 = 'rgba(255, 152, 0, 0.04)';
                color3 = 'transparent';
                break;
            case 'Struggling':
                color1 = 'rgba(244, 67, 54, 0.08)';
                color2 = 'rgba(244, 67, 54, 0.04)';
                color3 = 'transparent';
                break;
            case 'Recovering':
                color1 = 'rgba(33, 150, 243, 0.10)';
                color2 = 'rgba(33, 150, 243, 0.05)';
                color3 = 'transparent';
                break;
            default: // Normal / Focused
                color1 = 'rgba(76, 175, 80, 0.08)';
                color2 = 'rgba(76, 175, 80, 0.04)';
                color3 = 'rgba(76, 175, 80, 0.01)';
        }
        
        this._startBreathing(element, color1, color2, color3);
    }

    /**
     * Animate the highlight with a breathing gradient effect
     */
    _startBreathing(element, color1, color2, color3) {
        if (this._highlightAnimId) {
            cancelAnimationFrame(this._highlightAnimId);
        }
        
        let startTime = performance.now();
        const breathe = (timestamp) => {
            const elapsed = (timestamp - startTime) / 1000;
            this._breathPhase = Math.sin(elapsed * 1.5 * Math.PI) * 0.5 + 0.5;
            
            const alpha1 = 0.06 + this._breathPhase * 0.06;
            const alpha2 = 0.02 + this._breathPhase * 0.04;
            
            element.style.background = `
                linear-gradient(
                    120deg,
                    ${color1.replace(/[\d.]+\)/, `${Math.round(alpha1 * 100) / 100})`)} 0%,
                    ${color2.replace(/[\d.]+\)/, `${Math.round(alpha2 * 100) / 100})`)} 50%,
                    transparent 100%
                )
            `;
            element.style.borderLeft = `3px solid rgba(107, 159, 255, ${0.15 + this._breathPhase * 0.15})`;
            element.style.borderRadius = '4px';
            element.style.transition = 'background 0.3s ease, border-left 0.3s ease';
            
            this._highlightAnimId = requestAnimationFrame(breathe);
        };
        
        this._highlightAnimId = requestAnimationFrame(breathe);
    }

    /**
     * Remove highlighting from the current element
     */
    _removeHighlight() {
        if (this.currentHighlightEl) {
            this.currentHighlightEl.style.background = '';
            this.currentHighlightEl.style.borderLeft = '';
            this.currentHighlightEl.style.borderRadius = '';
        }
        if (this._highlightAnimId) {
            cancelAnimationFrame(this._highlightAnimId);
            this._highlightAnimId = null;
        }
        this.currentHighlightEl = null;
    }

    /**
     * Public alias: clear highlight (called from main.js)
     */
    clearHighlight() {
        this._removeHighlight();
    }

    /**
     * Public alias: set dim level with smooth animation (called from main.js)
     * @param {number} intensity - 0 to 1
     */
    setDimLevel(intensity) {
        this.animateDim(intensity, this._lastGazeX, this._lastGazeY);
    }

    /**
     * Update gaze glow position (called from main.js)
     * Also stores current gaze for dim centering
     * @param {number} x
     * @param {number} y
     */
    updateGazePosition(x, y) {
        this._lastGazeX = x;
        this._lastGazeY = y;
        if (this.config && (this.config.showGazeDot === false || this.config.trackingMode === 'mouse')) {
            this.hideGazeGlow();
            return;
        }
        const isReading = this.currentState === 'Normal' || this.currentState === 'Reading' || this.currentState === 'Recovering';
        this.updateGazeGlow(x, y, isReading);
    }

    /**
     * Show a prompt/notification toast (called from main.js for various alerts)
     * @param {string} icon - Emoji icon
     * @param {string} title - Main text
     * @param {string} [subtitle] - Secondary text (optional)
     */
    showPrompt(icon, title, subtitle) {
        const prompt = document.createElement('div');
        prompt.style.cssText = `
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1002;
            background: rgba(17, 24, 39, 0.95);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 16px;
            padding: 24px 36px;
            text-align: center;
            pointer-events: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            animation: ffPromptIn 0.4s ease-out, ffPromptOut 0.4s ease-in 3.6s forwards;
            box-shadow: 0 8px 40px rgba(0,0,0,0.4);
            max-width: 400px;
        `;
        
        prompt.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 8px;">${icon || '💡'}</div>
            <div style="font-size: 20px; font-weight: 700; color: #e2e8f0; margin-bottom: 4px;">${title || ''}</div>
            ${subtitle ? `<div style="font-size: 14px; color: #94a3b8;">${subtitle}</div>` : ''}
        `;
        
        document.body.appendChild(prompt);
        
        if (!document.getElementById('ff-prompt-anim-style')) {
            const style = document.createElement('style');
            style.id = 'ff-prompt-anim-style';
            style.textContent = `
                @keyframes ffPromptIn {
                    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
                @keyframes ffPromptOut {
                    0% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        setTimeout(() => {
            if (prompt.parentNode) prompt.parentNode.removeChild(prompt);
        }, 4200);
    }

    /**
     * Show wake-up cue overlay (called from main.js)
     */
    showWakeUpCue() {
        this.showWakeupOverlay(true);
        setTimeout(() => {
            this.showWakeupOverlay(false);
        }, 3000);
    }

    /**
     * Show wake-up overlay (true = show, false = hide)
     */
    showWakeupOverlay(active) {
        if (!this.wakeupOverlay) {
            this.wakeupOverlay = document.getElementById('ff-wakeup-overlay');
            if (!this.wakeupOverlay) {
                this.wakeupOverlay = document.createElement('div');
                this.wakeupOverlay.id = 'ff-wakeup-overlay';
                this.wakeupOverlay.style.cssText = `
                    position: fixed;
                    top: 0; left: 0;
                    width: 100%; height: 100%;
                    pointer-events: none;
                    z-index: 91;
                    border: 0px solid rgba(100, 180, 255, 0);
                    box-sizing: border-box;
                    transition: border-width 0.5s ease, border-color 0.5s ease, box-shadow 0.5s ease;
                `;
                document.body.appendChild(this.wakeupOverlay);
            }
        }
        
        if (active) {
            this.wakeupOverlay.style.borderWidth = '8px';
            this.wakeupOverlay.style.borderColor = 'rgba(100, 180, 255, 0.4)';
            this.wakeupOverlay.style.boxShadow = 'inset 0 0 80px rgba(100, 180, 255, 0.1)';
            this.triggerParticles('wakeup');
        } else {
            this.wakeupOverlay.style.borderWidth = '0px';
            this.wakeupOverlay.style.borderColor = 'rgba(100, 180, 255, 0)';
            this.wakeupOverlay.style.boxShadow = 'inset 0 0 0px rgba(100, 180, 255, 0)';
        }
    }

    /**
     * Show positive return feedback (called from main.js when user re-engages)
     */
    showPositiveFeedback() {
        this.showWarmFlash();
        this.triggerParticles('focus');
    }

    /**
     * Show a warm flash effect to indicate positive transition
     */
    showWarmFlash() {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            pointer-events: none;
            z-index: 92;
            background: radial-gradient(
                ellipse at center,
                rgba(76, 175, 80, 0.08) 0%,
                transparent 60%
            );
            animation: ffWarmFlash 1.2s ease-out forwards;
        `;
        document.body.appendChild(flash);
        
        if (!document.getElementById('ff-warmflash-style')) {
            const style = document.createElement('style');
            style.id = 'ff-warmflash-style';
            style.textContent = `
                @keyframes ffWarmFlash {
                    0% { opacity: 0; }
                    20% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        setTimeout(() => {
            if (flash.parentNode) flash.parentNode.removeChild(flash);
        }, 1300);
    }

    /**
     * Update reading progress display and check milestones (called from main.js)
     * @param {number} progress - 0 to 1
     */
    updateProgress(progress) {
        this.checkMilestones(progress);
        
        const bar = document.getElementById('ff-progress-bar');
        if (bar) {
            bar.style.width = `${Math.round(progress * 100)}%`;
        }
        const text = document.getElementById('ff-progress-text');
        if (text) {
            text.textContent = `${Math.round(progress * 100)}%`;
        }
    }

    /**
     * Show dwell-triggered comprehension assist card (anchored to active paragraph).
     */
    setComprehensionAnchor(element) {
        this._comprehensionAnchor = element || null;
        this._ensureComprehensionCard();
        this._bindComprehensionPositionListeners();
        this.updateComprehensionPosition();
    }

    _ensureComprehensionCard() {
        let card = document.getElementById('ff-comprehension-card');
        if (!card) return;
        if (card.parentElement !== document.body) {
            document.body.appendChild(card);
        }
    }

    _bindComprehensionPositionListeners() {
        if (this._comprehensionPositionBound) return;
        this._comprehensionPositionBound = true;
        this._onComprehensionReposition = () => this.updateComprehensionPosition();
        window.addEventListener('resize', this._onComprehensionReposition);
        window.addEventListener('scroll', this._onComprehensionReposition, true);
        const readingContent = document.getElementById('ff-reading-content');
        if (readingContent) {
            readingContent.addEventListener('scroll', this._onComprehensionReposition);
        }
    }

    _unbindComprehensionPositionListeners() {
        if (!this._comprehensionPositionBound) return;
        this._comprehensionPositionBound = false;
        window.removeEventListener('resize', this._onComprehensionReposition);
        window.removeEventListener('scroll', this._onComprehensionReposition, true);
        const readingContent = document.getElementById('ff-reading-content');
        if (readingContent) {
            readingContent.removeEventListener('scroll', this._onComprehensionReposition);
        }
    }

    updateComprehensionPosition() {
        const card = document.getElementById('ff-comprehension-card');
        const anchor = this._comprehensionAnchor;
        if (!card || card.hidden || !anchor) return;

        const rect = anchor.getBoundingClientRect();
        const margin = 8;
        const cardW = card.offsetWidth || 320;
        const cardH = card.offsetHeight || 160;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let left = rect.right - cardW;
        let top = rect.bottom - cardH;

        if (top < rect.top + margin) {
            top = rect.bottom + margin;
        }

        left = Math.max(margin, Math.min(left, vw - cardW - margin));
        top = Math.max(margin, Math.min(top, vh - cardH - margin));

        card.style.left = `${Math.round(left)}px`;
        card.style.top = `${Math.round(top)}px`;
        card.style.right = 'auto';
        card.style.bottom = 'auto';
    }

    showComprehensionLoading(payload) {
        const card = document.getElementById('ff-comprehension-card');
        const body = document.getElementById('ff-comprehension-body');
        const meta = document.getElementById('ff-comprehension-meta');
        if (!card || !body) return;

        const t = (key, params) => {
            if (typeof I18n !== 'undefined') return I18n.t(key, params);
            return key;
        };

        if (meta) {
            meta.textContent = t('comprehension.meta', {
                index: payload.paragraphNumber || (payload.blockIndex + 1),
                seconds: payload.dwellSeconds || 0
            });
        }

        body.innerHTML = `<div class="ff-comprehension-loading"><span class="ff-comprehension-spinner"></span>${t('comprehension.loading')}</div>`;
        card.hidden = false;
        card.classList.add('is-visible', 'is-loading');
        this._comprehensionVisible = true;
        this.updateComprehensionPosition();
    }

    showComprehensionCard(payload) {
        const card = document.getElementById('ff-comprehension-card');
        const body = document.getElementById('ff-comprehension-body');
        const meta = document.getElementById('ff-comprehension-meta');
        if (!card || !body) return;

        this._removeLegacyKeywordPanels();

        const t = (key, params) => {
            if (typeof I18n !== 'undefined') return I18n.t(key, params);
            return key;
        };

        if (meta) {
            meta.textContent = t('comprehension.meta', {
                index: payload.paragraphNumber || (payload.blockIndex + 1),
                seconds: payload.dwellSeconds || 0
            });
        }

        body.textContent = payload.summary || '';
        card.classList.remove('is-loading');
        const wasVisible = this._comprehensionVisible && !card.classList.contains('is-loading');
        card.hidden = false;
        card.classList.add('is-visible');
        if (!wasVisible) {
            card.classList.remove('ff-comprehension-card--update');
            void card.offsetWidth;
            card.classList.add('ff-comprehension-card--enter');
        } else {
            card.classList.add('ff-comprehension-card--update');
        }
        this._comprehensionVisible = true;
        requestAnimationFrame(() => this.updateComprehensionPosition());
    }

    _removeLegacyKeywordPanels() {
        document.querySelectorAll('[data-ff-legacy-keyword]').forEach((el) => el.remove());
    }

    hideComprehensionCard() {
        const card = document.getElementById('ff-comprehension-card');
        if (!card) return;
        card.hidden = true;
        card.classList.remove('is-visible', 'ff-comprehension-card--enter', 'ff-comprehension-card--update', 'is-loading');
        this._comprehensionVisible = false;
        this._comprehensionAnchor = null;
    }

    /**
     * @deprecated Keyword popup removed — comprehension card only.
     */
    showKeywords() {
        this._removeLegacyKeywordPanels();
    }

    /**
     * Reset visual effects state (called from main.js shutdown/reset)
     */
    reset() {
        this._removeHighlight();
        this.dimIntensity = 0;
        this.dimTargetIntensity = 0;
        if (this.dimOverlay) {
            this.dimOverlay.style.opacity = '0';
            this.dimOverlay.style.background = '';
        }
        this.hideGazeGlow();
        this.showWakeupOverlay(false);
        this.hideComprehensionCard();
        this._unbindComprehensionPositionListeners();
        this.milestoneShown.clear();
        this.currentState = 'Normal';
    }

    /**
     * Destroy visual effects (clean up)
     */
    destroy() {
        this.reset();
        // Remove DOM elements
        [this.dimOverlay, this.gazeGlow, this.wakeupOverlay, this.particleContainer, this.milestoneContainer].forEach(el => {
            if (el && el.parentNode) el.parentNode.removeChild(el);
        });
    }

    // ─── WAKE-UP PARTICLES ───

    _ensureParticleContainer() {
        if (!this.particleContainer) {
            this.particleContainer = document.getElementById('ff-particle-container');
            if (!this.particleContainer) {
                this.particleContainer = document.createElement('div');
                this.particleContainer.id = 'ff-particle-container';
                this.particleContainer.style.cssText = `
                    position: fixed;
                    top: 0; left: 0;
                    width: 100%; height: 100%;
                    pointer-events: none;
                    z-index: 95;
                    overflow: hidden;
                `;
                document.body.appendChild(this.particleContainer);
            }
        }
    }

    /**
     * Trigger floating particle effect
     * @param {string} type - 'wakeup' | 'focus' | 'celebration'
     */
    triggerParticles(type = 'wakeup') {
        const particleCount = type === 'celebration' ? 30 : 15;
        const colors = {
            wakeup: ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0'],
            focus: ['#4CAF50', '#8BC34A', '#CDDC39'],
            celebration: ['#FFD700', '#FF6B6B', '#4CAF50', '#2196F3', '#FF9800']
        };
        
        const palette = colors[type] || colors.wakeup;
        
        for (let i = 0; i < particleCount; i++) {
            this._createParticle(palette, type);
        }
    }

    _createParticle(palette, type) {
        const particle = document.createElement('div');
        const size = 4 + Math.random() * 8;
        const color = palette[Math.floor(Math.random() * palette.length)];
        const startX = Math.random() * window.innerWidth;
        const startY = window.innerHeight * 0.5 + Math.random() * window.innerHeight * 0.3;
        const driftX = (Math.random() - 0.5) * 200;
        const driftY = -(100 + Math.random() * 200);
        const duration = 1500 + Math.random() * 2000;
        const delay = Math.random() * 500;
        
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
            background: ${color};
            left: ${startX}px;
            top: ${startY}px;
            opacity: ${0.4 + Math.random() * 0.4};
            box-shadow: 0 0 ${size}px ${color};
            pointer-events: none;
            transform: rotate(${Math.random() * 360}deg);
        `;
        
        this.particleContainer.appendChild(particle);
        
        const startTime = performance.now();
        const animateParticle = (timestamp) => {
            const elapsed = timestamp - startTime - delay;
            if (elapsed < 0) {
                requestAnimationFrame(animateParticle);
                return;
            }
            
            const progress = Math.min(1, elapsed / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            
            const x = startX + driftX * eased;
            const y = startY + driftY * eased;
            const opacity = (1 - eased) * 0.7;
            const scale = 1 - eased * 0.5;
            
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            particle.style.opacity = opacity;
            particle.style.transform = `rotate(${eased * 360}deg) scale(${scale})`;
            
            if (progress < 1) {
                requestAnimationFrame(animateParticle);
            } else {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }
        };
        
        requestAnimationFrame(animateParticle);
    }

    // ─── PROGRESS MILESTONE CELEBRATIONS ───

    _ensureMilestoneContainer() {
        if (!this.milestoneContainer) {
            this.milestoneContainer = document.getElementById('ff-milestone-container');
            if (!this.milestoneContainer) {
                this.milestoneContainer = document.createElement('div');
                this.milestoneContainer.id = 'ff-milestone-container';
                this.milestoneContainer.style.cssText = `
                    position: fixed;
                    top: 0; left: 0;
                    width: 100%; height: 100%;
                    pointer-events: none;
                    z-index: 100;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                document.body.appendChild(this.milestoneContainer);
            }
        }
    }

    /**
     * Check if a milestone should be shown based on progress
     * @param {number} progress - 0 to 1
     */
    checkMilestones(progress) {
        const milestones = [0.25, 0.5, 0.75, 1.0];
        for (const m of milestones) {
            if (progress >= m && !this.milestoneShown.has(m)) {
                this.milestoneShown.add(m);
                this._showMilestone(m);
            }
        }
    }

    /**
     * Show a milestone celebration
     * @param {number} milestone - 0.25, 0.5, 0.75, or 1.0
     */
    _showMilestone(milestone) {
        const messages = {
            0.25: { text: '🎯 25% Complete! Keep it up!', emoji: '🎯', color: '#4CAF50' },
            0.5: { text: '🎉 50% Progress! Awesome!', emoji: '🎉', color: '#FF9800' },
            0.75: { text: '⭐ 75% Almost there!', emoji: '⭐', color: '#2196F3' },
            1.0: { text: '🏆 100% Reading Complete! You did it!', emoji: '🏆', color: '#FFD700' }
        };
        
        const data = messages[milestone] || messages[0.5];
        
        const toast = document.createElement('div');
        toast.style.cssText = `
            background: rgba(17, 24, 39, 0.95);
            border: 2px solid ${data.color};
            border-radius: 16px;
            padding: 20px 40px;
            color: white;
            font-size: 1.4rem;
            font-weight: bold;
            box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 0 30px ${data.color}40;
            animation: milestonePopIn 0.6s ease-out, milestonePopOut 0.5s ease-in 2.5s forwards;
            text-align: center;
            transform-origin: center;
        `;
        toast.textContent = data.text;
        
        this.milestoneContainer.appendChild(toast);
        this.triggerParticles('celebration');
        this.playSound('milestone');
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3500);
        
        this._injectMilestoneAnimations();
    }

    _injectMilestoneAnimations() {
        if (document.getElementById('ff-milestone-anim-style')) return;
        const style = document.createElement('style');
        style.id = 'ff-milestone-anim-style';
        style.textContent = `
            @keyframes milestonePopIn {
                0% { transform: scale(0.3); opacity: 0; }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); opacity: 1; }
            }
            @keyframes milestonePopOut {
                0% { transform: scale(1); opacity: 1; }
                100% { transform: scale(0.5); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Reset milestones (e.g., when content reloads)
     */
    resetMilestones() {
        this.milestoneShown.clear();
        if (this.milestoneContainer) {
            this.milestoneContainer.innerHTML = '';
        }
    }

    // ─── SOUND FEEDBACK ───

    _preloadSounds() {
        this.soundEnabled = true;
    }

    /**
     * Play a simple tone-based sound for state transitions
     * @param {string} type - 'focus' | 'feedback' | 'wakeup' | 'keyword' | 'distracted' | 'struggling' | 'recovering' | 'milestone'
     */
    playSound(type) {
        if (!this.soundEnabled) return;
        
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            let frequency = 440;
            let duration = 0.2;
            let gainValue = 0.1;
            
            // Map legacy sound names used in main.js to proper types
            switch (type) {
                case 'feedback':
                    // Generic positive feedback - gentle C major chord
                    frequency = 523; // C5
                    duration = 0.25;
                    gainValue = 0.07;
                    break;
                case 'wakeup':
                    // Wake-up alert - rising tone
                    frequency = 659; // E5
                    duration = 0.4;
                    gainValue = 0.1;
                    // Use frequency ramp for rising effect
                    osc.frequency.setValueAtTime(440, ctx.currentTime);
                    osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.3);
                    break;
                case 'keyword':
                    // Keyword notification - soft bell-like
                    frequency = 784; // G5
                    duration = 0.3;
                    gainValue = 0.06;
                    break;
                case 'focus':
                    frequency = 523; // C5
                    duration = 0.3;
                    gainValue = 0.08;
                    break;
                case 'distracted':
                    frequency = 330; // E4
                    duration = 0.25;
                    gainValue = 0.06;
                    break;
                case 'struggling':
                    frequency = 277; // C#4
                    duration = 0.35;
                    gainValue = 0.07;
                    break;
                case 'recovering':
                    frequency = 392; // G4
                    duration = 0.4;
                    gainValue = 0.08;
                    break;
                case 'milestone':
                    frequency = 659; // E5
                    duration = 0.5;
                    gainValue = 0.1;
                    break;
                default:
                    frequency = 440;
                    duration = 0.2;
                    gainValue = 0.08;
            }
            
            osc.type = 'sine';
            osc.frequency.value = frequency;
            gain.gain.setValueAtTime(gainValue, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
            
            // Cleanup
            osc.onended = () => ctx.close();
        } catch (e) {
            // Silently fail - audio is non-critical
        }
    }

    /**
     * Enable or disable sound
     */
    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = VisualEffects;
}
