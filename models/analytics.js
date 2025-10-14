const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
    // Основна информация за посещението
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    
    // URL и страница
    path: {
        type: String,
        required: true
    },
    
    fullUrl: String,
    
    // Referrer - откъде идва потребителят
    referrer: String,
    
    // IP адрес и местоположение
    ip: String,
    
    country: String,
    
    city: String,
    
    // Информация за устройството
    userAgent: String,
    
    device: {
        type: String,
        enum: ['mobile', 'tablet', 'desktop', 'unknown'],
        default: 'unknown'
    },
    
    browser: String,
    
    os: String,
    
    // Сесия
    sessionId: String,
    
    // Време на престой (в секунди)
    duration: Number,
    
    // Допълнителна информация
    screenResolution: String,
    
    language: String,
    
    // Дали е уникално посещение (първо за деня)
    isUnique: {
        type: Boolean,
        default: false
    }
});

// Индекси за по-бързи заявки
analyticsSchema.index({ timestamp: -1 });
analyticsSchema.index({ path: 1, timestamp: -1 });
analyticsSchema.index({ sessionId: 1 });
analyticsSchema.index({ ip: 1, timestamp: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
