const express = require('express');
const router = express.Router();
const data = require('../data/marketIntelligence');

function getParams(req) {
  return {
    month: req.query.month || new Date().toISOString().slice(0, 7),
    period: req.query.period || 'MTD',
    filters: { country: req.query.country, brand: req.query.brand },
  };
}

router.get('/overview', (req, res) => {
  const { month, period, filters } = getParams(req);
  res.json(data.getOverview(month, period, filters));
});

router.get('/detail', (req, res) => {
  const { month, period, filters } = getParams(req);
  const country = req.query.country;
  if (!country) return res.status(400).json({ error: 'country parameter required' });
  const result = data.getCountryDetail(country, month, period, filters);
  if (!result) return res.status(404).json({ error: 'Country not found' });
  res.json(result);
});

router.get('/competition', (req, res) => {
  const { month, period, filters } = getParams(req);
  res.json(data.getCompetitionIntelligence(month, period, filters));
});

router.get('/geo', (req, res) => {
  res.json(data.getGeoConfig());
});

module.exports = router;
