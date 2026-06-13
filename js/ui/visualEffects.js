/**
 * FocusFlow - Visual Effects Module
 * 
 * UI Layer: Manages all adaptive visual effects and interventions:
 *   1. Dynamic row highlighting (current reading line)
 *   2. Peripheral dimming / tunnel vision effect
 *   3. Off-screen wake-up visual cues (pulsing border)
 *   4. Keyword popup / floating prompt animations
 *   5. Progress indicator and positive feedback
 * 
 * All effects are designed to be GENTLE and LOW-STIMULUS for ADHD users.
 * 
 * HCI Final Project - Member B (Frontend & Adaptive UI)
 */

class VisualEffects {
    constructor(config) {
        this.config = config;
        
        // Effect state
        this.activeEffects = new Set();
        this._highlightOverlay = null;
        this._dimOverlay = null;
        this._wakeUpOverlay = null;
        this._keywordPopup = null;
        this._promptEl = null;
        this._progressEl = null;
        this._feedbackEl = null;
        
        // Current highlight target
        this._currentHighlightEl = null;
        this._highlightIntensity = 0.15; // Subtle by default
        
        // Dim state
        this._dimLevel = 0; // 0-1
        this._targetDimLevel = 0;
        this._dimAnimationId = null;
        
        // Cooldown tracking
        this._lastWakeUpTime = 0;
        this._lastKeywordTime = 0;
        this._lastFeedbackTime = 0;
        this._cooldownWakeUp = 15000;
        this._cooldownKeyword = 8000;
        this._cooldownFeedback = 10000;
        
        // Initialize overlay elements
        this._buildOverlays();
        this._buildKeywordPopup();
        this._buildPrompt();
        this._buildProgressIndicator();
        this._buildFeedbackElement();
    }

