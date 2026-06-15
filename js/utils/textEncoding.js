/**
 * FocusFlow - Text Encoding Helper
 *
 * Detects and decodes text files that may use UTF-8, GBK/GB18030, Big5, or UTF-16.
 * Fixes garbled text when importing Windows-created Chinese .txt files.
 */

const TextEncoding = {
    /**
     * Read a File and decode with the best-matching encoding.
     * @param {File} file
     * @returns {Promise<string>}
     */
    decodeFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    resolve(this.decodeBuffer(e.target.result));
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * Decode an ArrayBuffer with BOM detection and encoding scoring.
     * @param {ArrayBuffer} arrayBuffer
     * @returns {string}
     */
    decodeBuffer(arrayBuffer) {
        const bytes = new Uint8Array(arrayBuffer);
        if (bytes.length === 0) return '';

        if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
            return new TextDecoder('utf-8').decode(bytes.subarray(3));
        }

        if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
            return new TextDecoder('utf-16le').decode(bytes.subarray(2));
        }

        if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
            return new TextDecoder('utf-16be').decode(bytes.subarray(2));
        }

        const candidates = ['utf-8', 'gb18030', 'gbk', 'big5'];
        let bestText = '';
        let bestScore = -Infinity;
        let bestEncoding = 'utf-8';

        for (const encoding of candidates) {
            const text = this._tryDecode(bytes, encoding);
            if (text === null) continue;

            const score = this._scoreDecodedText(text, bytes, encoding);
            if (score > bestScore) {
                bestScore = score;
                bestText = text;
                bestEncoding = encoding;
            }
        }

        if (!bestText && bytes.length > 0) {
            bestText = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        }

        if (bestEncoding !== 'utf-8') {
            console.log(`[TextEncoding] Decoded as ${bestEncoding}`);
        }

        return bestText;
    },

    _tryDecode(bytes, encoding) {
        try {
            return new TextDecoder(encoding, { fatal: false }).decode(bytes);
        } catch (e) {
            return null;
        }
    },

    _scoreDecodedText(text, bytes, encoding) {
        if (!text) return -1000;

        let score = Math.min(text.length, 5000) * 0.01;

        const replacementCount = (text.match(/\uFFFD/g) || []).length;
        score -= replacementCount * 25;

        const cjkCount = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
        score += cjkCount * 3;

        const readableCount = (text.match(/[\x20-\x7E\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\n\r\t]/g) || []).length;
        score += readableCount * 0.05;

        const controlCount = (text.match(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g) || []).length;
        score -= controlCount * 30;

        const mojibakeCount = (text.match(/(?:Ã.|Â.|Å.|ä.|æ.|ç.|è.|é.|ê.|ï.|ð.|ñ.|ò.|ó.|ô.|ö.){2,}/g) || []).length;
        score -= mojibakeCount * 20;

        if (encoding === 'utf-8' && !this._isValidUtf8(bytes)) {
            score -= 40;
        }

        if ((encoding === 'gb18030' || encoding === 'gbk') && cjkCount > 0) {
            score += 10;
        }

        return score;
    },

    _isValidUtf8(bytes) {
        let i = 0;
        while (i < bytes.length) {
            const b = bytes[i];

            if (b <= 0x7F) {
                i += 1;
                continue;
            }

            let extra;
            if ((b & 0xE0) === 0xC0) extra = 1;
            else if ((b & 0xF0) === 0xE0) extra = 2;
            else if ((b & 0xF8) === 0xF0) extra = 3;
            else return false;

            if (i + extra >= bytes.length) return false;

            for (let j = 1; j <= extra; j++) {
                if ((bytes[i + j] & 0xC0) !== 0x80) return false;
            }

            i += extra + 1;
        }

        return true;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextEncoding;
}
