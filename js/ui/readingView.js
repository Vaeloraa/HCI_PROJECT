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
        
        // Adaptive typography state
        this._cognitiveState = 'Normal';
        this._baseFontSize = 15;
        this._baseLineHeight = 2;
        this._baseLetterSpacing = 0.3;
        this._baseParagraphGap = 6;
        
        // WPM tracking
        this._wpmValue = 0;
        this._blockStartTime = 0;
        this._currentBlockWordCount = 0;
        this._wpmUpdateInterval = null;
        
        // Gaze cursor
        this._gazeCursor = null;
        this._lastGazeX = 0;
        this._lastGazeY = 0;
        this._gazePulseTimeout = null;
        
        // Sample reading content
        this.content = [
            {
                type: 'h1',
                text: 'Understanding Neural Plasticity: The Brain\'s Remarkable Ability to Rewire Itself'
            },
            {
                type: 'subtitle',
                text: 'How Experience and Learning Shape the Structural Organization of the Human Brain'
            },
            {
                type: 'section',
                heading: 'Introduction to Neural Plasticity',
                paragraphs: [
                    'Neural plasticity, also known as neuroplasticity or brain plasticity, refers to the brain\'s remarkable ability to reorganize itself by forming new neural connections throughout life. This fundamental property of the nervous system allows neurons (nerve cells) to adjust their activities in response to new situations, changes in the environment, or injury.',
                    
                    'Historically, scientists believed that the brain\'s structure was fixed after a critical period during childhood. However, groundbreaking research over the past several decades has demonstrated that the brain continues to change and adapt well into old age. This discovery has revolutionized our understanding of human development, learning, and recovery from brain damage.',
                    
                    'The concept of neuroplasticity encompasses several different processes that occur throughout the lifespan. These include the formation of new synaptic connections between neurons, the strengthening or weakening of existing connections based on activity patterns, and even the generation of new neurons—a process called neurogenesis.'
                ]
            },
            {
                type: 'section',
                heading: 'Mechanisms of Synaptic Plasticity',
                paragraphs: [
                    'At the cellular level, plasticity is driven by changes in synaptic strength—the efficiency with which signals are transmitted between neurons. The most well-studied form of synaptic plasticity is long-term potentiation (LTP), a persistent strengthening of synapses based on recent patterns of activity. LTP is widely considered one of the primary cellular mechanisms underlying learning and memory formation.',
                    
                    'Long-term depression (LTD) is another important process that weakens synaptic connections that are rarely used. This selective pruning helps eliminate unnecessary or redundant neural pathways, making the brain more efficient. Together, LTP and LTD allow the brain to continuously refine its neural circuitry based on experience, a process sometimes summarized as "neurons that fire together, wire together."',
                    
                    'Recent studies have also revealed the importance of structural plasticity, where neurons physically change their shape and connectivity. Dendritic spines—tiny protrusions on neurons where synapses form—can appear, enlarge, shrink, or disappear within hours of new learning experiences. This structural remodeling provides the anatomical basis for long-term memory storage.'
                ]
            },
            {
                type: 'section',
                heading: 'Environmental Enrichment and Brain Development',
                paragraphs: [
                    'Research on environmental enrichment has provided compelling evidence for experience-dependent plasticity. Studies comparing animals raised in enriched environments (with toys, social interaction, and physical activity) to those in standard laboratory conditions have found significant differences in brain structure. Enriched animals show increased cortical thickness, more dendritic branching, and higher numbers of synapses per neuron.',
                    
                    'These findings have important implications for human development, particularly in educational settings. Environments that provide diverse sensory stimulation, opportunities for physical activity, and social interaction appear to promote optimal brain development in children. Similarly, continuing education and mentally stimulating activities in older adults have been associated with reduced risk of cognitive decline.',
                    
                    'The concept of cognitive reserve—the brain\'s ability to cope with damage by using alternative neural networks—is closely linked to neuroplasticity. Individuals with higher educational attainment or those who engage regularly in intellectually demanding activities often show better cognitive function despite significant brain pathology, suggesting that their brains have developed more efficient or alternative neural pathways.'
                ]
            },
            {
                type: 'section',
                heading: 'Recovery from Brain Injury',
                paragraphs: [
                    'One of the most clinically significant aspects of neuroplasticity is the brain\'s capacity for recovery after injury. Following stroke, traumatic brain injury, or other neurological damage, the brain can reorganize its functions by forming new connections and recruiting alternative neural pathways. This recovery process often involves both structural changes—such as axonal sprouting where undamaged neurons grow new branches—and functional reorganization where nearby brain regions take over tasks previously performed by damaged areas.',
                    
                    'Rehabilitation therapies explicitly leverage neuroplasticity to promote recovery. Constraint-induced movement therapy, for example, forces use of a affected limb after stroke by restricting the unaffected limb, leading to cortical reorganization and improved motor function. Similarly, speech and language therapy after aphasia (loss of language ability) can stimulate perilesional areas or the contralateral hemisphere to assume language functions.',
                    
                    'The timing of rehabilitation is crucial. Research shows that there is a critical window of heightened plasticity following brain injury, typically lasting weeks to months. During this period, the brain is particularly receptive to therapeutic interventions. Early, intensive rehabilitation during this window can significantly improve functional outcomes compared to delayed treatment.'
                ]
            },
            {
                type: 'section',
                heading: 'Limits and Constraints on Plasticity',
                paragraphs: [
                    'Despite the brain\'s remarkable plasticity, there are important limits and constraints. Critical periods for certain types of learning—such as language acquisition and visual development—mean that some skills are most easily acquired during specific developmental windows. While adults can certainly learn new languages or recover from visual deprivation, the process is typically slower and less complete than during childhood.',
                    
                    'The concept of homeostatic plasticity suggests that the brain maintains an overall balance of excitation and inhibition. While Hebbian plasticity (LTP/LTD) drives specific changes based on activity patterns, homeostatic mechanisms ensure that overall neural activity remains within a functional range. This prevents runaway excitation or complete silencing of neural circuits.',
                    
                    'Aging also imposes constraints on plasticity. While the adult brain retains significant plasticity throughout life, the rate of neurogenesis declines with age, and the molecular mechanisms underlying synaptic plasticity become less efficient. However, regular physical exercise, cognitive engagement, and social interaction have all been shown to mitigate these age-related declines and maintain higher levels of brain plasticity.'
                ]
            },
            {
                type: 'section',
                heading: 'Future Directions and Therapeutic Applications',
                paragraphs: [
                    'Understanding the molecular mechanisms of plasticity has opened new avenues for therapeutic intervention. Drugs that enhance LTP, such as certain nootropics and cognitive enhancers, are being investigated for their potential to improve learning and memory in both healthy individuals and those with cognitive impairments. More controversially, compounds that reopen critical periods of plasticity in the adult brain could potentially enhance recovery from injury but raise ethical questions about cognitive enhancement.',
                    
                    'Non-invasive brain stimulation techniques, including transcranial magnetic stimulation (TMS) and transcranial direct current stimulation (tDCS), are being explored as tools to modulate cortical excitability and enhance plasticity. These techniques can either increase or decrease excitability in specific brain regions, potentially facilitating learning or promoting recovery from neurological disorders.',
                    
                    'The integration of neuroplasticity research with artificial intelligence and brain-computer interfaces represents another exciting frontier. Understanding how biological neural networks reorganize themselves could inspire more adaptive and resilient artificial neural networks, while brain-computer interfaces might one day harness neuroplasticity to help patients with paralysis control prosthetic limbs or communicate through thought alone.'
                ]
            },
            {
                type: 'conclusion',
                text: 'In conclusion, neural plasticity is a fundamental property of the brain that enables adaptation, learning, and recovery across the lifespan. From the molecular mechanisms of synaptic change to the macroscopic reorganization of neural circuits following injury, plasticity shapes every aspect of cognitive function. As research continues to uncover the intricate mechanisms underlying plasticity, new opportunities for therapeutic intervention and cognitive enhancement will undoubtedly emerge.'
            }
        ];
        
        this._buildContent();
        // this._buildGazeCursor(); // Disabled: Remove screen dot visualization
        this._startWpmTracking();
    }

    /**
     * Build the reading content DOM structure with block-level paragraph elements.
     * Each paragraph gets a data-block-id for gaze-to-paragraph mapping.
     * Paragraphs are numbered for navigation.
     */
    _buildContent() {
        this.container.innerHTML = '';
        this.blockElements = [];
        this.blockRects = [];
        let blockCounter = 0;
        let paragraphNumber = 1;

        for (const section of this.content) {
            if (section.type === 'h1') {
                const el = document.createElement('h1');
                el.className = 'reading-title ff-block';
                el.textContent = section.text;
                el.dataset.blockId = 'title';
                el.style.position = 'relative';
                this.container.appendChild(el);

            } else if (section.type === 'subtitle') {
                const el = document.createElement('p');
                el.className = 'reading-subtitle ff-block';
                el.textContent = section.text;
                el.dataset.blockId = 'subtitle';
                el.style.position = 'relative';
                this.container.appendChild(el);

            } else if (section.type === 'section' && section.heading) {
                const headingEl = document.createElement('h2');
                headingEl.className = 'section-heading ff-block';
                headingEl.textContent = section.heading;
                headingEl.dataset.blockId = `heading-${blockCounter}`;
                headingEl.style.position = 'relative';
                this.container.appendChild(headingEl);
                blockCounter++;

                for (const paraText of section.paragraphs) {
                    const el = document.createElement('p');
                    el.className = 'content-paragraph ff-block';
                    el.textContent = paraText;
                    el.dataset.blockId = `block-${blockCounter}`;
                    el.style.position = 'relative';
                    
                    // Add paragraph number
                    const numEl = document.createElement('span');
                    numEl.className = 'ff-block-number';
                    numEl.textContent = paragraphNumber;
                    el.appendChild(numEl);
                    paragraphNumber++;
                    
                    this.container.appendChild(el);
                    this.blockElements.push(el);
                    blockCounter++;
                }

            } else if (section.type === 'conclusion') {
                const el = document.createElement('div');
                el.className = 'conclusion-box ff-block';
                el.style.position = 'relative';
                const p = document.createElement('p');
                p.textContent = section.text;
                el.appendChild(p);
                el.dataset.blockId = 'conclusion';
                this.container.appendChild(el);
                blockCounter++;
            }
        }
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
        if (!this._gazeCursor) return;
        if (this.config && (this.config.showGazeDot === false || this.config.trackingMode === 'mouse')) {
            this.hideGazeCursor();
            return;
        }
        
        this._gazeCursor.style.left = `${x}px`;
        this._gazeCursor.style.top = `${y}px`;
        this._gazeCursor.style.opacity = '1';
        
        // Subtle scale pulse based on motion speed for organic feel
        if (this._lastGazeX !== undefined && this._lastGazeY !== undefined) {
            const dx = x - this._lastGazeX;
            const dy = y - this._lastGazeY;
            const speed = Math.sqrt(dx * dx + dy * dy);
            if (speed > 2) {
                const pulse = Math.min(1.25, 1 + speed * 0.004);
                this._gazeCursor.style.transform = `translate(-50%, -50%) scale(${pulse})`;
                clearTimeout(this._gazePulseTimeout);
                this._gazePulseTimeout = setTimeout(() => {
                    if (this._gazeCursor) {
                        this._gazeCursor.style.transform = 'translate(-50%, -50%) scale(1)';
                    }
                }, 120);
            }
        }
        this._lastGazeX = x;
        this._lastGazeY = y;
    }

    /**
     * Start WPM tracking interval
     */
    _startWpmTracking() {
        if (this._wpmUpdateInterval) {
            clearInterval(this._wpmUpdateInterval);
        }
        this._wpmUpdateInterval = setInterval(() => {
            this._updateWpm();
        }, 2000);
    }

    /**
     * Update WPM calculation
     */
    _updateWpm() {
        if (!this._blockStartTime || !this._currentBlockWordCount) return;
        
        const elapsed = (Date.now() - this._blockStartTime) / 1000 / 60; // in minutes
        if (elapsed > 0) {
            this._wpmValue = Math.round(this._currentBlockWordCount / elapsed);
            // Clamp to reasonable range
            this._wpmValue = Math.max(0, Math.min(800, this._wpmValue));
            this._updateWpmDisplay();
        }
    }

    /**
     * Update WPM display in reading header
     */
    _updateWpmDisplay() {
        // Try new WPM element first, fall back to dashboard metric
        const wpmEl = document.getElementById('ff-wpm-value');
        if (wpmEl) {
            wpmEl.textContent = this._wpmValue;
        }
        // Also update the reading header stat
        const headerWpm = document.getElementById('ff-wpm');
        if (headerWpm) {
            headerWpm.textContent = this._wpmValue > 0 ? this._wpmValue + ' wpm' : '-- wpm';
        }
    }

    /**
     * Refresh cached bounding rects for all paragraph blocks.
     */
    refreshBlockRects() {
        this.blockRects = this.blockElements.map(el => el.getBoundingClientRect());
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
     * Set block dwell time for WPM tracking
     * @param {number} blockIndex 
     * @param {string} text 
     */
    setCurrentBlock(blockIndex, text) {
        this.currentHighlightIndex = blockIndex;
        if (text) {
            this._currentBlockWordCount = text.split(/\s+/).filter(w => w.length > 0).length;
            this._blockStartTime = Date.now();
        }
        
        // Update gaze cursor position to block center
        if (blockIndex >= 0 && blockIndex < this.blockElements.length) {
            const el = this.blockElements[blockIndex];
            const rect = el.getBoundingClientRect();
            this.updateGazeCursor(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
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
     * @param {string} state - 'Normal' | 'Struggling' | 'Distracted' | 'Recovering'
     */
    applyAdaptiveTypography(state) {
        this._cognitiveState = state;
        
        let fontSize = this._baseFontSize;
        let lineHeight = this._baseLineHeight;
        let letterSpacing = this._baseLetterSpacing;
        let paragraphGap = this._baseParagraphGap;
        let fontWeight = 400;
        
        switch (state) {
            case 'Struggling':
                // Increase readability for struggling users
                fontSize = this._baseFontSize + 3;
                lineHeight = this._baseLineHeight + 0.3;
                letterSpacing = this._baseLetterSpacing + 0.2;
                paragraphGap = this._baseParagraphGap + 4;
                fontWeight = 500;
                break;
                
            case 'Distracted':
                // Slightly larger, more spacing to re-engage
                fontSize = this._baseFontSize + 2;
                lineHeight = this._baseLineHeight + 0.2;
                letterSpacing = this._baseLetterSpacing + 0.1;
                paragraphGap = this._baseParagraphGap + 3;
                fontWeight = 450;
                break;
                
            case 'Recovering':
                // Transitional - slightly enhanced but calming
                fontSize = this._baseFontSize + 1;
                lineHeight = this._baseLineHeight + 0.1;
                paragraphGap = this._baseParagraphGap + 2;
                fontWeight = 425;
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
        setTimeout(() => this.refreshBlockRects(), 100);
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
     * Scroll smoothly to a specific block
     * @param {number} blockIndex 
     */
    scrollToBlock(blockIndex) {
        if (blockIndex < 0 || blockIndex >= this.blockElements.length) return;
        const el = this.blockElements[blockIndex];
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /**
     * Load content from a plain text string
     * @param {string} text - The plain text content to load
     * @param {string} [label='imported'] - Optional source label
     */
    loadFromText(text, label = 'imported') {
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        const newContent = [];
        let currentSection = null;
        let paraBuffer = [];

        if (lines.length > 0) {
            newContent.push({ type: 'h1', text: lines[0] });
        }

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.length < 80 && !line.endsWith('.') && !line.endsWith('?') && !line.endsWith('!')) {
                if (paraBuffer.length > 0) {
                    if (currentSection) {
                        currentSection.paragraphs.push(paraBuffer.join(' '));
                    } else {
                        newContent.push({ type: 'section', heading: 'Paragraph', paragraphs: [paraBuffer.join(' ')] });
                    }
                    paraBuffer = [];
                }
                currentSection = { type: 'section', heading: line, paragraphs: [] };
                newContent.push(currentSection);
            } else {
                paraBuffer.push(line);
                if (paraBuffer.length >= 5) {
                    if (currentSection) {
                        currentSection.paragraphs.push(paraBuffer.join(' '));
                    } else {
                        newContent.push({ type: 'section', heading: 'Content', paragraphs: [paraBuffer.join(' ')] });
                    }
                    paraBuffer = [];
                }
            }
        }
        if (paraBuffer.length > 0) {
            if (currentSection) {
                currentSection.paragraphs.push(paraBuffer.join(' '));
            } else {
                newContent.push({ type: 'section', heading: 'Content', paragraphs: [paraBuffer.join(' ')] });
            }
        }

        newContent.push({ type: 'conclusion', text: '— End of Imported Content —' });

        this.content = newContent;
        this.sourceLabel = label;
        this._buildContent();
        this.refreshBlockRects();

        this.container.dispatchEvent(new CustomEvent('content-loaded', {
            detail: { source: label, paragraphs: this.blockElements.length }
        }));
    }

    /**
     * Get WPM value
     */
    getWpm() {
        return this._wpmValue;
    }

    /**
     * Reset the reading view
     */
    reset() {
        this.currentHighlightIndex = -1;
        this.currentBlockId = null;
        this.isDimmed = false;
        this.dimIntensity = 0;
        this._wpmValue = 0;
        this._currentBlockWordCount = 0;
        this._blockStartTime = 0;
        this.hideGazeCursor();
        this._updateWpmDisplay();
    }
    
    /**
     * Clean up
     */
    destroy() {
        if (this._wpmUpdateInterval) {
            clearInterval(this._wpmUpdateInterval);
        }
        if (this._gazeCursor && this._gazeCursor.parentNode) {
            this._gazeCursor.parentNode.removeChild(this._gazeCursor);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReadingView;
}
