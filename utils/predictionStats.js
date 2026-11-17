'use strict';

const DAY = 24 * 60 * 60 * 1000;

function buildStatsPipeline(now) {
    const dateOrNull = input => ({ $convert: { input, to: 'date', onError: null, onNull: null } });
    const counts = () => ({ $group: {
        _id: null,
        total: { $sum: 1 },
        wins: { $sum: { $cond: [{ $eq: ['$result', 'win'] }, 1, 0] } },
        losses: { $sum: { $cond: [{ $eq: ['$result', 'loss'] }, 1, 0] } },
        voids: { $sum: { $cond: [{ $eq: ['$result', 'void'] }, 1, 0] } },
        // MongoDB ignores absent, null and nonnumeric odds in this average.
        avgOdds: { $avg: '$odds' }
    } });
    const period = days => ({ $match: {
        _statsDate: { $gte: new Date(now.getTime() - days * DAY), $lte: now }
    } });

    // Read-only aggregation: legacy bot dates work without migrating any records.
    return [
        { $project: {
            result: 1, odds: 1, createdAt: 1,
            _statsDate: { $ifNull: [dateOrNull('$matchDate'), dateOrNull('$date')] }
        } },
        { $facet: {
            overall: [counts()],
            last30days: [period(30), counts()],
            last24hours: [period(1), counts()],
            recentResults: [
                period(1),
                { $match: { result: { $in: ['win', 'loss'] } } },
                { $sort: { _statsDate: -1, createdAt: -1, _id: -1 } },
                { $limit: 10 },
                { $project: { _id: 0, result: 1 } }
            ]
        } }
    ];
}

function summarize(rows = []) {
    const { total = 0, wins = 0, losses = 0, voids = 0 } = rows[0] || {};
    const completed = wins + losses;
    return {
        total, wins, losses, voids,
        // Missing or unrecognized legacy results are unresolved, never wins.
        pending: total - wins - losses - voids,
        completed,
        winRate: completed > 0 ? Number((wins / completed * 100).toFixed(1)) : null
    };
}

function formatStats(aggregate = {}, now) {
    const overall = summarize(aggregate.overall);
    const last30days = summarize(aggregate.last30days);
    const last24hours = summarize(aggregate.last24hours);
    const streak = { count: 0, type: null };
    for (const prediction of aggregate.recentResults || []) {
        if (streak.type !== null && prediction.result !== streak.type) break;
        streak.type = prediction.result;
        streak.count++;
    }
    const avgOdds = aggregate.last24hours?.[0]?.avgOdds;
    return {
        overall, last30days, last24hours,
        // Preserve the existing API fields for callers outside the homepage.
        ...overall,
        streak,
        avgOdds: typeof avgOdds === 'number' && Number.isFinite(avgOdds) ? Number(avgOdds.toFixed(2)) : 0,
        generatedAt: now.toISOString()
    };
}

module.exports = { buildStatsPipeline, formatStats };
