/**
 * FocusFlow - NLP Keyword Extraction Module
 * 
 * NLP Layer: In-browser TF-IDF based keyword extraction.
 * Extracts meaningful keywords from text paragraphs without requiring
 * external NLP APIs or large language models.
 * 
 * Features:
 *   - TF-IDF scoring for keyword relevance
 *   - Stop word filtering (English + common academic terms)
 *   - Bigram/phrase detection
 *   - Configurable top-K results
 * 
 * HCI Final Project - Member C (NLP & Integration)
 */

class KeywordExtractor {
    constructor(config) {
        this.config = config;
        this.topK = config.keywordCount || 5;
        this.minWordLength = config.minWordLength || 3;
        
        // Extended stop words (academic + common English)
        this.stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'by', 'with', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
            'be', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'its',
            'it', 'this', 'that', 'these', 'those', 'we', 'they', 'he', 'she',
            'not', 'no', 'nor', 'so', 'if', 'than', 'then', 'also', 'very',
            'just', 'about', 'above', 'after', 'again', 'all', 'am', 'any',
            'are', 'because', 'been', 'before', 'being', 'below', 'between',
            'both', 'but', 'by', 'each', 'few', 'more', 'most', 'other',
            'some', 'such', 'only', 'own', 'same', 'too', 'under', 'up',
            'into', 'over', 'here', 'there', 'where', 'while', 'who', 'whom',
            'which', 'what', 'when', 'why', 'how', 'much', 'many', 'one',
            'two', 'like', 'than', 'through', 'during', 'within', 'without',
            'their', 'them', 'these', 'those', 'upon', 'very', 'been',
            // Academic/common specific
            'however', 'therefore', 'thus', 'hence', 'moreover', 'furthermore',
            'nevertheless', 'nonetheless', 'consequently', 'accordingly',
            'additionally', 'subsequently', 'particularly', 'significantly',
            'approximately', 'essentially', 'importantly', 'interestingly',
            'typically', 'generally', 'frequently', 'commonly', 'often',
            'usually', 'including', 'involving', 'regarding', 'related',
            'various', 'numerous', 'multiple', 'significant', 'important',
            'different', 'specific', 'certain', 'additional', 'following',
            'previous', 'previous', 'current', 'recent', 'primary', 'major',
            'key', 'main', 'central', 'critical', 'fundamental', 'basic',
            'broad', 'wide', 'large', 'small', 'high', 'low', 'increased',
            'decreased', 'greater', 'lesser', 'further', 'further', 'else'
        ]);
        
        // Store document frequency for TF-IDF across paragraphs
        this.documentFrequency = {};
        this.totalDocuments = 0;
        this.globalVocabulary = new Set();
    }

    /**
     * Tokenize text into words
     * @param {string} text - Input text
     * @returns {Array} Array of word tokens
     */
    _tokenize(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s\-']/g, ' ')
            .split(/\s+/)
            .filter(w => w.length >= this.minWordLength && !this.stopWords.has(w));
    }

    /**
     * Calculate Term Frequency for a document
     * @param {Array} tokens - Array of word tokens
     * @returns {Object} Map of word -> frequency count
     */
    _computeTermFrequency(tokens) {
        const tf = {};
        for (const token of tokens) {
            tf[token] = (tf[token] || 0) + 1;
        }
        // Normalize by total words
        const total = tokens.length || 1;
        for (const word in tf) {
            tf[word] = tf[word] / total;
        }
        return tf;
    }

    /**
     * Extract keywords from a paragraph
     * @param {string} text - Paragraph text
     * @param {Array} contextParagraphs - Other paragraphs for IDF context
     * @returns {Array} Array of { word, score } objects, sorted by score descending
     */
    extract(text, contextParagraphs = []) {
        const tokens = this._tokenize(text);
        if (tokens.length === 0) return [];

        const tf = this._computeTermFrequency(tokens);
        
        // Build IDF from context paragraphs + current text
        const allParagraphs = [text, ...contextParagraphs];
        const idf = this._computeIDF(allParagraphs);
        
        // Compute TF-IDF scores
        const scores = [];
        const seen = new Set();
        
        for (const word of tokens) {
            if (seen.has(word)) continue;
            seen.add(word);
            
            const tfScore = tf[word] || 0;
            const idfScore = idf[word] || Math.log(allParagraphs.length + 1);
            const score = tfScore * idfScore;
            
            scores.push({ word, score });
        }
        
        // Sort by score descending and return top K
        scores.sort((a, b) => b.score - a.score);
        return scores.slice(0, this.topK);
    }

    /**
     * Compute Inverse Document Frequency across a set of documents
     * @param {Array} documents - Array of text strings
     * @returns {Object} Map of word -> IDF score
     */
    _computeIDF(documents) {
        const docCount = documents.length;
        const wordDocFrequency = {};
        
        for (const doc of documents) {
            const words = new Set(this._tokenize(doc));
            for (const word of words) {
                wordDocFrequency[word] = (wordDocFrequency[word] || 0) + 1;
            }
        }
        
        const idf = {};
        for (const word in wordDocFrequency) {
            idf[word] = Math.log((docCount + 1) / (wordDocFrequency[word] + 1)) + 1;
        }
        
        return idf;
    }

    /**
     * Extract keywords with positional context (for better relevance)
     * @param {string} text - The target paragraph
     * @param {number} blockIndex - Index of the block in the document
     * @param {Array} allBlocks - All text blocks for context
     * @returns {Array} Keywords with scores
     */
    extractFromBlock(text, blockIndex, allBlocks = []) {
        const contextWindows = [];
        
        // Use surrounding blocks as context (3 before, 3 after)
        const start = Math.max(0, blockIndex - 3);
        const end = Math.min(allBlocks.length, blockIndex + 4);
        
        for (let i = start; i < end; i++) {
            if (i !== blockIndex) {
                contextWindows.push(allBlocks[i] || '');
            }
        }
        
        return this.extract(text, contextWindows);
    }

    /**
     * Extract key phrases (bigrams) from text
     * @param {string} text - Input text
     * @param {number} maxPhrases - Maximum number of phrases to return
     * @returns {Array} Array of { phrase, score } objects
     */
    extractBigrams(text, maxPhrases = 3) {
        const tokens = this._tokenize(text);
        if (tokens.length < 2) return [];
        
        const bigramFreq = {};
        
        for (let i = 0; i < tokens.length - 1; i++) {
            const bigram = tokens[i] + ' ' + tokens[i + 1];
            bigramFreq[bigram] = (bigramFreq[bigram] || 0) + 1;
        }
        
        // Score bigrams by frequency
        const phrases = Object.entries(bigramFreq)
            .map(([phrase, freq]) => ({
                phrase,
                score: freq / (tokens.length - 1)
            }))
            .sort((a, b) => b.score - a.score);
        
        return phrases.slice(0, maxPhrases);
    }

    /**
     * Extract all relevant keywords and phrases from a paragraph
     * @param {string} text - Paragraph text
     * @param {number} blockIndex - Block index for context
     * @param {Array} allBlocks - All text blocks
     * @returns {Object} { keywords, bigrams }
     */
    extractAll(text, blockIndex, allBlocks = []) {
        return {
            keywords: this.extractFromBlock(text, blockIndex, allBlocks),
            bigrams: this.extractBigrams(text)
        };
    }

    /**
     * Update the global vocabulary with new text (for ongoing learning)
     * @param {string} text - New text to learn from
     */
    updateVocabulary(text) {
        const tokens = this._tokenize(text);
        for (const token of tokens) {
            this.globalVocabulary.add(token);
        }
        this.totalDocuments++;
    }

    /**
     * Reset the extractor state
     */
    reset() {
        this.documentFrequency = {};
        this.totalDocuments = 0;
        this.globalVocabulary = new Set();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeywordExtractor;
}
