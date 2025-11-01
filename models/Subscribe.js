const mongoose = require('mongoose');

const subscribeSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    otp: { type: String },
    otpExpires: { type: Date },
    isVerified: { type: Boolean, default: false },
}, { timestamps: true });

const Subscribe = mongoose.model('Subscribe', subscribeSchema);
module.exports = Subscribe;

