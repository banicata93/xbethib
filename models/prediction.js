const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
    matchDate: {
        type: Date,
        required: true,
        set: function(date) {
            // Нормализираме датата в UTC
            const d = new Date(date);
            console.log('Setting date in schema:', {
                input: date,
                normalized: d,
                iso: d.toISOString()
            });
            return d;
        },
        get: function(date) {
            // При извличане също нормализираме датата
            const d = new Date(date);
            d.setHours(12, 0, 0, 0);
            return d;
        }
    },
    homeTeam: {
        type: String,
        required: true
    },
    awayTeam: {
        type: String,
        required: true
    },
    league: {
        name: { type: String, required: true },
        flag: { type: String, required: true }
    },
    prediction: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Добавяме индекс за по-бързо сортиране
predictionSchema.index({ matchDate: 1 });

module.exports = mongoose.model('Prediction', predictionSchema); 