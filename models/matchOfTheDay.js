const mongoose = require('mongoose');

const matchOfTheDaySchema = new mongoose.Schema({
    homeTeam: {
        name: {
            type: String,
            required: true
        },
        logo: {
            type: String,
            default: '/images/default-team.png'
        }
    },
    awayTeam: {
        name: {
            type: String,
            required: true
        },
        logo: {
            type: String,
            default: '/images/default-team.png'
        }
    },
    time: {
        type: String,
        required: true,
        default: '20:00'
    },
    prediction: {
        type: String,
        required: true
    },
    preview: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for quick lookup of active match
matchOfTheDaySchema.index({ isActive: 1, date: -1 });

module.exports = mongoose.model('MatchOfTheDay', matchOfTheDaySchema);
