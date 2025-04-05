const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Prediction = require('../models/prediction');

// Middleware to verify JWT token
const auth = (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.adminId = decoded.id;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Authentication required' });
    }
};

// Get all predictions
router.get('/', async (req, res) => {
    try {
        const predictions = await Prediction.find();
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
        const { matchDate, homeTeam, awayTeam, league, prediction } = req.body;
        
        // Валидация на входящите данни
        if (!matchDate || !homeTeam || !awayTeam || !league || !league.flag || !prediction) {
            return res.status(400).json({ 
                message: 'All fields are required',
                received: { matchDate, homeTeam, awayTeam, league, prediction }
            });
        }

        const date = new Date(matchDate);
        console.log('Creating prediction:', {
            date: date.toISOString(),
            homeTeam,
            awayTeam,
            league,
            prediction
        });

        const newPrediction = new Prediction({
            matchDate: date,
            homeTeam,
            awayTeam,
            league,
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