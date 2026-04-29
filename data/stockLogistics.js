const { SeededRandom, fmtDec, seasonFactor, yearTrend } = require('./seedEngine');
const { BRANDS } = require('./brandsModels');
const MONTH_KEYS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseMonth(m) { const [y, mo] = m.split('-').map(Number); return { year: y, month: mo }; }

/** GET /api/stock-logistics/overview */
function getOverview(month, period) {
  const { year, month: m } = parseMonth(month);
  const rng = new SeededRandom(`stock-overview-${month}`);

  const totalInventory = Math.round(rng.vary(8500, 0.1));
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

  // Stock by brand
  const { BRAND_SHARES_ARRAY } = require('./brandsModels');
  const brandShares = BRAND_SHARES_ARRAY;
  const brandStock = BRANDS.map((b, i) => {
    const brng = new SeededRandom(`stock-brand-${b}-${month}`);
    const inventory = Math.round(totalInventory * brandShares[i] * brng.vary(1, 0.1));
    const depth = fmtDec(brng.vary(+stockDepth, 0.2));
    const depthTarget = fmtDec(stockDepthTarget * brng.vary(1, 0.1));
    return { brand: b, inventory, depth: +depth, depthTarget: +depthTarget };
  });

  // Monthly stock run-down
  const stockRunDown = MONTH_KEYS.map((mk, i) => {
    const mrng = new SeededRandom(`stockrun-${year}-${i}`);
    const isActual = i < m;
    const opening = Math.round(mrng.vary(8500, 0.08));
    const arrivals = Math.round(mrng.vary(3200 * seasonFactor(i + 1), 0.12));
    const sales = Math.round(mrng.vary(3100 * seasonFactor(i + 1), 0.1));
    const closing = opening + arrivals - sales;
    return { month: mk, isActual, opening, arrivals, sales, closing, depth: fmtDec(closing / (sales || 1), 1) };
  });

  return { month, period, kpi, brandStock, stockRunDown };
}

/** GET /api/stock-logistics/logistics */
function getLogistics(month, period) {
  const rng = new SeededRandom(`logistics-${month}`);

  const factoryOrdered = Math.round(rng.vary(4200, 0.12));
  const factoryOrderedLastYear = Math.round(rng.vary(factoryOrdered * 1.05, 0.08));
  const inTransit = Math.round(rng.vary(2800, 0.15));
  const inTransitAvgDays = Math.round(rng.vary(35, 0.1));
  const atPort = Math.round(rng.vary(1200, 0.18));
  const atPortAvgDays = Math.round(rng.vary(5, 0.3));
  const delivered = Math.round(rng.vary(3100, 0.1));
  const deliveredTarget = Math.round(rng.vary(delivered * 1.05, 0.06));

  const pipeline = {
    factoryOrdered, factoryOrderedLastYear,
    inTransit, inTransitAvgDays,
    atPort, atPortAvgDays,
    delivered, deliveredTarget,
  };

  // Brand pipeline
  const brandPipeline = BRANDS.slice(0, 5).map(b => {
    const brng = new SeededRandom(`logistics-brand-${b}-${month}`);
    return {
      brand: b,
      ordered: Math.round(brng.vary(factoryOrdered * 0.2, 0.3)),
      inTransit: Math.round(brng.vary(inTransit * 0.2, 0.3)),
      atPort: Math.round(brng.vary(atPort * 0.2, 0.3)),
      delivered: Math.round(brng.vary(delivered * 0.2, 0.3)),
    };
  });

  return { month, period, pipeline, brandPipeline };
}

module.exports = { getOverview, getLogistics };
