const express = require('express');
const Subscribe = require('../models/Subscribe');
const { generateOtp } = require('../utils/otp');
const { sendOtpEmail, sendSubscribeEmail } = require('../config/emailService');
const router = express.Router();
require('dotenv').config();

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

    await sendOtpEmail(email, otp);
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
      await sendSubscribeEmail(email);

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

