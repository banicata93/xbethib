const mongoose = require('mongoose');
const Admin = require('./models/admin');
require('dotenv').config();

mongoose.connect('mongodb://127.0.0.1:27017/xbethub', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

async function deleteAdmin() {
    try {
        await Admin.deleteOne({ username: 'admin' });
        console.log('Admin account deleted successfully!');
    } catch (error) {
        console.error('Error deleting admin:', error);
    } finally {
        mongoose.connection.close();
    }
}

deleteAdmin();
