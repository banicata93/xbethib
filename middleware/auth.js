const jwt = require('jsonwebtoken');

/**
 * Authentication Middleware
 * Verifies JWT token and adds user to request
 */
const auth = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                message: 'Authentication required',
                error: 'No token provided'
            });
        }

        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
            console.error('JWT_SECRET is not set in environment variables');
            return res.status(500).json({ 
                message: 'Server configuration error' 
            });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            return res.status(401).json({ 
                message: 'Invalid or expired token',
                error: error.message
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ 
            message: 'Server error during authentication' 
        });
    }
};

module.exports = auth;
