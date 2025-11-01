const express = require('express');
const Subscribe = require('../models/Subscribe');
const { generateOtp } = require('../utils/otp');
const { sendOtpEmail, sendSubscribeEmail } = require('../config/emailService');
const router = express.Router();

router.post('/subscribe', async (req, res) => {
  const { email } = req.body;

  try {
    let subscriber = await Subscribe.findOne({ email });

    if (subscriber && subscriber.isVerified) {
      return res.status(400).json({ message: 'This email is already subscribed!' });
    }

    const otp = generateOtp();

    if (!subscriber) {
      subscriber = new Subscribe({ email });
    }

    subscriber.otp = otp;
    subscriber.otpExpires = Date.now() + 10 * 60 * 1000;
    subscriber.isVerified = false;

    await subscriber.save();

    sendOtpEmail(email, otp);

    res.status(200).json({ message: 'OTP sent to your email!' });
  } catch (error) {
    res.status(500).json({ message: 'Error saving subscription or sending OTP', error: error.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    const subscriber = await Subscribe.findOne({ email });
    if (!subscriber) return res.status(400).json({ message: 'Subscriber not found' });

    if (subscriber.isVerified) {
      return res.status(400).json({ message: 'Already verified' });
    }

    if (!subscriber.otp || subscriber.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'OTP expired or invalid' });
    }

    if (subscriber.otp !== otp) {
      return res.status(400).json({ message: 'Incorrect OTP' });
    }

    subscriber.isVerified = true;
    subscriber.otp = undefined;
    subscriber.otpExpires = undefined;
    await subscriber.save();

    sendSubscribeEmail(email);

    res.status(200).json({ message: 'Subscription verified! Welcome email sent.' });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying OTP', error: error.message });
  }
});

router.get('/subscribe', async (req, res) => {
  try {
    const subscriptions = await Subscribe.find();
    res.status(200).json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subscriptions', error });
  }
});

module.exports = router;



