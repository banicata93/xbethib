const mongoose = require('mongoose');
const { getMatchOfTheDay, setMatchOfTheDay, getAllMatches, deleteMatch } = require('../functions/matchOfTheDay');

// MongoDB connection
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb && mongoose.connection.readyState === 1) {
        return cachedDb;
    }

    if (!process.env.MONGODB_URI) {
        console.warn('WARNING: MONGODB_URI is not set');
        return null;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        cachedDb = mongoose.connection;
        return cachedDb;
    } catch (error) {
        console.error('MongoDB Connection Error:', error);
        return null;
    }
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        await connectToDatabase();
        
        if (req.method === 'GET') {
            return await getMatchOfTheDay(req, res);
        } else if (req.method === 'POST') {
            return await setMatchOfTheDay(req, res);
        } else if (req.method === 'DELETE') {
            return await deleteMatch(req, res);
        } else {
            res.status(405).json({ message: 'Method not allowed' });
        }
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
