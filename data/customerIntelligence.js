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

/** Per-(brand, model) demographic donut/bar dimensions used by brand-comparison.tsx */
function buildDimensions(brand, model, month, period) {
  const seed = `cust-dim-${brand}-${model}-${month}-${period}`;
  const rng = new SeededRandom(seed);
  const r = (variance, base) => Math.round(rng.vary(base, variance));

  const nat = (() => {
    const a = r(0.2, 32), b = r(0.18, 18), c = r(0.18, 14), d = r(0.18, 11), e = r(0.25, 8);
    const sum = a + b + c + d + e;
    return [
      { value: a, label: 'Indian',    color: '#1192e8' },
      { value: b, label: 'Emirati',   color: '#6929c4' },
      { value: c, label: 'Pakistani', color: '#005d5d' },
      { value: d, label: 'Filipino', color: '#9f1853' },
      { value: e, label: 'Other',    color: '#fa4d56' },
    ].map(x => ({ ...x, value: Math.round((x.value / sum) * 100) }));
  })();
  const total = `${r(0.2, 12)}K`;

  const m = r(0.2, 60); // married %
  const c = r(0.2, 35); // cash %
  const buy = r(0.18, 65); // buyers %
  const nu = r(0.2, 55); // new %
  const fem = r(0.25, 30); // female %

  return {
    'Top 5 Nationalities': { items: nat, centerLabel: 'Total', centerValue: total, sizeScale: 0.6 },
    'Marital Status': {
      items: [{ value: m, label: 'Married', color: '#1192e8' }, { value: 100 - m, label: 'Single', color: '#6929c4' }],
      centerLabel: 'Split', centerValue: '100%', sizeScale: 0.6,
    },
    'Cash vs Finance': {
      items: [{ value: c, label: 'Cash', color: '#005d5d' }, { value: 100 - c, label: 'Finance', color: '#1192e8' }],
      centerLabel: 'Method', centerValue: '100%', sizeScale: 0.6,
    },
    'Buyers vs Leasing': {
      items: [{ value: buy, label: 'Buyers', color: '#6929c4' }, { value: 100 - buy, label: 'Leasing', color: '#9f1853' }],
      centerLabel: 'Type', centerValue: '100%', sizeScale: 0.6,
    },
    'New vs Used': {
      items: [{ value: nu, label: 'New', color: '#1192e8' }, { value: 100 - nu, label: 'Used', color: '#fa4d56' }],
      centerLabel: 'Condition', centerValue: '100%', sizeScale: 0.6,
    },
    'Gender & Age Distribution': {
      female: { value: `${fem}%`, count: `${r(0.3, 8)}K` },
      male:   { value: `${100 - fem}%`, count: `${r(0.3, 18)}K` },
      ageGroups: ['< 19', '19-25', '26-35', '36-45', '46-55', '> 55'],
      femaleValues: [r(0.4, 5), r(0.3, 18), r(0.3, 22), r(0.3, 16), r(0.3, 12), r(0.3, 8)],
      maleValues:   [r(0.4, 8), r(0.3, 22), r(0.3, 28), r(0.3, 18), r(0.3, 12), r(0.3, 8)],
    },
  };
}

/**
 * GET /api/customer-intelligence/brand-comparison?month=&period=&country=&brand=&model=
 *
 * Always returns:
 *   - brands: aggregate per-brand metrics (NPS / CSAT / sentiment / etc.)
 *   - brandModels: brand → models[] (powers the page's brand+model picker)
 *
 * When both brand AND model are supplied, also returns:
 *   - dimensions: per-(brand,model) demographic dimensions for the donut/bar
 *     comparison charts (Top 5 Nationalities / Marital Status / etc.)
 */
function getBrandComparison(month, period, { country, brand, model } = {}) {
  const { BRANDS: ALL_BRANDS, BRAND_MODELS } = require('./brandsModels');
  const cMul = country ? (String(country).toLowerCase() === 'uae' ? 0.6
                       : String(country).toLowerCase() === 'ksa' ? 0.22 : 0.06) : 1;

  const brands = ALL_BRANDS.map(b => {
    const brng = new SeededRandom(`brand-comp-${b}-${country || 'all'}-${month}-${period}`);
    return {
      brand: b,
      nps: fmtDec(brng.vary(72, 0.12)),
      csat: fmtDec(brng.vary(80, 0.08)),
      sentiment: fmtDec(brng.vary(75, 0.1)),
      activeCustomers: Math.round(brng.vary((b === 'Toyota' ? 85000 : 25000) * cMul, 0.1)),
      demographics: { avgAge: Math.round(brng.vary(38, 0.1)), malePct: Math.round(brng.vary(70, 0.08)) },
    };
  });

  const brandModels = {};
  for (const b of ALL_BRANDS) brandModels[b] = (BRAND_MODELS[b] || []).slice();

  const dimensions = (brand && model) ? buildDimensions(brand, model, month, period) : null;

  return {
    month, period,
    country: country || null, brand: brand || null, model: model || null,
    brands, brandModels, dimensions,
  };
}

module.exports = { getOverview, getSentiment, getBrandComparison };
