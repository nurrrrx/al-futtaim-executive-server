const { SeededRandom, fmtDec, seasonFactor, yearTrend } = require('./seedEngine');
const { BRANDS, BRAND_MODELS, BRAND_SHARES_ARRAY: BRAND_SHARES } = require('./brandsModels');

const COUNTRIES = [
  { id: 'uae', name: 'UAE', baseSales: 1800 },
  { id: 'ksa', name: 'KSA', baseSales: 1050 },
  { id: 'oman', name: 'Oman', baseSales: 420 },
  { id: 'qatar', name: 'Qatar', baseSales: 340 },
  { id: 'egypt', name: 'Egypt', baseSales: 480 },
  { id: 'srilanka', name: 'Sri Lanka', baseSales: 210 },
];

const SHOWROOMS = {
  UAE: [
    { id: 'dmc', name: 'Dubai Motor City', lat: 25.0478, lon: 55.2353 },
    { id: 'adc', name: 'Abu Dhabi Corniche', lat: 24.4539, lon: 54.3773 },
    { id: 'sam', name: 'Sharjah Auto Mall', lat: 25.3573, lon: 55.3903 },
    { id: 'aac', name: 'Al Ain Central', lat: 24.2075, lon: 55.7447 },
    { id: 'rak', name: 'RAK Gateway', lat: 25.7895, lon: 55.9432 },
  ],
  KSA: [
    { id: 'riy', name: 'Riyadh Showroom', lat: 24.7136, lon: 46.6753 },
    { id: 'jed', name: 'Jeddah Showroom', lat: 21.4858, lon: 39.1925 },
    { id: 'dmm', name: 'Dammam Showroom', lat: 26.4207, lon: 50.0888 },
  ],
  Oman: [{ id: 'mct', name: 'Muscat Showroom', lat: 23.5880, lon: 58.3829 }],
  Qatar: [{ id: 'doh', name: 'Doha Showroom', lat: 25.2854, lon: 51.5310 }],
  Egypt: [{ id: 'cai', name: 'Cairo Showroom', lat: 30.0444, lon: 31.2357 }],
  'Sri Lanka': [{ id: 'cmb', name: 'Colombo Showroom', lat: 6.9271, lon: 79.8612 }],
};

const CHANNELS = ['Showroom', 'Online', 'Fleet', 'Government'];
const MONTH_KEYS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseMonth(m) { const [y, mo] = m.split('-').map(Number); return { year: y, month: mo }; }

function generateSalesPlan(countryId, baseSales, year, upToMonth) {
  const yt = yearTrend(year);
  return MONTH_KEYS.map((mk, i) => {
    const prng = new SeededRandom(`salesplan-${countryId}-${year}-${i}`);
    const sf = seasonFactor(i + 1);
    const value = Math.round(prng.vary(baseSales * sf * yt, 0.08));
    const target = Math.round(prng.vary(baseSales * sf * yt * 1.05, 0.06));
    const lastYear = Math.round(prng.vary(baseSales * sf, 0.1));
    return { month: mk, isActual: i < upToMonth, value, target, lastYear };
  });
}

