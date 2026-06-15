/**
 * FocusFlow - Cognitive State Machine
 *
 * Context-aware reading states (priority-ordered rules):
 *   - Distracted:  Leaving reading area overrides Struggling; face/gaze idle rules
 *   - Struggling:  On a paragraph in reading area, long dwell, no scroll
 *   - Normal:      Pointer/gaze on reading content, engaged or quietly reading
 *   - Idle:        All remaining cases
 *
 * HCI Final Project - Member A
 */

class StateMachine {
    constructor(config) {
        this.config = config;

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
            IDLE: {
                name: 'Idle',
                color: '#94a3b8',
                icon: '⏳',
                description: 'Intermediate state, waiting'
            }
        };

        this._currentState = this.STATES.NORMAL;
        this._previousState = null;
        this._stateStartTime = performance.now();
        this._stateDuration = 0;
        this._strugglingBlockIndex = -1;

        this.stateHistory = [];
        this._maxHistoryLength = 1000;

        this.thresholds = {
            distractionNoFace: 3000,
            distractionLeaveReadingMouse: 4000,
            distractionLeaveReadingGaze: 8000,
            distractionGazeScatter: 280,
            distractionGazeScatterTime: 3000,
            strugglingDwellTime: 8000,
            normalTransitionCooldown: 2500,
            quietReadMin: 1500
        };

        this.version = '3.8-paragraph-dwell-reset';

