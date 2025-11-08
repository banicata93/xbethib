const express = require('express');
const router = express.Router();
const MatchOfTheDay = require('../models/matchOfTheDay');
const auth = require('../middleware/auth');
const { validate, matchOfTheDaySchema } = require('../utils/validationSchemas');
const { cacheMiddleware, invalidateCache } = require('../utils/cache');

// GET - Get current Match of the Day (public, cached for 10 minutes)
router.get('/', cacheMiddleware(600), async (req, res) => {
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
        
        // Invalidate Match of the Day cache
        invalidateCache('/api/match-of-the-day');
        
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

// GET - Get last 7 days archive (public, cached for 5 minutes)
router.get('/archive', cacheMiddleware(300), async (req, res) => {
    try {
        // Get last 7 days of Match of the Day
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const archive = await MatchOfTheDay.find({
            date: { $gte: sevenDaysAgo },
            isActive: false // Only archived matches
        })
        .sort({ date: -1 })
        .limit(7);
        // Return all fields for editing capability
        
        // Format for streak display
        const streak = archive.map(match => {
            switch(match.result) {
                case 'win': return 'W';
                case 'loss': return 'L';
                case 'void': return 'V';
                default: return 'P'; // Pending
            }
        }).reverse().join(''); // Reverse to show oldest first
        
        res.json({
            archive,
            streak,
            stats: {
                total: archive.length,
                wins: archive.filter(m => m.result === 'win').length,
                losses: archive.filter(m => m.result === 'loss').length,
                voids: archive.filter(m => m.result === 'void').length,
                pending: archive.filter(m => m.result === 'pending').length
            }
        });
    } catch (error) {
        console.error('Error fetching archive:', error);
        res.status(500).json({ message: error.message });
    }
});

// PUT - Update archived Match of the Day (protected)
router.put('/:id', auth, async (req, res) => {
    try {
        const { homeTeam, awayTeam, time, prediction, preview, result } = req.body;
        
        const updateData = {
            'homeTeam.name': homeTeam.name,
            'homeTeam.logo': homeTeam.logo || '/images/default-team.png',
            'awayTeam.name': awayTeam.name,
            'awayTeam.logo': awayTeam.logo || '/images/default-team.png',
            time,
            prediction,
            preview
        };
        
        if (result) {
            updateData.result = result;
        }
        
        const motd = await MatchOfTheDay.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        
        if (!motd) {
            return res.status(404).json({ message: 'Match of the Day not found' });
        }
        
        // Invalidate caches
        invalidateCache('/api/match-of-the-day');
        invalidateCache('/api/match-of-the-day/archive');
        
        res.json({ message: 'Match updated successfully', data: motd });
    } catch (error) {
        console.error('Error updating match:', error);
        res.status(500).json({ message: error.message });
    }
});

// PATCH - Update Match of the Day result (protected)
router.patch('/:id/result', auth, async (req, res) => {
    try {
        const { result } = req.body;
        
        if (!['pending', 'win', 'loss', 'void'].includes(result)) {
            return res.status(400).json({ message: 'Invalid result value' });
        }
        
        const motd = await MatchOfTheDay.findByIdAndUpdate(
            req.params.id,
            { result },
            { new: true }
        );
        
        if (!motd) {
            return res.status(404).json({ message: 'Match of the Day not found' });
        }
        
        // Invalidate caches
        invalidateCache('/api/match-of-the-day');
        invalidateCache('/api/match-of-the-day/archive');
        
        res.json({ message: 'Result updated successfully', data: motd });
    } catch (error) {
        console.error('Error updating result:', error);
        res.status(500).json({ message: error.message });
    }
});

// DELETE - Delete Match of the Day (protected)
router.delete('/:id', auth, async (req, res) => {
    try {
        await MatchOfTheDay.findByIdAndDelete(req.params.id);
        
        // Invalidate Match of the Day cache
        invalidateCache('/api/match-of-the-day');
        invalidateCache('/api/match-of-the-day/archive');
        
        res.json({ message: 'Match of the Day deleted successfully' });
    } catch (error) {
        console.error('Error deleting Match of the Day:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
