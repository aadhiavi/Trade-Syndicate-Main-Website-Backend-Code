const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
};

const isModerator = (req, res, next) => {
    if (req.user && (req.user.role === 'moderator' || req.user.role === 'admin')) {
        next();
    } else {
        return res.status(403).json({ message: 'Access denied. Moderators only.' });
    }
};


module.exports = { authenticate, isAdmin, isModerator };