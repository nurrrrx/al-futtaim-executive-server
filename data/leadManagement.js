const { SeededRandom, fmtDec, seasonFactor, yearTrend } = require('./seedEngine');
const { BRANDS, BRAND_MODELS: MODEL_DATA_REF, BRAND_SHARES: BRAND_SHARES_REF } = require('./brandsModels');
const REGIONS = ['UAE', 'KSA'];

const STAGE_NAMES = ['Leads', 'Hot Leads', 'Showroom Visits', 'Test Drives', 'Reservations', 'Invoices'];

// Lost-reason categories for each funnel transition
const LOST_REASON_LABELS = {
  'Lead→Hot Lead':         ['NO RESPONSE', 'DUPLICATE', 'INVALID', 'GENERAL INFO', 'IN PROGRESS'],
  'Hot Lead→Showroom':     ['NO RESPONSE', 'NOT INTERESTED', 'COMPETITOR', 'SCHEDULING', 'UNREACHABLE'],
  'Showroom→Test Drive':   ['DECLINED TEST', 'MODEL UNAVAIL', 'TIME CONSTRAINT', 'PRICE CONCERN', 'OTHER'],
  'Showroom→Reservation':  ['PRICE TOO HIGH', 'NEEDS FINANCE', 'UNDECIDED', 'COMPETITOR OFFER', 'OTHER'],
  'Reservation→Invoice':   ['FINANCE REJECTED', 'CHANGED MIND', 'DELIVERY DELAY', 'PRICE CHANGE', 'OTHER'],
};

// Base weights for lost reasons (proportional, will be varied)
const LOST_REASON_WEIGHTS = [0.35, 0.25, 0.18, 0.13, 0.09];

function parseMonth(m) { const [y, mo] = m.split('-').map(Number); return { year: y, month: mo }; }

// Brand-level base share of total leads
const BRAND_SHARES = BRAND_SHARES_REF;

// Target multipliers relative to current value (per stage)
const TARGET_FACTORS = {
  Leads: 0.88, 'Hot Leads': 0.90, 'Showroom Visits': 1.05,
  'Test Drives': 0.92, Reservations: 1.08, Invoices: 1.10,
};

/**
 * Generate a full funnel for a given seed prefix + base lead count.
 * Returns stages array with { stage, value, target, lastYear }.
 */
function generateFunnel(seedPrefix, baseLeads, month) {
  const { year, month: m } = parseMonth(month);
  const sf = seasonFactor(m);
  const yt = yearTrend(year);
  const rng = new SeededRandom(`${seedPrefix}-${month}`);

  const leads = Math.round(rng.vary(baseLeads * sf * yt, 0.12));
  const hotLeads = Math.round(leads * rng.vary(0.35, 0.1));
  const showroomVisits = Math.round(hotLeads * rng.vary(0.65, 0.1));
  const testDrives = Math.round(showroomVisits * rng.vary(0.55, 0.1));
  const reservations = Math.round(showroomVisits * rng.vary(0.4, 0.12));
  const invoices = Math.round(reservations * rng.vary(0.7, 0.1));

  const values = { Leads: leads, 'Hot Leads': hotLeads, 'Showroom Visits': showroomVisits,
    'Test Drives': testDrives, Reservations: reservations, Invoices: invoices };

  // Last year: use previous year seed
  const lyMonth = `${year - 1}-${String(m).padStart(2, '0')}`;
  const lyRng = new SeededRandom(`${seedPrefix}-${lyMonth}`);
  const lySf = seasonFactor(m);
  const lyYt = yearTrend(year - 1);
  const lyLeads = Math.round(lyRng.vary(baseLeads * lySf * lyYt, 0.12));
  const lyHotLeads = Math.round(lyLeads * lyRng.vary(0.35, 0.1));
  const lySv = Math.round(lyHotLeads * lyRng.vary(0.65, 0.1));
  const lyTd = Math.round(lySv * lyRng.vary(0.55, 0.1));
  const lyRes = Math.round(lySv * lyRng.vary(0.4, 0.12));
  const lyInv = Math.round(lyRes * lyRng.vary(0.7, 0.1));

  const lastYears = { Leads: lyLeads, 'Hot Leads': lyHotLeads, 'Showroom Visits': lySv,
    'Test Drives': lyTd, Reservations: lyRes, Invoices: lyInv };

  // Target: derived from current value with a factor + variation
  const tRng = new SeededRandom(`${seedPrefix}-target-${month}`);

  return STAGE_NAMES.map(stage => {
    const val = values[stage];
    const ly = lastYears[stage];
    const tf = TARGET_FACTORS[stage] || 1.0;
    const target = Math.round(val * tRng.vary(tf, 0.08));
    return { stage, value: val, target, lastYear: ly };
  });
}

