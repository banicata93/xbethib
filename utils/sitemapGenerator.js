const Prediction = require('../models/prediction');
const MatchOfTheDay = require('../models/matchOfTheDay');

/**
 * Generate dynamic sitemap XML
 * Includes static pages and dynamic content from database
 */
async function generateSitemap() {
    const baseUrl = 'https://xbethub.com';
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Static pages
    const staticPages = [
        { url: '/', priority: '1.0', changefreq: 'daily' },
        { url: '/analytics', priority: '0.7', changefreq: 'weekly' },
        { url: '/bot-analysis', priority: '0.7', changefreq: 'weekly' }
    ];
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
`;

    // Add static pages
    staticPages.forEach(page => {
        xml += `
    <url>
        <loc>${baseUrl}${page.url}</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>${page.changefreq}</changefreq>
        <priority>${page.priority}</priority>
    </url>`;
    });

    try {
        // Add dynamic prediction pages grouped by league
        const predictions = await Prediction.find({ 
            matchDate: { $gte: new Date() } 
        }).select('leagueFlag matchDate').limit(100);
        
        // Group by league for better SEO structure
        const leagues = [...new Set(predictions.map(p => p.leagueFlag))];
        leagues.forEach(league => {
            if (league) {
                xml += `
    <url>
        <loc>${baseUrl}/predictions/${encodeURIComponent(league)}</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
    </url>`;
            }
        });

        // Add Match of the Day archive
        const motdEntries = await MatchOfTheDay.find()
            .sort({ matchDate: -1 })
            .limit(30)
            .select('matchDate');
        
        motdEntries.forEach(entry => {
            const date = new Date(entry.matchDate).toISOString().split('T')[0];
            xml += `
    <url>
        <loc>${baseUrl}/match-of-the-day/${date}</loc>
        <lastmod>${date}</lastmod>
        <changefreq>never</changefreq>
        <priority>0.6</priority>
    </url>`;
        });

    } catch (error) {
        console.error('Error generating dynamic sitemap entries:', error);
        // Continue with static pages only
    }

    xml += `
</urlset>`;

    return xml;
}

module.exports = { generateSitemap };
