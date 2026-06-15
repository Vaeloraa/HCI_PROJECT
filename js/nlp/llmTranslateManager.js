/**
 * FocusFlow - LLM Translate Manager (Member C)
 * English → Chinese translation via server proxy.
 */
class LLMTranslateManager {
    constructor(config) {
        this.config = config || {};
        this.apiUrl = config.llmTranslateUrl || '/api/translate';
        this.statusUrl = config.llmStatusUrl || '/api/llm/status';
        this.concurrency = config.llmTranslateConcurrency || 2;
        this.cache = new Map();
        this.queue = [];
        this.active = 0;
        this.serverEnabled = null;
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

    reset() {
        this.cache.clear();
        this.queue = [];
    }

    _cacheKey(text) {
        return `${text.length}:${text.slice(0, 48)}`;
    }

    getCached(text) {
        const entry = this.cache.get(this._cacheKey(text));
        return entry && entry.status === 'ready' ? entry.text : null;
    }

    async translate(text) {
        const trimmed = (text || '').trim();
        if (!trimmed) return '';
        if (!this.isEnabled()) {
            throw new Error('LLM translation is not available');
        }

        const cached = this.getCached(trimmed);
        if (cached) return cached;

        const key = this._cacheKey(trimmed);
        const existing = this.cache.get(key);
        if (existing && existing.promise) {
            return existing.promise;
        }

        const promise = new Promise((resolve, reject) => {
            this.queue.push({ key, text: trimmed, resolve, reject });
            this.queue.sort((a, b) => (a.priority || 1) - (b.priority || 1));
            this._drainQueue();
        });

        this.cache.set(key, { status: 'pending', promise });
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
                body: JSON.stringify({ text, sourceLang: 'en', targetLang: 'zh' })
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.message || `HTTP ${res.status}`);
            }

            const data = await res.json();
            const translated = (data.text || '').trim();
            this.cache.set(key, { status: 'ready', text: translated });
            resolve(translated);
            return translated;
        } catch (err) {
            this.cache.set(key, { status: 'error', error: err.message });
            reject(err);
            throw err;
        }
    }

    /**
     * Translate an array of paragraph texts in order.
     * @param {string[]} texts
     * @param {(index: number, translated: string) => void} [onBlockDone]
     */
    async translateAll(texts, onBlockDone) {
        const results = [];
        for (let i = 0; i < texts.length; i++) {
            const translated = await this.translate(texts[i]);
            results.push(translated);
            if (typeof onBlockDone === 'function') {
                onBlockDone(i, translated);
            }
        }
        return results;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LLMTranslateManager;
}
