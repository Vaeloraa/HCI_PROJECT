/**
 * FocusFlow - Attention Analytics Module
 * 
 * Analytics Layer: Tracks and analyzes user reading patterns,
 * attention metrics, and generates insights for adaptive interventions.
 * 
 * Features:
 *   - Reading speed tracking (words per minute)
 *   - Session statistics (total time, reading time, distraction time)
 *   - Historical trend logging
 *   - Insight generation for personalized feedback
 * 
 * HCI Final Project - Member C (NLP & Integration)
 */

class AttentionAnalytics {
    constructor(config) {
        this.config = config;
        
        // Session data
        this.sessionStart = Date.now();
        this.totalReadingTime = 0;       // ms of active reading
        this.totalDistractionTime = 0;   // ms of distraction
        this.distractionCount = 0;
        this.distractionEpisodes = [];
        this.currentDistractionStart = null;
        
        // Reading metrics
        this.blocksRead = new Set();
        this.readingSpeedSamples = [];   // WPM samples
        this.wordCounts = {};            // blockIndex -> wordCount
        
        // Gaze path tracking
        this.gazePath = [];              // { x, y, timestamp, blockId }
        this.regressionCount = 0;        // Backward saccades (re-reading)
        this.lastBlockIndex = -1;
        
        // Session stats
        this.sessions = [];              // Historical sessions
        this.maxSessions = 10;           // Keep last 10 sessions
        
        // Block timing
        this.blockDwellTimes = {};       // blockIndex -> total ms spent
        this.blockEntryTime = {};
        this._lastGazeBlockIndex = -1;
        this._lastGazeSampleTime = null;

        // Recovery & comprehension assist (Member C)
        this.recoveryEpisodes = [];      // { distractionMs, recoveryMs }
        this._pendingDistractionStart = null;
        this.stateTimeline = [];         // { state, durationMs, timestamp }
        this._lastStateName = 'Normal';
        this._lastStateChangeTime = Date.now();
        this.comprehensionAssists = [];  // blockIndex values
        
        // Sample timing for reading-time accumulation
        this._lastSampleTime = Date.now();
        this._lastActivityTickTime = Date.now();
        this._maxReadingSpeedSamples = 100;
        this._minBlockDwellForSpeedMs = 2500;
        this._lastReadingSpeed = 0;
        this._stickyInsight = null;
        
        // Auto-save interval
        this._saveInterval = setInterval(() => this._autoSave(), 30000);
    }

    /**
     * States where the user is actively engaged with reading content
     * @param {string} state
     * @returns {boolean}
     */
    _isReadingState(state) {
        return ['Normal', 'Struggling'].includes(state);
    }

    /**
     * Record a gaze sample with cognitive state
     * @param {Object} gazeData - { x, y, blockId, blockIndex }
     * @param {string} state - Current cognitive state
     */
    recordGazeSample(gazeData, state) {
        const timestamp = Date.now();
        this._lastSampleTime = timestamp;
        
        // Track gaze path
        this.gazePath.push({
            x: gazeData.x,
            y: gazeData.y,
            timestamp,
            blockId: gazeData.blockId,
            state
        });
        
        // Limit gaze path buffer
        if (this.gazePath.length > 1000) {
            this.gazePath = this.gazePath.slice(-500);
        }
        
        // Track block dwell time
        if (gazeData.blockId) {
            if (!this.blockEntryTime[gazeData.blockId]) {
                this.blockEntryTime[gazeData.blockId] = timestamp;
            }
        }

        if (gazeData.blockIndex !== null && gazeData.blockIndex !== undefined && gazeData.blockIndex >= 0) {
            if (this._lastGazeBlockIndex === gazeData.blockIndex && this._lastGazeSampleTime) {
                const delta = timestamp - this._lastGazeSampleTime;
                if (delta > 0 && delta < 2500 && this._isReadingState(state)) {
                    this.blockDwellTimes[gazeData.blockIndex] =
                        (this.blockDwellTimes[gazeData.blockIndex] || 0) + delta;
                }
            }
            this._lastGazeBlockIndex = gazeData.blockIndex;
            this._lastGazeSampleTime = timestamp;
        }
        
        // Detect regressions (going back to previous blocks)
        if (gazeData.blockIndex !== null && gazeData.blockIndex !== undefined) {
            if (this.lastBlockIndex >= 0 && gazeData.blockIndex < this.lastBlockIndex) {
                this.regressionCount++;
            }
            this.lastBlockIndex = gazeData.blockIndex;
        }
        
        // Track reading progress
        if (gazeData.blockIndex !== undefined && gazeData.blockIndex >= 0) {
            this.blocksRead.add(gazeData.blockIndex);
        }
    }

