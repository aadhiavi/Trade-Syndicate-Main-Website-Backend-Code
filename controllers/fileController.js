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
const drive = require('../config/driveClient');

const upload = multer({ dest: 'uploads/' });

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
        const MAX_STORAGE_BYTES = 30 * 1000 * 1000 * 1000; // 30GB

        // Validate folder
        let folder = null;
        if (folderId) {
            folder = await Folder.findOne({ _id: folderId, userId });
            if (!folder) {
                return res.status(400).json({ success: false, message: 'Folder not found or access denied' });
            }
        }

        // Check total used storage
        const agg = await File.aggregate([
            { $match: { userId, isTrashed: false } },
            { $group: { _id: null, totalSize: { $sum: '$size' } } },
        ]);
        const currentTotalSize = agg.length ? agg[0].totalSize : 0;
        const newFilesSize = req.files.reduce((sum, f) => sum + f.size, 0);
        const totalAfterUpload = currentTotalSize + newFilesSize;

        if (totalAfterUpload > MAX_STORAGE_BYTES) {
            for (const f of req.files) fs.unlinkSync(f.path);
            return res.status(400).json({
                success: false,
                message: `Upload would exceed 30 GB limit. Current: ${(currentTotalSize / 1e9).toFixed(2)} GB`,
            });
        }

        // Upload to Drive
        const uploadedFiles = [];
        for (const file of req.files) {
            const fileMetadata = {
                name: file.originalname,
                appProperties: { userId }, // 👈 attach userId metadata
            };
            const media = { mimeType: file.mimetype, body: fs.createReadStream(file.path) };

            const driveResponse = await drive.files.create({
                resource: fileMetadata,
                media,
                fields: 'id, name, mimeType, webViewLink, webContentLink',
            });

            // Make file public
            await drive.permissions.create({
                fileId: driveResponse.data.id,
                requestBody: { role: 'reader', type: 'anyone' },
            });

            fs.unlinkSync(file.path);

            uploadedFiles.push({
                originalName: file.originalname,
                filename: driveResponse.data.id,
                mimetype: file.mimetype,
                size: file.size,
                folderId: folder ? folder._id : null,
                userId,
                driveFileId: driveResponse.data.id,
                driveViewLink: `https://drive.google.com/file/d/${driveResponse.data.id}/view?usp=drivesdk`,
                driveDownloadLink: driveResponse.data.webContentLink,
            });
        }

        const files = await File.insertMany(uploadedFiles);

        res.json({ success: true, message: 'Files uploaded to Google Drive', files });
    } catch (err) {
        console.error('❌ Upload error:', err);
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
        await RecentFile.findOneAndUpdate(
            { userId, fileId },
            { accessedAt: new Date() },
            { upsert: true, new: true }
        );
        const recentFiles = await RecentFile.find({ userId })
            .sort({ accessedAt: -1 })
            .skip(5);

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
                _id: f._id,
                originalName: f.originalName,
                filename: f.filename,
                mimetype: f.mimetype,
                size: f.size,
                uploadDate: f.uploadDate,
                driveViewLink: f.driveViewLink,
                driveDownloadLink: f.driveDownloadLink,
                isFavorite: f.isFavorite || false,
                folderId: f.folderId || null
            }));
        res.json({ success: true, files });
    } catch (err) {
        console.error('Error fetching recent files:', err);
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

        if (!newName) return res.status(400).json({ success: false, message: 'New name required' });

        const file = await File.findById(fileId);
        if (!file) return res.status(404).json({ success: false, message: 'File not found' });
        if (file.userId.toString() !== req.user.userId)
            return res.status(403).json({ success: false, message: 'Unauthorized' });

        // Rename on Drive
        await drive.files.update({
            fileId: file.driveFileId,
            requestBody: { name: newName }
        });

        // Update DB
        file.originalName = newName;
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
        const file = await File.findById(fileId);
        if (!file) return res.status(404).json({ success: false, message: 'File not found' });
        if (file.userId.toString() !== req.user.userId)
            return res.status(403).json({ success: false, message: 'Unauthorized' });

        // Delete from Drive
        await drive.files.delete({ fileId: file.driveFileId });

        // Delete from DB
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

        // Optional: check destination folder
        let folder = null;
        if (destinationFolderId) {
            folder = await Folder.findById(destinationFolderId);
            if (!folder) {
                return res.status(400).json({ success: false, message: 'Destination folder not found' });
            }
            if (folder.userId.toString() !== userId) {
                return res.status(403).json({ success: false, message: 'Unauthorized destination folder' });
            }
        }

        // Copy file on Google Drive
        const copyResponse = await drive.files.copy({
            fileId: originalFile.driveFileId,
            requestBody: {
                name: `${originalFile.originalName}-copy`,
                parents: folder && folder.driveFolderId ? [folder.driveFolderId] : []
            },
            fields: 'id, name, mimeType, webViewLink, webContentLink'
        });

        const copiedDriveId = copyResponse.data.id;

        // Make the copied file public
        await drive.permissions.create({
            fileId: copiedDriveId,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });

        // Save copied file info to MongoDB
        const newFile = await File.create({
            originalName: `${originalFile.originalName}-copy`,
            filename: copiedDriveId,
            mimetype: originalFile.mimetype,
            size: originalFile.size,
            folderId: folder ? folder._id : null,
            userId,
            driveFileId: copiedDriveId,
            driveViewLink: `https://drive.google.com/file/d/${copiedDriveId}/view?usp=drivesdk`,
            driveDownloadLink: `https://drive.google.com/uc?id=${copiedDriveId}&export=download`
        });

        res.json({ success: true, message: 'File copied successfully', file: newFile });
    } catch (err) {
        console.error('Error copying file:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
