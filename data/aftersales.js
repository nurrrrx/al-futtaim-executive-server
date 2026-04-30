/**
 * Aftersales data generator.
 *
 * Endpoints:
 *   - getWorkshop(month, period, brand?) → KPI cards, VIN-visits-by-model, per-workshop breakdown
 *   - getDetails(month, period)          → KPI sparkline cards, VIN visits by brand, workshop bubbles
 *
 * Period semantics:
 *   - MTD: values for the selected month only
 *   - YTD: cumulative sum of months 1..m of the selected year
 */
const { SeededRandom, fmtDec, seasonFactor, yearTrend, deltaObj } = require('./seedEngine');
const { BRANDS } = require('./brandsModels');

function parseMonth(m) { const [y, mo] = m.split('-').map(Number); return { year: y, month: mo }; }

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Per-brand baseline VIN visits per month (workshop volume baseline)
const BRAND_BASE_VISITS = {
  Toyota: 12000, Lexus: 4200, BYD: 1800, Honda: 5400, Volvo: 1100, Polestar: 280,
  Jeep: 2100, Denza: 90, YangWang: 30, Dodge: 700, RAM: 600, Chrysler: 250,
};

// Per-brand model lists for "VIN visits by model" chart (top 10 service-frequent)
const BRAND_TOP_MODELS = {
  Toyota: ['Land Cruiser', 'Hilux', 'Camry', 'Rav4', 'Corolla', 'Fortuner', 'Yaris', 'Raize', 'Prado', 'Granvia'],
  Lexus: ['LX600', 'NX350', 'RX350', 'ES350', 'GX460', 'IS300', 'UX300h', 'LS500', 'LC500', 'NX350h'],
  BYD: ['Atto 3', 'Seal', 'Han', 'Sealion 5', 'Dolphin', 'Tang', 'Song Plus', 'Atto 8', 'Seal 6', 'Yuan Plus'],
  Honda: ['Civic', 'Accord', 'CR-V', 'HR-V', 'Pilot', 'Passport', 'Odyssey', 'City', 'BR-V', 'Jazz'],
  Volvo: ['XC40', 'XC60', 'XC90', 'EX30', 'EX90', 'S60', 'S90', 'V60', 'V90', 'C40'],
  Polestar: ['Polestar 2', 'Polestar 3', 'Polestar 4', 'Polestar 5', 'Polestar 6'],
  Jeep: ['Wrangler', 'Grand Cherokee', 'Cherokee', 'Compass', 'Renegade', 'Gladiator', 'Wagoneer', 'Grand Wagoneer'],
  Denza: ['D9', 'N7', 'N8', 'Z9', 'Z9 GT'],
  YangWang: ['U8', 'U9', 'U7'],
  Dodge: ['Charger', 'Challenger', 'Durango', 'Hornet', 'Journey'],
  RAM: ['1500', '2500', '3500', 'Promaster', 'TRX'],
  Chrysler: ['300', '300C', 'Pacifica', 'Voyager'],
};

// Workshop locations per region (used by workshop endpoint)
const WORKSHOPS = [
  { name: 'SZR', region: 'UAE' },
  { name: 'Festival City', region: 'UAE' },
  { name: 'Abu Dhabi', region: 'UAE' },
  { name: 'Mussafah', region: 'UAE' },
  { name: 'Al Ain', region: 'UAE' },
  { name: 'Sharjah', region: 'UAE' },
  { name: 'Deira', region: 'UAE' },
  { name: 'Ajman', region: 'UAE' },
  { name: 'Fujairah', region: 'UAE' },
  { name: 'RAK', region: 'UAE' },
  { name: 'UAQ', region: 'UAE' },
  { name: 'Khorfakkan', region: 'UAE' },
];

/** Month-aware visit count for a given seed prefix: respects MTD vs YTD. */
function visitsForPeriod(seedPrefix, baseVisits, year, m, period) {
  const isYTD = String(period).toUpperCase() === 'YTD';
  const yt = yearTrend(year);
  if (!isYTD) {
    const prng = new SeededRandom(`${seedPrefix}-${year}-${m}`);
    return Math.round(prng.vary(baseVisits * seasonFactor(m) * yt, 0.10));
  }
  let acc = 0;
  for (let i = 1; i <= m; i++) {
    const prng = new SeededRandom(`${seedPrefix}-${year}-${i}`);
    acc += prng.vary(baseVisits * seasonFactor(i) * yt, 0.10);
  }
  return Math.round(acc);
}

function fmt(n) { return Math.round(n).toLocaleString('en-US'); }

function buildKpi(rng, current, lastYear, target, formatter = fmt) {
  const vsLY = ((current - lastYear) / Math.max(lastYear, 1)) * 100;
  const vsT = ((current - target) / Math.max(target, 1)) * 100;
  return {
    value: formatter(current),
    vsLastYear: deltaObj(vsLY),
    vsTarget: deltaObj(vsT),
  };
}

