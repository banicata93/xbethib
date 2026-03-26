require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Admin schema (matching the auth.js implementation)
const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

const Admin = mongoose.model('Admin', adminSchema);

async function createAdmin() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
        });
        console.log('✅ Connected to MongoDB');

        // Get credentials from command line or use defaults
        const username = process.argv[2] || 'admin';
        const password = process.argv[3] || 'admin123';

        // Hash password with bcrypt (matching auth.js)
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) {
            console.log(`⚠️  Admin user "${username}" already exists!`);
            console.log('   Updating password...');
            existingAdmin.password = hashedPassword;
            await existingAdmin.save();
            console.log(`✅ Password updated for "${username}"`);
        } else {
            // Create new admin
            const admin = new Admin({ username, password: hashedPassword });
            await admin.save();
            console.log(`✅ Admin user created successfully!`);
        }

        console.log('\n📋 Admin Credentials:');
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${password}`);
        console.log('\n🔗 Login URL: https://xbethib-jhk7.vercel.app/login?admin-access=true');
        console.log('\n⚠️  IMPORTANT: Change the password after first login!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createAdmin();
