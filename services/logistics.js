const express = require('express');
const router = express.Router();
const fullData = require('./logistics-data/kizad_full_data.json');
const gridConfig = require('./logistics-data/kizad_grid_config.json');

// ── Build slim grid (brand + status only, ~50KB) ────────────────
const slimGrid = {
  yard: fullData.yard,
  bays: fullData.bays,
  colors: fullData.colors,
  labels: fullData.labels,
  roads: fullData.roads,
  brandColors: fullData.brandColors,
  boundary: fullData.boundary,
  zoneConfig: fullData.zoneConfig,
  cells: {},
};

// For each cell, reduce spots to just status + brand
for (const [key, cellData] of Object.entries(fullData.cells)) {
  if (!Array.isArray(cellData)) {
    slimGrid.cells[key] = cellData;
    continue;
  }
  slimGrid.cells[key] = cellData.map(row =>
    row.map(spot => {
      if (typeof spot === 'object' && spot !== null) {
        return { brand: spot.brand, model: spot.model };
      }
      return spot; // "doesnt_exist", "road", etc.
    })
  );
}

// ── Build spot index for fast lookups ───────────────────────────
// spotIndex[bay][rowIdx][colIdx] = full car object
const spotIndex = {};
for (const [key, cellData] of Object.entries(fullData.cells)) {
  if (!Array.isArray(cellData)) continue;
  spotIndex[key] = {};
  cellData.forEach((row, sr) => {
    row.forEach((spot, sc) => {
      if (typeof spot === 'object' && spot !== null) {
        if (!spotIndex[key][sr]) spotIndex[key][sr] = {};
        spotIndex[key][sr][sc] = spot;
      }
    });
  });
}

// ── Build search index (brand → model → trim → positions) ──────
const searchIndex = []; // [{brand,model,trim,color,year,bay,row,col}, ...]
for (const [key, cellData] of Object.entries(fullData.cells)) {
  if (!Array.isArray(cellData)) continue;
  cellData.forEach((row, sr) => {
    row.forEach((spot, sc) => {
      if (typeof spot === 'object' && spot !== null) {
        searchIndex.push({
          brand: spot.brand,
          model: spot.model,
          trim: spot.trim,
          color: spot.color,
          year: spot.year,
          vin: spot.vin,
          bay: key,
          row: sr,
          col: sc,
        });
      }
    });
  });
}

// ── API Endpoints ───────────────────────────────────────────────

// GET /api/logistics/grid — lightweight grid for initial render
router.get('/grid', (req, res) => {
  res.json(slimGrid);
});

// GET /api/logistics/config — grid configuration
router.get('/config', (req, res) => {
  res.json(gridConfig);
});

// GET /api/logistics/spot/:bay/:row/:col — full car details
router.get('/spot/:bay/:row/:col', (req, res) => {
  const { bay, row, col } = req.params;
  const sr = parseInt(row);
  const sc = parseInt(col);
  const spot = spotIndex[bay]?.[sr]?.[sc];
  if (!spot) {
    return res.status(404).json({ error: 'Spot not found or empty' });
  }
  res.json({
    ...spot,
    location: { bay, row: sr, col: sc },
  });
});

// GET /api/logistics/search?brand=X&model=Y&trim=Z&year=N&color=C
router.get('/search', (req, res) => {
  const { brand, model, trim, year, color } = req.query;
  let results = searchIndex;
  if (brand) results = results.filter(s => s.brand === brand);
  if (model) results = results.filter(s => s.model === model);
  if (trim) results = results.filter(s => s.trim === trim);
  if (year) results = results.filter(s => String(s.year) === year);
  if (color) results = results.filter(s => s.color === color);

  res.json({
    count: results.length,
    spots: results.map(s => ({ bay: s.bay, row: s.row, col: s.col })),
  });
});

// GET /api/logistics/search/vin?q=JTM18
router.get('/search/vin', (req, res) => {
  const q = (req.query.q || '').toUpperCase();
  if (q.length < 3) {
    return res.json({ count: 0, spots: [] });
  }
  const results = searchIndex.filter(s => s.vin && s.vin.toUpperCase().includes(q));
  res.json({
    count: results.length,
    spots: results.map(s => ({
      bay: s.bay, row: s.row, col: s.col,
      brand: s.brand, model: s.model, vin: s.vin,
    })),
  });
});

// GET /api/logistics/filters — available filter options
router.get('/filters', (req, res) => {
  const brands = [...new Set(searchIndex.map(s => s.brand))].sort();
  const models = {};
  const trims = {};
  const years = [...new Set(searchIndex.map(s => s.year))].sort();
  const colors = [...new Set(searchIndex.map(s => s.color))].sort();

  searchIndex.forEach(s => {
    if (!models[s.brand]) models[s.brand] = new Set();
    models[s.brand].add(s.model);
    const mk = `${s.brand}|${s.model}`;
    if (!trims[mk]) trims[mk] = new Set();
    trims[mk].add(s.trim);
  });

  // Convert sets to arrays
  for (const k of Object.keys(models)) models[k] = [...models[k]].sort();
  for (const k of Object.keys(trims)) trims[k] = [...trims[k]].sort();

  res.json({ brands, models, trims, years, colors });
});

module.exports = router;
