const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const Admin = require('../models/admin');
const { validate, loginSchema } = require('../utils/validationSchemas');

// Rate limiter for login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Maximum 5 attempts per 15 minutes
    message: {
        message: 'Твърде много опити за вход. Моля опитайте след 15 минути.',
        retryAfter: 15
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            message: 'Твърде много опити за вход. Моля опитайте след 15 минути.',
            retryAfter: 15
        });
    }
});

// Login route with rate limiting and validation
router.post('/login', loginLimiter, validate(loginSchema), async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find admin in database
        const admin = await Admin.findOne({ username });
        
        if (!admin) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, admin.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Create JWT token
        const token = jwt.sign(
            { id: admin._id.toString() },
            process.env.JWT_SECRET,
            { 
                expiresIn: '24h',
                algorithm: 'HS256' 
            }
        );

        res.json({ token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;