const mongoose = require('mongoose');
const Prediction = require('../models/prediction');

// MongoDB connection
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }

    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is not set in environment variables');
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        cachedDb = mongoose.connection;
        console.log('MongoDB Connected Successfully');
        return cachedDb;
    } catch (error) {
        console.error('MongoDB Connection Error:', error);
        throw error;
    }
}

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        await connectToDatabase();

        if (req.method === 'GET') {
            try {
                // OVERALL STATS (всички прогнози)
                const totalAll = await Prediction.countDocuments();
                
                const winsAll = await Prediction.countDocuments({ result: 'win' });
                const lossesAll = await Prediction.countDocuments({ result: 'loss' });
                const pendingAll = await Prediction.countDocuments({ result: 'pending' });
                const voidsAll = await Prediction.countDocuments({ result: 'void' });
                
                // Overall Win Rate (от всички завършени прогнози)
                const completedAll = winsAll + lossesAll;
                const winRateAll = completedAll > 0 ? ((winsAll / completedAll) * 100).toFixed(1) : 0;

                // LAST 24 HOURS STATS
                const yesterday = new Date();
                yesterday.setHours(yesterday.getHours() - 24);

                const last24HoursFilter = {
                    matchDate: { $gte: yesterday }
                };

                const total = await Prediction.countDocuments(last24HoursFilter);

                const wins = await Prediction.countDocuments({
                    ...last24HoursFilter,
                    result: 'win'
                });
                const losses = await Prediction.countDocuments({
                    ...last24HoursFilter,
                    result: 'loss'
                });
                const pending = await Prediction.countDocuments({
                    ...last24HoursFilter,
                    result: 'pending'
                });
                const voids = await Prediction.countDocuments({
                    ...last24HoursFilter,
                    result: 'void'
                });

                // Win rate за последните 24ч
                const completed = wins + losses;
                const winRate = completed > 0 ? ((wins / completed) * 100).toFixed(1) : 0;

                // Последните 10 прогнози за streak (само за последните 24ч)
                const recentPredictions = await Prediction.find({
                    ...last24HoursFilter,
                    result: { $in: ['win', 'loss'] }
                })
                .sort({ matchDate: -1 })
                .limit(10)
                .select('result');

                // Изчисляване на текуща серия
                let currentStreak = 0;
                let streakType = null;

                for (const pred of recentPredictions) {
                    if (streakType === null) {
                        streakType = pred.result;
                        currentStreak = 1;
                    } else if (pred.result === streakType) {
                        currentStreak++;
                    } else {
                        break;
                    }
                }

                // Средни коефициенти (само за последните 24ч)
                const avgOddsResult = await Prediction.aggregate([
                    { $match: {
                        matchDate: { $gte: yesterday },
                        odds: { $ne: null }
                    }},
                    { $group: { _id: null, avgOdds: { $avg: '$odds' } } }
                ]);

                const avgOdds = avgOddsResult.length > 0
                    ? avgOddsResult[0].avgOdds.toFixed(2)
                    : 0;

                res.json({
                    // Overall stats (всички прогнози)
                    overall: {
                        total: totalAll,
                        wins: winsAll,
                        losses: lossesAll,
                        pending: pendingAll,
                        voids: voidsAll,
                        completed: completedAll,
                        winRate: parseFloat(winRateAll)
                    },
                    // Last 24 hours stats
                    last24hours: {
                        total,
                        wins,
                        losses,
                        pending,
                        voids,
                        completed,
                        winRate: parseFloat(winRate)
                    },
                    // Legacy fields (за обратна съвместимост)
                    total: totalAll,
                    wins: winsAll,
                    losses: lossesAll,
                    pending: pendingAll,
                    voids: voidsAll,
                    completed: completedAll,
                    winRate: parseFloat(winRateAll),
                    streak: {
                        count: currentStreak,
                        type: streakType
                    },
                    avgOdds: parseFloat(avgOdds)
                });
            } catch (error) {
                console.error('Error fetching stats:', error);
                res.status(500).json({ message: 'Server error' });
            }
        } else {
            res.status(405).json({ message: 'Method not allowed' });
        }
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
