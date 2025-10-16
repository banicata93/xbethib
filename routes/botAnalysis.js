const express = require('express');
const router = express.Router();
const Analytics = require('../models/analytics');

// Списък с известни ботове в User-Agent
const BOT_PATTERNS = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /http/i,
    /libwww/i,
    /perl/i,
    /ruby/i,
    /go-http/i,
    /okhttp/i,
    /axios/i,
    /fetch/i,
    /node-fetch/i,
    /headless/i,
    /phantom/i,
    /selenium/i,
    /webdriver/i,
    /puppeteer/i,
    /googlebot/i,
    /bingbot/i,
    /slurp/i,
    /duckduckbot/i,
    /baiduspider/i,
    /yandexbot/i,
    /facebookexternalhit/i,
    /twitterbot/i,
    /linkedinbot/i,
    /whatsapp/i,
    /telegrambot/i,
    /discordbot/i,
    /slackbot/i,
    /applebot/i,
    /ahrefsbot/i,
    /semrushbot/i,
    /mj12bot/i,
    /dotbot/i,
    /rogerbot/i,
    /exabot/i,
    /facebot/i,
    /ia_archiver/i,
    /archive.org_bot/i,
    /screaming frog/i,
    /sitebulb/i
];

// Функция за проверка дали User-Agent е бот
function isBotUserAgent(userAgent) {
    if (!userAgent) return { isBot: true, reason: 'No User-Agent' };
    
    for (const pattern of BOT_PATTERNS) {
        if (pattern.test(userAgent)) {
            return { 
                isBot: true, 
                reason: `Matches bot pattern: ${pattern.source}`,
                pattern: pattern.source
            };
        }
    }
    
    // Проверка за твърде кратък или подозрителен User-Agent
    if (userAgent.length < 20) {
        return { 
            isBot: true, 
            reason: 'User-Agent too short (likely fake)'
        };
    }
    
    return { isBot: false };
}

