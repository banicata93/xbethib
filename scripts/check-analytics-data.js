#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const Analytics = require('../models/analytics');

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('✅ Свързан с MongoDB\n');

        // Общ брой записи
        const totalCount = await Analytics.countDocuments();
        console.log(`📊 Общо записи в Analytics: ${totalCount}\n`);

        if (totalCount === 0) {
            console.log('❌ Няма записани данни в Analytics колекцията');
            console.log('\n💡 Възможни причини:');
            console.log('   1. Analytics middleware не е активиран');
            console.log('   2. Сайтът не е имал посещения');
            console.log('   3. Middleware-ът не записва данни правилно\n');
            
            console.log('🔧 Проверете:');
            console.log('   - Дали middleware/analytics.js е добавен в server.js');
            console.log('   - Дали има грешки в конзолата на сървъра');
            console.log('   - Дали сайтът е достъпен и има посещения\n');
        } else {
            // Най-ранен запис
            const earliest = await Analytics.findOne().sort({ timestamp: 1 });
            console.log(`📅 Най-ранен запис: ${earliest.timestamp.toLocaleString('bg-BG')}`);

            // Най-нов запис
            const latest = await Analytics.findOne().sort({ timestamp: -1 });
            console.log(`📅 Най-нов запис: ${latest.timestamp.toLocaleString('bg-BG')}\n`);

            // Записи по дни
            const byDay = await Analytics.aggregate([
                {
                    $group: {
                        _id: {
                            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: -1 } },
                { $limit: 10 }
            ]);

            console.log('📊 Записи по дни (последните 10 дни):');
            console.log('═══════════════════════════════════════\n');
            
            byDay.forEach(day => {
                console.log(`${day._id}: ${day.count} посещения`);
            });

            console.log('\n💡 За да видите пълния анализ, отворете:');
            console.log('   http://localhost:3000/bot-analysis.html\n');
        }

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Грешка:', error.message);
        process.exit(1);
    }
}

checkData();
