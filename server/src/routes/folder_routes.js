const express = require('express');
const router = express.Router();
const Folder = require('../models/Folder');
const Document = require('../models/Document');
const { protect } = require('./protect');

router.use(protect);
router.get('/', async (req, res) => {
  try {
    const { parentId, starred } = req.query;
    
    let query = { owner: req.user._id };
    
    if (parentId === 'null' || !parentId) {
      query.parent = null;
    } else if (parentId) {
      query.parent = parentId;
    }
    
    if (starred === 'true') {
      query.starred = true;
    }
    
    const folders = await Folder.find(query).sort({ name: 1 });
    res.json({ success: true, folders });
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      owner: req.user._id
    });
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    // subfolders
    const subfolders = await Folder.find({
      parent: folder._id,
      owner: req.user._id
    }).sort({ name: 1 });
    // documents in folder
    const documents = await Document.find({
      folder: folder._id,
      owner: req.user._id
    }).sort({ updatedAt: -1 });
    res.json({
      success: true,
      folder,
      content: { folders: subfolders, documents }
    });
  } catch (error) {
    console.error('Get folder error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, parentId } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }
    // parent check
    if (parentId) {
      const parentFolder = await Folder.findOne({
        _id: parentId,
        owner: req.user._id
      });
      if (!parentFolder) {
        return res.status(404).json({ error: 'Parent folder not found' });
      }
    }
    // name unique check
    const existingFolder = await Folder.findOne({
      name,
      owner: req.user._id,
      parent: parentId || null
    });
    if (existingFolder) {
      return res.status(400).json({ error: 'Folder name already exists' });
    }
    const folder = await Folder.create({
      name,
      owner: req.user._id,
      parent: parentId || null
    });
    res.status(201).json({ success: true, folder });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, parentId, starred } = req.body;
    const folder = await Folder.findOne({
      _id: req.params.id,
      owner: req.user._id
    });
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    // Update parent if provided
    if (parentId !== undefined) {
      if (parentId === folder._id.toString()) {
        return res.status(400).json({ error: 'Cannot move folder into itself' });
      }
      if (parentId) {
        const parentFolder = await Folder.findOne({
          _id: parentId,
          owner: req.user._id
        });
        if (!parentFolder) {
          return res.status(404).json({ error: 'Parent folder not found' });
        }
        // no loop check
        let current = parentFolder;
        while (current) {
          if (current._id.toString() === folder._id.toString()) {
            return res.status(400).json({ error: 'Cannot create circular folder structure' });
          }
          current = current.parent ? await Folder.findById(current.parent) : null;
        }
      }
      // existing name check in new parent
      const existingFolder = await Folder.findOne({
        name: folder.name,
        owner: req.user._id,
        parent: parentId || null
      });
      if (existingFolder && existingFolder._id.toString() !== folder._id.toString()) {
        return res.status(400).json({ error: 'A folder with this name already exists in the destination' });
      }
      folder.parent = parentId || null;
    }
    if (name) folder.name = name;
    if (starred !== undefined) folder.starred = starred;
    await folder.save();
    res.json({ success: true, folder });
  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      owner: req.user._id
    });
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    // delete all documents in folder
    await Document.deleteMany({ folder: folder._id, owner: req.user._id });
    const subfolders = await Folder.find({ parent: folder._id, owner: req.user._id });
    for (const subfolder of subfolders) {
      await Document.deleteMany({ folder: subfolder._id, owner: req.user._id });
      await subfolder.deleteOne();
    }
    await folder.deleteOne();
    res.json({ success: true, message: 'Folder deleted' });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;