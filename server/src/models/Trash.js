const mongoose = require('mongoose');

const TrashSchema = new mongoose.Schema({
    originalId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['document', 'folder'],
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    originalFolder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'folders',
        default: null
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    deletedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});
// 30 days automatic deletion
TrashSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
module.exports = mongoose.model("trash", TrashSchema);