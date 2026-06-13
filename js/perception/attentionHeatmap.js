/**
 * FocusFlow - Attention Heatmap Module
 * 
 * Perception Layer: Creates and manages attention heatmap data
 * from both gaze and mouse positions to visualize where the user
 * is focusing their attention over time.
 * 
 * HCI Final Project - Member A
 */

class AttentionHeatmap {
    constructor(config) {
        this.config = config;
        
        // Heatmap data points
        this.points = [];
        this._maxPoints = 2000;
        
        // Grid-based heatmap (reduced resolution for performance)
        this.gridResolution = 20;  // pixels per cell
        this.grid = {};
        
        // Time window
        this.currentWindow = 30000; // 30 seconds
        this.attentionCenter = { x: 0, y: 0, confidence: 0 };
    }

    /**
     * Add a gaze/mouse data point
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} weight - Weight/confidence of this point
     * @param {string} source - 'gaze' or 'mouse'
     */
    addPoint(x, y, weight = 1.0, source = 'gaze') {
        const now = performance.now();
        
        this.points.push({ x, y, weight, source, time: now });
        if (this.points.length > this._maxPoints) {
            this.points.shift();
        }
        
        // Update grid
        const gridX = Math.floor(x / this.gridResolution);
        const gridY = Math.floor(y / this.gridResolution);
        const key = gridX + ',' + gridY;
        
        if (!this.grid[key]) {
            this.grid[key] = { x: gridX * this.gridResolution, y: gridY * this.gridResolution, weight: 0, count: 0 };
        }
        this.grid[key].weight += weight;
        this.grid[key].count += 1;
        
        // Update attention center
        this._recomputeCenter();
    }

    /**
     * Get attention center (weighted centroid)
     * @returns {Object} {x, y, confidence}
     */
    _recomputeCenter() {
        const recentPoints = this.getRecentPoints(this.currentWindow);
        if (recentPoints.length === 0) {
            this.attentionCenter = { x: 0, y: 0, confidence: 0 };
            return;
        }
        
        let totalWeight = 0;
        let sumX = 0, sumY = 0;
        
        for (const pt of recentPoints) {
            sumX += pt.x * pt.weight;
            sumY += pt.y * pt.weight;
            totalWeight += pt.weight;
        }
        
        if (totalWeight > 0) {
            this.attentionCenter = {
                x: sumX / totalWeight,
                y: sumY / totalWeight,
                confidence: Math.min(1, totalWeight / recentPoints.length)
            };
        }
    }

    /**
     * Get points from the last N milliseconds
     * @param {number} [timeWindow=30000] - Time window in ms
     * @returns {Array}
     */
    getRecentPoints(timeWindow = 30000) {
        const cutoff = performance.now() - timeWindow;
        return this.points.filter(p => p.time > cutoff);
    }

    /**
     * Get heatmap grid data for rendering
     * @param {number} [timeWindow=30000] - Time window
     * @returns {Array} Grid cells with weight
     */
    getGridData(timeWindow = 30000) {
        const cutoff = performance.now() - timeWindow;
        const result = [];
        
        for (const key in this.grid) {
            result.push({
                x: this.grid[key].x,
                y: this.grid[key].y,
                weight: this.grid[key].weight,
                count: this.grid[key].count
            });
        }
        
        return result;
    }

    /**
     * Get normalized heatmap values (0-1) for each grid cell
     * @param {number} [timeWindow=30000]
     * @returns {Array}
     */
    getNormalizedGrid(timeWindow = 30000) {
        const gridData = this.getGridData(timeWindow);
        const maxWeight = Math.max(...gridData.map(g => g.weight), 1);
        
        return gridData.map(g => ({
            x: g.x,
            y: g.y,
            value: g.weight / maxWeight,
            count: g.count
        }));
    }

    /**
     * Get attention features for state machine
     * @returns {Object}
     */
    getFeatures() {
        const recent = this.getRecentPoints(5000); // 5s window
        const dispersion = this._computeDispersion(recent);
        
        return {
            attentionX: this.attentionCenter.x,
            attentionY: this.attentionCenter.y,
            attentionConfidence: this.attentionCenter.confidence,
            dispersion: dispersion,
            pointCount: recent.length,
            gazeRatio: recent.filter(p => p.source === 'gaze').length / Math.max(1, recent.length)
        };
    }

    /**
     * Compute spatial dispersion of attention points
     * High dispersion = scattered attention (possibly distracted)
     * Low dispersion = focused attention
     * @param {Array} points
     * @returns {number} Standard deviation of distances from center
     */
    _computeDispersion(points) {
        if (points.length < 3) return 0;
        
        const cx = this.attentionCenter.x;
        const cy = this.attentionCenter.y;
        
        const distances = points.map(p => {
            return Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
        });
        
        const mean = distances.reduce((a, b) => a + b, 0) / distances.length;
        const variance = distances.reduce((a, b) => a + (b - mean) ** 2, 0) / distances.length;
        
        return Math.sqrt(variance);
    }

    /**
     * Clear heatmap data
     */
    clear() {
        this.points = [];
        this.grid = {};
        this.attentionCenter = { x: 0, y: 0, confidence: 0 };
    }

    /**
     * Reset
     */
    reset() {
        this.clear();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AttentionHeatmap;
}
