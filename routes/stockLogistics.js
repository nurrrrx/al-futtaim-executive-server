const express = require('express');
const router = express.Router();
const data = require('../data/stockLogistics');

function getParams(req) {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const period = req.query.period || 'MTD';
  const country = req.query.country || undefined;
  const brand = req.query.brand || undefined;
  const branch = req.query.branch || undefined;
  return { month, period, country, brand, branch };
}

// GET /api/stock-logistics/overview?month=&period=&country=&brand=
router.get('/overview', (req, res) => {
  const { month, period, country, brand } = getParams(req);
  res.json(data.getOverview(month, period, { country, brand }));
});

// GET /api/stock-logistics/logistics?month=&period=&country=&brand=
router.get('/logistics', (req, res) => {
  const { month, period, country, brand } = getParams(req);
  res.json(data.getLogistics(month, period, { country, brand }));
});

// GET /api/stock-logistics/distribution?month=&period=&country=&brand=&branch=
// Preparation/PDI/transfer pipeline + brand & showroom volumes.
router.get('/distribution', (req, res) => {
  const { month, period, country, brand, branch } = getParams(req);
  res.json(data.getDistribution(month, period, { country, brand, branch }));
});

module.exports = router;
