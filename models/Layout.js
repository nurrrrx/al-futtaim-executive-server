const mongoose = require('mongoose');

const layoutSchema = new mongoose.Schema({
  name: { type: String, required: true },
  file: { type: String, required: true, unique: true },
  designerName: { type: String, default: '' },
  description: { type: String, default: '' },
  positions: { type: mongoose.Schema.Types.Mixed, default: {} },
  basePositions: { type: mongoose.Schema.Types.Mixed, default: null },
  lastComment: { type: String, default: '' },
}, {
  timestamps: { createdAt: 'createdDate', updatedAt: 'updatedDate' },
});

module.exports = mongoose.model('Layout', layoutSchema);
