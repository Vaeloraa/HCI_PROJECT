/**
 * FocusFlow - Reading View Module (Enhanced)
 * 
 * UI Layer: Manages the reading content layout, paragraph-level DOM mapping,
 * and gaze-to-paragraph alignment for precise row highlighting.
 * 
 * Features:
 * - Adaptive font/line spacing based on cognitive state
 * - Paragraph numbering with navigation labels
 * - Reading speed (WPM) indicator
 * - Enhanced gaze feedback with cursor glow & motion pulse
 * - Smooth gaze cursor with organic motion feedback
 * 
 * HCI Final Project - Member B (Frontend & Adaptive UI)
 */

const DEFAULT_READING_TEXT = `Understanding Neural Plasticity: The Brain's Remarkable Ability to Rewire Itself

How Experience and Learning Shape the Structural Organization of the Human Brain

Introduction to Neural Plasticity

Neural plasticity, also known as neuroplasticity or brain plasticity, refers to the brain's remarkable ability to reorganize itself by forming new neural connections throughout life. This fundamental property of the nervous system allows neurons (nerve cells) to adjust their activities in response to new situations, changes in the environment, or injury.

Historically, scientists believed that the brain's structure was fixed after a critical period during childhood. However, groundbreaking research over the past several decades has demonstrated that the brain continues to change and adapt well into old age. This discovery has revolutionized our understanding of human development, learning, and recovery from brain damage.

The concept of neuroplasticity encompasses several different processes that occur throughout the lifespan. These include the formation of new synaptic connections between neurons, the strengthening or weakening of existing connections based on activity patterns, and even the generation of new neurons—a process called neurogenesis.

Mechanisms of Synaptic Plasticity

At the cellular level, plasticity is driven by changes in synaptic strength—the efficiency with which signals are transmitted between neurons. The most well-studied form of synaptic plasticity is long-term potentiation (LTP), a persistent strengthening of synapses based on recent patterns of activity. LTP is widely considered one of the primary cellular mechanisms underlying learning and memory formation.

Long-term depression (LTD) is another important process that weakens synaptic connections that are rarely used. This selective pruning helps eliminate unnecessary or redundant neural pathways, making the brain more efficient. Together, LTP and LTD allow the brain to continuously refine its neural circuitry based on experience, a process sometimes summarized as "neurons that fire together, wire together."

Recent studies have also revealed the importance of structural plasticity, where neurons physically change their shape and connectivity. Dendritic spines—tiny protrusions on neurons where synapses form—can appear, enlarge, shrink, or disappear within hours of new learning experiences. This structural remodeling provides the anatomical basis for long-term memory storage.

Environmental Enrichment and Brain Development

Research on environmental enrichment has provided compelling evidence for experience-dependent plasticity. Studies comparing animals raised in enriched environments (with toys, social interaction, and physical activity) to those in standard laboratory conditions have found significant differences in brain structure. Enriched animals show increased cortical thickness, more dendritic branching, and higher numbers of synapses per neuron.

These findings have important implications for human development, particularly in educational settings. Environments that provide diverse sensory stimulation, opportunities for physical activity, and social interaction appear to promote optimal brain development in children. Similarly, continuing education and mentally stimulating activities in older adults have been associated with reduced risk of cognitive decline.

The concept of cognitive reserve—the brain's ability to cope with damage by using alternative neural networks—is closely linked to neuroplasticity. Individuals with higher educational attainment or those who engage regularly in intellectually demanding activities often show better cognitive function despite significant brain pathology, suggesting that their brains have developed more efficient or alternative neural pathways.

Recovery from Brain Injury

One of the most clinically significant aspects of neuroplasticity is the brain's capacity for recovery after injury. Following stroke, traumatic brain injury, or other neurological damage, the brain can reorganize its functions by forming new connections and recruiting alternative neural pathways. This recovery process often involves both structural changes—such as axonal sprouting where undamaged neurons grow new branches—and functional reorganization where nearby brain regions take over tasks previously performed by damaged areas.

Rehabilitation therapies explicitly leverage neuroplasticity to promote recovery. Constraint-induced movement therapy, for example, forces use of a affected limb after stroke by restricting the unaffected limb, leading to cortical reorganization and improved motor function. Similarly, speech and language therapy after aphasia (loss of language ability) can stimulate perilesional areas or the contralateral hemisphere to assume language functions.

The timing of rehabilitation is crucial. Research shows that there is a critical window of heightened plasticity following brain injury, typically lasting weeks to months. During this period, the brain is particularly receptive to therapeutic interventions. Early, intensive rehabilitation during this window can significantly improve functional outcomes compared to delayed treatment.

Limits and Constraints on Plasticity

Despite the brain's remarkable plasticity, there are important limits and constraints. Critical periods for certain types of learning—such as language acquisition and visual development—mean that some skills are most easily acquired during specific developmental windows. While adults can certainly learn new languages or recover from visual deprivation, the process is typically slower and less complete than during childhood.

The concept of homeostatic plasticity suggests that the brain maintains an overall balance of excitation and inhibition. While Hebbian plasticity (LTP/LTD) drives specific changes based on activity patterns, homeostatic mechanisms ensure that overall neural activity remains within a functional range. This prevents runaway excitation or complete silencing of neural circuits.

Aging also imposes constraints on plasticity. While the adult brain retains significant plasticity throughout life, the rate of neurogenesis declines with age, and the molecular mechanisms underlying synaptic plasticity become less efficient. However, regular physical exercise, cognitive engagement, and social interaction have all been shown to mitigate these age-related declines and maintain higher levels of brain plasticity.

Future Directions and Therapeutic Applications

Understanding the molecular mechanisms of plasticity has opened new avenues for therapeutic intervention. Drugs that enhance LTP, such as certain nootropics and cognitive enhancers, are being investigated for their potential to improve learning and memory in both healthy individuals and those with cognitive impairments. More controversially, compounds that reopen critical periods of plasticity in the adult brain could potentially enhance recovery from injury but raise ethical questions about cognitive enhancement.

Non-invasive brain stimulation techniques, including transcranial magnetic stimulation (TMS) and transcranial direct current stimulation (tDCS), are being explored as tools to modulate cortical excitability and enhance plasticity. These techniques can either increase or decrease excitability in specific brain regions, potentially facilitating learning or promoting recovery from neurological disorders.

The integration of neuroplasticity research with artificial intelligence and brain-computer interfaces represents another exciting frontier. Understanding how biological neural networks reorganize themselves could inspire more adaptive and resilient artificial neural networks, while brain-computer interfaces might one day harness neuroplasticity to help patients with paralysis control prosthetic limbs or communicate through thought alone.

In conclusion, neural plasticity is a fundamental property of the brain that enables adaptation, learning, and recovery across the lifespan. From the molecular mechanisms of synaptic change to the macroscopic reorganization of neural circuits following injury, plasticity shapes every aspect of cognitive function. As research continues to uncover the intricate mechanisms underlying plasticity, new opportunities for therapeutic intervention and cognitive enhancement will undoubtedly emerge.`;

