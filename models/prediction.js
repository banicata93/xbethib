const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
    matchDate: {
        type: Date,
        required: true
    },
    leagueFlag: {
        type: String,
        required: true,
        maxlength: 4
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
    confidence: {
        type: Number,
        min: 0,
        max: 100,
        default: 70
    },
    source: {
        type: String,
        default: 'manual'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Prediction', predictionSchema);
