const { SeededRandom, fmtDec, seasonFactor, yearTrend } = require('./seedEngine');

const MONTH_KEYS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseMonth(m) { const [y, mo] = m.split('-').map(Number); return { year: y, month: mo }; }

// Single source of truth for the entity hierarchy used by both the
// Revenue & Gross Margin by Brands card and the per-brand Activity Intelligence
// cards. revTotal/gmTotal are approximate group totals in AED millions —
// children are randomly distributed around (groupTotal / childCount).
const BRAND_GROUPS = [
  {
    name: 'Toyota & Lexus UAE',
    revTotal: 1360, gmTotal: 210,
    children: ['Toyota', 'Lexus'],
  },
  {
    name: 'BYD Brands',
    revTotal: 620, gmTotal: 95,
    children: ['BYD UAE', 'BYD KSA', 'Denza', 'YangWang'],
  },
  {
    name: 'Industrial Equip.',
    revTotal: 185, gmTotal: 32,
    children: ['FAMCO UAE', 'FAMCO KSA', 'CV UAE', 'Other IE'],
  },
  {
    name: 'Others',
    revTotal: 285, gmTotal: 38,
    children: [
      'Toyota Egypt', 'Honda UAE', 'CJDR', 'Volvo', 'Honda Egypt',
      'OMASCO', 'DOMASCO', 'Automall', 'ALAC', 'AMW', 'AGTL', 'CMC',
      'Logistics', 'Polestar', 'Charge 2 Moov',
    ],
  },
];

// Flat list of every entity (parent + child) for Activity Intelligence.
const ACTIVITY_BRANDS = BRAND_GROUPS.flatMap(g => [g.name, ...g.children]);

const ACTIVITY_CATEGORIES = ['New Units', 'Used Units', 'Aftersales', 'Material Handling'];

/**
 * Build a single Activity Intelligence column (one of Actuals / Target / Last Year).
 * Returns the per-category values, their share-of-total percentages (excluding
 * Corporate, since it's an overhead line that doesn't contribute to the mix),
 * and the corporate value + total.
 */
function buildActivityColumn(rng, scale) {
  const raw = ACTIVITY_CATEGORIES.map(() => rng.vary(scale, 0.4));
  const sumPositive = raw.reduce((s, v) => s + v, 0);
  // Values: 2 decimals. Percentages: 1 decimal.
  const values = raw.map(v => fmtDec(v, 2).toFixed(2));
  const pcts = raw.map(v => fmtDec((v / sumPositive) * 100, 1).toFixed(1) + '%');
  const corporate = fmtDec(-rng.vary(scale * 0.3, 0.3), 2).toFixed(2);
  const total = fmtDec(sumPositive, 2).toFixed(2);
  return { values, pcts, corporate, total };
}

/** Build the rows array for one brand × one metric (revenue or grossMargin). */
function buildActivityIntelRows(brand, metric, ctx, scaleMul = 1) {
  const { month, period, target } = ctx;
  const rng = new SeededRandom(`activity-${metric}-${brand}-${month}-${period}-${target}`);
  // Revenue is in tens of millions; gross margin is a fraction of revenue.
  // YTD scales the base by elapsed-months-of-year so values differ from MTD.
  const ytdMul = period === 'YTD' ? Math.max(1, parseMonth(month).month) : 1;
  // Target=Forecast nudges Target column up vs Budget so the comparison shifts.
  const targetMul = target === 'Forecast' ? 1.15 : 1.08;
  const baseScale = (metric === 'grossMargin' ? 2.5 : 9) * scaleMul * ytdMul;
  const actuals  = buildActivityColumn(rng, baseScale);
  const targetCol = buildActivityColumn(rng, baseScale * targetMul);
  const lastYear = buildActivityColumn(rng, baseScale * 0.92);

  const rows = ACTIVITY_CATEGORIES.map((name, i) => ({
    name,
    cells: [
      { v: String(actuals.values[i]),  p: actuals.pcts[i] },
      { v: String(targetCol.values[i]),   p: targetCol.pcts[i] },
      { v: String(lastYear.values[i]), p: lastYear.pcts[i] },
    ],
  }));
  rows.push({
    name: 'Corporate',
    cells: [
      { v: String(actuals.corporate),  p: '-' },
      { v: String(targetCol.corporate),   p: '-' },
      { v: String(lastYear.corporate), p: '-' },
    ],
  });
  rows.push({
    name: 'Total',
    cells: [
      { v: String(actuals.total),  p: '100%' },
      { v: String(targetCol.total),   p: '100%' },
      { v: String(lastYear.total), p: '100%' },
    ],
    isTotal: true,
  });
  return rows;
}

