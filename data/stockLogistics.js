const { SeededRandom, fmt, fmtDec, deltaObj, seasonFactor, yearTrend } = require('./seedEngine');

const BRANDS = ['Toyota', 'Lexus', 'BYD', 'Honda', 'Jeep', 'Dodge', 'Volvo', 'Polestar'];
const MONTH_KEYS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseMonth(m) { const [y, mo] = m.split('-').map(Number); return { year: y, month: mo }; }

/** GET /api/stock-logistics/overview */
function getOverview(month, period) {
  const { year, month: m } = parseMonth(month);
  const sf = seasonFactor(m);
  const rng = new SeededRandom(`stock-overview-${month}`);

  const totalUnits = Math.round(rng.vary(8500, 0.1));
  const newUnits = Math.round(totalUnits * rng.vary(0.75, 0.05));
  const usedUnits = Math.round(totalUnits * rng.vary(0.2, 0.08));
  const demoUnits = totalUnits - newUnits - usedUnits;
  const stockDepth = fmtDec(rng.vary(2.8, 0.12));

  const kpi = {
    totalUnits: { value: totalUnits, vsLastYear: deltaObj(rng.float(-8, 12)) },
    newUnits: { value: newUnits, vsLastYear: deltaObj(rng.float(-5, 10)) },
    usedUnits: { value: usedUnits, vsLastYear: deltaObj(rng.float(-10, 15)) },
    demoUnits: { value: demoUnits },
    stockDepth: { value: stockDepth, unit: 'months', target: 2.5 },
  };

  // Stock by brand
  const brandShares = [0.35, 0.08, 0.18, 0.12, 0.08, 0.06, 0.08, 0.05];
  const brandStock = BRANDS.map((b, i) => {
    const brng = new SeededRandom(`stock-brand-${b}-${month}`);
    const units = Math.round(totalUnits * brandShares[i] * brng.vary(1, 0.1));
    const depth = fmtDec(brng.vary(stockDepth, 0.2));
    return { brand: b, units, depth, vsTarget: deltaObj(brng.float(-15, 10)) };
  });

  // Monthly stock run-down
  const stockRunDown = MONTH_KEYS.map((mk, i) => {
    const mrng = new SeededRandom(`stockrun-${year}-${i}`);
    const isActual = i < m;
    const opening = Math.round(mrng.vary(8500, 0.08));
    const arrivals = Math.round(mrng.vary(3200 * seasonFactor(i + 1), 0.12));
    const sales = Math.round(mrng.vary(3100 * seasonFactor(i + 1), 0.1));
    const closing = opening + arrivals - sales;
    return {
      month: mk,
      group: isActual ? 'Actuals' : 'Forecast',
      opening, arrivals, sales, closing,
      depth: fmtDec(closing / (sales || 1), 1),
    };
  });

  return { month, period, kpi, brandStock, stockRunDown };
}

/** GET /api/stock-logistics/logistics */
function getLogistics(month, period) {
  const { year, month: m } = parseMonth(month);
  const rng = new SeededRandom(`logistics-${month}`);

  const factoryOrdered = Math.round(rng.vary(4200, 0.12));
  const inTransit = Math.round(rng.vary(2800, 0.15));
  const atPort = Math.round(rng.vary(1200, 0.18));
  const delivered = Math.round(rng.vary(3100, 0.1));

  const pipeline = {
    factoryOrdered: { value: factoryOrdered, vsLastYear: deltaObj(rng.float(-8, 15)) },
    inTransit: { value: inTransit, avgDays: Math.round(rng.vary(35, 0.1)) },
    atPort: { value: atPort, avgDays: Math.round(rng.vary(5, 0.3)) },
    delivered: { value: delivered, vsTarget: deltaObj(rng.float(-5, 10)) },
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
