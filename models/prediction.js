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
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Prediction', predictionSchema);
