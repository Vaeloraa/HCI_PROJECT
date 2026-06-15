/**
 * FocusFlow - Adaptive Threshold Learning Module
 * 
 * Decision Layer: Learns personalized thresholds for cognitive state transitions
 * based on individual user's reading behavior and interaction patterns.
 * 
 * Different users have different reading speeds → auto-adjust time thresholds.
 * This module maintains a dynamic user model that adapts over time.
 * 
 * HCI Final Project - Member A
 */

class AdaptiveThreshold {
    constructor(config) {
        this.config = config;

        // Default thresholds (will be adapted)
        this.thresholds = {
            // Distraction detection
            distractionNoFace: 3000,           // ms without face → distracted
            distractionNoInteraction: 5000,    // ms without interaction → distracted
            distractionMinConfidence: 0.5,     // Minimum confidence for distraction state
            
            // Struggling detection
            strugglingDwellTime: 8000,         // ms on same region → struggling
            strugglingMinScrollVelocity: 0.5,  // pixels/ms threshold
            strugglingMinConfidence: 0.4,

            // Recovery detection
            recoveringStableTime: 5000,        // ms of stable behavior → normal
            recoveringMinConfidence: 0.5,

            // General
            normalTransitionCooldown: 2000,    // min ms between state transitions
            samplingRate: 100                  // ms between feature samples
        };

        // User statistics for personalization
        this.userStats = {
            // Reading speed distribution
            readingSpeedSamples: [],
            maxReadingSamples: 50,

            // Dwell time distribution
            dwellTimeSamples: [],
            maxDwellSamples: 50,

            // Distraction pattern
            distractionDurations: [],
            maxDistractionSamples: 20,

            // Recovery pattern
            recoveryTimes: [],
            maxRecoverySamples: 20,

            // Scroll patterns
            scrollVelocitySamples: [],
            maxScrollSamples: 50
        };

        // Learning parameters
        this.learningRate = 0.1;       // How fast thresholds adapt
        this.minSamplesForAdaptation = 10;
        this.adaptationCounter = 0;
        this.lastAdaptationTime = 0;
        this.adaptationInterval = 60000; // Adapt every 60 seconds

        // Personalized profile
        this.profile = {
            readingSpeed: { avg: 150, std: 50 },      // pixels/ms
            dwellTime: { avg: 4000, std: 2000 },       // ms
            distractionSensitivity: 0.5,                // 0-1 (low-high)
            strugglingThreshold: 8000,                  // ms personalized
            recoverySpeed: { avg: 3000, std: 1500 }     // ms
        };

        this.debug = config.debug || false;
    }

    /**
     * Update thresholds based on new perception features
     * @param {Object} features - Multi-modal feature vector
     * @param {Object} currentState - Current cognitive state
     */
    update(features, currentState) {
        const now = performance.now();

        // Always collect statistics
        this._collectStatistics(features, currentState);

        // Periodically adapt thresholds
        if (now - this.lastAdaptationTime > this.adaptationInterval) {
            this._adaptThresholds();
            this.lastAdaptationTime = now;

            if (this.debug) {
                console.log('[AdaptiveThreshold] 📊 Thresholds adapted:', this.thresholds);
            }
        }
    }

