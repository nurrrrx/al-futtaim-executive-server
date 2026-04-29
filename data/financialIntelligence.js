const { SeededRandom, fmtDec, seasonFactor, yearTrend } = require('./seedEngine');

const MONTH_KEYS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseMonth(m) { const [y, mo] = m.split('-').map(Number); return { year: y, month: mo }; }

/** GET /api/financial-intelligence/overview */
function getOverview(month, period) {
  const { year, month: m } = parseMonth(month);
  const sf = seasonFactor(m);
  const yt = yearTrend(year);
  const rng = new SeededRandom(`fin-overview-${month}`);

  const revenue = fmtDec(rng.vary(2.8 * sf * yt, 0.1), 1);
  const revenueLastYear = fmtDec(rng.vary(revenue * 1.06, 0.08), 1);
  const ebit = fmtDec(rng.vary(0.42 * sf * yt, 0.12), 2);
  const ebitLastYear = fmtDec(rng.vary(ebit * 1.08, 0.1), 2);
  const ebitPct = fmtDec((ebit / revenue) * 100);
  const ebitPctLastYear = fmtDec((ebitLastYear / revenueLastYear) * 100);
  const indirectCostPct = fmtDec(rng.vary(12.5, 0.1));
  const indirectCostPctLastYear = fmtDec(rng.vary(indirectCostPct + 0.3, 0.12));
  const fcf = fmtDec(rng.vary(0.18 * sf * yt, 0.15), 2);
  const fcfLastYear = fmtDec(rng.vary(fcf * 1.1, 0.12), 2);
  const roce = fmtDec(rng.vary(15.2, 0.1));
  const roceLastYear = fmtDec(rng.vary(roce - 0.8, 0.12));
  const grossMargin = fmtDec(rng.vary(18.5, 0.08));
  const grossMarginLastYear = fmtDec(rng.vary(grossMargin - 0.4, 0.1));
  const workingCapital = fmtDec(rng.vary(0.65 * yt, 0.1), 2);
  const workingCapitalLastYear = fmtDec(rng.vary(workingCapital * 1.05, 0.08), 2);

  const kpi = {
    revenue: { value: +revenue, lastYear: +revenueLastYear },
    ebit: { value: +ebit, lastYear: +ebitLastYear },
    ebitPct: { value: +ebitPct, lastYear: +ebitPctLastYear },
    indirectCostPct: { value: +indirectCostPct, lastYear: +indirectCostPctLastYear },
    fcf: { value: +fcf, lastYear: +fcfLastYear },
    roce: { value: +roce, lastYear: +roceLastYear },
    grossMargin: { value: +grossMargin, lastYear: +grossMarginLastYear },
    workingCapital: { value: +workingCapital, lastYear: +workingCapitalLastYear },
  };

  const monthlyForecast = MONTH_KEYS.map((mk, i) => {
    const prng = new SeededRandom(`fin-plan-${year}-${i}`);
    const isActual = i < m;
    return {
      month: mk,
      isActual,
      revenue: fmtDec(prng.vary(revenue / 12 * seasonFactor(i + 1), 0.1) * 12, 1),
      ebit: fmtDec(prng.vary(ebit / 12 * seasonFactor(i + 1), 0.12) * 12, 2),
    };
  });

  return { month, period, kpi, monthlyForecast };
}

/** GET /api/financial-intelligence/profitability */
function getProfitability(month, period) {
  const { year, month: m } = parseMonth(month);
  const sf = seasonFactor(m);

  const brands = [
    { name: 'Toyota & Lexus UAE', baseRev: 1.8, baseEbit: 0.28 },
    { name: 'BYD & Denza & YangWang', baseRev: 0.50, baseEbit: 0.06 },
    { name: 'Honda', baseRev: 0.25, baseEbit: 0.03 },
    { name: 'Jeep, Dodge, RAM & Chrysler', baseRev: 0.22, baseEbit: 0.025 },
    { name: 'Volvo & Polestar', baseRev: 0.12, baseEbit: 0.01 },
  ].map(b => {
    const brng = new SeededRandom(`profit-${b.name}-${month}`);
    const rev = fmtDec(brng.vary(b.baseRev * sf, 0.1), 2);
    const ebit = fmtDec(brng.vary(b.baseEbit * sf, 0.15), 3);
    const revLastYear = fmtDec(brng.vary(rev * 1.06, 0.08), 2);
    const ebitLastYear = fmtDec(brng.vary(ebit * 1.08, 0.1), 3);
    return {
      brand: b.name,
      revenue: +rev, revenueLastYear: +revLastYear,
      ebit: +ebit, ebitLastYear: +ebitLastYear,
      ebitPct: fmtDec((ebit / rev) * 100),
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
    const value = fmtDec(crng.vary(pct * 0.8, 0.12), 1);
    const valueLastYear = fmtDec(crng.vary(value * 1.05, 0.08), 1);
    return { category: c.name, pct, value: +value, valueLastYear: +valueLastYear };
  });

  return { month, period, categories, totalPct: fmtDec(rng.vary(12.5, 0.08)) };
}

/** GET /api/financial-intelligence/fcf */
function getFCF(month, period) {
  const rng = new SeededRandom(`fin-fcf-${month}`);

  const components = [
    { name: 'Operating Cash Flow', base: 320 },
    { name: 'CapEx', base: -85 },
    { name: 'Working Capital Change', base: -45 },
    { name: 'Tax', base: -32 },
    { name: 'Other', base: -18 },
  ].map(c => {
    const crng = new SeededRandom(`fcf-${c.name}-${month}`);
    const value = Math.round(crng.vary(c.base, 0.15));
    const valueLastYear = Math.round(crng.vary(value * 1.05, 0.1));
    return { name: c.name, value, valueLastYear };
  });

  const fcf = components.reduce((sum, c) => sum + c.value, 0);

  return { month, period, fcf, components };
}

module.exports = { getOverview, getProfitability, getIndirectCosts, getFCF };
