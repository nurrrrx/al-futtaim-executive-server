const express = require('express');
const router = express.Router();
const data = require('../data/customerIntelligence');

function getParams(req) {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const period = req.query.period || 'MTD';
  return { month, period };
}

// GET /api/customer-intelligence/overview?month=2026-03&period=MTD
router.get('/overview', (req, res) => {
  const { month, period } = getParams(req);
  res.json(data.getOverview(month, period));
});

// GET /api/customer-intelligence/sentiment?month=2026-03
router.get('/sentiment', (req, res) => {
  const { month, period } = getParams(req);
  res.json(data.getSentiment(month, period));
});

// GET /api/customer-intelligence/brand-comparison?month=&period=&country=&brand=&model=
// Returns aggregate per-brand metrics + brandModels picker map; when brand AND
// model are passed it also returns the dimensional donut data.
router.get('/brand-comparison', (req, res) => {
  const { month, period } = getParams(req);
  const country = req.query.country || undefined;
  const brand = req.query.brand || undefined;
  const model = req.query.model || undefined;
  res.json(data.getBrandComparison(month, period, { country, brand, model }));
});

module.exports = router;
