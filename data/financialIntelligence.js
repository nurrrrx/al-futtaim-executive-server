const { SeededRandom, fmt, fmtDec, deltaObj, seasonFactor, yearTrend } = require('./seedEngine');

const MONTH_KEYS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseMonth(m) { const [y, mo] = m.split('-').map(Number); return { year: y, month: mo }; }

/** GET /api/financial-intelligence/overview */
function getOverview(month, period) {
  const { year, month: m } = parseMonth(month);
  const sf = seasonFactor(m);
  const yt = yearTrend(year);
  const rng = new SeededRandom(`fin-overview-${month}`);

  const revenue = fmtDec(rng.vary(2.8 * sf * yt, 0.1), 1);
  const lyRevenue = fmtDec(rng.vary(revenue * 1.06, 0.08), 1);
  const ebit = fmtDec(rng.vary(0.42 * sf * yt, 0.12), 2);
  const lyEbit = fmtDec(rng.vary(ebit * 1.08, 0.1), 2);
  const ebitPct = fmtDec((ebit / revenue) * 100);
  const lyEbitPct = fmtDec((lyEbit / lyRevenue) * 100);
  const indirectCostPct = fmtDec(rng.vary(12.5, 0.1));
  const lyIndirectCostPct = fmtDec(rng.vary(indirectCostPct + 0.3, 0.12));
  const fcf = fmtDec(rng.vary(0.18 * sf * yt, 0.15), 2);
  const lyFcf = fmtDec(rng.vary(fcf * 1.1, 0.12), 2);
  const roce = fmtDec(rng.vary(15.2, 0.1));
  const lyRoce = fmtDec(rng.vary(roce - 0.8, 0.12));
  const grossMargin = fmtDec(rng.vary(18.5, 0.08));
  const lyGrossMargin = fmtDec(rng.vary(grossMargin - 0.4, 0.1));
  const workingCapital = fmtDec(rng.vary(0.65 * yt, 0.1), 2);
  const lyWorkingCapital = fmtDec(rng.vary(workingCapital * 1.05, 0.08), 2);

  const kpi = {
    revenue: { value: revenue, unit: 'AED B', lastYear: lyRevenue, vsLastYear: deltaObj(((revenue - lyRevenue) / lyRevenue) * 100) },
    ebit: { value: ebit, unit: 'AED B', lastYear: lyEbit, vsLastYear: deltaObj(((ebit - lyEbit) / lyEbit) * 100) },
    ebitPct: { value: ebitPct, unit: '%', lastYear: lyEbitPct, delta: fmtDec(ebitPct - lyEbitPct) },
    indirectCostPct: { value: indirectCostPct, unit: '%', lastYear: lyIndirectCostPct, delta: fmtDec(indirectCostPct - lyIndirectCostPct) },
    fcf: { value: fcf, unit: 'AED B', lastYear: lyFcf, vsLastYear: deltaObj(((fcf - lyFcf) / lyFcf) * 100) },
    roce: { value: roce, unit: '%', lastYear: lyRoce, delta: fmtDec(roce - lyRoce) },
    grossMargin: { value: grossMargin, unit: '%', lastYear: lyGrossMargin, delta: fmtDec(grossMargin - lyGrossMargin) },
    workingCapital: { value: workingCapital, unit: 'AED B', lastYear: lyWorkingCapital, vsLastYear: deltaObj(((workingCapital - lyWorkingCapital) / lyWorkingCapital) * 100) },
  };

  // Monthly forecast
  const monthlyForecast = MONTH_KEYS.map((mk, i) => {
    const prng = new SeededRandom(`fin-plan-${year}-${i}`);
    const isActual = i < m;
    return {
      month: mk,
      group: isActual ? 'Actuals' : 'Forecast',
      revenue: fmtDec(prng.vary(revenue / 12 * seasonFactor(i + 1), 0.1) * 12, 1),
      ebit: fmtDec(prng.vary(ebit / 12 * seasonFactor(i + 1), 0.12) * 12, 2),
    };
  });

  return { month, period, kpi, monthlyForecast };
}

/** GET /api/financial-intelligence/profitability */
function getProfitability(month, period) {
  const { year, month: m } = parseMonth(month);
  const rng = new SeededRandom(`fin-profit-${month}`);
  const sf = seasonFactor(m);

  const brands = [
    { name: 'Toyota & Lexus UAE', baseRev: 1.8, baseEbit: 0.28 },
    { name: 'BYD Brands', baseRev: 0.45, baseEbit: 0.05 },
    { name: 'Honda', baseRev: 0.25, baseEbit: 0.03 },
    { name: 'Jeep & Dodge', baseRev: 0.18, baseEbit: 0.02 },
    { name: 'Volvo & Polestar', baseRev: 0.12, baseEbit: 0.01 },
  ].map(b => {
    const brng = new SeededRandom(`profit-${b.name}-${month}`);
    const rev = fmtDec(brng.vary(b.baseRev * sf, 0.1), 2);
    const ebit = fmtDec(brng.vary(b.baseEbit * sf, 0.15), 3);
    return {
      brand: b.name,
      revenue: rev,
      ebit,
      ebitPct: fmtDec((ebit / rev) * 100),
      vsLastYear: deltaObj(brng.float(-8, 12)),
      vsTarget: deltaObj(brng.float(-5, 10)),
    };
  });

  return { month, period, brands };
}

/** GET /api/financial-intelligence/indirect-costs */
function getIndirectCosts(month, period) {
  const rng = new SeededRandom(`fin-indirect-${month}`);

  const categories = [
    { name: 'Staff Costs', basePct: 42 },
    { name: 'Marketing', basePct: 18 },
    { name: 'Rent & Facilities', basePct: 15 },
    { name: 'IT & Systems', basePct: 10 },
    { name: 'Other Overheads', basePct: 15 },
  ].map(c => {
    const crng = new SeededRandom(`indirect-${c.name}-${month}`);
    const pct = Math.round(crng.vary(c.basePct, 0.1));
    return { category: c.name, pct, value: fmtDec(crng.vary(pct * 0.8, 0.12), 1), unit: 'AED M', vsLastYear: deltaObj(crng.float(-5, 8)) };
  });

  return { month, period, categories, totalPct: fmtDec(rng.vary(12.5, 0.08)) };
}

/** GET /api/financial-intelligence/fcf */
function getFCF(month, period) {
  const { year, month: m } = parseMonth(month);
  const rng = new SeededRandom(`fin-fcf-${month}`);

  const components = [
    { name: 'Operating Cash Flow', base: 320 },
    { name: 'CapEx', base: -85 },
    { name: 'Working Capital Change', base: -45 },
    { name: 'Tax', base: -32 },
    { name: 'Other', base: -18 },
  ].map(c => {
    const crng = new SeededRandom(`fcf-${c.name}-${month}`);
    const val = Math.round(crng.vary(c.base, 0.15));
    return { name: c.name, value: val, unit: 'AED M', vsLastYear: deltaObj(crng.float(-10, 15)) };
  });

  const fcf = components.reduce((sum, c) => sum + c.value, 0);

  return { month, period, fcf: { value: fcf, unit: 'AED M' }, components };
}

module.exports = { getOverview, getProfitability, getIndirectCosts, getFCF };
