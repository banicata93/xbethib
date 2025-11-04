const express = require('express');
const router = express.Router();
const Prediction = require('../models/prediction');
const auth = require('../middleware/auth');
const { validate, predictionSchema, resultUpdateSchema } = require('../utils/validationSchemas');
const { cacheMiddleware, invalidateCache } = require('../utils/cache');

// Get all predictions (cached for 5 minutes)
router.get('/', cacheMiddleware(300), async (req, res) => {
    try {
        const predictions = await Prediction.find().sort({ matchDate: -1 });
        
        const formattedPredictions = predictions.map(p => {
            const prediction = p.toObject();
            // Normalize date to UTC
            const date = new Date(prediction.matchDate);
            prediction.matchDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
            return prediction;
        });

        res.json(formattedPredictions);
    } catch (error) {
        console.error('Error in GET /predictions:', error);
        res.status(500).json({ message: error.message });
    }
});

// Add new prediction (protected route)
router.post('/', auth, validate(predictionSchema), async (req, res) => {
    try {
        const { matchDate, homeTeam, awayTeam, leagueFlag, prediction } = req.body;

        const newPrediction = new Prediction({
            matchDate: new Date(matchDate),
            homeTeam,
            awayTeam,
            leagueFlag,
            prediction
        });

        const savedPrediction = await newPrediction.save();
        
        // Invalidate predictions cache
        invalidateCache('/api/predictions');
        
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
        
        // Invalidate predictions cache
        invalidateCache('/api/predictions');
        
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

// Update prediction result (protected route)
router.patch('/:id/result', auth, validate(resultUpdateSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { result } = req.body;
        
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
});

// NOTE: Match of the Day functionality has been moved to /api/match-of-the-day
// This old endpoint is deprecated and should not be used
// Use the new MatchOfTheDay model and routes instead

module.exports = router;