    /**
     * Collect user behavior statistics
     * @param {Object} features
     * @param {Object} currentState
     */
    _collectStatistics(features, currentState) {
        const now = performance.now();

        // Reading speed from scroll velocity when actively reading
        if (features.isReadingRhythm || (features.scrollVelocity > 0 && features.scrollVelocity < 3.0)) {
            this.userStats.readingSpeedSamples.push({
                velocity: features.scrollVelocity,
                time: now
            });
            if (this.userStats.readingSpeedSamples.length > this.userStats.maxReadingSamples) {
                this.userStats.readingSpeedSamples.shift();
            }
        }

        // Dwell time samples
        if (features.dwellTime > 500) { // Only meaningful dwells
            this.userStats.dwellTimeSamples.push({
                dwellTime: features.dwellTime,
                region: features.currentRegion,
                time: now
            });
            if (this.userStats.dwellTimeSamples.length > this.userStats.maxDwellSamples) {
                this.userStats.dwellTimeSamples.shift();
            }
        }

        // Scroll velocity samples
        this.userStats.scrollVelocitySamples.push({
            velocity: features.scrollVelocity,
            time: now
        });
        if (this.userStats.scrollVelocitySamples.length > this.userStats.maxScrollSamples) {
            this.userStats.scrollVelocitySamples.shift();
        }

        // Distraction duration tracking
        if (currentState.name === 'Distracted' && this._lastDistractionStart === null) {
            this._lastDistractionStart = now;
        } else if (currentState.name !== 'Distracted' && this._lastDistractionStart !== null) {
            const duration = now - this._lastDistractionStart;
            if (duration > 1000) { // Only count meaningful distractions
                this.userStats.distractionDurations.push({
                    duration: duration,
                    time: now
                });
                if (this.userStats.distractionDurations.length > this.userStats.maxDistractionSamples) {
                    this.userStats.distractionDurations.shift();
                }
            }
            this._lastDistractionStart = null;
        }
    }

    // Internal state for tracking distraction/recovery starts
    _lastDistractionStart = null;

    /**
     * Adapt thresholds based on collected user statistics
     * This is the core personalization logic
     */
    _adaptThresholds() {
        // Need minimum samples to adapt
        if (this.userStats.readingSpeedSamples.length < this.minSamplesForAdaptation &&
            this.userStats.dwellTimeSamples.length < this.minSamplesForAdaptation) {
            return;
        }

        // 1. Adapt reading-speed-based thresholds
        if (this.userStats.readingSpeedSamples.length >= 3) {
            const velocities = this.userStats.readingSpeedSamples.map(s => s.velocity);
            const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
            const variance = velocities.reduce((a, b) => a + (b - avgVelocity) ** 2, 0) / velocities.length;
            const stdVelocity = Math.sqrt(variance);

            this.profile.readingSpeed = {
                avg: avgVelocity * this.learningRate + this.profile.readingSpeed.avg * (1 - this.learningRate),
                std: stdVelocity * this.learningRate + this.profile.readingSpeed.std * (1 - this.learningRate)
            };

            // Slower reader → longer dwell thresholds for struggling detection
            // Faster reader → shorter dwell thresholds
            if (avgVelocity < 0.5) {
                // Slow reader: give more time before declaring struggling
                this.thresholds.strugglingDwellTime = Math.min(15000, 
                    this.thresholds.strugglingDwellTime * (1 + this.learningRate));
            } else if (avgVelocity > 2.0) {
                // Fast reader: less patience for dwelling
                this.thresholds.strugglingDwellTime = Math.max(4000, 
                    this.thresholds.strugglingDwellTime * (1 - this.learningRate));
            }
        }

        // 2. Adapt dwell-time-based thresholds
        if (this.userStats.dwellTimeSamples.length >= 3) {
            const dwellTimes = this.userStats.dwellTimeSamples.map(s => s.dwellTime);
            const avgDwell = dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length;
            
            this.profile.dwellTime = {
                avg: avgDwell * this.learningRate + this.profile.dwellTime.avg * (1 - this.learningRate),
                std: this.profile.dwellTime.std // Keep std for now
            };

            // Personal struggling threshold: 2x the user's average dwell time
            this.profile.strugglingThreshold = Math.max(4000, avgDwell * 2);
            this.thresholds.strugglingDwellTime = this.profile.strugglingThreshold;
        }

        // 3. Adapt distraction thresholds based on user's distraction frequency
        if (this.userStats.distractionDurations.length >= 2) {
            const durations = this.userStats.distractionDurations.map(s => s.duration);
            const avgDistractionDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

            this.profile.distractionSensitivity = Math.min(1, Math.max(0,
                durations.length / 20 // More distractions → higher sensitivity
            ));

            // If user frequently gets distracted, lower the threshold to catch earlier
            if (this.profile.distractionSensitivity > 0.6) {
                this.thresholds.distractionNoFace = Math.max(1500,
                    this.thresholds.distractionNoFace * (1 - this.learningRate * 0.5));
                this.thresholds.distractionNoInteraction = Math.max(3000,
                    this.thresholds.distractionNoInteraction * (1 - this.learningRate * 0.5));
            }
        }

        // 4. Adapt recovery thresholds
        if (this.userStats.recoveryTimes.length >= 2) {
            const recoveryTimes = this.userStats.recoveryTimes.map(s => s.recoveryTime);
            const avgRecovery = recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length;

            this.profile.recoverySpeed = {
                avg: avgRecovery * this.learningRate + this.profile.recoverySpeed.avg * (1 - this.learningRate),
                std: this.profile.recoverySpeed.std
            };

            // User recovers quickly → shorter recovery stable time
            if (avgRecovery < 2000) {
                this.thresholds.recoveringStableTime = Math.max(2000,
                    this.thresholds.recoveringStableTime * (1 - this.learningRate));
            }
        }

        this.adaptationCounter++;
    }

