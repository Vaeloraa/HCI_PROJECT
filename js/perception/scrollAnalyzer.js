/**
 * FocusFlow - Scroll Analyzer Module
 * 
 * Perception Layer: Analyzes scrolling behavior to detect
 * reading rhythm and patterns:
 *   - Scroll velocity (reading speed)
 *   - Scroll patterns (continuous vs. jump scrolling)
 *   - Pause detection (dwell on content)
 *   - Reading progress tracking
 * 
 * HCI Final Project - Member A
 */

class ScrollAnalyzer {
    constructor(config) {
        this.config = config;
        
        // Current state
        this.scrollY = 0;
        this.scrollVelocity = 0;       // pixels/ms
        this.scrollDirection = 'none';  // 'up', 'down', 'none'
        this.isScrolling = false;
        this.lastScrollTime = 0;
        this.scrollIdleDuration = 0;
        
        // Reading metrics
        this.totalScrollDistance = 0;
        this.contentProgress = 0;       // 0-1, based on page height
        this.currentReadingSpeed = 0;   // pixels/ms
        this.averageReadingSpeed = 0;
        
        // Pattern detection
        this.scrollBursts = [];         // Array of burst events
        this.isJumpScrolling = false;   // Skipping content vs. smooth reading
        this.isPaused = false;
        this.pauseDuration = 0;
        this._pauseStartTime = null;
        this._pauseThreshold = 3000;    // 3s without scroll = pause
        
        // History
        this._scrollHistory = [];
        this._maxHistory = 100;
        this._lastScrollY = 0;
        this._lastScrollTime = 0;
        this._scrollDelta = 0;
        
        // Burst detection
        this._burstStartTime = null;
        this._burstScrollDistance = 0;
        this._burstThreshold = 500;     // pixels within short time = burst
        this._burstTimeWindow = 500;    // ms
    }

    /**
     * Update scroll state
     * @param {number} scrollY - Current scroll position
     * @param {number} deltaY - Scroll delta (from wheel event)
     */
    update(scrollY, deltaY) {
        const now = performance.now();
        const dt = now - this._lastScrollTime;
        
        this.scrollY = scrollY;
        this._scrollDelta = deltaY || (scrollY - this._lastScrollY);
        
        // Compute velocity
        if (dt > 0 && Math.abs(this._scrollDelta) > 0) {
            this.scrollVelocity = Math.abs(this._scrollDelta) / dt;
            this.scrollDirection = this._scrollDelta > 0 ? 'down' : 'up';
            this.isScrolling = true;
            this.lastScrollTime = now;
            this.totalScrollDistance += Math.abs(this._scrollDelta);
            
            // Detect jump scrolling (sudden large scroll)
            if (Math.abs(this._scrollDelta) > 300) {
                this.isJumpScrolling = true;
            } else {
                this.isJumpScrolling = false;
            }
            
            // Track bursts
            if (this._burstStartTime === null) {
                this._burstStartTime = now;
                this._burstScrollDistance = 0;
            }
            this._burstScrollDistance += Math.abs(this._scrollDelta);
            
            if (now - this._burstStartTime > this._burstTimeWindow) {
                if (this._burstScrollDistance > this._burstThreshold) {
                    this.scrollBursts.push({
                        startTime: this._burstStartTime,
                        duration: now - this._burstStartTime,
                        distance: this._burstScrollDistance,
                        avgVelocity: this._burstScrollDistance / (now - this._burstStartTime)
                    });
                    if (this.scrollBursts.length > 20) {
                        this.scrollBursts.shift();
                    }
                }
                this._burstStartTime = now;
                this._burstScrollDistance = 0;
            }
        } else {
            this.scrollVelocity = 0;
            this.isScrolling = false;
            this.isJumpScrolling = false;
        }
        
        // Update idle duration
        this.scrollIdleDuration = now - this.lastScrollTime;
        
        // Pause detection
        if (this.scrollIdleDuration > this._pauseThreshold) {
            if (!this.isPaused) {
                this._pauseStartTime = now;
                this.isPaused = true;
            }
            this.pauseDuration = now - this._pauseStartTime;
        } else {
            this.isPaused = false;
            this.pauseDuration = 0;
        }
        
        // Content progress
        const docHeight = Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
        );
        const windowHeight = window.innerHeight;
        const maxScroll = Math.max(1, docHeight - windowHeight);
        this.contentProgress = Math.min(1, scrollY / maxScroll);
        
        // Reading speed (smoothed)
        if (this.scrollVelocity > 0) {
            this.currentReadingSpeed = this.scrollVelocity;
            this.averageReadingSpeed = this.averageReadingSpeed * 0.95 + 
                                       this.scrollVelocity * 0.05;
        }
        
        // Store history
        this._scrollHistory.push({
            scrollY,
            velocity: this.scrollVelocity,
            direction: this.scrollDirection,
            time: now
        });
        if (this._scrollHistory.length > this._maxHistory) {
            this._scrollHistory.shift();
        }
        
        this._lastScrollY = scrollY;
        this._lastScrollTime = now;
    }

    /**
     * Get scroll features for state machine
     * @returns {Object}
     */
    getFeatures() {
        return {
            scrollY: this.scrollY,
            scrollVelocity: this.scrollVelocity,
            scrollDirection: this.scrollDirection,
            isScrolling: this.isScrolling,
            isPaused: this.isPaused,
            pauseDuration: this.pauseDuration,
            scrollIdleDuration: this.scrollIdleDuration,
            contentProgress: this.contentProgress,
            currentReadingSpeed: this.currentReadingSpeed,
            averageReadingSpeed: this.averageReadingSpeed,
            isJumpScrolling: this.isJumpScrolling,
            totalScrollDistance: this.totalScrollDistance
        };
    }

    /**
     * Get the recent scroll burst activity
     * @returns {number} Burst frequency (bursts per minute)
     */
    getBurstFrequency() {
        if (this.scrollBursts.length < 2) return 0;
        const recent = this.scrollBursts.slice(-10);
        const timeSpan = (recent[recent.length - 1].startTime - recent[0].startTime) / 60000;
        if (timeSpan < 0.1) return 0;
        return recent.length / timeSpan;
    }

    /**
     * Check if current pattern suggests reading (smooth, rhythmic scrolling)
     * @returns {boolean}
     */
    isReadingRhythm() {
        return !this.isJumpScrolling && 
               !this.isPaused && 
               this.scrollVelocity > 0 && 
               this.scrollVelocity < 2.0 &&  // Not too fast
               this.scrollDirection === 'down'; // Forward progress
    }

    /**
     * Reset analyzer
     */
    reset() {
        this.scrollY = 0;
        this.scrollVelocity = 0;
        this.scrollDirection = 'none';
        this.isScrolling = false;
        this.lastScrollTime = 0;
        this.scrollIdleDuration = 0;
        this.totalScrollDistance = 0;
        this.contentProgress = 0;
        this.currentReadingSpeed = 0;
        this.averageReadingSpeed = 0;
        this.scrollBursts = [];
        this.isJumpScrolling = false;
        this.isPaused = false;
        this.pauseDuration = 0;
        this._scrollHistory = [];
        this._pauseStartTime = null;
        this._burstStartTime = null;
        this._burstScrollDistance = 0;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScrollAnalyzer;
}
