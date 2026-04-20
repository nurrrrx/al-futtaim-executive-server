const express = require('express');
const router = express.Router();
const data = require('../data/stockLogistics');

function getParams(req) {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const period = req.query.period || 'MTD';
  return { month, period };
}

// GET /api/stock-logistics/overview?month=2026-03&period=MTD
router.get('/overview', (req, res) => {
  const { month, period } = getParams(req);
  res.json(data.getOverview(month, period));
});

// GET /api/stock-logistics/logistics?month=2026-03
router.get('/logistics', (req, res) => {
  const { month, period } = getParams(req);
  res.json(data.getLogistics(month, period));
});

module.exports = router;