/**
 * Generate lost reasons for a specific funnel transition.
 * transitionKey: e.g. 'Lead→Hot Lead'
 * lostCount: how many leads were lost at this stage
 */
function generateLostReasons(seedPrefix, transitionKey, lostCount, month) {
  const rng = new SeededRandom(`${seedPrefix}-lost-${transitionKey}-${month}`);
  const labels = LOST_REASON_LABELS[transitionKey] || LOST_REASON_LABELS['Lead→Hot Lead'];

  const varied = LOST_REASON_WEIGHTS.map(w => rng.vary(w, 0.2));
  const total = varied.reduce((s, v) => s + v, 0);

  return labels.map((reason, i) => ({
    reason,
    count: Math.round(lostCount * (varied[i] / total)),
  }));
}

/**
 * Generate conversion rate time series for all three period scopes
 * (Monthly, Weekly, Daily) ending at the requested `month`. Each series
 * carries point labels suitable for a multi-layer x-axis on the client.
 *
 * Shape returned (one entry per period):
 *   Monthly: 12 points, label "MMM-YY"  (e.g., "Dec-25")  – single layer
 *   Weekly:  12 points, label "W1..W4", group "MMM"       – two layers
 *   Daily:   N points (days in month), label "DD",
 *            group "MMM-YY"                                – two layers
 */
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function generateConversionSeries(seedPrefix, convName, baseRate, monthStr) {
  const [yyStr, mmStr] = monthStr.split('-');
  const yy = parseInt(yyStr, 10);
  const mm = parseInt(mmStr, 10);

  // Monthly: 12 months ending at `month` (current is the last point).
  const Monthly = Array.from({ length: 12 }, (_, i) => {
    const monthsBack = 11 - i;
    let m = mm - monthsBack;
    let y = yy;
    while (m <= 0) { m += 12; y -= 1; }
    const label = `${MONTH_NAMES[m - 1]}-${String(y).slice(-2)}`;
    const rng = new SeededRandom(`${seedPrefix}-conv-${convName}-${y}-${m}-monthly`);
    return { label, value: fmtDec(rng.vary(baseRate, 0.15)) };
  });

  // Weekly: 12 weeks (last 3 months × 4 weeks). Group label = month, so
  // the client can render the month as a span underneath W1..W4.
  const Weekly = Array.from({ length: 12 }, (_, i) => {
    const monthsBack = 2 - Math.floor(i / 4);
    const weekInMonth = (i % 4) + 1;
    let m = mm - monthsBack;
    let y = yy;
    while (m <= 0) { m += 12; y -= 1; }
    const rng = new SeededRandom(`${seedPrefix}-conv-${convName}-${y}-${m}-W${weekInMonth}`);
    return {
      label: `W${weekInMonth}`,
      group: MONTH_NAMES[m - 1],
      value: fmtDec(rng.vary(baseRate, 0.15)),
    };
  });

  // Daily: every day of the requested month, single month so group label
  // is "MMM-YY" (used as a single span underneath the day numbers).
  const daysInMonth = new Date(yy, mm, 0).getDate();
  const monthYearLabel = `${MONTH_NAMES[mm - 1]}-${String(yy).slice(-2)}`;
  const Daily = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const rng = new SeededRandom(`${seedPrefix}-conv-${convName}-${yy}-${mm}-${day}`);
    return {
      label: String(day).padStart(2, '0'),
      group: monthYearLabel,
      value: fmtDec(rng.vary(baseRate, 0.15)),
    };
  });

  return { Monthly, Weekly, Daily };
}

