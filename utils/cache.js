const NodeCache = require('node-cache');

/**
 * In-Memory Cache for public endpoints
 * Perfect for read-only data that doesn't change frequently
 */

// Create cache instance
// stdTTL: 300 seconds (5 minutes) - default time to live
// checkperiod: 60 seconds - period for automatic delete check
const cache = new NodeCache({
    stdTTL: 300,
    checkperiod: 60,
    useClones: false // Better performance, but be careful with mutations
});

/**
 * Cache middleware for Express routes
 * @param {number} duration - Cache duration in seconds (default: 300)
 * @returns {Function} Express middleware
 */
function cacheMiddleware(duration = 300) {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Create cache key from URL
        const key = req.originalUrl || req.url;
        
        // Try to get cached response
        const cachedResponse = cache.get(key);
        
        if (cachedResponse) {
            console.log(`Cache HIT: ${key}`);
            return res.json(cachedResponse);
        }

        console.log(`Cache MISS: ${key}`);

        // Store original res.json function
        const originalJson = res.json.bind(res);

        // Override res.json to cache the response
        res.json = (data) => {
            // Cache the response
            cache.set(key, data, duration);
            
            // Send response
            return originalJson(data);
        };

        next();
    };
}

/**
 * Invalidate cache by key or pattern
 * @param {string|RegExp} pattern - Key or pattern to invalidate
 */
function invalidateCache(pattern) {
    if (typeof pattern === 'string') {
        // Delete specific key
        const deleted = cache.del(pattern);
        console.log(`Cache invalidated: ${pattern} (${deleted ? 'success' : 'not found'})`);
        return deleted;
    } else if (pattern instanceof RegExp) {
        // Delete keys matching pattern
        const keys = cache.keys();
        const matchingKeys = keys.filter(key => pattern.test(key));
        
        if (matchingKeys.length > 0) {
            cache.del(matchingKeys);
            console.log(`Cache invalidated: ${matchingKeys.length} keys matching ${pattern}`);
        }
        
        return matchingKeys.length;
    }
}

/**
 * Clear all cache
 */
function clearAllCache() {
    cache.flushAll();
    console.log('All cache cleared');
}

/**
 * Get cache statistics
 */
function getCacheStats() {
    return {
        keys: cache.keys().length,
        hits: cache.getStats().hits,
        misses: cache.getStats().misses,
        ksize: cache.getStats().ksize,
        vsize: cache.getStats().vsize
    };
}

module.exports = {
    cache,
    cacheMiddleware,
    invalidateCache,
    clearAllCache,
    getCacheStats
};