/** GET /api/sales-insights/overview */
function getOverview(month, period, { country, brand } = {}) {
  const { year, month: m } = parseMonth(month);
  const sf = seasonFactor(m);
  const yt = yearTrend(year);
  const isYTD = String(period).toUpperCase() === 'YTD';

  let countryList = COUNTRIES;
  if (country) countryList = COUNTRIES.filter(c => c.id === country.toLowerCase() || c.name.toLowerCase() === country.toLowerCase());

  const countryBreakdown = countryList.map(c => {
    const salesPlan = generateSalesPlan(c.id, c.baseSales, year, m);
    const fullYearValue = salesPlan.reduce((s, p) => s + p.value, 0);
    const fullYearTarget = salesPlan.reduce((s, p) => s + p.target, 0);
    const fullYearLastYear = salesPlan.reduce((s, p) => s + p.lastYear, 0);

    let salesVolume, salesVolumeTarget, salesVolumeLastYear;
    if (isYTD) {
      // YTD: cumulative sum of months 1..m from the same plan that drives the
      // bar chart, so KPI and chart agree.
      salesVolume = salesPlan.slice(0, m).reduce((s, p) => s + p.value, 0);
      salesVolumeTarget = salesPlan.slice(0, m).reduce((s, p) => s + p.target, 0);
      salesVolumeLastYear = salesPlan.slice(0, m).reduce((s, p) => s + p.lastYear, 0);
    } else {
      // MTD: just the selected month from the plan.
      const cur = salesPlan[m - 1] || { value: 0, target: 0, lastYear: 0 };
      salesVolume = cur.value;
      salesVolumeTarget = cur.target;
      salesVolumeLastYear = cur.lastYear;
    }

    return {
      countryId: c.id, country: c.name,
      salesVolume, salesVolumeTarget, salesVolumeLastYear,
      salesPlan,
      fullYear: { value: fullYearValue, target: fullYearTarget, lastYear: fullYearLastYear },
    };
  });

  const totalSales = countryBreakdown.reduce((s, c) => s + c.salesVolume, 0);
  const totalSalesTarget = countryBreakdown.reduce((s, c) => s + c.salesVolumeTarget, 0);
  const totalSalesLastYear = countryBreakdown.reduce((s, c) => s + c.salesVolumeLastYear, 0);

  // Revenue / gross margin: scale revenue cumulatively for YTD using the
  // monthly seasonality up to the selected month so the KPI matches the
  // YTD volume story. Margin stays a percentage so it's period-invariant.
  const rng = new SeededRandom(`sales-kpi-${month}-${isYTD ? 'ytd' : 'mtd'}`);
  const monthlyRevenue = 1850 * sf * yt;
  let revenueRaw;
  if (isYTD) {
    let acc = 0;
    for (let i = 1; i <= m; i++) acc += 1850 * seasonFactor(i) * yt;
    revenueRaw = rng.vary(acc, 0.06);
  } else {
    revenueRaw = rng.vary(monthlyRevenue, 0.12);
  }
  const revenue = fmtDec(revenueRaw);
  const revenueLastYear = fmtDec(rng.vary(revenue * 1.08, 0.1));
  const grossMargin = fmtDec(rng.vary(18.5, 0.1));
  const grossMarginLastYear = fmtDec(rng.vary(grossMargin - 0.5, 0.15));

  let brandList = BRANDS;
  if (brand) brandList = BRANDS.filter(b => b.toLowerCase() === brand.toLowerCase());

  const brandBreakdown = brandList.map(b => {
    const idx = BRANDS.indexOf(b);
    const brng = new SeededRandom(`sales-brand-${b}-${month}`);
    const sales = Math.round(totalSales * BRAND_SHARES[idx] * brng.vary(1, 0.12));
    const salesLastYear = Math.round(brng.vary(sales * 1.08, 0.12));
    const salesTarget = Math.round(brng.vary(sales * 1.03, 0.08));
    return { brand: b, salesVolume: sales, salesVolumeLastYear: salesLastYear, salesVolumeTarget: salesTarget };
  });

  // Compute per-(country × brand × month) sales plan when a brand filter is
  // set. The detail-card bar chart has to follow the user's country/brand
  // selection, so we scale the country-aggregated plan by the brand's share
  // within the country totals (matching how brandBreakdown is computed above).
  // Without this, the chart would show country totals even when a specific
  // brand is selected.
  let brandShareFactor = 1;
  if (brand) {
    const idx = BRANDS.indexOf(brand);
    if (idx >= 0) {
      const brng = new SeededRandom(`sales-brand-share-${brand}-${month}`);
      brandShareFactor = BRAND_SHARES[idx] * brng.vary(1, 0.05);
    }
  }
  const totalSalesPlan = MONTH_KEYS.map((mk, i) => {
    let value = 0, target = 0, lastYear = 0;
    countryBreakdown.forEach(c => { const p = c.salesPlan[i]; value += p.value; target += p.target; lastYear += p.lastYear; });
    if (brand) {
      // Per-month variance on top of the brand's global share so the bar
      // shape feels distinct rather than a perfect scaled-down country plan.
      const mrng = new SeededRandom(`sales-brand-month-${brand}-${month}-${i}`);
      const f = brandShareFactor * mrng.vary(1, 0.06);
      value = Math.round(value * f);
      target = Math.round(target * f);
      lastYear = Math.round(lastYear * f);
    }
    return { month: mk, isActual: i < m, value, target, lastYear };
  });

  return {
    month, period,
    totalSales, totalSalesTarget, totalSalesLastYear,
    revenue: +revenue, revenueLastYear: +revenueLastYear,
    grossMargin: +grossMargin, grossMarginLastYear: +grossMarginLastYear,
    countryBreakdown, brandBreakdown,
    salesPlan: totalSalesPlan,
    fullYear: {
      value: totalSalesPlan.reduce((s, p) => s + p.value, 0),
      target: totalSalesPlan.reduce((s, p) => s + p.target, 0),
      lastYear: totalSalesPlan.reduce((s, p) => s + p.lastYear, 0),
    },
  };
}

