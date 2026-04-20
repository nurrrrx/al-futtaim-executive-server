const { SeededRandom, fmtDec, seasonFactor, yearTrend } = require('./seedEngine');

const COUNTRIES = ['UAE', 'KSA', 'Oman', 'Qatar', 'Egypt', 'Sri Lanka'];
const BRANDS = ['Toyota', 'Lexus', 'BYD', 'Honda', 'Denza', 'Jeep', 'Dodge', 'Volvo', 'Polestar', 'Yangwang'];
const CHANNELS = ['Showroom', 'Online', 'Fleet', 'Government'];
const SHOWROOMS = ['Dubai Motor City', 'Abu Dhabi Corniche', 'Sharjah Auto Mall', 'Al Ain Central', 'RAK Gateway'];
const MONTH_KEYS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const BASE = { totalSales: 4200, revenue: 1850, grossMargin: 18.5 };

function parseMonth(m) { const [y, mo] = m.split('-').map(Number); return { year: y, month: mo }; }

/** GET /api/sales-insights/overview?month=&period=&country=&brand= */
function getOverview(month, period, { country, brand } = {}) {
  const { year, month: m } = parseMonth(month);
  const sf = seasonFactor(m);
  const yt = yearTrend(year);
  const rng = new SeededRandom(`sales-overview-${month}`);

  const totalSales = Math.round(rng.vary(BASE.totalSales * sf * yt, 0.1));
  const totalSalesLastYear = Math.round(rng.vary(totalSales * 1.1, 0.15));
  const totalSalesTarget = Math.round(rng.vary(totalSales * 1.05, 0.08));
  const revenue = fmtDec(rng.vary(BASE.revenue * sf * yt, 0.12));
  const revenueLastYear = fmtDec(rng.vary(revenue * 1.08, 0.1));
  const grossMargin = fmtDec(rng.vary(BASE.grossMargin, 0.1));
  const grossMarginLastYear = fmtDec(rng.vary(grossMargin - 0.5, 0.15));

  // Country breakdown
  const countryShares = [0.42, 0.25, 0.10, 0.08, 0.10, 0.05];
  let countryList = COUNTRIES;
  if (country) countryList = COUNTRIES.filter(c => c.toLowerCase() === country.toLowerCase());

  const countryBreakdown = countryList.map((c, i) => {
    const idx = COUNTRIES.indexOf(c);
    const crng = new SeededRandom(`sales-country-${c}-${month}`);
    const units = Math.round(totalSales * countryShares[idx] * crng.vary(1, 0.1));
    const unitsLastYear = Math.round(crng.vary(units * 1.1, 0.15));
    return { country: c, units, unitsLastYear };
  });

  // Brand breakdown
  const brandShares = [0.35, 0.08, 0.15, 0.10, 0.05, 0.08, 0.06, 0.04, 0.05, 0.04];
  let brandList = BRANDS;
  if (brand) brandList = BRANDS.filter(b => b.toLowerCase() === brand.toLowerCase());

  const brandBreakdown = brandList.map(b => {
    const idx = BRANDS.indexOf(b);
    const brng = new SeededRandom(`sales-brand-${b}-${month}`);
    const units = Math.round(totalSales * brandShares[idx] * brng.vary(1, 0.12));
    const unitsLastYear = Math.round(brng.vary(units * 1.08, 0.12));
    const unitsTarget = Math.round(brng.vary(units * 1.03, 0.08));
    return { brand: b, units, unitsLastYear, unitsTarget };
  });

  // Sales plan (12 months)
  const salesPlan = MONTH_KEYS.map((mk, i) => {
    const prng = new SeededRandom(`salesplan-${year}-${i}`);
    return {
      month: mk,
      isActual: i < m,
      value: Math.round(prng.vary(BASE.totalSales * seasonFactor(i + 1) * yt, 0.08)),
      target: Math.round(prng.vary(BASE.totalSales * seasonFactor(i + 1) * yt * 1.05, 0.06)),
      lastYear: Math.round(prng.vary(BASE.totalSales * seasonFactor(i + 1), 0.1)),
    };
  });

  return {
    month, period,
    totalSales, totalSalesLastYear, totalSalesTarget,
    revenue, revenueLastYear, revenueUnit: 'AED M',
    grossMargin, grossMarginLastYear,
    countryBreakdown, brandBreakdown, salesPlan,
  };
}

