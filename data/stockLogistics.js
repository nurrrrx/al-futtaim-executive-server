const { SeededRandom, fmtDec, seasonFactor, yearTrend } = require('./seedEngine');
const { BRANDS } = require('./brandsModels');
const MONTH_KEYS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseMonth(m) { const [y, mo] = m.split('-').map(Number); return { year: y, month: mo }; }

// Country share-of-business multiplier — UAE is the largest market.
function countryShare(country) {
  if (!country) return 1;
  const k = String(country).toLowerCase();
  return k === 'uae' ? 0.6 : k === 'ksa' ? 0.22 : k === 'oman' ? 0.06
       : k === 'qatar' ? 0.04 : k === 'egypt' ? 0.05 : k === 'srilanka' || k === 'sri lanka' ? 0.03 : 1;
}

/** GET /api/stock-logistics/overview?month=&period=&country=&brand= */
function getOverview(month, period, { country, brand } = {}) {
  const { year, month: m } = parseMonth(month);
  const scope = `${country || 'all'}-${brand || 'all'}`;
  const rng = new SeededRandom(`stock-overview-${scope}-${month}-${period}`);
  const cMul = countryShare(country);
  const { BRAND_SHARES_ARRAY } = require('./brandsModels');
  const brandShares = BRAND_SHARES_ARRAY;
  const bMul = brand ? (brandShares[BRANDS.indexOf(brand)] ?? 0.1) : 1;

  const baseInventory = 8500 * cMul * bMul;
  const totalInventory = Math.round(rng.vary(baseInventory, 0.1));
  const newInventory = Math.round(totalInventory * rng.vary(0.75, 0.05));
  const usedInventory = Math.round(totalInventory * rng.vary(0.2, 0.08));
  const demoInventory = totalInventory - newInventory - usedInventory;
  const stockDepth = fmtDec(rng.vary(2.8, 0.12));
  const stockDepthTarget = 2.5;

  const totalInventoryLastYear = Math.round(rng.vary(totalInventory * 1.05, 0.08));
  const newInventoryLastYear = Math.round(rng.vary(newInventory * 1.06, 0.08));
  const usedInventoryLastYear = Math.round(rng.vary(usedInventory * 1.08, 0.1));

  const kpi = {
    totalInventory, totalInventoryLastYear,
    newInventory, newInventoryLastYear,
    usedInventory, usedInventoryLastYear,
    demoInventory,
    stockDepth: +stockDepth, stockDepthTarget,
  };

  // Stock by brand — when a brand filter is set, only return that brand
  const brandList = brand ? [brand] : BRANDS;
  const brandStock = brandList.map(b => {
    const i = BRANDS.indexOf(b);
    const share = brand ? 1 : (brandShares[i] ?? 0.1);
    const brng = new SeededRandom(`stock-brand-${b}-${scope}-${month}`);
    const inventory = Math.round(totalInventory * share * brng.vary(1, 0.1));
    const depth = fmtDec(brng.vary(+stockDepth, 0.2));
    const depthTarget = fmtDec(stockDepthTarget * brng.vary(1, 0.1));
    return { brand: b, inventory, depth: +depth, depthTarget: +depthTarget };
  });

  // Monthly stock run-down
  const stockRunDown = MONTH_KEYS.map((mk, i) => {
    const mrng = new SeededRandom(`stockrun-${scope}-${year}-${i}`);
    const isActual = i < m;
    const opening = Math.round(mrng.vary(baseInventory, 0.08));
    const arrivals = Math.round(mrng.vary(3200 * cMul * bMul * seasonFactor(i + 1), 0.12));
    const sales = Math.round(mrng.vary(3100 * cMul * bMul * seasonFactor(i + 1), 0.1));
    const closing = opening + arrivals - sales;
    return { month: mk, isActual, opening, arrivals, sales, closing, depth: fmtDec(closing / (sales || 1), 1) };
  });

  return { month, period, country: country || null, brand: brand || null, kpi, brandStock, stockRunDown };
}

/** GET /api/stock-logistics/logistics?month=&period=&country=&brand= */
function getLogistics(month, period, { country, brand } = {}) {
  const scope = `${country || 'all'}-${brand || 'all'}`;
  const rng = new SeededRandom(`logistics-${scope}-${month}-${period}`);
  const cMul = countryShare(country);
  const { BRAND_SHARES_ARRAY } = require('./brandsModels');
  const brandShares = BRAND_SHARES_ARRAY;
  const bMul = brand ? (brandShares[BRANDS.indexOf(brand)] ?? 0.1) : 1;
  const isYTD = String(period).toUpperCase() === 'YTD';
  const { month: m } = parseMonth(month);
  const periodMul = isYTD ? Math.max(1, m * 0.85) : 1;
  const totalMul = cMul * bMul * periodMul;

  const factoryOrdered = Math.round(rng.vary(4200 * totalMul, 0.12));
  const factoryOrderedLastYear = Math.round(rng.vary(factoryOrdered * 1.05, 0.08));
  const inTransit = Math.round(rng.vary(2800 * cMul * bMul, 0.15));  // not period-cumulative (current snapshot)
  const inTransitAvgDays = Math.round(rng.vary(35, 0.1));
  const atPort = Math.round(rng.vary(1200 * cMul * bMul, 0.18));
  const atPortAvgDays = Math.round(rng.vary(5, 0.3));
  const delivered = Math.round(rng.vary(3100 * totalMul, 0.1));
  const deliveredTarget = Math.round(rng.vary(delivered * 1.05, 0.06));

  const pipeline = {
    factoryOrdered, factoryOrderedLastYear,
    inTransit, inTransitAvgDays,
    atPort, atPortAvgDays,
    delivered, deliveredTarget,
  };

  // Brand pipeline — when a brand filter is set, only return that brand
  const brandList = brand ? [brand] : BRANDS.slice(0, 5);
  const brandPipeline = brandList.map(b => {
    const share = brand ? 1 : 0.2;
    const brng = new SeededRandom(`logistics-brand-${b}-${scope}-${month}`);
    return {
      brand: b,
      ordered: Math.round(brng.vary(factoryOrdered * share, 0.3)),
      inTransit: Math.round(brng.vary(inTransit * share, 0.3)),
      atPort: Math.round(brng.vary(atPort * share, 0.3)),
      delivered: Math.round(brng.vary(delivered * share, 0.3)),
    };
  });

  return { month, period, country: country || null, brand: brand || null, pipeline, brandPipeline };
}

