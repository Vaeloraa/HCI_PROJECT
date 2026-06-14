/**
 * ws-server.js — FocusFlow WebSocket 服务器
 * 
 * 功能:
 *   - 接收 A 模块浏览器端传来的视线数据与状态
 *   - 向 B 模块 (前端阅读器) 广播实时状态
 *   - 支持 B 模块回传阅读区域信息 (段落边界)
 *   - 支持 C 模块订阅数据用于分析
 * 
 * 端口: 8080
 */

const WebSocket = require('ws');

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });

// ==================== 连接管理 ====================
let moduleAClient = null;   // A 模块 (本模块浏览器端)
let moduleBClients = [];    // B 模块 (前端阅读器)
let moduleCClients = [];    // C 模块 (数据分析)

// 存储最近一次阅读区域信息 (由 B 发送)
let readingRegions = [];

console.log('═══════════════════════════════════════════');
console.log('  FocusFlow WebSocket 服务器已启动');
console.log('  端口: ' + PORT);
console.log('  等待连接...');
console.log('═══════════════════════════════════════════');

// ==================== 连接事件 ====================
wss.on('connection', (ws, req) => {
    const clientIP = req.socket.remoteAddress;
    console.log('[连接] 新客户端: ' + clientIP);

    let clientRole = 'unknown';

    ws.on('message', (rawMessage) => {
        try {
            const message = JSON.parse(rawMessage);

            // ---- 根据消息中的 role 字段识别客户端角色 ----
            if (message.role) {
                clientRole = message.role;
                console.log('[角色] ' + clientIP + ' → ' + clientRole);

                if (clientRole === 'A') {
                    moduleAClient = ws;
                    ws.send(JSON.stringify({
                        type: 'welcome',
                        message: 'A 模块已注册, 等待发送视线数据...',
                        readingRegions: readingRegions,
                    }));
                } else if (clientRole === 'B') {
                    moduleBClients.push(ws);
                    ws.send(JSON.stringify({
                        type: 'welcome',
                        message: 'B 模块已注册, 开始接收视线数据...',
                    }));
                } else if (clientRole === 'C') {
                    moduleCClients.push(ws);
                    ws.send(JSON.stringify({
                        type: 'welcome',
                        message: 'C 模块已注册, 开始接收数据流...',
                    }));
                }
                return;
            }

            // ---- 根据消息类型路由 ----

            switch (message.type) {

                // A → 服务器: 实时眼动数据
                case 'gaze_data':
                    // 转发给所有 B 和 C
                    broadcastToBC(message);
                    break;

                // B → 服务器: 阅读区域信息
                case 'reading_regions':
                    readingRegions = message.regions || [];
                    console.log('[区域] 收到阅读区域信息, 段落数: ' + readingRegions.length);
                    // 转发给 A
                    if (moduleAClient && moduleAClient.readyState === WebSocket.OPEN) {
                        moduleAClient.send(JSON.stringify({
                            type: 'reading_regions',
                            regions: readingRegions,
                        }));
                    }
                    break;

                // A/B → 服务器: 心跳
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                    break;

                default:
                    console.log('[未知消息类型] ' + message.type + ' from ' + clientIP);
            }

        } catch (err) {
            console.error('[消息解析错误] ' + err.message);
        }
    });

    ws.on('close', () => {
        console.log('[断开] ' + clientIP + ' (' + clientRole + ')');

        if (clientRole === 'A') {
            moduleAClient = null;
        } else if (clientRole === 'B') {
            moduleBClients = moduleBClients.filter(c => c !== ws);
        } else if (clientRole === 'C') {
            moduleCClients = moduleCClients.filter(c => c !== ws);
        }
    });

    ws.on('error', (err) => {
        console.error('[WebSocket 错误] ' + clientIP + ': ' + err.message);
    });
});

// ==================== 广播函数 ====================

/**
 * 向所有 B 模块和 C 模块广播消息
 */
function broadcastToBC(message) {
    const data = JSON.stringify(message);

    moduleBClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });

    moduleCClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

// ==================== 优雅退出 ====================
process.on('SIGINT', () => {
    console.log('\n[服务器] 正在关闭...');
    wss.close(() => {
        console.log('[服务器] 已关闭');
        process.exit(0);
    });
});