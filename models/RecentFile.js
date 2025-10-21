const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RecentFileSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileId: { type: Schema.Types.ObjectId, ref: 'File', required: true },
    accessedAt: { type: Date, default: Date.now }
});

RecentFileSchema.index({ userId: 1, fileId: 1 }, { unique: true });

const RecentFile = mongoose.model('RecentFile', RecentFileSchema);
module.exports = RecentFile
