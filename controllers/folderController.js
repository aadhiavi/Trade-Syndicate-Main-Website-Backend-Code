const mongoose = require('mongoose');
const express = require('express');
const Folder = require('../models/Folder');
const File = require('../models/File');
const { authenticate, isAdmin } = require('../middleware/auth');
const router = express.Router();

router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, parent } = req.body;
    const folder = new Folder({
      name,
      parent: parent || null,
      userId: req.user.userId,
    });
    await folder.save();
    res.json({ success: true, folder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { parent } = req.query;

    const filter = {
      userId: req.user.userId
    };

    if (parent) {
      filter.parent = parent;
    } else {
      filter.parent = null;
    }

    const folders = await Folder.find(filter).sort({ name: 1 });
    res.json({ success: true, folders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/children/:parentId', authenticate, isAdmin, async (req, res) => {
  try {
    const folders = await Folder.find({
      parent: req.params.parentId,
      userId: req.user.userId
    });
    res.json({ success: true, folders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/path/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const path = [];
    let current = await Folder.findById(req.params.id);

    // Verify ownership of current folder (if current is null, handle)
    if (!current || current.userId.toString() !== req.user.userId) {
      return res.status(404).json({ success: false, message: 'Folder not found or unauthorized' });
    }

    // Traverse up parents
    while (current) {
      // Check ownership each step (optional, but safer)
      if (current.userId.toString() !== req.user.userId) {
        break; // Stop if parent is from another user
      }
      path.unshift(current);
      current = current.parent ? await Folder.findById(current.parent) : null;
    }
    res.json({ success: true, path });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/get-folder/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const folderId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({ success: false, message: 'Invalid folder ID' });
    }

    const folderTree = await getFolderTree(folderId, req.user.userId);
    if (!folderTree) {
      return res.status(404).json({ success: false, message: 'Folder not found or unauthorized' });
    }

    res.json({ success: true, folder: folderTree });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

async function getFolderTree(folderId, userId) {
  const folder = await Folder.findOne({ _id: folderId, userId }).lean();
  if (!folder) return null;

  const files = await File.find({ folderId }).lean();
  const subfolders = await Folder.find({ parent: folderId, userId }).lean();

  const subfolderTrees = await Promise.all(
    subfolders.map(sub => getFolderTree(sub._id, userId))
  );

  return {
    ...folder,
    files,
    subfolders: subfolderTrees
  };
}

router.put('/move/:id', authenticate, isAdmin, async (req, res) => {
  const { id: folderId } = req.params;
  const { newParentId } = req.body;
  const userId = req.user.userId;

  if (!mongoose.Types.ObjectId.isValid(folderId) || (newParentId && !mongoose.Types.ObjectId.isValid(newParentId))) {
    return res.status(400).json({ success: false, message: 'Invalid folder ID' });
  }

  if (folderId === newParentId) {
    return res.status(400).json({ success: false, message: 'A folder cannot be its own parent' });
  }

  // Ensure folder belongs to user
  const folder = await Folder.findOne({ _id: folderId, userId });
  if (!folder) {
    return res.status(404).json({ success: false, message: 'Folder not found or unauthorized' });
  }

  // If newParentId is set, ensure new parent belongs to same user
  if (newParentId) {
    const newParent = await Folder.findOne({ _id: newParentId, userId });
    if (!newParent) {
      return res.status(400).json({ success: false, message: 'New parent folder not found or unauthorized' });
    }
  }

  const isCircular = await checkCircularParent(folderId, newParentId);
  if (isCircular) {
    return res.status(400).json({ success: false, message: 'Cannot move folder into its own subfolder' });
  }

  folder.parent = newParentId || null;
  await folder.save();

  res.json({ success: true, folder });
});

async function checkCircularParent(folderId, newParentId) {
  let currentId = newParentId;
  while (currentId) {
    if (currentId.toString() === folderId.toString()) return true;
    const current = await Folder.findById(currentId);
    if (!current) break;
    currentId = current.parent;
  }
  return false;
}

router.put("/rename/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const folderId = req.params.id;
    const { name } = req.body;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({ success: false, message: "Invalid folder ID" });
    }

    if (!name) {
      return res.status(400).json({ success: false, message: "Folder name is required" });
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      return res.status(400).json({ success: false, message: "Folder name cannot be empty" });
    }

    const updatedFolder = await Folder.findOneAndUpdate(
      { _id: folderId, userId },
      { name: trimmedName },
      { new: true }
    );

    if (!updatedFolder) {
      return res.status(404).json({ success: false, message: "Folder not found or unauthorized" });
    }

    res.json({ success: true, folder: updatedFolder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/delete/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const folderId = req.params.id;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({ success: false, message: "Invalid folder ID" });
    }

    const deletedCount = await deleteFolderAndContents(folderId, userId);

    res.json({ success: true, message: `Deleted ${deletedCount.folders} folders and ${deletedCount.files} files.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

async function deleteFolderAndContents(folderId, userId) {
  let folderCount = 0;
  let fileCount = 0;

  // Delete files in this folder that belong to the user
  const files = await File.find({ folderId, userId });
  for (const file of files) {
    await File.findByIdAndDelete(file._id);
    fileCount++;
  }

  // Find subfolders that belong to the user and delete recursively
  const subfolders = await Folder.find({ parent: folderId, userId });
  for (const subfolder of subfolders) {
    const result = await deleteFolderAndContents(subfolder._id, userId);
    folderCount += result.folders;
    fileCount += result.files;
  }

  // Delete this folder only if owned by user
  const folder = await Folder.findOne({ _id: folderId, userId });
  if (folder) {
    await Folder.findByIdAndDelete(folderId);
    folderCount++;
  }

  return { folders: folderCount, files: fileCount };
}

module.exports = router;

