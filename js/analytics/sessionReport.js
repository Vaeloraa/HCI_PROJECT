/**
 * FocusFlow - Session Report Renderer (Member C)
 * Attention heatmap + reading statistics for end-of-session review.
 */
const SessionReport = {
    show(analytics, readingView) {
        const existing = document.getElementById('ff-session-report-overlay');
        if (existing) existing.remove();

        const report = analytics.generateSessionReport(readingView);
        const t = (key, params) => {
            if (typeof I18n !== 'undefined') return I18n.t(key, params);
            return key;
        };

        const overlay = document.createElement('div');
        overlay.id = 'ff-session-report-overlay';
        overlay.className = 'ff-dialog-overlay';
        overlay.innerHTML = `
            <div class="ff-dialog ff-session-report">
                <div class="ff-dialog-header">
                    <h3>${t('report.title')}</h3>
                    <button class="ff-dialog-close" id="ff-session-report-close">&times;</button>
                </div>
                <div class="ff-dialog-body">
                    <div class="ff-report-stats">
                        ${this._statCard(t('report.duration'), `${report.durationMin} min`)}
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
                        <div class="ff-report-timeline">${this._renderTimeline(report.stateTimeline, t)}</div>
                    </section>
                    <section class="ff-report-section">
                        <h4>${t('report.assistTitle')}</h4>
                        <p>${t('report.assistCount', { count: report.comprehensionAssists })}</p>
                    </section>
                    ${report.insight ? `<div class="ff-report-insight">${report.insight.icon} ${report.insight.message}</div>` : ''}
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

    _renderTimeline(stateTimeline, t) {
        if (!stateTimeline || stateTimeline.length === 0) {
            return `<p class="ff-report-empty">${t('report.noData')}</p>`;
        }

        const colors = {
            Normal: '#4CAF50',
            Distracted: '#FF9800',
            Struggling: '#F44336'
        };

        return stateTimeline.slice(-12).map((item) => {
            const stateLabel = (typeof I18n !== 'undefined')
                ? I18n.translateState(item.state)
                : item.state;
            return `
                <div class="ff-report-timeline-row">
                    <span class="ff-report-timeline-dot" style="background:${colors[item.state] || '#64748b'}"></span>
                    <span class="ff-report-timeline-state">${stateLabel}</span>
                    <span class="ff-report-timeline-dur">${(item.durationMs / 1000).toFixed(1)}s</span>
                </div>
            `;
        }).join('');
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
