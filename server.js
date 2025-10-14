const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const trackVisit = require('./middleware/analytics');

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

// Analytics tracking middleware
app.use(trackVisit);

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

// Public statistics endpoint
app.get('/api/stats', async (req, res) => {
    try {
        const Prediction = require('./models/prediction');
        
        // Изчисляваме времето преди 24 часа
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);
        
        // Филтър за последните 24 часа
        const last24HoursFilter = {
            matchDate: { $gte: yesterday }
        };
        
        // Общ брой прогнози за последните 24ч
        const total = await Prediction.countDocuments(last24HoursFilter);
        
        // Брой по статус (само за последните 24ч)
        const wins = await Prediction.countDocuments({ 
            ...last24HoursFilter,
            result: 'win' 
        });
        const losses = await Prediction.countDocuments({ 
            ...last24HoursFilter,
            result: 'loss' 
        });
        const pending = await Prediction.countDocuments({ 
            ...last24HoursFilter,
            result: 'pending' 
        });
        const voids = await Prediction.countDocuments({ 
            ...last24HoursFilter,
            result: 'void' 
        });
        
        // Win rate (само завършени прогнози за последните 24ч)
        const completed = wins + losses;
        const winRate = completed > 0 ? ((wins / completed) * 100).toFixed(1) : 0;
        
        // Последните 10 прогнози за streak (само за последните 24ч)
        const recentPredictions = await Prediction.find({ 
            ...last24HoursFilter,
            result: { $in: ['win', 'loss'] } 
        })
        .sort({ matchDate: -1 })
        .limit(10)
        .select('result');
        
        // Изчисляване на текуща серия
        let currentStreak = 0;
        let streakType = null;
        
        for (const pred of recentPredictions) {
            if (streakType === null) {
                streakType = pred.result;
                currentStreak = 1;
            } else if (pred.result === streakType) {
                currentStreak++;
            } else {
                break;
            }
        }
        
        // Средни коефициенти (само за последните 24ч)
        const avgOddsResult = await Prediction.aggregate([
            { $match: { 
                matchDate: { $gte: yesterday },
                odds: { $ne: null } 
            }},
            { $group: { _id: null, avgOdds: { $avg: '$odds' } } }
        ]);
        
        const avgOdds = avgOddsResult.length > 0 
            ? avgOddsResult[0].avgOdds.toFixed(2) 
            : 0;
        
        res.json({
            total,
            wins,
            losses,
            pending,
            voids,
            completed,
            winRate: parseFloat(winRate),
            streak: {
                count: currentStreak,
                type: streakType
            },
            avgOdds: parseFloat(avgOdds),
            period: 'last24hours'
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Protected routes
app.use('/api/predictions', auth, require('./routes/predictions'));

// Analytics routes (protected)
app.use('/api/analytics', auth, require('./routes/analytics'));

// Serve static files
app.get('/', async (req, res) => {
    try {
        console.log('Main page requested');
        // Зареждаме прогнозите от базата данни
        const Prediction = require('./models/prediction');
        
        // Зареждаме прогнозите от базата данни
        let predictions = [];
        try {
            predictions = await Prediction.find().sort({ matchDate: -1 });
            console.log(`Loaded ${predictions.length} predictions`);
        } catch (err) {
            console.error('Error fetching predictions:', err);
        }
        
        // Форматираме прогнозите
        let formattedPredictions = [];
        
        try {
            // Проверяваме дали прогнозите са от MongoDB
            if (predictions[0] && typeof predictions[0].toObject === 'function') {
                formattedPredictions = predictions.map(p => {
                    const prediction = p.toObject();
                    
                    // Обработваме датата
                    try {
                        if (prediction.matchDate) {
                            if (typeof prediction.matchDate === 'string') {
                                prediction.matchDate = new Date(prediction.matchDate);
                            }
                        } else {
                            prediction.matchDate = new Date();
                        }
                    } catch (dateErr) {
                        console.error('Error processing date:', dateErr);
                        prediction.matchDate = new Date();
                    }
                    
                    return prediction;
                });
            } else {
                formattedPredictions = predictions.map(p => {
                    const prediction = {...p};
                    
                    try {
                        if (prediction.matchDate) {
                            if (typeof prediction.matchDate === 'string') {
                                prediction.matchDate = new Date(prediction.matchDate);
                            }
                        } else {
                            prediction.matchDate = new Date();
                        }
                    } catch (dateErr) {
                        console.error('Error processing date:', dateErr);
                        prediction.matchDate = new Date();
                    }
                    
                    return prediction;
                });
            }
        } catch (err) {
            console.error('Error formatting predictions:', err);
            formattedPredictions = [];
        }
        
        // Четем HTML файла
        const fs = require('fs');
        const indexPath = path.join(__dirname, 'views', 'index.html');
        let htmlContent = fs.readFileSync(indexPath, 'utf8');
        
        // Дефинираме таговете за замяна
        const startTag = '<!-- PREDICTIONS_START -->';
        const endTag = '<!-- PREDICTIONS_END -->';
        
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
                        <td colspan="4">
                            ${formattedDate} <span style="opacity: 0.8; margin-left: 5px;">${monthName}</span>
                        </td>
                    </tr>
                `;
            }
            
            predictionsHtml += `
                <tr>
                    <td><span class="team-flag">${prediction.leagueFlag || ''}</span></td>
                    <td>${prediction.homeTeam || 'Отбор 1'}</td>
                    <td>${prediction.awayTeam || 'Отбор 2'}</td>
                    <td class="prediction-cell">${prediction.prediction || ''}</td>
                </tr>
            `;
        });
        
        // Ако няма прогнози, показваме съобщение
        if (formattedPredictions.length === 0) {
            predictionsHtml = '<tr><td colspan="4" class="text-center">No predictions available</td></tr>';
        }
        
        // Заменяме съдържанието между таговете
        const startIndex = htmlContent.indexOf(startTag);
        const endIndex = htmlContent.indexOf(endTag);
        
        if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
            const beforeStart = htmlContent.substring(0, startIndex + startTag.length);
            const afterEnd = htmlContent.substring(endIndex);
            htmlContent = beforeStart + '\n' + predictionsHtml + '\n                                ' + afterEnd;
        }
        
        // Скриваме индикатора за зареждане и съобщението за грешка
        htmlContent = htmlContent.replace('<div id="loading-indicator" class="text-center mb-4">', '<div id="loading-indicator" class="text-center mb-4" style="display: none;">');
        
        // Връщаме модифицирания HTML
        res.send(htmlContent);
    } catch (error) {
        console.error('Error loading predictions for index page:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

app.get('/login', (req, res) => {
    // Проверяваме дали има специален параметър за достъп
    const adminAccess = req.query['admin-access'];
    
    // Ако параметърът не е правилен, пренасочваме към началната страница
    if (adminAccess !== 'true') {
        console.log('Unauthorized login attempt without correct access parameter');
        return res.status(403).send('Access denied');
    }
    
    // Ако параметърът е правилен, показваме логин страницата
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