/** GET /api/sales-insights/daily?month=&country=&brand=&showroom=&model= */
function getDailySales(month, period, { country, brand, showroom, model } = {}) {
  const { year, month: m } = parseMonth(month);
  const daysInMonth = new Date(year, m, 0).getDate();
  const sf = seasonFactor(m);
  const yt = yearTrend(year);

  // Determine which countries
  let countryList = COUNTRIES;
  if (country) countryList = COUNTRIES.filter(c => c.id === country.toLowerCase() || c.name.toLowerCase() === country.toLowerCase());

  // Build per-country data
  const countries = countryList.map(c => {
    const crng = new SeededRandom(`daily-country-${c.id}-${month}`);
    const baseDailySales = Math.round(c.baseSales * sf * yt / daysInMonth);

    // Country-level daily
    const daily = [];
    let cumulative = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, m - 1, d).getDay();
      const isWeekend = dow === 5 || dow === 6;
      const drng = new SeededRandom(`daily-${c.id}-${month}-${d}`);
      const ordersActual = d <= new Date().getDate() || m < new Date().getMonth() + 1
        ? Math.round(drng.vary(isWeekend ? baseDailySales * 0.5 : baseDailySales, 0.25))
        : null;
      const ordersForecast = Math.round(drng.vary(isWeekend ? baseDailySales * 0.55 : baseDailySales * 1.02, 0.15));
      const runRateActual = ordersActual !== null ? Math.round(ordersActual * drng.vary(0.85, 0.1)) : null;
      const runRateForecast = Math.round(ordersForecast * drng.vary(0.88, 0.08));
      if (ordersActual !== null) cumulative += ordersActual;
      daily.push({
        date: `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        ordersActual, ordersForecast,
        runRateActual, runRateForecast,
        cumulative,
      });
    }

    // Brands within this country
    let brandList = BRANDS;
    if (brand) brandList = BRANDS.filter(b => b.toLowerCase() === brand.toLowerCase());

    const brands = brandList.map((b, bi) => {
      const brng = new SeededRandom(`daily-brand-${c.id}-${b}-${month}`);
      const brandDailyBase = Math.round(baseDailySales * BRAND_SHARES[BRANDS.indexOf(b)]);

      // Showrooms for this brand in this country
      let showroomList = SHOWROOMS[c.name] || [];
      if (showroom) showroomList = showroomList.filter(s => s.id === showroom.toLowerCase() || s.name.toLowerCase().includes(showroom.toLowerCase()));

      const showrooms = showroomList.map(s => {
        const srng = new SeededRandom(`daily-showroom-${s.id}-${b}-${month}`);
        const showroomShare = 1 / showroomList.length;
        const showroomDailyBase = Math.round(brandDailyBase * showroomShare);

        // Models for this brand at this showroom
        let modelList = BRAND_MODELS[b] || [];
        if (model) modelList = modelList.filter(md => md.toLowerCase().includes(model.toLowerCase()));

        const models = modelList.map(md => {
          const mrng = new SeededRandom(`daily-model-${s.id}-${md}-${month}`);
          const modelShare = 1 / modelList.length;
          const modelDailyBase = Math.max(1, Math.round(showroomDailyBase * modelShare));

          // Per-day for this model
          const modelDaily = [];
          for (let d = 1; d <= daysInMonth; d++) {
            const ddrng = new SeededRandom(`dm-${s.id}-${md}-${month}-${d}`);
            const dow = new Date(year, m - 1, d).getDay();
            const isWeekend = dow === 5 || dow === 6;
            const base = isWeekend ? modelDailyBase * 0.4 : modelDailyBase;
            const ordersActual = d <= 15 ? Math.round(ddrng.vary(base, 0.4)) : null; // first 15 days actual
            const ordersForecast = Math.round(ddrng.vary(base * 1.05, 0.3));
            modelDaily.push({
              date: `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
              ordersActual, ordersForecast,
            });
          }

          return { model: md, daily: modelDaily };
        });

        return { showroomId: s.id, showroom: s.name, models };
      });

      const brandMtd = Math.round(brng.vary(brandDailyBase * daysInMonth * 0.7, 0.15));
      const brandMtdTarget = Math.round(brng.vary(brandMtd * 1.05, 0.08));
      const brandMtdLastYear = Math.round(brng.vary(brandMtd * 1.1, 0.1));

      return {
        brand: b,
        salesVolume: brandMtd, salesVolumeTarget: brandMtdTarget, salesVolumeLastYear: brandMtdLastYear,
        showrooms,
      };
    });

    // Country card summary
    const countryMtd = daily.filter(d => d.ordersActual !== null).reduce((s, d) => s + d.ordersActual, 0);
    const crng2 = new SeededRandom(`daily-card-${c.id}-${month}`);

    return {
      countryId: c.id, country: c.name,
      salesVolume: countryMtd,
      salesVolumeTarget: Math.round(crng2.vary(countryMtd * 1.05, 0.08)),
      salesVolumeLastYear: Math.round(crng2.vary(countryMtd * 1.12, 0.1)),
      daily,
      brands,
    };
  });

  return { month, period, countries };
}

