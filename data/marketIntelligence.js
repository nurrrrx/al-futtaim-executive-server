const { SeededRandom, fmtDec, seasonFactor, yearTrend } = require('./seedEngine');

const COUNTRIES = [
  { id: 'uae', name: 'United Arab Emirates', baseSize: 27000, baseShare: 29.5, coordinate: [54.093, 24.043], camera: { center: [55.25, 25.3], zoom: 7.5 } },
  { id: 'ksa', name: 'Kingdom of Saudi Arabia', baseSize: 59000, baseShare: 1.0, coordinate: [45.207, 23.998], camera: { center: [44.7, 24.0], zoom: 5.5 } },
  { id: 'oman', name: 'Oman', baseSize: 4800, baseShare: 3.2, coordinate: [56.127, 20.917], camera: { center: [57.0, 21.5], zoom: 6.5 } },
  { id: 'qatar', name: 'Qatar', baseSize: 3200, baseShare: 2.1, coordinate: [51.144, 25.547], camera: { center: [51.2, 25.3], zoom: 8.5 } },
  { id: 'egypt', name: 'Egypt', baseSize: 1800, baseShare: 0.4, coordinate: [29.506, 27.565], camera: { center: [30.8, 26.8], zoom: 5.5 } },
  { id: 'srilanka', name: 'Sri Lanka', baseSize: 900, baseShare: 0.2, coordinate: [80.628, 8.153], camera: { center: [80.7, 7.9], zoom: 7.0 } },
];

const { BRANDS: ALL_BRAND_NAMES } = require('./brandsModels');
const OUR_BRANDS = [
  { name: 'Toyota', baseShare: 21.6 }, { name: 'Lexus', baseShare: 1.6 },
  { name: 'BYD', baseShare: 2.7 }, { name: 'Honda', baseShare: 1.9 },
  { name: 'Volvo', baseShare: 0.1 }, { name: 'Polestar', baseShare: 0.1 },
  { name: 'Jeep', baseShare: 0.5 }, { name: 'Denza', baseShare: 0.7 },
  { name: 'YangWang', baseShare: 0.05 }, { name: 'Dodge', baseShare: 0.3 },
  { name: 'RAM', baseShare: 0.2 }, { name: 'Chrysler', baseShare: 0.1 },
];

// Top-10 competition by country. Each list is the brands the local market
// cares about; values are baseline shares before seeded variation.
const COMPETITION_BY_COUNTRY = {
  'United Arab Emirates': [
    { name: 'Toyota', baseShare: 21.6 }, { name: 'Nissan', baseShare: 15.3 },
    { name: 'Mitsubishi', baseShare: 7.6 }, { name: 'Hyundai', baseShare: 6.7 },
    { name: 'Kia', baseShare: 5.8 }, { name: 'Ford', baseShare: 4.2 },
    { name: 'Mazda', baseShare: 3.9 }, { name: 'MG', baseShare: 2.8 },
    { name: 'Chevrolet', baseShare: 2.4 }, { name: 'Lexus', baseShare: 2.0 },
  ],
  'Kingdom of Saudi Arabia': [
    { name: 'Toyota', baseShare: 28.4 }, { name: 'Hyundai', baseShare: 14.1 },
    { name: 'Nissan', baseShare: 9.2 }, { name: 'Kia', baseShare: 7.5 },
    { name: 'Chevrolet', baseShare: 6.0 }, { name: 'Ford', baseShare: 4.3 },
    { name: 'Mazda', baseShare: 3.7 }, { name: 'GMC', baseShare: 3.1 },
    { name: 'MG', baseShare: 2.5 }, { name: 'Geely', baseShare: 2.0 },
  ],
  'Oman': [
    { name: 'Toyota', baseShare: 32.1 }, { name: 'Nissan', baseShare: 13.5 },
    { name: 'Hyundai', baseShare: 8.4 }, { name: 'Kia', baseShare: 6.7 },
    { name: 'Mitsubishi', baseShare: 5.9 }, { name: 'Mazda', baseShare: 4.8 },
    { name: 'Chevrolet', baseShare: 3.5 }, { name: 'Suzuki', baseShare: 3.0 },
    { name: 'Honda', baseShare: 2.4 }, { name: 'Ford', baseShare: 2.1 },
  ],
  'Qatar': [
    { name: 'Toyota', baseShare: 27.8 }, { name: 'Nissan', baseShare: 16.9 },
    { name: 'Mitsubishi', baseShare: 8.1 }, { name: 'Hyundai', baseShare: 7.0 },
    { name: 'Kia', baseShare: 5.4 }, { name: 'Honda', baseShare: 3.8 },
    { name: 'GAC', baseShare: 3.0 }, { name: 'Ford', baseShare: 2.6 },
    { name: 'MG', baseShare: 2.3 }, { name: 'Lexus', baseShare: 2.0 },
  ],
  'Egypt': [
    { name: 'Hyundai', baseShare: 18.6 }, { name: 'Chevrolet', baseShare: 13.4 },
    { name: 'Nissan', baseShare: 10.2 }, { name: 'Mitsubishi', baseShare: 8.7 },
    { name: 'MG', baseShare: 6.5 }, { name: 'BYD', baseShare: 5.8 },
    { name: 'Toyota', baseShare: 5.0 }, { name: 'Kia', baseShare: 4.4 },
    { name: 'Renault', baseShare: 3.6 }, { name: 'Suzuki', baseShare: 2.9 },
  ],
  'Sri Lanka': [
    { name: 'Toyota', baseShare: 21.6 }, { name: 'Nissan', baseShare: 15.3 },
    { name: 'Mitsubishi', baseShare: 7.6 }, { name: 'Jetour', baseShare: 6.7 },
    { name: 'Hyundai', baseShare: 5.8 }, { name: 'Kia', baseShare: 4.2 },
    { name: 'Ford', baseShare: 3.9 }, { name: 'Renault', baseShare: 2.4 },
    { name: 'Changan', baseShare: 2.1 }, { name: 'Suzuki', baseShare: 1.8 },
  ],
};