function brandWorkshop(brand, month, period) {
  const { year, month: m } = parseMonth(month);
  const rng = new SeededRandom(`aftersales-workshop-${brand}-${month}-${period}`);
  const baseVisits = BRAND_BASE_VISITS[brand] ?? 1000;

  const vinVisits = visitsForPeriod(`aftersales-workshop-${brand}`, baseVisits, year, m, period);
  const lastYearVinVisits = visitsForPeriod(`aftersales-workshop-${brand}`, baseVisits, year - 1, m, period);
  const targetVinVisits = Math.round(vinVisits * rng.vary(0.97, 0.04));

  // Operational ratios — period-invariant (don't accumulate)
  const soldHoursPerVin = rng.vary(2.7, 0.18);
  const soldHoursPerVinLY = rng.vary(2.7, 0.20);
  const soldHoursPerVinTgt = rng.vary(2.85, 0.10);

  const utilization = Math.round(rng.vary(78, 0.08));
  const utilizationLY = Math.round(rng.vary(76, 0.10));
  const utilizationTgt = 80;

  const productivity = Math.round(rng.vary(91, 0.06));
  const productivityLY = Math.round(rng.vary(90, 0.07));
  const productivityTgt = 92;

  const efficiency = Math.round(rng.vary(104, 0.06));
  const efficiencyLY = Math.round(rng.vary(101, 0.06));
  const efficiencyTgt = 102;

  const kpis = {
    vinVisits: buildKpi(rng, vinVisits, lastYearVinVisits, targetVinVisits),
    soldHoursPerVin: buildKpi(rng, soldHoursPerVin, soldHoursPerVinLY, soldHoursPerVinTgt, n => n.toFixed(1)),
    utilization: buildKpi(rng, utilization, utilizationLY, utilizationTgt, n => `${Math.round(n)}%`),
    productivity: buildKpi(rng, productivity, productivityLY, productivityTgt, n => `${Math.round(n)}%`),
    efficiency: buildKpi(rng, efficiency, efficiencyLY, efficiencyTgt, n => `${Math.round(n)}%`),
  };

  // VIN visits broken down by top model — values sum approx to vinVisits
  const models = BRAND_TOP_MODELS[brand] || [];
  const weights = models.map((_, i) => Math.pow(0.78, i)); // exponential decay
  const wSum = weights.reduce((a, b) => a + b, 0) || 1;
  const vinVisitsByBrand = models.map((label, i) => {
    const share = weights[i] / wSum;
    const value = Math.round(vinVisits * share * rng.vary(1, 0.06));
    const lastYearValue = Math.round(lastYearVinVisits * share * rng.vary(1, 0.08));
    const targetValue = Math.round(value * rng.vary(0.98, 0.05));
    return {
      label,
      value,
      vsLastYear: deltaObj(((value - lastYearValue) / Math.max(lastYearValue, 1)) * 100),
      vsTarget: deltaObj(((value - targetValue) / Math.max(targetValue, 1)) * 100),
    };
  });

  // Per-workshop split — sum approx to vinVisits
  const wsWeights = WORKSHOPS.map((_, i) => Math.pow(0.85, i));
  const wsSum = wsWeights.reduce((a, b) => a + b, 0) || 1;
  const workshops = WORKSHOPS.map((w, i) => {
    const share = wsWeights[i] / wsSum;
    const wsRng = new SeededRandom(`aftersales-ws-${brand}-${w.name}-${month}-${period}`);
    return {
      name: w.name,
      brand,
      vinVisits: Math.round(vinVisits * share * wsRng.vary(1, 0.08)),
      efficiency: Math.round(wsRng.vary(95, 0.12)),
      soldHoursPerVin: +wsRng.vary(2.7, 0.18).toFixed(1),
      utilization: Math.round(wsRng.vary(76, 0.10)),
      productivity: Math.round(wsRng.vary(90, 0.08)),
    };
  });

  return { kpis, vinVisitsByBrand, workshops };
}

/** GET /api/aftersales/workshop?month=&period=&brand= */
function getWorkshop(month, period, { brand } = {}) {
  const brandList = brand ? [brand] : BRANDS;
  const brands = {};
  for (const b of brandList) brands[b] = brandWorkshop(b, month, period);
  return { month, period, brands };
}

