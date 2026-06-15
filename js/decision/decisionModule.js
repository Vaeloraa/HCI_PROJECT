/**
 * FocusFlow - Decision Module (Orchestrator)
 * 
 * Decision Layer: Integrates adaptive threshold learning and intervention
 * strategy selection to produce the final decision output.
 * 
 * Pipeline:
 *   1. Receive current state + features from Cognition Layer
 *   2. Update adaptive thresholds based on user behavior
 *   3. Select appropriate intervention strategy
 *   4. Return decision object to Interaction Layer
 * 
 * HCI Final Project - Member A
 */

class DecisionModule {
    constructor(config) {
        this.config = config;

        // Initialize sub-modules
        this.adaptiveThreshold = new AdaptiveThreshold(config);
        this.interventionStrategy = new InterventionStrategy(config);

        // Current decision state
        this.currentDecision = null;
        this.lastDecisionTime = 0;
        this.decisionHistory = [];

        // Strategy effectiveness tracking
        this._lastStrategyApplied = null;
        this._stateBeforeStrategy = null;

        this.debug = config.debug || false;
    }

    /**
     * Make a decision based on current cognitive state and features
     * @param {Object} state - Current cognitive state
     * @param {Object} features - Multi-modal perception features
     * @param {Object} userProfile - User's attention profile (from modeling layer)
     * @returns {Object} Decision object with strategy info
     */
    decide(state, features, userProfile) {
        const now = performance.now();

        // 1. Update adaptive thresholds with new data
        this.adaptiveThreshold.update(features, state);

        // 2. Get personalized thresholds
        const thresholds = this.adaptiveThreshold.getThresholds();

        // 3. Get user profile for personalized decision
        const profile = userProfile || this.adaptiveThreshold.getProfile();

        // 4. Resolve intervention strategy (always matches cognitive state)
        const strategy = this.interventionStrategy.resolve(state);

        // 5. Build decision object
        const decision = {
            strategy: strategy,
            thresholds: thresholds,
            state: {
                name: state.name,
                confidence: state.confidence,
                duration: state.duration
            },
            profile: {
                readingSpeed: profile.readingSpeed,
                distractionSensitivity: profile.distractionSensitivity,
                strugglingThreshold: profile.strugglingThreshold
            },
            timestamp: now,
            escalationLevel: strategy.tier || 'low'
        };

        this.currentDecision = decision;
        this.lastDecisionTime = now;

        // Track for effectiveness evaluation
        this._trackStrategyEffectiveness(state, strategy);

        // Record history
        this.decisionHistory.push({
            state: state.name,
            strategy: strategy.name,
            timestamp: now
        });
        if (this.decisionHistory.length > 200) {
            this.decisionHistory = this.decisionHistory.slice(-100);
        }

        if (this.debug && strategy.id !== 'none') {
            console.log(`[DecisionModule] 🎯 ${state.name} → ${strategy.name} (intensity: ${strategy.intensity})`);
        }

        return decision;
    }

    /**
     * Track strategy effectiveness by observing state changes
     * @param {Object} state
     * @param {Object} strategy
     */
    _trackStrategyEffectiveness(state, strategy) {
        // If we applied a strategy and now state improved, mark as effective
        if (this._lastStrategyApplied && strategy.id === 'none') {
            const improved = this._isStateImproved(this._stateBeforeStrategy, state);
            if (improved) {
                this.interventionStrategy.markEffective(this._lastStrategyApplied.id);
            } else {
                this.interventionStrategy.markIneffective(this._lastStrategyApplied.id);
            }
            this._lastStrategyApplied = null;
            this._stateBeforeStrategy = null;
        }

        // If we're applying a new strategy, remember the state before
        if (strategy.id !== 'none') {
            this._lastStrategyApplied = strategy;
            this._stateBeforeStrategy = state;
        }
    }

    /**
     * Check if state has improved (e.g., from Distracted to Normal)
     * @param {Object} before
     * @param {Object} after
     * @returns {boolean}
     */
    _isStateImproved(before, after) {
        if (!before) return false;
        
        const stateRank = {
            'Distracted': 0,
            'Struggling': 1,
            'Normal': 2
        };

        const beforeRank = stateRank[before.name] || 0;
        const afterRank = stateRank[after.name] || 0;

        return afterRank > beforeRank;
    }

    /**
     * Get current escalation level
     * @returns {string}
     */
    _getEscalationLevel() {
        // Extract from intervention strategy's internal state
        if (this.interventionStrategy._escalationLevel) {
            return this.interventionStrategy._escalationLevel;
        }
        return 'low';
    }

    /**
     * Get current decision
     * @returns {Object|null}
     */
    getCurrentDecision() {
        return this.currentDecision;
    }

    /**
     * Get decision history
     * @param {number} [count=20] - Number of recent decisions
     * @returns {Array}
     */
    getDecisionHistory(count = 20) {
        return this.decisionHistory.slice(-Math.min(count, this.decisionHistory.length));
    }

    /**
     * Get user profile from adaptive threshold module
     * @returns {Object}
     */
    getUserProfile() {
        return this.adaptiveThreshold.getProfile();
    }

    /**
     * Get strategy effectiveness stats
     * @returns {Object}
     */
    getStrategyEffectiveness() {
        return this.interventionStrategy.getEffectivenessStats();
    }

    /**
     * Reset decision module
     */
    reset() {
        this.adaptiveThreshold.reset();
        this.interventionStrategy.reset();
        this.currentDecision = null;
        this.lastDecisionTime = 0;
        this.decisionHistory = [];
        this._lastStrategyApplied = null;
        this._stateBeforeStrategy = null;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DecisionModule;
}
