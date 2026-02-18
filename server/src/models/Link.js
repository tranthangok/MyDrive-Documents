const mongoose = require('mongoose');

const linksSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    unique: true
  },
  type: {
    type: String,
    enum: ['reset', 'verify'],
    default: 'reset'
  },
  used: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 60 * 60 * 1000) // 1 hour
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
// delete expired tokens automatically
linksSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Limit request 
linksSchema.index({ email: 1, createdAt: 1 });
module.exports = mongoose.model('Links', linksSchema);