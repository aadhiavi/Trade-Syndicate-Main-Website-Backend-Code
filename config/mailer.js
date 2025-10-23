const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Send OTP email
const sendOtpEmail = (toEmail, otp) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: toEmail,
        subject: 'Your OTP for Email Verification',
        text: `Your OTP is: ${otp}`,
    };

    return transporter.sendMail(mailOptions);
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