const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const MatchOfTheDay = require('../models/matchOfTheDay');

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
router.post('/', auth, async (req, res) => {
    try {
        console.log('Received MOTD request:', JSON.stringify(req.body, null, 2));
        
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
                message: 'Missing required fields',
                required: ['homeTeam.name', 'awayTeam.name', 'time', 'prediction', 'preview'],
                received: {
                    homeTeam: homeTeam?.name ? 'provided' : 'missing',
                    awayTeam: awayTeam?.name ? 'provided' : 'missing',
                    time: time ? 'provided' : 'missing',
                    prediction: prediction ? 'provided' : 'missing',
                    preview: preview ? 'provided' : 'missing'
                }
            });
        }
        
        console.log('Deactivating previous MOTD entries...');
        // Deactivate all previous Match of the Day entries
        const deactivateResult = await MatchOfTheDay.updateMany(
            { isActive: true },
            { isActive: false }
        );
        console.log('Deactivated entries:', deactivateResult.modifiedCount);
        
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
        const savedMotd = await newMotd.save();
        console.log('Match of the Day saved successfully:', savedMotd._id);
        
        res.status(201).json({
            message: 'Match of the Day saved successfully',
            data: savedMotd
        });
    } catch (error) {
        console.error('Error saving Match of the Day:', error);
        res.status(500).json({ 
            message: 'Failed to save Match of the Day',
            error: error.message,
            details: error.stack
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
