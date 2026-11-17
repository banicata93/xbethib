'use strict';

(() => {
    let statistics = null;
    let loading = false;
    const field = id => document.getElementById(id);
    const setText = (id, value) => { const element = field(id); if (element) element.textContent = value; };
    const rate = value => value === null ? '—' : `${value.toFixed(1)}%`;

    function validSummary(summary) {
        if (!summary || typeof summary !== 'object') return false;
        const { total, wins, losses, pending, voids, completed, winRate } = summary;
        if (![total, wins, losses, pending, voids, completed].every(value => Number.isSafeInteger(value) && value >= 0)) return false;
        if (total !== wins + losses + pending + voids || completed !== wins + losses) return false;
        return completed === 0
            ? winRate === null
            : typeof winRate === 'number' && Number.isFinite(winRate) && winRate === Number((wins / completed * 100).toFixed(1));
    }

    function render() {
        if (!statistics) return;
        const selected = field('stats-period')?.value === 'last30days' ? 'last30days' : 'overall';
        const summary = statistics[selected];
        setText('header-win-rate', rate(statistics.overall.winRate));
        for (const key of ['total', 'wins', 'losses', 'pending', 'voids']) setText(`stats-${key}`, summary[key].toLocaleString('en-GB'));
        setText('stats-win-rate', rate(summary.winRate));
        setText('stats-status', summary.total === 0
            ? 'No predictions in this period.'
            : summary.completed === 0
                ? 'No settled predictions yet.'
                : `Based on ${summary.completed.toLocaleString('en-GB')} settled prediction${summary.completed === 1 ? '' : 's'} (wins + losses).`);
    }

    async function loadStats() {
        if (loading) return;
        loading = true;
        statistics = null;
        const panel = field('prediction-stats');
        const retry = field('stats-retry');
        panel?.setAttribute('aria-busy', 'true');
        if (retry) retry.hidden = true;
        for (const id of ['header-win-rate', 'stats-total', 'stats-wins', 'stats-losses', 'stats-pending', 'stats-voids', 'stats-win-rate']) setText(id, '—');
        setText('stats-status', 'Loading results…');
        try {
            const response = await fetch('/api/stats', { cache: 'no-store' });
            if (!response.ok) throw new Error('Statistics request failed');
            const data = await response.json();
            if (!validSummary(data?.overall) || !validSummary(data?.last30days)) throw new Error('Invalid statistics response');
            statistics = data;
            render();
        } catch (_) {
            setText('stats-status', 'Statistics are temporarily unavailable. Please try again.');
            if (retry) retry.hidden = false;
        } finally {
            panel?.setAttribute('aria-busy', 'false');
            loading = false;
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        field('stats-period')?.addEventListener('change', render);
        field('stats-retry')?.addEventListener('click', loadStats);
        loadStats();
    });
})();