        this._featureHistory = [];
        this._historyMax = 8;
        this.debug = config.debug || false;
    }

    update(features, elapsedTime) {
        if (!features) return;

        const now = performance.now();
        this._stateDuration = now - this._stateStartTime;

        this._featureHistory.push(features);
        if (this._featureHistory.length > this._historyMax) {
            this._featureHistory.shift();
        }

        const newState = this._decideTransition(features);
        if (newState && newState !== this._currentState) {
            this._transitionTo(newState, features);
        }

        this.stateHistory.push({
            state: this._currentState.name,
            timestamp: now,
            duration: this._stateDuration,
            features: {
                onReadingContent: features.onReadingContent,
                pointerInReadingPanel: features.pointerInReadingPanel,
                interactionActive: features.interactionActive,
                dwellTime: features.dwellTime,
                idleDuration: features.idleDuration,
                scrollIdleDuration: features.scrollIdleDuration
            }
        });

        if (this.stateHistory.length > this._maxHistoryLength) {
            this.stateHistory = this.stateHistory.slice(-500);
        }

        if (this.debug) {
            this._debugLog();
        }
    }

    /**
     * Derive reading-context signals used by state rules.
     */
    _isGazeMode(features) {
        if (features.faceTracking === true) return true;
        return this.config && this.config.trackingMode === 'gaze';
    }

    _readingSignals(features) {
        const T = this.thresholds;
        const gazeMode = this._isGazeMode(features);
        const onRead = features.onReadingContent === true;
        const inPanel = features.pointerInReadingPanel === true;
        const idle = features.idleDuration || 0;
        const dwell = features.paragraphDwellTime ?? features.dwellTime ?? 0;
        const scrollIdle = features.scrollIdleDuration || 0;
        const moving = !!features.isMoving;
        const scrolling = !!features.isScrolling;
        const facePresent = features.facePresent === true;
        const recentlyActive = moving || scrolling || idle < 5000;

        const stuckOnParagraph = inPanel && onRead &&
            dwell >= T.strugglingDwellTime &&
            !scrolling;

        const leaveThreshold = gazeMode
            ? T.distractionLeaveReadingGaze
            : T.distractionLeaveReadingMouse;
        const outsideDur = features.outsidePanelDuration || 0;
        const leftReadingArea = !inPanel &&
            (outsideDur >= leaveThreshold || idle >= leaveThreshold);

        const faceAbsent = gazeMode &&
            !facePresent &&
            (features.faceAbsentDuration || 0) >= T.distractionNoFace;

        const gazeScattered = gazeMode &&
            (features.dispersion || 0) > T.distractionGazeScatter &&
            !inPanel &&
            idle >= T.distractionGazeScatterTime;

        const clearlyDistracted = gazeMode
            ? (faceAbsent || leftReadingArea || gazeScattered)
            : leftReadingArea;

        const engagedOnContent = inPanel && onRead && (!gazeMode || facePresent);

        const quietlyReading = engagedOnContent &&
            dwell >= T.quietReadMin &&
            dwell < T.strugglingDwellTime &&
            !clearlyDistracted;

        const activelyReading = engagedOnContent &&
            (recentlyActive || quietlyReading) &&
            !stuckOnParagraph;

        return {
            onRead,
            inPanel,
            idle,
            dwell,
            scrollIdle,
            moving,
            scrolling,
            recentlyActive,
            stuckOnParagraph,
            clearlyDistracted,
            quietlyReading,
            activelyReading,
            faceAbsent,
            leftReadingArea,
            outsideDur,
            gazeMode,
            facePresent
        };
    }

    /**
     * Leaving the reading panel — distracted overrides Struggling immediately.
     */
    _hasLeftReadingArea(sig, currentState) {
        if (sig.inPanel) return false;
        if (currentState === 'Struggling') return true;
        const outsideDur = sig.outsideDur || 0;
        return outsideDur >= this._leaveThreshold(sig) || sig.idle >= this._leaveThreshold(sig);
    }

    /**
     * Priority: Distracted (leave reading area overrides Struggling) > Struggling > Normal > Idle
     */
    _classifyTargetState(features) {
        const current = this._currentState.name;
        const sig = this._readingSignals(features);
        const blockIdx = features.readingBlockIndex ?? -1;

        if (sig.clearlyDistracted || this._hasLeftReadingArea(sig, current)) {
            return this.STATES.DISTRACTED;
        }

        if (current === 'Struggling') {
            if (this._strugglingBlockIndex >= 0 && blockIdx >= 0 && blockIdx !== this._strugglingBlockIndex) {
                if (sig.activelyReading || sig.quietlyReading) {
                    return this.STATES.NORMAL;
                }
                return this.STATES.IDLE;
            }
            return this.STATES.STRUGGLING;
        }

        if (sig.stuckOnParagraph) {
            return this.STATES.STRUGGLING;
        }

        if (current === 'Distracted') {
            if (!sig.inPanel || sig.clearlyDistracted) {
                return this.STATES.DISTRACTED;
            }
            if (sig.activelyReading || sig.quietlyReading) {
                return this.STATES.NORMAL;
            }
            return this.STATES.IDLE;
        }

        if (sig.activelyReading || sig.quietlyReading) {
            return this.STATES.NORMAL;
        }

        return this.STATES.IDLE;
    }

    _leaveThreshold(sig) {
        return sig.gazeMode
            ? this.thresholds.distractionLeaveReadingGaze
            : this.thresholds.distractionLeaveReadingMouse;
    }

    _getStateByName(name) {
        for (const state of Object.values(this.STATES)) {
            if (state.name === name) return state;
        }
        return null;
    }

    _decideTransition(features) {
        const stateDuration = performance.now() - this._stateStartTime;
        if (stateDuration < this.thresholds.normalTransitionCooldown) {
            return null;
        }

        const current = this._currentState.name;
        const target = this._classifyTargetState(features);
        const sig = this._readingSignals(features);

        if (!target || target.name === current) {
            return null;
        }

        if (current === 'Distracted' && (target.name === 'Normal' || target.name === 'Idle')) {
            if (!sig.inPanel) {
                return null;
            }
        }

        if (current === 'Struggling' && target.name === 'Distracted') {
            return target;
        }

        if (target.name === 'Distracted' && sig.onRead && sig.quietlyReading) {
            return null;
        }

        return target;
    }

    _transitionTo(newState, features) {
        const now = performance.now();
        this._previousState = this._currentState;
        this._currentState = newState;
        this._stateStartTime = now;
        this._stateDuration = 0;

        if (newState.name === 'Struggling') {
            this._strugglingBlockIndex = features.readingBlockIndex ?? -1;
        } else if (this._previousState.name === 'Struggling') {
            this._strugglingBlockIndex = -1;
        }

        console.log(`[StateMachine] 🔄 ${this._previousState.name} → ${newState.name}`);

        document.dispatchEvent(new CustomEvent('focusflow-state-change', {
            detail: {
                previousState: this._previousState,
                currentState: this._currentState,
                timestamp: now,
                features: features
            }
        }));
    }

    _wasInactiveBefore() {
        if (this._featureHistory.length < 2) return false;
        const prev = this._featureHistory[this._featureHistory.length - 2];
        return prev && !prev.interactionActive;
    }

    _wasPausedBefore() {
        if (this._featureHistory.length < 2) return false;
        const prev = this._featureHistory[this._featureHistory.length - 2];
        return prev && prev.isPaused;
    }

    getState() {
        const now = performance.now();
        return {
            ...this._currentState,
            duration: now - this._stateStartTime,
            startTime: this._stateStartTime,
            timestamp: now
        };
    }

    getRecentHistory(count = 50) {
        return this.stateHistory.slice(-Math.min(count, this.stateHistory.length));
    }

    getCurrentStateDuration() {
        return performance.now() - this._stateStartTime;
    }

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

    updateThresholds(newThresholds) {
        Object.assign(this.thresholds, newThresholds);
    }

    _debugLog() {
        console.log(`[StateMachine] ${this._currentState.icon} ${this._currentState.name} | ` +
            `duration: ${(this._stateDuration / 1000).toFixed(1)}s`
        );
    }

    reset() {
        this._currentState = this.STATES.NORMAL;
        this._previousState = null;
        this._stateStartTime = performance.now();
        this._stateDuration = 0;
        this._strugglingBlockIndex = -1;
        this.stateHistory = [];
        this._featureHistory = [];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateMachine;
}
