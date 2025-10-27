const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Analytics = require('../models/analytics');

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

// Middleware to verify JWT token
const auth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        console.log('Received token:', token);

        if (!token) {
            console.log('No token provided');
            return res.status(401).json({ message: 'Authentication required' });
        }

        try {
            const JWT_SECRET = process.env.JWT_SECRET;
            if (!JWT_SECRET) {
                console.error('JWT_SECRET is not set in environment variables');
                return res.status(500).json({ message: 'Server configuration error' });
            }

            const decoded = jwt.verify(token, JWT_SECRET);
            console.log('Token verified:', decoded);
            req.user = decoded;
            next();
        } catch (error) {
            console.log('Token verification failed:', error.message);
            return res.status(401).json({ message: 'Invalid token' });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

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

        const { method } = req;
        const urlParts = req.url.split('/');
        const endpoint = urlParts[urlParts.length - 1] || 'overview';

        switch (method) {
            case 'POST':
                // Public tracking endpoints (no auth required)
                if (endpoint === 'track') {
                    try {
                        const {
                            path,
                            fullUrl,
                            referrer,
                            sessionId,
                            device,
                            browser,
                            os,
                            screenResolution,
                            language,
                            userAgent
                        } = req.body;
                        
                        // Check if this is a unique visit (first visit today from this IP/session)
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        
                        const existingVisit = await Analytics.findOne({
                            sessionId,
                            timestamp: { $gte: today }
                        });
                        
                        const analyticsEntry = new Analytics({
                            path,
                            fullUrl,
                            referrer,
                            sessionId,
                            device,
                            browser,
                            os,
                            screenResolution,
                            language,
                            userAgent,
                            isUnique: !existingVisit,
                            timestamp: new Date()
                        });
                        
                        await analyticsEntry.save();
                        
                        return res.status(201).json({ success: true });
                    } catch (error) {
                        console.error('Error tracking analytics:', error);
                        return res.status(500).json({ message: 'Server error' });
                    }
                }
                
                if (endpoint === 'duration') {
                    try {
                        const { path, sessionId, duration } = req.body;
                        
                        // Update the most recent entry for this session and path
                        await Analytics.findOneAndUpdate(
                            { sessionId, path },
                            { duration },
                            { sort: { timestamp: -1 } }
                        );
                        
                        return res.status(200).json({ success: true });
                    } catch (error) {
                        console.error('Error updating duration:', error);
                        return res.status(500).json({ message: 'Server error' });
                    }
                }
                
                if (endpoint === 'ad-click') {
                    try {
                        const { adUrl, path, sessionId } = req.body;
                        
                        // Track ad click
                        const analyticsEntry = new Analytics({
                            path: path + ' (ad-click)',
                            fullUrl: adUrl,
                            referrer: 'Ad Click',
                            sessionId,
                            device: 'unknown',
                            timestamp: new Date()
                        });
                        
                        await analyticsEntry.save();
                        
                        return res.status(201).json({ success: true });
                    } catch (error) {
                        console.error('Error tracking ad click:', error);
                        return res.status(500).json({ message: 'Server error' });
                    }
                }
                
                return res.status(404).json({ message: 'Not found' });
                
            case 'GET':
                return auth(req, res, async () => {
                    try {
                        const { period = '7' } = req.query;

                        if (endpoint === 'overview') {
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

                            return res.json({
                                period: parseInt(period),
                                totalVisits,
                                uniqueVisits,
                                deviceStats,
                                browserStats,
                                topPages,
                                visitsByDay
                            });
                        }

                        if (endpoint === 'realtime') {
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

                            return res.json({
                                visitsByHour,
                                activeSessions: activeSessions.length,
                                recentVisits
                            });
                        }

                        if (endpoint === 'referrers') {
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

                            return res.json({
                                referrerStats,
                                directVisits
                            });
                        }

                        if (endpoint === 'geography') {
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

                            return res.json({ countryStats });
                        }

                        return res.status(404).json({ message: 'Not found' });
                    } catch (error) {
                        console.error('Error fetching analytics:', error);
                        res.status(500).json({ message: 'Server error' });
                    }
                });

            case 'DELETE':
                return auth(req, res, async () => {
                    if (endpoint === 'cleanup') {
                        try {
                            const { days = 90 } = req.query;

                            const cutoffDate = new Date();
                            cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

                            const result = await Analytics.deleteMany({
                                timestamp: { $lt: cutoffDate }
                            });

                            return res.json({
                                message: `Deleted ${result.deletedCount} old analytics records`,
                                deletedCount: result.deletedCount
                            });
                        } catch (error) {
                            console.error('Error cleaning up analytics:', error);
                            res.status(500).json({ message: 'Server error' });
                        }
                    } else {
                        return res.status(404).json({ message: 'Not found' });
                    }
                });

            default:
                res.status(405).json({ message: 'Method not allowed' });
        }
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
