/**
 * FocusFlow - Gaze Region Mapping Module
 * 
 * Perception Layer: Maps raw gaze coordinates (from WebGazer)
 * to coarse-grained screen regions for attention analysis.
 * 
 * Divides the viewport into a 3x3 grid:
 *   Top-Left    | Top-Center    | Top-Right
 *   Center-Left | Center-Center | Center-Right
 *   Bottom-Left | Bottom-Center | Bottom-Right
 * 
 * HCI Final Project - Member A
 */

class GazeRegionMapping {
    constructor(config) {
        this.config = config;
        
        // Current gaze data
        this.gazeX = 0;
        this.gazeY = 0;
        this.gazeConfidence = 0;
        this.isValid = false;
        
        // Current region
        this.currentRegion = { row: 1, col: 1, name: 'center-center' };
        
        // Region dwell times
        this.regionDwellTimes = {};
        this._regionEntryTimes = {};
        
        // Gaze trail for heatmap
        this.gazeTrail = [];
        this._maxTrailLength = 500;
        
        // Region visit counts
        this.regionVisitCounts = {
            'top-left': 0, 'top-center': 0, 'top-right': 0,
            'center-left': 0, 'center-center': 0, 'center-right': 0,
            'bottom-left': 0, 'bottom-center': 0, 'bottom-right': 0
        };
        
        // Grid configuration
        this.gridRows = 3;
        this.gridCols = 3;
    }

    /**
     * Update gaze position and map to region
     * @param {number} x - Gaze X coordinate (viewport relative)
     * @param {number} y - Gaze Y coordinate (viewport relative)
     * @param {number} confidence - Prediction confidence
     */
    update(x, y, confidence) {
        this.gazeX = x;
        this.gazeY = y;
        this.gazeConfidence = confidence || 0.5;
        this.isValid = x >= 0 && y >= 0;
        
        if (!this.isValid) return;
        
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const now = performance.now();
        
        // Calculate grid cell
        const cellWidth = viewportWidth / this.gridCols;
        const cellHeight = viewportHeight / this.gridRows;
        
        const col = Math.min(Math.floor(x / cellWidth), this.gridCols - 1);
        const row = Math.min(Math.floor(y / cellHeight), this.gridRows - 1);
        
        // Map to region name
        const rowNames = ['top', 'center', 'bottom'];
        const colNames = ['left', 'center', 'right'];
        const regionName = rowNames[row] + '-' + colNames[col];
        
        const prevRegion = this.currentRegion;
        this.currentRegion = { row, col, name: regionName };
        
        // Track dwell time per region
        if (this.currentRegion.name !== prevRegion.name) {
            // Record dwell time for previous region
            if (prevRegion.name && this._regionEntryTimes[prevRegion.name]) {
                const dwellTime = now - this._regionEntryTimes[prevRegion.name];
                if (!this.regionDwellTimes[prevRegion.name]) {
                    this.regionDwellTimes[prevRegion.name] = [];
                }
                this.regionDwellTimes[prevRegion.name].push(dwellTime);
                // Keep only recent 20 dwell times
                if (this.regionDwellTimes[prevRegion.name].length > 20) {
                    this.regionDwellTimes[prevRegion.name].shift();
                }
            }
            
            // Start tracking new region
            this._regionEntryTimes[regionName] = now;
            this.regionVisitCounts[regionName] = (this.regionVisitCounts[regionName] || 0) + 1;
        }
        
        // Add to gaze trail
        this.gazeTrail.push({ x, y, time: now, region: regionName });
        if (this.gazeTrail.length > this._maxTrailLength) {
            this.gazeTrail.shift();
        }
    }

    /**
     * Get current region dwell time in ms
     * @returns {number}
     */
    getCurrentRegionDwellTime() {
        const regionName = this.currentRegion.name;
        if (this._regionEntryTimes[regionName]) {
            return performance.now() - this._regionEntryTimes[regionName];
        }
        return 0;
    }

    /**
     * Get average dwell time for a region
     * @param {string} regionName
     * @returns {number} Average dwell time in ms
     */
    getAverageDwellTime(regionName) {
        const times = this.regionDwellTimes[regionName];
        if (!times || times.length === 0) return 0;
        return times.reduce((a, b) => a + b, 0) / times.length;
    }

    /**
     * Get the most viewed region
     * @returns {string} Region name with most visits
     */
    getMostViewedRegion() {
        let maxCount = 0;
        let maxRegion = 'center-center';
        for (const [region, count] of Object.entries(this.regionVisitCounts)) {
            if (count > maxCount) {
                maxCount = count;
                maxRegion = region;
            }
        }
        return maxRegion;
    }

    /**
     * Get gaze features for state machine
     * @returns {Object}
     */
    getFeatures() {
        return {
            gazeX: this.gazeX,
            gazeY: this.gazeY,
            currentRegion: this.currentRegion.name,
            dwellTime: this.getCurrentRegionDwellTime(),
            isValid: this.isValid,
            confidence: this.gazeConfidence
        };
    }

    /**
     * Get gaze trail data for heatmap visualization
     * @param {number} [seconds=10] - Get trail from last N seconds
     * @returns {Array} Array of {x, y, time} objects
     */
    getRecentTrail(seconds = 10) {
        const cutoff = performance.now() - (seconds * 1000);
        return this.gazeTrail.filter(p => p.time > cutoff);
    }

    /**
     * Reset all gaze data
     */
    reset() {
        this.gazeX = 0;
        this.gazeY = 0;
        this.gazeConfidence = 0;
        this.isValid = false;
        this.currentRegion = { row: 1, col: 1, name: 'center-center' };
        this.regionDwellTimes = {};
        this._regionEntryTimes = {};
        this.gazeTrail = [];
        this.regionVisitCounts = {
            'top-left': 0, 'top-center': 0, 'top-right': 0,
            'center-left': 0, 'center-center': 0, 'center-right': 0,
            'bottom-left': 0, 'bottom-center': 0, 'bottom-right': 0
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GazeRegionMapping;
}