/** Build the activityIntel block keyed by brand. */
function buildActivityIntel(ctx) {
  const brands = {};
  for (const brand of ACTIVITY_BRANDS) {
    brands[brand] = {
      revenue:     { rows: buildActivityIntelRows(brand, 'revenue',     ctx) },
      grossMargin: { rows: buildActivityIntelRows(brand, 'grossMargin', ctx) },
    };
  }
  // Aggregate row for clicking the "Total" line in the Brand hierarchy. We
  // scale by the number of parent groups (not all entities, to avoid double
  // counting parents + children) so the values look like company-wide totals.
  const aggMul = BRAND_GROUPS.length;
  brands['All Entity Groups'] = {
    revenue:     { rows: buildActivityIntelRows('All Entity Groups', 'revenue',     ctx, aggMul) },
    grossMargin: { rows: buildActivityIntelRows('All Entity Groups', 'grossMargin', ctx, aggMul) },
  };
  return { brands };
}

/** Random delta tag (e.g. { value: '+8.2%', up: true }) using the supplied RNG. */
function makeDelta(rng, lo = -15, hi = 25) {
  const n = rng.float(lo, hi);
  const sign = n >= 0 ? '+' : '';
  return { value: `${sign}${n.toFixed(1)}%`, up: n >= 0 };
}

/**
 * Build the full brand hierarchy for a single metric (revenue or grossMargin).
 * Children get random values centred on (groupTotal / childCount); parents are
 * the sum of their children — so totals always reconcile. ctx (month/period/
 * target) is folded into every seed so values change per slicer selection.
 */
function buildBrandHierarchy(metric, ctx) {
  const { month, period, target } = ctx;
  const ytdMul = period === 'YTD' ? Math.max(1, parseMonth(month).month) : 1;
  const seedKey = `${month}-${period}-${target}`;
  const hierarchy = BRAND_GROUPS.map(group => {
    const groupTotal = (metric === 'grossMargin' ? group.gmTotal : group.revTotal) * ytdMul;
    const avgChild = groupTotal / group.children.length;
    const grng = new SeededRandom(`bd-${metric}-${group.name}-${seedKey}`);
    const children = group.children.map(child => {
      const crng = new SeededRandom(`bd-${metric}-${child}-${seedKey}`);
      const value = Math.max(1, Math.round(crng.vary(avgChild, 0.55)));
      // Forecast target tends to be more ambitious (more reds) than Budget.
      const tgtRange = target === 'Forecast' ? [-25, 15] : [-15, 25];
      return {
        name: child,
        value,
        vsLastYear: makeDelta(crng),
        vsTarget: makeDelta(crng, tgtRange[0], tgtRange[1]),
      };
    });
    const value = children.reduce((s, c) => s + c.value, 0);
    const tgtRange = target === 'Forecast' ? [-25, 15] : [-15, 25];
    return {
      name: group.name,
      value,
      vsLastYear: makeDelta(grng),
      vsTarget: makeDelta(grng, tgtRange[0], tgtRange[1]),
      children,
    };
  });
  const trng = new SeededRandom(`bd-${metric}-total-${seedKey}`);
  const tgtRange = target === 'Forecast' ? [-25, 15] : [-15, 25];
  const total = {
    value: hierarchy.reduce((s, g) => s + g.value, 0),
    vsLastYear: makeDelta(trng),
    vsTarget: makeDelta(trng, tgtRange[0], tgtRange[1]),
  };
  return { hierarchy, total };
}

/** Build the brandDetail (Revenue + Gross Margin by Brands) block. */
function buildBrandDetail(ctx) {
  const revenue = buildBrandHierarchy('revenue', ctx);
  const grossMargin = buildBrandHierarchy('grossMargin', ctx);
  return {
    hierarchy: revenue.hierarchy,
    chartStyle: { barColor: '#3687FC', labelSuffix: 'M' },
    total: revenue.total,
    secondaryMetric: {
      label: 'Gross Margin',
      chartStyle: { barColor: '#1f6fae', labelSuffix: 'M' },
      hierarchy: grossMargin.hierarchy,
    },
    secondaryTotal: grossMargin.total,
  };
}

