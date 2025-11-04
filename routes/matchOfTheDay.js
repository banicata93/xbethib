const express = require('express');
const router = express.Router();
const MatchOfTheDay = require('../models/matchOfTheDay');
const auth = require('../middleware/auth');
const { validate, matchOfTheDaySchema } = require('../utils/validationSchemas');

// GET - Get current Match of the Day (public)
router.get('/', async (req, res) => {
    try {
        // Find the most recent active Match of the Day
        const motd = await MatchOfTheDay.findOne({ isActive: true })
            .sort({ date: -1 });
        
        if (!motd) {
            return res.status(404).json({ message: 'No Match of the Day found' });
        }
        
        res.json(motd);
    } catch (error) {
        console.error('Error fetching Match of the Day:', error);
        res.status(500).json({ message: error.message });
    }
});

// POST - Create/Update Match of the Day (protected)
router.post('/', auth, validate(matchOfTheDaySchema), async (req, res) => {
    try {
        const { homeTeam, awayTeam, time, prediction, preview } = req.body;
        
        // Deactivate all previous Match of the Day entries
        await MatchOfTheDay.updateMany(
            { isActive: true },
            { isActive: false }
        );
        
        // Create new Match of the Day
        const newMotd = new MatchOfTheDay({
            homeTeam: {
                name: homeTeam.name,
                logo: homeTeam.logo || '/images/default-team.png'
            },
            awayTeam: {
                name: awayTeam.name,
                logo: awayTeam.logo || '/images/default-team.png'
            },
            time,
            prediction,
            preview,
            isActive: true
        });
        
        const savedMotd = await newMotd.save();
        
        res.status(201).json({
            message: 'Match of the Day запазен успешно!',
            data: {
                _id: savedMotd._id,
                homeTeam: savedMotd.homeTeam.name,
                awayTeam: savedMotd.awayTeam.name,
                time: savedMotd.time,
                prediction: savedMotd.prediction
            }
        });
    } catch (error) {
        console.error('Error saving Match of the Day:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        
        // Check for specific MongoDB errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: 'Грешка при валидация на данните',
                details: error.message
            });
        }
        
        if (error.name === 'MongoError' || error.name === 'MongoServerError') {
            return res.status(500).json({ 
                message: 'Грешка при запазване в базата данни. Моля опитайте отново.',
                details: error.message
            });
        }
        
        res.status(500).json({ 
            message: 'Server error при запазване на Match of the Day',
            error: error.message,
            errorType: error.name
        });
    }
});

// DELETE - Delete Match of the Day (protected)
router.delete('/:id', auth, async (req, res) => {
    try {
        await MatchOfTheDay.findByIdAndDelete(req.params.id);
        res.json({ message: 'Match of the Day deleted' });
    } catch (error) {
        console.error('Error deleting Match of the Day:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
