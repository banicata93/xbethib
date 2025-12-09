const express = require('express');
const router = express.Router();
const { generateSitemap } = require('../utils/sitemapGenerator');
const NodeCache = require('node-cache');

// Cache sitemap for 1 hour
const sitemapCache = new NodeCache({ stdTTL: 3600 });

router.get('/', async (req, res) => {
    try {
        // Check cache first
        let sitemap = sitemapCache.get('sitemap');
        
        if (!sitemap) {
            // Generate new sitemap
            sitemap = await generateSitemap();
            sitemapCache.set('sitemap', sitemap);
        }
        
        res.header('Content-Type', 'application/xml');
        res.send(sitemap);
    } catch (error) {
        console.error('Error serving sitemap:', error);
        res.status(500).send('Error generating sitemap');
    }
});

module.exports = router;