/** GET /api/financial-intelligence/overview */
function getOverview(month, period = 'MTD', target = 'Budget') {
  const { year, month: m } = parseMonth(month);
  const sf = seasonFactor(m);
  const yt = yearTrend(year);
  // Seed varies by month + period + target so MTD ≠ YTD and Budget ≠ Forecast.
  const rng = new SeededRandom(`fin-overview-${month}-${period}-${target}`);
  // YTD scales month-magnitude up by elapsed-months-of-year. Target=Forecast
  // pushes targets a touch higher than Budget.
  const ytdMul = period === 'YTD' ? Math.max(1, m) : 1;
  const targetUplift = target === 'Forecast' ? 1.07 : 1.0;
  const ctx = { month, period, target };

  // Money KPIs are emitted as raw AED so the client formatter can decide how
  // to compact them (M / B). Base values are in billions for readability and
  // multiplied by 1e9 at the boundary.
  const B = 1e9;
  const revenue = Math.round(rng.vary(2.8 * sf * yt * ytdMul, 0.1) * B);
  const revenueLastYear = Math.round(rng.vary(2.8 * sf * yt * ytdMul * 1.06, 0.08) * B);
  const ebit = Math.round(rng.vary(0.42 * sf * yt * ytdMul, 0.12) * B);
  const ebitLastYear = Math.round(rng.vary(0.42 * sf * yt * ytdMul * 1.08, 0.1) * B);
  const ebitPct = fmtDec((ebit / revenue) * 100);
  const ebitPctLastYear = fmtDec((ebitLastYear / revenueLastYear) * 100);
  const indirectCostPct = fmtDec(rng.vary(12.5, 0.1));
  const indirectCostPctLastYear = fmtDec(rng.vary(indirectCostPct + 0.3, 0.12));
  const freeCashFlow = Math.round(rng.vary(0.18 * sf * yt * ytdMul, 0.15) * B);
  const freeCashFlowLastYear = Math.round(rng.vary(0.18 * sf * yt * ytdMul * 1.1, 0.12) * B);
  const rocePct = fmtDec(rng.vary(15.2, 0.1));
  const rocePctLastYear = fmtDec(rng.vary(rocePct - 0.8, 0.12));
  const grossMargin = fmtDec(rng.vary(18.5, 0.08));
  const grossMarginLastYear = fmtDec(rng.vary(grossMargin - 0.4, 0.1));
  const workingCapital = Math.round(rng.vary(0.65 * yt * ytdMul, 0.1) * B);
  const workingCapitalLastYear = Math.round(rng.vary(0.65 * yt * ytdMul * 1.05, 0.08) * B);

  const kpi = {
    revenue: { value: revenue, lastYear: revenueLastYear, target: Math.round(revenue * targetUplift) },
    ebit: { value: ebit, lastYear: ebitLastYear, target: Math.round(ebit * targetUplift) },
    ebitPct: { value: +ebitPct, lastYear: +ebitPctLastYear },
    indirectCostPct: { value: +indirectCostPct, lastYear: +indirectCostPctLastYear },
    // Names match the client's KPI_TITLES map so cards merge correctly.
    freeCashFlow: { value: freeCashFlow, lastYear: freeCashFlowLastYear, target: Math.round(freeCashFlow * targetUplift) },
    rocePct: { value: +rocePct, lastYear: +rocePctLastYear },
    grossMargin: { value: +grossMargin, lastYear: +grossMarginLastYear },
    workingCapital: { value: workingCapital, lastYear: workingCapitalLastYear },
  };

  const monthlyForecast = MONTH_KEYS.map((mk, i) => {
    const prng = new SeededRandom(`fin-plan-${year}-${i}-${period}-${target}`);
    const isActual = i < m;
    return {
      month: mk,
      isActual,
      revenue: fmtDec(prng.vary(revenue / 12 * seasonFactor(i + 1), 0.1) * 12, 1),
      ebit: fmtDec(prng.vary(ebit / 12 * seasonFactor(i + 1), 0.12) * 12, 2),
    };
  });

  const activityIntel = buildActivityIntel(ctx);
  const brandDetail = buildBrandDetail(ctx);

  return { month, period, target, kpi, monthlyForecast, activityIntel, brandDetail };
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
