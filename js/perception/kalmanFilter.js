/**
 * FocusFlow - 2D Kalman gaze smoother.
 *
 * Constant-velocity model for WebGazer coordinates:
 * state = [x, y, vx, vy].
 */
class KalmanFilter2D {
    constructor(options = {}) {
        const {
            processNoise = 0.00005,
            measureNoise = 400,
            dt = 1 / 30,
            emaAlpha = 0.15,
            deadZone = 2
        } = options;

        this.dt = dt;
        this.emaAlpha = emaAlpha;
        this.deadZone = deadZone;
        this.initialized = false;
        this.X = [0, 0, 0, 0];
        this.P = [
            [500, 0, 0, 0],
            [0, 500, 0, 0],
            [0, 0, 500, 0],
            [0, 0, 0, 500]
        ];
        this.F = [
            [1, 0, dt, 0],
            [0, 1, 0, dt],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ];
        this.H = [
            [1, 0, 0, 0],
            [0, 1, 0, 0]
        ];

        const dt2 = dt * dt / 2;
        const g = [dt2, dt2, dt, dt];
        this.Q = g.map((a) => g.map((b) => a * b * processNoise));
        this.R = [
            [measureNoise, 0],
            [0, measureNoise]
        ];
        this.I = [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ];

        this.emaX = null;
        this.emaY = null;
        this.lastOutputX = null;
        this.lastOutputY = null;
    }

    static matMul(A, B) {
        const result = Array.from({ length: A.length }, () => new Array(B[0].length).fill(0));
        for (let i = 0; i < A.length; i++) {
            for (let j = 0; j < B[0].length; j++) {
                for (let k = 0; k < A[0].length; k++) {
                    result[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        return result;
    }

    static matAdd(A, B) {
        return A.map((row, i) => row.map((value, j) => value + B[i][j]));
    }

    static matSub(A, B) {
        return A.map((row, i) => row.map((value, j) => value - B[i][j]));
    }

    static matTranspose(A) {
        return A[0].map((_, col) => A.map((row) => row[col]));
    }

    static matInverse2x2(M) {
        const det = M[0][0] * M[1][1] - M[0][1] * M[1][0];
        if (Math.abs(det) < 1e-12) return M;
        return [
            [M[1][1] / det, -M[0][1] / det],
            [-M[1][0] / det, M[0][0] / det]
        ];
    }

    update(measuredX, measuredY) {
        if (!Number.isFinite(measuredX) || !Number.isFinite(measuredY)) {
            return {
                x: this.lastOutputX || 0,
                y: this.lastOutputY || 0
            };
        }

        if (!this.initialized) {
            this.X = [measuredX, measuredY, 0, 0];
            this.emaX = measuredX;
            this.emaY = measuredY;
            this.lastOutputX = measuredX;
            this.lastOutputY = measuredY;
            this.initialized = true;
            return { x: measuredX, y: measuredY };
        }

        const xPred = KalmanFilter2D.matMul(this.F, [
            [this.X[0]],
            [this.X[1]],
            [this.X[2]],
            [this.X[3]]
        ]);
        const pPred = KalmanFilter2D.matAdd(
            KalmanFilter2D.matMul(
                KalmanFilter2D.matMul(this.F, this.P),
                KalmanFilter2D.matTranspose(this.F)
            ),
            this.Q
        );

        const z = [[measuredX], [measuredY]];
        const innovation = KalmanFilter2D.matSub(z, KalmanFilter2D.matMul(this.H, xPred));
        const innovationCovariance = KalmanFilter2D.matAdd(
            KalmanFilter2D.matMul(
                KalmanFilter2D.matMul(this.H, pPred),
                KalmanFilter2D.matTranspose(this.H)
            ),
            this.R
        );
        const gain = KalmanFilter2D.matMul(
            KalmanFilter2D.matMul(pPred, KalmanFilter2D.matTranspose(this.H)),
            KalmanFilter2D.matInverse2x2(innovationCovariance)
        );
        const correction = KalmanFilter2D.matMul(gain, innovation);

        this.X = [
            xPred[0][0] + correction[0][0],
            xPred[1][0] + correction[1][0],
            xPred[2][0] + correction[2][0],
            xPred[3][0] + correction[3][0]
        ];

        const identityMinusGain = KalmanFilter2D.matSub(this.I, KalmanFilter2D.matMul(gain, this.H));
        this.P = KalmanFilter2D.matMul(identityMinusGain, pPred);

        this.emaX = this.emaAlpha * this.X[0] + (1 - this.emaAlpha) * this.emaX;
        this.emaY = this.emaAlpha * this.X[1] + (1 - this.emaAlpha) * this.emaY;

        let outputX = this.emaX;
        let outputY = this.emaY;
        if (this.lastOutputX !== null && this.lastOutputY !== null) {
            const dx = outputX - this.lastOutputX;
            const dy = outputY - this.lastOutputY;
            if (Math.sqrt(dx * dx + dy * dy) < this.deadZone) {
                outputX = this.lastOutputX;
                outputY = this.lastOutputY;
            }
        }

        this.lastOutputX = outputX;
        this.lastOutputY = outputY;
        return { x: outputX, y: outputY };
    }

    reset() {
        this.initialized = false;
        this.emaX = null;
        this.emaY = null;
        this.lastOutputX = null;
        this.lastOutputY = null;
        this.X = [0, 0, 0, 0];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = KalmanFilter2D;
}