/**
 * Generate re-activation funnel for lost leads.
 */
function generateReactivation(seedPrefix, lostCount, month) {
  const rng = new SeededRandom(`${seedPrefix}-react-${month}`);
  const reached = Math.round(lostCount * rng.vary(0.60, 0.1));
  const responded = Math.round(reached * rng.vary(0.45, 0.1));
  const reengaged = Math.round(responded * rng.vary(0.40, 0.1));
  const reactivated = Math.round(reengaged * rng.vary(0.38, 0.1));
  return [
    { label: 'Reached', value: reached },
    { label: 'Responded', value: responded },
    { label: 'Re-engaged', value: reengaged },
    { label: 'Re-activated', value: reactivated },
  ];
}

// ─── Endpoint: GET /api/lead-management/funnel ──────────────────────────────

function getFunnel(month, period) {
  // ── Overall funnel ──
  const stages = generateFunnel('lead-overview', 12500, month);

  // ── Conversion rates between stages ──
  const cr = (a, b) => (a / b) * 100;
  const stageVal = (name) => stages.find(s => s.stage === name).value;

  const conversionNames = [
    { name: 'Lead→Hot Lead', from: 'Leads', to: 'Hot Leads' },
    { name: 'Hot Lead→Showroom', from: 'Hot Leads', to: 'Showroom Visits' },
    { name: 'Showroom→Test Drive', from: 'Showroom Visits', to: 'Test Drives' },
    { name: 'Showroom→Reservation', from: 'Showroom Visits', to: 'Reservations' },
    { name: 'Reservation→Invoice', from: 'Reservations', to: 'Invoices' },
  ];

  // Funnel conversion rows (current, lastYear, target rates) for the ConversionGrid
  const funnelConversions = conversionNames.map(c => {
    const curRate = cr(stageVal(c.to), stageVal(c.from));
    const lyFrom = stages.find(s => s.stage === c.from).lastYear;
    const lyTo = stages.find(s => s.stage === c.to).lastYear;
    const lyRate = lyFrom > 0 ? cr(lyTo, lyFrom) : 0;
    const tRng = new SeededRandom(`conv-target-${c.name}-${month}`);
    const targetRate = fmtDec(tRng.vary(curRate * 0.95, 0.1));
    return {
      name: c.name,
      from: c.from,
      to: c.to,
      current: fmtDec(curRate),
      lastYear: fmtDec(lyRate),
      target: targetRate,
    };
  });

  // Conversion rate line chart series (weekly)
  const conversionTimeSeries = [
    { name: 'Leads → Reservations', base: cr(stageVal('Reservations'), stageVal('Leads')) },
    { name: 'Leads → Hot Leads', base: cr(stageVal('Hot Leads'), stageVal('Leads')) },
    { name: 'Hot Leads → Showroom Visits', base: cr(stageVal('Showroom Visits'), stageVal('Hot Leads')) },
    { name: 'Showroom Visits → Test Drives', base: cr(stageVal('Test Drives'), stageVal('Showroom Visits')) },
    { name: 'Showroom Visits → Reservations', base: cr(stageVal('Reservations'), stageVal('Showroom Visits')) },
    { name: 'Reservations → Invoices', base: cr(stageVal('Invoices'), stageVal('Reservations')) },
  ].map(s => ({
    name: s.name,
    pointsByPeriod: generateConversionSeries('overall', s.name, s.base, month),
  }));

  // ── Lost reasons per transition ──
  const lostReasonsByTransition = {};
  for (const c of conversionNames) {
    const fromVal = stageVal(c.from);
    const toVal = stageVal(c.to);
    const lostCount = fromVal - toVal;
    lostReasonsByTransition[c.name] = generateLostReasons('overall', c.name, Math.max(lostCount, 0), month);
  }

  // ── Lost Leads Re-Activation ──
  const totalLostAtHotLead = stageVal('Leads') - stageVal('Hot Leads');
  const reactivation = generateReactivation('overall', totalLostAtHotLead, month);

  // ── By-brand breakdown ──
  const byBrand = BRANDS.map(brand => {
    const baseLeads = Math.round(12500 * (BRAND_SHARES[brand] || 0.05));
    const brandStages = generateFunnel(`lead-brand-${brand}`, baseLeads, month);
    const bStageVal = (name) => brandStages.find(s => s.stage === name).value;

    // Brand-level lost reasons (Lead→Hot Lead only for brand cards)
    const brandLostHL = bStageVal('Leads') - bStageVal('Hot Leads');
    const brandLostReasons = generateLostReasons(`brand-${brand}`, 'Lead→Hot Lead', Math.max(brandLostHL, 0), month);

    // Brand-level reactivation
    const brandReactivation = generateReactivation(`brand-${brand}`, Math.max(brandLostHL, 0), month);

    // Brand conversion rates (line chart series)
    const brandConvSeries = [
      { name: 'Leads → Reservations', base: cr(bStageVal('Reservations'), bStageVal('Leads')) },
      { name: 'Leads → Hot Leads', base: cr(bStageVal('Hot Leads'), bStageVal('Leads')) },
      { name: 'Hot Leads → Showroom Visits', base: cr(bStageVal('Showroom Visits'), bStageVal('Hot Leads')) },
      { name: 'Showroom Visits → Test Drives', base: cr(bStageVal('Test Drives'), bStageVal('Showroom Visits')) },
      { name: 'Showroom Visits → Reservations', base: cr(bStageVal('Reservations'), bStageVal('Showroom Visits')) },
      { name: 'Reservations → Invoices', base: cr(bStageVal('Invoices'), bStageVal('Reservations')) },
    ].map(s => ({
      name: s.name,
      pointsByPeriod: generateConversionSeries(`brand-${brand}`, s.name, s.base, month),
    }));

    return {
      brand,
      stages: brandStages,
      lostReasons: brandLostReasons,
      reactivation: brandReactivation,
      conversionTimeSeries: brandConvSeries,
    };
  });

  return { month, period, stages, funnelConversions, conversionTimeSeries, lostReasonsByTransition, reactivation, byBrand };
}

