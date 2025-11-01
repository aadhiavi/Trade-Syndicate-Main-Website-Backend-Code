const express = require('express');
const {
    registerUser,
    loginUser,
    forgotPassword,
    resendOtp,
    resetPassword,
    getUser,
    verifyOtpRegistration,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/resend-otp', resendOtp);
router.post('/reset-password', resetPassword);
router.get('/user-profile', authenticate, getUser);
router.post('/verify-otp-registration', verifyOtpRegistration);

module.exports = router;