class ReadingView {
    constructor(config) {
        this.config = config;
        this.container = document.getElementById('ff-reading-content');
        this.blockElements = [];
        this.blockRects = [];
        this.currentHighlightIndex = -1;
        this.currentBlockId = null;
        this.isDimmed = false;
        this.dimIntensity = 0;
        this.sourceLabel = 'default';
        this.document = { title: null, subtitle: null, blocks: [] };
        
        // Adaptive typography state
        this._cognitiveState = 'Normal';
        this._baseFontSize = 15;
        this._baseLineHeight = 2;
        this._baseLetterSpacing = 0.3;
        this._baseParagraphGap = 6;
        
        this._blockTexts = [];
        
        // Gaze cursor
        this._gazeCursor = null;
        this._lastGazeX = 0;
        this._lastGazeY = 0;
        this._gazePulseTimeout = null;

        // Block-rect cache refresh control
        this._lastRectRefreshTs = 0;
        this._rectRefreshThrottleMs = 100;
        this._boundScheduleRectRefresh = () => this.scheduleRectRefresh();

        this._paragraphDebugEnabled = false;
        this._paragraphDebugLegend = null;
        this._boundSyncParagraphDebug = () => this._syncParagraphDebugOverlays();
        
        this._loadRawText(DEFAULT_READING_TEXT, 'default');
        this._bindLayoutListeners();
    }

