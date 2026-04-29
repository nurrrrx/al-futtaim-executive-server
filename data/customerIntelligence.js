const { SeededRandom, fmtDec, seasonFactor, yearTrend } = require('./seedEngine');

function parseMonth(m) { const [y, mo] = m.split('-').map(Number); return { year: y, month: mo }; }

/** GET /api/customer-intelligence/overview */
function getOverview(month, period) {
  const { year, month: m } = parseMonth(month);
  const sf = seasonFactor(m);
  const rng = new SeededRandom(`cust-overview-${month}`);

  const kpi = {
    activeCustomers: { value: Math.round(rng.vary(185000, 0.05)), vsLastYear: fmtDec(rng.float(2, 8)) },
    newlyJoined: { value: Math.round(rng.vary(4200 * sf, 0.12)), vsLastYear: fmtDec(rng.float(-5, 15)) },
    blueCustomers: { value: Math.round(rng.vary(42000, 0.06)), vsLastYear: fmtDec(rng.float(1, 6)) },
    npsSales: { value: fmtDec(rng.vary(72, 0.08)), vsLastYear: fmtDec(rng.float(-3, 5)) },
    npsAftersales: { value: fmtDec(rng.vary(68, 0.08)), vsLastYear: fmtDec(rng.float(-4, 6)) },
    sentimentScore: { value: fmtDec(rng.vary(78, 0.06)), vsLastYear: fmtDec(rng.float(-2, 4)) },
    csatScore: { value: fmtDec(rng.vary(82, 0.05)), vsLastYear: fmtDec(rng.float(-1, 3)) },
  };

  const nationalities = [
    { label: 'Indian', pct: 32 }, { label: 'Emirati', pct: 18 }, { label: 'Pakistani', pct: 14 },
    { label: 'Filipino', pct: 11 }, { label: 'Egyptian', pct: 8 },
  ].map(n => ({ ...n, pct: Math.round(rng.vary(n.pct, 0.1)) }));

  const gender = { male: Math.round(rng.vary(68, 0.05)), female: Math.round(rng.vary(32, 0.05)) };
  const ageGroups = [
    { range: '18-25', pct: 8 }, { range: '26-35', pct: 28 }, { range: '36-45', pct: 32 },
    { range: '46-55', pct: 18 }, { range: '56-65', pct: 10 }, { range: '65+', pct: 4 },
  ].map(a => ({ ...a, pct: Math.round(rng.vary(a.pct, 0.12)) }));

  return { month, period, kpi, demographics: { nationalities, gender, ageGroups } };
}

/** GET /api/customer-intelligence/sentiment */
function getSentiment(month, period) {
  const rng = new SeededRandom(`cust-sentiment-${month}`);

  const topics = ['Service Quality', 'Wait Time', 'Staff Friendliness', 'Price Transparency', 'Vehicle Quality', 'Delivery Experience'].map(t => {
    const trng = new SeededRandom(`topic-${t}-${month}`);
    const positive = Math.round(trng.vary(65, 0.2));
    return {
      topic: t,
      positive,
      negative: 100 - positive,
      totalMentions: Math.round(trng.vary(450, 0.3)),
      trend: fmtDec(trng.float(-5, 8)),
    };
  });

  const overall = { positive: Math.round(rng.vary(72, 0.08)), negative: Math.round(rng.vary(28, 0.08)) };

  return { month, period, overall, topics };
}

/** GET /api/customer-intelligence/brand-comparison */
function getBrandComparison(month, period) {
  const rng = new SeededRandom(`brand-comp-${month}`);
  const { BRANDS: ALL_BRANDS } = require('./brandsModels');
  const brands = ALL_BRANDS.map(b => {
    const brng = new SeededRandom(`brand-comp-${b}-${month}`);
    return {
      brand: b,
      nps: fmtDec(brng.vary(72, 0.12)),
      csat: fmtDec(brng.vary(80, 0.08)),
      sentiment: fmtDec(brng.vary(75, 0.1)),
      activeCustomers: Math.round(brng.vary(b === 'Toyota' ? 85000 : 25000, 0.1)),
      demographics: { avgAge: Math.round(brng.vary(38, 0.1)), malePct: Math.round(brng.vary(70, 0.08)) },
    };
  });

  return { month, period, brands };
}

module.exports = { getOverview, getSentiment, getBrandComparison };
