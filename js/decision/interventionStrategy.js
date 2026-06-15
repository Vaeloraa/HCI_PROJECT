/**
 * FocusFlow - Intervention Strategy Selection Module
 *
 * 6 display states + 5 intervention modes (per 1.md):
 *   Focus            → focus
 *   LowDistraction   → floating_prompt (fires at 6s distracted)
 *   HighDistraction  → sound_alert (fires at 12s distracted)
 *   LowStruggling    → keyword_highlight (<8s struggling)
 *   HighStruggling   → summary_panel (≥8s struggling)
 *   Idle             → none (intermediate / waiting)
 */

class InterventionStrategy {
    constructor(config) {
        this.config = config;

        this.DISPLAY_STATES = {
            Focus: 'Focus',
            LowDistraction: 'LowDistraction',
            HighDistraction: 'HighDistraction',
            LowStruggling: 'LowStruggling',
            HighStruggling: 'HighStruggling',
            Idle: 'Idle'
        };

        this.STRATEGIES = {
            FOCUS: {
                id: 'focus',
                name: 'Focus',
                type: 'none',
                intensity: 0,
                duration: 0,
                description: 'Normal tracking, no intervention'
            },
            FLOATING_PROMPT: {
                id: 'floating_prompt',
                name: 'Floating Prompt',
                type: 'visual',
                intensity: 0.5,
                duration: 4000,
                description: 'Floating message asking to refocus'
            },
            SOUND_ALERT: {
                id: 'sound_alert',
                name: 'Sound Alert',
                type: 'audio',
                intensity: 0.8,
                duration: 2000,
                description: 'Wake border and alert sound'
            },
            KEYWORD_HIGHLIGHT: {
                id: 'keyword_highlight',
                name: 'Keyword Highlight',
                type: 'visual',
                intensity: 0.3,
                duration: 5000,
                description: 'Highlight key terms in the content'
            },
            SUMMARY_PANEL: {
                id: 'summary_panel',
                name: 'Summary Panel',
                type: 'visual',
                intensity: 0.6,
                duration: 10000,
                description: 'Show a brief summary of current section'
            }
        };

        this.strategyEffectiveness = {};
        for (const key of Object.keys(this.STRATEGIES)) {
            this.strategyEffectiveness[key] = {
                uses: 0,
                effectiveCount: 0,
                effectiveness: 0.5
            };
        }

        this.debug = config.debug || false;
    }

    /**
     * Map internal state + duration to one of 6 sidebar display states.
     */
    getDisplayState(state) {
        if (!state || !state.name) {
            return this.DISPLAY_STATES.Idle;
        }

        const durationSec = (state.duration || 0) / 1000;

        switch (state.name) {
            case 'Normal':
                return this.DISPLAY_STATES.Focus;
            case 'Distracted':
                return durationSec < 6
                    ? this.DISPLAY_STATES.LowDistraction
                    : this.DISPLAY_STATES.HighDistraction;
            case 'Struggling':
                return durationSec < 8
                    ? this.DISPLAY_STATES.LowStruggling
                    : this.DISPLAY_STATES.HighStruggling;
            case 'Idle':
                return this.DISPLAY_STATES.Idle;
            default:
                return this.DISPLAY_STATES.Idle;
        }
    }

    /**
     * Always resolve the strategy that matches the current cognitive display state.
     */
    resolve(state) {
        const display = this.getDisplayState(state);

        let strategy = null;
        switch (display) {
            case this.DISPLAY_STATES.Focus:
                strategy = this._pack('FOCUS', 'low');
                break;
            case this.DISPLAY_STATES.LowDistraction:
                strategy = this._pack('FLOATING_PROMPT', 'low');
                break;
            case this.DISPLAY_STATES.HighDistraction:
                strategy = this._pack('SOUND_ALERT', 'high');
                break;
            case this.DISPLAY_STATES.LowStruggling:
                strategy = this._pack('KEYWORD_HIGHLIGHT', 'low');
                break;
            case this.DISPLAY_STATES.HighStruggling:
                strategy = this._pack('SUMMARY_PANEL', 'high');
                break;
            default:
                return this._createNullStrategy();
        }

        if (this.debug && strategy) {
            console.log(`[Intervention] resolve ${display} → ${strategy.id} (${((state.duration || 0) / 1000).toFixed(1)}s)`);
        }

        return strategy || this._createNullStrategy();
    }

    /** @deprecated Use resolve() */
    select(state, features, userProfile) {
        return this.resolve(state);
    }

    _pack(key, tier) {
        const base = this.STRATEGIES[key];
        if (!base) return null;
        return { ...base, tier, stateKey: key };
    }

    markEffective(strategyId) {
        for (const key of Object.keys(this.strategyEffectiveness)) {
            if (this.STRATEGIES[key]?.id === strategyId) {
                this.strategyEffectiveness[key].uses++;
                this.strategyEffectiveness[key].effectiveCount++;
                this.strategyEffectiveness[key].effectiveness =
                    this.strategyEffectiveness[key].effectiveCount /
                    this.strategyEffectiveness[key].uses;
                break;
            }
        }
    }

    markIneffective(strategyId) {
        for (const key of Object.keys(this.strategyEffectiveness)) {
            if (this.STRATEGIES[key]?.id === strategyId) {
                this.strategyEffectiveness[key].uses++;
                this.strategyEffectiveness[key].effectiveness =
                    this.strategyEffectiveness[key].effectiveCount /
                    Math.max(1, this.strategyEffectiveness[key].uses);
                break;
            }
        }
    }

    _createNullStrategy() {
        return {
            id: 'none',
            name: 'No Intervention',
            type: 'none',
            intensity: 0,
            duration: 0,
            tier: 'low',
            description: 'Waiting for state changes'
        };
    }

    getEffectivenessStats() {
        return { ...this.strategyEffectiveness };
    }

    reset() {
        for (const key of Object.keys(this.strategyEffectiveness)) {
            this.strategyEffectiveness[key] = {
                uses: 0,
                effectiveCount: 0,
                effectiveness: 0.5
            };
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = InterventionStrategy;
}
