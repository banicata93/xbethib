const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const MatchOfTheDay = require('../models/matchOfTheDay');

// Middleware to verify JWT token
const auth = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        try {
            const JWT_SECRET = process.env.JWT_SECRET;
            if (!JWT_SECRET) {
                return res.status(500).json({ message: 'Server configuration error' });
            }

            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Invalid token' });
        }
    } catch (error) {
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
        const { homeTeam, awayTeam, time, prediction, preview } = req.body;
        
        // Validation
        if (!homeTeam?.name || !awayTeam?.name || !time || !prediction || !preview) {
            return res.status(400).json({ 
                message: 'Missing required fields',
                required: ['homeTeam.name', 'awayTeam.name', 'time', 'prediction', 'preview']
            });
        }
        
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
        console.log('Match of the Day saved:', savedMotd);
        
        res.status(201).json(savedMotd);
    } catch (error) {
        console.error('Error saving Match of the Day:', error);
        res.status(500).json({ message: error.message });
    }
});

// DELETE - Delete Match of the Day (protected)
router.delete('/:id', auth, async (req, res) => {
    try {
        await MatchOfTheDay.findByIdAndDelete(req.params.id);
        res.json({ message: 'Match of the Day deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
