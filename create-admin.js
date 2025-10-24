const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();
const Admin = require('./models/admin');

async function createAdmin() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ username: 'admin' });
        if (existingAdmin) {
            console.log('Admin user already exists');
            process.exit(0);
        }

        // Hash password using crypto
        const hashedPassword = crypto.createHash('sha256').update('admin123' + process.env.JWT_SECRET).digest('hex');

        // Create admin user
        const admin = new Admin({
            username: 'admin',
            password: hashedPassword
        });

        await admin.save();
        console.log('Admin user created successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
}

createAdmin();