/** Build a sparkline of weekly points for the last 13 weeks ending on the selected month. */
function buildSparkline(seedPrefix, baseValue, month, period) {
  const { year, month: m } = parseMonth(month);
  const isYTD = String(period).toUpperCase() === 'YTD';
  const weeks = 13;

  const points = [];
  // Anchor end-of-period to last day of selected month
  const anchor = new Date(Date.UTC(year, m - 1, 28));
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setUTCDate(anchor.getUTCDate() - i * 7);
    const dd = d.getUTCDate();
    const mm = MONTH_LABELS[d.getUTCMonth()];
    const monthForSeed = d.getUTCMonth() + 1;
    const yearForSeed = d.getUTCFullYear();
    const prng = new SeededRandom(`${seedPrefix}-${yearForSeed}-${monthForSeed}-${i}`);
    const sf = seasonFactor(monthForSeed);
    const yt = yearTrend(yearForSeed);
    const v = Math.round(prng.vary(baseValue * sf * yt / 4.33, 0.12));
    points.push({ month: `${String(dd).padStart(2, '0')} ${mm}`, value: v });
  }

  const lastYearPoints = points.map((p, i) => {
    const prng = new SeededRandom(`${seedPrefix}-LY-${i}`);
    return { month: p.month, value: Math.round(prng.vary(p.value, 0.18)) };
  });

  // Aggregate value: MTD = sum of last 4 weeks; YTD = sum of all 13 (approximation)
  const aggregate = isYTD
    ? points.reduce((s, p) => s + p.value, 0) * Math.ceil(m / 3) / 4
    : points.slice(-4).reduce((s, p) => s + p.value, 0);
  const aggregateLY = isYTD
    ? lastYearPoints.reduce((s, p) => s + p.value, 0) * Math.ceil(m / 3) / 4
    : lastYearPoints.slice(-4).reduce((s, p) => s + p.value, 0);

  return { points, lastYearPoints, aggregate: Math.round(aggregate), aggregateLY: Math.round(aggregateLY) };
}

/** GET /api/aftersales/details?month=&period= */
function getDetails(month, period) {
  const { year, month: m } = parseMonth(month);
  const fromMonth = MONTH_LABELS[Math.max(0, m - 3)];
  const toMonth = MONTH_LABELS[m - 1];
  const dateRange = `${fromMonth} ${String(year).slice(-2)} – ${toMonth} ${String(year).slice(-2)}`;

  function kpiSpark(seedPrefix, base, unit = '') {
    const { points, lastYearPoints, aggregate, aggregateLY } = buildSparkline(seedPrefix, base, month, period);
    const delta = aggregate - aggregateLY;
    const deltaPct = (delta / Math.max(aggregateLY, 1)) * 100;
    const fmtV = unit === '%' ? `${Math.round(aggregate)}%` : fmt(aggregate);
    const fmtLY = unit === '%' ? `${Math.round(aggregateLY)}%` : fmt(aggregateLY);
    return {
      value: fmtV,
      unit: unit && unit !== '%' ? unit : undefined,
      dateRange,
      lastYear: {
        value: fmtLY,
        delta: `${delta >= 0 ? '+' : ''}${unit === '%' ? Math.round(delta) + '%' : fmt(delta)}`,
        deltaPercent: `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%`,
      },
      sparkline: {
        actuals: points,
        lastYear: lastYearPoints,
      },
    };
  }

  const kpis = {
    vinVisits: kpiSpark('aftersales-details-visits', 12500),
    soldHoursPerVin: kpiSpark('aftersales-details-shpv', 2.7),
    utilization: kpiSpark('aftersales-details-util', 78, '%'),
    productivity: kpiSpark('aftersales-details-prod', 91, '%'),
  };

  // VIN visits by brand (aggregate across all brands)
  const vinVisitsByBrand = BRANDS.map(brand => ({
    label: brand,
    value: visitsForPeriod(`aftersales-details-brand-${brand}`, BRAND_BASE_VISITS[brand] ?? 1000, year, m, period),
  })).sort((a, b) => b.value - a.value);

  // Workshop bubbles — efficiency vs vinVisits scatter for the 12 workshops, summed across brands
  const workshopBubbles = WORKSHOPS.map(w => {
    const wsRng = new SeededRandom(`aftersales-details-ws-${w.name}-${month}-${period}`);
    const visits = Math.round(wsRng.vary(900, 0.5));
    return {
      name: w.name,
      vinVisits: visits,
      efficiency: Math.round(wsRng.vary(95, 0.12)),
      utilization: Math.round(wsRng.vary(76, 0.10)),
      soldHoursPerVin: +wsRng.vary(2.7, 0.18).toFixed(1),
    };
  });

  // Average rows shown on the details page
  const aRng = new SeededRandom(`aftersales-details-averages-${month}-${period}`);
  const averages = {
    industry: { soldHoursPerVin: +aRng.vary(2.5, 0.06).toFixed(1), efficiency: Math.round(aRng.vary(98, 0.04)) },
    company:  { soldHoursPerVin: +aRng.vary(2.7, 0.06).toFixed(1), efficiency: Math.round(aRng.vary(102, 0.04)) },
    target:   { soldHoursPerVin: 2.85, efficiency: 105 },
  };

  return { month, period, kpis, vinVisitsByBrand, workshopBubbles, averages };
}

module.exports = { getWorkshop, getDetails };
