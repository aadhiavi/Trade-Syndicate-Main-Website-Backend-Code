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

// Send created account email for Google users
const sendWelcomeEmailGoogle = (toEmail, displayName) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: toEmail,
        subject: 'Welcome to Trade Syndicate',
        text: `Dear ${displayName},\n\nYour Trade Syndicate account has been created successfully. Thank you for joining the Trade Syndicate family!\n\nBest regards,\nThe Trade Syndicate Team`,
    };
    console.log(mailOptions);
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

const sendEmployeeEmail = (toEmail, name) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: toEmail,
        subject: 'Registration Confirmation',
        text: `Dear ${name},\n\nWe are pleased to confirm that your registration was successful with Trade Syndicate.\n\nName: ${name}\n\nThank you for registering with us. If you have any questions or need further assistance, please do not hesitate to contact us.\n\nBest regards,\nTrade Syndicate`
    };
    return transporter.sendMail(mailOptions)
}

const sendBirthdayWish = (toEmail, name, formattedDob) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: toEmail,
        subject: 'Birthday Reminder',
        text: `Happy Birthday ${name}!\n\nWe hope you have a wonderful day today, ${formattedDob}\n\nFrom\nTrade Syndicate.`
    }
    return transporter.sendMail(mailOptions)
}

const notifyAdmin = (subject, text) => {
    const adminEmails = process.env.ADMIN_EMAIL?.split(',').map(email => email.trim());
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: adminEmails,
        subject,
        text,
    };

    return transporter.sendMail(mailOptions);
};


module.exports = { sendOtpEmail, sendWelcomeEmail, sendCreateAlerEmail, sendWelcomeEmailGoogle, sendSubscribeEmail, sendEmployeeEmail, sendBirthdayWish, notifyAdmin };