/** GET /api/sales-insights/geo?country= */
function getGeo({ country } = {}) {
  const result = {};
  const countryNames = country
    ? [COUNTRIES.find(c => c.id === country.toLowerCase() || c.name.toLowerCase() === country.toLowerCase())?.name].filter(Boolean)
    : Object.keys(SHOWROOMS);

  countryNames.forEach(cn => {
    const showrooms = SHOWROOMS[cn];
    if (showrooms) {
      result[cn] = showrooms.map(s => ({
        showroomId: s.id, name: s.name, latitude: s.lat, longitude: s.lon,
      }));
    }
  });

  return { showrooms: result };
}

/** GET /api/sales-insights/model-channel */
function getModelChannel(month, period, { country, brand } = {}) {
  const { year, month: m } = parseMonth(month);
  const sf = seasonFactor(m);

  const channelShares = [0.55, 0.18, 0.17, 0.10];
  const channels = CHANNELS.map((ch, i) => {
    const crng = new SeededRandom(`channel-${ch}-${month}`);
    const sales = Math.round(crng.vary(4200 * channelShares[i] * sf, 0.12));
    const salesLastYear = Math.round(crng.vary(sales * 1.08, 0.1));
    return { channel: ch, salesVolume: sales, salesVolumeLastYear: salesLastYear, share: fmtDec(channelShares[i] * 100 * crng.vary(1, 0.1)) };
  });

  // Build top models list dynamically from centralized brand/model data
  const modelBaseSales = { Toyota: 500, Lexus: 200, BYD: 280, Honda: 220, Volvo: 90, Polestar: 60, Jeep: 140, Denza: 70, YangWang: 40, Dodge: 120, RAM: 80, Chrysler: 30 };
  let models = [];
  BRANDS.forEach(b => {
    (BRAND_MODELS[b] || []).forEach((m, i) => {
      const base = Math.max(10, Math.round((modelBaseSales[b] || 100) / (i * 0.3 + 1)));
      models.push({ model: m, brand: b, base });
    });
  });
  models.sort((a, b) => b.base - a.base);
  models = models.slice(0, 20);
  if (brand) models = models.filter(m => m.brand.toLowerCase() === brand.toLowerCase());

  const topModels = models.map(md => {
    const mrng = new SeededRandom(`model-${md.model}-${month}`);
    const sales = Math.round(mrng.vary(md.base * sf, 0.15));
    const salesLastYear = Math.round(mrng.vary(sales * 1.08, 0.12));
    const salesTarget = Math.round(mrng.vary(sales * 1.03, 0.08));
    return { model: md.model, brand: md.brand, salesVolume: sales, salesVolumeLastYear: salesLastYear, salesVolumeTarget: salesTarget };
  });

  return { month, period, channels, topModels };
}

/** GET /api/sales-insights/showroom */
function getShowroomView(month, period, { showroom, country } = {}) {
  let allShowrooms = [];
  const countryNames = country
    ? [COUNTRIES.find(c => c.id === country.toLowerCase() || c.name.toLowerCase() === country.toLowerCase())?.name].filter(Boolean)
    : Object.keys(SHOWROOMS);

  countryNames.forEach(cn => {
    (SHOWROOMS[cn] || []).forEach(s => allShowrooms.push({ ...s, country: cn }));
  });

  if (showroom) allShowrooms = allShowrooms.filter(s => s.id === showroom.toLowerCase() || s.name.toLowerCase().includes(showroom.toLowerCase()));

  const MANAGERS = ['Ahmed Al-Mansouri', 'Khalid Hassan', 'Fatima Al-Zaabi', 'Omar Rashid', 'Sarah Khan', 'Mohammed Al-Ali', 'Ravi Patel', 'Nadia Yousef', 'Hassan Ibrahim', 'Priya Sharma', 'Ali Al-Hashmi'];

  const result = allShowrooms.map((s, si) => {
    const srng = new SeededRandom(`showroom-${s.id}-${month}`);
    const reservations = Math.round(srng.vary(180, 0.25)); // orders = reservations
    const reservationsLastYear = Math.round(srng.vary(reservations * 1.08, 0.12));
    const reservationsTarget = Math.round(srng.vary(reservations * 1.05, 0.08));
    const walkIns = Math.round(srng.vary(2500, 0.2)); // walk-ins = visitors
    const walkInsLastYear = Math.round(srng.vary(walkIns * 1.05, 0.1));
    const conversionRate = fmtDec((reservations / walkIns) * 100, 1);
    const avgDealSize = Math.round(srng.vary(142000, 0.1));
    const manager = MANAGERS[si % MANAGERS.length];

    return {
      showroomId: s.id, name: s.name, country: s.country,
      latitude: s.lat, longitude: s.lon,
      manager,
      reservations, reservationsLastYear, reservationsTarget,
      walkIns, walkInsLastYear,
      conversionRate: +conversionRate,
      avgDealSize,
    };
  });

  return { month, period, showrooms: result };
}