// Default fallback when no country is specified — preserves prior behaviour
// for any caller that hasn't been updated yet.
const DEFAULT_COMPETITION_BRANDS = COMPETITION_BY_COUNTRY['United Arab Emirates'];

const BRAND_COUNTRY_MAP = {
  'United Arab Emirates': OUR_BRANDS,
  'Kingdom of Saudi Arabia': [{ name: 'BYD', baseShare: 1.0 }],
  'Oman': [{ name: 'Honda', baseShare: 1.2 }, { name: 'Volvo', baseShare: 0.1 }],
  'Qatar': [{ name: 'Honda', baseShare: 0.8 }, { name: 'GAC', baseShare: 0.5 }, { name: 'Volvo', baseShare: 0.1 }],
  'Egypt': [{ name: 'Toyota', baseShare: 8.4 }, { name: 'Lexus', baseShare: 1.1 }],
  'Sri Lanka': [{ name: 'Suzuki', baseShare: 12.3 }],
};

function parseMonth(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  return { year: y, month: m };
}

function getMonthCountryData(c, monthStr) {
  const { year, month: m } = parseMonth(monthStr);
  const rng = new SeededRandom(`${c.id}-${monthStr}`);
  const size = Math.round(rng.vary(c.baseSize * seasonFactor(m) * yearTrend(year), 0.12));
  const lySize = Math.round(rng.vary(size * 1.3, 0.2));
  const share = fmtDec(rng.vary(c.baseShare, 0.15));
  const lyShare = fmtDec(share - rng.float(-0.5, 1.5), 1);
  return { size, lySize, share, lyShare };
}

/** GET /api/market-intelligence/overview?month=&period=&country= */
function getOverview(month, period, { country } = {}) {
  const { year, month: m } = parseMonth(month);
  const filtered = country ? COUNTRIES.filter(c => c.id === country) : COUNTRIES;

  const countryCards = filtered.map(c => {
    let size, lySize, share, lyShare;
    if (period === 'YTD') {
      let tS = 0, tL = 0, sS = 0, sL = 0;
      for (let i = 1; i <= m; i++) {
        const d = getMonthCountryData(c, `${year}-${String(i).padStart(2, '0')}`);
        tS += d.size; tL += d.lySize; sS += d.share; sL += d.lyShare;
      }
      size = tS; lySize = tL; share = fmtDec(sS / m); lyShare = fmtDec(sL / m);
    } else {
      const d = getMonthCountryData(c, month);
      size = d.size; lySize = d.lySize; share = d.share; lyShare = d.lyShare;
    }
    return {
      countryId: c.id, country: c.name,
      marketSize: size, marketSizeLastYear: lySize,
      marketShare: share, marketShareLastYear: lyShare,
    };
  });

  return { month, period, countryCards };
}

function getMonthBrandData(countryId, brandName, monthStr) {
  const brng = new SeededRandom(`brand-${countryId}-${brandName}-${monthStr}`);
  const country = COUNTRIES.find(c => c.id === countryId);
  const brandDef = (BRAND_COUNTRY_MAP[country?.name] || []).find(b => b.name === brandName);
  const val = fmtDec(brng.vary((brandDef?.baseShare || 1), 0.2));
  return { val, lyDelta: brng.float(-20, 40), tgtDelta: brng.float(-15, 25) };
}

