const express = require('express');
const router = express.Router();
const data = require('../data/aftersales');

function getParams(req) {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const period = req.query.period || 'MTD';
  const brand = req.query.brand || undefined;
  return { month, period, brand };
}

// GET /api/aftersales/workshop?month=2026-03&period=MTD&brand=Toyota
// Returns: { month, period, brands: { [brand]: { kpis, vinVisitsByBrand, workshops } } }
router.get('/workshop', (req, res) => {
  const { month, period, brand } = getParams(req);
  res.json(data.getWorkshop(month, period, { brand }));
});

// GET /api/aftersales/details?month=2026-03&period=MTD
// Returns: { month, period, kpis, vinVisitsByBrand, workshopBubbles, averages }
router.get('/details', (req, res) => {
  const { month, period } = getParams(req);
  res.json(data.getDetails(month, period));
});

module.exports = router;