    /**
     * Get current personalized thresholds
     * @returns {Object} Current thresholds
     */
    getThresholds() {
        return { ...this.thresholds };
    }

    /**
     * Get user's attention profile (for modeling layer)
     * @returns {Object} User profile
     */
    getProfile() {
        return {
            readingSpeed: { ...this.profile.readingSpeed },
            dwellTime: { ...this.profile.dwellTime },
            distractionSensitivity: this.profile.distractionSensitivity,
            strugglingThreshold: this.profile.strugglingThreshold,
            recoverySpeed: { ...this.profile.recoverySpeed },
            distractionFrequency: this.userStats.distractionDurations.length,
            totalAdaptations: this.adaptationCounter
        };
    }

    /**
     * Override thresholds manually (e.g., from saved user profile)
     * @param {Object} newThresholds
     */
    setThresholds(newThresholds) {
        if (newThresholds.distractionNoFace) 
            this.thresholds.distractionNoFace = newThresholds.distractionNoFace;
        if (newThresholds.distractionNoInteraction) 
            this.thresholds.distractionNoInteraction = newThresholds.distractionNoInteraction;
        if (newThresholds.strugglingDwellTime) 
            this.thresholds.strugglingDwellTime = newThresholds.strugglingDwellTime;
        if (newThresholds.recoveringStableTime) 
            this.thresholds.recoveringStableTime = newThresholds.recoveringStableTime;
    }

    /**
     * Reset to default thresholds
     */
    reset() {
        this.thresholds = {
            distractionNoFace: 3000,
            distractionNoInteraction: 5000,
            distractionMinConfidence: 0.5,
            strugglingDwellTime: 8000,
            strugglingMinScrollVelocity: 0.5,
            strugglingMinConfidence: 0.4,
            recoveringStableTime: 5000,
            recoveringMinConfidence: 0.5,
            normalTransitionCooldown: 2000,
            samplingRate: 100
        };

        this.userStats = {
            readingSpeedSamples: [],
            maxReadingSamples: 50,
            dwellTimeSamples: [],
            maxDwellSamples: 50,
            distractionDurations: [],
            maxDistractionSamples: 20,
            recoveryTimes: [],
            maxRecoverySamples: 20,
            scrollVelocitySamples: [],
            maxScrollSamples: 50
        };

        this.profile = {
            readingSpeed: { avg: 150, std: 50 },
            dwellTime: { avg: 4000, std: 2000 },
            distractionSensitivity: 0.5,
            strugglingThreshold: 8000,
            recoverySpeed: { avg: 3000, std: 1500 }
        };

        this.adaptationCounter = 0;
        this._lastDistractionStart = null;
        this._lastRecoveryStart = null;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdaptiveThreshold;
}
