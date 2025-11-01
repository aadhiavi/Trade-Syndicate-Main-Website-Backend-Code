const express = require('express');
const File = require('../models/File');
const Folder = require('../models/Folder');
const { authenticate, isAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticate, isAdmin, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ success: false, message: 'Search query missing' });
        }
        const keyword = new RegExp(q, 'i');
        const files = await File.find({
            userId,
            $or: [
                { originalName: keyword },
                { filename: keyword }
            ]
        })
            .sort({ uploadDate: -1 })
            .lean();
        const folders = await Folder.find({
            userId,
            name: keyword
        })
            .sort({ createdAt: -1 })
            .lean();
        const typedFiles = files.map(file => ({ ...file, type: 'file' }));
        const typedFolders = folders.map(folder => ({ ...folder, type: 'folder' }));
        const results = [...typedFolders, ...typedFiles];

        res.json({ success: true, results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;

