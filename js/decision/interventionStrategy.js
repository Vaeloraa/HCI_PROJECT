/**
 * FocusFlow - Intervention Strategy Selection Module
 * 
 * Decision Layer: Selects appropriate intervention strategies based on
 * cognitive state, severity level, and user profile.
 * 
 * Strategy selection logic:
 *   - Distracted (mild) → Visual weak prompt (subtle overlay)
 *   - Distracted (severe) → Sound alert + strong visual cue
 *   - Struggling (mild) → Keyword highlighting
 *   - Struggling (severe) → Summary panel + simplification
 *   - Recovering → Positive reinforcement + progress indication
 * 
 * HCI Final Project - Member A
 */

class InterventionStrategy {
    constructor(config) {
        this.config = config;

        // Strategy definitions
        this.STRATEGIES = {
            // ---- Distraction strategies ----
            SUBTLE_OVERLAY: {
                id: 'subtle_overlay',
                name: 'Subtle Focus Overlay',
                type: 'visual',
                intensity: 0.3,        // 0-1
                duration: 3000,        // ms
                cooldown: 15000,       // ms before can be used again
                description: 'Semi-transparent overlay to guide attention back'
            },
            FLOATING_PROMPT: {
                id: 'floating_prompt',
                name: 'Floating Prompt',
                type: 'visual',
                intensity: 0.5,
                duration: 4000,
                cooldown: 20000,
                description: 'Floating message asking to refocus'
            },
            SOUND_ALERT: {
                id: 'sound_alert',
                name: 'Sound Alert',
                type: 'audio',
                intensity: 0.8,
                duration: 2000,
                cooldown: 30000,
                description: 'Soft chime to draw attention back'
            },

            // ---- Struggling strategies ----
            KEYWORD_HIGHLIGHT: {
                id: 'keyword_highlight',
                name: 'Keyword Highlight',
                type: 'visual',
                intensity: 0.3,
                duration: 5000,
                cooldown: 20000,
                description: 'Highlight key terms in the content'
            },
            SUMMARY_PANEL: {
                id: 'summary_panel',
                name: 'Summary Panel',
                type: 'visual',
                intensity: 0.6,
                duration: 10000,
                cooldown: 30000,
                description: 'Show a brief summary of current section'
            },
            SIMPLIFICATION: {
                id: 'simplification',
                name: 'Content Simplification',
                type: 'visual',
                intensity: 0.8,
                duration: 15000,
                cooldown: 60000,
                description: 'Display simplified version of complex content'
            },

            // ---- Recovery strategies ----
            PROGRESS_INDICATOR: {
                id: 'progress_indicator',
                name: 'Progress Indicator',
                type: 'visual',
                intensity: 0.2,
                duration: 3000,
                cooldown: 10000,
                description: 'Show reading progress to encourage continuation'
            },
            POSITIVE_FEEDBACK: {
                id: 'positive_feedback',
                name: 'Positive Feedback',
                type: 'visual',
                intensity: 0.3,
                duration: 3000,
                cooldown: 20000,
                description: 'Display encouraging message for returning focus'
            }
        };

        // Track recently used strategies (for cooldown)
        this._recentlyUsed = {};
        this._lastStrategyTime = 0;
        this._minIntervalBetweenStrategies = 4000; // Minimum 4s between any strategies

        // Escalation tracking
        this._consecutiveSameState = 0;
        this._lastStateName = null;
        this._escalationLevel = 'low'; // 'low', 'medium', 'high'

        // User's strategy effectiveness history (for adaptation)
        this.strategyEffectiveness = {};
        for (const key of Object.keys(this.STRATEGIES)) {
            this.strategyEffectiveness[key] = {
                uses: 0,
                effectiveCount: 0,
                effectiveness: 0.5 // Start neutral
            };
        }

        this.debug = config.debug || false;
    }

