const express = require('express');
const router = express.Router();
const data = require('../data/salesInsights');

function getParams(req) {
  return {
    month: req.query.month || new Date().toISOString().slice(0, 7),
    period: req.query.period || 'MTD',
    filters: { country: req.query.country, brand: req.query.brand, showroom: req.query.showroom, model: req.query.model },
  };
}

router.get('/overview', (req, res) => {
  const { month, period, filters } = getParams(req);
  res.json(data.getOverview(month, period, filters));
});

router.get('/daily', (req, res) => {
  const { month, period, filters } = getParams(req);
  res.json(data.getDailySales(month, period, filters));
});

router.get('/model-channel', (req, res) => {
  const { month, period, filters } = getParams(req);
  res.json(data.getModelChannel(month, period, filters));
});

router.get('/showroom', (req, res) => {
  const { month, period, filters } = getParams(req);
  res.json(data.getShowroomView(month, period, filters));
});

// GET /api/sales-insights/geo?country=
router.get('/geo', (req, res) => {
  res.json(data.getGeo({ country: req.query.country }));
});

module.exports = router;
