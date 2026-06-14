/**
 * ws-client.js — WebSocket 客户端 (A 模块浏览器端)
 * 
 * 功能:
 *   1. 连接至 ws://localhost:8080
 *   2. 注册为 A 模块角色
 *   3. 定时发送视线数据 + 状态判定给服务器
 *   4. 接收 B 模块回传的阅读区域信息
 */

const WSClient = (function () {
    // ==================== 内部状态 ====================
    let ws = null;
    let isConnected = false;
    let sendInterval = null;

    // 回调函数
    let onRegionsReceived = null; // 收到阅读区域信息时的回调
    let onConnected = null;
    let onDisconnected = null;

    // 阅读区域缓存
    let cachedRegions = [];

    // 发送间隔 (ms), 默认 100ms = 10Hz
    const SEND_INTERVAL_MS = 100;

    // ==================== 连接管理 ====================

    /**
     * 连接服务器
     * @param {string} url - WebSocket 地址, 默认 ws://localhost:8080
     * @param {Object} callbacks
     * @param {Function} callbacks.onRegionsReceived - 收到区域信息
     * @param {Function} callbacks.onConnected
     * @param {Function} callbacks.onDisconnected
     */
    function connect(url = 'ws://localhost:8080', callbacks = {}) {
        onConnected = callbacks.onConnected || null;
        onDisconnected = callbacks.onDisconnected || null;
        onRegionsReceived = callbacks.onRegionsReceived || null;

        console.log('[WSClient] 正在连接 ' + url + ' ...');

        try {
            ws = new WebSocket(url);
        } catch (err) {
            console.error('[WSClient] WebSocket 创建失败:', err);
            return;
        }

        ws.onopen = function () {
            isConnected = true;
            console.log('[WSClient] 已连接到服务器');

            // 注册角色
            ws.send(JSON.stringify({ role: 'A' }));

            if (onConnected) onConnected();
        };

        ws.onmessage = function (event) {
            try {
                const message = JSON.parse(event.data);
                handleMessage(message);
            } catch (err) {
                console.error('[WSClient] 消息解析失败:', err);
            }
        };

        ws.onclose = function () {
            isConnected = false;
            console.log('[WSClient] 与服务器断开连接');

            stopSending();

            if (onDisconnected) onDisconnected();

            // 5 秒后自动重连
            console.log('[WSClient] 将在 5 秒后尝试重连...');
            setTimeout(() => {
                if (!isConnected) {
                    connect(url, { onRegionsReceived, onConnected, onDisconnected });
                }
            }, 5000);
        };

        ws.onerror = function (err) {
            console.error('[WSClient] 连接错误:', err);
        };
    }

    // ==================== 消息处理 ====================

    function handleMessage(message) {
        switch (message.type) {
            case 'reading_regions':
                cachedRegions = message.regions || [];
                console.log('[WSClient] 收到阅读区域信息, ' + cachedRegions.length + ' 个区域');
                if (onRegionsReceived) {
                    onRegionsReceived(cachedRegions);
                }
                break;

            case 'welcome':
                console.log('[WSClient] 服务器欢迎:', message.message);
                break;

            case 'pong':
                // 心跳响应, 无需额外处理
                break;

            default:
                // console.log('[WSClient] 未知消息类型:', message.type);
                break;
        }
    }

    // ==================== 数据发送 ====================

    /**
     * 开始定时发送视线数据
     * @param {Function} dataProvider - 返回 { gaze_point, user_state, target_row, alert_level } 的函数
     */
    function startSending(dataProvider) {
        if (sendInterval) return; // 已经在发送

        sendInterval = setInterval(() => {
            if (!isConnected || !ws || ws.readyState !== WebSocket.OPEN) return;

            try {
                const data = dataProvider();
                if (data) {
                    ws.send(JSON.stringify({
                        type: 'gaze_data',
                        ...data,
                        timestamp: Date.now(),
                    }));
                }
            } catch (err) {
                console.error('[WSClient] 发送数据失败:', err);
            }
        }, SEND_INTERVAL_MS);
    }

    /** 停止发送 */
    function stopSending() {
        if (sendInterval) {
            clearInterval(sendInterval);
            sendInterval = null;
        }
    }

    // ==================== 公开接口 ====================

    function getIsConnected() {
        return isConnected;
    }

    function getCachedRegions() {
        return cachedRegions;
    }

    return {
        connect,
        startSending,
        stopSending,
        getIsConnected,
        getCachedRegions,
    };
})();

// 挂载到全局
if (typeof window !== 'undefined') {
    window.WSClient = WSClient;
}