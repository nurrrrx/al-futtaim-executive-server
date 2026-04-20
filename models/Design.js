const mongoose = require('mongoose');

const designSchema = new mongoose.Schema({
  name: { type: String, required: true },
  file: { type: String, required: true, unique: true },
  designerName: { type: String, default: '' },
  description: { type: String, default: '' },
  overrides: { type: mongoose.Schema.Types.Mixed, default: {} },
  baseSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  lastComment: { type: String, default: '' },
}, {
  timestamps: { createdAt: 'createdDate', updatedAt: 'updatedDate' },
});

module.exports = mongoose.model('Design', designSchema);
