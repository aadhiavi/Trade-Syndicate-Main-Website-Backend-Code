const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FileSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  originalName: { type: String, required: true },
  filename: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  folderId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
  isFavorite: { type: Boolean, default: false },
  isTrashed: { type: Boolean, default: false },
  uploadDate: { type: Date, default: Date.now },
  driveFileId: { type: String },
  driveViewLink: { type: String },
  driveDownloadLink: { type: String },
});

const File = mongoose.model('File', FileSchema);
module.exports = File;
