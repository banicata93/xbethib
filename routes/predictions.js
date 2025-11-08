const express = require('express');
const router = express.Router();
const Prediction = require('../models/prediction');
const auth = require('../middleware/auth');
const { validate, predictionSchema, bulkPredictionSchema, resultUpdateSchema } = require('../utils/validationSchemas');
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

// Add new prediction or bulk import (protected route)
router.post('/', auth, async (req, res) => {
    try {
        // Check if this is a bulk import
        if (req.body.predictions && Array.isArray(req.body.predictions)) {
            // Validate bulk import
            const { error, value } = bulkPredictionSchema.validate(req.body, {
                abortEarly: false,
                stripUnknown: true
            });
            
            if (error) {
                const errors = error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }));
                
                return res.status(400).json({
                    message: 'Validation error',
                    errors
                });
            }
            
            // Bulk import
            const predictions = value.predictions;
            const results = {
                success: [],
                failed: []
            };

            for (const predData of predictions) {
                try {
                    const { matchDate, homeTeam, awayTeam, leagueFlag, prediction, odds, result } = predData;

                    const newPrediction = new Prediction({
                        matchDate: new Date(matchDate),
                        homeTeam,
                        awayTeam,
                        leagueFlag: leagueFlag || '⚽',
                        prediction,
                        odds: odds || null,
                        result: result || 'pending'
                    });

                    const savedPrediction = await newPrediction.save();
                    results.success.push(savedPrediction);
                } catch (error) {
                    results.failed.push({
                        data: predData,
                        error: error.message
                    });
                }
            }

            // Invalidate predictions cache
            invalidateCache('/api/predictions');

            return res.status(201).json({
                message: `Imported ${results.success.length} predictions, ${results.failed.length} failed`,
                success: results.success.length,
                failed: results.failed.length,
                failedItems: results.failed
            });
        } else {
            // Single prediction - validate with predictionSchema
            const { error, value } = predictionSchema.validate(req.body, {
                abortEarly: false,
                stripUnknown: true
            });
            
            if (error) {
                const errors = error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }));
                
                return res.status(400).json({
                    message: 'Validation error',
                    errors
                });
            }
            
            const { matchDate, homeTeam, awayTeam, leagueFlag, prediction } = value;

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
        }
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

// Delete predictions by date (protected route)
router.delete('/delete-by-date', auth, async (req, res) => {
    try {
        const { date } = req.query;
        
        if (!date) {
            return res.status(400).json({ message: 'Date parameter is required' });
        }
        
        // Parse the date and create start and end of day
        const targetDate = new Date(date);
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
        
        // Delete all predictions for this date
        const result = await Prediction.deleteMany({
            matchDate: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });
        
        // Invalidate predictions cache
        invalidateCache('/api/predictions');
        
        res.json({ 
            message: `Deleted ${result.deletedCount} predictions for ${date}`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error deleting predictions by date:', error);
        res.status(500).json({ message: error.message });
    }
});

// Delete prediction (protected route)
router.delete('/:id', auth, async (req, res) => {
    try {
        await Prediction.findByIdAndDelete(req.params.id);
        
        // Invalidate predictions cache
        invalidateCache('/api/predictions');
        
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
        
        // Invalidate predictions cache
        invalidateCache('/api/predictions');
        
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