/**
 * FocusFlow - Cognitive State Machine
 * 
 * CORE INNOVATION 🔥: Dynamic cognitive state modeling with 
 * probabilistic/rule-based state transitions.
 * 
 * States:
 *   - Normal: User is actively reading/working
 *   - Distracted: User has looked away or stopped interacting
 *   - Struggling: User is stuck on same content (long dwell, no scroll)
 *   - Recovering: User has just returned from distraction
 * 
 * Transitions are based on multi-modal feature fusion (not simple if-else)
 * 
 * HCI Final Project - Member A
 */

class StateMachine {
    constructor(config) {
        this.config = config;
        
        // State definitions
        this.STATES = {
            NORMAL: {
                name: 'Normal',
                color: '#4CAF50',
                icon: '🧠',
                description: 'Focused and reading'
            },
            DISTRACTED: {
                name: 'Distracted',
                color: '#FF9800',
                icon: '👀',
                description: 'Attention drifted away'
            },
            STRUGGLING: {
                name: 'Struggling',
                color: '#F44336',
                icon: '🤔',
                description: 'Having difficulty with content'
            },
            RECOVERING: {
                name: 'Recovering',
                color: '#2196F3',
                icon: '🔄',
                description: 'Returning to focus'
            }
        };
        
        // Current state
        this._currentState = this.STATES.NORMAL;
        this._previousState = null;
        this._stateStartTime = performance.now();
        this._stateDuration = 0;
        
        // State confidence (probability-like)
        this._stateProbabilities = {
            Normal: 0.8,
            Distracted: 0.05,
            Struggling: 0.1,
            Recovering: 0.05
        };
        
        // History
        this.stateHistory = [];
        this._maxHistoryLength = 1000;
        
        // Transition thresholds (will be adapted by DecisionLayer)
        this.thresholds = {
            distractionNoFace: 3000,      // 3s without face = distracted
            distractionNoInteraction: 5000, // 5s without interaction = distracted
            strugglingDwellTime: 8000,    // 8s on same region = struggling
            strugglingLowScroll: 0.5,     // Very low scroll velocity
            recoveringStableTime: 5000,   // 5s stable = back to normal
            normalTransitionCooldown: 2000 // Min time before state can change
        };
        
        // Feature smoothing
        this._featureHistory = [];
        this._historyMax = 5;
        
        // Debug
        this.debug = config.debug || false;
    }

    /**
     * Update state machine with new perception features
     * @param {Object} features - Multi-modal feature vector from PerceptionModule
     * @param {number} elapsedTime - Current time
     */
    update(features, elapsedTime) {
        if (!features) return;
        
        const now = performance.now();
        this._stateDuration = now - this._stateStartTime;
        
        // Store features for temporal analysis
        this._featureHistory.push(features);
        if (this._featureHistory.length > this._historyMax) {
            this._featureHistory.shift();
        }
        
        // Compute state probabilities based on current features
        const probs = this._computeStateProbabilities(features);
        this._stateProbabilities = probs;
        
        // Determine if we should transition
        const newState = this._decideTransition(probs, features);
        
        if (newState && newState !== this._currentState) {
            this._transitionTo(newState, features);
        }
        
        // Record history
        this.stateHistory.push({
            state: this._currentState.name,
            timestamp: now,
            duration: this._stateDuration,
            probabilities: { ...probs },
            features: {
                facePresent: features.facePresent,
                interactionActive: features.interactionActive,
                dwellTime: features.dwellTime,
                scrollVelocity: features.scrollVelocity
            }
        });
        
        // Trim history
        if (this.stateHistory.length > this._maxHistoryLength) {
            this.stateHistory = this.stateHistory.slice(-500);
        }
        
        if (this.debug) {
            this._debugLog(probs);
        }
    }

