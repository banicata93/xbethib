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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// Log all requests
app.use((req, res, next) => {
    console.log(`Request: ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});

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
    console.log('Auth middleware triggered');
    console.log('Request headers:', req.headers);
    
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
            console.log('Token:', token);
            return res.status(401).json({ message: 'Invalid token' });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Public routes
app.use('/api/auth', require('./routes/auth'));

// Създаваме публичен route за вземане на прогнози
app.get('/api/predictions/public', async (req, res) => {
    console.log('Public predictions API called');
    // Добавяме хедъри за CORS специално за този ендпойнт
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    try {
        const Prediction = require('./models/prediction');
        console.log('Fetching predictions from database...');
        // Намираме всички прогнози и ги сортираме по дата (най-новите първи)
        const predictions = await Prediction.find().sort({ matchDate: -1 });
        console.log(`Found ${predictions.length} predictions`);
        
        if (!predictions || predictions.length === 0) {
            console.log('No predictions found');
            return res.json([]);
        }
        
        const formattedPredictions = predictions.map(p => {
            const prediction = p.toObject();
            // Нормализираме датата в UTC
            const date = new Date(prediction.matchDate);
            prediction.matchDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
            return prediction;
        });

        console.log('Sending formatted predictions');
        return res.json(formattedPredictions);
    } catch (error) {
        console.error('Error in GET /api/predictions/public:', error);
        res.status(500).json({ message: error.message });
    }
});

// Protected routes
app.use('/api/predictions', auth, require('./routes/predictions'));

// Serve static files
app.get('/', async (req, res) => {
    try {
        // Зареждаме прогнозите от базата данни
        const Prediction = require('./models/prediction');
        const predictions = await Prediction.find().sort({ matchDate: -1 });
        
        console.log(`Found ${predictions.length} predictions for index page`);
        
        // Форматираме прогнозите
        const formattedPredictions = predictions.map(p => {
            const prediction = p.toObject();
            const date = new Date(prediction.matchDate);
            prediction.matchDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
            return prediction;
        });
        
        // Четем HTML файла
        const fs = require('fs');
        const indexPath = path.join(__dirname, 'public', 'index.html');
        let htmlContent = fs.readFileSync(indexPath, 'utf8');
        
        // Генерираме HTML за прогнозите
        let predictionsHtml = '';
        
        // Сортираме прогнозите по дата
        formattedPredictions.sort((a, b) => {
            const dateA = new Date(a.matchDate);
            const dateB = new Date(b.matchDate);
            return dateB.getTime() - dateA.getTime();
        });
        
        let currentDate = '';
        
        formattedPredictions.forEach(prediction => {
            const date = new Date(prediction.matchDate);
            const formattedDate = date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit'
            });
            
            // Добавяме името на месеца
            const monthName = date.toLocaleDateString('en-GB', { month: 'long' });
            
            const dateString = date.toISOString().split('T')[0];
            if (currentDate !== dateString) {
                currentDate = dateString;
                predictionsHtml += `
                    <tr class="date-separator">
                        <td colspan="5">
                            ${formattedDate} <span style="opacity: 0.8; margin-left: 5px;">${monthName}</span>
                        </td>
                    </tr>
                `;
            }
            
            predictionsHtml += `
                <tr>
                    <td>${formattedDate}</td>
                    <td><span class="team-flag">${prediction.leagueFlag || ''}</span></td>
                    <td>${prediction.homeTeam || 'Отбор 1'}</td>
                    <td>${prediction.awayTeam || 'Отбор 2'}</td>
                    <td class="prediction-cell">${prediction.prediction || ''}</td>
                </tr>
            `;
        });
        
        // Ако няма прогнози, показваме съобщение
        if (formattedPredictions.length === 0) {
            predictionsHtml = '<tr><td colspan="5" class="text-center">No predictions available</td></tr>';
        }
        
        // Заменяме плейсхолдера в HTML с генерираните прогнози
        htmlContent = htmlContent.replace('<!-- Predictions will be loaded here -->', predictionsHtml);
        
        // Скриваме индикатора за зареждане и съобщението за грешка
        htmlContent = htmlContent.replace('<div id="loading-indicator" class="text-center mb-4">', '<div id="loading-indicator" class="text-center mb-4" style="display: none;">');
        
        // Връщаме модифицирания HTML
        res.send(htmlContent);
    } catch (error) {
        console.error('Error loading predictions for index page:', error);
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Admin routes - separate the page serving from the authentication check
app.get('/admin', (req, res) => {
    console.log('Admin page requested');
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API endpoint to verify admin access
app.get('/api/admin/verify', auth, (req, res) => {
    console.log('Admin verification successful');
    console.log('User:', req.user);
    res.json({ success: true, userId: req.user.id });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ message: 'Server error' });
});