const express = require('express');
const router = express.Router();
const Prediction = require('../models/prediction');

// Публичен маршрут за вземане на всички прогнози от бота
router.get('/public', async (req, res) => {
    try {
        // Намираме всички прогнози и ги сортираме по дата (най-новите първи)
        // Филтрираме прогнозите, за да покажем само тези, които са валидни
        const botPredictions = await Prediction.find({
            $or: [
                // Показваме прогнози от бота
                { source: 'FootballBot' },
                // Или прогнози, които не са само "1"
                { prediction: { $ne: '1' } }
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
            
            // Проверяваме дали прогнозата е валидна и не е само "1"
            if (prediction && prediction !== "1" || (prediction === "1" && source === "FootballBot")) {
                predictions.push({
                    matchDate: date,
                    homeTeam,
                    awayTeam,
                    leagueFlag: leagueFlag || '🌍', // Ако няма флаг, използваме глобус
                    prediction,
                    confidence: confidence || 70,
                    source: source || 'FootballBot'
                });
            } else {
                console.warn('Невалидна прогноза:', prediction, 'за мач:', homeTeam, '-', awayTeam);
            }
        }
        
        if (predictions.length === 0) {
            return res.status(400).json({ message: 'Няма валидни прогнози за импортиране' });
        }
        
        const savedPredictions = await Prediction.insertMany(predictions);
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

module.exports = router;
