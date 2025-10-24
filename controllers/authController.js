const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateOtp } = require('../utils/otp');
const { sendOtpEmail, sendWelcomeEmail } = require('../config/mailer');
const User = require('../models/User');

// const adminCreateUser = async (req, res) => {
//     const { name, email, role } = req.body;

//     try {
//         const existingUser = await User.findOne({ email });
//         if (existingUser) return res.status(400).json({ message: 'User already exists' });

//         const tempPassword = '12345';
//         const hashedPassword = await bcrypt.hash(tempPassword, 12);

//         const user = new User({
//             name,
//             email,
//             password: hashedPassword,
//             role,
//             temporaryPassword: hashedPassword,
//             temporaryPasswordExpires: Date.now() + 7 * 24 * 60 * 60 * 1000
//         });

//         // Automatically set isVerified based on temporaryPassword field
//         user.isVerified = user.temporaryPassword ? false : true;

//         await user.save()
//         res.status(201).json({ message: 'User created successfully with temp password 12345' });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Server error' });
//     }
// };

const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        const otp = generateOtp();
        newUser.otp = otp;
        newUser.otpExpires = Date.now() + 600000;
        await newUser.save();
        await sendOtpEmail(email, otp)
        res.status(201).json({ message: 'Account created. Please verify your email with OTP.' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const verifyOtpRegistration = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || user.otp !== otp || Date.now() > user.otpExpires) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();
        res.status(200).json({ message: 'Email verified successfully' });
        sendWelcomeEmail(email, user.name);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (user.isBlocked) {
            return res.status(403).json({ message: 'Your account is blocked. Please contact HR.' });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (!user.isVerified) {
            return res.status(200).json({
                message: 'Email not verified',
                verified: false,
                requiresVerification: true,
                email: user.email,
            });
        }

        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '9h' }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            verified: true
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// const assignTemporaryPassword = async (req, res) => {
//     const { tradeId } = req.body;
//     try {
//         const user = await User.findOne({ tradeId });
//         if (!user) return res.status(404).json({ message: 'User not found' });

//         try {
//             await setTemporaryPassword(user);
//         } catch (err) {
//             console.error('Error in setTemporaryPassword:', err);
//             return res.status(500).json({ message: 'Failed to set temporary password' });
//         }

//         res.status(200).json({ message: 'Temporary password "12345" has been assigned. It will expire in 24 hours.' });
//     } catch (error) {
//         console.log('Error in assignTemporaryPassword:', error);
//         res.status(500).json({ message: 'Server error' });
//     }
// };

const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found' });
        const otp = generateOtp();
        user.otp = otp;
        user.otpExpires = Date.now() + 600000;
        await user.save();
        await sendOtpEmail(email, otp);
        res.status(200).json({ message: 'OTP sent to your email for password reset' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Resend OTP
const resendOtp = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found' });
        const otp = generateOtp();
        user.otp = otp;
        user.otpExpires = Date.now() + 600000;
        await user.save();
        await sendOtpEmail(email, otp);
        res.status(200).json({ message: 'OTP resent successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Reset Password
const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found' });

        if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
        if (user.otpExpires < Date.now()) return res.status(400).json({ message: 'OTP expired' });

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        user.password = hashedPassword;
        user.otp = null;
        user.otpExpires = null;
        await user.save();
        res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get User Profile
const getUser = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// const getAllUsers = async (req, res) => {
//     try {
//         const users = await User.find();
//         if (!users) {
//             return res.status(404).json({ message: 'No users found' });
//         }
//         res.status(200).json(users);
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// };

// const editUsers = async (req, res) => {
//     const { name, email, tradeId, role } = req.body;
//     const userId = req.params.id;
//     try {
//         const updatedUser = await User.findByIdAndUpdate(userId, { name, email, tradeId, role }, { new: true });
//         if (!updatedUser) {
//             return res.status(404).json({ message: 'User not found' });
//         }
//         res.status(200).json({ message: 'User updated successfully', updatedUser });
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// };

// const isBlockedUser = async (req, res) => {
//     const { id } = req.params;
//     const { isBlocked } = req.body;
//     try {
//         const updatedUser = await User.findByIdAndUpdate(
//             id,
//             { isBlocked },
//             { new: true }
//         );

//         if (!updatedUser) {
//             return res.status(404).json({ message: 'User not found' });
//         }

//         res.status(200).json({
//             message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully.`,
//             updatedUser,
//         });
//     } catch (error) {
//         console.error('Error updating block status:', error);
//         res.status(500).json({ message: 'Server error' });
//     }
// };

// Route: POST /admin/impersonate
// const adminImpersonate = async (req, res) => {
//     const { tradeId } = req.body;

//     try {
//         const user = await User.findOne({ tradeId });
//         if (!user) return res.status(404).json({ message: 'User not found' });
//         const token = jwt.sign(
//             { userId: user._id, role: user.role },
//             process.env.JWT_SECRET,
//             { expiresIn: '60m' }
//         );
//         res.status(200).json({ token });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Server error' });
//     }
// };

// const deleteUser = async (req, res) => {
//     const { id } = req.params;

//     try {
//         const user = await User.findByIdAndDelete(id);
//         if (!user) return res.status(404).json({ message: 'User not found' });

//         // Delete fixed salary records associated with the user
//         await SalaryFixed.deleteMany({ tradeId: user.tradeId });

//         res.status(200).json({ message: 'User and associated fixed salary deleted' });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Server error' });
//     }
// };



module.exports = {
    registerUser,
    loginUser,
    forgotPassword,
    resendOtp,
    resetPassword,
    getUser,
    verifyOtpRegistration,
};
