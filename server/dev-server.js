/**
 * FocusFlow dev server — static files + LLM summarize proxy
 * Set OPENAI_API_KEY (and optional OPENAI_BASE_URL, OPENAI_MODEL) in environment.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = path.join(__dirname, '..');

function loadEnvFile() {
    const envPath = path.join(ROOT, '.env');
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eq = trimmed.indexOf('=');
        if (eq <= 0) return;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim();
        if (!process.env[key]) process.env[key] = val;
    });
}

loadEnvFile();

const PORT = Number(process.env.PORT) || 8080;
const API_KEY = process.env.OPENAI_API_KEY || process.env.FOCUSFLOW_LLM_API_KEY || '';
const API_BASE = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.wasm': 'application/wasm'
};

function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

function buildPrompt(text, lang) {
    const useZh = lang === 'zh';
    if (useZh) {
        return {
            system: '你是阅读辅助助手。用中文重写段落大意，2-3句，通俗易懂，不要复制原文句子，不要列表，不要英文解释。',
            user: `请理解并重写以下段落的核心含义：\n\n${text.slice(0, 3500)}`
        };
    }
    return {
        system: 'You are a reading assistant. Rewrite the paragraph meaning in 2-3 clear sentences. Do not copy verbatim. No bullet lists.',
        user: `Understand and rewrite the core meaning:\n\n${text.slice(0, 3500)}`
    };
}

async function callLLM(text, lang) {
    if (!API_KEY) {
        const err = new Error('LLM API key not configured on server');
        err.code = 'NO_API_KEY';
        throw err;
    }

    const { system, user } = buildPrompt(text, lang);
    const response = await fetch(`${API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: MODEL,
            temperature: 0.3,
            max_tokens: 220,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user }
            ]
        })
    });

    if (!response.ok) {
        const detail = await response.text();
        const err = new Error(`LLM HTTP ${response.status}: ${detail.slice(0, 200)}`);
        err.code = 'LLM_HTTP_ERROR';
        throw err;
    }

    const data = await response.json();
    const content = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : '';
    return (content || '').trim();
}

function buildTranslatePrompt(text) {
    return {
        system: '你是专业英中翻译助手。将用户给出的英文内容完整、准确地翻译为流畅的简体中文。只输出译文，不要解释，不要保留英文原文，不要使用列表除非原文就是列表。',
        user: text.slice(0, 6000)
    };
}

async function callTranslateLLM(text) {
    if (!API_KEY) {
        const err = new Error('LLM API key not configured on server');
        err.code = 'NO_API_KEY';
        throw err;
    }

    const { system, user } = buildTranslatePrompt(text);
    const response = await fetch(`${API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: MODEL,
            temperature: 0.2,
            max_tokens: 2800,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user }
            ]
        })
    });

    if (!response.ok) {
        const detail = await response.text();
        const err = new Error(`LLM HTTP ${response.status}: ${detail.slice(0, 200)}`);
        err.code = 'LLM_HTTP_ERROR';
        throw err;
    }

    const data = await response.json();
    const content = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : '';
    return (content || '').trim();
}

function sendJson(res, status, payload) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(payload));
}

function serveStatic(req, res, urlPath) {
    let filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (urlPath !== '/index.html') {
                const fallback = path.join(ROOT, 'index.html');
                fs.readFile(fallback, (err2, html) => {
                    if (err2) {
                        res.writeHead(404);
                        res.end('Not Found');
                        return;
                    }
                    res.writeHead(200, { 'Content-Type': MIME['.html'] });
                    res.end(html);
                });
                return;
            }
            res.writeHead(404);
            res.end('Not Found');
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);

    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    if (pathname === '/api/llm/status' && req.method === 'GET') {
        sendJson(res, 200, {
            enabled: !!API_KEY,
            model: MODEL,
            baseUrl: API_BASE
        });
        return;
    }

    if (pathname === '/api/summarize' && req.method === 'POST') {
        try {
            const raw = await readBody(req);
            const body = JSON.parse(raw || '{}');
            const text = (body.text || '').trim();
            const lang = body.lang === 'zh' ? 'zh' : 'en';

            if (!text) {
                sendJson(res, 400, { error: 'empty_text' });
                return;
            }

            const summary = await callLLM(text, lang);
            sendJson(res, 200, {
                text: summary,
                lang,
                method: 'llm',
                model: MODEL
            });
        } catch (err) {
            sendJson(res, err.code === 'NO_API_KEY' ? 503 : 502, {
                error: err.code || 'LLM_ERROR',
                message: err.message
            });
        }
        return;
    }

    if (pathname === '/api/translate' && req.method === 'POST') {
        try {
            const raw = await readBody(req);
            const body = JSON.parse(raw || '{}');
            const text = (body.text || '').trim();
            const targetLang = body.targetLang === 'zh' ? 'zh' : 'zh';

            if (!text) {
                sendJson(res, 400, { error: 'empty_text' });
                return;
            }

            const translated = await callTranslateLLM(text);
            sendJson(res, 200, {
                text: translated,
                sourceLang: 'en',
                targetLang,
                method: 'llm',
                model: MODEL
            });
        } catch (err) {
            sendJson(res, err.code === 'NO_API_KEY' ? 503 : 502, {
                error: err.code || 'LLM_ERROR',
                message: err.message
            });
        }
        return;
    }

    serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
    console.log('═══════════════════════════════════════════');
    console.log('  FocusFlow dev server');
    console.log(`  App:  http://127.0.0.1:${PORT}`);
    console.log(`  LLM:  ${API_KEY ? `enabled (${MODEL})` : 'disabled — set OPENAI_API_KEY'}`);
    console.log('═══════════════════════════════════════════');
});
