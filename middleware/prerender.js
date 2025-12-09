const Prediction = require('../models/prediction');
const MatchOfTheDay = require('../models/matchOfTheDay');

/**
 * Pre-render middleware for SEO
 * Injects server-side rendered content into HTML for search engines
 */
async function prerenderMiddleware(req, res, next) {
    // Only prerender for bots and crawlers
    const userAgent = req.headers['user-agent'] || '';
    const isBot = /bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest|slackbot|vkShare|W3C_Validator/i.test(userAgent);
    
    // Skip prerendering for non-bots or non-HTML requests
    if (!isBot || !req.accepts('html')) {
        return next();
    }
    
    // Only prerender main page
    if (req.path !== '/') {
        return next();
    }
    
    try {
        const fs = require('fs');
        const path = require('path');
        
        // Read the HTML template
        const htmlPath = path.join(__dirname, '../views/index.html');
        let html = fs.readFileSync(htmlPath, 'utf-8');
        
        // Fetch predictions from database
        const predictions = await Prediction.find()
            .sort({ matchDate: -1 })
            .limit(20);
        
        // Fetch Match of the Day
        const motd = await MatchOfTheDay.findOne()
            .sort({ matchDate: -1 });
        
        // Generate predictions HTML
        let predictionsHtml = '';
        predictions.forEach(prediction => {
            const statusBadge = prediction.result === 'win' ? '✅' : 
                               prediction.result === 'loss' ? '❌' : 
                               prediction.result === 'void' ? '⛔' : '';
            
            predictionsHtml += `
                <tr>
                    <td class="text-center"><span class="team-flag">${prediction.leagueFlag || '⚽'}</span></td>
                    <td class="team-cell">${prediction.homeTeam}</td>
                    <td class="team-cell">${prediction.awayTeam}</td>
                    <td class="prediction-cell"><strong>${prediction.prediction}</strong></td>
                    <td class="text-center">${statusBadge}</td>
                </tr>
            `;
        });
        
        // Inject predictions into HTML
        html = html.replace(
            '<!-- PREDICTIONS_START -->',
            `<!-- PREDICTIONS_START -->\n${predictionsHtml}\n<!-- Pre-rendered for SEO -->`
        );
        
        // Inject Match of the Day data if available
        if (motd) {
            html = html.replace('id="motd-home-name" class="team-name">Home Team</h3>', 
                              `id="motd-home-name" class="team-name">${motd.homeTeam}</h3>`);
            html = html.replace('id="motd-away-name" class="team-name">Away Team</h3>', 
                              `id="motd-away-name" class="team-name">${motd.awayTeam}</h3>`);
            html = html.replace('id="motd-prediction">Home Win</div>', 
                              `id="motd-prediction">${motd.prediction}</div>`);
            html = html.replace('id="motd-preview-text" class="preview-text">',
                              `id="motd-preview-text" class="preview-text">${motd.preview || ''}`);
        }
        
        // Add structured data for predictions
        const structuredData = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": predictions.slice(0, 10).map((pred, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                    "@type": "SportsEvent",
                    "name": `${pred.homeTeam} vs ${pred.awayTeam}`,
                    "description": pred.prediction,
                    "startDate": pred.matchDate
                }
            }))
        };
        
        // Inject structured data before closing head tag
        html = html.replace('</head>', 
            `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>\n</head>`);
        
        // Send pre-rendered HTML
        res.send(html);
        
    } catch (error) {
        console.error('Prerender error:', error);
        // Fall back to normal rendering
        next();
    }
}

module.exports = prerenderMiddleware;
