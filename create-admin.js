require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/admin');

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('Connected to MongoDB');

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ username: 'admin' });
        if (existingAdmin) {
            console.log('Admin user already exists');
            return;
        }

        // Create admin user
        const admin = new Admin({
            username: 'admin',
            password: 'admin123'  // Will be hashed by the pre-save hook
        });

        await admin.save();
        console.log('Admin user created successfully');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

// Only run if this file is run directly
if (require.main === module) {
    createAdmin();
}

module.exports = createAdmin;