const express = require('express');
const router = express.Router();
const Trash = require('../models/Trash');
const Document = require('../models/Document');
const Folder = require('../models/Folder');
const { protect } = require('./protect');

router.use(protect);
//add document to trash
router.post('/document', async (req, res) => {
    try {
        const { documentId } = req.body;
        // find document
        const document = await Document.findOne({
            _id: documentId,
            owner: req.user._id
        });
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        // save into trash
        await Trash.create({ originalId: document._id, name: document.title, type: 'document', owner: req.user._id, originalFolder: document.folder, data: document.toObject()});
        // delete documents collection
        await Document.deleteOne({ _id: documentId });
        res.json({ 
            success: true, 
            message: 'Document moved to trash' 
        });
    } catch (error) {
        console.error('Move document to trash error:', error);
        res.status(500).json({ error: error.message });
    }
});
// add folder to trash
router.post('/folder', async (req, res) => {
    try {
        const { folderId } = req.body;
        const folder = await Folder.findOne({
            _id: folderId,
            owner: req.user._id
        });
        if (!folder) {
            return res.status(404).json({ error: 'Folder not found' });
        }
        await deleteFolderContents(folderId, req.user._id);
        await Trash.create({ originalId: folder._id, name: folder.name, type: 'folder', owner: req.user._id, originalFolder: folder.parent, data: folder.toObject()});
        await Folder.deleteOne({ _id: folderId });
        res.json({ 
            success: true, 
            message: 'Folder moved to trash' 
        });
    } catch (error) {
        console.error('Move folder to trash error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Helper function for deleting folder contents recursively and saving to trash
async function deleteFolderContents(folderId, userId) {
    // all documents in the folder
    const documents = await Document.find({ folder: folderId, owner: userId });
    for (const doc of documents) {
        await Trash.create({ originalId: doc._id, name: doc.title, type: 'document', owner: userId, originalFolder: folderId, data: doc.toObject()});
        await Document.deleteOne({ _id: doc._id });
    }
    // all subfolders
    const subfolders = await Folder.find({ parent: folderId, owner: userId });
    for (const subfolder of subfolders) {
        await deleteFolderContents(subfolder._id, userId);
        await Trash.create({ originalId: subfolder._id, name: subfolder.name, type: 'folder', owner: userId, originalFolder: folderId, data: subfolder.toObject()});
        await Folder.deleteOne({ _id: subfolder._id });
    }
}
// all items in trash
router.get('/', async (req, res) => {
    const items = await Trash.find({ owner: req.user._id })
        .sort({ deletedAt: -1 });
    res.json({ 
        success: true, 
        items: items.map(item => ({ id: item._id, originalId: item.originalId, name: item.name, type: item.type, deletedAt: item.deletedAt, originalFolder: item.originalFolder}))
    });
});
// restore
router.post('/:id/restore', async (req, res) => {
    try {
        const trashItem = await Trash.findOne({
            _id: req.params.id,
            owner: req.user._id
        });
        if (!trashItem) {
            return res.status(404).json({ error: 'Trash item not found' });
        }
        // original folder exxists check
        if (trashItem.originalFolder) {
            const folderExists = await Folder.findOne({
                _id: trashItem.originalFolder,
                owner: req.user._id
            });
            if (!folderExists) {
                trashItem.originalFolder = null; // Restore in root
            }
        }
        // type restore dependents
        if (trashItem.type === 'document') {
            await Document.create({
                ...trashItem.data,
                _id: trashItem.originalId,
                folder: trashItem.originalFolder
            });
        } else {
            await Folder.create({
                ...trashItem.data,
                _id: trashItem.originalId,
                parent: trashItem.originalFolder
            });
        }
        // moveout trash
        await Trash.deleteOne({ _id: req.params.id });
        res.json({ 
            success: true, 
            message: 'Item restored successfully' 
        });
    } catch (error) {
        console.error('Restore item error:', error);
        res.status(500).json({ error: error.message });
    }
});
// permanently delete
router.delete('/:id', async (req, res) => {
    const trashItem = await Trash.findOneAndDelete({
        _id: req.params.id,
        owner: req.user._id
    });
    if (!trashItem) {
        return res.status(404).json({ error: 'Trash item not found' });
    }
    res.json({ 
        success: true, 
        message: 'Item permanently deleted' 
    });
});
// empty trash
router.delete('/', async (req, res) => {
    await Trash.deleteMany({ owner: req.user._id });
    res.json({ 
        success: true, 
        message: 'Trash emptied successfully' 
    });
});
// multiplerestore
router.post('/restore-multiple', async (req, res) => {
    try {
        const { itemIds } = req.body;
        if (!itemIds || !Array.isArray(itemIds)) {
            return res.status(400).json({ error: 'Invalid item IDs' });
        }
        const results = {
            success: [],
            failed: []
        };
        for (const id of itemIds) {
            try {
                const trashItem = await Trash.findOne({
                    _id: id,
                    owner: req.user._id
                });
                if (!trashItem) {
                    results.failed.push({ id, reason: 'Not found' });
                    continue;
                }
                // check original folder
                if (trashItem.originalFolder) {
                    const folderExists = await Folder.findOne({
                        _id: trashItem.originalFolder,
                        owner: req.user._id
                    });
                    if (!folderExists) {
                        trashItem.originalFolder = null;
                    }
                }
                if (trashItem.type === 'document') {
                    await Document.create({
                        ...trashItem.data,
                        _id: trashItem.originalId,
                        folder: trashItem.originalFolder
                    });
                } else {
                    await Folder.create({
                        ...trashItem.data,
                        _id: trashItem.originalId,
                        parent: trashItem.originalFolder
                    });
                }
                await Trash.deleteOne({ _id: id });
                results.success.push(id);
            } catch (err) {
                results.failed.push({ id, reason: err.message });
            }
        }
        res.json({ 
            success: true, 
            results 
        });
    } catch (error) {
        console.error('Restore multiple error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;