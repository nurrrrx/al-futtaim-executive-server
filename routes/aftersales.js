const express = require('express');
const router = express.Router();
const data = require('../data/aftersales');

function getParams(req) {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const period = req.query.period || 'MTD';
  const country = req.query.country || undefined;
  const brand = req.query.brand || undefined;
  const branch = req.query.branch || undefined;
  return { month, period, country, brand, branch };
}

// GET /api/aftersales/workshop?month=&period=&country=&brand=&branch=
// Returns: { month, period, country, brand, branch,
//            brands: { [brand]: { kpis, vinVisitsByBrand, workshops } } }
router.get('/workshop', (req, res) => {
  const { month, period, country, brand, branch } = getParams(req);
  res.json(data.getWorkshop(month, period, { country, brand, branch }));
});

// GET /api/aftersales/details?month=&period=&country=&brand=
// Returns: { month, period, kpis, vinVisitsByBrand, workshopBubbles, averages }
router.get('/details', (req, res) => {
  const { month, period, country, brand } = getParams(req);
  res.json(data.getDetails(month, period, { country, brand }));
});

module.exports = router;