    /**
     * Record reading speed when the user leaves a paragraph (block transition).
     * @param {number} blockIndex - Paragraph that was just read
     * @param {number} dwellMs - Time spent on that paragraph
     * @param {string} state - Cognitive state during the transition
     */
    recordBlockSpeed(blockIndex, dwellMs, state) {
        if (!this._isReadingState(state)) return;
        if (blockIndex < 0 || dwellMs < this._minBlockDwellForSpeedMs) return;

        const wc = this.wordCounts[blockIndex];
        if (!wc) return;

        const wpm = Math.round((wc / dwellMs) * 60000);
        if (wpm <= 0 || wpm >= 1000) return;

        this.readingSpeedSamples.push(wpm);
        this._lastReadingSpeed = wpm;
        if (this.readingSpeedSamples.length > this._maxReadingSpeedSamples) {
            this.readingSpeedSamples = this.readingSpeedSamples.slice(-Math.floor(this._maxReadingSpeedSamples * 0.6));
        }
    }

    getLastReadingSpeed() {
        return this._lastReadingSpeed || 0;
    }

    /**
     * Accumulate reading / distraction time from the live cognitive state (~200ms tick).
     */
    tickActivity(state) {
        const now = Date.now();

        if (this._lastActivityTickTime) {
            const deltaMs = now - this._lastActivityTickTime;
            if (deltaMs > 0 && deltaMs < 10000) {
                if (this._isReadingState(state)) {
                    this.totalReadingTime += deltaMs;
                } else if (state === 'Distracted') {
                    this.totalDistractionTime += deltaMs;
                }
            }
        }
        this._lastActivityTickTime = now;

        if (state === 'Distracted') {
            this.startDistraction(state);
        } else {
            this.endDistraction();
        }
    }

    /**
     * Record a distraction episode
     * @param {string} type - Type of distraction (gazeAversion, offScreen, wandering)
     */
    startDistraction(type) {
        if (this.currentDistractionStart === null) {
            this.currentDistractionStart = Date.now();
            this.distractionCount++;
        }
    }

    /**
     * End the current distraction episode
     */
    endDistraction() {
        if (this.currentDistractionStart !== null) {
            const duration = Date.now() - this.currentDistractionStart;
            this.distractionEpisodes.push({
                start: this.currentDistractionStart,
                duration
            });
            this.currentDistractionStart = null;
        }
    }

    /**
     * Mark a block as read with word count
     * @param {number} blockIndex 
     * @param {number} wordCount 
     */
    setBlockWordCount(blockIndex, wordCount) {
        this.wordCounts[blockIndex] = wordCount;
    }

    /**
     * Calculate reading speed in WPM
     * @returns {number} Words per minute
     */
    getReadingSpeed() {
        if (this.readingSpeedSamples.length === 0) return 0;
        
        const sorted = [...this.readingSpeedSamples].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        return Math.round(median);
    }

    /**
     * Get session duration in minutes
     * @returns {number}
     */
    getSessionDuration() {
        return (Date.now() - this.sessionStart) / 60000;
    }

    /**
     * Get focus ratio (reading time / total time)
     * @returns {number} 0-1
     */
    getFocusRatio() {
        const total = this.totalReadingTime + this.totalDistractionTime;
        return total > 0 ? this.totalReadingTime / total : 1;
    }

    /**
     * Get regression rate (backward saccades per minute)
     * @returns {number}
     */
    getRegressionRate() {
        const minutes = this.getSessionDuration();
        return minutes > 0 ? this.regressionCount / minutes : 0;
    }