/** GET /api/sales-insights/daily?month=&country=&brand= */
function getDailySales(month, period, { country, brand } = {}) {
  const { year, month: m } = parseMonth(month);
  const daysInMonth = new Date(year, m, 0).getDate();
  const rng = new SeededRandom(`daily-${month}-${country || ''}-${brand || ''}`);

  const days = [];
  let cumulative = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, m - 1, d).getDay();
    const isWeekend = dow === 5 || dow === 6;
    const baseDaily = isWeekend ? 80 : 150;
    const val = Math.round(rng.vary(baseDaily, 0.25));
    cumulative += val;
    days.push({ date: `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, units: val, cumulative });
  }

  return { month, period, days, totalUnits: cumulative };
}

/** GET /api/sales-insights/model-channel?month=&period=&country=&brand= */
function getModelChannel(month, period, { country, brand } = {}) {
  const { year, month: m } = parseMonth(month);
  const sf = seasonFactor(m);

  const channelShares = [0.55, 0.18, 0.17, 0.10];
  const channels = CHANNELS.map((ch, i) => {
    const crng = new SeededRandom(`channel-${ch}-${month}`);
    const units = Math.round(crng.vary(4200 * channelShares[i] * sf, 0.12));
    const unitsLastYear = Math.round(crng.vary(units * 1.08, 0.1));
    return { channel: ch, units, unitsLastYear, share: fmtDec(channelShares[i] * 100 * crng.vary(1, 0.1)) };
  });

  let models = [
    { model: 'Camry', brand: 'Toyota', base: 620 },
    { model: 'Land Cruiser', brand: 'Toyota', base: 480 },
    { model: 'RAV4', brand: 'Toyota', base: 390 },
    { model: 'Atto 3', brand: 'BYD', base: 310 },
    { model: 'Seal', brand: 'BYD', base: 280 },
    { model: 'Civic', brand: 'Honda', base: 250 },
    { model: 'CR-V', brand: 'Honda', base: 220 },
    { model: 'RX', brand: 'Lexus', base: 180 },
    { model: 'Wrangler', brand: 'Jeep', base: 160 },
    { model: 'XC60', brand: 'Volvo', base: 90 },
  ];
  if (brand) models = models.filter(m => m.brand.toLowerCase() === brand.toLowerCase());

  const topModels = models.map(md => {
    const mrng = new SeededRandom(`model-${md.model}-${month}`);
    const units = Math.round(mrng.vary(md.base * sf, 0.15));
    const unitsLastYear = Math.round(mrng.vary(units * 1.08, 0.12));
    const unitsTarget = Math.round(mrng.vary(units * 1.03, 0.08));
    return { model: md.model, brand: md.brand, units, unitsLastYear, unitsTarget };
  });

  return { month, period, channels, topModels };
}

/** GET /api/sales-insights/showroom?month=&period=&showroom= */
function getShowroomView(month, period, { showroom } = {}) {
  let list = SHOWROOMS;
  if (showroom) list = SHOWROOMS.filter(s => s.toLowerCase().includes(showroom.toLowerCase()));

  const showrooms = list.map(s => {
    const srng = new SeededRandom(`showroom-${s}-${month}`);
    const units = Math.round(srng.vary(180, 0.25));
    const unitsLastYear = Math.round(srng.vary(units * 1.08, 0.12));
    const traffic = Math.round(srng.vary(2500, 0.2));
    const conversionRate = fmtDec(srng.vary(7.2, 0.2));
    const avgDealSize = Math.round(srng.vary(142000, 0.1));
    return { name: s, units, unitsLastYear, traffic, conversionRate, avgDealSize };
  });

  return { month, period, showrooms };
}

module.exports = { getOverview, getDailySales, getModelChannel, getShowroomView };
