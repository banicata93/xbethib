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

// Маршрут за импортиране на прогнози от бота
app.use('/api/botPredictions', require('./routes/botPredictions'));

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
                        
                        // Проверяваме дали датата е във формат "DD/MM.YYYY"
                        if (typeof prediction.matchDate === 'string' && prediction.matchDate.includes('.')) {
                            // Пример: "08/04.2025" -> "08/04/2025"
                            const fixedDateStr = prediction.matchDate.replace('.', '/');
                            console.log(`Converting date format from ${prediction.matchDate} to ${fixedDateStr}`);
                            
                            // Разделяме датата на части
                            const parts = fixedDateStr.split('/');
                            if (parts.length === 3) {
                                const day = parseInt(parts[0], 10);
                                const month = parseInt(parts[1], 10) - 1; // Месеците в JavaScript са от 0 до 11
                                const year = parseInt(parts[2], 10);
                                
                                console.log(`Parsed date parts: day=${day}, month=${month}, year=${year}`);
                                prediction.matchDate = new Date(year, month, day);
                            } else {
                                console.log(`Could not parse date parts from ${fixedDateStr}`);
                                prediction.matchDate = new Date(); // Използваме днешната дата като резервен вариант
                            }
                        } else {
                            // Опитваме стандартно парсване
                            const date = new Date(prediction.matchDate);
                            prediction.matchDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                        }
                        
                        console.log(`Processed date result: ${prediction.matchDate}`);
                    } catch (dateErr) {
                        console.error(`Error processing date ${prediction.matchDate}:`, dateErr);
                        prediction.matchDate = new Date(); // Използваме днешната дата при грешка
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
                        
                        if (typeof prediction.matchDate === 'string' && prediction.matchDate.includes('.')) {
                            // Пример: "08/04.2025" -> "08/04/2025"
                            const fixedDateStr = prediction.matchDate.replace('.', '/');
                            console.log(`Converting test date from ${prediction.matchDate} to ${fixedDateStr}`);
                            
                            const parts = fixedDateStr.split('/');
                            if (parts.length === 3) {
                                const day = parseInt(parts[0], 10);
                                const month = parseInt(parts[1], 10) - 1;
                                const year = parseInt(parts[2], 10);
                                
                                console.log(`Parsed test date parts: day=${day}, month=${month}, year=${year}`);
                                prediction.matchDate = new Date(year, month, day);
                            } else {
                                console.log(`Could not parse test date parts from ${fixedDateStr}`);
                                prediction.matchDate = new Date();
                            }
                        } else {
                            // Опитваме стандартно парсване
                            const date = new Date(prediction.matchDate);
                            prediction.matchDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
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
            formattedPredictions = testData; // Използваме тестовите данни при грешка
        }
        
        // Четем HTML файла
        const fs = require('fs');
        const indexPath = path.join(__dirname, 'public', 'index.html');
        let htmlContent = fs.readFileSync(indexPath, 'utf8');
        
        console.log('Original HTML length:', htmlContent.length);
        console.log('HTML contains new placeholder:', htmlContent.includes('<!-- PREDICTIONS_PLACEHOLDER -->'));
        console.log('HTML contains old placeholder:', htmlContent.includes('<!-- Predictions will be loaded here -->'));
        
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
        console.log('Generated predictions HTML length:', predictionsHtml.length);
        console.log('Sample of predictions HTML:', predictionsHtml.substring(0, 100));
        
        // Проверяваме за новия формат на плейсхолдера
        const startTag = '<!-- PREDICTIONS_START -->';
        const endTag = '<!-- PREDICTIONS_END -->';
        
        // Принтираме първите няколко реда от генерирания HTML
        console.log('Generated predictions HTML preview:', predictionsHtml.substring(0, 200));
        
        // Принтираме дължината на HTML и наличието на таговете
        console.log('HTML content length:', htmlContent.length);
        console.log('HTML contains start tag:', htmlContent.includes(startTag));
        console.log('HTML contains end tag:', htmlContent.includes(endTag));
        
        // Проверяваме дали имаме и двата тага
        if (htmlContent.includes(startTag) && htmlContent.includes(endTag)) {
            console.log('Found new prediction tags, replacing content between them');
            
            // Намираме съдържанието между таговете
            const startIndex = htmlContent.indexOf(startTag) + startTag.length;
            const endIndex = htmlContent.indexOf(endTag);
            
            console.log('Start index:', startIndex);
            console.log('End index:', endIndex);
            
            if (startIndex < endIndex) {
                // Заменяме съдържанието между таговете
                const beforeContent = htmlContent.substring(0, startIndex);
                const afterContent = htmlContent.substring(endIndex);
                
                // Създаваме новото съдържание
                htmlContent = beforeContent + '\n' + predictionsHtml + '\n' + afterContent;
                console.log('Successfully replaced content between prediction tags');
                console.log('New HTML length:', htmlContent.length);
            } else {
                console.log('Error: Start tag appears after end tag!');
            }
        } else {
            console.log('Could not find both prediction tags, falling back to direct tbody replacement');
            // Ако не можем да намерим таговете, опитваме да заменим целия tbody
            const tbodyStart = '<tbody id="predictions-body">';
            const tbodyEnd = '</tbody>';
            
            if (htmlContent.includes(tbodyStart) && htmlContent.includes(tbodyEnd)) {
                const tbodyStartIndex = htmlContent.indexOf(tbodyStart) + tbodyStart.length;
                const tbodyEndIndex = htmlContent.indexOf(tbodyEnd, tbodyStartIndex);
                
                if (tbodyStartIndex < tbodyEndIndex) {
                    const beforeTbody = htmlContent.substring(0, tbodyStartIndex);
                    const afterTbody = htmlContent.substring(tbodyEndIndex);
                    
                    htmlContent = beforeTbody + '\n' + predictionsHtml + '\n' + afterTbody;
                    console.log('Successfully replaced tbody content');
                }
            }
            
            // Ако не намерим новия формат, опитваме старите методи
            console.log('New prediction tags not found, trying old methods');
            
            // Проверяваме за стария плейсхолдер
            if (htmlContent.includes('<!-- PREDICTIONS_PLACEHOLDER -->')) {
                console.log('Found old placeholder, replacing it');
                htmlContent = htmlContent.replace('<!-- PREDICTIONS_PLACEHOLDER -->', predictionsHtml);
                console.log('Old placeholder replaced successfully');
            } 
            // Проверяваме за още по-стария плейсхолдер
            else if (htmlContent.includes('<!-- Predictions will be loaded here -->')) {
                console.log('Found very old placeholder, replacing it');
                htmlContent = htmlContent.replace('<!-- Predictions will be loaded here -->', predictionsHtml);
                console.log('Very old placeholder replaced successfully');
            } 
            // Ако нищо не работи, опитваме да вмъкнем в tbody
            else {
                console.log('No placeholders found, trying to insert at tbody');
                const tbodyPattern = '<tbody id="predictions-body">';
                if (htmlContent.includes(tbodyPattern)) {
                    htmlContent = htmlContent.replace(tbodyPattern, tbodyPattern + predictionsHtml);
                    console.log('Inserted predictions into tbody');
                } else {
                    console.log('Could not find any suitable place to insert predictions!');
                }
            }
        }
        
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