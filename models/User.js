const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/\S+@\S+\.\S+/, 'Please provide a valid email address']
    },
    password: { type: String, required: true },
    profilePic: {
        type: String,
        default: null
    },
    profilePicId: {
        type: String,
        default: null
    },

    isVerified: { type: Boolean, default: false },
    otp: String,
    otpExpires: Date,

    role: {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        default: 'user'
    },

    isBlocked: {
        type: Boolean,
        default: false
    }
});

const User = mongoose.model('User', UserSchema);
module.exports = User;