/** GET /api/stock-logistics/distribution?month=&period=&country=&brand=&branch= */
function getDistribution(month, period, { country, brand, branch } = {}) {
  const scope = `${country || 'all'}-${brand || 'all'}-${branch || 'all'}`;
  const rng = new SeededRandom(`distribution-${scope}-${month}-${period}`);
  const isYTD = String(period).toUpperCase() === 'YTD';
  const { month: m } = parseMonth(month);

  const periodMul = isYTD ? Math.max(1, m * 0.85) : 1;
  // Country narrowing: rough share-of-business
  const countryMul = (() => {
    if (!country) return 1;
    const k = String(country).toLowerCase();
    return k === 'uae' ? 0.6 : k === 'ksa' ? 0.22 : k === 'oman' ? 0.06 : k === 'qatar' ? 0.04 : 0.08;
  })();
  // Branch narrowing: ~15% of country if a single branch is selected
  const branchMul = branch ? 0.15 : 1;
  const scopeMul = countryMul * branchMul * periodMul;

  // Pipeline funnel — preparation/PDI/transfer/delivery
  const tagged = Math.round(rng.vary(1000 * scopeMul, 0.08));
  const confirmed = Math.round(tagged * rng.vary(0.5, 0.08));
  const pdiStart = Math.round(confirmed * rng.vary(0.6, 0.10));
  const awaitingPdi = Math.max(0, confirmed - pdiStart);
  const pdiCompleted = Math.round(pdiStart * rng.vary(0.83, 0.06));
  const pdiNotCompleted = Math.max(0, pdiStart - pdiCompleted);
  const transferred = Math.round(pdiCompleted * rng.vary(0.8, 0.06));
  const awaitingTransfer = Math.max(0, pdiCompleted - transferred);
  const arrived = Math.round(transferred * rng.vary(0.95, 0.04));

  const slaTarget = 95;
  const slaWithin = Math.round(rng.vary(90, 0.05));
  const slaOver = Math.max(0, 100 - slaWithin);

  // Brand volumes for the brand bar chart (skip when single brand filtered)
  const brandList = brand ? [brand] : ['Toyota', 'BYD', 'Honda', 'Lexus', 'Volvo', 'Jeep'];
  const brands = brandList.map((b, i) => {
    const brng = new SeededRandom(`distribution-brand-${b}-${scope}-${month}-${period}`);
    const baseShare = brand ? 1 : Math.pow(0.6, i);
    return {
      name: b,
      vol: Math.round(brng.vary(tagged * baseShare * 0.35, 0.12)),
    };
  });

  // Per-showroom (branch) volumes — when a branch is selected, only return it
  const ALL_SHOWROOMS = [
    { name: 'Toyota - SHZ Road', country: 'UAE' },
    { name: 'BYD - DFC',         country: 'UAE' },
    { name: 'Honda - DFC',       country: 'UAE' },
    { name: 'Lexus - SZR',       country: 'UAE' },
    { name: 'Toyota - Riyadh',   country: 'KSA' },
    { name: 'BYD - Jeddah',      country: 'KSA' },
  ];
  const countryName = country ? String(country) : null;
  const filteredShowrooms = ALL_SHOWROOMS.filter(s => {
    if (countryName && s.country.toLowerCase() !== countryName.toLowerCase()) return false;
    if (branch && !s.name.includes(branch)) return false;
    return true;
  });
  const showrooms = (filteredShowrooms.length ? filteredShowrooms : ALL_SHOWROOMS.slice(0, 3)).map((s, i) => {
    const srng = new SeededRandom(`distribution-showroom-${s.name}-${scope}-${month}-${period}`);
    const baseShare = Math.pow(0.65, i);
    return { name: s.name, vol: Math.round(srng.vary(tagged * baseShare * 0.10, 0.15)) };
  });

  return {
    month, period, country: country || null, brand: brand || null, branch: branch || null,
    pipeline: {
      tagged, confirmed,
      pdiStart, awaitingPdi,
      pdiCompleted, pdiNotCompleted,
      transferred, awaitingTransfer,
      arrived,
      slaTarget, slaWithin, slaOver,
    },
    brands,
    showrooms,
  };
}

module.exports = { getOverview, getLogistics, getDistribution };
