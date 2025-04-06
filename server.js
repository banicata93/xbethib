const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// MongoDB connection
console.log('Connecting to MongoDB...');
console.log('MONGODB_URI:', process.env.MONGODB_URI || 'Not set');

if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set in environment variables');
    process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('MongoDB Connected Successfully');
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
})
.catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
});

// Authentication middleware
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('JWT_SECRET is not set in environment variables');
    process.exit(1);
}

console.log('Using JWT_SECRET:', JWT_SECRET ? 'Secret is set' : 'Using default');

const auth = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        console.log('Received token:', token);
        
        if (!token) {
            console.log('No token provided');
            return res.status(401).json({ message: 'Authentication required' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            console.log('Token verified:', decoded);
            req.user = decoded;
            next();
        } catch (error) {
            console.log('Token verification failed:', error.message);
            return res.status(401).json({ message: 'Invalid token' });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Public routes
app.use('/api/auth', require('./routes/auth'));

// Protected routes
app.use('/api/predictions', auth, require('./routes/predictions'));

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Admin route with authentication
app.get('/admin', auth, (req, res) => {
    console.log('Admin route accessed');
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ message: 'Server error' });
});