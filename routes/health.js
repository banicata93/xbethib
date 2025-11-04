const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { getCacheStats } = require('../utils/cache');

/**
 * Health Check Endpoint
 * Returns the health status of the application
 * Useful for monitoring, load balancers, and deployment checks
 */
router.get('/', async (req, res) => {
    const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        checks: {
            database: 'unknown',
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                unit: 'MB'
            },
            cpu: {
                user: process.cpuUsage().user,
                system: process.cpuUsage().system
            }
        }
    };

    try {
        // Check database connection
        if (mongoose.connection.readyState === 1) {
            // Connected - try to ping
            await mongoose.connection.db.admin().ping();
            health.checks.database = 'connected';
        } else if (mongoose.connection.readyState === 0) {
            health.checks.database = 'disconnected';
            health.status = 'ERROR';
        } else if (mongoose.connection.readyState === 2) {
            health.checks.database = 'connecting';
            health.status = 'DEGRADED';
        } else {
            health.checks.database = 'disconnecting';
            health.status = 'DEGRADED';
        }
    } catch (error) {
        console.error('Health check database error:', error);
        health.checks.database = 'error';
        health.checks.databaseError = error.message;
        health.status = 'ERROR';
    }

    // Set appropriate status code
    const statusCode = health.status === 'OK' ? 200 : 503;
    
    res.status(statusCode).json(health);
});

/**
 * Detailed Health Check (for admins)
 * Includes more detailed information
 */
router.get('/detailed', async (req, res) => {
    const detailed = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: {
            seconds: process.uptime(),
            formatted: formatUptime(process.uptime())
        },
        environment: process.env.NODE_ENV || 'development',
        node: {
            version: process.version,
            platform: process.platform,
            arch: process.arch
        },
        memory: {
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
            heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            external: Math.round(process.memoryUsage().external / 1024 / 1024),
            unit: 'MB'
        },
        cpu: process.cpuUsage(),
        database: {
            status: 'unknown',
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host || 'N/A',
            name: mongoose.connection.name || 'N/A'
        }
    };

    try {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.db.admin().ping();
            detailed.database.status = 'connected';
            
            // Get database stats
            const stats = await mongoose.connection.db.stats();
            detailed.database.collections = stats.collections;
            detailed.database.dataSize = Math.round(stats.dataSize / 1024 / 1024) + ' MB';
        } else {
            detailed.database.status = 'disconnected';
            detailed.status = 'ERROR';
        }
    } catch (error) {
        detailed.database.status = 'error';
        detailed.database.error = error.message;
        detailed.status = 'ERROR';
    }

    const statusCode = detailed.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(detailed);
});

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
}

module.exports = router;
