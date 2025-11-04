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
        console.log('Login request received:', req.body);
        const { username, password } = req.body;
        console.log('Login attempt:', { username });

        // Find admin in database
        const admin = await Admin.findOne({ username });
        console.log('Admin found:', admin ? 'yes' : 'no');
        
        if (!admin) {
            console.log('Admin not found');
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, admin.password);
        console.log('Password check:', { isValid: isValidPassword });
        
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Create JWT token
        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
            console.error('JWT_SECRET is not set in environment variables');
            return res.status(500).json({ message: 'Server configuration error' });
        }

        const token = jwt.sign(
            { id: admin._id.toString() }, // Convert to string to avoid issues
            JWT_SECRET,
            { 
                expiresIn: '24h',
                algorithm: 'HS256' 
            }
        );

        console.log('Login successful, token created');
        res.json({ token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;