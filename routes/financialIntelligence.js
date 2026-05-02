const express = require('express');
const router = express.Router();
const data = require('../data/financialIntelligence');

function getParams(req) {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const period = req.query.period || 'MTD';
  const target = req.query.target || 'Budget';
  return { month, period, target };
}

// GET /api/financial-intelligence/overview?month=2026-03&period=MTD&target=Budget
router.get('/overview', (req, res) => {
  const { month, period, target } = getParams(req);
  res.json(data.getOverview(month, period, target));
});

// GET /api/financial-intelligence/profitability?month=2026-03
router.get('/profitability', (req, res) => {
  const { month, period } = getParams(req);
  res.json(data.getProfitability(month, period));
});

// GET /api/financial-intelligence/indirect-costs?month=2026-03
router.get('/indirect-costs', (req, res) => {
  const { month, period } = getParams(req);
  res.json(data.getIndirectCosts(month, period));
});

// GET /api/financial-intelligence/fcf?month=2026-03
router.get('/fcf', (req, res) => {
  const { month, period } = getParams(req);
  res.json(data.getFCF(month, period));
});

module.exports = router;
