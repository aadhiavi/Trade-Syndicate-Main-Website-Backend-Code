const crypto = require('crypto');

const generateOtp = () => {
    return crypto.randomBytes(3).toString('hex');
};

module.exports = { generateOtp };