/** GET /api/market-intelligence/detail?country=uae&month=&period=&brand= */
function getCountryDetail(countryId, month, period, { brand } = {}) {
  const { year, month: m } = parseMonth(month);
  const country = COUNTRIES.find(c => c.id === countryId);
  if (!country) return null;

  // KPI
  let size, lySize, share, lyShare;
  if (period === 'YTD') {
    let tS = 0, tL = 0, sS = 0, sL = 0;
    for (let i = 1; i <= m; i++) {
      const d = getMonthCountryData(country, `${year}-${String(i).padStart(2, '0')}`);
      tS += d.size; tL += d.lySize; sS += d.share; sL += d.lyShare;
    }
    size = tS; lySize = tL; share = fmtDec(sS / m); lyShare = fmtDec(sL / m);
  } else {
    const d = getMonthCountryData(country, month);
    size = d.size; lySize = d.lySize; share = d.share; lyShare = d.lyShare;
  }

  // Brand market share
  let brandList = BRAND_COUNTRY_MAP[country.name] || [];
  if (brand) brandList = brandList.filter(b => b.name.toLowerCase() === brand.toLowerCase());

  let brands;
  if (period === 'YTD') {
    const accum = {};
    for (let i = 1; i <= m; i++) {
      const mk = `${year}-${String(i).padStart(2, '0')}`;
      brandList.forEach(b => {
        if (!accum[b.name]) accum[b.name] = { sumVal: 0, sumLy: 0, sumTgt: 0, count: 0 };
        const d = getMonthBrandData(countryId, b.name, mk);
        accum[b.name].sumVal += d.val; accum[b.name].sumLy += d.lyDelta;
        accum[b.name].sumTgt += d.tgtDelta; accum[b.name].count++;
      });
    }
    brands = Object.entries(accum).map(([name, a]) => ({
      brand: name, marketShare: fmtDec(a.sumVal / a.count),
      vsLastYear: fmtDec(a.sumLy / a.count), vsTarget: fmtDec(a.sumTgt / a.count),
    }));
  } else {
    brands = brandList.map(b => {
      const d = getMonthBrandData(countryId, b.name, month);
      return { brand: b.name, marketShare: d.val, vsLastYear: fmtDec(d.lyDelta), vsTarget: fmtDec(d.tgtDelta) };
    });
  }

  return {
    countryId, country: country.name, month, period,
    marketSize: size, marketSizeLastYear: lySize,
    marketShare: share, marketShareLastYear: lyShare,
    brandMarketShare: brands,
  };
}

function resolveCountryName(countryRef) {
  if (!countryRef) return null;
  const found = COUNTRIES.find(c => c.id === countryRef || c.name === countryRef);
  return found ? found.name : countryRef;
}

function getMonthCompData(monthStr, countryName) {
  const brands = (countryName && COMPETITION_BY_COUNTRY[countryName]) || DEFAULT_COMPETITION_BRANDS;
  const seedKey = countryName || 'global';
  return brands.map(b => {
    const brng = new SeededRandom(`comp-${seedKey}-${b.name}-${monthStr}`);
    return { name: b.name, val: fmtDec(brng.vary(b.baseShare, 0.15)), lyChange: fmtDec(brng.float(-1.8, 1.8)) };
  });
}

/** GET /api/market-intelligence/competition?month=&period=&brand=&country= */
function getCompetitionIntelligence(month, period, { brand, country } = {}) {
  const { year, month: m } = parseMonth(month);
  const countryName = resolveCountryName(country);
  let topBrands;

  if (period === 'YTD') {
    const accum = {};
    for (let i = 1; i <= m; i++) {
      getMonthCompData(`${year}-${String(i).padStart(2, '0')}`, countryName).forEach(b => {
        if (!accum[b.name]) accum[b.name] = { sumVal: 0, sumLy: 0, count: 0 };
        accum[b.name].sumVal += b.val; accum[b.name].sumLy += b.lyChange; accum[b.name].count++;
      });
    }
    topBrands = Object.entries(accum).map(([name, a]) => ({
      brand: name, marketShare: fmtDec(a.sumVal / a.count), vsLastYear: fmtDec(a.sumLy / a.count),
    })).sort((a, b) => b.marketShare - a.marketShare);
  } else {
    topBrands = getMonthCompData(month, countryName).map(b => ({
      brand: b.name, marketShare: b.val, vsLastYear: b.lyChange,
    })).sort((a, b) => b.marketShare - a.marketShare);
  }

  if (brand) topBrands = topBrands.filter(b => b.brand.toLowerCase() === brand.toLowerCase());

  const winners = topBrands.filter(b => b.vsLastYear >= 0).slice(0, 5);
  const losers = topBrands.filter(b => b.vsLastYear < 0).slice(0, 5);

  return { month, period, country: countryName || null, topBrands, winners, losers };
}

/** GET /api/market-intelligence/geo */
function getGeoConfig() {
  return { locations: COUNTRIES.map(c => ({ id: c.id, label: c.name, coordinate: c.coordinate, camera: c.camera })) };
}

module.exports = { getOverview, getCountryDetail, getCompetitionIntelligence, getGeoConfig };
