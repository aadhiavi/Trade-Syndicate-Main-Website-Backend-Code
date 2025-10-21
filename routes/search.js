const express = require('express');
const File = require('../models/File');
const Folder = require('../models/Folder');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ success: false, message: 'Search query missing' });
        }

        const keyword = new RegExp(q, 'i'); // Case-insensitive match

        // Search files by user and keyword
        const files = await File.find({
            userId,
            $or: [
                { originalName: keyword },
                { filename: keyword }
            ]
        })
            .sort({ uploadDate: -1 })
            .lean();

        // Search folders by user and keyword
        const folders = await Folder.find({
            userId,
            name: keyword
        })
            .sort({ createdAt: -1 })
            .lean();

        // Tag each with type
        const typedFiles = files.map(file => ({ ...file, type: 'file' }));
        const typedFolders = folders.map(folder => ({ ...folder, type: 'folder' }));

        // Combine results
        const results = [...typedFolders, ...typedFiles];

        res.json({ success: true, results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


module.exports = router;

