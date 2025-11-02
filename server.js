const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// MongoDB connection with caching for serverless
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb && mongoose.connection.readyState === 1) {
        console.log('Using cached database connection');
        return cachedDb;
    }

    if (!process.env.MONGODB_URI) {
        console.warn('WARNING: MONGODB_URI is not set in environment variables');
        return null;
    }

    try {
        console.log('Establishing new database connection...');
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        cachedDb = mongoose.connection;
        console.log('MongoDB Connected Successfully');
        return cachedDb;
    } catch (error) {
        console.error('MongoDB Connection Error:', error);
        return null;
    }
}

// Serve static files
app.get('/', async (req, res) => {
    try {
        console.log('Main page requested');
        const fs = require('fs');
        const indexPath = path.join(__dirname, 'views', 'index.html');
        
        if (!fs.existsSync(indexPath)) {
            return res.status(404).send('Index page not found');
        }
        
        res.sendFile(indexPath);
    } catch (error) {
        console.error('Error loading main page:', error);
        res.status(500).send('Server error: ' + error.message);
    }
});

app.get('/login', (req, res) => {
    // Serve login page - URL itself is security through obscurity
    console.log('Login page requested');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Admin routes - serve static files
app.get('/admin', (req, res) => {
    console.log('Admin page requested');
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Analytics page
app.get('/analytics', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'analytics.html'));
});

// Bot analysis page
app.get('/bot-analysis', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'bot-analysis.html'));
});

// Bulk import page
app.get('/bulk-import', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'bulk-import.html'));
});

// Match of the Day admin page
app.get('/match-of-the-day-admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'match-of-the-day-admin.html'));
});

// API Routes
const predictionsRouter = require('./routes/predictions');
const matchOfTheDayRouter = require('./routes/matchOfTheDay');
const authRouter = require('./routes/auth');
const botPredictionsRouter = require('./routes/botPredictions');

// Connect to database before handling API requests
app.use(async (req, res, next) => {
    if (req.path.startsWith('/api/')) {
        await connectToDatabase();
    }
    next();
});

app.use('/api/predictions', predictionsRouter);
app.use('/api/match-of-the-day', matchOfTheDayRouter);
app.use('/api/auth', authRouter);
app.use('/api/botPredictions', botPredictionsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ message: 'Server error' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).send('Page not found');
});

// For Vercel serverless
module.exports = app;