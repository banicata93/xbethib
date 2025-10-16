#!/usr/bin/env node

/**
 * Бърз скрипт за проверка на ботове в командния ред
 * Използване: node scripts/quick-bot-check.js [дни]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Analytics = require('../models/analytics');

// Списък с известни ботове
const BOT_PATTERNS = [
    /bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i,
    /python/i, /java/i, /http/i, /libwww/i, /perl/i, /ruby/i,
    /go-http/i, /okhttp/i, /axios/i, /fetch/i, /node-fetch/i,
    /headless/i, /phantom/i, /selenium/i, /webdriver/i, /puppeteer/i
];

function isBotUserAgent(userAgent) {
    if (!userAgent || userAgent.length < 20) return true;
    return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
}

async function quickBotCheck() {
    try {
        // Свързване с MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('✅ Свързан с MongoDB\n');

        // Период за анализ (по подразбиране 2 дни)
        const days = parseInt(process.argv[2]) || 2;
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - days);

        console.log(`📊 Анализ за последните ${days} дни (от ${daysAgo.toLocaleDateString('bg-BG')})\n`);

        // Вземаме всички посещения
        const allVisits = await Analytics.find({
            timestamp: { $gte: daysAgo }
        }).select('ip userAgent timestamp path');

        const totalVisits = allVisits.length;

        if (totalVisits === 0) {
            console.log('❌ Няма записани посещения за този период');
            process.exit(0);
        }

        // Анализ на ботове
        let botCount = 0;
        let humanCount = 0;
        const ipStats = {};

        allVisits.forEach(visit => {
            const isBot = isBotUserAgent(visit.userAgent);
            
            if (isBot) {
                botCount++;
            } else {
                humanCount++;
            }

            // Статистика по IP
            const ip = visit.ip || 'Unknown';
            ipStats[ip] = (ipStats[ip] || 0) + 1;
        });

        // Подозрителни IP адреси
        const suspiciousIPs = Object.entries(ipStats)
            .filter(([ip, count]) => count > 20)
            .sort((a, b) => b[1] - a[1]);

        // Резултати
        console.log('═══════════════════════════════════════════════════');
        console.log('                   РЕЗУЛТАТИ');
        console.log('═══════════════════════════════════════════════════\n');

        console.log(`📈 Общо посещения: ${totalVisits}`);
        console.log(`🤖 Ботове: ${botCount} (${((botCount/totalVisits)*100).toFixed(2)}%)`);
        console.log(`👤 Реални хора: ${humanCount} (${((humanCount/totalVisits)*100).toFixed(2)}%)`);
        console.log(`🌐 Уникални IP адреси: ${Object.keys(ipStats).length}`);
        console.log(`⚠️  Подозрителни IP адреси: ${suspiciousIPs.length}\n`);

        // Интерпретация
        const botPercentage = (botCount/totalVisits)*100;
        
        console.log('═══════════════════════════════════════════════════');
        console.log('                 ИНТЕРПРЕТАЦИЯ');
        console.log('═══════════════════════════════════════════════════\n');

        if (botPercentage < 30) {
            console.log('✅ ОТЛИЧНО! Повечето посетители са реални хора.');
            console.log('   Продължавайте да създавате качествено съдържание.\n');
        } else if (botPercentage < 60) {
            console.log('⚠️  СМЕСЕН ТРАФИК. Имате значителен брой ботове.');
            console.log('   Проверете дали са добри ботове (Google, Bing) или злонамерени.\n');
        } else {
            console.log('🚨 ВНИМАНИЕ! Повечето посещения са от ботове.');
            console.log('   Препоръчваме детайлен анализ и евентуално блокиране.\n');
        }

        // Топ 5 IP адреси
        if (suspiciousIPs.length > 0) {
            console.log('═══════════════════════════════════════════════════');
            console.log('           ТОП 5 ПОДОЗРИТЕЛНИ IP АДРЕСИ');
            console.log('═══════════════════════════════════════════════════\n');

            suspiciousIPs.slice(0, 5).forEach(([ip, count], index) => {
                console.log(`${index + 1}. ${ip}: ${count} заявки (${(count/days).toFixed(1)} на ден)`);
            });
            console.log('');
        }

        // Препоръки
        console.log('═══════════════════════════════════════════════════');
        console.log('                   ПРЕПОРЪКИ');
        console.log('═══════════════════════════════════════════════════\n');

        console.log('1. 🌐 Отворете /bot-analysis.html за детайлен анализ');
        console.log('2. 🔍 Проверете User-Agents на подозрителните IP адреси');
        console.log('3. 📊 Сравнете с предишни периоди за тенденции');
        
        if (suspiciousIPs.length > 0) {
            console.log('4. 🛡️  Разгледайте блокиране на най-активните IP адреси');
        }
        
        if (botPercentage > 60) {
            console.log('5. 🔐 Добавете rate limiting или CAPTCHA');
        }

        console.log('\n═══════════════════════════════════════════════════\n');

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Грешка:', error.message);
        process.exit(1);
    }
}

// Стартиране
quickBotCheck();
