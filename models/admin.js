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

// Note: Password hashing is handled in auth.js using crypto.createHash('sha256')
// This keeps the model simple and consistent with the authentication logic

module.exports = mongoose.model('Admin', adminSchema);
