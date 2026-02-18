const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const Folder = require('../models/Folder');
const User = require('../models/User');
const { protect } = require('./protect');
const { checkDocumentPermission } = require('./permission');
const crypto = require('crypto');
const Invitation = require('../models/Invitation');
const { transporter } = require('../config/Email');
// Email template for invitation
const getInvitationEmail = (inviterName, documentTitle, token, permission) => {
  const acceptLink = `${process.env.FRONTEND_URL}/invitation/${token}`;
  return {
    subject: `${inviterName} invited you to collaborate on "${documentTitle}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #3366CC; text-align: center;">Document Invitation</h2>
        <p style="font-size: 16px; color: #333;">Hello,</p>
        <p style="font-size: 16px; color: #333;">
          <strong>${inviterName}</strong> has invited you to collaborate on the document 
          <strong>"${documentTitle}"</strong> with <strong>${permission}</strong> access.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${acceptLink}" style="background: #3366CC; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">Accept Invitation</a>
        </div>
        <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
        <p style="color: #666; font-size: 14px;">If you don't have an account yet, you'll be able to create one when you accept.</p>
        <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">© 2026 MyDrive. All rights reserved.</p>
      </div>
    `,
  };
};
// Public shared document
router.get('/shared/:shareId', async (req, res) => {
  const document = await Document.findOne({ shareId: req.params.shareId })
    .populate('owner', 'name email');
  if (!document) {
    return res.status(404).json({ error: 'Document not found or link expired' });
  }
  res.json({ 
    success: true, 
    document: { _id: document._id, title: document.title, content: document.content, owner: document.owner, updatedAt: document.updatedAt, createdAt: document.createdAt}
  });
});
// Get invitation details for public
router.get('/invitation/:token', async (req, res) => {
  const invitation = await Invitation.findOne({
    token: req.params.token,
    used: false,
    expiresAt: { $gt: Date.now() }
  }).populate('documentId', 'title');
  
  if (!invitation) {
    return res.status(404).json({ error: 'Invalid or expired invitation' });
  }
  
  res.json({
    success: true,
    invitation: { email: invitation.email, documentTitle: invitation.documentId.title, documentId: invitation.documentId._id, permission: invitation.permission, token: invitation.token}
  });
});
// Claim invitation (public)
router.post('/invitation/:token/claim', async (req, res) => {
  try {
    const invitation = await Invitation.findOne({
      token: req.params.token,
      used: false,
      expiresAt: { $gt: Date.now() }
    });
    if (!invitation) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }
    const user = await User.findOne({ email: invitation.email });
    if (!user) {
      // if user not exist, get infor to redirect to signup
      return res.json({
        success: true,
        requiresSignup: true,
        email: invitation.email,
        token: invitation.token,
        documentId: invitation.documentId,
        permission: invitation.permission
      });
    }
    // User has existed, addin sharedWith
    const document = await Document.findById(invitation.documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    // check share 
    const existingShare = document.sharedWith?.find(
      share => share.user.toString() === user._id.toString()
    );
    if (existingShare) {
      existingShare.permission = invitation.permission;
    } else {
      if (!document.sharedWith) document.sharedWith = [];
      document.sharedWith.push({
        user: user._id,
        permission: invitation.permission
      });
    }
    await document.save();
    invitation.used = true;
    await invitation.save();
    // token auto login
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || "jwt-secret-key",
      { expiresIn: "7d" }
    );
    res.json({
      success: true,
      requiresSignup: false,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      documentId: document._id,
      permission: invitation.permission
    });
  } catch (error) {
    console.error('Claim invitation error:', error);
    res.status(500).json({ error: error.message });
  }
});
//authentication
router.use(protect);
// take all related shared document
router.get('/shared', protect, async (req, res) => {
  try {
    // document others share with user
    const receivedDocuments = await Document.find({
      'sharedWith.user': req.user._id
    })
    .populate('owner', 'name email')
    .populate('sharedWith.user', 'name email')
    .sort({ updatedAt: -1 });
    // document user share with others
    const ownedSharedDocuments = await Document.find({
      owner: req.user._id,
      'sharedWith.0': { $exists: true } // min 1 sharedWith
    })
    .populate('sharedWith.user', 'name email')
    .sort({ updatedAt: -1 });
    // Format documents received
    const formattedReceived = receivedDocuments.map(doc => {
      const shareInfo = doc.sharedWith?.find(
        s => s.user && s.user._id && s.user._id.toString() === req.user._id.toString()
      );
      return {
        _id: doc._id,
        title: doc.title,
        content: doc.content,
        type: 'file',
        owner: doc.owner,
        folder: doc.folder,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        permission: shareInfo?.permission || 'view',
        sharedBy: doc.owner ? {
          id: doc.owner._id,
          name: doc.owner.name || 'Unknown',
          email: doc.owner.email || 'unknown@email.com'
        } : null,
        sharedWith: doc.sharedWith?.map(s => ({
          user: {
            _id: s.user._id,
            name: s.user.name,
            email: s.user.email
          },
          permission: s.permission
        })),
        shareType: 'received'
      };
    });
    // Format documents have and shared with others1
    const formattedOwned = ownedSharedDocuments.map(doc => {
      return {
        _id: doc._id,
        title: doc.title,
        content: doc.content,
        type: 'file',
        owner: doc.owner,
        folder: doc.folder,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        permission: 'edit', 
        sharedBy: null, 
        sharedWith: doc.sharedWith?.map(s => ({
          user: {
            _id: s.user._id,
            name: s.user.name,
            email: s.user.email
          },
          permission: s.permission
        })),
        shareType: 'sent'
      };
    });
    const allSharedDocuments = [...formattedReceived, ...formattedOwned];
    // Sort all docsuments by updatedAt descending
    allSharedDocuments.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    res.json({ 
      success: true, 
      documents: allSharedDocuments,
      summary: {
        total: allSharedDocuments.length,
        received: formattedReceived.length,
        sent: formattedOwned.length
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
// take all documents of user
router.get('/', async (req, res) => {
  try {
    const { folderId } = req.query;
    // documents by user has
    let ownerQuery = { owner: req.user._id };
    if (folderId === 'null' || !folderId) {
      ownerQuery.folder = null;
    } else if (folderId) {
      ownerQuery.folder = folderId;
    }
    const ownedDocuments = await Document.find(ownerQuery).sort({ updatedAt: -1 });
    // documents shared with user
    const sharedDocuments = await Document.find({
      'sharedWith.user': req.user._id,
      folder: folderId === 'null' ? null : folderId
    }).sort({ updatedAt: -1 });
    // combine and take permission
    const allDocuments = [
      ...ownedDocuments.map(doc => ({ ...doc.toObject(), permission: 'edit' })),
      ...sharedDocuments.map(doc => {
        const shareInfo = doc.sharedWith.find(s => s.user.toString() === req.user._id.toString());
        return { ...doc.toObject(), permission: shareInfo.permission };
      })
    ];
    res.json({ success: true, documents: allDocuments });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: error.message });
  }
});
// take detail document permission
router.get('/:id', checkDocumentPermission('view'), async (req, res) => {
  // permission checking
  let permission = 'edit';
  if (req.document.owner.toString() !== req.user._id.toString()) {
    const shareInfo = req.document.sharedWith.find(
      s => s.user.toString() === req.user._id.toString()
    );
    permission = shareInfo?.permission || 'view';
  }
  res.json({ 
    success: true, 
    document: {
      ...req.document.toObject(),
      permission,
      activeEditors: req.document.activeEditors || []
    }
  });
});
// create new document
router.post('/', async (req, res) => {
  const { title, content, folderId } = req.body;
  if (folderId) {
    const folder = await Folder.findOne({
      _id: folderId,
      owner: req.user._id
    });
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
  }
  const document = await Document.create({
    title: title || 'Untitled Document',
    content: content || '',
    owner: req.user._id,
    folder: folderId || null,
    activeEditors: []
  });
  res.status(201).json({ success: true, document });
});
// UPDATE ACTIVE EDITOR
router.post('/:id/active', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id); 
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    // edit permission check
    const isOwner = document.owner.toString() === req.user._id.toString();
    const sharedUser = document.sharedWith?.find(
      s => s.user.toString() === req.user._id.toString()
    );
    if (!isOwner && (!sharedUser || sharedUser.permission !== 'edit')) {
      return res.status(403).json({ error: 'You do not have edit permission' });
    }
    // upadte or add active editor
    if (!document.activeEditors) document.activeEditors = [];
    const existingEditorIndex = document.activeEditors.findIndex(
      e => e.user && e.user.toString() === req.user._id.toString()
    );
    if (existingEditorIndex >= 0) {
      document.activeEditors[existingEditorIndex].lastActive = Date.now();
      document.activeEditors[existingEditorIndex].email = req.user.email;
    } else {
      document.activeEditors.push({
        user: req.user._id,
        email: req.user.email,
        lastActive: Date.now()
      });
    }
    const thirtySecondsAgo = Date.now() - 30000;
    document.activeEditors = document.activeEditors.filter(
      e => e.lastActive > thirtySecondsAgo
    );
    await document.save();
    res.json({ 
      success: true, 
      activeEditors: document.activeEditors.map(e => e.email)
    });
  } catch (error) {
    console.error('Update active editor error:', error);
    res.status(500).json({ error: error.message });
  }
});
// GET ACTIVE EDITORS
router.get('/:id/active', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    // check view permission
    const isOwner = document.owner.toString() === req.user._id.toString();
    const sharedUser = document.sharedWith?.find(
      s => s.user.toString() === req.user._id.toString()
    );
    if (!isOwner && !sharedUser) {
      return res.status(403).json({ error: 'You do not have access to this document' });
    }
    const thirtySecondsAgo = Date.now() - 30000;
    const activeEditors = document.activeEditors?.filter(
      e => e.lastActive > thirtySecondsAgo
    ) || [];
    res.json({ 
      success: true, 
      activeEditors: activeEditors.map(e => e.email)
    });
    
  } catch (error) {
    console.error('Get active editors error:', error);
    res.status(500).json({ error: error.message });
  }
});
// update document with conflict check
router.put('/:id', checkDocumentPermission('edit'), async (req, res) => {
  try {
    const { title, content, folderId, lastModified } = req.body;
    // take document currently
    const currentDoc = await Document.findById(req.params.id);
    if (!currentDoc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Chỉ kiểm tra conflict nếu có lastModified (không phải document mới)
    if (lastModified) {
      const serverLastModified = currentDoc.updatedAt.getTime();
      if (serverLastModified > lastModified) {
        // Conflict detected - document updated by another user
        return res.status(409).json({ 
          error: 'Conflict',
          message: 'This document has been modified by another user',
          serverContent: currentDoc.content,
          serverTitle: currentDoc.title // Thêm dòng này
        });
      }
    }
    // check content changes or not
    const hasContentChanged = content !== undefined && content !== currentDoc.content;
    const hasTitleChanged = title !== undefined && title !== currentDoc.title;
    // update document
    if (title !== undefined) currentDoc.title = title;
    if (content !== undefined) currentDoc.content = content;
    if (folderId !== undefined) {
      if (folderId === null) {
        currentDoc.folder = null;
      } else {
        const folder = await Folder.findOne({
          _id: folderId,
          owner: req.user._id
        });
        if (!folder) {
          return res.status(404).json({ error: 'Folder not found' });
        }
        currentDoc.folder = folderId;
      }
    }
    await currentDoc.save();
    res.json({ 
      success: true, 
      document: currentDoc,
      hasChanged: hasContentChanged || hasTitleChanged,
      updatedAt: currentDoc.updatedAt
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: error.message });
  }
});
// delete document (owner)
router.delete('/:id', async (req, res) => {
  const document = await Document.findOneAndDelete({
    _id: req.params.id,
    owner: req.user._id
  });
  if (!document) {
    return res.status(404).json({ error: 'Document not found or you are not the owner' });
  }
  res.json({ success: true, message: 'Document deleted' });
});
// share documents everyone
router.post('/:id/share', async (req, res) => {
  try {
    const { email, permission } = req.body;
    // check document exist and user edit permission
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    // check user now has share permission
    const isOwner = document.owner.toString() === req.user._id.toString();
    const sharedUser = document.sharedWith?.find(
      s => s.user.toString() === req.user._id.toString()
    );
    if (!isOwner && (!sharedUser || sharedUser.permission !== 'edit')) {
      return res.status(403).json({ error: 'You do not have permission to share this document' });
    }
    // Find user to share with
    const userToShare = await User.findOne({ email });
    if (!userToShare) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Check if already shared
    const existingShare = document.sharedWith?.find(
      share => share.user.toString() === userToShare._id.toString()
    );
    if (existingShare) {
      existingShare.permission = permission || 'view';
    } else {
      if (!document.sharedWith) document.sharedWith = [];
      document.sharedWith.push({
        user: userToShare._id,
        permission: permission || 'view'
      });
    }
    await document.save();
    
    res.json({ success: true, sharedWith: document.sharedWith });
  } catch (error) {
    console.error('Share document error:', error);
    res.status(500).json({ error: error.message });
  }
});
// generate share link
router.post('/:id/generate-link', async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }
  const isOwner = document.owner.toString() === req.user._id.toString();
  const sharedUser = document.sharedWith?.find(
    s => s.user.toString() === req.user._id.toString()
  );
  if (!isOwner && (!sharedUser || sharedUser.permission !== 'edit')) {
    return res.status(403).json({ error: 'You do not have permission to generate share link' });
  }
  // Generate unique shareId
  const shareId = crypto.randomBytes(16).toString('hex');
  document.shareId = shareId;
  await document.save();
  res.json({ 
    success: true, 
    shareId: document.shareId,
    shareLink: `/shared/${shareId}`
  });
});
// remove share
router.delete('/:id/share/:userId', async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }
  const isOwner = document.owner.toString() === req.user._id.toString();
  const sharedUser = document.sharedWith?.find(
    s => s.user.toString() === req.user._id.toString()
  );
  if (!isOwner && (!sharedUser || sharedUser.permission !== 'edit')) {
    return res.status(403).json({ error: 'You do not have permission to remove shares' });
  }
  document.sharedWith = document.sharedWith.filter(
    share => share.user.toString() !== req.params.userId
  );
  await document.save();
  res.json({ success: true, sharedWith: document.sharedWith });
});
// get shared users
router.get('/:id/shared', async (req, res) => {
  const document = await Document.findById(req.params.id)
    .populate('sharedWith.user', 'name email');
  
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }
  const isOwner = document.owner.toString() === req.user._id.toString();
  const sharedUser = document.sharedWith?.find(
    s => s.user.toString() === req.user._id.toString()
  );
  
  if (!isOwner && !sharedUser) {
    return res.status(403).json({ error: 'You do not have access to this document' });
  }
  
  res.json({ 
    success: true, 
    users: document.sharedWith?.map(share => ({
      id: share.user._id,
      email: share.user.email,
      name: share.user.name,
      permission: share.permission
    })) || []
  });
});
// invite by emaail
router.post('/:id/invite', async (req, res) => {
  const { email, permission } = req.body;
  const document = await Document.findById(req.params.id).populate('owner', 'name email');
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }
  const isOwner = document.owner._id.toString() === req.user._id.toString();
  const sharedUser = document.sharedWith?.find(
    s => s.user.toString() === req.user._id.toString()
  );
  if (!isOwner && (!sharedUser || sharedUser.permission !== 'edit')) {
    return res.status(403).json({ error: 'You do not have permission to invite others' });
  }
  // token
  const token = crypto.randomBytes(32).toString('hex');
  // invitation save
  const invitation = await Invitation.create({
    email,
    documentId: document._id,
    invitedBy: req.user._id,
    permission: permission || 'view',
    token,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  // email send
  const emailContent = getInvitationEmail(
    req.user.name,
    document.title,
    token,
    permission || 'view'
  );
  await transporter.sendMail({
    from: `"MyDrive" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: emailContent.subject,
    html: emailContent.html
  });
  res.json({ 
    success: true, 
    message: `Invitation sent to ${email}`,
    invitation
  });
});

module.exports = router;