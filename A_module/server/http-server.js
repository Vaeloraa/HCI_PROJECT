/**
 * http-server.js — 简易静态文件服务器
 * 用于解决 WebGazer 需要在 HTTP(S) 协议下运行的问题
 * 端口: 3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = path.join(__dirname, '..'); // A_module 根目录

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.wasm': 'application/wasm',
    '.data': 'application/octet-stream',
};

const server = http.createServer((req, res) => {
    // 解析 URL 路径
    let urlPath = req.url.split('?')[0]; // 去掉查询参数
    if (urlPath === '/') urlPath = '/index.html';

    const filePath = path.join(ROOT, urlPath);

    // 安全检查：防止路径穿越
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Not Found: ' + urlPath);
            } else {
                res.writeHead(500);
                res.end('Internal Server Error');
            }
            return;
        }

        // 为 JS/WASM 文件添加跨域头 (WebGazer 可能需要)
        res.writeHead(200, {
            'Content-Type': mimeType,
            'Access-Control-Allow-Origin': '*',
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
        });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log('═══════════════════════════════════════════');
    console.log('  FocusFlow HTTP 静态服务器已启动');
    console.log('  地址: http://localhost:' + PORT);
    console.log('  请在浏览器中打开上述地址');
    console.log('═══════════════════════════════════════════');
});