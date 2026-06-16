/**
 * FocusFlow - Session Report Renderer (Member C)
 * Attention heatmap + reading statistics for end-of-session review.
 */
const SessionReport = {
    show(analytics, readingView, options = {}) {
        const existing = document.getElementById('ff-session-report-overlay');
        if (existing) existing.remove();

        const reportOptions = {};
        if (options.sessionStart) reportOptions.startTime = options.sessionStart;
        if (options.sessionEnd) reportOptions.endTime = options.sessionEnd;

        const report = analytics.generateSessionReport(readingView, reportOptions);
        const t = (key, params) => {
            if (typeof I18n !== 'undefined') return I18n.t(key, params);
            return key;
        };

        const titleKey = options.titleKey || 'report.title';
        const rangeHtml = (report.sessionStart && report.sessionEnd)
            ? `<p class="ff-report-range">${t('report.sessionRange', {
                start: new Date(report.sessionStart).toLocaleTimeString(),
                end: new Date(report.sessionEnd).toLocaleTimeString()
            })}</p>`
            : '';

        const overlay = document.createElement('div');
        overlay.id = 'ff-session-report-overlay';
        overlay.className = 'ff-dialog-overlay';
        overlay.innerHTML = `
            <div class="ff-dialog ff-session-report">
                <div class="ff-dialog-header">
                    <h3>${t(titleKey)}</h3>
                    <button class="ff-dialog-close" id="ff-session-report-close">&times;</button>
                </div>
                <div class="ff-dialog-body">
                    ${rangeHtml}
                    <div class="ff-report-stats">
                        ${this._statCard(t('report.duration'), `${report.durationMin} min`)}
                        ${this._statCard(t('metrics.speed'), report.readingSpeed > 0 ? `${report.readingSpeed} ${t('metrics.wpm')}` : '--')}
                        ${this._statCard(t('metrics.focusRatio'), `${report.focusRatio}%`)}
                        ${this._statCard(t('metrics.regression'), `${report.regressionRate}${t('metrics.perMin')}`)}
                        ${this._statCard(t('report.distractions'), String(report.distractionCount))}
                        ${this._statCard(t('report.recovery'), report.avgRecoverySec > 0 ? `${report.avgRecoverySec}s` : '--')}
                    </div>
                    <section class="ff-report-section">
                        <h4>${t('report.heatmapTitle')}</h4>
                        <p class="ff-report-hint">${t('report.heatmapHint')}</p>
                        <div class="ff-report-heatmap">${this._renderHeatmap(report.blockHeatmap, t)}</div>
                    </section>
                    <section class="ff-report-section">
                        <h4>${t('report.timelineTitle')}</h4>
                        <p class="ff-report-hint">${t('report.timelineHint')}</p>
                        <div class="ff-report-state-share">${this._renderStateDistribution(report.stateDistribution, t)}</div>
                    </section>
                    <section class="ff-report-section">
                        <h4>${t('report.assistTitle')}</h4>
                        <p>${t('report.assistManual', { count: report.comprehensionAssistManual || 0 })}</p>
                        <p>${t('report.assistStruggle', { count: report.comprehensionAssistStruggle || 0 })}</p>
                    </section>
                    <section class="ff-report-section">
                        <h4>${t('report.insightTitle')}</h4>
                        <div class="ff-report-insight ff-report-insight--loading" id="ff-session-report-insight">${t('report.insightLoading')}</div>
                    </section>
                </div>
                <div class="ff-dialog-footer">
                    <button class="ff-btn ff-btn-secondary" id="ff-session-report-export">${t('report.export')}</button>
                    <button class="ff-btn ff-btn-primary" id="ff-session-report-done">${t('report.close')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.querySelector('#ff-session-report-close').onclick = close;
        overlay.querySelector('#ff-session-report-done').onclick = close;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
        overlay.querySelector('#ff-session-report-export').onclick = () => {
            this._exportJson(report);
        };

        this._loadInsight(report, options.llmManager, overlay);
    },

    _loadInsight(report, llmManager, overlay) {
        const insightEl = overlay.querySelector('#ff-session-report-insight');
        if (!insightEl) return;

        const lang = (typeof I18n !== 'undefined') ? I18n.lang : 'en';
        const t = (key) => {
            if (typeof I18n !== 'undefined') return I18n.t(key);
            return key;
        };

        const applyInsight = (insight) => {
            if (!insight || !insight.message) return;
            report.insight = insight;
            insightEl.classList.remove('ff-report-insight--loading');
            insightEl.textContent = `${insight.icon || '💡'} ${insight.message}`;
        };

        const showUnavailable = () => {
            applyInsight({
                icon: '💡',
                message: t('report.insightUnavailable'),
                type: 'unavailable'
            });
        };

        if (!llmManager || typeof llmManager.generateSessionInsight !== 'function') {
            showUnavailable();
            return;
        }

        llmManager.generateSessionInsight(report, lang)
            .then(applyInsight)
            .catch((err) => {
                console.warn('[SessionReport] LLM insight failed:', err.message);
                showUnavailable();
            });
    },

    _statCard(label, value) {
        return `
            <div class="ff-report-stat">
                <div class="ff-report-stat-value">${value}</div>
                <div class="ff-report-stat-label">${label}</div>
            </div>
        `;
    },

    _renderHeatmap(blockHeatmap, t) {
        if (!blockHeatmap || blockHeatmap.length === 0) {
            return `<p class="ff-report-empty">${t('report.noData')}</p>`;
        }

        const maxDwell = Math.max(...blockHeatmap.map(b => b.dwellMs), 1);
        return blockHeatmap.map((block) => {
            const width = Math.max(4, Math.round((block.dwellMs / maxDwell) * 100));
            const seconds = (block.dwellMs / 1000).toFixed(1);
            const label = t('report.paragraphLabel', { index: block.displayIndex });
            return `
                <div class="ff-report-heat-row">
                    <span class="ff-report-heat-label">${label}</span>
                    <div class="ff-report-heat-bar-wrap">
                        <div class="ff-report-heat-bar" style="width:${width}%"></div>
                    </div>
                    <span class="ff-report-heat-value">${seconds}s</span>
                </div>
            `;
        }).join('');
    },

    _stateColors() {
        return {
            Normal: '#4CAF50',
            Focus: '#4CAF50',
            Distracted: '#FF9800',
            Struggling: '#F44336',
            Idle: '#94a3b8',
            OffScreen: '#64748b',
            LowDistraction: '#FF9800',
            HighDistraction: '#F97316',
            LowStruggling: '#FF5722',
            HighStruggling: '#D32F2F'
        };
    },

    _renderStateDistribution(stateDistribution, t) {
        if (!stateDistribution || stateDistribution.length === 0) {
            return `<p class="ff-report-empty">${t('report.noData')}</p>`;
        }

        const colors = this._stateColors();
        const segments = stateDistribution
            .filter((item) => item.percent > 0)
            .map((item) => {
                const stateLabel = (typeof I18n !== 'undefined')
                    ? I18n.translateDisplayState(item.state, item.durationMs || 0)
                    : item.state;
                const color = colors[item.state] || '#64748b';
                const seconds = (item.durationMs / 1000).toFixed(1);
                const width = Math.max(item.percent, item.percent > 0 ? 1.5 : 0);
                return {
                    ...item,
                    stateLabel,
                    color,
                    seconds,
                    width
                };
            });

        const barHtml = segments.map((item) => `
            <div class="ff-report-state-segment"
                 style="width:${item.width}%;background:${item.color};"
                 title="${item.stateLabel} ${item.percent}%"></div>
        `).join('');

        const legendHtml = segments.map((item) => `
            <div class="ff-report-state-legend-row">
                <span class="ff-report-state-swatch" style="background:${item.color};"></span>
                <span class="ff-report-state-name">${item.stateLabel}</span>
                <span class="ff-report-state-percent">${item.percent}%</span>
                <span class="ff-report-state-duration">${item.seconds}s</span>
            </div>
        `).join('');

        return `
            <div class="ff-report-state-bar" role="img" aria-label="${t('report.timelineTitle')}">
                ${barHtml}
            </div>
            <div class="ff-report-state-legend">${legendHtml}</div>
        `;
    },

    _exportJson(report) {
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `focusflow-session-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionReport;
}
