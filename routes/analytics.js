const express = require('express');
const router = express.Router();
const Analytics = require('../models/analytics');

// Получаване на обща статистика
router.get('/overview', async (req, res) => {
    try {
        const { period = '7' } = req.query; // По подразбиране последните 7 дни
        
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(period));
        
        // Общ брой посещения
        const totalVisits = await Analytics.countDocuments({
            timestamp: { $gte: daysAgo }
        });
        
        // Уникални посещения
        const uniqueVisits = await Analytics.countDocuments({
            timestamp: { $gte: daysAgo },
            isUnique: true
        });
        
        // Посещения по устройства
        const deviceStats = await Analytics.aggregate([
            { $match: { timestamp: { $gte: daysAgo } } },
            { $group: { _id: '$device', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        // Посещения по браузъри
        const browserStats = await Analytics.aggregate([
            { $match: { timestamp: { $gte: daysAgo } } },
            { $group: { _id: '$browser', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        // Най-посещавани страници
        const topPages = await Analytics.aggregate([
            { $match: { timestamp: { $gte: daysAgo } } },
            { $group: { _id: '$path', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        
        // Посещения по дни
        const visitsByDay = await Analytics.aggregate([
            { $match: { timestamp: { $gte: daysAgo } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
                    },
                    total: { $sum: 1 },
                    unique: {
                        $sum: { $cond: ['$isUnique', 1, 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        res.json({
            period: parseInt(period),
            totalVisits,
            uniqueVisits,
            deviceStats,
            browserStats,
            topPages,
            visitsByDay
        });
    } catch (error) {
        console.error('Error fetching analytics overview:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Получаване на статистика в реално време (последните 24 часа)
router.get('/realtime', async (req, res) => {
    try {
        const last24Hours = new Date();
        last24Hours.setHours(last24Hours.getHours() - 24);
        
        // Посещения по часове
        const visitsByHour = await Analytics.aggregate([
            { $match: { timestamp: { $gte: last24Hours } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        // Активни сесии (последните 30 минути)
        const last30Min = new Date();
        last30Min.setMinutes(last30Min.getMinutes() - 30);
        
        const activeSessions = await Analytics.distinct('sessionId', {
            timestamp: { $gte: last30Min }
        });
        
        // Последни посещения
        const recentVisits = await Analytics.find({
            timestamp: { $gte: last24Hours }
        })
        .sort({ timestamp: -1 })
        .limit(20)
        .select('timestamp path device browser country');
        
        res.json({
            visitsByHour,
            activeSessions: activeSessions.length,
            recentVisits
        });
    } catch (error) {
        console.error('Error fetching realtime analytics:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Получаване на статистика за referrers
router.get('/referrers', async (req, res) => {
    try {
        const { period = '7' } = req.query;
        
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(period));
        
        const referrerStats = await Analytics.aggregate([
            { 
                $match: { 
                    timestamp: { $gte: daysAgo },
                    referrer: { $ne: 'Direct' }
                } 
            },
            { $group: { _id: '$referrer', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 }
        ]);
        
        const directVisits = await Analytics.countDocuments({
            timestamp: { $gte: daysAgo },
            referrer: 'Direct'
        });
        
        res.json({
            referrerStats,
            directVisits
        });
    } catch (error) {
        console.error('Error fetching referrer stats:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Получаване на географска статистика
router.get('/geography', async (req, res) => {
    try {
        const { period = '7' } = req.query;
        
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(period));
        
        const countryStats = await Analytics.aggregate([
            { 
                $match: { 
                    timestamp: { $gte: daysAgo },
                    country: { $ne: null }
                } 
            },
            { $group: { _id: '$country', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 }
        ]);
        
        res.json({ countryStats });
    } catch (error) {
        console.error('Error fetching geography stats:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Изтриване на стари данни (за поддръжка)
router.delete('/cleanup', async (req, res) => {
    try {
        const { days = 90 } = req.query;
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
        
        const result = await Analytics.deleteMany({
            timestamp: { $lt: cutoffDate }
        });
        
        res.json({
            message: `Deleted ${result.deletedCount} old analytics records`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error cleaning up analytics:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
