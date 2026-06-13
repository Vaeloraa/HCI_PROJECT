/**
 * FocusFlow - Mouse Tracker Module
 * 
 * Perception Layer: Analyzes mouse movement patterns to detect
 * behavioral signals:
 *   - Mouse velocity (indicating active engagement)
 *   - Mouse trajectory (following text lines vs random movement)
 *   - Click patterns
 *   - Idle periods
 * 
 * HCI Final Project - Member A
 */

class MouseTracker {
    constructor(config) {
        this.config = config;
        
        // Current state
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseVelocity = 0;        // pixels/ms
        this.mouseAcceleration = 0;
        this.isMoving = false;
        this.lastMoveTime = 0;
        this.idleDuration = 0;
        
        // Movement history
        this.positionHistory = [];
        this.velocityHistory = [];
        this._maxHistory = 50;
        this._lastPosition = { x: 0, y: 0, time: 0 };
        this._moveThreshold = 2;        // Minimum pixels to register a move
        this._idleThreshold = 2000;     // 2s without movement = idle
        
        // Smoothing
        this.smoothVelocity = 0;
        this._smoothingFactor = 0.8;
        
        // Behavioral features
        this.horizontalMovementRatio = 0.5;  // 0-1, ratio of horizontal vs vertical
        this.movementDirectionChanges = 0;    // Number of direction changes
        this._lastDirection = null;
        this._directionChangeCount = 0;
    }

    /**
     * Update with latest mouse position
     * @param {number} x - Mouse X position
     * @param {number} y - Mouse Y position
     */
    update(x, y) {
        const now = performance.now();
        const dx = x - this._lastPosition.x;
        const dy = y - this._lastPosition.y;
        const dt = now - this._lastPosition.time;
        
        this.mouseX = x;
        this.mouseY = y;
        
        // Compute velocity (pixels per second)
        if (dt > 0) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > this._moveThreshold) {
                this.mouseVelocity = distance / dt;  // pixels/ms
                this.smoothVelocity = this.smoothVelocity * this._smoothingFactor + 
                                      this.mouseVelocity * (1 - this._smoothingFactor);
                this.isMoving = true;
                this.lastMoveTime = now;
                
                // Track movement direction
                if (Math.abs(dx) > Math.abs(dy)) {
                    const newDir = dx > 0 ? 'right' : 'left';
                    if (this._lastDirection && this._lastDirection !== newDir) {
                        this._directionChangeCount++;
                    }
                    this._lastDirection = newDir;
                } else {
                    const newDir = dy > 0 ? 'down' : 'up';
                    if (this._lastDirection && this._lastDirection !== newDir) {
                        this._directionChangeCount++;
                    }
                    this._lastDirection = newDir;
                }
                
                // Compute horizontal movement ratio
                if (distance > 0) {
                    this.horizontalMovementRatio = Math.abs(dx) / distance;
                }
            } else {
                this.mouseVelocity = 0;
                this.isMoving = false;
            }
        }
        
        // Update idle duration
        this.idleDuration = now - this.lastMoveTime;
        
        // Compute acceleration
        this.velocityHistory.push(this.mouseVelocity);
        if (this.velocityHistory.length > 2) {
            const v0 = this.velocityHistory[this.velocityHistory.length - 2];
            const v1 = this.velocityHistory[this.velocityHistory.length - 1];
            this.mouseAcceleration = (v1 - v0) / (dt || 1);
        }
        if (this.velocityHistory.length > this._maxHistory) {
            this.velocityHistory.shift();
        }
        
        // Store position
        this.positionHistory.push({ x, y, time: now, velocity: this.mouseVelocity });
        if (this.positionHistory.length > this._maxHistory) {
            this.positionHistory.shift();
        }
        
        this._lastPosition = { x, y, time: now };
    }

    /**
     * Get current mouse features for state machine
     * @returns {Object}
     */
    getFeatures() {
        return {
            mouseX: this.mouseX,
            mouseY: this.mouseY,
            mouseVelocity: this.smoothVelocity,
            mouseAcceleration: this.mouseAcceleration,
            isMoving: this.isMoving,
            idleDuration: this.idleDuration,
            isIdle: this.idleDuration > this._idleThreshold,
            horizontalMovementRatio: this.horizontalMovementRatio,
            directionChanges: this._directionChangeCount
        };
    }

    /**
     * Check if mouse movement suggests reading behavior
     * Reading typically: horizontal movement, smooth, rhythmic
     * @returns {boolean}
     */
    isReadingPattern() {
        // Reading usually has high horizontal ratio and low acceleration
        return this.horizontalMovementRatio > 0.6 && 
               this.mouseAcceleration < 0.5 &&
               this.isMoving;
    }

    /**
     * Check if mouse movement suggests searching/scanning
     * Searching: erratic, high direction changes, high velocity
     * @returns {boolean}
     */
    isSearchingPattern() {
        return this._directionChangeCount > 5 && 
               this.smoothVelocity > 1.0;
    }

    /**
     * Get average velocity over recent history
     * @param {number} [window=10] - Number of recent samples
     * @returns {number}
     */
    getAverageVelocity(window = 10) {
        const recent = this.velocityHistory.slice(-window);
        if (recent.length === 0) return 0;
        return recent.reduce((a, b) => a + b, 0) / recent.length;
    }

    /**
     * Reset mouse tracker
     */
    reset() {
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseVelocity = 0;
        this.smoothVelocity = 0;
        this.mouseAcceleration = 0;
        this.isMoving = false;
        this.lastMoveTime = 0;
        this.idleDuration = 0;
        this.positionHistory = [];
        this.velocityHistory = [];
        this.horizontalMovementRatio = 0.5;
        this._directionChangeCount = 0;
        this._lastDirection = null;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MouseTracker;
}
