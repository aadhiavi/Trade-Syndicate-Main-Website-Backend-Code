const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

transporter.verify((error, success) => {
    if (error) {
        console.error("❌ SMTP Connection Error:", error);
    } else {
        console.log("✅ SMTP Server is ready to send messages");
    }
});

// Send OTP email
const sendOtpEmail = async (toEmail, otp) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: toEmail,
        subject: 'Your OTP for Email Verification',
        text: `Your OTP is: ${otp}`,
    };
    try {
        const result = await transporter.sendMail(mailOptions);
        return result;
    } catch (error) {
        console.error("❌ Email send failed:", error.message);
        throw error;
    }
};


// Send created account email
const sendWelcomeEmail = (toEmail, name) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: toEmail,
        subject: 'Welcome to Trade Syndicate',
        text: `Dear ${name},\n\nYour Trade Syndicate account has been created successfully.\n\nThank you for joining the Trade Syndicate family!\n\nBest regards,\nThe Trade Syndicate Team`,
    };
    return transporter.sendMail(mailOptions);
};

const sendSubscribeEmail = (toEmail) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: toEmail,
        subject: 'Thank you for subscribing!',
        text: `Dear user,\n\nThank you for subscribing to our service. We're thrilled to have you on board!\n\nYou'll now receive our latest updates, newsletters, and more. Stay tuned!\n\nBest regards,\nThe Team`,
    };
    return transporter.sendMail(mailOptions);
};


module.exports = { sendOtpEmail, sendWelcomeEmail, sendSubscribeEmail };
