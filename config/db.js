const mongoose = require('mongoose');

const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) {
        return mongoose.connection;
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MongoDB connection error: MONGODB_URI environment variable is not set');
        return null;
    }

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        console.log('MongoDB connected successfully');
        return mongoose.connection;
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        return null;
    }
};

module.exports = connectDB;