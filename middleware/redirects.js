/**
 * Middleware for handling redirects
 * - WWW to non-WWW redirect
 * - Trailing slash normalization
 * - HTTP to HTTPS redirect (in production)
 */

function wwwRedirect(req, res, next) {
    const host = req.headers.host;
    
    // Redirect www to non-www
    if (host && host.startsWith('www.')) {
        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const newHost = host.replace('www.', '');
        return res.redirect(301, `${protocol}://${newHost}${req.originalUrl}`);
    }
    
    next();
}

function httpsRedirect(req, res, next) {
    // Only in production
    if (process.env.NODE_ENV === 'production') {
        // Check if request is not secure
        if (!req.secure && req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
        }
    }
    
    next();
}

function trailingSlashRedirect(req, res, next) {
    // Remove trailing slash except for root
    if (req.path !== '/' && req.path.endsWith('/')) {
        const query = req.url.slice(req.path.length);
        return res.redirect(301, req.path.slice(0, -1) + query);
    }
    
    next();
}

module.exports = {
    wwwRedirect,
    httpsRedirect,
    trailingSlashRedirect
};
