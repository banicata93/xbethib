const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
    fixtureId: {
        type: Number,
        default: null
    },
    matchDate: {
        type: Date,
        required: true
    },
    leagueFlag: {
        type: String,
        required: true,
        maxlength: 16
    },
    league: {
        type: String,
        default: ''
    },
    country: {
        type: String,
        default: ''
    },
    flag: {
        type: String,
        default: ''
    },
    homeTeam: {
        type: String,
        required: true
    },
    homeTeamFlag: {
        type: String,
        default: ''
    },
    awayTeam: {
        type: String,
        required: true
    },
    awayTeamFlag: {
        type: String,
        default: ''
    },
    prediction: {
        type: String,
        required: true
    },
    stick: {
        type: String,
        default: ''
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
    }
    // NOTE: isMatchOfTheDay field is deprecated
    // Match of the Day now uses separate MatchOfTheDay model
}, {
    timestamps: true
});

// Indexes for better query performance
predictionSchema.index({ matchDate: -1 }); // For sorting by date (descending)
predictionSchema.index({ result: 1 }); // For filtering by result
predictionSchema.index({ matchDate: -1, result: 1 }); // Composite index for common queries
predictionSchema.index({ createdAt: -1 }); // For recent predictions

module.exports = mongoose.model('Prediction', predictionSchema);
