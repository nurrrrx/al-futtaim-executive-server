const express = require('express');
const router = express.Router();
const data = require('../data/leadManagement');

function getParams(req) {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const period = req.query.period || 'MTD';
  return { month, period };
}

// GET /api/lead-management/overview?month=2026-03&period=MTD
router.get('/overview', (req, res) => {
  const { month, period } = getParams(req);
  res.json(data.getOverview(month, period));
});

// GET /api/lead-management/brands?month=2026-03&period=MTD
router.get('/brands', (req, res) => {
  const { month, period } = getParams(req);
  res.json(data.getBrandBreakdown(month, period));
});

module.exports = router;