    /**
     * Generate personalized insight based on reading behavior
     * @returns {Object} { message, type, severity }
     */
    generateInsight() {
        const t = (key) => (typeof I18n !== 'undefined' ? I18n.t(key) : key);
        const readingSpeed = this.getReadingSpeed();
        const focusRatio = this.getFocusRatio();
        const regressionRate = this.getRegressionRate();
        
        if (focusRatio < 0.3) {
            return {
                message: t('insight.break'),
                type: 'break_suggestion',
                severity: 'high',
                icon: '🧠'
            };
        }
        
        // High regression (re-reading too much)
        if (regressionRate > 5) {
            return {
                message: t('insight.paceSlow'),
                type: 'pace_suggestion',
                severity: 'medium',
                icon: '📖'
            };
        }
        
        // Good progress encouragement
        if (focusRatio > 0.7) {
            return {
                message: t('insight.encourage'),
                type: 'encouragement',
                severity: 'low',
                icon: '🌟'
            };
        }
        
        // Reading speed check
        if (readingSpeed > 0 && readingSpeed < 100) {
            return {
                message: t('insight.paceInfo'),
                type: 'pace_info',
                severity: 'low',
                icon: '🐢'
            };
        }
        
        if (readingSpeed > 400) {
            return {
                message: t('insight.paceFast'),
                type: 'pace_warning',
                severity: 'low',
                icon: '⚡'
            };
        }
        
        return null;
    }

    /**
     * Insight shown in the reading panel — persists until replaced by a new one.
     */
    getDisplayInsight() {
        const t = (key) => (typeof I18n !== 'undefined' ? I18n.t(key) : key);
        const fresh = this.generateInsight();
        if (fresh) {
            this._stickyInsight = fresh;
        }
        if (this._stickyInsight) {
            return this._stickyInsight;
        }
        return {
            icon: '💡',
            message: t('insight.idle'),
            type: 'idle',
            severity: 'low'
        };
    }

    /**
     * Save the current session to localStorage
     */
    _autoSave() {
        try {
            const sessionData = {
                date: new Date().toISOString(),
                duration: this.getSessionDuration(),
                readingSpeed: this.getReadingSpeed(),
                focusRatio: this.getFocusRatio(),
                distractionCount: this.distractionCount,
                blocksRead: this.blocksRead.size,
                regressionRate: this.getRegressionRate()
            };
            
            // Load existing sessions
            const stored = localStorage.getItem('focusflow_sessions');
            this.sessions = stored ? JSON.parse(stored) : [];
            
            // Add current session snapshot (replacing last if same session)
            if (this.sessions.length > 0) {
                const lastSession = this.sessions[this.sessions.length - 1];
                if (lastSession.date && sessionData.date) {
                    const lastDate = new Date(lastSession.date);
                    const currDate = new Date(sessionData.date);
                    if (Math.abs(currDate - lastDate) < 60000) {
                        this.sessions[this.sessions.length - 1] = sessionData;
                    } else {
                        this.sessions.push(sessionData);
                    }
                }
            } else {
                this.sessions.push(sessionData);
            }
            
            // Keep only max sessions
            if (this.sessions.length > this.maxSessions) {
                this.sessions = this.sessions.slice(-this.maxSessions);
            }
            
            localStorage.setItem('focusflow_sessions', JSON.stringify(this.sessions));
        } catch (e) {
            // localStorage might not be available
        }
    }

    /**
     * Get historical session data for trends
     * @returns {Array} Session history
     */
    getHistory() {
        return this.sessions;
    }

    /**
     * Record cognitive state transitions for recovery analytics.
     */
    recordStateTransition(previousState, currentState) {
        if (!currentState || !currentState.name) return;

        const now = Date.now();
        const durationMs = now - this._lastStateChangeTime;

        if (this._lastStateName) {
            this.stateTimeline.push({
                state: this._lastStateName,
                durationMs,
                timestamp: this._lastStateChangeTime
            });
            if (this.stateTimeline.length > 200) {
                this.stateTimeline = this.stateTimeline.slice(-120);
            }
        }

        const prevName = previousState && previousState.name ? previousState.name : this._lastStateName;
        const currName = currentState.name;
        const distracted = prevName === 'Distracted';
        const recovering = currName === 'Normal';

        if (distracted && this._pendingDistractionStart) {
            const distractionMs = now - this._pendingDistractionStart;
            this.recoveryEpisodes.push({
                distractionMs,
                recoveryMs: durationMs,
                endedAt: now
            });
            this._pendingDistractionStart = null;
        }

        if (currName === 'Distracted') {
            if (!this._pendingDistractionStart) {
                this._pendingDistractionStart = now;
            }
        }

        this._lastStateName = currName;
        this._lastStateChangeTime = now;
    }

