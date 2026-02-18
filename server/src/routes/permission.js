const checkDocumentPermission = (requiredPermission) => {
  return async (req, res, next) => {
    const Document = require('../models/Document');
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    // ownner can do everything
    if (document.owner.toString() === req.user._id.toString()) {
      req.document = document;
      return next();
    }
    // shared users check
    const sharedUser = document.sharedWith?.find(
      share => share.user.toString() === req.user._id.toString()
    );
    if (!sharedUser) {
      return res.status(403).json({ error: 'You do not have access to this document' });
    }
    // permission check
    if (requiredPermission === 'edit' && sharedUser.permission !== 'edit') {
      return res.status(403).json({ error: 'You only have view permission' });
    }
    req.document = document;
    next();
  };
};

module.exports = { checkDocumentPermission };