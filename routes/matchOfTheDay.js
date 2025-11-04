const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const MatchOfTheDay = require('../models/matchOfTheDay');
const { validate, matchOfTheDaySchema } = require('../utils/validationSchemas');

// Middleware to verify JWT token
const auth = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            console.log('No token provided');
            return res.status(401).json({ message: 'Authentication required' });
        }

        try {
            const JWT_SECRET = process.env.JWT_SECRET;
            if (!JWT_SECRET) {
                console.error('JWT_SECRET not configured');
                return res.status(500).json({ message: 'Server configuration error' });
            }

            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            console.error('Token verification failed:', error.message);
            return res.status(401).json({ message: 'Invalid token' });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

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
        console.log('Received MOTD request');
        console.log('Body keys:', Object.keys(req.body));
        
        const { homeTeam, awayTeam, time, prediction, preview } = req.body;
        
        // Validation
        if (!homeTeam?.name || !awayTeam?.name || !time || !prediction || !preview) {
            console.error('Validation failed:', {
                homeTeamName: !!homeTeam?.name,
                awayTeamName: !!awayTeam?.name,
                time: !!time,
                prediction: !!prediction,
                preview: !!preview
            });
            return res.status(400).json({ 
                message: 'Липсват задължителни полета',
                required: ['homeTeam.name', 'awayTeam.name', 'time', 'prediction', 'preview']
            });
        }
        
        // Check logo sizes
        if (homeTeam.logo && homeTeam.logo.length > 5000000) {
            return res.status(400).json({ 
                message: 'Home team logo е твърде голямо. Моля използвайте по-малко изображение (под 2MB)'
            });
        }
        
        if (awayTeam.logo && awayTeam.logo.length > 5000000) {
            return res.status(400).json({ 
                message: 'Away team logo е твърде голямо. Моля използвайте по-малко изображение (под 2MB)'
            });
        }
        
        console.log('Deactivating previous MOTD entries...');
        // Deactivate all previous Match of the Day entries
        try {
            const deactivateResult = await MatchOfTheDay.updateMany(
                { isActive: true },
                { isActive: false }
            );
            console.log('Deactivated entries:', deactivateResult.modifiedCount);
        } catch (error) {
            console.error('Error deactivating previous entries:', error);
            // Continue anyway
        }
        
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
        
        console.log('Saving new MOTD...');
        console.log('Home team:', homeTeam.name);
        console.log('Away team:', awayTeam.name);
        console.log('Time:', time);
        console.log('Prediction:', prediction);
        
        const savedMotd = await newMotd.save();
        console.log('Match of the Day saved successfully:', savedMotd._id);
        
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
