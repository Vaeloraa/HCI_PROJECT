/**
 * FocusFlow - Face Detection Module
 * 
 * Perception Layer: Detects face presence and extracts facial features
 * Uses WebGazer facemesh data to determine if user is present
 * and extract face bounding box information.
 * 
 * HCI Final Project - Member A
 */

class FaceDetection {
    constructor(config) {
        this.config = config;
        this.facePresent = false;
        this.faceConfidence = 0;
        this.lastFaceTime = 0;
        this.facePositions = null;
        this.noFaceStartTime = null;
        
        // Face absence tracking
        this.faceAbsentDuration = 0;
        this.facePresentDuration = 0;
        
        // Smoothing
        this._history = [];
        this._historyMax = 10;
    }

    /**
     * Update face detection from WebGazer tracker data
     * @param {Object} positions - Face landmarks from tracker.getPositions()
     */
    update(positions) {
        const now = performance.now();
        
        if (positions && positions.length > 0) {
            this.facePresent = true;
            this.faceConfidence = 0.9;
            this.facePositions = positions;
            this.lastFaceTime = now;
            
            if (this.noFaceStartTime !== null) {
                this.faceAbsentDuration = now - this.noFaceStartTime;
                this.noFaceStartTime = null;
            }
            this.facePresentDuration = this.facePresentDuration * 0.9 + 100 * 0.1;
        } else {
            this.facePresent = false;
            this.faceConfidence = Math.max(0, this.faceConfidence - 0.1);
            
            if (this.noFaceStartTime === null) {
                this.noFaceStartTime = now;
            }
            this.faceAbsentDuration = now - this.noFaceStartTime;
            this.facePresentDuration = this.facePresentDuration * 0.9;
        }
        
        // Update history for smoothing
        this._history.push(this.facePresent ? 1 : 0);
        if (this._history.length > this._historyMax) {
            this._history.shift();
        }
    }

    /**
     * Get smoothed face presence (with hysteresis)
     */
    isFacePresent() {
        if (this._history.length < 3) return this.facePresent;
        const avg = this._history.reduce((a, b) => a + b, 0) / this._history.length;
        return avg > 0.3; // Threshold with hysteresis
    }

    /**
     * Get face absence duration in milliseconds
     */
    getFaceAbsentDuration() {
        return this.faceAbsentDuration;
    }

    /**
     * Get face bounding box from landmarks
     * @returns {Object|null} {x, y, width, height}
     */
    getFaceBoundingBox() {
        if (!this.facePositions || this.facePositions.length === 0) return null;
        
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        for (const pt of this.facePositions) {
            if (pt[0] < minX) minX = pt[0];
            if (pt[1] < minY) minY = pt[1];
            if (pt[0] > maxX) maxX = pt[0];
            if (pt[1] > maxY) maxY = pt[1];
        }
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    /**
     * Reset face detection state
     */
    reset() {
        this.facePresent = false;
        this.faceConfidence = 0;
        this.lastFaceTime = 0;
        this.facePositions = null;
        this.noFaceStartTime = null;
        this.faceAbsentDuration = 0;
        this.facePresentDuration = 0;
        this._history = [];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FaceDetection;
}
