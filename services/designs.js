const express = require('express');
const Design = require('../models/Design');
const router = express.Router();

// GET /api/designs — list all saved designs with full overrides
router.get('/', async (req, res) => {
  try {
    const designs = await Design.find({}).lean();
    const sorted = designs.sort((a, b) => {
      if (a.name === 'Default') return -1;
      if (b.name === 'Default') return 1;
      return (b.updatedDate || b.createdDate || '').toString().localeCompare((a.updatedDate || a.createdDate || '').toString());
    });
    res.json({
      designs: sorted.map(d => ({
        id: d._id,
        name: d.name,
        file: d.file,
        designerName: d.designerName,
        description: d.description,
        overrides: d.overrides,
        baseSnapshot: d.baseSnapshot,
        createdDate: d.createdDate,
        updatedDate: d.updatedDate,
        lastComment: d.lastComment,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list designs' });
  }
});

// GET /api/designs/:file — get a specific design
router.get('/:file', async (req, res) => {
  try {
    const d = await Design.findOne({ file: req.params.file }).lean();
    if (!d) return res.status(404).json({ error: 'Design not found' });
    res.json({
      id: d._id,
      name: d.name,
      file: d.file,
      designerName: d.designerName,
      description: d.description,
      overrides: d.overrides,
      baseSnapshot: d.baseSnapshot,
      createdDate: d.createdDate,
      updatedDate: d.updatedDate,
      lastComment: d.lastComment,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to read design' });
  }
});

// POST /api/designs — save a new design
router.post('/', async (req, res) => {
  const { name, designerName, description, overrides, baseSnapshot } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  if (!designerName) return res.status(400).json({ error: 'Designer name is required' });

  const file = name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() + '.json';
  try {
    const d = await Design.findOneAndUpdate(
      { file },
      { name, file, designerName, description: description || '', overrides: overrides || {}, baseSnapshot: baseSnapshot || null, lastComment: '' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, id: d._id, file: d.file, name: d.name, createdDate: d.createdDate, updatedDate: d.updatedDate });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save design' });
  }
});

// PUT /api/designs/:file — update an existing design
router.put('/:file', async (req, res) => {
  try {
    const existing = await Design.findOne({ file: req.params.file });
    if (!existing) return res.status(404).json({ error: 'Design not found' });
    if (existing.name === 'Default') return res.status(403).json({ error: 'Cannot modify the Default design' });

    const update = {};
    if (req.body.overrides) update.overrides = req.body.overrides;
    if (req.body.comment) update.lastComment = req.body.comment;
    if (req.body.name) update.name = req.body.name;
    if (req.body.designerName) update.designerName = req.body.designerName;
    if (req.body.description !== undefined) update.description = req.body.description;

    await Design.findOneAndUpdate({ file: req.params.file }, update);
    res.json({ success: true, file: req.params.file, updatedDate: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update design' });
  }
});

// DELETE /api/designs/:file — delete a design
router.delete('/:file', async (req, res) => {
  try {
    const d = await Design.findOne({ file: req.params.file });
    if (!d) return res.status(404).json({ error: 'Design not found' });
    if (d.name === 'Default') return res.status(403).json({ error: 'Cannot delete the Default design' });

    await Design.findOneAndDelete({ file: req.params.file });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete design' });
  }
});

module.exports = router;
