const { SeededRandom, fmt, fmtDec, deltaObj, seasonFactor, yearTrend } = require('./seedEngine');

const BRANDS = ['Toyota', 'BYD', 'Honda', 'Lexus', 'Denza', 'Jeep', 'Dodge', 'Volvo', 'Polestar', 'Yangwang'];
const REGIONS = ['UAE', 'KSA'];

function parseMonth(m) { const [y, mo] = m.split('-').map(Number); return { year: y, month: mo }; }

/** GET /api/lead-management/overview */
function getOverview(month, period) {
  const { year, month: m } = parseMonth(month);
  const sf = seasonFactor(m);
  const yt = yearTrend(year);
  const rng = new SeededRandom(`lead-overview-${month}`);

  const leads = Math.round(rng.vary(12500 * sf * yt, 0.12));
  const hotLeads = Math.round(leads * rng.vary(0.35, 0.1));
  const showroomVisits = Math.round(hotLeads * rng.vary(0.65, 0.1));
  const reservations = Math.round(showroomVisits * rng.vary(0.4, 0.12));
  const testDrives = Math.round(showroomVisits * rng.vary(0.55, 0.1));
  const invoices = Math.round(reservations * rng.vary(0.7, 0.1));

  const funnel = [
    { stage: 'Leads', value: leads },
    { stage: 'Hot Leads', value: hotLeads },
    { stage: 'Showroom Visits', value: showroomVisits },
    { stage: 'Test Drives', value: testDrives },
    { stage: 'Reservations', value: reservations },
    { stage: 'Invoices', value: invoices },
  ];

  // Conversion rates over 12 weeks
  const conversionRates = ['Lead→Hot', 'Hot→Visit', 'Visit→TestDrive', 'Visit→Reservation', 'Reservation→Invoice', 'Lead→Invoice'].map(name => ({
    name,
    points: Array.from({ length: 12 }, (_, w) => {
      const wrng = new SeededRandom(`conv-${name}-${month}-${w}`);
      return { week: `W${w + 1}`, value: fmtDec(wrng.vary(name.includes('Invoice') ? 8 : 35, 0.15)) };
    }),
  }));

  // Lost lead reasons
  const lostReasons = [
    { reason: 'Price too high', pct: 28 },
    { reason: 'Chose competitor', pct: 22 },
    { reason: 'Not ready to buy', pct: 18 },
    { reason: 'No follow-up', pct: 17 },
    { reason: 'Other', pct: 15 },
  ].map(r => {
    const rrng = new SeededRandom(`lost-${r.reason}-${month}`);
    return { ...r, pct: Math.round(rrng.vary(r.pct, 0.15)) };
  });

  return { month, period, funnel, conversionRates, lostReasons };
}

/** GET /api/lead-management/brands */
function getBrandBreakdown(month, period) {
  const { year, month: m } = parseMonth(month);
  const sf = seasonFactor(m);
  const rng = new SeededRandom(`lead-brands-${month}`);

  const brandShares = [0.30, 0.18, 0.12, 0.08, 0.06, 0.08, 0.06, 0.04, 0.05, 0.03];
  const totalLeads = Math.round(rng.vary(12500 * sf, 0.12));

  const brands = BRANDS.map((b, i) => {
    const brng = new SeededRandom(`lead-brand-${b}-${month}`);
    const leads = Math.round(totalLeads * brandShares[i] * brng.vary(1, 0.1));
    const conv = fmtDec(brng.vary(8, 0.25));
    return {
      brand: b,
      leads,
      hotLeads: Math.round(leads * brng.vary(0.35, 0.1)),
      conversionRate: conv,
      vsLastYear: deltaObj(brng.float(-15, 20)),
      vsTarget: deltaObj(brng.float(-10, 15)),
    };
  });

  // Regional breakdown
  const regions = REGIONS.map(r => {
    const rrng = new SeededRandom(`lead-region-${r}-${month}`);
    return {
      region: r,
      leads: Math.round(totalLeads * (r === 'UAE' ? 0.65 : 0.35) * rrng.vary(1, 0.08)),
      conversionRate: fmtDec(rrng.vary(8, 0.2)),
    };
  });

  return { month, period, brands, regions };
}

module.exports = { getOverview, getBrandBreakdown };
