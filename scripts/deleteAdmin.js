require('dotenv').config();
const mongoose = require('mongoose');

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

async function deleteAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');

        const username = process.argv[2] || 'admin';
        
        const result = await Admin.deleteOne({ username });
        
        if (result.deletedCount > 0) {
            console.log(`✅ Admin user "${username}" deleted successfully!`);
        } else {
            console.log(`⚠️  Admin user "${username}" not found!`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

deleteAdmin();
