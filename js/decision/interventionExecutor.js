/**
 * FocusFlow - Intervention Executor
 *
 * Binds resolved strategy → sidebar + UI actions.
 * activate() on state/strategy change; sustain() every frame.
 */

const InterventionExecutor = {
    SUSTAINED: {
        none: { dim: 0 },
        focus: { dim: 0 },
        floating_prompt: { dim: 0.3 },
        sound_alert: { dim: 0.45 },
        keyword_highlight: { dim: 0.15 },
        summary_panel: { dim: 0.25 }
    },

    _activeId: 'none',
    _keywordBlockIndex: -1,

    /**
     * Fire one-shot intervention when state or strategy tier changes.
     */
    activate(strategy, ctx, options) {
        const nextId = (strategy && strategy.id) ? strategy.id : 'none';
        const force = !!(options && options.force);

        if (nextId === 'none' || nextId === 'focus') {
            this.deactivateAll(ctx);
            this._activeId = nextId;
            return;
        }

        if (nextId === this._activeId && nextId !== 'keyword_highlight' && !force) {
            return;
        }

        this._deactivatePartial(this._activeId, ctx, nextId);

        const handler = this._ACTIVATE[nextId];
        if (handler) handler.call(this, strategy, ctx);

        this._activeId = nextId;
    },

    deactivateAll(ctx) {
        this._deactivatePartial(this._activeId, ctx, 'none');
        const ve = ctx && ctx.focusFlow && ctx.focusFlow.visualEffects;
        if (ve) {
            ve.setDimLevel(0);
            ve.clearHighlight();
            ve.clearKeywordHighlights();
            ve.showWakeupOverlay(false);
        }
        this._activeId = 'none';
        this._keywordBlockIndex = -1;
    },

    sustain(strategy, ctx) {
        const ff = ctx.focusFlow;
        const state = ctx.state;
        const gazeBlock = ctx.gazeBlock;
        const strategyId = (strategy && strategy.id) ? strategy.id : 'none';
        const ve = ff.visualEffects;

        if (!ve) return;

        ve.currentState = state.name;

        if (state.name === 'Normal' || state.name === 'Idle' || strategyId === 'focus' || strategyId === 'none') {
            ve.clearHighlight();
            ve.setDimLevel(0);
            return;
        }

        const blockIndex = this._blockIndex(ctx);
        const blockEl = blockIndex >= 0 && ff.readingView
            ? ff.readingView.getBlockElement(blockIndex)
            : null;

        if (strategyId === 'keyword_highlight' && blockEl) {
            ve.highlightElement(blockEl, 'Struggling');
            if (blockIndex !== this._keywordBlockIndex) {
                this._applyKeywordHighlights(ff, blockIndex, blockEl);
                this._keywordBlockIndex = blockIndex;
            }
        } else if (state.name === 'Struggling' && blockEl) {
            ve.highlightElement(blockEl, 'Struggling');
        } else {
            ve.clearHighlight();
        }

        const sustained = this.SUSTAINED[strategyId] || this.SUSTAINED.none;
        const durationBoost = sustained.dim > 0
            ? Math.min(0.1, ((state.duration || 0) / 12000) * 0.1)
            : 0;
        const dim = Math.min(1, sustained.dim + durationBoost);
        ve.setDimLevel(dim * (ff.config.dimIntensity || 0.35));
    },

    reset(ctx) {
        this.deactivateAll(ctx);
    },

    _deactivatePartial(prevId, ctx, nextId) {
        const ve = ctx && ctx.focusFlow && ctx.focusFlow.visualEffects;
        if (!ve) return;

        if (prevId === 'keyword_highlight' && nextId !== 'keyword_highlight') {
            ve.clearKeywordHighlights();
            this._keywordBlockIndex = -1;
        }
        if (prevId === 'sound_alert' && nextId !== 'sound_alert') {
            ve.showWakeupOverlay(false);
        }
    },

    _t(key, params) {
        if (typeof I18n !== 'undefined') return I18n.t(key, params);
        return key;
    },

    _prompt(icon, titleKey, subKey, params) {
        const ff = window.FocusFlow;
        if (!ff || !ff.visualEffects) return;
        ff.visualEffects.showPrompt(
            icon,
            this._t(titleKey, params),
            subKey ? this._t(subKey, params) : ''
        );
    },

    _blockIndex(ctx) {
        const gazeBlock = ctx.gazeBlock;
        if (gazeBlock && gazeBlock.index >= 0) return gazeBlock.index;
        const features = ctx.features || {};
        if (features.readingBlockIndex >= 0) return features.readingBlockIndex;
        return -1;
    },

    _applyKeywordHighlights(ff, blockIndex, el) {
        if (!ff.keywordExtractor || !el) return;
        const text = ff._allBlockTexts && ff._allBlockTexts[blockIndex]
            ? ff._allBlockTexts[blockIndex]
            : (el.textContent || '');
        const keywords = ff.keywordExtractor.extractFromBlock(
            text,
            blockIndex,
            ff._allBlockTexts || []
        );
        if (ff.visualEffects) {
            ff.visualEffects.applyKeywordHighlights(el, keywords);
        }
    },

    _ACTIVATE: {
        floating_prompt(strategy, ctx) {
            InterventionExecutor._prompt('👀', 'intervention.floating_prompt.title', 'intervention.floating_prompt.sub');
            if (ctx.focusFlow.visualEffects) {
                ctx.focusFlow.visualEffects.playSound('distracted');
            }
        },

        sound_alert(strategy, ctx) {
            const ve = ctx.focusFlow.visualEffects;
            if (ve) {
                ve.showWakeUpCue();
                ve.playSound('wakeup');
            }
            InterventionExecutor._prompt('🔔', 'intervention.sound_alert.title', 'intervention.sound_alert.sub');
        },

        keyword_highlight(strategy, ctx) {
            const ff = ctx.focusFlow;
            const blockIndex = InterventionExecutor._blockIndex(ctx);
            if (blockIndex < 0 || !ff.readingView) return;
            const el = ff.readingView.getBlockElement(blockIndex);
            if (el) {
                InterventionExecutor._applyKeywordHighlights(ff, blockIndex, el);
                InterventionExecutor._keywordBlockIndex = blockIndex;
            }
        },

        summary_panel(strategy, ctx) {
            InterventionExecutor._triggerComprehension(ctx);
        }
    },

    _triggerComprehension(ctx) {
        const ff = ctx.focusFlow;
        const blockIndex = InterventionExecutor._blockIndex(ctx);
        if (blockIndex < 0 || !ff.requestComprehensionForBlock) return;

        const features = ctx.features || {};
        if (!features.pointerInReadingPanel || !features.onReadingContent) return;

        ff.requestComprehensionForBlock(blockIndex, {
            auto: true,
            struggleTrigger: true,
            dwellTime: features.dwellTime || 0
        });
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = InterventionExecutor;
}
