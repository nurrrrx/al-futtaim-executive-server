const express = require('express');
const router = express.Router();
const data = require('../data/leadManagement');

function getParams(req) {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const period = req.query.period || 'MTD';
  return { month, period };
}

// GET /api/lead-management/funnel?month=2026-03&period=MTD
// Returns: stages (KPI cards), funnel conversions, conversion time series,
//          lost reasons per transition, reactivation, and per-brand breakdown.
router.get('/funnel', (req, res) => {
  const { month, period } = getParams(req);
  res.json(data.getFunnel(month, period));
});

// GET /api/lead-management/geo?month=2026-03&period=MTD
// Returns: per-region KPIs, brand conversions, and model breakdowns.
router.get('/geo', (req, res) => {
  const { month, period } = getParams(req);
  res.json(data.getGeo(month, period));
});

module.exports = router;
