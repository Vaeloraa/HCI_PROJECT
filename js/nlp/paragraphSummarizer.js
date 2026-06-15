/**
 * FocusFlow - Paragraph Summarizer (Member C)
 * Abstractive-style rewrite: infers topic + keywords, then generates
 * a new summary in the SAME language as the source paragraph (zh/en).
 */
const ParagraphSummarizer = {
    maxChars: 220,

    summarize(text, options = {}) {
        const maxChars = options.maxChars || this.maxChars;
        const lang = options.lang || this.detectLanguage(text);
        const normalized = (text || '').replace(/\s+/g, ' ').trim();

        if (!normalized) {
            return { text: '', lang, method: 'empty' };
        }

        const result = lang === 'zh'
            ? this._summarizeZh(normalized, maxChars)
            : this._summarizeEn(normalized, maxChars);

        return { ...result, lang };
    },

    /**
     * Detect primary language of a paragraph.
     * @returns {'zh'|'en'|'mixed'}
     */
    detectLanguage(text) {
        const sample = (text || '').slice(0, 1200);
        const cjk = (sample.match(/[\u4e00-\u9fff]/g) || []).length;
        const latin = (sample.match(/[A-Za-z]/g) || []).length;

        if (cjk === 0 && latin === 0) return 'en';
        if (cjk >= latin * 1.2 && cjk >= 8) return 'zh';
        if (latin >= cjk * 1.2 && latin >= 20) return 'en';
        return cjk >= latin ? 'zh' : 'en';
    },

    precomputeAll(blockTexts, onProgress) {
        return (blockTexts || []).map((text, index) => {
            const result = this.summarize(text);
            if (typeof onProgress === 'function') onProgress(index, result);
            return result;
        });
    },

    /* ── Chinese abstractive rewrite ── */

    _summarizeZh(text, maxChars) {
        const sentences = this._splitSentencesZh(text);
        const keywords = this._extractKeywordsZh(text, 5);
        const topic = this._inferTopicZh(sentences, keywords);
        const detail = this._pickDetailSentence(sentences, keywords, 'zh');

        const kwPhrase = keywords.slice(0, 3).map(k => k.term).join('、');
        const parts = [];

        if (topic) {
            parts.push(`本段主要说明${topic}。`);
        }
        if (kwPhrase) {
            parts.push(`涉及的关键概念包括${kwPhrase}。`);
        }
        if (detail) {
            parts.push(this._rewriteDetailZh(detail));
        }

        let summary = parts.join('') || this._compressZh(text, maxChars);
        summary = this._truncate(summary, maxChars);

        return { text: summary, method: 'abstract-zh' };
    },

    _splitSentencesZh(text) {
        return text
            .split(/[。！？；\n]+/)
            .map(s => s.trim())
            .filter(s => s.length >= 4);
    },

    _extractKeywordsZh(text, topK) {
        const stop = new Set([
            '一个', '一种', '可以', '可能', '已经', '进行', '通过', '以及', '其中', '这种', '这些',
            '那些', '我们', '他们', '它们', '由于', '因此', '然而', '此外', '同时', '主要', '重要',
            '表示', '认为', '发现', '研究', '具有', '成为', '作为', '对于', '关于', '不是', '而是'
        ]);

        const freq = {};
        const add = (term) => {
            if (!term || term.length < 2 || stop.has(term)) return;
            freq[term] = (freq[term] || 0) + 1;
        };

        const chars = text.replace(/\s+/g, '');
        for (let len = 2; len <= 4; len++) {
            for (let i = 0; i <= chars.length - len; i++) {
                const slice = chars.slice(i, i + len);
                if (/^[\u4e00-\u9fff]+$/.test(slice)) add(slice);
            }
        }

        return Object.entries(freq)
            .map(([term, score]) => ({ term, score }))
            .sort((a, b) => b.score - a.score || b.term.length - a.term.length)
            .slice(0, topK);
    },

    _inferTopicZh(sentences, keywords) {
        if (keywords.length > 0) {
            return keywords[0].term;
        }
        const lead = sentences[0] || '';
        return this._compressZh(lead, 18).replace(/[，,；;：:]$/, '');
    },

    _rewriteDetailZh(sentence) {
        let s = sentence
            .replace(/^(此外|然而|因此|总之|总的来说|与此同时|另一方面)[，,]?/u, '')
            .replace(/[（(][^）)]*[）)]/gu, '')
            .trim();

        s = this._compressZh(s, 56);
        if (!s) return '';
        if (s.startsWith('进一步说明：')) return s.endsWith('。') ? s : `${s}。`;
        return `进一步说明：${s}${s.endsWith('。') ? '' : '。'}`;
    },

    _compressZh(text, maxLen) {
        let s = (text || '')
            .replace(/[，,；;：:].$/u, '')
            .replace(/^(本文|本段|这一节|该段|文章|段落)/u, '')
            .replace(/\s+/g, '')
            .trim();
        if (s.length <= maxLen) return s;
        return s.slice(0, maxLen).replace(/[，,、；;：:'"'\s]+$/u, '') + '…';
    },

    /* ── English abstractive rewrite ── */

    _summarizeEn(text, maxChars) {
        const sentences = this._splitSentencesEn(text);
        const keywords = this._extractKeywordsEn(text, 5);
        const topic = this._inferTopicEn(sentences, keywords);
        const detail = this._pickDetailSentence(sentences, keywords, 'en');

        const kwPhrase = keywords.slice(0, 3).map(k => k.term).join(', ');
        const parts = [];

        if (topic) {
            parts.push(`This paragraph explains ${topic}.`);
        }
        if (kwPhrase) {
            parts.push(`Key concepts include ${kwPhrase}.`);
        }
        if (detail) {
            parts.push(this._rewriteDetailEn(detail));
        }

        let summary = parts.join(' ') || this._compressEn(text, maxChars);
        summary = this._truncate(summary, maxChars);

        return { text: summary, method: 'abstract-en' };
    },

    _splitSentencesEn(text) {
        const parts = text
            .split(/(?<=[.!?;])\s+/)
            .map(s => s.trim())
            .filter(s => s.length >= 12);
        return parts.length ? parts : [text];
    },

    _extractKeywordsEn(text, topK) {
        const stop = new Set([
            'the', 'and', 'that', 'this', 'with', 'from', 'have', 'been', 'were', 'their',
            'which', 'these', 'those', 'also', 'into', 'about', 'more', 'other', 'such',
            'however', 'therefore', 'furthermore', 'additionally', 'including', 'between'
        ]);

        const words = text.toLowerCase().match(/[a-z']{4,}/g) || [];
        const freq = {};
        words.forEach((w) => {
            if (stop.has(w)) return;
            freq[w] = (freq[w] || 0) + 1;
        });

        return Object.entries(freq)
            .map(([term, score]) => ({ term, score }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    },

    _inferTopicEn(sentences, keywords) {
        if (keywords.length > 0) {
            return keywords.slice(0, 2).map(k => k.term).join(' and ');
        }
        const lead = sentences[0] || '';
        return this._compressEn(lead, 48);
    },

    _rewriteDetailEn(sentence) {
        let s = sentence
            .replace(/^(However|Therefore|Thus|Moreover|Furthermore|In addition),?\s/i, '')
            .trim();
        s = this._compressEn(s, 90);
        if (!s) return '';
        const lower = s.charAt(0).toLowerCase() + s.slice(1);
        return `It also notes that ${lower}${/[.!?]$/.test(lower) ? '' : '.'}`;
    },

    _compressEn(text, maxLen) {
        let s = (text || '').replace(/\s+/g, ' ').trim();
        if (s.length <= maxLen) return s;
        const slice = s.slice(0, maxLen);
        const cut = Math.max(slice.lastIndexOf(' '), slice.lastIndexOf(','));
        return (cut > maxLen * 0.55 ? slice.slice(0, cut) : slice).trim() + '…';
    },

    /* ── Shared helpers ── */

    _pickDetailSentence(sentences, keywords, lang) {
        if (sentences.length <= 1) return null;

        const keySet = new Set(keywords.map(k => k.term.toLowerCase()));
        let best = null;
        let bestScore = -1;

        for (let i = 1; i < sentences.length; i++) {
            const sentence = sentences[i];
            const tokens = lang === 'zh'
                ? (sentence.match(/[\u4e00-\u9fff]{2,}/g) || [])
                : (sentence.toLowerCase().match(/[a-z']{4,}/g) || []);

            let overlap = 0;
            tokens.forEach((t) => {
                if (keySet.has(lang === 'zh' ? t : t.toLowerCase())) overlap++;
            });

            const score = overlap + (i === 1 ? 0.5 : 0);
            if (score > bestScore) {
                bestScore = score;
                best = sentence;
            }
        }

        return best;
    },

    _truncate(text, maxChars) {
        if (text.length <= maxChars) return text;
        const slice = text.slice(0, maxChars - 1);
        const lastBreak = Math.max(
            slice.lastIndexOf('。'),
            slice.lastIndexOf('，'),
            slice.lastIndexOf('. '),
            slice.lastIndexOf(' ')
        );
        if (lastBreak > maxChars * 0.55) {
            return slice.slice(0, lastBreak + (slice[lastBreak] === '.' ? 1 : 0)).trim() + '…';
        }
        return slice.trim() + '…';
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ParagraphSummarizer;
}
