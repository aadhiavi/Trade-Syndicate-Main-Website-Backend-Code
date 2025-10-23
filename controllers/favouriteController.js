const mongoose = require('mongoose');
const express = require('express');
const Folder = require('../models/Folder');
const File = require('../models/File');
const { authenticate, isAdmin } = require('../middleware/auth');
const router = express.Router();

// POST /api/add-folder/favorite/:id
router.post('/add-folder/favorite/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const folderId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(folderId)) {
            return res.status(400).json({ success: false, message: 'Invalid folder ID' });
        }

        const folder = await Folder.findById(folderId);
        if (!folder) {
            return res.status(404).json({ success: false, message: 'Folder not found' });
        }

        if (folder.userId.toString() !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (folder.isFavorite) {
            return res.status(400).json({ success: false, message: 'Folder is already a favorite' });
        }

        folder.isFavorite = true;
        await folder.save();

        res.json({ success: true, message: 'Folder added to favorites', folder });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/add-file/favorite/:id
router.post('/add-file/favorite/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const fileId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            return res.status(400).json({ success: false, message: 'Invalid file ID' });
        }

        const file = await File.findById(fileId);
        if (!file) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        // Check if the file belongs to the authenticated user
        if (file.userId.toString() !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (file.isFavorite) {
            return res.status(400).json({ success: false, message: 'File is already a favorite' });
        }

        file.isFavorite = true;
        await file.save();

        res.json({ success: true, message: 'File added to favorites', file });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// DELETE /api/delete-folder/favorite/:id
router.delete('/delete-folder/favorite/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const folderId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(folderId)) {
            return res.status(400).json({ success: false, message: 'Invalid folder ID' });
        }

        const folder = await Folder.findById(folderId);
        if (!folder) {
            return res.status(404).json({ success: false, message: 'Folder not found' });
        }

        // Check folder ownership
        if (folder.userId.toString() !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (!folder.isFavorite) {
            return res.status(400).json({ success: false, message: 'Folder is not marked as favorite' });
        }

        folder.isFavorite = false;
        await folder.save();

        res.json({ success: true, message: 'Folder removed from favorites', folder });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// DELETE /api/delete-file/favorite/:id
router.delete('/delete-file/favorite/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const fileId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            return res.status(400).json({ success: false, message: 'Invalid file ID' });
        }

        const file = await File.findById(fileId);
        if (!file) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        // Check file ownership
        if (file.userId.toString() !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (!file.isFavorite) {
            return res.status(400).json({ success: false, message: 'File is not marked as favorite' });
        }

        file.isFavorite = false;
        await file.save();

        res.json({ success: true, message: 'File removed from favorites', file });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/folder/favorites
router.get('/folder/favorites', authenticate, isAdmin, async (req, res) => {
    try {
        const userId = req.user.userId;
        const favoriteFolders = await Folder.find({ userId, isFavorite: true }).sort({ name: 1 });
        res.json({ success: true, favorites: favoriteFolders });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/file/favorites
router.get('/file/favorites', authenticate, isAdmin, async (req, res) => {
    try {
        const userId = req.user.userId;
        const favoriteFiles = await File.find({ userId, isFavorite: true }).sort({ originalName: 1 });
        res.json({ success: true, favorites: favoriteFiles });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


module.exports = router;