    /**
     * Build the persistent overlay elements for dimming and highlighting
     */
    _buildOverlays() {
        // Dim overlay - covers the entire viewport
        this._dimOverlay = document.createElement('div');
        this._dimOverlay.id = 'ff-dim-overlay';
        this._dimOverlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0);
            pointer-events: none;
            z-index: 1000;
            transition: background 0.8s ease;
        `;
        document.body.appendChild(this._dimOverlay);

        // Wake-up border overlay
        this._wakeUpOverlay = document.createElement('div');
        this._wakeUpOverlay.id = 'ff-wakeup-overlay';
        this._wakeUpOverlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            pointer-events: none;
            z-index: 999;
            opacity: 0;
            border: 4px solid rgba(100, 180, 255, 0);
            box-shadow: inset 0 0 60px rgba(100, 180, 255, 0);
            transition: all 0.6s ease;
        `;
        document.body.appendChild(this._wakeUpOverlay);
    }

    /**
     * Build the keyword popup element
     */
    _buildKeywordPopup() {
        this._keywordPopup = document.createElement('div');
        this._keywordPopup.id = 'ff-keyword-popup';
        this._keywordPopup.style.cssText = `
            position: fixed;
            bottom: 40px;
            right: 40px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(12px);
            border-radius: 16px;
            padding: 20px 24px;
            max-width: 300px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.12);
            border: 1px solid rgba(0,0,0,0.06);
            z-index: 1001;
            opacity: 0;
            transform: translateY(20px) scale(0.95);
            transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            pointer-events: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        this._keywordPopup.innerHTML = `
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 10px;">
                📌 Key Terms
            </div>
            <div id="ff-keywords-container" style="display: flex; flex-wrap: wrap; gap: 8px;"></div>
        `;
        document.body.appendChild(this._keywordPopup);
    }

    /**
     * Build floating prompt element
     */
    _buildPrompt() {
        this._promptEl = document.createElement('div');
        this._promptEl.id = 'ff-float-prompt';
        this._promptEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.9);
            background: rgba(255, 255, 255, 0.92);
            backdrop-filter: blur(16px);
            border-radius: 20px;
            padding: 28px 36px;
            text-align: center;
            box-shadow: 0 12px 48px rgba(0,0,0,0.15);
            border: 1px solid rgba(0,0,0,0.06);
            z-index: 1002;
            opacity: 0;
            pointer-events: none;
            transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 380px;
        `;
        this._promptEl.innerHTML = `
            <div id="ff-prompt-icon" style="font-size: 36px; margin-bottom: 12px;">👋</div>
            <div id="ff-prompt-text" style="font-size: 18px; font-weight: 500; color: #333; line-height: 1.5;"></div>
            <div id="ff-prompt-sub" style="font-size: 14px; color: #888; margin-top: 8px;"></div>
        `;
        document.body.appendChild(this._promptEl);
    }

    /**
     * Build progress indicator
     */
    _buildProgressIndicator() {
        this._progressEl = document.createElement('div');
        this._progressEl.id = 'ff-progress-indicator';
        this._progressEl.style.cssText = `
            position: fixed;
            bottom: 40px;
            left: 40px;
            z-index: 1001;
            opacity: 0;
            transition: opacity 0.5s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        this._progressEl.innerHTML = `
            <div style="background: rgba(255,255,255,0.9); backdrop-filter: blur(8px); 
                        border-radius: 12px; padding: 14px 18px;
                        box-shadow: 0 4px 16px rgba(0,0,0,0.08);
                        border: 1px solid rgba(0,0,0,0.04);">
                <div style="font-size: 12px; color: #888; margin-bottom: 6px;">Reading Progress</div>
                <div style="width: 160px; height: 4px; background: #e8e8e8; border-radius: 2px; overflow: hidden;">
                    <div id="ff-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #6B9FFF, #8B6FFF); border-radius: 2px; transition: width 0.5s ease;"></div>
                </div>
                <div id="ff-progress-text" style="font-size: 11px; color: #aaa; margin-top: 4px; text-align: right;">0%</div>
            </div>
        `;
        document.body.appendChild(this._progressEl);
    }

    /**
     * Build positive feedback element
     */
    _buildFeedbackElement() {
        this._feedbackEl = document.createElement('div');
        this._feedbackEl.id = 'ff-positive-feedback';
        this._feedbackEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.8);
            background: rgba(255, 255, 255, 0.93);
            backdrop-filter: blur(16px);
            border-radius: 24px;
            padding: 32px 40px;
            text-align: center;
            box-shadow: 0 16px 56px rgba(0,0,0,0.12);
            border: 1px solid rgba(0,0,0,0.04);
            z-index: 1002;
            opacity: 0;
            pointer-events: none;
            transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        this._feedbackEl.innerHTML = `
            <div style="font-size: 42px; margin-bottom: 10px;">🌟</div>
            <div style="font-size: 22px; font-weight: 600; color: #333; margin-bottom: 6px;">Great to see you back!</div>
            <div style="font-size: 14px; color: #888;">You're making good progress. Keep going!</div>
        `;
        document.body.appendChild(this._feedbackEl);
    }

    // ==================== PUBLIC API ====================

    /**
     * Set the dim level of the peripheral overlay
     * @param {number} level - 0 to 1 (0 = no dim, 1 = fully dimmed)
     */
    setDimLevel(level) {
        this._targetDimLevel = Math.max(0, Math.min(1, level));
        this._animateDim();
    }

    /**
     * Animate dim level smoothly
     */
    _animateDim() {
        if (this._dimAnimationId) {
            cancelAnimationFrame(this._dimAnimationId);
        }
        
        const animate = () => {
            const diff = this._targetDimLevel - this._dimLevel;
            if (Math.abs(diff) < 0.01) {
                this._dimLevel = this._targetDimLevel;
                this._applyDim();
                return;
            }
            this._dimLevel += diff * 0.08;
            this._applyDim();
            this._dimAnimationId = requestAnimationFrame(animate);
        };
        animate();
    }

    /**
     * Apply current dim level to the overlay
     */
    _applyDim() {
        const alpha = this._dimLevel * 0.55;
        this._dimOverlay.style.background = `rgba(0, 0, 0, ${alpha})`;
    }

    /**
     * Highlight a specific paragraph element
     * @param {Element} element - The DOM element to highlight
     * @param {number} intensity - Highlight strength 0-1
     */
    highlightElement(element, intensity = 0.15) {
        // Remove previous highlight
        if (this._currentHighlightEl && this._currentHighlightEl !== element) {
            this._currentHighlightEl.style.removeProperty('background');
            this._currentHighlightEl.style.removeProperty('box-shadow');
            this._currentHighlightEl.style.removeProperty('border-radius');
        }

        if (element && element !== this._currentHighlightEl) {
            this._currentHighlightEl = element;
            const alpha = intensity;
            element.style.background = `rgba(107, 159, 255, ${alpha})`;
            element.style.boxShadow = `0 0 20px rgba(107, 159, 255, ${alpha * 0.5})`;
            element.style.borderRadius = '4px';
        }
    }

    /**
     * Clear the current highlight
     */
    clearHighlight() {
        if (this._currentHighlightEl) {
            this._currentHighlightEl.style.removeProperty('background');
            this._currentHighlightEl.style.removeProperty('box-shadow');
            this._currentHighlightEl.style.removeProperty('border-radius');
            this._currentHighlightEl = null;
        }
    }

    /**
     * Show wake-up visual cue (pulsing border + subtle glow)
     */
    showWakeUpCue() {
        const now = Date.now();
        if (now - this._lastWakeUpTime < this._cooldownWakeUp) return;
        this._lastWakeUpTime = now;

        this._wakeUpOverlay.style.opacity = '1';
        this._wakeUpOverlay.style.borderColor = 'rgba(100, 180, 255, 0.3)';
        this._wakeUpOverlay.style.boxShadow = 'inset 0 0 60px rgba(100, 180, 255, 0.08)';

        // Gentle pulse animation
        let pulseCount = 0;
        const pulse = () => {
            pulseCount++;
            const opacity = 0.3 + Math.sin(pulseCount * 0.3) * 0.2;
            this._wakeUpOverlay.style.borderColor = `rgba(100, 180, 255, ${opacity})`;
            
            if (pulseCount < 30) {
                requestAnimationFrame(pulse);
            } else {
                this._wakeUpOverlay.style.opacity = '0';
                this._wakeUpOverlay.style.borderColor = 'rgba(100, 180, 255, 0)';
                this._wakeUpOverlay.style.boxShadow = 'inset 0 0 60px rgba(100, 180, 255, 0)';
            }
        };
        pulse();
    }

    /**
     * Show keyword popup with extracted keywords
     * @param {Array} keywords - Array of { word, score } objects
     */
    showKeywords(keywords) {
        const now = Date.now();
        if (now - this._lastKeywordTime < this._cooldownKeyword) return;
        this._lastKeywordTime = now;

        const container = document.getElementById('ff-keywords-container');
        if (!container) return;

        container.innerHTML = '';
        for (const kw of keywords.slice(0, 6)) {
            const badge = document.createElement('span');
            badge.style.cssText = `
                display: inline-block;
                padding: 5px 12px;
                background: linear-gradient(135deg, #EBF0FF, #F0EBFF);
                color: #555;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 500;
                transition: all 0.2s;
            `;
            badge.textContent = kw.word;
            container.appendChild(badge);
        }

        // Animate in
        this._keywordPopup.style.opacity = '1';
        this._keywordPopup.style.transform = 'translateY(0) scale(1)';

        // Auto-dismiss after 6s
        setTimeout(() => {
            this._keywordPopup.style.opacity = '0';
            this._keywordPopup.style.transform = 'translateY(20px) scale(0.95)';
        }, 6000);
    }

    /**
     * Show a gentle floating prompt
     * @param {string} icon - Emoji icon
     * @param {string} text - Main prompt text
     * @param {string} subtitle - Optional subtitle
     */
    showPrompt(icon, text, subtitle = '') {
        const iconEl = document.getElementById('ff-prompt-icon');
        const textEl = document.getElementById('ff-prompt-text');
        const subEl = document.getElementById('ff-prompt-sub');
        
        if (iconEl) iconEl.textContent = icon || '👋';
        if (textEl) textEl.textContent = text || '';
        if (subEl) subEl.textContent = subtitle || '';

        this._promptEl.style.opacity = '1';
        this._promptEl.style.transform = 'translate(-50%, -50%) scale(1)';
        this._promptEl.style.pointerEvents = 'auto';

        setTimeout(() => {
            this._promptEl.style.opacity = '0';
            this._promptEl.style.transform = 'translate(-50%, -50%) scale(0.9)';
            this._promptEl.style.pointerEvents = 'none';
        }, 4000);
    }

    /**
     * Update reading progress indicator
     * @param {number} progress - 0 to 1
     */
    updateProgress(progress) {
        const bar = document.getElementById('ff-progress-bar');
        const text = document.getElementById('ff-progress-text');
        if (bar) bar.style.width = `${Math.round(progress * 100)}%`;
        if (text) text.textContent = `${Math.round(progress * 100)}%`;
        
        // Show on first progress
        if (progress > 0.01) {
            this._progressEl.style.opacity = '1';
        }
    }

    /**
     * Show positive feedback animation (for recovery state)
     */
    showPositiveFeedback() {
        const now = Date.now();
        if (now - this._lastFeedbackTime < this._cooldownFeedback) return;
        this._lastFeedbackTime = now;

        this._feedbackEl.style.opacity = '1';
        this._feedbackEl.style.transform = 'translate(-50%, -50%) scale(1)';

        setTimeout(() => {
            this._feedbackEl.style.opacity = '0';
            this._feedbackEl.style.transform = 'translate(-50%, -50%) scale(0.8)';
        }, 3500);
    }

    /**
     * Play a gentle notification sound
     * @param {string} type - 'wakeup' | 'feedback' | 'keyword'
     */
    playSound(type = 'wakeup') {
        // Use Web Audio API to generate gentle tones (no external files needed)
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            if (type === 'wakeup') {
                oscillator.frequency.value = 440;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.6);
            } else if (type === 'feedback') {
                oscillator.frequency.value = 523;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.06, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.4);
            } else if (type === 'keyword') {
                oscillator.frequency.value = 392;
                oscillator.type = 'triangle';
                gainNode.gain.setValueAtTime(0.04, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.5);
            }
        } catch (e) {
            // Audio not available - fail silently
        }
    }

    /**
     * Reset all visual effects
     */
    reset() {
        this.setDimLevel(0);
        this.clearHighlight();
        
        this._keywordPopup.style.opacity = '0';
        this._keywordPopup.style.transform = 'translateY(20px) scale(0.95)';
        this._promptEl.style.opacity = '0';
        this._promptEl.style.transform = 'translate(-50%, -50%) scale(0.9)';
        this._feedbackEl.style.opacity = '0';
        this._feedbackEl.style.transform = 'translate(-50%, -50%) scale(0.8)';
        this._progressEl.style.opacity = '0';
        this._wakeUpOverlay.style.opacity = '0';
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = VisualEffects;
}