    /**
     * Select the best intervention strategy for current state
     * @param {Object} state - Current cognitive state {name, confidence, duration}
     * @param {Object} features - Current perception features
     * @param {Object} userProfile - User's attention profile
     * @returns {Object} Selected strategy {id, name, type, intensity, duration, ...}
     */
    select(state, features, userProfile) {
        const now = performance.now();

        // Don't intervene too frequently
        if (now - this._lastStrategyTime < this._minIntervalBetweenStrategies) {
            return this._createNullStrategy();
        }

        // Track consecutive same state for escalation
        if (state.name === this._lastStateName) {
            this._consecutiveSameState++;
        } else {
            this._consecutiveSameState = 1;
            this._lastStateName = state.name;
        }

        // Determine escalation level
        this._updateEscalationLevel(state);

        // Select strategy based on state + escalation
        let strategy = null;

        switch (state.name) {
            case 'Distracted':
                strategy = this._selectDistractionStrategy(state, features, userProfile);
                break;
            case 'Struggling':
                strategy = this._selectStrugglingStrategy(state, features, userProfile);
                break;
            case 'Recovering':
                strategy = this._selectRecoveryStrategy(state, features, userProfile);
                break;
            case 'Normal':
            default:
                // No intervention needed for normal state
                return this._createNullStrategy();
        }

        // Apply cooldown check
        if (strategy && strategy.id) {
            const lastUsed = this._recentlyUsed[strategy.id] || 0;
            if (now - lastUsed < (strategy.cooldown || 30000)) {
                // Try a different strategy of similar type
                strategy = this._findAlternativeStrategy(strategy, state);
            }
        }

        if (strategy) {
            this._lastStrategyTime = now;
            this._recentlyUsed[strategy.id] = now;
            
            if (this.debug) {
                console.log(`[Intervention] 🎯 Selected: ${strategy.name} (${this._escalationLevel})`);
            }
        }

        return strategy || this._createNullStrategy();
    }

    /**
     * Select strategy for Distracted state
     */
    _selectDistractionStrategy(state, features, userProfile) {
        const severity = this._getSeverity(state, features);

        // Check if user recently returned (might be sensitive to strong alerts)
        const userDistractionSensitivity = userProfile?.distractionSensitivity || 0.5;
        const adjustedSeverity = severity * (1 + (userDistractionSensitivity - 0.5));

        if (adjustedSeverity < 0.4) {
            // Mild distraction → subtle overlay
            return this._getAvailableStrategy('SUBTLE_OVERLAY');
        } else if (adjustedSeverity < 0.7) {
            // Moderate distraction → floating prompt
            return this._getAvailableStrategy('FLOATING_PROMPT');
        } else {
            // Severe distraction → sound alert
            return this._getAvailableStrategy('SOUND_ALERT');
        }
    }

    /**
     * Select strategy for Struggling state
     */
    _selectStrugglingStrategy(state, features, userProfile) {
        const severity = this._getSeverity(state, features);

        if (severity < 0.4) {
            // Mild struggling → keyword highlight
            return this._getAvailableStrategy('KEYWORD_HIGHLIGHT');
        } else if (severity < 0.7) {
            // Moderate struggling → summary panel
            return this._getAvailableStrategy('SUMMARY_PANEL');
        } else {
            // Severe struggling → content simplification
            return this._getAvailableStrategy('SIMPLIFICATION');
        }
    }

    /**
     * Select strategy for Recovering state
     */
    _selectRecoveryStrategy(state, features, userProfile) {
        const severity = this._getSeverity(state, features);

        if (severity < 0.5) {
            // Just returning → progress indicator
            return this._getAvailableStrategy('PROGRESS_INDICATOR');
        } else {
            // After longer absence → positive feedback
            return this._getAvailableStrategy('POSITIVE_FEEDBACK');
        }
    }

    /**
     * Calculate severity of the current situation (0-1)
     */
    _getSeverity(state, features) {
        let severity = 0;

        // Factor 1: State confidence (higher confidence = more certain = potentially more severe)
        severity += state.confidence * 0.3;

        // Factor 2: State duration (longer in bad state = more severe)
        const durationSeconds = (state.duration || 0) / 1000;
        severity += Math.min(0.4, durationSeconds / 30 * 0.4);

        // Factor 3: Escalation level
        switch (this._escalationLevel) {
            case 'low': severity += 0.05; break;
            case 'medium': severity += 0.15; break;
            case 'high': severity += 0.3; break;
        }

        // Factor 4: Feature-based severity
        if (state.name === 'Distracted') {
            // Longer face absence = more severe
            if (features.faceAbsentDuration > 10000) severity += 0.2;
            else if (features.faceAbsentDuration > 5000) severity += 0.1;
        } else if (state.name === 'Struggling') {
            // Longer dwell + less scroll = more severe
            if (features.dwellTime > 15000) severity += 0.2;
            else if (features.dwellTime > 10000) severity += 0.1;
        }

        return Math.min(1, severity);
    }

