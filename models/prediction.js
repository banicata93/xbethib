const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
    matchDate: {
        type: Date,
        required: true
    },
    leagueFlag: {
        type: String,
        required: true,
        maxlength: 16
    },
    homeTeam: {
        type: String,
        required: true
    },
    awayTeam: {
        type: String,
        required: true
    },
    prediction: {
        type: String,
        required: true
    },
    result: {
        type: String,
        enum: ['pending', 'win', 'loss', 'void'],
        default: 'pending'
    },
    odds: {
        type: Number,
        min: 1.01,
        max: 100,
        default: null
    },
    isMatchOfTheDay: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Prediction', predictionSchema);