/**
 * GET /api/sales-insights/showroom-sales-page?month=&period=&country=&brand=&branch=
 * Per-brand executives leaderboard, top-selling models, and channel-target rows
 * for the showroom-sales page. Brand defaults to Toyota when omitted.
 */
function getShowroomSalesPage(month, period, { country, brand, branch } = {}) {
  const brandList = brand ? [brand] : BRANDS;
  const isYTD = String(period).toUpperCase() === 'YTD';
  const { month: m } = parseMonth(month);
  const periodMul = isYTD ? Math.max(1, m * 0.9) : 1;
  const cMul = country ? (String(country).toLowerCase() === 'uae' ? 0.6
                       : String(country).toLowerCase() === 'ksa' ? 0.22 : 0.05) : 1;

  // All showrooms (flat) for the executives' "showroom" attribution
  const allShowrooms = [];
  Object.keys(SHOWROOMS).forEach(cn => SHOWROOMS[cn].forEach(s => allShowrooms.push({ ...s, country: cn })));
  const scopedShowrooms = country
    ? allShowrooms.filter(s => s.country.toLowerCase() === String(country).toLowerCase()
                            || COUNTRIES.find(c => c.id === country.toLowerCase())?.name === s.country)
    : allShowrooms;
  const branchScoped = branch
    ? scopedShowrooms.filter(s => s.id === branch.toLowerCase() || s.name.toLowerCase().includes(branch.toLowerCase()))
    : scopedShowrooms;

  const EXEC_NAMES = ['Ahmed Al Mansoori', 'Ravi Krishnan', 'Sara Al Maktoum', 'Omar Sharif', 'Layla Al Otaiba',
                      'Khalid Hassan', 'Fatima Al Hashmi', 'Hassan Ibrahim', 'Priya Sharma', 'Mohammed Al Ali',
                      'Nadia Yousef', 'Ali Al Saadi', 'Reem Al Tamimi', 'Tariq Faisal', 'Aisha Rahman'];

  const brands = {};
  for (const b of brandList) {
    const brng = new SeededRandom(`showroom-sales-${b}-${country || 'all'}-${branch || 'all'}-${month}-${period}`);
    const baseShare = brand ? 1 : (BRAND_SHARES[BRANDS.indexOf(b)] ?? 0.1);

    // Executives leaderboard — top 10 in scope
    const executives = EXEC_NAMES.slice(0, 10).map((name, i) => {
      const ergn = new SeededRandom(`showroom-exec-${b}-${name}-${month}-${period}`);
      const showroom = (branchScoped[i % branchScoped.length] || allShowrooms[i % allShowrooms.length]).name;
      const carsSold = Math.round(ergn.vary(140 * baseShare * cMul * periodMul / Math.max(1, i * 0.15 + 1), 0.18));
      return { name, showroom, carsSold };
    }).sort((a, b2) => b2.carsSold - a.carsSold);

    // Top-selling models for this brand
    const modelList = (BRAND_MODELS[b] || []).slice(0, 8);
    const models = modelList.map((label, i) => {
      const mrng = new SeededRandom(`showroom-model-${b}-${label}-${month}-${period}`);
      const value = Math.round(mrng.vary(5500 * baseShare * cMul * periodMul * Math.pow(0.7, i), 0.12));
      const lastYear = Math.round(mrng.vary(value * 1.05, 0.12));
      const target = Math.round(value * mrng.vary(1.05, 0.06));
      return {
        label, value,
        vsLastYear: { value: `${value >= lastYear ? '+' : ''}${(((value - lastYear) / Math.max(lastYear, 1)) * 100).toFixed(1)}%`, up: value >= lastYear },
        vsTarget:   { value: `${value >= target   ? '+' : ''}${(((value - target)   / Math.max(target,   1)) * 100).toFixed(1)}%`, up: value >= target },
      };
    });

    // Channel target rows
    const channelTarget = {
      data: CHANNELS.map((channel, i) => {
        const crng = new SeededRandom(`showroom-channel-${b}-${channel}-${month}-${period}`);
        const actual = Math.round(crng.vary(800 * baseShare * cMul * periodMul * (1 - i * 0.18), 0.14));
        const target = Math.round(actual * crng.vary(1.06, 0.05));
        return { channel, actual, target };
      }),
    };

    brands[b] = { executives, models, channelTarget };
  }

  return { month, period, country: country || null, brand: brand || null, branch: branch || null, brands };
}

