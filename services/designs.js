const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const DESIGNS_DIR = path.join(__dirname, 'designs-data');

if (!fs.existsSync(DESIGNS_DIR)) {
  fs.mkdirSync(DESIGNS_DIR, { recursive: true });
}

function readAllDesigns() {
  const files = fs.readdirSync(DESIGNS_DIR).filter(f => f.endsWith('.json'));
  const designs = files.map(f => {
    try {
      const raw = fs.readFileSync(path.join(DESIGNS_DIR, f), 'utf-8');
      const d = JSON.parse(raw);
      return {
        id: d.id || null,
        name: d.name || f,
        designerName: d.designerName || '',
        description: d.description || '',
        overrides: d.overrides || {},
        createdDate: d.createdDate || d.date || '',
        updatedDate: d.updatedDate || '',
        lastComment: d.lastComment || '',
        file: f,
      };
    } catch {
      return null;
    }
  }).filter(Boolean);
  designs.sort((a, b) => {
    if (a.name === 'Default') return -1;
    if (b.name === 'Default') return 1;
    return (b.updatedDate || b.createdDate || '').localeCompare(a.updatedDate || a.createdDate || '');
  });
  return designs;
}

// GET /api/designs — list all saved designs
router.get('/', (req, res) => {
  try {
    res.json({ designs: readAllDesigns() });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list designs' });
  }
});

// GET /api/designs/:file — get a specific design
router.get('/:file', (req, res) => {
  const filePath = path.join(DESIGNS_DIR, req.params.file);
  if (!filePath.startsWith(DESIGNS_DIR) || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Design not found' });
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    res.json(JSON.parse(raw));
  } catch (e) {
    res.status(500).json({ error: 'Failed to read design' });
  }
});

// POST /api/designs — save a new design
router.post('/', (req, res) => {
  const { name, designerName, description, overrides } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!designerName) {
    return res.status(400).json({ error: 'Designer name is required' });
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const fileName = safeName + '.json';
  const designData = {
    id,
    name,
    designerName,
    description: description || '',
    createdDate: now,
    updatedDate: now,
    lastComment: '',
    overrides: overrides || {},
  };
  try {
    fs.writeFileSync(path.join(DESIGNS_DIR, fileName), JSON.stringify(designData, null, 2));
    res.json({ success: true, id, file: fileName, name, createdDate: now, updatedDate: now });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save design' });
  }
});

// PUT /api/designs/:file — update an existing design
router.put('/:file', (req, res) => {
  const filePath = path.join(DESIGNS_DIR, req.params.file);
  if (!filePath.startsWith(DESIGNS_DIR) || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Design not found' });
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const existing = JSON.parse(raw);
    if (existing.name === 'Default') {
      return res.status(403).json({ error: 'Cannot modify the Default design' });
    }
    const { comment, overrides } = req.body;
    const now = new Date().toISOString();
    const updated = {
      ...existing,
      overrides: overrides || existing.overrides,
      updatedDate: now,
      lastComment: comment || '',
    };
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
    res.json({ success: true, file: req.params.file, updatedDate: now });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update design' });
  }
});

// DELETE /api/designs/:file — delete a design
router.delete('/:file', (req, res) => {
  const filePath = path.join(DESIGNS_DIR, req.params.file);
  if (!filePath.startsWith(DESIGNS_DIR) || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Design not found' });
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const d = JSON.parse(raw);
    if (d.name === 'Default') {
      return res.status(403).json({ error: 'Cannot delete the Default design' });
    }
  } catch {}
  try {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete design' });
  }
});

module.exports = router;