    /**
     * Record when a comprehension assist card was shown.
     */
    recordComprehensionAssist(blockIndex) {
        this.comprehensionAssists.push({
            blockIndex,
            timestamp: Date.now()
        });
    }

    /**
     * Average recovery time after distraction (seconds).
     */
    getAverageRecoverySeconds() {
        if (!this.recoveryEpisodes.length) return 0;
        const total = this.recoveryEpisodes.reduce((sum, ep) => sum + (ep.recoveryMs || 0), 0);
        return Math.round((total / this.recoveryEpisodes.length) / 100) / 10;
    }

    /**
     * Paragraph-level attention heatmap from dwell times.
     */
    getBlockHeatmap(totalBlocks = 0) {
        const rows = [];
        for (let i = 0; i < totalBlocks; i++) {
            rows.push({
                blockIndex: i,
                displayIndex: i + 1,
                dwellMs: this.blockDwellTimes[i] || 0
            });
        }
        return rows;
    }

    /**
     * Full session report for visualization / experiment export.
     */
    generateSessionReport(readingView) {
        const summary = this.getSessionSummary();
        const totalBlocks = readingView && readingView.blockElements
            ? readingView.blockElements.length
            : Object.keys(this.blockDwellTimes).length;

        return {
            generatedAt: new Date().toISOString(),
            durationMin: Math.round(summary.duration * 10) / 10,
            readingSpeed: summary.readingSpeed,
            focusRatio: summary.focusRatio,
            distractionCount: summary.distractionCount,
            avgRecoverySec: this.getAverageRecoverySeconds(),
            blocksRead: summary.blocksRead,
            regressionRate: summary.regressionRate,
            blockHeatmap: this.getBlockHeatmap(totalBlocks),
            stateTimeline: this.stateTimeline,
            comprehensionAssists: this.comprehensionAssists.length,
            distractionEpisodes: this.distractionEpisodes,
            recoveryEpisodes: this.recoveryEpisodes,
            insight: summary.insight
        };
    }

    /**
     * Get a summary of the current session
     * @returns {Object} Session summary
     */
    getSessionSummary() {
        const sessionDuration = Math.round(this.getSessionDuration() * 10) / 10;
        return {
            duration: sessionDuration,
            sessionDuration,
            readingSpeed: this.getReadingSpeed(),
            focusRatio: Math.round(this.getFocusRatio() * 100),
            distractionCount: this.distractionCount,
            blocksRead: this.blocksRead.size,
            regressionRate: Math.round(this.getRegressionRate() * 10) / 10,
            insight: this.getDisplayInsight()
        };
    }

    /**
     * Reset analytics for a new session
     */
    reset() {
        // Save old session first
        this._autoSave();
        
        this.sessionStart = Date.now();
        this.totalReadingTime = 0;
        this.totalDistractionTime = 0;
        this.distractionCount = 0;
        this.distractionEpisodes = [];
        this.currentDistractionStart = null;
        this.blocksRead = new Set();
        this.readingSpeedSamples = [];
        this._lastReadingSpeed = 0;
        this._stickyInsight = null;
        this.gazePath = [];
        this.regressionCount = 0;
        this.lastBlockIndex = -1;
        this.blockDwellTimes = {};
        this.blockEntryTime = {};
        this._lastGazeBlockIndex = -1;
        this._lastGazeSampleTime = null;
        this._lastActivityTickTime = Date.now();
        this.recoveryEpisodes = [];
        this._pendingDistractionStart = null;
        this.stateTimeline = [];
        this._lastStateName = 'Normal';
        this._lastStateChangeTime = Date.now();
        this.comprehensionAssists = [];
        this._lastSampleTime = Date.now();
    }

    /**
     * Alias for reset() — used by index.html on file import
     */
    resetSession() {
        this.reset();
    }

    /**
     * Clean up
     */
    destroy() {
        if (this._saveInterval) {
            clearInterval(this._saveInterval);
        }
        this._autoSave();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AttentionAnalytics;
}
