const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');

// Login route
router.post('/login', async (req, res) => {
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
        const token = jwt.sign(
            { id: admin._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        console.log('Login successful, token created');
        res.json({ token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;