    /**
     * Update escalation level based on consecutive same-state occurrences
     */
    _updateEscalationLevel(state) {
        if (state.name === 'Normal' || state.name === 'Recovering') {
            this._escalationLevel = 'low';
            return;
        }

        if (this._consecutiveSameState >= 5) {
            this._escalationLevel = 'high';
        } else if (this._consecutiveSameState >= 3) {
            this._escalationLevel = 'medium';
        } else {
            this._escalationLevel = 'low';
        }
    }

    /**
     * Get a strategy if not on cooldown
     * @param {string} key - Strategy key in STRATEGIES
     * @returns {Object|null}
     */
    _getAvailableStrategy(key) {
        const strategy = this.STRATEGIES[key];
        if (!strategy) return null;

        const now = performance.now();
        const lastUsed = this._recentlyUsed[strategy.id] || 0;

        if (now - lastUsed < strategy.cooldown) {
            return null; // On cooldown
        }

        return { ...strategy, stateKey: key };
    }

    /**
     * Find an alternative strategy when primary is on cooldown
     */
    _findAlternativeStrategy(currentStrategy, state) {
        // Get all strategies of the same type
        const alternatives = Object.values(this.STRATEGIES)
            .filter(s => s.type === currentStrategy.type && s.id !== currentStrategy.id);

        // Return the first available alternative
        for (const alt of alternatives) {
            const now = performance.now();
            const lastUsed = this._recentlyUsed[alt.id] || 0;
            if (now - lastUsed > alt.cooldown) {
                return { ...alt, stateKey: this._findKeyForStrategy(alt) };
            }
        }

        // If no visual alternative, try audio
        if (currentStrategy.type === 'visual') {
            const audioAlt = Object.values(this.STRATEGIES)
                .find(s => s.type === 'audio');
            if (audioAlt) {
                const now = performance.now();
                const lastUsed = this._recentlyUsed[audioAlt.id] || 0;
                if (now - lastUsed > audioAlt.cooldown) {
                    return { ...audioAlt, stateKey: this._findKeyForStrategy(audioAlt) };
                }
            }
        }

        return null;
    }

    /**
     * Find the key in STRATEGIES for a strategy object
     */
    _findKeyForStrategy(strategy) {
        for (const [key, value] of Object.entries(this.STRATEGIES)) {
            if (value.id === strategy.id) return key;
        }
        return null;
    }

    /**
     * Mark a strategy as effective (for learning)
     * @param {string} strategyId
     */
    markEffective(strategyId) {
        for (const key of Object.keys(this.strategyEffectiveness)) {
            if (this.STRATEGIES[key]?.id === strategyId) {
                this.strategyEffectiveness[key].uses++;
                this.strategyEffectiveness[key].effectiveCount++;
                this.strategyEffectiveness[key].effectiveness = 
                    this.strategyEffectiveness[key].effectiveCount / 
                    this.strategyEffectiveness[key].uses;
                break;
            }
        }
    }

    /**
     * Mark a strategy as ineffective (for learning)
     * @param {string} strategyId
     */
    markIneffective(strategyId) {
        for (const key of Object.keys(this.strategyEffectiveness)) {
            if (this.STRATEGIES[key]?.id === strategyId) {
                this.strategyEffectiveness[key].uses++;
                this.strategyEffectiveness[key].effectiveness = 
                    this.strategyEffectiveness[key].effectiveCount / 
                    Math.max(1, this.strategyEffectiveness[key].uses);
                break;
            }
        }
    }

    /**
     * Create a null/empty strategy (no intervention)
     * @returns {Object}
     */
    _createNullStrategy() {
        return {
            id: 'none',
            name: 'No Intervention',
            type: 'none',
            intensity: 0,
            duration: 0,
            description: 'No action needed'
        };
    }

    /**
     * Get strategy effectiveness stats
     * @returns {Object}
     */
    getEffectivenessStats() {
        return { ...this.strategyEffectiveness };
    }

    /**
     * Reset strategy state
     */
    reset() {
        this._recentlyUsed = {};
        this._lastStrategyTime = 0;
        this._consecutiveSameState = 0;
        this._lastStateName = null;
        this._escalationLevel = 'low';
        
        for (const key of Object.keys(this.strategyEffectiveness)) {
            this.strategyEffectiveness[key] = {
                uses: 0,
                effectiveCount: 0,
                effectiveness: 0.5
            };
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = InterventionStrategy;
}
