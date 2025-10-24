const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
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
        const { id } = req.query;

        switch (method) {
            case 'GET':
                if (id) {
                    // Get single prediction
                    const prediction = await Prediction.findById(id);
                    if (!prediction) {
                        return res.status(404).json({ message: 'Prediction not found' });
                    }
                    return res.json(prediction);
                } else {
                    // Get all predictions
                    const predictions = await Prediction.find().sort({ matchDate: -1 });
                    console.log('Raw predictions from DB:', predictions.map(p => ({
                        date: p.matchDate,
                        isoDate: new Date(p.matchDate).toISOString(),
                        teams: `${p.homeTeam} vs ${p.awayTeam}`
                    })));

                    const formattedPredictions = predictions.map(p => {
                        const prediction = p.toObject();
                        // Нормализираме датата в UTC
                        const date = new Date(prediction.matchDate);
                        prediction.matchDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                        return prediction;
                    });

                    console.log('Formatted predictions:', formattedPredictions.map(p => ({
                        date: p.matchDate,
                        isoDate: new Date(p.matchDate).toISOString(),
                        teams: `${p.homeTeam} vs ${p.awayTeam}`
                    })));

                    return res.json(formattedPredictions);
                }

            case 'POST':
                return auth(req, res, async () => {
                    try {
                        console.log('Received prediction data:', req.body);
                        const { matchDate, homeTeam, awayTeam, leagueFlag, prediction, odds, result } = req.body;

                        // Валидация на входящите данни
                        if (!matchDate || !homeTeam || !awayTeam || !leagueFlag || !prediction) {
                            return res.status(400).json({
                                message: 'All fields are required',
                                received: req.body
                            });
                        }

                        const date = new Date(matchDate);
                        console.log('Creating prediction:', {
                            date: date.toISOString(),
                            homeTeam,
                            awayTeam,
                            leagueFlag,
                            prediction,
                            odds,
                            result
                        });

                        const newPrediction = new Prediction({
                            matchDate: date,
                            homeTeam,
                            awayTeam,
                            leagueFlag,
                            prediction,
                            odds,
                            result
                        });

                        const savedPrediction = await newPrediction.save();
                        console.log('Saved prediction:', savedPrediction);
                        res.status(201).json(savedPrediction);
                    } catch (error) {
                        console.error('Error in POST /predictions:', error);
                        res.status(400).json({ message: error.message });
                    }
                });

            case 'PUT':
                return auth(req, res, async () => {
                    try {
                        const prediction = await Prediction.findByIdAndUpdate(
                            id,
                            req.body,
                            { new: true }
                        );
                        if (!prediction) {
                            return res.status(404).json({ message: 'Prediction not found' });
                        }
                        res.json(prediction);
                    } catch (error) {
                        res.status(400).json({ message: error.message });
                    }
                });

            case 'DELETE':
                return auth(req, res, async () => {
                    try {
                        const prediction = await Prediction.findByIdAndDelete(id);
                        if (!prediction) {
                            return res.status(404).json({ message: 'Prediction not found' });
                        }
                        res.json({ message: 'Prediction deleted' });
                    } catch (error) {
                        res.status(500).json({ message: error.message });
                    }
                });

            case 'PATCH':
                return auth(req, res, async () => {
                    if (req.url.includes('/result')) {
                        try {
                            const { result } = req.body;

                            // Валидация
                            if (!['pending', 'win', 'loss', 'void'].includes(result)) {
                                return res.status(400).json({ message: 'Invalid result value' });
                            }

                            const prediction = await Prediction.findByIdAndUpdate(
                                id,
                                { result },
                                { new: true }
                            );

                            if (!prediction) {
                                return res.status(404).json({ message: 'Prediction not found' });
                            }

                            res.json(prediction);
                        } catch (error) {
                            console.error('Error updating result:', error);
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
