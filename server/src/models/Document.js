const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
    title: {
        type: String,
        default: 'Untitled Document'
    },
    content: {
        type: String,
        default: ''
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    folder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'folders',
        default: null
    },
    // field shared
    sharedWith: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users'
        },
        permission: {
            type: String,
            enum: ['view', 'edit'],
            default: 'view'
        }
    }],
    // link public
    shareId: {
        type: String,
        unique: true,
        sparse: true
    }
}, {
    timestamps: true 
});

const DocumentModel = mongoose.model("documents", DocumentSchema);
module.exports = DocumentModel;