    /**
     * Compute probability distribution over all states
     * Based on multi-modal feature fusion (NOT simple if-else)
     * @param {Object} features
     * @returns {Object} Probability for each state
     */
    _computeStateProbabilities(features) {
        let pNormal = 0;
        let pDistracted = 0;
        let pStruggling = 0;
        let pRecovering = 0;
        
        // --- Evidence for NORMAL state ---
        const evidenceNormal = [];
        
        // Face present strongly suggests normal
        if (features.facePresent) {
            evidenceNormal.push(0.4);
        } else {
            evidenceNormal.push(-0.3);
        }
        
        // Active interaction suggests normal
        if (features.interactionActive) {
            evidenceNormal.push(0.3);
        } else {
            evidenceNormal.push(-0.2);
        }
        
        // Smooth reading rhythm
        if (features.scrollVelocity > 0 && features.scrollVelocity < 2.0) {
            evidenceNormal.push(0.2);
        }
        
        // Normal gaze dwell time (not too long, not too short)
        const dwellSeconds = features.dwellTime / 1000;
        if (dwellSeconds > 1 && dwellSeconds < 6) {
            evidenceNormal.push(0.1);
        }
        
        // Mouse reading pattern
        if (features.horizontalMovementRatio > 0.6) {
            evidenceNormal.push(0.1);
        }
        
        pNormal = this._softMax(evidenceNormal);
        
        // --- Evidence for DISTRACTED state ---
        const evidenceDistracted = [];
        
        // No face = very likely distracted
        if (!features.facePresent && features.faceAbsentDuration > 2000) {
            evidenceDistracted.push(0.5);
        }
        
        // No interaction for a while
        if (!features.interactionActive && !features.isMoving) {
            evidenceDistracted.push(0.4);
        }
        
        // High idle duration
        if (features.idleDuration > 3000) {
            evidenceDistracted.push(0.3);
        }
        
        // High attention dispersion (gaze jumping around)
        if (features.dispersion > 200) {
            evidenceDistracted.push(0.2);
        }
        
        pDistracted = this._softMax(evidenceDistracted);
        
        // --- Evidence for STRUGGLING state ---
        const evidenceStruggling = [];
        
        // Very long dwell time on same region
        if (dwellSeconds > 8) {
            evidenceStruggling.push(0.5);
        }
        
        // No scrolling despite face present
        if (features.facePresent && !features.isScrolling && features.scrollIdleDuration > 5000) {
            evidenceStruggling.push(0.3);
        }
        
        // Low scroll velocity + face present (user is staring but not progressing)
        if (features.facePresent && features.scrollVelocity < 0.5 && dwellSeconds > 5) {
            evidenceStruggling.push(0.2);
        }
        
        // High direction changes in mouse (searching behavior)
        if (features.directionChanges > 5 && !features.isReadingPattern) {
            evidenceStruggling.push(0.1);
        }
        
        pStruggling = this._softMax(evidenceStruggling);
        
        // --- Evidence for RECOVERING state ---
        const evidenceRecovering = [];
        
        // Face just returned after absence
        if (features.facePresent && this._currentState === this.STATES.DISTRACTED) {
            evidenceRecovering.push(0.4);
        }
        
        // Interaction just resumed
        if (features.interactionActive && this._wasInactiveBefore()) {
            evidenceRecovering.push(0.3);
        }
        
        // Scroll just resumed after pause
        if (features.isScrolling && this._wasPausedBefore()) {
            evidenceRecovering.push(0.2);
        }
        
        // Confidence bonus if we're in recovering state already
        if (this._currentState === this.STATES.RECOVERING) {
            evidenceRecovering.push(0.2);
        }
        
        pRecovering = this._softMax(evidenceRecovering);
        
        // Normalize to sum to 1.0
        const total = pNormal + pDistracted + pStruggling + pRecovering;
        if (total === 0) {
            return { Normal: 0.25, Distracted: 0.25, Struggling: 0.25, Recovering: 0.25 };
        }
        
        return {
            Normal: pNormal / total,
            Distracted: pDistracted / total,
            Struggling: pStruggling / total,
            Recovering: pRecovering / total
        };
    }

    /**
     * Softmax-like function to convert evidence to probability
     * @param {Array} evidence - Array of positive/negative evidence values
     * @returns {number} Probability (0-1)
     */
    _softMax(evidence) {
        if (evidence.length === 0) return 0.05;
        const sum = evidence.reduce((a, b) => a + b, 0);
        return 1 / (1 + Math.exp(-sum));
    }

    /**
     * Decide which state to transition to based on probabilities
     * @param {Object} probs - State probabilities
     * @param {Object} features - Current features
     * @returns {Object|null} New state or null if no change
     */
    _decideTransition(probs, features) {
        // Don't transition too frequently
        if (this._stateDuration < this.thresholds.normalTransitionCooldown) {
            return null;
        }
        
        const currentName = this._currentState.name;
        
        // Get the most probable state (but with hysteresis)
        let maxProb = 0;
        let maxState = currentName;
        
        for (const [state, prob] of Object.entries(probs)) {
            // Apply hysteresis - current state gets a bonus
            const adjustedProb = state === currentName ? prob * 1.3 : prob;
            if (adjustedProb > maxProb) {
                maxProb = adjustedProb;
                maxState = state;
            }
        }
        
        // Only transition if probability is high enough
        if (maxProb > 0.4 && maxState !== currentName) {
            return this.STATES[maxState];
        }
        
        return null;
    }

