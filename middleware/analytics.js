const Analytics = require('../models/analytics');
const crypto = require('crypto');

// Функция за определяне на типа устройство
function getDeviceType(userAgent) {
    if (!userAgent) return 'unknown';
    
    const ua = userAgent.toLowerCase();
    
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return 'mobile';
    }
    return 'desktop';
}

// Функция за извличане на браузър
function getBrowser(userAgent) {
    if (!userAgent) return 'Unknown';
    
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edg')) return 'Edge';
    if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
    if (userAgent.includes('MSIE') || userAgent.includes('Trident')) return 'Internet Explorer';
    
    return 'Other';
}

// Функция за извличане на операционна система
function getOS(userAgent) {
    if (!userAgent) return 'Unknown';
    
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
    
    return 'Other';
}

// Функция за генериране на session ID
function generateSessionId(ip, userAgent) {
    const date = new Date().toISOString().split('T')[0]; // Само датата
    const hash = crypto.createHash('md5').update(`${ip}-${userAgent}-${date}`).digest('hex');
    return hash;
}

// Middleware за следене на посещенията
const trackVisit = async (req, res, next) => {
    try {
        // Игнорираме API заявки и статични файлове
        if (req.path.startsWith('/api/') || 
            req.path.startsWith('/css/') || 
            req.path.startsWith('/js/') || 
            req.path.startsWith('/images/') ||
            req.path.includes('.')) {
            return next();
        }
        
        // Извличаме информация
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress;
        
        const userAgent = req.headers['user-agent'] || '';
        const referrer = req.headers['referer'] || req.headers['referrer'] || 'Direct';
        const language = req.headers['accept-language']?.split(',')[0] || 'Unknown';
        
        const sessionId = generateSessionId(ip, userAgent);
        
        // Проверяваме дали е уникално посещение за деня
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const existingVisit = await Analytics.findOne({
            ip: ip,
            path: req.path,
            timestamp: { $gte: today }
        });
        
        // Създаваме запис за посещението
        const analyticsData = {
            path: req.path,
            fullUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
            referrer: referrer,
            ip: ip,
            userAgent: userAgent,
            device: getDeviceType(userAgent),
            browser: getBrowser(userAgent),
            os: getOS(userAgent),
            sessionId: sessionId,
            language: language,
            isUnique: !existingVisit
        };
        
        // Записваме асинхронно, без да чакаме
        Analytics.create(analyticsData).catch(err => {
            console.error('Error saving analytics:', err);
        });
        
    } catch (error) {
        console.error('Analytics middleware error:', error);
    }
    
    next();
};

module.exports = trackVisit;
