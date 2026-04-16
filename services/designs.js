const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const DESIGNS_DIR = path.join(__dirname, 'designs-data');

// Ensure designs directory exists
if (!fs.existsSync(DESIGNS_DIR)) {
  fs.mkdirSync(DESIGNS_DIR, { recursive: true });
}

// GET /api/designs — list all saved designs
router.get('/', (req, res) => {
  try {
    const files = fs.readdirSync(DESIGNS_DIR).filter(f => f.endsWith('.json'));
    const designs = files.map(f => {
      try {
        const raw = fs.readFileSync(path.join(DESIGNS_DIR, f), 'utf-8');
        const d = JSON.parse(raw);
        return { name: d.name || f, date: d.date || '', file: f };
      } catch {
        return null;
      }
    }).filter(Boolean);
    designs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    res.json({ designs });
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
  const { name, overrides } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const fileName = safeName + '.json';
  const designData = {
    name,
    date: new Date().toISOString(),
    overrides: overrides || {},
  };
  try {
    fs.writeFileSync(path.join(DESIGNS_DIR, fileName), JSON.stringify(designData, null, 2));
    res.json({ success: true, file: fileName, name, date: designData.date });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save design' });
  }
});

// DELETE /api/designs/:file — delete a design
router.delete('/:file', (req, res) => {
  const filePath = path.join(DESIGNS_DIR, req.params.file);
  if (!filePath.startsWith(DESIGNS_DIR) || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Design not found' });
  }
  try {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete design' });
  }
});

module.exports = router;
