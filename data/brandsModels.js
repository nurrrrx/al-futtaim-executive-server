/**
 * Centralized brands & models reference data.
 *
 * This is the single source of truth for all brand/model lists used
 * across the server data generators. In the future this will be replaced
 * by a backend API / database lookup.
 */

const BRANDS = [
  'Toyota', 'Lexus', 'BYD', 'Honda', 'Volvo', 'Polestar',
  'Jeep', 'Denza', 'YangWang', 'Dodge', 'RAM', 'Chrysler',
];

const BRAND_MODELS = {
  Toyota: [
    'Yaris', 'Corolla', 'Corolla Hybrid', 'Camry', 'Camry Hybrid',
    'Crown Hybrid', 'Raize', 'Urban Cruiser', 'Veloz',
    'Corolla Cross', 'Corolla Cross Hybrid', 'Rav4', 'Rav4 Hybrid',
    'Innova Hybrid', 'Fortuner', 'Highlander Hybrid',
    'Land Cruiser 70', 'Land Cruiser Prado', 'Land Cruiser', 'Land Cruiser Hybrid',
    'GR 86', 'GR Yaris', 'GR Supra', 'GR Corolla',
    'Liteace', 'Hiace', 'Hilux', 'Granvia', 'Coaster',
  ],
  Lexus: [
    'UX300h', 'NX350', 'NX350h', 'LX700h', 'LX600',
    'RX500h', 'RX350', 'RX350h', 'ES350', 'ES300h',
    'LS500h', 'LS350', 'LS500', 'IS350', 'RC350', 'LC500 Convertable',
  ],
  BYD: [
    'Sealion 5', 'Atto 8', 'Sealion 7', 'Song Plus', 'Shark 6',
    'Seal 7', 'Han', 'Seal', 'Qin Plus', 'Seal 6',
  ],
  Honda: [
    'City', 'Civic', 'Accord 1.5L', 'HR-V', 'ZR-V', 'CR-V', 'Accord e:HEV',
  ],
  Volvo: ['XC90', 'XC60', 'XC40', 'EX30'],
  Polestar: ['Polestar 2', 'Polestar 3', 'Polestar 4', 'Polestar 5'],
  Jeep: [
    'Grand Cherokee L', 'Grand Cherokee', 'Wrangler 2 Door',
    'Wrangler 4 Door', 'Commander',
  ],
  Denza: ['Denza B8', 'Denza B5'],
  YangWang: ['U8'],
  Dodge: [
    'Durango', 'Challenger', 'Charger',
    'Durango SRT', 'Challenger SRT', 'Charger SRT',
  ],
  RAM: ['RAM 2500', 'RAM 1500'],
  Chrysler: ['300C'],
};

// Market share weights for data generation (must align with BRANDS order)
const BRAND_SHARES = {
  Toyota: 0.30,
  Lexus: 0.07,
  BYD: 0.15,
  Honda: 0.10,
  Volvo: 0.04,
  Polestar: 0.03,
  Jeep: 0.06,
  Denza: 0.04,
  YangWang: 0.02,
  Dodge: 0.06,
  RAM: 0.04,
  Chrysler: 0.02,
};

// Share array aligned with BRANDS order (for backward compat)
const BRAND_SHARES_ARRAY = BRANDS.map(b => BRAND_SHARES[b]);

module.exports = { BRANDS, BRAND_MODELS, BRAND_SHARES, BRAND_SHARES_ARRAY };