// ─── Endpoint: GET /api/lead-management/geo ─────────────────────────────────

function getGeo(month, period) {
  const { year, month: m } = parseMonth(month);
  const sf = seasonFactor(m);
  const yt = yearTrend(year);

  const REGION_SHARES = { UAE: 0.65, KSA: 0.35 };
  const REGION_BRANDS = {
    UAE: BRANDS,
    KSA: ['BYD'],  // KSA currently only has BYD
  };

  const MODEL_DATA = MODEL_DATA_REF;

  const regions = REGIONS.map(region => {
    const regionShare = REGION_SHARES[region] || 0.5;
    const regionBrands = REGION_BRANDS[region] || BRANDS;
    const rng = new SeededRandom(`geo-${region}-${month}`);

    const totalLeads = Math.round(12500 * regionShare * sf * yt * rng.vary(1, 0.08));
    const totalHotLeads = Math.round(totalLeads * rng.vary(0.35, 0.1));
    const totalReservations = Math.round(totalHotLeads * rng.vary(0.28, 0.1));

    const leadToHotRate = fmtDec((totalHotLeads / totalLeads) * 100);
    const leadToResRate = fmtDec((totalReservations / totalLeads) * 100);

    // Last year for region KPIs
    const lyRng = new SeededRandom(`geo-${region}-${year - 1}-${String(m).padStart(2, '0')}`);
    const lyLeads = Math.round(12500 * regionShare * sf * yearTrend(year - 1) * lyRng.vary(1, 0.08));
    const lyHot = Math.round(lyLeads * lyRng.vary(0.35, 0.1));
    const lyRes = Math.round(lyHot * lyRng.vary(0.28, 0.1));
    const lyLeadToHotRate = fmtDec((lyHot / lyLeads) * 100);
    const lyLeadToResRate = fmtDec((lyRes / lyLeads) * 100);

    // Per-brand conversion data within region
    const brandCount = regionBrands.length;
    const brands = regionBrands.map((brand, i) => {
      const brng = new SeededRandom(`geo-${region}-${brand}-${month}`);
      const share = brandCount === 1 ? 1.0 : (BRAND_SHARES[brand] || 0.05) / regionShare;
      const bLeads = Math.round(totalLeads * share * brng.vary(1, 0.1));
      const bHot = Math.round(bLeads * brng.vary(0.35, 0.1));
      const bRes = Math.round(bHot * brng.vary(0.28, 0.1));
      const l2h = fmtDec((bHot / bLeads) * 100);
      const l2r = fmtDec((bRes / bLeads) * 100);

      // Last year brand in region
      const blyRng = new SeededRandom(`geo-${region}-${brand}-${year - 1}-${String(m).padStart(2, '0')}`);
      const blyLeads = Math.round(lyLeads * share * blyRng.vary(1, 0.1));
      const blyHot = Math.round(blyLeads * blyRng.vary(0.35, 0.1));
      const blyRes = Math.round(blyHot * blyRng.vary(0.28, 0.1));
      const lyL2h = blyLeads > 0 ? fmtDec((blyHot / blyLeads) * 100) : 0;
      const lyL2r = blyLeads > 0 ? fmtDec((blyRes / blyLeads) * 100) : 0;

      // Target
      const btRng = new SeededRandom(`geo-${region}-${brand}-target-${month}`);
      const tL2h = fmtDec(btRng.vary(l2h * 0.95, 0.08));
      const tL2r = fmtDec(btRng.vary(l2r * 0.95, 0.08));

      // Models breakdown
      const models = (MODEL_DATA[brand] || []).map(model => {
        const mrng = new SeededRandom(`geo-${region}-${brand}-${model}-${month}`);
        const mLeads = Math.round(bLeads / (MODEL_DATA[brand] || []).length * mrng.vary(1, 0.3));
        const mHot = Math.round(mLeads * mrng.vary(0.35, 0.12));
        const mRes = Math.round(mHot * mrng.vary(0.28, 0.12));
        return {
          model,
          leads: mLeads,
          hotLeads: mHot,
          reservations: mRes,
          leadToHotRate: mLeads > 0 ? fmtDec((mHot / mLeads) * 100) : 0,
          leadToResRate: mLeads > 0 ? fmtDec((mRes / mLeads) * 100) : 0,
        };
      });

      return {
        brand,
        leads: bLeads,
        hotLeads: bHot,
        reservations: bRes,
        leadToHotRate: l2h,
        leadToResRate: l2r,
        vsLastYear: { leadToHotRate: fmtDec(l2h - lyL2h, 1), leadToResRate: fmtDec(l2r - lyL2r, 1) },
        vsTarget: { leadToHotRate: fmtDec(l2h - tL2h, 1), leadToResRate: fmtDec(l2r - tL2r, 1) },
        models,
      };
    });

    return {
      region,
      leads: totalLeads,
      hotLeads: totalHotLeads,
      reservations: totalReservations,
      leadToHotRate,
      leadToResRate,
      vsLastYear: { leadToHotRate: fmtDec(leadToHotRate - lyLeadToHotRate, 1), leadToResRate: fmtDec(leadToResRate - lyLeadToResRate, 1) },
      brands,
    };
  });

  return { month, period, regions };
}

module.exports = { getFunnel, getGeo };
