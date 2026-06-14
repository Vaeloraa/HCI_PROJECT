/**
 * KalmanFilter2D — 二维恒速模型卡尔曼滤波器
 * 
 * 状态向量: [x, y, vx, vy]^T  (位置 + 速度)
 * 测量向量: [x, y]^T           (WebGazer 原始坐标)
 * 
 * 恒速模型假设: 视线以近似匀速移动, 加速度视为过程噪声
 */

class KalmanFilter2D {
    /**
     * @param {Object} options
     * @param {number} options.processNoise  - 过程噪声 Q 的缩放因子 (默认 0.00005)
     * @param {number} options.measureNoise  - 测量噪声 R 的缩放因子 (默认 400)
     * @param {number} options.dt            - 时间步长, 秒 (默认 1/30)
     * @param {number} options.emaAlpha      - EMA 平滑系数 (0~1, 越小越平滑, 默认 0.15)
     * @param {number} options.deadZone      - 死区阈值 px (变化小于此值不移动, 默认 2)
     */
    constructor(options = {}) {
        const {
            processNoise = 0.00005,
            measureNoise = 400,
            dt = 1 / 30,
            emaAlpha = 0.15,
            deadZone = 2,
        } = options;

        this.dt = dt;
        this.initialized = false;

        // EMA 后处理
        this.emaAlpha = emaAlpha;
        this.emaX = null;
        this.emaY = null;

        // 死区
        this.deadZone = deadZone;
        this.lastOutputX = null;
        this.lastOutputY = null;

        // ---- 状态向量 X = [x, y, vx, vy]^T ----
        this.X = [0, 0, 0, 0];

        // ---- 状态协方差矩阵 P (4×4) ----
        this.P = [
            [500, 0, 0, 0],
            [0, 500, 0, 0],
            [0, 0, 500, 0],
            [0, 0, 0, 500],
        ];

        // ---- 状态转移矩阵 F (恒速模型) ----
        // x'  = x + vx*dt
        // y'  = y + vy*dt
        // vx' = vx
        // vy' = vy
        this.F = [
            [1, 0, this.dt, 0],
            [0, 1, 0, this.dt],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
        ];

        // ---- 观测矩阵 H (只观测位置, 不直接观测速度) ----
        this.H = [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
        ];

        // ---- 过程噪声协方差 Q (4×4) ----
        // 基于恒速模型离散化: Q = G * G^T * q, 其中 G = [dt²/2, dt²/2, dt, dt]^T
        const dt2 = this.dt * this.dt / 2;
        const G = [dt2, dt2, this.dt, this.dt];
        const q = processNoise;
        this.Q = [
            [G[0] * G[0] * q, G[0] * G[1] * q, G[0] * G[2] * q, G[0] * G[3] * q],
            [G[1] * G[0] * q, G[1] * G[1] * q, G[1] * G[2] * q, G[1] * G[3] * q],
            [G[2] * G[0] * q, G[2] * G[1] * q, G[2] * G[2] * q, G[2] * G[3] * q],
            [G[3] * G[0] * q, G[3] * G[1] * q, G[3] * G[2] * q, G[3] * G[3] * q],
        ];

        // ---- 测量噪声协方差 R (2×2) ----
        this.R = [
            [measureNoise, 0],
            [0, measureNoise],
        ];

        // ---- 单位矩阵 I (4×4), 用于后续计算 ----
        this.I = [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
        ];

        // 输出
        this.smoothedX = 0;
        this.smoothedY = 0;
    }

    // ==================== 矩阵运算辅助函数 ====================

    /** 矩阵乘法 A·B */
    static matMul(A, B) {
        const rowsA = A.length;
        const colsA = A[0].length;
        const colsB = B[0].length;
        const result = Array.from({ length: rowsA }, () =>
            new Array(colsB).fill(0)
        );
        for (let i = 0; i < rowsA; i++) {
            for (let j = 0; j < colsB; j++) {
                let sum = 0;
                for (let k = 0; k < colsA; k++) {
                    sum += A[i][k] * B[k][j];
                }
                result[i][j] = sum;
            }
        }
        return result;
    }

    /** 矩阵加法 */
    static matAdd(A, B) {
        return A.map((row, i) => row.map((val, j) => val + B[i][j]));
    }

    /** 矩阵减法 */
    static matSub(A, B) {
        return A.map((row, i) => row.map((val, j) => val - B[i][j]));
    }

    /** 矩阵转置 */
    static matTranspose(A) {
        return A[0].map((_, col) => A.map((row) => row[col]));
    }

    /** 2×2 矩阵求逆 (用于 (HPHᵀ + R) 求逆) */
    static matInverse2x2(M) {
        const det = M[0][0] * M[1][1] - M[0][1] * M[1][0];
        if (Math.abs(det) < 1e-12) return M;
        return [
            [M[1][1] / det, -M[0][1] / det],
            [-M[1][0] / det, M[0][0] / det],
        ];
    }

    // ==================== 核心滤波方法 ====================

