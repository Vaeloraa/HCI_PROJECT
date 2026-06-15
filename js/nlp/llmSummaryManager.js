/**
 * FocusFlow - LLM Summary Manager (Member C)
 * Prefetch + queue + cache for low-latency comprehension cards.
 */
class LLMSummaryManager {
    constructor(config) {
        this.config = config || {};
        this.apiUrl = config.llmApiUrl || '/api/summarize';
        this.statusUrl = config.llmStatusUrl || '/api/llm/status';
        this.concurrency = config.llmConcurrency || 3;
        this.cache = new Map();
        this.queue = [];
        this.active = 0;
        this.serverEnabled = null;
        this.docLang = 'en';
        this._persistKey = 'focusflow_llm_summary_cache_v1';
        this._loadPersistedCache();
    }

    async init() {
        try {
            const res = await fetch(this.statusUrl, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                this.serverEnabled = !!data.enabled;
            } else {
                this.serverEnabled = false;
            }
        } catch (_) {
            this.serverEnabled = false;
        }
        return this.serverEnabled;
    }

    isEnabled() {
        return this.serverEnabled === true;
    }

    setDocumentLang(lang) {
        this.docLang = lang === 'zh' ? 'zh' : 'en';
    }

    reset() {
        this.cache.clear();
        this.queue = [];
        try {
            localStorage.removeItem(this._persistKey);
        } catch (_) { /* ignore */ }
    }

    _loadPersistedCache() {
        try {
            const raw = localStorage.getItem(this._persistKey);
            if (!raw) return;
            const obj = JSON.parse(raw);
            Object.entries(obj).forEach(([key, val]) => {
                if (val && val.text) this.cache.set(key, val);
            });
        } catch (_) { /* ignore */ }
    }

    _persistCache() {
        try {
            const obj = {};
            this.cache.forEach((val, key) => {
                if (val.status === 'ready' && val.text) obj[key] = val;
            });
            localStorage.setItem(this._persistKey, JSON.stringify(obj));
        } catch (_) { /* ignore */ }
    }

    _cacheKey(blockIndex, text) {
        const hash = text.length + ':' + text.slice(0, 40);
        return `${blockIndex}:${this.docLang}:${hash}`;
    }

    getCached(blockIndex, text) {
        const entry = this.cache.get(this._cacheKey(blockIndex, text));
        return entry && entry.status === 'ready' ? entry : null;
    }

    /**
     * Schedule LLM summary generation.
     * @param {number} blockIndex
     * @param {string} text
     * @param {'high'|'normal'|'low'} priority
     */
    prefetch(blockIndex, text, priority = 'normal') {
        if (!this.isEnabled() || !text) return null;

        const key = this._cacheKey(blockIndex, text);
        const existing = this.cache.get(key);
        if (existing && (existing.status === 'ready' || existing.status === 'pending')) {
            return existing.promise || Promise.resolve(existing);
        }

        const entry = { status: 'pending', text: '', lang: this.docLang, method: 'llm' };
        const promise = new Promise((resolve, reject) => {
            this.queue.push({ key, blockIndex, text, priority, resolve, reject });
            this.queue.sort((a, b) => {
                const rank = { high: 0, normal: 1, low: 2 };
                return rank[a.priority] - rank[b.priority];
            });
            this._drainQueue();
        });

        entry.promise = promise;
        this.cache.set(key, entry);
        return promise;
    }

    async _drainQueue() {
        while (this.active < this.concurrency && this.queue.length > 0) {
            const job = this.queue.shift();
            this.active++;
            this._runJob(job).finally(() => {
                this.active--;
                this._drainQueue();
            });
        }
    }

    async _runJob(job) {
        const { key, text, resolve, reject } = job;
        try {
            const res = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, lang: this.docLang })
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.message || `HTTP ${res.status}`);
            }

            const data = await res.json();
            const entry = {
                status: 'ready',
                text: (data.text || '').trim(),
                lang: data.lang || this.docLang,
                method: 'llm',
                model: data.model || ''
            };
            this.cache.set(key, entry);
            this._persistCache();
            resolve(entry);
            return entry;
        } catch (err) {
            this.cache.set(key, { status: 'error', error: err.message });
            reject(err);
            throw err;
        }
    }

    /**
     * Get summary — waits for in-flight prefetch, falls back to local summarizer.
     */
    async getSummary(blockIndex, text, options = {}) {
        const lang = options.lang || this.docLang;
        const key = this._cacheKey(blockIndex, text);

        if (this.isEnabled()) {
            const cached = this.cache.get(key);
            if (cached && cached.status === 'ready') return cached;

            try {
                if (cached && cached.promise) {
                    return await cached.promise;
                }
                return await this.prefetch(blockIndex, text, 'high');
            } catch (err) {
                console.warn('[LLMSummaryManager] LLM failed, using fallback:', err.message);
            }
        }

        if (typeof ParagraphSummarizer !== 'undefined') {
            const local = ParagraphSummarizer.summarize(text, { lang });
            return { status: 'ready', text: local.text, lang, method: local.method || 'fallback' };
        }

        return { status: 'ready', text: text.slice(0, 180) + '…', lang, method: 'truncated' };
    }

    /**
     * Preload summaries for entire document (staggered).
     */
    preloadDocument(blockTexts, lang) {
        this.setDocumentLang(lang);
        if (!this.isEnabled()) return;

        const texts = blockTexts || [];
        const firstBatch = Math.min(6, texts.length);

        for (let i = 0; i < firstBatch; i++) {
            window.setTimeout(() => {
                this.prefetch(i, texts[i], i < 3 ? 'high' : 'normal');
            }, i * 120);
        }

        for (let i = firstBatch; i < texts.length; i++) {
            window.setTimeout(() => {
                this.prefetch(i, texts[i], 'low');
            }, 800 + (i - firstBatch) * 200);
        }
    }

    /**
     * Called while user reads — prefetch current + next paragraphs early.
     */
    onReadingBlock(blockIndex, blockTexts) {
        if (!this.isEnabled() || blockIndex < 0) return;

        const texts = blockTexts || [];
        const current = texts[blockIndex];
        if (current) this.prefetch(blockIndex, current, 'high');

        [blockIndex + 1, blockIndex + 2].forEach((idx) => {
            if (texts[idx]) this.prefetch(idx, texts[idx], 'normal');
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LLMSummaryManager;
}