    /**
     * Parse and load raw text through the shared paragraph splitter.
     * @param {string} text
     * @param {string} [label='imported']
     */
    _loadRawText(text, label = 'imported') {
        const splitter = typeof ParagraphSplitter !== 'undefined'
            ? ParagraphSplitter
            : null;

        this.document = splitter
            ? splitter.parse(text)
            : { title: null, subtitle: null, blocks: [{ type: 'paragraph', text: text || '' }] };
        this.sourceLabel = label;
        this.documentLang = this._detectDocumentLang(text);
        this._buildContent();
        this.refreshBlockRects();

        if (this.container) {
            this.container.dispatchEvent(new CustomEvent('content-loaded', {
                detail: {
                    source: label,
                    paragraphs: this.blockElements.length,
                    headings: this.document.blocks.filter(b => b.type === 'heading').length
                }
            }));
        }
    }

    _detectDocumentLang(text) {
        if (typeof ParagraphSummarizer !== 'undefined') {
            return ParagraphSummarizer.detectLanguage(text);
        }
        const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
        const latin = (text.match(/[A-Za-z]/g) || []).length;
        return cjk >= latin ? 'zh' : 'en';
    }

    getDocumentLang() {
        return this.documentLang || 'en';
    }

    /**
     * Build the reading content DOM structure with block-level paragraph elements.
     * Each paragraph gets a data-block-id for gaze-to-paragraph mapping.
     * Paragraphs are numbered for navigation.
     */
    _buildContent() {
        if (!this.container) return;

        this.container.innerHTML = '';
        this.blockElements = [];
        this.blockRects = [];
        this._blockTexts = [];
        let blockCounter = 0;
        let paragraphNumber = 1;
        const doc = this.document || { title: null, subtitle: null, blocks: [] };

        if (doc.title) {
            const titleEl = document.createElement('h1');
            titleEl.className = 'reading-title ff-block';
            titleEl.textContent = doc.title;
            titleEl.dataset.blockId = 'title';
            titleEl.dataset.splitType = 'title';
            titleEl.dataset.charCount = String(doc.title.length);
            titleEl.style.position = 'relative';
            this.container.appendChild(titleEl);
        }

        if (doc.subtitle) {
            const subtitleEl = document.createElement('p');
            subtitleEl.className = 'reading-subtitle ff-block';
            subtitleEl.textContent = doc.subtitle;
            subtitleEl.dataset.blockId = 'subtitle';
            subtitleEl.dataset.splitType = 'subtitle';
            subtitleEl.dataset.charCount = String(doc.subtitle.length);
            subtitleEl.style.position = 'relative';
            this.container.appendChild(subtitleEl);
        }

        for (const block of doc.blocks) {
            if (block.type === 'heading') {
                const headingEl = document.createElement('h2');
                headingEl.className = 'section-heading ff-block';
                headingEl.textContent = block.text;
                headingEl.dataset.blockId = `heading-${blockCounter}`;
                headingEl.dataset.splitType = 'heading';
                headingEl.dataset.charCount = String(block.text.length);
                headingEl.style.position = 'relative';
                this.container.appendChild(headingEl);
                blockCounter++;
                continue;
            }

            if (block.type !== 'paragraph' || !block.text) continue;

            const el = document.createElement('p');
            el.className = 'content-paragraph ff-block';
            el.textContent = block.text;
            el.dataset.blockId = `block-${blockCounter}`;
            el.dataset.splitType = 'paragraph';
            el.dataset.trackIndex = String(this.blockElements.length);
            el.dataset.charCount = String(block.text.length);
            el.dataset.wordCount = String(this._countWords(block.text));
            el.style.position = 'relative';

            const actions = document.createElement('div');
            actions.className = 'ff-comprehension-actions';

            const trackIndex = this.blockElements.length;
            const summaryBtn = document.createElement('button');
            summaryBtn.type = 'button';
            summaryBtn.className = 'ff-comprehension-btn';
            summaryBtn.dataset.blockIndex = String(trackIndex);
            summaryBtn.dataset.i18n = 'comprehension.generate';
            summaryBtn.textContent = (typeof I18n !== 'undefined') ? I18n.t('comprehension.generate') : 'Summarize';
            summaryBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof FocusFlow === 'undefined') return;
                const cached = FocusFlow._blockSummaryCache && FocusFlow._blockSummaryCache[trackIndex];
                if (cached && FocusFlow.reopenComprehensionForBlock) {
                    FocusFlow.reopenComprehensionForBlock(trackIndex);
                } else if (FocusFlow.requestComprehensionForBlock) {
                    FocusFlow.requestComprehensionForBlock(trackIndex, { manual: true });
                }
            });

            actions.appendChild(summaryBtn);
            el.appendChild(actions);

            const numEl = document.createElement('span');
            numEl.className = 'ff-block-number';
            numEl.textContent = paragraphNumber;
            el.appendChild(numEl);
            paragraphNumber++;

            this.container.appendChild(el);
            this._blockTexts.push(block.text);
            this.blockElements.push(el);
            blockCounter++;
        }

        if (this._paragraphDebugEnabled) {
            this._syncParagraphDebugOverlays();
        }
    }

    getBlockElement(blockIndex) {
        return this.blockElements[blockIndex] || null;
    }

    getBlockText(blockIndex) {
        return this._blockTexts[blockIndex] || '';
    }

    getBlockWordCount(blockIndex) {
        const el = this.getBlockElement(blockIndex);
        if (!el) return 0;
        const parsed = parseInt(el.dataset.wordCount, 10);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
        return this._countWords(this.getBlockText(blockIndex));
    }

    updateComprehensionButton(blockIndex, state) {
        const el = this.getBlockElement(blockIndex);
        if (!el) return;
        const btn = el.querySelector('.ff-comprehension-btn');
        if (!btn) return;

        if (state === 'hidden') {
            btn.hidden = true;
            return;
        }

        btn.hidden = false;
        const isReopen = state === 'reopen';
        btn.classList.toggle('ff-comprehension-btn--ready', isReopen);
        const key = isReopen ? 'comprehension.reopen' : 'comprehension.generate';
        btn.dataset.i18n = key;
        btn.textContent = (typeof I18n !== 'undefined') ? I18n.t(key) : (isReopen ? 'Show overview' : 'Summarize');
    }

    _countWords(text) {
        const trimmed = (text || '').trim();
        if (!trimmed) return 0;
        const cjk = trimmed.match(/[\u4e00-\u9fff]/g);
        const latin = trimmed.match(/[A-Za-z0-9']+/g);
        if (cjk && cjk.length > 0) {
            return cjk.length + (latin ? latin.length : 0);
        }
        return latin ? latin.length : trimmed.split(/\s+/).filter(Boolean).length;
    }

    /**
     * Toggle paragraph boundary debug overlays.
     */
    toggleParagraphDebug() {
        this.setParagraphDebug(!this._paragraphDebugEnabled);
        return this._paragraphDebugEnabled;
    }

    isParagraphDebugEnabled() {
        return this._paragraphDebugEnabled;
    }

    /**
     * Enable or disable paragraph boundary visualization.
     */
    setParagraphDebug(enabled) {
        this._paragraphDebugEnabled = !!enabled;

        if (this.container) {
            this.container.classList.toggle('ff-paragraph-debug', this._paragraphDebugEnabled);
        }

        const panel = document.getElementById('ff-reading-panel');
        if (panel) {
            panel.classList.toggle('ff-paragraph-debug-active', this._paragraphDebugEnabled);
        }

        if (this._paragraphDebugEnabled) {
            this._ensureParagraphDebugLegend();
            this._syncParagraphDebugOverlays();
            window.addEventListener('resize', this._boundSyncParagraphDebug);
            window.addEventListener('scroll', this._boundSyncParagraphDebug, true);
        } else {
            this._clearParagraphDebugOverlays();
            window.removeEventListener('resize', this._boundSyncParagraphDebug);
            window.removeEventListener('scroll', this._boundSyncParagraphDebug, true);
            if (this._paragraphDebugLegend) {
                this._paragraphDebugLegend.remove();
                this._paragraphDebugLegend = null;
            }
        }

        document.dispatchEvent(new CustomEvent('focusflow-paragraph-debug-change', {
            detail: { enabled: this._paragraphDebugEnabled }
        }));
    }

    _ensureParagraphDebugLegend() {
        if (this._paragraphDebugLegend) return;

        const panel = document.getElementById('ff-reading-panel');
        if (!panel) return;

        this._paragraphDebugLegend = document.createElement('div');
        this._paragraphDebugLegend.id = 'ff-paragraph-debug-legend';
        this._paragraphDebugLegend.className = 'ff-paragraph-debug-legend';
        this._paragraphDebugLegend.innerHTML = `
            <div class="ff-paragraph-debug-legend__title" data-i18n="debug.paragraph.title">Paragraph Debug</div>
            <div class="ff-paragraph-debug-legend__stats" id="ff-paragraph-debug-stats"></div>
            <ul class="ff-paragraph-debug-legend__list">
                <li><span class="ff-debug-swatch ff-debug-swatch--track"></span><span data-i18n="debug.paragraph.track">Tracked paragraph</span></li>
                <li><span class="ff-debug-swatch ff-debug-swatch--heading"></span><span data-i18n="debug.paragraph.heading">Section heading</span></li>
                <li><span class="ff-debug-swatch ff-debug-swatch--title"></span><span data-i18n="debug.paragraph.titleBlock">Title / subtitle</span></li>
            </ul>
        `;
        panel.appendChild(this._paragraphDebugLegend);

        if (typeof I18n !== 'undefined') {
            I18n.applyElement(this._paragraphDebugLegend);
        }
    }

    _clearParagraphDebugOverlays() {
        if (!this.container) return;
        this.container.querySelectorAll('.ff-paragraph-debug-badge').forEach(el => el.remove());
    }

    _syncParagraphDebugOverlays() {
        if (!this._paragraphDebugEnabled || !this.container) return;

        this._clearParagraphDebugOverlays();

        const blocks = this.container.querySelectorAll('.ff-block');
        blocks.forEach((el, index) => {
            const splitType = el.dataset.splitType || 'unknown';
            const badge = document.createElement('div');
            badge.className = `ff-paragraph-debug-badge ff-paragraph-debug-badge--${splitType}`;
            badge.textContent = this._formatDebugBadge(el, splitType, index);
            el.appendChild(badge);
        });

        this._updateParagraphDebugLegend();
    }

    _formatDebugBadge(el, splitType, domIndex) {
        const chars = el.dataset.charCount || '0';
        const blockId = el.dataset.blockId || `#${domIndex}`;

        if (splitType === 'paragraph') {
            const trackIndex = el.dataset.trackIndex ?? '-';
            const words = el.dataset.wordCount || '0';
            const label = (typeof I18n !== 'undefined')
                ? I18n.t('debug.paragraph.badgeTrack', { index: trackIndex, chars, words })
                : `P${trackIndex} · ${chars}c · ${words}w`;
            return `${label} · ${blockId}`;
        }

        if (splitType === 'heading') {
            const label = (typeof I18n !== 'undefined')
                ? I18n.t('debug.paragraph.badgeHeading', { chars })
                : `H · ${chars}c`;
            return `${label} · ${blockId}`;
        }

        const typeLabel = splitType === 'title'
            ? ((typeof I18n !== 'undefined') ? I18n.t('debug.paragraph.typeTitle') : 'TITLE')
            : splitType === 'subtitle'
                ? ((typeof I18n !== 'undefined') ? I18n.t('debug.paragraph.typeSubtitle') : 'SUBTITLE')
                : splitType.toUpperCase();

        return `${typeLabel} · ${chars}c · ${blockId}`;
    }

    _updateParagraphDebugLegend() {
        if (!this._paragraphDebugLegend) return;

        const statsEl = this._paragraphDebugLegend.querySelector('#ff-paragraph-debug-stats');
        if (!statsEl || !this.container) return;

        const allBlocks = this.container.querySelectorAll('.ff-block');
        const headings = this.container.querySelectorAll('[data-split-type="heading"]').length;
        const titles = this.container.querySelectorAll('[data-split-type="title"], [data-split-type="subtitle"]').length;
        const tracked = this.blockElements.length;

        const t = (key, params) => {
            if (typeof I18n !== 'undefined') return I18n.t(key, params);
            return key;
        };

        statsEl.textContent = t('debug.paragraph.stats', {
            total: allBlocks.length,
            tracked,
            headings,
            titles
        });
    }

    /**
     * Ensure the gaze cursor exists and is attached to document.body.
     */
    ensureGazeCursor() {
        if (!this._gazeCursor) {
            this._buildGazeCursor();
            return this._gazeCursor;
        }
        if (!this._gazeCursor.parentNode || this._gazeCursor.parentNode !== document.body) {
            document.body.appendChild(this._gazeCursor);
        }
        return this._gazeCursor;
    }

    /**
     * Build the gaze cursor element with enhanced visual feedback
     * Includes an outer glow ring and inner dot for layered depth
     */
    _buildGazeCursor() {
        this._gazeCursor = document.createElement('div');
        this._gazeCursor.id = 'ff-gaze-cursor';
        this._gazeCursor.style.cssText = `
            position: fixed;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            pointer-events: none;
            z-index: 997;
            background: radial-gradient(circle, rgba(107, 159, 255, 0.15) 0%, rgba(107, 159, 255, 0.05) 40%, transparent 70%);
            border: 1.5px solid rgba(107, 159, 255, 0.2);
            transform: translate(-50%, -50%);
            transition: left 0.08s ease-out, top 0.08s ease-out, opacity 0.4s ease;
            opacity: 0;
            box-shadow: 0 0 20px rgba(107, 159, 255, 0.12), 0 0 40px rgba(107, 159, 255, 0.04);
            will-change: transform, left, top;
        `;
        document.body.appendChild(this._gazeCursor);
        
        // Inner dot for precision feedback
        const inner = document.createElement('div');
        inner.style.cssText = `
            position: absolute;
            top: 50%; left: 50%;
            width: 6px; height: 6px;
            border-radius: 50%;
            background: rgba(107, 159, 255, 0.4);
            transform: translate(-50%, -50%);
            transition: all 0.2s ease;
            box-shadow: 0 0 10px rgba(107, 159, 255, 0.25);
        `;
        this._gazeCursor.appendChild(inner);
    }

    /**
     * Update gaze cursor position with smooth following and organic motion pulse
     * @param {number} x 
     * @param {number} y 
     */
    updateGazeCursor(x, y) {
        // Gaze dot is rendered by WebGazer (#webgazerGazeDot), not a custom cursor.
        if (this._gazeCursor) {
            this.hideGazeCursor();
        }
    }

    /**
     * Refresh cached bounding rects for all paragraph blocks.
     */
    refreshBlockRects() {
        this._lastRectRefreshTs = performance.now();
        this.blockRects = this.blockElements.map(el => el.getBoundingClientRect());
    }

    /**
     * Schedule a throttled block-rect refresh to avoid heavy per-frame recalculation.
     */
    scheduleRectRefresh() {
        const now = performance.now();
        if ((now - this._lastRectRefreshTs) < this._rectRefreshThrottleMs) return;
        this.refreshBlockRects();
    }

    _bindLayoutListeners() {
        window.addEventListener('scroll', this._boundScheduleRectRefresh, { passive: true });
        window.addEventListener('resize', this._boundScheduleRectRefresh, { passive: true });
    }

    /**
     * Map gaze coordinates to the paragraph block the user is looking at.
     * 
     * @param {number} gazeX - Normalized gaze X (viewport px)
     * @param {number} gazeY - Normalized gaze Y (viewport px)
     * @returns {Object|null} { index, blockId, element, rect }
     */
    getBlockAtGaze(gazeX, gazeY) {
        if (this.blockElements.length === 0) return null;

        if (this.blockRects.length !== this.blockElements.length) {
            this.refreshBlockRects();
        }

        const readingRect = this.container.getBoundingClientRect();
        
        if (gazeY < readingRect.top || gazeY > readingRect.bottom) {
            return null;
        }

        let closestIndex = -1;
        let closestDistance = Infinity;

        for (let i = 0; i < this.blockRects.length; i++) {
            const rect = this.blockRects[i];
            const blockCenterY = rect.top + rect.height / 2;
            const distance = Math.abs(gazeY - blockCenterY);

            const inHorizontalRange = gazeX >= rect.left - 50 && gazeX <= rect.right + 50;
            const adjustedDistance = inHorizontalRange ? distance * 0.7 : distance;

            if (adjustedDistance < closestDistance) {
                closestDistance = adjustedDistance;
                closestIndex = i;
            }
        }

        if (closestIndex >= 0 && closestDistance < 200) {
            const el = this.blockElements[closestIndex];
            return {
                index: closestIndex,
                blockId: el.dataset.blockId,
                element: el,
                rect: this.blockRects[closestIndex]
            };
        }

        return null;
    }

    /**
     * Set the highlighted paragraph block.
     * @param {number} blockIndex
     */
    setCurrentBlock(blockIndex) {
        this.currentHighlightIndex = blockIndex;
    }

    /**
     * Hide gaze cursor
     */
    hideGazeCursor() {
        if (this._gazeCursor) {
            this._gazeCursor.style.opacity = '0';
        }
    }

    /**
     * Apply adaptive typography based on cognitive state
     * @param {string} state - 'Normal' | 'Struggling' | 'Distracted'
     */
    applyAdaptiveTypography(state) {
        if (!this.config || this.config.adaptiveTypography === false) return;
        this._cognitiveState = state;
        
        let fontSize = this._baseFontSize;
        let lineHeight = this._baseLineHeight;
        let letterSpacing = this._baseLetterSpacing;
        let paragraphGap = this._baseParagraphGap;
        let fontWeight = 400;
        
        switch (state) {
            case 'Struggling':
                fontSize = this._baseFontSize + 2;
                lineHeight = this._baseLineHeight + 0.2;
                letterSpacing = this._baseLetterSpacing + 0.15;
                paragraphGap = this._baseParagraphGap + 3;
                fontWeight = 500;
                break;
                
            case 'Distracted':
                fontSize = this._baseFontSize + 1;
                lineHeight = this._baseLineHeight + 0.15;
                letterSpacing = this._baseLetterSpacing + 0.08;
                paragraphGap = this._baseParagraphGap + 2;
                fontWeight = 450;
                break;
                
            default: // Normal
                fontSize = this._baseFontSize;
                lineHeight = this._baseLineHeight;
                letterSpacing = this._baseLetterSpacing;
                paragraphGap = this._baseParagraphGap;
                fontWeight = 400;
        }
        
        // Apply CSS custom properties
        this.container.style.setProperty('--reading-font-size', `${fontSize}px`);
        this.container.style.fontSize = `${fontSize}px`;
        this.container.style.lineHeight = lineHeight;
        this.container.style.letterSpacing = `${letterSpacing}px`;
        this.container.style.fontWeight = fontWeight;
        
        // Apply paragraph gaps
        this.blockElements.forEach(el => {
            el.style.marginBottom = `${paragraphGap}px`;
        });
        
        // Update CSS variable on root for other elements
        document.documentElement.style.setProperty('--reading-font-size', `${fontSize}px`);
        document.documentElement.style.setProperty('--reading-line-height', `${lineHeight}`);
        document.documentElement.style.setProperty('--reading-letter-spacing', `${letterSpacing}px`);
        document.documentElement.style.setProperty('--reading-paragraph-gap', `${paragraphGap}px`);
        document.documentElement.style.setProperty('--reading-font-weight', fontWeight);
        
        // Refresh block rects since layout changed
        setTimeout(() => this.scheduleRectRefresh(), 100);
    }

    /**
     * Get the reading progress as a fraction 0-1
     * @param {number} blockIndex - Current block index
     * @returns {number} 0 to 1
     */
    getReadingProgress(blockIndex) {
        if (blockIndex < 0) return 0;
        return Math.min(1, (blockIndex + 1) / this.blockElements.length);
    }

    /**
     * Load content from a plain text string
     * @param {string} text - The plain text content to load
     * @param {string} [label='imported'] - Optional source label
     */
    loadFromText(text, label = 'imported') {
        this._loadRawText(text, label);
    }

    /**
     * Get WPM value
     */
    getWpm() {
        if (typeof FocusFlow !== 'undefined' && FocusFlow.analytics) {
            return FocusFlow.analytics.getLastReadingSpeed();
        }
        return 0;
    }

    /**
     * Reset the reading view
     */
    reset() {
        this.currentHighlightIndex = -1;
        this.currentBlockId = null;
        this.isDimmed = false;
        this.dimIntensity = 0;
        this.hideGazeCursor();
    }
    
    /**
     * Clean up
     */
    destroy() {
        window.removeEventListener('scroll', this._boundScheduleRectRefresh);
        window.removeEventListener('resize', this._boundScheduleRectRefresh);
        if (this._gazeCursor && this._gazeCursor.parentNode) {
            this._gazeCursor.parentNode.removeChild(this._gazeCursor);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReadingView;
}
