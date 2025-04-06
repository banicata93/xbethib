const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Prediction = require('../models/prediction');

// Middleware to verify JWT token
const auth = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
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

// Get all predictions
router.get('/', async (req, res) => {
    try {
        // Намираме всички прогнози и ги сортираме по дата (най-новите първи)
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

        res.json(formattedPredictions);
    } catch (error) {
        console.error('Error in GET /predictions:', error);
        res.status(500).json({ message: error.message });
    }
});

// Add new prediction (protected route)
router.post('/', auth, async (req, res) => {
    try {
        console.log('Received prediction data:', req.body);
        const { matchDate, homeTeam, awayTeam, leagueFlag, prediction } = req.body;
        
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
            prediction
        });

        const newPrediction = new Prediction({
            matchDate: date,
            homeTeam,
            awayTeam,
            leagueFlag,
            prediction
        });

        const savedPrediction = await newPrediction.save();
        console.log('Saved prediction:', savedPrediction);
        res.status(201).json(savedPrediction);
    } catch (error) {
        console.error('Error in POST /predictions:', error);
        res.status(400).json({ message: error.message });
    }
});

// Update prediction (protected route)
router.put('/:id', auth, async (req, res) => {
    try {
        const prediction = await Prediction.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(prediction);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete prediction (protected route)
router.delete('/:id', auth, async (req, res) => {
    try {
        await Prediction.findByIdAndDelete(req.params.id);
        res.json({ message: 'Prediction deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;