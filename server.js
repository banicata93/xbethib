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

// Protected routes
app.use('/api/predictions', auth, require('./routes/predictions'));

// Serve static files
app.get('/', async (req, res) => {
    try {
        console.log('Main page requested');
        // Зареждаме прогнозите от базата данни
        const Prediction = require('./models/prediction');
        
        // Добавяме тестови прогнози, ако няма такива в базата
        const testData = [
            {
                matchDate: new Date(),
                leagueFlag: '🇬🇧',
                homeTeam: 'Arsenal',
                awayTeam: 'Chelsea',
                prediction: 'BTTS & Over 2.5'
            },
            {
                matchDate: new Date(),
                leagueFlag: '🇪🇸',
                homeTeam: 'Barcelona',
                awayTeam: 'Real Madrid',
                prediction: '1X & Over 1.5'
            },
            {
                matchDate: new Date(Date.now() + 86400000), // Утре
                leagueFlag: '🇮🇹',
                homeTeam: 'Inter',
                awayTeam: 'Juventus',
                prediction: 'X'
            }
        ];
        
        // Проверяваме дали има прогнози в базата данни
        let predictions = [];
        try {
            // Зареждаме прогнозите, сортирани по дата (най-новите първи)
            predictions = await Prediction.find().sort({ matchDate: -1 });
            console.log(`Found ${predictions.length} predictions for index page`);
            
            if (predictions.length > 0) {
                // Показваме подробна информация за първата прогноза
                const firstPrediction = predictions[0];
                console.log('First prediction:', JSON.stringify(firstPrediction));
                console.log('First prediction fields:', Object.keys(firstPrediction));
                
                // Проверяваме дали има поле matchDate и какъв е форматът му
                console.log('Has matchDate:', firstPrediction.matchDate ? 'Yes' : 'No');
                console.log('matchDate value:', firstPrediction.matchDate);
                console.log('matchDate type:', firstPrediction.matchDate ? typeof firstPrediction.matchDate : 'N/A');
                
                // Проверяваме всички прогнози за техните дати
                console.log('All predictions dates:');
                predictions.forEach((p, index) => {
                    console.log(`Prediction ${index + 1} date:`, p.matchDate);
                });
            }
        } catch (err) {
            console.error('Error fetching predictions from MongoDB:', err);
        }
        console.log('MongoDB connection string:', process.env.MONGODB_URI);
        
        // Проверяваме дали има проблем с MongoDB връзката
        if (predictions.length === 0) {
            console.log('No predictions found in database. Using test data...');
            // Използваме тестовите данни
            predictions = testData;
            
            try {
                const mongoose = require('mongoose');
                console.log('MongoDB connection state:', mongoose.connection.readyState);
                // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
            } catch (err) {
                console.error('Error checking MongoDB connection:', err);
            }
        }
        
        // Форматираме прогнозите
        let formattedPredictions = [];
        
        // Добавяме лог за дебъгване на прогнозите преди форматиране
        console.log('Raw predictions before formatting:');
        if (predictions && predictions.length > 0) {
            predictions.forEach((p, idx) => {
                console.log(`Prediction ${idx + 1}:`, {
                    id: p._id,
                    date: p.matchDate,
                    teams: p.homeTeam + ' vs ' + p.awayTeam,
                    prediction: p.prediction
                });
            });
        }
        
        try {
            // Проверяваме дали прогнозите са от MongoDB или тестови данни
            if (predictions[0] && typeof predictions[0].toObject === 'function') {
                // MongoDB данни
                console.log('Processing MongoDB predictions');
                formattedPredictions = predictions.map(p => {
                    const prediction = p.toObject();
                    
                    // Обработваме датата в различни формати
                    try {
                        console.log(`Processing date: ${prediction.matchDate}`);
                        
                        // Опростена обработка на датата
                        if (prediction.matchDate) {
                            if (typeof prediction.matchDate === 'string') {
                                // Ако е string, опитваме да го парснем като дата
                                prediction.matchDate = new Date(prediction.matchDate);
                            }
                            // Ако е Date обект, го оставяме както е
                        } else {
                            prediction.matchDate = new Date(); // Днешна дата като fallback
                        }
                        
                        console.log(`Processed date result: ${prediction.matchDate}`);
                    } catch (dateErr) {
                        console.error(`Error processing date ${prediction.matchDate}:`, dateErr);
                        prediction.matchDate = new Date(); // Днешна дата при грешка
                    }
                    
                    return prediction;
                });
            } else {
                // Тестови данни
                console.log('Processing test data predictions');
                formattedPredictions = predictions.map(p => {
                    const prediction = {...p}; // Копираме обекта
                    
                    // Същата логика за обработка на датите както при MongoDB данните
                    try {
                        console.log(`Processing test data date: ${prediction.matchDate}`);
                        
                        // Опростена обработка на датата
                        if (prediction.matchDate) {
                            if (typeof prediction.matchDate === 'string') {
                                // Ако е string, опитваме да го парснем като дата
                                prediction.matchDate = new Date(prediction.matchDate);
                            }
                            // Ако е Date обект, го оставяме както е
                        } else {
                            prediction.matchDate = new Date(); // Днешна дата като fallback
                        }
                        
                        console.log(`Processed test date result: ${prediction.matchDate}`);
                    } catch (dateErr) {
                        console.error(`Error processing test date:`, dateErr);
                        prediction.matchDate = new Date(); // Използваме днешната дата при грешка
                    }
                    
                    return prediction;
                });
            }
            console.log('Formatted predictions:', formattedPredictions.length);
            if (formattedPredictions.length > 0) {
                console.log('Sample formatted prediction:', JSON.stringify(formattedPredictions[0]));
            }
        } catch (err) {
            console.error('Error formatting predictions:', err);
            formattedPredictions = [];
            console.log('Using empty predictions array due to formatting error');
        }
        
        // Четем HTML файла
        const fs = require('fs');
        const indexPath = path.join(__dirname, 'views', 'index.html');
        let htmlContent = fs.readFileSync(indexPath, 'utf8');
        
        // Дефинираме таговете за замяна
        const startTag = '<!-- PREDICTIONS_START -->';
        const endTag = '<!-- PREDICTIONS_END -->';
        
        console.log('Original HTML length:', htmlContent.length);
        console.log('HTML contains new placeholder:', htmlContent.includes('<!-- PREDICTIONS_PLACEHOLDER -->'));
        console.log('HTML contains old placeholder:', htmlContent.includes('<!-- Predictions will be loaded here -->'));
        console.log('HTML contains start tag:', htmlContent.includes(startTag));
        console.log('HTML contains end tag:', htmlContent.includes(endTag));
        console.log('HTML contains tbody:', htmlContent.includes('<tbody id="predictions-body">'));
        
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
        
        console.log('=== DEBUGGING PREDICTIONS HTML ===');
        console.log('formattedPredictions.length:', formattedPredictions.length);
        console.log('predictionsHtml length:', predictionsHtml.length);
        console.log('predictionsHtml content:', predictionsHtml);
        
        if (formattedPredictions.length > 0) {
            console.log('First prediction:', formattedPredictions[0]);
        }
        
        // Заменяме съдържанието между таговете
        const startIndex = htmlContent.indexOf(startTag);
        const endIndex = htmlContent.indexOf(endTag);
        
        if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
            const beforeStart = htmlContent.substring(0, startIndex + startTag.length);
            const afterEnd = htmlContent.substring(endIndex);
            htmlContent = beforeStart + '\n' + predictionsHtml + '\n                                ' + afterEnd;
            console.log('Successfully replaced predictions!');
        } else {
            console.log('Could not find prediction tags!');
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