    /**
     * 输入新的测量值, 返回滤波后的坐标
     * @param {number} measuredX - WebGazer 原始 x
     * @param {number} measuredY - WebGazer 原始 y
     * @returns {{ x: number, y: number }} 平滑后的坐标
     */
    update(measuredX, measuredY) {
        if (!this.initialized) {
            // 首次测量: 直接用测量值初始化状态
            this.X = [measuredX, measuredY, 0, 0];
            this.smoothedX = measuredX;
            this.smoothedY = measuredY;
            this.initialized = true;
            return { x: measuredX, y: measuredY };
        }

        /* ───── 1. 预测步骤 ───── */
        // X' = F·X
        const X_pred = KalmanFilter2D.matMul(this.F, [
            [this.X[0]],
            [this.X[1]],
            [this.X[2]],
            [this.X[3]],
        ]);
        // P' = F·P·Fᵀ + Q
        const P_pred = KalmanFilter2D.matAdd(
            KalmanFilter2D.matMul(
                KalmanFilter2D.matMul(this.F, this.P),
                KalmanFilter2D.matTranspose(this.F)
            ),
            this.Q
        );

        /* ───── 2. 更新步骤 ───── */
        // 创新(残差) Y = Z - H·X_pred
        const Z = [[measuredX], [measuredY]]; // 测量值 Z

        // H·X_pred
        const HX = KalmanFilter2D.matMul(this.H, X_pred);
        const Y = KalmanFilter2D.matSub(Z, HX); // 创新

        // S = H·P_pred·Hᵀ + R (创新协方差)
        const S = KalmanFilter2D.matAdd(
            KalmanFilter2D.matMul(
                KalmanFilter2D.matMul(this.H, P_pred),
                KalmanFilter2D.matTranspose(this.H)
            ),
            this.R
        );

        // 卡尔曼增益 K = P_pred·Hᵀ·S⁻¹
        const S_inv = KalmanFilter2D.matInverse2x2(S);
        const K = KalmanFilter2D.matMul(
            KalmanFilter2D.matMul(P_pred, KalmanFilter2D.matTranspose(this.H)),
            S_inv
        );

        // X = X_pred + K·Y
        const KY = KalmanFilter2D.matMul(K, Y);
        this.X = [
            X_pred[0][0] + KY[0][0],
            X_pred[1][0] + KY[1][0],
            X_pred[2][0] + KY[2][0],
            X_pred[3][0] + KY[3][0],
        ];

        // P = (I - K·H)·P_pred
        const KH = KalmanFilter2D.matMul(K, this.H);
        const I_KH = KalmanFilter2D.matSub(this.I, KH);
        this.P = KalmanFilter2D.matMul(I_KH, P_pred);

        // 输出平滑后的坐标 (卡尔曼原始输出)
        this.smoothedX = this.X[0];
        this.smoothedY = this.X[1];

        // ---- 后处理 1: EMA (指数移动平均) ----
        if (this.emaX === null) {
            this.emaX = this.smoothedX;
            this.emaY = this.smoothedY;
        } else {
            this.emaX = this.emaAlpha * this.smoothedX + (1 - this.emaAlpha) * this.emaX;
            this.emaY = this.emaAlpha * this.smoothedY + (1 - this.emaAlpha) * this.emaY;
        }

        // ---- 后处理 2: 死区 ----
        var outX = this.emaX;
        var outY = this.emaY;
        if (this.lastOutputX !== null && this.lastOutputY !== null) {
            var dx = outX - this.lastOutputX;
            var dy = outY - this.lastOutputY;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < this.deadZone) {
                // 微小移动视为噪声，保持原位
                outX = this.lastOutputX;
                outY = this.lastOutputY;
            }
        }
        this.lastOutputX = outX;
        this.lastOutputY = outY;

        return { x: outX, y: outY };
    }

    /** 重置滤波器状态 */
    reset() {
        this.initialized = false;
        this.X = [0, 0, 0, 0];
        this.P = [
            [500, 0, 0, 0],
            [0, 500, 0, 0],
            [0, 0, 500, 0],
            [0, 0, 0, 500],
        ];
        this.smoothedX = 0;
        this.smoothedY = 0;
        this.emaX = null;
        this.emaY = null;
        this.lastOutputX = null;
        this.lastOutputY = null;
    }

    /** 动态调整测量噪声 (调参用) */
    setMeasureNoise(measureNoise) {
        this.R = [
            [measureNoise, 0],
            [0, measureNoise],
        ];
    }

    /** 动态调整过程噪声 (调参用) */
    setProcessNoise(processNoise) {
        const dt2 = this.dt * this.dt / 2;
        const G = [dt2, dt2, this.dt, this.dt];
        const q = processNoise;
        this.Q = [
            [G[0] * G[0] * q, G[0] * G[1] * q, G[0] * G[2] * q, G[0] * G[3] * q],
            [G[1] * G[0] * q, G[1] * G[1] * q, G[1] * G[2] * q, G[1] * G[3] * q],
            [G[2] * G[0] * q, G[2] * G[1] * q, G[2] * G[2] * q, G[2] * G[3] * q],
            [G[3] * G[0] * q, G[3] * G[1] * q, G[3] * G[2] * q, G[3] * G[3] * q],
        ];
    }
}

// 挂载到全局, 方便其他模块引用
if (typeof window !== 'undefined') {
    window.KalmanFilter2D = KalmanFilter2D;
}

// 支持 Node.js 环境
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KalmanFilter2D;
}