// Анализ на трафика за ботове
router.get('/analyze', async (req, res) => {
    try {
        const { period = '2' } = req.query; // По подразбиране последните 2 дни
        
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(period));
        
        // Вземаме всички посещения за периода
        const allVisits = await Analytics.find({
            timestamp: { $gte: daysAgo }
        }).select('ip userAgent timestamp path sessionId device browser');
        
        const totalVisits = allVisits.length;
        
        // Анализ на User-Agents
        const botVisits = [];
        const humanVisits = [];
        const userAgentStats = {};
        
        allVisits.forEach(visit => {
            const botCheck = isBotUserAgent(visit.userAgent);
            
            if (botCheck.isBot) {
                botVisits.push({
                    ...visit.toObject(),
                    botReason: botCheck.reason,
                    botPattern: botCheck.pattern
                });
            } else {
                humanVisits.push(visit);
            }
            
            // Статистика по User-Agent
            const ua = visit.userAgent || 'Unknown';
            if (!userAgentStats[ua]) {
                userAgentStats[ua] = {
                    count: 0,
                    isBot: botCheck.isBot,
                    reason: botCheck.reason
                };
            }
            userAgentStats[ua].count++;
        });
        
        // Анализ на IP адреси - много заявки от един IP
        const ipStats = {};
        allVisits.forEach(visit => {
            const ip = visit.ip || 'Unknown';
            if (!ipStats[ip]) {
                ipStats[ip] = {
                    count: 0,
                    visits: []
                };
            }
            ipStats[ip].count++;
            ipStats[ip].visits.push({
                timestamp: visit.timestamp,
                path: visit.path,
                userAgent: visit.userAgent
            });
        });
        
        // Подозрителни IP адреси (повече от 20 заявки за периода)
        const suspiciousIPs = Object.entries(ipStats)
            .filter(([ip, data]) => data.count > 20)
            .map(([ip, data]) => ({
                ip,
                count: data.count,
                avgRequestsPerDay: (data.count / parseInt(period)).toFixed(2),
                visits: data.visits.slice(0, 10) // Показваме първите 10 заявки
            }))
            .sort((a, b) => b.count - a.count);
        
        // Анализ на времеви модели - ботове правят много бързи заявки
        const rapidFireIPs = [];
        Object.entries(ipStats).forEach(([ip, data]) => {
            if (data.visits.length > 1) {
                const timestamps = data.visits.map(v => new Date(v.timestamp).getTime()).sort();
                const intervals = [];
                
                for (let i = 1; i < timestamps.length; i++) {
                    intervals.push(timestamps[i] - timestamps[i - 1]);
                }
                
                const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                const minInterval = Math.min(...intervals);
                
                // Ако средният интервал е под 5 секунди или минималният е под 1 секунда
                if (avgInterval < 5000 || minInterval < 1000) {
                    rapidFireIPs.push({
                        ip,
                        count: data.count,
                        avgIntervalMs: Math.round(avgInterval),
                        minIntervalMs: minInterval,
                        isSuspicious: true
                    });
                }
            }
        });
        
        // Топ User-Agents по брой заявки
        const topUserAgents = Object.entries(userAgentStats)
            .map(([ua, data]) => ({
                userAgent: ua.substring(0, 100), // Ограничаваме дължината
                count: data.count,
                isBot: data.isBot,
                reason: data.reason,
                percentage: ((data.count / totalVisits) * 100).toFixed(2)
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);
        
        // Статистика за устройства - ботове често нямат валидно устройство
        const deviceStats = {};
        allVisits.forEach(visit => {
            const device = visit.device || 'unknown';
            deviceStats[device] = (deviceStats[device] || 0) + 1;
        });
        
        // Статистика за браузъри
        const browserStats = {};
        allVisits.forEach(visit => {
            const browser = visit.browser || 'Unknown';
            browserStats[browser] = (browserStats[browser] || 0) + 1;
        });
        
        // Анализ на пътища - ботове често атакуват специфични пътища
        const pathStats = {};
        allVisits.forEach(visit => {
            const path = visit.path || '/';
            if (!pathStats[path]) {
                pathStats[path] = { total: 0, bots: 0, humans: 0 };
            }
            pathStats[path].total++;
            
            const botCheck = isBotUserAgent(visit.userAgent);
            if (botCheck.isBot) {
                pathStats[path].bots++;
            } else {
                pathStats[path].humans++;
            }
        });
        
        const pathAnalysis = Object.entries(pathStats)
            .map(([path, data]) => ({
                path,
                total: data.total,
                bots: data.bots,
                humans: data.humans,
                botPercentage: ((data.bots / data.total) * 100).toFixed(2)
            }))
            .sort((a, b) => b.total - a.total);
        
        // Обобщение
        const summary = {
            totalVisits,
            botVisits: botVisits.length,
            humanVisits: humanVisits.length,
            botPercentage: ((botVisits.length / totalVisits) * 100).toFixed(2),
            humanPercentage: ((humanVisits.length / totalVisits) * 100).toFixed(2),
            suspiciousIPCount: suspiciousIPs.length,
            rapidFireIPCount: rapidFireIPs.length,
            uniqueIPs: Object.keys(ipStats).length,
            uniqueUserAgents: Object.keys(userAgentStats).length
        };
        
        res.json({
            period: parseInt(period),
            summary,
            topUserAgents,
            suspiciousIPs,
            rapidFireIPs,
            deviceStats,
            browserStats,
            pathAnalysis,
            recentBotVisits: botVisits.slice(0, 50).map(v => ({
                timestamp: v.timestamp,
                ip: v.ip,
                path: v.path,
                userAgent: v.userAgent?.substring(0, 100),
                botReason: v.botReason
            }))
        });
        
    } catch (error) {
        console.error('Error analyzing bot traffic:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Детайлен анализ на конкретен IP
router.get('/ip/:ip', async (req, res) => {
    try {
        const { ip } = req.params;
        const { period = '7' } = req.query;
        
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(period));
        
        const visits = await Analytics.find({
            ip: ip,
            timestamp: { $gte: daysAgo }
        }).sort({ timestamp: -1 });
        
        if (visits.length === 0) {
            return res.status(404).json({ message: 'No visits found for this IP' });
        }
        
        // Анализ на поведението
        const timestamps = visits.map(v => new Date(v.timestamp).getTime()).sort();
        const intervals = [];
        
        for (let i = 1; i < timestamps.length; i++) {
            intervals.push(timestamps[i] - timestamps[i - 1]);
        }
        
        const avgInterval = intervals.length > 0 
            ? intervals.reduce((a, b) => a + b, 0) / intervals.length 
            : 0;
        
        const minInterval = intervals.length > 0 ? Math.min(...intervals) : 0;
        const maxInterval = intervals.length > 0 ? Math.max(...intervals) : 0;
        
        // Уникални страници
        const uniquePaths = [...new Set(visits.map(v => v.path))];
        
        // Уникални User-Agents
        const uniqueUserAgents = [...new Set(visits.map(v => v.userAgent))];
        
        // Проверка за ботове
        const botChecks = uniqueUserAgents.map(ua => ({
            userAgent: ua,
            ...isBotUserAgent(ua)
        }));
        
        res.json({
            ip,
            totalVisits: visits.length,
            period: parseInt(period),
            uniquePaths: uniquePaths.length,
            uniqueUserAgents: uniqueUserAgents.length,
            avgIntervalMs: Math.round(avgInterval),
            minIntervalMs: minInterval,
            maxIntervalMs: maxInterval,
            isSuspicious: avgInterval < 5000 || visits.length > 50,
            botChecks,
            paths: uniquePaths,
            visits: visits.slice(0, 100).map(v => ({
                timestamp: v.timestamp,
                path: v.path,
                userAgent: v.userAgent,
                device: v.device,
                browser: v.browser,
                referrer: v.referrer
            }))
        });
        
    } catch (error) {
        console.error('Error analyzing IP:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Блокиране на подозрителни IP адреси (за бъдеща имплементация)
router.post('/block-ip', async (req, res) => {
    try {
        const { ip, reason } = req.body;
        
        // TODO: Имплементирайте система за блокиране на IP адреси
        // Можете да използвате отделна колекция за блокирани IP адреси
        
        res.json({ 
            message: 'IP blocking feature coming soon',
            ip,
            reason
        });
        
    } catch (error) {
        console.error('Error blocking IP:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
