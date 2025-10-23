const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const generateOtp = () => {
    return crypto.randomBytes(3).toString('hex');
};

const sendOtp = (email, otp) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your OTP for Email Verification',
        text: `Your OTP is: ${otp}`
    };

    return transporter.sendMail(mailOptions);
};

const setTemporaryPassword = async (user) => {
    const tempPass = '12345';
    const hashed = await bcrypt.hash(tempPass, 12);
    user.temporaryPassword = hashed;
    user.temporaryPasswordExpires = Date.now() + 7 * 24 * 60 * 60 * 1000;

    try {
        await user.save();
    } catch (err) {
        console.error('Error saving user:', err);
        throw err;
    }
};


module.exports = { generateOtp, sendOtp, setTemporaryPassword };