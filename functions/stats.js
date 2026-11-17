'use strict';

const Prediction = require('../models/prediction');
const { buildStatsPipeline, formatStats } = require('../utils/predictionStats');

// server.js provides the same database connection used by prediction editing.
// This handler neither opens another connection nor writes to the database.
module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.setHeader('Allow', 'GET, HEAD');
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const now = new Date();
        const [aggregate] = await Prediction.aggregate(buildStatsPipeline(now)).option({ maxTimeMS: 10000 });
        return res.json(formatStats(aggregate, now));
    } catch (_) {
        // Never expose database details or replace a failed request with zeros.
        console.error('Public prediction statistics could not be loaded');
        return res.status(503).json({ message: 'Statistics are temporarily unavailable' });
    }
};