/**
 * GET /api/sales-insights/showroom-view-page?month=&period=&country=&brand=&branch=
 * Per-brand visitor / reservation stats with sparkline trends, leads funnel,
 * agent leaderboards, monthly trend, and model breakdown for the showroom-view page.
 */
function getShowroomViewPage(month, period, { country, brand, branch } = {}) {
  const brandList = brand ? [brand] : BRANDS.slice(0, 6);
  const cMul = country ? (String(country).toLowerCase() === 'uae' ? 0.6
                       : String(country).toLowerCase() === 'ksa' ? 0.22 : 0.05) : 1;
  const isYTD = String(period).toUpperCase() === 'YTD';
  const { month: m } = parseMonth(month);
  const periodMul = isYTD ? Math.max(1, m * 0.9) : 1;

  const trend = (rng, base, n = 30) => {
    const out = [];
    let v = base * 0.85;
    for (let i = 0; i < n; i++) {
      v = v * rng.vary(1.005, 0.04);
      out.push(Math.round(v));
    }
    return out;
  };

  const stat = {};
  const leads = {};
  const agents = {};
  const monthly = {};
  const models = {};
  const managers = {};

  const AGENT_NAMES = ['Ahmed K.', 'Sara M.', 'Omar R.', 'Fatima H.', 'Khalid S.', 'Mariam B.', 'Yousef N.', 'Aisha R.',
                       'Tariq F.', 'Layla J.', 'Bilal H.', 'Reem T.', 'Hamza Q.', 'Salma D.', 'Imran W.'];
  const MANAGER_NAMES = ['Khalid Al Mansoori', 'Sarah Khan', 'Mohammed Al Ali', 'Priya Sharma', 'Nadia Yousef', 'Ali Hassan'];
  const CHART_COLORS = ['#4FC3F7', '#81C784', '#FFB74D', '#F06292', '#CE93D8', '#80CBC4', '#FFAB40', '#FF8A65'];

  for (const b of brandList) {
    const baseShare = brand ? 1 : (BRAND_SHARES[BRANDS.indexOf(b)] ?? 0.1);
    const baseFactor = baseShare * cMul * periodMul;

    const visitorsRng = new SeededRandom(`sv-visitors-${b}-${country || 'all'}-${branch || 'all'}-${month}-${period}`);
    const visitorsBase = Math.round(20000 * baseFactor * visitorsRng.vary(1, 0.08));
    const reservationsRng = new SeededRandom(`sv-reservations-${b}-${country || 'all'}-${branch || 'all'}-${month}-${period}`);
    const reservationsBase = Math.round(visitorsBase * reservationsRng.vary(0.18, 0.05));

    const visitorsTrend = trend(visitorsRng, visitorsBase / 10, 30);
    const reservationsTrend = trend(reservationsRng, reservationsBase / 10, 30);

    stat[b] = {
      Visitors:     { value: visitorsBase,    secondaryLabel: `Last year: ${Math.round(visitorsBase * 0.92).toLocaleString()}`,    secondaryValue: Math.round(visitorsBase * 0.92),    trend: visitorsTrend },
      Reservations: { value: reservationsBase, secondaryLabel: `Last year: ${Math.round(reservationsBase * 0.91).toLocaleString()}`, secondaryValue: Math.round(reservationsBase * 0.91), trend: reservationsTrend },
    };

    const leadsRng = new SeededRandom(`sv-leads-${b}-${month}-${period}`);
    const leadsValue = Math.round(5000 * baseFactor * leadsRng.vary(1, 0.08));
    const leadsTarget = Math.round(leadsValue * leadsRng.vary(1.2, 0.08));
    leads[b] = {
      value: leadsValue,
      target: leadsTarget,
      segments: [
        { label: 'Qualified', value: Math.round(leadsValue * leadsRng.vary(0.5, 0.05)), color: CHART_COLORS[0] },
        { label: 'Contacted', value: Math.round(leadsValue * leadsRng.vary(0.3, 0.05)), color: CHART_COLORS[1] },
        { label: 'Converted', value: Math.round(leadsValue * leadsRng.vary(0.2, 0.05)), color: CHART_COLORS[7] },
      ],
    };

    agents[b] = AGENT_NAMES.slice(0, brand ? 12 : 8).map((name, i) => {
      const argn = new SeededRandom(`sv-agent-${b}-${name}-${month}-${period}`);
      const target = brand ? 40 : 30;
      return {
        name,
        avatar: `https://i.pravatar.cc/80?img=${10 + i}`,
        volume: Math.round(argn.vary(target * 1.1 * Math.pow(0.95, i), 0.18)),
        target,
      };
    });

    const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    monthly[b] = MONTHS.map((label, i) => {
      const mrng = new SeededRandom(`sv-monthly-${b}-${label}-${month}-${period}`);
      return { label, value: Math.round(mrng.vary(reservationsBase * 0.9 * (0.85 + i * 0.025), 0.08)) };
    });

    const modelList = (BRAND_MODELS[b] || []).slice(0, 5);
    models[b] = modelList.map((label, i) => {
      const mrng = new SeededRandom(`sv-model-${b}-${label}-${month}-${period}`);
      return { label, value: Math.round(mrng.vary(reservationsBase * 0.18 * Math.pow(0.85, i), 0.12)) };
    });

    managers[b] = {
      name: MANAGER_NAMES[BRANDS.indexOf(b) % MANAGER_NAMES.length],
      avatar: `https://i.pravatar.cc/80?img=${50 + BRANDS.indexOf(b)}`,
      designation: 'Showroom Manager',
    };
  }

  return {
    month, period, country: country || null, brand: brand || null, branch: branch || null,
    stats: stat, leads, agents, monthly, models, managers,
  };
}

