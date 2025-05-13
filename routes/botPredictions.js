const express = require('express');
const router = express.Router();
const Prediction = require('../models/prediction');

// Публичен маршрут за вземане на всички прогнози от бота
router.get('/public', async (req, res) => {
    try {
        // Намираме всички прогнози и ги сортираме по дата (най-новите първи)
        // Филтрираме прогнозите, за да покажем само тези, които са от бота или са специални прогнози
        const botPredictions = await Prediction.find({
            $or: [
                // Показваме прогнози от бота, независимо от техния формат
                { source: 'FootballBot' },
                // Или прогнози от други източници, които не са стандартни (1, X, 2)
                { 
                    source: { $ne: 'FootballBot' },
                    prediction: { $nin: ['1', 'X', '2'] } 
                }
            ]
        }).sort({ matchDate: -1 });
        
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

// Специален маршрут за приемане на данни от бота (без автентикация)
router.post('/bot-import', async (req, res) => {
    try {
        console.log('Получени данни от бота:', JSON.stringify(req.body).substring(0, 200) + '...');
        
        if (!Array.isArray(req.body) && !req.body.predictions) {
            return res.status(400).json({ 
                message: 'Невалиден формат на данните. Очаква се масив или обект с поле "predictions"',
                received: typeof req.body
            });
        }
        
        // Проверяваме дали данните са в масив или в обект с поле predictions
        const predictionsData = Array.isArray(req.body) ? req.body : req.body.predictions;
        
        if (!Array.isArray(predictionsData) || predictionsData.length === 0) {
            return res.status(400).json({ 
                message: 'Няма прогнози за импортиране',
                received: Array.isArray(req.body) ? 'празен масив' : 'обект без прогнози'
            });
        }
        
        const predictions = [];
        const errors = [];
        
        for (const item of predictionsData) {
            const { matchDate, homeTeam, awayTeam, leagueFlag, prediction, confidence, source } = item;
            
            // Валидация на входящите данни
            if (!matchDate || !homeTeam || !awayTeam || !prediction) {
                const missingFields = [];
                if (!matchDate) missingFields.push('matchDate');
                if (!homeTeam) missingFields.push('homeTeam');
                if (!awayTeam) missingFields.push('awayTeam');
                if (!prediction) missingFields.push('prediction');
                
                errors.push(`Липсващи задължителни полета: ${missingFields.join(', ')}`);
                console.warn('Пропускане на невалиден запис:', JSON.stringify(item));
                continue; // Пропускаме невалидните записи
            }
            
            try {
                const date = new Date(matchDate);
                if (isNaN(date.getTime())) {
                    errors.push(`Невалидна дата: ${matchDate}`);
                    continue;
                }
                
                // Всички прогнози от бота са валидни, независимо от типа
                predictions.push({
                    matchDate: date,
                    homeTeam,
                    awayTeam,
                    leagueFlag: leagueFlag || '🌍', // Ако няма флаг, използваме глобус
                    prediction,
                    confidence: confidence || 70,
                    source: source || 'FootballBot'
                });
            } catch (err) {
                errors.push(`Грешка при обработка на запис: ${err.message}`);
                console.error('Грешка при обработка на запис:', err);
            }
        }
        
        if (predictions.length === 0) {
            return res.status(400).json({ 
                message: 'Няма валидни прогнози за импортиране', 
                errors 
            });
        }
        
        const savedPredictions = await Prediction.insertMany(predictions);
        console.log(`Импортирани ${savedPredictions.length} прогнози от бота`);
        res.status(201).json({
            success: true,
            count: savedPredictions.length,
            errors: errors.length > 0 ? errors : undefined,
            predictions: savedPredictions
        });
    } catch (error) {
        console.error('Грешка в POST /botPredictions/bot-import:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

// Маршрут за изтриване на всички прогнози от бота (само за тестване)
router.delete('/bot-clear', async (req, res) => {
    try {
        const result = await Prediction.deleteMany({ source: 'FootballBot' });
        console.log(`Изтрити ${result.deletedCount} прогнози от бота`);
        res.json({
            success: true,
            count: result.deletedCount,
            message: `Изтрити ${result.deletedCount} прогнози от бота`
        });
    } catch (error) {
        console.error('Грешка в DELETE /botPredictions/bot-clear:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
