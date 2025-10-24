const mongoose = require('mongoose');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');

// MongoDB connection
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }

    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is not set in environment variables');
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        cachedDb = mongoose.connection;
        console.log('MongoDB Connected Successfully');
        return cachedDb;
    } catch (error) {
        console.error('MongoDB Connection Error:', error);
        throw error;
    }
}

// Helper function to hash password
function hashPassword(password) {
    return crypto.createHash('sha256').update(password + process.env.JWT_SECRET).digest('hex');
}

// Helper function to verify password
function verifyPassword(password, hashedPassword) {
    return hashPassword(password) === hashedPassword;
}

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    await connectToDatabase();

    if (req.method === 'POST' && req.url === '/api/auth/login') {
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
            const isValidPassword = verifyPassword(password, admin.password);
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
                { id: admin._id.toString() },
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
    } else {
        res.status(404).json({ message: 'Not found' });
    }
};
