/**
 * FocusFlow - Attention Analytics Module
 * 
 * Analytics Layer: Tracks and analyzes user reading patterns,
 * attention metrics, and generates insights for adaptive interventions.
 * 
 * Features:
 *   - Reading speed tracking (words per minute)
 *   - Attention score calculation
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
        this.currentBlockStartTime = null;
        this.currentBlockIndex = -1;
        this.wordCounts = {};            // blockIndex -> wordCount
        
        // Attention tracking
        this.attentionSamples = [];      // Timestamped attention scores
        this.currentSessionScore = 0;
        this.attentionHistory = [];      // Rolling window of states
        
        // Gaze path tracking
        this.gazePath = [];              // { x, y, timestamp, blockId }
        this.regressionCount = 0;        // Backward saccades (re-reading)
        this.lastBlockIndex = -1;
        
        // Session stats
        this.sessions = [];              // Historical sessions
        this.maxSessions = 10;           // Keep last 10 sessions
        
        // Block timing
        this.blockDwellTimes = {};       // blockId -> total ms spent
        this.blockEntryTime = {};
        
        // Auto-save interval
        this._saveInterval = setInterval(() => this._autoSave(), 30000);
    }

    /**
     * Record a gaze sample with attention state
     * @param {Object} gazeData - { x, y, blockId, blockIndex }
     * @param {string} state - Current state (reading/distracted/offScreen/etc)
     * @param {number} attentionScore - Current attention level 0-1
     */
    recordGazeSample(gazeData, state, attentionScore) {
        const timestamp = Date.now();
        
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
        
        // Track attention
        this.attentionSamples.push({
            timestamp,
            score: attentionScore,
            state
        });
        
        // Track block dwell time
        if (gazeData.blockId) {
            if (!this.blockEntryTime[gazeData.blockId]) {
                this.blockEntryTime[gazeData.blockId] = timestamp;
            }
        }
        
        // Detect regressions (going back to previous blocks)
        if (gazeData.blockIndex !== null && gazeData.blockIndex !== undefined) {
            if (this.lastBlockIndex >= 0 && gazeData.blockIndex < this.lastBlockIndex) {
                this.regressionCount++;
            }
            this.lastBlockIndex = gazeData.blockIndex;
        }
        
        // Track reading speed
        if (state === 'reading' && gazeData.blockIndex !== undefined && gazeData.blockIndex >= 0) {
            if (this.currentBlockIndex !== gazeData.blockIndex) {
                if (this.currentBlockStartTime && this.currentBlockIndex >= 0) {
                    const dwellTime = timestamp - this.currentBlockStartTime;
                    const wc = this.wordCounts[this.currentBlockIndex] || 100;
                    const wpm = (wc / dwellTime) * 60000;
                    if (wpm > 0 && wpm < 1000) {
                        this.readingSpeedSamples.push(wpm);
                    }
                }
                this.currentBlockIndex = gazeData.blockIndex;
                this.currentBlockStartTime = timestamp;
            }
        }
        
        // Track reading progress
        if (gazeData.blockIndex !== undefined && gazeData.blockIndex >= 0) {
            this.blocksRead.add(gazeData.blockIndex);
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
            this.totalDistractionTime += duration;
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
     * Calculate the current attention score (0-100)
     * Based on recent gaze behavior and reading progress
     * @returns {number} Attention score 0-100
     */
    getAttentionScore() {
        const now = Date.now();
        const window = 30000; // Last 30 seconds
        
        // Get recent samples
        const recent = this.attentionSamples.filter(s => (now - s.timestamp) < window);
        if (recent.length === 0) return 50;
        
        // Weighted average (more recent = higher weight)
        let totalWeight = 0;
        let weightedScore = 0;
        
        for (const sample of recent) {
            const age = now - sample.timestamp;
            const weight = Math.max(0, 1 - (age / window));
            weightedScore += sample.score * weight;
            totalWeight += weight;
        }
        
        const avgScore = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 50;
        return Math.round(Math.max(0, Math.min(100, avgScore)));
    }

    /**
     * Calculate reading speed in WPM
     * @returns {number} Words per minute
     */
    getReadingSpeed() {
        if (this.readingSpeedSamples.length < 3) return 0;
        
        // Use median to filter outliers
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
        const attentionScore = this.getAttentionScore();
        const readingSpeed = this.getReadingSpeed();
        const focusRatio = this.getFocusRatio();
        const regressionRate = this.getRegressionRate();
        
        // Low attention
        if (attentionScore < 30) {
            return {
                message: "Your attention seems to be drifting. How about taking a short break?",
                type: 'break_suggestion',
                severity: 'high',
                icon: '🧠'
            };
        }
        
        // High regression (re-reading too much)
        if (regressionRate > 5) {
            return {
                message: "You're re-reading some sections. Slowing down a bit might help comprehension.",
                type: 'pace_suggestion',
                severity: 'medium',
                icon: '📖'
            };
        }
        
        // Good progress encouragement
        if (focusRatio > 0.7 && attentionScore > 70) {
            return {
                message: "Great focus! You're reading consistently well.",
                type: 'encouragement',
                severity: 'low',
                icon: '🌟'
            };
        }
        
        // Reading speed check
        if (readingSpeed > 0 && readingSpeed < 100) {
            return {
                message: "You're reading at a leisurely pace. That's perfectly fine for comprehension!",
                type: 'pace_info',
                severity: 'low',
                icon: '🐢'
            };
        }
        
        if (readingSpeed > 400) {
            return {
                message: "You're reading quite fast. Make sure you're absorbing the material!",
                type: 'pace_warning',
                severity: 'low',
                icon: '⚡'
            };
        }
        
        return null;
    }

    /**
     * Save the current session to localStorage
     */
    _autoSave() {
        try {
            const sessionData = {
                date: new Date().toISOString(),
                duration: this.getSessionDuration(),
                attentionScore: this.getAttentionScore(),
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
     * Get a summary of the current session
     * @returns {Object} Session summary
     */
    getSessionSummary() {
        return {
            duration: Math.round(this.getSessionDuration() * 10) / 10,
            attentionScore: this.getAttentionScore(),
            readingSpeed: this.getReadingSpeed(),
            focusRatio: Math.round(this.getFocusRatio() * 100),
            distractionCount: this.distractionCount,
            blocksRead: this.blocksRead.size,
            regressionRate: Math.round(this.getRegressionRate() * 10) / 10,
            insight: this.generateInsight()
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
        this.currentBlockStartTime = null;
        this.currentBlockIndex = -1;
        this.attentionSamples = [];
        this.gazePath = [];
        this.regressionCount = 0;
        this.lastBlockIndex = -1;
        this.blockDwellTimes = {};
        this.blockEntryTime = {};
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
