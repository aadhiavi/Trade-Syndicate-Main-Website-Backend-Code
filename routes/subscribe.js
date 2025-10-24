const express = require('express');
const Subscribe = require('../models/Subscribe');
const nodemailer = require('nodemailer');
const router = express.Router();
require('dotenv').config();

const transporter = nodemailer.createTransport({
  // host: "smtp.gmail.com",
  // port: 465,
  // secure: true,
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

let otpStore = {};
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP to email
const sendOtpToEmail = (email, otp) => {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: 'Your OTP for Registration',
    text: `Your OTP is: ${otp}`,
  };

  return transporter.sendMail(mailOptions);
};

// Send welcome message
const sendWelcomeMessage = (email) => {
  const mailOptions = {
    from: 'Trade Syndicate <no-reply@tradesyndicate.com>',
    to: email,
    subject: 'Welcome to Trade Syndicate!',
    text: `Dear Subscriber,\n\nThank you for subscribing to Trade Syndicate! We are excited to have you with us.\n\nStay tuned for updates, offers, and more.\n\nBest Regards,\nThe Trade Syndicate Team`,
  };

  return transporter.sendMail(mailOptions);
};

// Route for subscribing and sending OTP
router.post('/subscribe', async (req, res) => {
  const { email } = req.body;

  try {
    const existingSubscription = await Subscribe.findOne({ email });

    if (existingSubscription) {
      return res.status(400).json({ message: 'This email is already subscribed!' });
    }

    const otp = generateOtp();

    const newSubscribe = new Subscribe({ email });
    await newSubscribe.save();

    await sendOtpToEmail(email, otp);
    otpStore[email] = otp;

    res.status(200).json({ message: 'Email saved, OTP sent!' });
  } catch (error) {
    res.status(500).json({ message: 'Error saving contact or sending OTP', error: error.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (otpStore[email] === otp) {
    delete otpStore[email];

    try {
      await sendWelcomeMessage(email);

      res.status(200).json({ message: 'OTP verified, subscription successful! A welcome message has been sent.' });
    } catch (error) {
      res.status(500).json({ message: 'Error sending welcome message', error: error.message });
    }
  } else {
    res.status(400).json({ message: 'Invalid OTP' });
  }
});

router.get('/subscribe', async (req, res) => {
  try {
    const subscriptions = await Subscribe.find();
    res.status(200).json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subscriptions', error });
  }
}
)

module.exports = router;

