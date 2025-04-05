const mongoose = require('mongoose');
const Admin = require('./models/admin');
require('dotenv').config();

mongoose.connect('mongodb://127.0.0.1:27017/xbethub', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

async function createAdmin() {
    try {
        // Първо проверяваме дали вече съществува админ
        const existingAdmin = await Admin.findOne({ username: 'admin' });
        if (existingAdmin) {
            console.log('Admin account already exists!');
            mongoose.connection.close();
            return;
        }

        const admin = new Admin({
            username: 'admin',
            password: 'admin123'
        });
        
        await admin.save();
        console.log('Admin account created successfully!');
        console.log('Username: admin');
        console.log('Password: admin123');
    } catch (error) {
        console.error('Error creating admin:', error);
    } finally {
        mongoose.connection.close();
    }
}

createAdmin(); 