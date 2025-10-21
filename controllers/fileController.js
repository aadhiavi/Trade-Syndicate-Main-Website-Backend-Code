const express = require('express');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Folder = require('../models/Folder');
const File = require('../models/File');
const RecentFile = require('../models/RecentFile');
const { isAdmin, authenticate } = require('../middleware/auth');

const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext);
        cb(null, base + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ storage });

function formatBytes(bytes) {
    const GB = 1e9;
    const MB = 1e6;
    const KB = 1e3;

    if (bytes >= GB) return (bytes / GB).toFixed(2) + ' GB';
    if (bytes >= MB) return (bytes / MB).toFixed(2) + ' MB';
    if (bytes >= KB) return (bytes / KB).toFixed(2) + ' KB';
    return bytes + ' B';
}

router.post('/upload', authenticate, isAdmin, upload.array('files'), async (req, res) => {
    try {
        const { folderId } = req.body;
        const userId = req.user.userId;
        const MAX_STORAGE_BYTES = 30 * 1000 * 1000 * 1000; // 30 GB

        // 1. Check if folder exists (if folderId is provided)
        let folder = null;
        if (folderId) {
            folder = await Folder.findOne({ _id: folderId, userId });
            if (!folder) {
                return res.status(400).json({ success: false, message: 'Folder not found or access denied' });
            }
        }

        // 2. Get current total storage used
        const agg = await File.aggregate([
            { $match: { userId: req.user.userId, isTrashed: false } },
            { $group: { _id: null, totalSize: { $sum: "$size" } } }
        ]);
        const currentTotalSize = agg.length > 0 ? agg[0].totalSize : 0;

        // 3. Sum the size of newly uploaded files
        const newFilesSize = req.files.reduce((sum, file) => sum + file.size, 0);
        const totalAfterUpload = currentTotalSize + newFilesSize;

        // 4. If over limit, delete uploaded files and reject
        if (totalAfterUpload > MAX_STORAGE_BYTES) {
            // Cleanup: delete all uploaded files from disk
            for (const file of req.files) {
                fs.unlinkSync(file.path);
            }

            return res.status(400).json({
                success: false,
                message: `Upload would exceed your 30GB storage limit. Current: ${(currentTotalSize / 1e9).toFixed(2)} GB, Attempted: ${(newFilesSize / 1e9).toFixed(2)} GB`
            });
        }

        // 5. Prepare file metadata for DB
        const filesData = req.files.map(file => ({
            originalName: file.originalname,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size,
            folderId: folder ? folder._id : null,
            userId
        }));

        // 6. Save to DB
        const files = await File.insertMany(filesData);

        res.json({ success: true, files });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.get('/', authenticate, isAdmin, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { folderId } = req.query;

        const filter = { userId };
        if (folderId) {
            filter.folderId = folderId;
        } else {
            filter.folderId = null;
        }

        const files = await File.find({ userId: userId, folderId: folderId || null });
        res.json({ success: true, files });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.get('/storage-usage', authenticate, isAdmin, async (req, res) => {
    try {
        const userId = req.user.userId;
        const MAX_STORAGE_BYTES = 30 * 1000 * 1000 * 1000; // 30 GB
        if (!req.user?.userId) {
            return res.status(400).json({ success: false, message: 'User ID not found in request' });
        }
        // Step 1: Fetch all folders for the user
        const allFolders = await Folder.find({ userId });

        // Step 2: Recursively collect all descendant folder IDs
        const getAllDescendantFolderIds = (parentId = null) => {
            let descendants = [];

            const directChildren = allFolders.filter(folder => {
                return String(folder.parent) === String(parentId);
            });

            for (const child of directChildren) {
                descendants.push(child._id); // already ObjectId
                descendants = descendants.concat(getAllDescendantFolderIds(child._id));
            }

            return descendants;
        };

        const allFolderIds = getAllDescendantFolderIds();
        allFolderIds.push(null); // Include files not in any folder (root-level)

        console.log("Collected folder IDs:", allFolderIds);

        // Step 3: Fetch all matching files
        const files = await File.find({
            userId: new ObjectId(userId),
            isTrashed: false,
            folderId: { $in: allFolderIds }
        });

        console.log(`Matched ${files.length} files.`);

        // Step 4: Calculate total used size
        const totalUsed = files.reduce((sum, file) => sum + file.size, 0);
        const remainingStorage = MAX_STORAGE_BYTES - totalUsed;

        res.json({
            success: true,
            storage: {
                totalUsed,
                totalUsedFormatted: formatBytes(totalUsed),
                maxStorage: MAX_STORAGE_BYTES,
                maxStorageFormatted: formatBytes(MAX_STORAGE_BYTES),
                remainingStorage,
                remainingStorageFormatted: formatBytes(remainingStorage)
            }
        });
    } catch (err) {
        console.error("Storage usage error:", err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.get('/direct-files', authenticate, isAdmin, async (req, res) => {
    try {
        const userId = req.user.userId;
        const unassignedFiles = await File.find({ folderId: null, userId }).sort({ uploadDate: -1 });

        res.json({
            success: true,
            files: unassignedFiles
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/recent', authenticate, isAdmin, async (req, res) => {
    try {
        const { fileId } = req.body;
        const userId = req.user.userId;

        console.log('Tracking recent file:', { fileId, userId });

        if (!fileId) {
            return res.status(400).json({ success: false, message: 'Missing fileId' });
        }

        // Upsert the current file as recent
        await RecentFile.findOneAndUpdate(
            { userId, fileId },
            { accessedAt: new Date() },
            { upsert: true, new: true }
        );

        // Get all recent files for the user, sorted by last accessed
        const recentFiles = await RecentFile.find({ userId })
            .sort({ accessedAt: -1 })
            .skip(5); // keep first 5, delete rest

        const idsToDelete = recentFiles.map(file => file._id);

        if (idsToDelete.length > 0) {
            await RecentFile.deleteMany({ _id: { $in: idsToDelete } });
            console.log(`Deleted ${idsToDelete.length} old recent files`);
        }

        res.json({ success: true });

    } catch (err) {
        console.error('Error tracking recent file:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.get('/recent', authenticate, isAdmin, async (req, res) => {
    try {
        const userId = req.user.userId;

        const recent = await RecentFile.find({ userId })
            .sort({ accessedAt: -1 })
            .limit(5)
            .populate('fileId');

        const files = recent
            .map(r => r.fileId)
            .filter(f => f !== null)
            .map(f => ({
                id: f._id,
                originalName: f.originalName,
                filename: f.filename,
                mimetype: f.mimetype,
                size: f.size,
                uploadDate: f.uploadDate,
            }));

        res.json({ success: true, files });
    } catch (err) {
        console.error('Error fetching recent files:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.get('/download/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const file = await File.findById(fileId);

        if (!file) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        const filePath = path.join(uploadDir, file.filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'File not found on server' });
        }

        res.download(filePath, file.originalName);

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.put('/move/:fileId', authenticate, isAdmin, async (req, res) => {
    try {
        const { fileId } = req.params;
        const { destinationFolderId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(fileId) ||
            (destinationFolderId && !mongoose.Types.ObjectId.isValid(destinationFolderId))) {
            return res.status(400).json({ success: false, message: 'Invalid ID provided' });
        }

        // Find the file and ensure it belongs to the authenticated user
        const file = await File.findById(fileId);
        if (!file) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        // Optional: Check file ownership if your File model has userId
        if (file.userId.toString() !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized to move this file' });
        }

        let folder = null;
        if (destinationFolderId) {
            folder = await Folder.findById(destinationFolderId);
            if (!folder) {
                return res.status(400).json({ success: false, message: 'Destination folder not found' });
            }

            // Optional: Check folder ownership
            if (folder.userId.toString() !== req.user.userId) {
                return res.status(403).json({ success: false, message: 'Unauthorized to move file to this folder' });
            }
        }

        file.folderId = folder ? folder._id : null;
        await file.save();

        res.json({ success: true, message: 'File moved successfully', file });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.put('/rename/:fileId', authenticate, isAdmin, async (req, res) => {
    try {
        const { fileId } = req.params;
        const { newName } = req.body;

        if (!newName) {
            return res.status(400).json({ success: false, message: 'New name is required' });
        }

        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            return res.status(400).json({ success: false, message: 'Invalid file ID' });
        }

        const file = await File.findById(fileId);
        if (!file) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        // Check file ownership
        if (file.userId.toString() !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized to rename this file' });
        }

        const oldPath = path.join(uploadDir, file.filename);
        const ext = path.extname(file.filename); // Keep original extension

        // Remove extension from newName if provided, we'll add it back
        const baseNewName = path.basename(newName, ext);
        const timestamp = Date.now();
        const newFilename = `${baseNewName}-${timestamp}${ext}`;
        const newPath = path.join(uploadDir, newFilename);

        // Rename the file on disk
        fs.renameSync(oldPath, newPath);

        // Update DB
        file.filename = newFilename;
        // Ensure originalName has the extension
        file.originalName = newName.endsWith(ext) ? newName : newName + ext;
        await file.save();

        res.json({ success: true, message: 'File renamed successfully', file });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.delete('/:fileId', authenticate, isAdmin, async (req, res) => {
    try {
        const { fileId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            return res.status(400).json({ success: false, message: 'Invalid file ID' });
        }

        const file = await File.findById(fileId);
        if (!file) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        // Authorization: check if file belongs to the authenticated user
        if (file.userId.toString() !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized to delete this file' });
        }

        const filePath = path.join(uploadDir, file.filename);

        // Delete file from disk
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete file from DB
        await file.deleteOne();

        res.json({ success: true, message: 'File deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/copy/:fileId', authenticate, isAdmin, async (req, res) => {
    try {
        const { fileId } = req.params;
        const { destinationFolderId } = req.body;
        const userId = req.user.userId;

        // Find the original file
        const originalFile = await File.findById(fileId);
        if (!originalFile) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        // Authorization: check if the file belongs to the user
        if (originalFile.userId.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized to copy this file' });
        }

        // Check destination folder (optional)
        let folder = null;
        if (destinationFolderId) {
            folder = await Folder.findById(destinationFolderId);
            if (!folder) {
                return res.status(400).json({ success: false, message: 'Destination folder not found' });
            }
            // Optionally: verify folder belongs to user (if applicable)
            if (folder.userId.toString() !== userId) {
                return res.status(403).json({ success: false, message: 'Unauthorized destination folder' });
            }
        }

        const sourcePath = path.join(uploadDir, originalFile.filename);
        const ext = path.extname(originalFile.filename);
        const base = path.basename(originalFile.originalName, ext);
        const newFilename = `${base}-copy-${Date.now()}${ext}`;
        const destPath = path.join(uploadDir, newFilename);

        // Copy file on disk
        fs.copyFileSync(sourcePath, destPath);

        // Create new File document (assign to current user)
        const newFile = await File.create({
            originalName: `${base}-copy${ext}`,
            filename: newFilename,
            mimetype: originalFile.mimetype,
            size: originalFile.size,
            folderId: folder ? folder._id : null,
            userId // assign ownership to current user
        });

        res.json({ success: true, message: 'File copied successfully', file: newFile });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


module.exports = router;