/**
 * GET /api/sales-insights/daily-sales-page?month=&period=&country=&brand=&branch=&model=
 * Comprehensive shape for the daily-sales page: per-country sales, per-brand
 * totals, per-model totals, per-showroom totals, and run-rate / order-take charts.
 */
function getDailySalesPage(month, period, { country, brand, branch, model } = {}) {
  const { year, month: m } = parseMonth(month);
  const isYTD = String(period).toUpperCase() === 'YTD';
  const cMul = country ? (String(country).toLowerCase() === 'uae' ? 0.6
                       : String(country).toLowerCase() === 'ksa' ? 0.22 : 0.05) : 1;
  const bMul = brand ? (BRAND_SHARES[BRANDS.indexOf(brand)] ?? 0.1) : 1;
  const periodMul = isYTD ? Math.max(1, m * 0.9) : 1;

  // byBrand bar chart
  const brandList = brand ? [brand] : BRANDS;
  const byBrand = brandList.map(b => {
    const brng = new SeededRandom(`ds-brand-${b}-${country || 'all'}-${month}-${period}`);
    const share = brand ? 1 : (BRAND_SHARES[BRANDS.indexOf(b)] ?? 0.1);
    const value = Math.round(brng.vary(35 * share * cMul * periodMul, 0.18));
    const lastYear = Math.round(brng.vary(value * 1.08, 0.12));
    const target = Math.round(value * brng.vary(1.18, 0.06));
    return {
      label: b, value,
      vsLastYear: { value: `${value >= lastYear ? '+' : ''}${(((value - lastYear) / Math.max(lastYear, 1)) * 100).toFixed(1)}%`, up: value >= lastYear },
      vsTarget:   { value: `${value >= target   ? '+' : ''}${(((value - target)   / Math.max(target,   1)) * 100).toFixed(1)}%`, up: value >= target },
    };
  });

  // byModel — flat top-models list (or scoped to brand)
  const modelSource = brand ? (BRAND_MODELS[brand] || []) : BRANDS.flatMap(b => (BRAND_MODELS[b] || []).slice(0, 3));
  const byModel = modelSource.slice(0, 12).map((label, i) => {
    const mrng = new SeededRandom(`ds-model-${label}-${country || 'all'}-${month}-${period}`);
    const value = Math.round(mrng.vary(40 * bMul * cMul * periodMul * Math.pow(0.85, i), 0.18));
    const lastYear = Math.round(mrng.vary(value * 1.05, 0.12));
    const target = Math.round(value * mrng.vary(1.1, 0.06));
    return {
      label, value,
      vsLastYear: { value: `${value >= lastYear ? '+' : ''}${(((value - lastYear) / Math.max(lastYear, 1)) * 100).toFixed(1)}%`, up: value >= lastYear },
      vsTarget:   { value: `${value >= target   ? '+' : ''}${(((value - target)   / Math.max(target,   1)) * 100).toFixed(1)}%`, up: value >= target },
    };
  });

  // byShowroom
  const allShowrooms = [];
  Object.keys(SHOWROOMS).forEach(cn => SHOWROOMS[cn].forEach(s => allShowrooms.push({ ...s, country: cn })));
  const scopedShowrooms = country
    ? allShowrooms.filter(s => s.country.toLowerCase() === String(country).toLowerCase()
                            || COUNTRIES.find(c => c.id === country.toLowerCase())?.name === s.country)
    : allShowrooms;
  const branchShowrooms = branch
    ? scopedShowrooms.filter(s => s.id === branch.toLowerCase() || s.name.toLowerCase().includes(branch.toLowerCase()))
    : scopedShowrooms;
  const byShowroom = branchShowrooms.map((s, i) => {
    const srng = new SeededRandom(`ds-showroom-${s.id}-${brand || 'all'}-${month}-${period}`);
    const value = Math.round(srng.vary(45 * bMul * Math.pow(0.85, i), 0.18));
    const target = Math.round(value * srng.vary(1.12, 0.06));
    const lastYear = Math.round(srng.vary(value * 1.05, 0.12));
    return {
      label: s.name, value,
      vsLastYear: { value: `${value >= lastYear ? '+' : ''}${(((value - lastYear) / Math.max(lastYear, 1)) * 100).toFixed(1)}%`, up: value >= lastYear },
      vsTarget:   { value: `${value >= target   ? '+' : ''}${(((value - target)   / Math.max(target,   1)) * 100).toFixed(1)}%`, up: value >= target },
    };
  });

  // Per-country sales summary
  const countryList = country
    ? COUNTRIES.filter(c => c.id === String(country).toLowerCase() || c.name.toLowerCase() === String(country).toLowerCase())
    : COUNTRIES;
  const countries = {};
  for (const c of countryList) {
    const crng = new SeededRandom(`ds-country-${c.id}-${brand || 'all'}-${month}-${period}`);
    const total = Math.round(crng.vary(c.baseSales * bMul * periodMul / 30, 0.12));
    const target = Math.round(total * crng.vary(1.1, 0.06));
    const lastYear = Math.round(crng.vary(total * 1.05, 0.12));
    countries[c.name] = {
      total, target, lastYear,
      byBrand: brandList.map(b => {
        const cbRng = new SeededRandom(`ds-country-brand-${c.id}-${b}-${month}-${period}`);
        const share = brand ? 1 : (BRAND_SHARES[BRANDS.indexOf(b)] ?? 0.1);
        return { label: b, value: Math.round(cbRng.vary(total * share, 0.18)) };
      }),
    };
  }

  // Daily run-rate + order-take (30 day windows)
  const dailySalesRunRate = Array.from({ length: 30 }, (_, d) => {
    const drng = new SeededRandom(`ds-rrate-${country || 'all'}-${brand || 'all'}-${month}-${d}`);
    return { day: d + 1, actual: Math.round(drng.vary(30 * bMul * cMul, 0.2)), target: Math.round(35 * bMul * cMul) };
  });
  const dailyOrderTake = Array.from({ length: 30 }, (_, d) => {
    const drng = new SeededRandom(`ds-otake-${country || 'all'}-${brand || 'all'}-${month}-${d}`);
    return { day: d + 1, value: Math.round(drng.vary(45 * bMul * cMul, 0.22)) };
  });

  // Per-brand model + showroom drilldowns
  const brands = {};
  for (const b of brandList) {
    const blist = (BRAND_MODELS[b] || []).slice(0, 6);
    brands[b] = {
      models: blist.map((label, i) => {
        const mrng = new SeededRandom(`ds-brand-model-${b}-${label}-${month}-${period}`);
        const v = Math.round(mrng.vary(50 * Math.pow(0.8, i), 0.15));
        return {
          label, value: v,
          vsLastYear: { value: `${(((v - v * 1.06) / Math.max(v * 1.06, 1)) * 100).toFixed(1)}%`, up: false },
          vsTarget:   { value: `${(((v - v * 1.05) / Math.max(v * 1.05, 1)) * 100).toFixed(1)}%`, up: false },
        };
      }),
      showrooms: branchShowrooms.slice(0, 6).map((s, i) => {
        const srng = new SeededRandom(`ds-brand-showroom-${b}-${s.id}-${month}-${period}`);
        const v = Math.round(srng.vary(35 * Math.pow(0.85, i), 0.16));
        return {
          label: s.name, value: v,
          vsLastYear: { value: `${(((v - v * 1.06) / Math.max(v * 1.06, 1)) * 100).toFixed(1)}%`, up: false },
          vsTarget:   { value: `${(((v - v * 1.05) / Math.max(v * 1.05, 1)) * 100).toFixed(1)}%`, up: false },
        };
      }),
    };
  }

  return {
    month, period, country: country || null, brand: brand || null, branch: branch || null, model: model || null,
    countries, brands, byBrand, byModel, byShowroom, dailyOrderTake, dailySalesRunRate,
  };
}

module.exports = { getOverview, getDailySales, getModelChannel, getShowroomView, getGeo,
                   getShowroomSalesPage, getShowroomViewPage, getDailySalesPage };
