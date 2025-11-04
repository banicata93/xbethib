const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
require('dotenv').config();

// Validate environment variables
const validateEnv = require('./utils/validateEnv');
validateEnv();

const app = express();

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
            connectSrc: ["'self'"]
        }
    }
}));

// CORS Configuration
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'https://xbethub.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression Middleware
app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Files
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
const healthRouter = require('./routes/health');

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
app.use('/api/health', healthRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ message: 'Server error' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).send('Page not found');
});

// Start server locally if not in Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, async () => {
        console.log(`Server running on port ${PORT}`);
        await connectToDatabase();
    });
}

// For Vercel serverless
module.exports = app;