const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const BotPrediction = require('../models/botPrediction');

// Middleware за проверка на JWT токен
const auth = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        console.log('Получен токен:', token);
        
        if (!token) {
            console.log('Не е предоставен токен');
            return res.status(401).json({ message: 'Изисква се автентикация' });
        }

        try {
            const JWT_SECRET = process.env.JWT_SECRET;
            if (!JWT_SECRET) {
                console.error('JWT_SECRET не е зададен в променливите на средата');
                return res.status(500).json({ message: 'Грешка в конфигурацията на сървъра' });
            }

            const decoded = jwt.verify(token, JWT_SECRET);
            console.log('Токенът е проверен:', decoded);
            req.user = decoded;
            next();
        } catch (error) {
            console.log('Проверката на токена е неуспешна:', error.message);
            return res.status(401).json({ message: 'Невалиден токен' });
        }
    } catch (error) {
        console.error('Грешка в middleware за автентикация:', error);
        return res.status(500).json({ message: 'Грешка в сървъра' });
    }
};

// Публичен маршрут за вземане на всички прогнози от бота
router.get('/public', async (req, res) => {
    try {
        // Намираме всички прогнози от бота и ги сортираме по дата (най-новите първи)
        const botPredictions = await BotPrediction.find().sort({ matchDate: -1 });
        
        const formattedPredictions = botPredictions.map(p => {
            const prediction = p.toObject();
            // Нормализираме датата в UTC
            const date = new Date(prediction.matchDate);
            prediction.matchDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
            return prediction;
        });

        res.json(formattedPredictions);
    } catch (error) {
        console.error('Грешка в GET /botPredictions/public:', error);
        res.status(500).json({ message: error.message });
    }
});

// Вземане на всички прогнози от бота (защитен маршрут)
router.get('/', auth, async (req, res) => {
    try {
        // Намираме всички прогнози от бота и ги сортираме по дата (най-новите първи)
        const botPredictions = await BotPrediction.find().sort({ matchDate: -1 });
        
        const formattedPredictions = botPredictions.map(p => {
            const prediction = p.toObject();
            // Нормализираме датата в UTC
            const date = new Date(prediction.matchDate);
            prediction.matchDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
            return prediction;
        });

        res.json(formattedPredictions);
    } catch (error) {
        console.error('Грешка в GET /botPredictions:', error);
        res.status(500).json({ message: error.message });
    }
});

// Добавяне на нова прогноза от бота (защитен маршрут)
router.post('/', auth, async (req, res) => {
    try {
        console.log('Получени данни за прогноза от бота:', req.body);
        const { matchDate, homeTeam, awayTeam, leagueFlag, prediction, confidence, source } = req.body;
        
        // Валидация на входящите данни
        if (!matchDate || !homeTeam || !awayTeam || !leagueFlag || !prediction) {
            return res.status(400).json({ 
                message: 'Всички полета са задължителни',
                received: req.body
            });
        }

        const date = new Date(matchDate);
        console.log('Създаване на прогноза от бота:', {
            date: date.toISOString(),
            homeTeam,
            awayTeam,
            leagueFlag,
            prediction,
            confidence,
            source
        });

        const newBotPrediction = new BotPrediction({
            matchDate: date,
            homeTeam,
            awayTeam,
            leagueFlag,
            prediction,
            confidence: confidence || 70,
            source: source || 'bot'
        });

        const savedBotPrediction = await newBotPrediction.save();
        console.log('Запазена прогноза от бота:', savedBotPrediction);
        res.status(201).json(savedBotPrediction);
    } catch (error) {
        console.error('Грешка в POST /botPredictions:', error);
        res.status(400).json({ message: error.message });
    }
});

// Актуализиране на прогноза от бота (защитен маршрут)
router.put('/:id', auth, async (req, res) => {
    try {
        const botPrediction = await BotPrediction.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(botPrediction);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Изтриване на прогноза от бота (защитен маршрут)
router.delete('/:id', auth, async (req, res) => {
    try {
        await BotPrediction.findByIdAndDelete(req.params.id);
        res.json({ message: 'Прогнозата от бота е изтрита' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Специален маршрут за приемане на данни от бота (без автентикация)
router.post('/bot-import', async (req, res) => {
    try {
        console.log('Получени данни от бота:', req.body);
        
        if (!Array.isArray(req.body) && !req.body.predictions) {
            return res.status(400).json({ 
                message: 'Невалиден формат на данните',
                received: req.body
            });
        }
        
        // Проверяваме дали данните са в масив или в обект с поле predictions
        const predictionsData = Array.isArray(req.body) ? req.body : req.body.predictions;
        
        if (!Array.isArray(predictionsData) || predictionsData.length === 0) {
            return res.status(400).json({ 
                message: 'Няма прогнози за импортиране',
                received: req.body
            });
        }
        
        const predictions = [];
        
        for (const item of predictionsData) {
            const { matchDate, homeTeam, awayTeam, leagueFlag, prediction, confidence, source } = item;
            
            // Валидация на входящите данни
            if (!matchDate || !homeTeam || !awayTeam || !prediction) {
                console.warn('Пропускане на невалиден запис:', item);
                continue; // Пропускаме невалидните записи
            }
            
            const date = new Date(matchDate);
            
            predictions.push({
                matchDate: date,
                homeTeam,
                awayTeam,
                leagueFlag: leagueFlag || '🌍', // Ако няма флаг, използваме глобус
                prediction,
                confidence: confidence || 70,
                source: source || 'bot'
            });
        }
        
        if (predictions.length === 0) {
            return res.status(400).json({ message: 'Няма валидни прогнози за импортиране' });
        }
        
        const savedPredictions = await BotPrediction.insertMany(predictions);
        console.log(`Импортирани ${savedPredictions.length} прогнози от бота`);
        res.status(201).json({
            success: true,
            count: savedPredictions.length,
            predictions: savedPredictions
        });
    } catch (error) {
        console.error('Грешка в POST /botPredictions/bot-import:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

// Маршрут за импортиране на множество прогнози от бота (защитен маршрут)
router.post('/batch', auth, async (req, res) => {
    try {
        console.log('Получени данни за пакетно импортиране:', req.body);
        
        if (!Array.isArray(req.body) || req.body.length === 0) {
            return res.status(400).json({ 
                message: 'Очаква се масив от прогнози',
                received: req.body
            });
        }

        const predictions = [];
        
        for (const item of req.body) {
            const { matchDate, homeTeam, awayTeam, leagueFlag, prediction, confidence, source } = item;
            
            // Валидация на входящите данни
            if (!matchDate || !homeTeam || !awayTeam || !leagueFlag || !prediction) {
                continue; // Пропускаме невалидните записи
            }

            const date = new Date(matchDate);
            
            predictions.push({
                matchDate: date,
                homeTeam,
                awayTeam,
                leagueFlag,
                prediction,
                confidence: confidence || 70,
                source: source || 'bot'
            });
        }

        if (predictions.length === 0) {
            return res.status(400).json({ message: 'Няма валидни прогнози за импортиране' });
        }

        const savedPredictions = await BotPrediction.insertMany(predictions);
        console.log(`Импортирани ${savedPredictions.length} прогнози от бота`);
        res.status(201).json(savedPredictions);
    } catch (error) {
        console.error('Грешка в POST /botPredictions/batch:', error);
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
