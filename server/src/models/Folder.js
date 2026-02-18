const mongoose = require('mongoose');

const FolderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users', 
        required: true
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'folders',
        default: null
    },
    starred: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true 
});

FolderSchema.index({ owner: 1, parent: 1, name: 1 }, { unique: true });
const FolderModel = mongoose.model("folders", FolderSchema);
module.exports = FolderModel;