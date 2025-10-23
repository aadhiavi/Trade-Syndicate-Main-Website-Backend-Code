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
// router.get('/all-users', getAllUsers);
// router.put('/edit-user/:id', editUsers);
// router.patch('/users/:id/block', isBlockedUser);
router.post('/verify-otp-registration', verifyOtpRegistration);
// router.post('/admin-create-user', authenticate, isAdmin, adminCreateUser);
// router.post('/assign-temporary-password', authenticate, isAdmin, assignTemporaryPassword);
// router.post('/admin/impersonate', authenticate, isAdmin, adminImpersonate);

module.exports = router;