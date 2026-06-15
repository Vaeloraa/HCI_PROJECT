/**
 * FocusFlow - Paragraph Splitter
 *
 * Converts raw text (default article or imported files) into a structured
 * document with title, subtitle, headings, and reading paragraphs.
 */

const ParagraphSplitter = {
    /**
     * Parse raw text into a structured document.
     * @param {string} text
     * @returns {{ title: string|null, subtitle: string|null, blocks: Array<{type: string, text: string}> }}
     */
    parse(text) {
        const normalized = (text || '')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .trim();

        if (!normalized) {
            return { title: null, subtitle: null, blocks: [] };
        }

        const chunks = normalized.split(/\n\s*\n+/).map(c => c.trim()).filter(Boolean);
        let title = null;
        let subtitle = null;
        let startIndex = 0;
        const blocks = [];

        if (chunks.length > 0) {
            const firstLines = this._splitLines(chunks[0]);
            if (firstLines.length === 1 && firstLines[0].length <= 200) {
                title = this._stripMarkdownHeading(firstLines[0]);
                startIndex = 1;
            }
        }

        if (startIndex < chunks.length) {
            const subLines = this._splitLines(chunks[startIndex]);
            if (subLines.length === 1 && this._looksLikeSubtitle(subLines[0])) {
                subtitle = this._stripMarkdownHeading(subLines[0]);
                startIndex += 1;
            }
        }

        for (let i = startIndex; i < chunks.length; i++) {
            this._parseChunk(chunks[i], blocks);
        }

        if (!title && blocks.length > 0) {
            const firstHeading = blocks.findIndex(b => b.type === 'heading');
            if (firstHeading === 0) {
                title = blocks.shift().text;
            }
        }

        return { title, subtitle, blocks };
    },

    _splitLines(chunk) {
        return chunk.split('\n').map(l => l.trim()).filter(Boolean);
    },

    _parseChunk(chunk, blocks) {
        const lines = this._splitLines(chunk);
        if (lines.length === 0) return;

        if (lines.length === 1) {
            this._emitLine(lines[0], blocks);
            return;
        }

        if (!this._isProseBlock(lines)) {
            this._emitNonProseLines(lines, blocks);
            return;
        }

        const paragraphs = this._mergeLinesToParagraphs(lines);
        for (const paragraph of paragraphs) {
            this._emitLine(paragraph, blocks);
        }
    },

    _emitLine(line, blocks) {
        const cleaned = this._stripMarkdownHeading(line);
        if (this._looksLikeHeading(cleaned)) {
            blocks.push({ type: 'heading', text: cleaned });
            return;
        }

        for (const part of this._splitLongParagraph(cleaned)) {
            blocks.push({ type: 'paragraph', text: part });
        }
    },

    _emitNonProseLines(lines, blocks) {
        let buffer = [];
        let bufferLen = 0;

        const flush = () => {
            if (buffer.length === 0) return;
            blocks.push({ type: 'paragraph', text: buffer.join('\n') });
            buffer = [];
            bufferLen = 0;
        };

        for (const line of lines) {
            if (this._looksLikeHeading(line)) {
                flush();
                blocks.push({ type: 'heading', text: this._stripMarkdownHeading(line) });
                continue;
            }

            buffer.push(line);
            bufferLen += line.length;

            if (buffer.length >= 6 || bufferLen >= 320) {
                flush();
            }
        }

        flush();
    },

    _isProseBlock(lines) {
        const sentenceLines = lines.filter(l => /[.!?]["']?\s*$/.test(l)).length;
        const longLines = lines.filter(l => l.split(/\s+/).length >= 12).length;
        return sentenceLines / lines.length >= 0.25 || longLines > 0;
    },

    _mergeLinesToParagraphs(lines) {
        const paragraphs = [];
        let buffer = [];

        for (const line of lines) {
            if (buffer.length > 0) {
                const lastLine = buffer[buffer.length - 1];
                const lastEndsSentence = /[.!?]["']?\s*$/.test(lastLine);
                const startsNewSentence = /^[A-Z("'0-9]/.test(line);

                if (lastEndsSentence && startsNewSentence && lastLine.length >= 40) {
                    paragraphs.push(buffer.join(' '));
                    buffer = [line];
                    continue;
                }
            }
            buffer.push(line);
        }

        if (buffer.length > 0) {
            paragraphs.push(buffer.join(' '));
        }

        return paragraphs;
    },

    _splitLongParagraph(text, maxLen = 900) {
        const trimmed = text.trim();
        if (!trimmed) return [];
        if (trimmed.length <= maxLen) return [trimmed];

        const sentences = trimmed.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [trimmed];
        const paragraphs = [];
        let current = '';

        for (const sentence of sentences) {
            const piece = sentence.trim();
            if (!piece) continue;

            if ((current + ' ' + piece).trim().length > maxLen && current) {
                paragraphs.push(current.trim());
                current = piece;
            } else {
                current = current ? `${current} ${piece}` : piece;
            }
        }

        if (current.trim()) {
            paragraphs.push(current.trim());
        }

        return paragraphs.length > 0 ? paragraphs : [trimmed];
    },

    _stripMarkdownHeading(line) {
        const match = line.match(/^#{1,6}\s+(.+)$/);
        return match ? match[1].trim() : line.trim();
    },

    _looksLikeSubtitle(line) {
        const text = this._stripMarkdownHeading(line);
        return text.length > 0 &&
            text.length <= 180 &&
            !/[.!?]\s*$/.test(text) &&
            text.split(/\s+/).length <= 24;
    },

    _looksLikeHeading(line) {
        const text = this._stripMarkdownHeading(line);
        if (!text) return false;

        if (/^===\s*.+\s*===$/.test(text)) return true;
        if (/^---\s*(page|slide)\s+\d+\s*---$/i.test(text)) return true;
        if (/^#{1,6}\s+/.test(line)) return true;

        const wordCount = text.split(/\s+/).length;
        return text.length <= 100 &&
            wordCount <= 14 &&
            !/[.!?;:]\s*$/.test(text);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ParagraphSplitter;
}