    /**
     * Execute state transition
     * @param {Object} newState - Target state
     * @param {Object} features - Current features
     */
    _transitionTo(newState, features) {
        const now = performance.now();
        this._previousState = this._currentState;
        this._currentState = newState;
        this._stateStartTime = now;
        this._stateDuration = 0;
        
        console.log(`[StateMachine] 🔄 ${this._previousState.name} → ${newState.name} (confidence: ${(this._stateProbabilities[newState.name] * 100).toFixed(0)}%)`);
        
        // Dispatch event for other modules
        const event = new CustomEvent('focusflow-state-change', {
            detail: {
                previousState: this._previousState,
                currentState: this._currentState,
                probabilities: this._stateProbabilities,
                timestamp: now,
                features: features
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Check if user was inactive before this update
     */
    _wasInactiveBefore() {
        if (this._featureHistory.length < 2) return false;
        const prev = this._featureHistory[this._featureHistory.length - 2];
        return prev && !prev.interactionActive;
    }

    /**
     * Check if user was paused before this update
     */
    _wasPausedBefore() {
        if (this._featureHistory.length < 2) return false;
        const prev = this._featureHistory[this._featureHistory.length - 2];
        return prev && prev.isPaused;
    }

    /**
     * Get current state
     * @returns {Object} Current state object
     */
    getState() {
        return {
            ...this._currentState,
            confidence: this._stateProbabilities[this._currentState.name],
            duration: this._stateDuration,
            startTime: this._stateStartTime,
            timestamp: performance.now()
        };
    }

    /**
     * Get state probabilities
     * @returns {Object}
     */
    getProbabilities() {
        return { ...this._stateProbabilities };
    }

    /**
     * Get recent state history
     * @param {number} [count=50] - Number of recent entries
     * @returns {Array}
     */
    getRecentHistory(count = 50) {
        return this.stateHistory.slice(-Math.min(count, this.stateHistory.length));
    }

    /**
     * Get time spent in current state
     * @returns {number} Milliseconds
     */
    getCurrentStateDuration() {
        return performance.now() - this._stateStartTime;
    }

    /**
     * Calculate the distribution of states over a time window
     * @param {number} [timeWindow=300000] - 5 minutes default
     * @returns {Object} Percentage of time in each state
     */
    getStateDistribution(timeWindow = 300000) {
        const cutoff = performance.now() - timeWindow;
        const relevant = this.stateHistory.filter(h => h.timestamp > cutoff);
        
        if (relevant.length === 0) return {};
        
        const counts = {};
        for (const entry of relevant) {
            counts[entry.state] = (counts[entry.state] || 0) + 1;
        }
        
        const total = relevant.length;
        const distribution = {};
        for (const [state, count] of Object.entries(counts)) {
            distribution[state] = (count / total * 100).toFixed(1) + '%';
        }
        
        return distribution;
    }

    /**
     * Update personalized thresholds (called by DecisionModule)
     * @param {Object} newThresholds
     */
    updateThresholds(newThresholds) {
        if (newThresholds.distractionNoFace) {
            this.thresholds.distractionNoFace = newThresholds.distractionNoFace;
        }
        if (newThresholds.distractionNoInteraction) {
            this.thresholds.distractionNoInteraction = newThresholds.distractionNoInteraction;
        }
        if (newThresholds.strugglingDwellTime) {
            this.thresholds.strugglingDwellTime = newThresholds.strugglingDwellTime;
        }
        if (newThresholds.recoveringStableTime) {
            this.thresholds.recoveringStableTime = newThresholds.recoveringStableTime;
        }
    }

    /**
     * Debug logging
     */
    _debugLog(probs) {
        console.log(`[StateMachine] ${this._currentState.icon} ${this._currentState.name} | ` +
            `N:${(probs.Normal * 100).toFixed(0)}% ` +
            `D:${(probs.Distracted * 100).toFixed(0)}% ` +
            `S:${(probs.Struggling * 100).toFixed(0)}% ` +
            `R:${(probs.Recovering * 100).toFixed(0)}% ` +
            `| duration: ${(this._stateDuration / 1000).toFixed(1)}s`
        );
    }

    /**
     * Reset state machine
     */
    reset() {
        this._currentState = this.STATES.NORMAL;
        this._previousState = null;
        this._stateStartTime = performance.now();
        this._stateDuration = 0;
        this._stateProbabilities = {
            Normal: 0.8,
            Distracted: 0.05,
            Struggling: 0.1,
            Recovering: 0.05
        };
        this.stateHistory = [];
        this._featureHistory = [];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateMachine;
}
