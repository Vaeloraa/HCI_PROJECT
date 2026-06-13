/**
 * FocusFlow - Head Pose Estimation Module
 * 
 * Perception Layer: Estimates head orientation (pitch, yaw, roll)
 * from face landmarks to determine gaze direction region (up/center/down).
 * 
 * Uses the 468-point MediaPipe facemesh landmarks.
 * Key landmark indices for pose estimation:
 *   - Nose tip: 1
 *   - Left eye outer: 33
 *   - Right eye outer: 263
 *   - Mouth left: 61
 *   - Mouth right: 291
 *   - Chin: 199
 * 
 * HCI Final Project - Member A
 */

class HeadPoseEstimation {
    constructor(config) {
        this.config = config;
        
        // Current pose
        this.pitch = 0;  // Up/Down (positive = looking down)
        this.yaw = 0;    // Left/Right (positive = looking right)
        this.roll = 0;   // Tilt
        
        // Smoothed values
        this.smoothPitch = 0;
        this.smoothYaw = 0;
        this.smoothRoll = 0;
        
        // Gaze region
        this.verticalRegion = 'center'; // 'up', 'center', 'down'
        this.horizontalRegion = 'center'; // 'left', 'center', 'right'
        
        // Smoothing factor (0-1, higher = smoother)
        this.smoothingFactor = 0.7;
        
        // Region thresholds (degrees)
        this.verticalThreshold = 15;
        this.horizontalThreshold = 15;
        
        // History
        this._pitchHistory = [];
        this._yawHistory = [];
        this._maxHistory = 5;
    }

    /**
     * Update head pose from face landmarks
     * @param {Array} landmarks - 468-point facemesh landmarks array [[x,y,z],...]
     */
    update(landmarks) {
        if (!landmarks || landmarks.length < 468) {
            return;
        }
        
        // Extract key facial points
        const noseTip = landmarks[1];
        const leftEyeOuter = landmarks[33];
        const rightEyeOuter = landmarks[263];
        const leftMouth = landmarks[61];
        const rightMouth = landmarks[291];
        const chin = landmarks[199];
        const forehead = landmarks[10];
        
        if (!noseTip || !leftEyeOuter || !rightEyeOuter) {
            return;
        }
        
        // Calculate eye center
        const eyeCenterX = (leftEyeOuter[0] + rightEyeOuter[0]) / 2;
        const eyeCenterY = (leftEyeOuter[1] + rightEyeOuter[1]) / 2;
        const eyeCenterZ = (leftEyeOuter[2] + rightEyeOuter[2]) / 2;
        
        // Calculate face center
        const faceCenterX = eyeCenterX;
        const faceCenterY = (forehead[1] + chin[1]) / 2;
        const faceCenterZ = (forehead[2] + chin[2]) / 2;
        
        // YAW: Horizontal rotation - based on nose offset from face center
        const yawRaw = (noseTip[0] - faceCenterX) / (rightEyeOuter[0] - leftEyeOuter[0] + 0.001) * 60;
        this.yaw = Math.max(-45, Math.min(45, yawRaw));
        
        // PITCH: Vertical rotation - based on nose vertical offset
        const faceHeight = chin[1] - forehead[1];
        const pitchRaw = (noseTip[1] - eyeCenterY) / (faceHeight + 0.001) * 45;
        this.pitch = Math.max(-30, Math.min(30, pitchRaw));
        
        // ROLL: Head tilt - based on eye angle
        const eyeAngle = Math.atan2(
            rightEyeOuter[1] - leftEyeOuter[1],
            rightEyeOuter[0] - leftEyeOuter[0]
        ) * (180 / Math.PI);
        this.roll = eyeAngle;
        
        // Apply smoothing
        this.smoothPitch = this.smoothPitch * this.smoothingFactor + 
                          this.pitch * (1 - this.smoothingFactor);
        this.smoothYaw = this.smoothYaw * this.smoothingFactor + 
                        this.yaw * (1 - this.smoothingFactor);
        this.smoothRoll = this.smoothRoll * this.smoothingFactor + 
                         this.roll * (1 - this.smoothingFactor);
        
        // Determine vertical gaze region
        if (this.smoothPitch < -this.verticalThreshold) {
            this.verticalRegion = 'up';
        } else if (this.smoothPitch > this.verticalThreshold) {
            this.verticalRegion = 'down';
        } else {
            this.verticalRegion = 'center';
        }
        
        // Determine horizontal gaze region
        if (this.smoothYaw < -this.horizontalThreshold) {
            this.horizontalRegion = 'left';
        } else if (this.smoothYaw > this.horizontalThreshold) {
            this.horizontalRegion = 'right';
        } else {
            this.horizontalRegion = 'center';
        }
        
        // Update history
        this._pitchHistory.push(this.smoothPitch);
        this._yawHistory.push(this.smoothYaw);
        if (this._pitchHistory.length > this._maxHistory) {
            this._pitchHistory.shift();
            this._yawHistory.shift();
        }
    }

    /**
     * Get the current gaze region label
     * @returns {string} Combined region like 'up-left', 'center', 'down-right', etc.
     */
    getGazeRegion() {
        return this.verticalRegion + '-' + this.horizontalRegion;
    }

    /**
     * Get a simplified gaze direction
     * @returns {string} 'up', 'down', 'left', 'right', 'center'
     */
    getSimpleDirection() {
        if (Math.abs(this.smoothPitch) > Math.abs(this.smoothYaw)) {
            return this.verticalRegion;
        }
        return this.horizontalRegion;
    }

    /**
     * Get head pose data for feature vector
     * @returns {Object} { pitch, yaw, roll, verticalRegion, horizontalRegion }
     */
    getFeatures() {
        return {
            pitch: this.smoothPitch,
            yaw: this.smoothYaw,
            roll: this.smoothRoll,
            verticalRegion: this.verticalRegion,
            horizontalRegion: this.horizontalRegion,
            gazeRegion: this.getGazeRegion()
        };
    }

    /**
     * Reset head pose estimation
     */
    reset() {
        this.pitch = 0;
        this.yaw = 0;
        this.roll = 0;
        this.smoothPitch = 0;
        this.smoothYaw = 0;
        this.smoothRoll = 0;
        this.verticalRegion = 'center';
        this.horizontalRegion = 'center';
        this._pitchHistory = [];
        this._yawHistory = [];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = HeadPoseEstimation;
}
