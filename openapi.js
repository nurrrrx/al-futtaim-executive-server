/**
 * OpenAPI 3.0 specification for Al Futtaim Automotive API.
 * Defines all endpoints with editable parameters for Swagger UI.
 */

const timeParams = [
  { name: 'month', in: 'query', schema: { type: 'string', default: '2026-03' }, description: 'Month in YYYY-MM format' },
  { name: 'period', in: 'query', schema: { type: 'string', enum: ['MTD', 'YTD'], default: 'MTD' }, description: 'MTD (month-to-date) or YTD (year-to-date, aggregated Jan through selected month)' },
];

const filterCountry = { name: 'country', in: 'query', schema: { type: 'string' }, description: 'Filter by country ID: uae, ksa, oman, qatar, egypt, srilanka' };
const filterBrand = { name: 'brand', in: 'query', schema: { type: 'string' }, description: 'Filter by brand name: Toyota, BYD, Honda, Lexus, etc.' };
const filterShowroom = { name: 'showroom', in: 'query', schema: { type: 'string' }, description: 'Filter by showroom name' };

module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'Al Futtaim Automotive API',
    version: '1.1',
    description: 'Executive BI Dashboard — all numeric values are raw numbers. Formatting (commas, +/- signs, colors, arrows) is handled client-side.',
  },
  servers: [
    { url: 'https://al-futtaim-executive-server-production.up.railway.app', description: 'Production (Railway)' },
    { url: 'http://localhost:3001', description: 'Local development' },
  ],
  tags: [
    { name: 'Market Intelligence', description: 'Market size, share, competition by country and brand' },
    { name: 'Sales Insights', description: 'Sales KPIs, daily sales, model/channel mix, showroom performance' },
    { name: 'Lead Management', description: 'Lead funnel, conversion rates, brand breakdown' },
    { name: 'Customer Intelligence', description: 'Customer KPIs, demographics, sentiment, brand comparison' },
    { name: 'Financial Intelligence', description: 'Revenue, EBIT, profitability, indirect costs, FCF' },
    { name: 'Stock & Logistics', description: 'Stock levels, pipeline, supply chain' },
    { name: 'Designs', description: 'Design style configurations (MongoDB-persisted)' },
    { name: 'System', description: 'Health check and system info' },
  ],
  paths: {
    // ── Market Intelligence ──
    '/api/market-intelligence/overview': {
      get: {
        tags: ['Market Intelligence'],
        summary: 'Country cards with market size & share',
        description: 'Returns raw numeric market size (units) and market share (%) for each country. YTD sums market size and averages market share across Jan–selected month.',
        parameters: [...timeParams, filterCountry],
        responses: { 200: { description: 'Country card data' } },
      },
    },
    '/api/market-intelligence/detail': {
      get: {
        tags: ['Market Intelligence'],
        summary: 'Brand market share by country',
        description: 'Returns KPI (market size/share) and brand-level market share breakdown for a specific country.',
        parameters: [
          { name: 'country', in: 'query', required: true, schema: { type: 'string', enum: ['uae', 'ksa', 'oman', 'qatar', 'egypt', 'srilanka'] }, description: 'Country ID (required)' },
          ...timeParams,
          filterBrand,
        ],
        responses: { 200: { description: 'Country detail with brand breakdown' }, 400: { description: 'Missing country param' }, 404: { description: 'Country not found' } },
      },
    },
    '/api/market-intelligence/competition': {
      get: {
        tags: ['Market Intelligence'],
        summary: 'Top 10 brands, winners & losers',
        description: 'Market-wide brand ranking by market share. Winners = positive vs last year, Losers = negative.',
        parameters: [...timeParams, filterBrand],
        responses: { 200: { description: 'Competition intelligence data' } },
      },
    },
    '/api/market-intelligence/geo': {
      get: {
        tags: ['Market Intelligence'],
        summary: 'Geographic config (static)',
        description: 'Country coordinates and camera settings for map display. Rarely changes.',
        parameters: [],
        responses: { 200: { description: 'Geo config' } },
      },
    },

    // ── Sales Insights ──
    '/api/sales-insights/overview': {
      get: {
        tags: ['Sales Insights'],
        summary: 'Sales KPIs, country & brand breakdown, sales plan',
        description: 'Total sales, revenue, gross margin. Includes country breakdown, brand breakdown, and 12-month sales plan (actuals + forecast).',
        parameters: [...timeParams, filterCountry, filterBrand],
        responses: { 200: { description: 'Sales overview data' } },
      },
    },
    '/api/sales-insights/daily': {
      get: {
        tags: ['Sales Insights'],
        summary: 'Daily sales with cumulative',
        description: 'Each day in the month: date, units sold, cumulative total.',
        parameters: [...timeParams, filterCountry, filterBrand],
        responses: { 200: { description: 'Daily sales data' } },
      },
    },
    '/api/sales-insights/model-channel': {
      get: {
        tags: ['Sales Insights'],
        summary: 'Sales by model and channel',
        description: 'Distribution channel breakdown (Showroom, Online, Fleet, Government) and top models with units.',
        parameters: [...timeParams, filterCountry, filterBrand],
        responses: { 200: { description: 'Model and channel data' } },
      },
    },
    '/api/sales-insights/showroom': {
      get: {
        tags: ['Sales Insights'],
        summary: 'Showroom performance',
        description: 'Per-showroom metrics: units, traffic, conversion rate, avg deal size.',
        parameters: [...timeParams, filterShowroom],
        responses: { 200: { description: 'Showroom data' } },
      },
    },

    // ── Lead Management ──
    '/api/lead-management/funnel': {
      get: {
        tags: ['Lead Management'],
        summary: 'Full lead funnel with KPI cards, conversions, lost reasons, and brand breakdown',
        description: 'Returns: (1) 6 KPI stages (Leads→Invoices) with value/target/lastYear, (2) funnel conversion rates (current/lastYear/target), (3) weekly conversion time series, (4) lost reasons per transition stage, (5) lost leads re-activation, (6) per-brand breakdown with the same structure.',
        parameters: [...timeParams],
        responses: { 200: { description: 'Full lead funnel data' } },
      },
    },
    '/api/lead-management/geo': {
      get: {
        tags: ['Lead Management'],
        summary: 'Lead metrics by region with brand and model breakdowns',
        description: 'Per-region (UAE, KSA) lead KPIs, brand-level conversion rates with vs-last-year and vs-target deltas, and model-level breakdown per brand.',
        parameters: [...timeParams],
        responses: { 200: { description: 'Regional lead geo data' } },
      },
    },

    // ── Customer Intelligence ──
    '/api/customer-intelligence/overview': {
      get: {
        tags: ['Customer Intelligence'],
        summary: 'Customer KPIs & demographics',
        description: 'Active customers, NPS, CSAT, sentiment score. Demographics: nationalities, gender, age groups.',
        parameters: [...timeParams],
        responses: { 200: { description: 'Customer overview data' } },
      },
    },
    '/api/customer-intelligence/sentiment': {
      get: {
        tags: ['Customer Intelligence'],
        summary: 'Sentiment analysis by topic',
        description: 'Overall positive/negative split and per-topic sentiment (Service Quality, Wait Time, etc.)',
        parameters: [...timeParams],
        responses: { 200: { description: 'Sentiment data' } },
      },
    },
    '/api/customer-intelligence/brand-comparison': {
      get: {
        tags: ['Customer Intelligence'],
        summary: 'Brand comparison metrics',
        description: 'NPS, CSAT, sentiment, customer count by brand.',
        parameters: [...timeParams],
        responses: { 200: { description: 'Brand comparison data' } },
      },
    },

    // ── Financial Intelligence ──
    '/api/financial-intelligence/overview': {
      get: {
        tags: ['Financial Intelligence'],
        summary: 'Financial KPIs & monthly forecast',
        description: 'Revenue, EBIT, EBIT%, indirect cost%, FCF, ROCE%, gross margin, working capital. Monthly actuals + forecast.',
        parameters: [...timeParams],
        responses: { 200: { description: 'Financial overview data' } },
      },
    },
    '/api/financial-intelligence/profitability': {
      get: {
        tags: ['Financial Intelligence'],
        summary: 'Brand profitability',
        description: 'Revenue, EBIT, EBIT% per brand group.',
        parameters: [...timeParams],
        responses: { 200: { description: 'Profitability data' } },
      },
    },
    '/api/financial-intelligence/indirect-costs': {
      get: {
        tags: ['Financial Intelligence'],
        summary: 'Indirect cost categories',
        description: 'Cost breakdown: Staff, Marketing, Rent, IT, Other.',
        parameters: [...timeParams],
        responses: { 200: { description: 'Indirect cost data' } },
      },
    },
    '/api/financial-intelligence/fcf': {
      get: {
        tags: ['Financial Intelligence'],
        summary: 'Free cash flow waterfall',
        description: 'FCF components: Operating Cash Flow, CapEx, Working Capital, Tax, Other.',
        parameters: [...timeParams],
        responses: { 200: { description: 'FCF data' } },
      },
    },

    // ── Stock & Logistics ──
    '/api/stock-logistics/overview': {
      get: {
        tags: ['Stock & Logistics'],
        summary: 'Stock KPIs, brand stock, run-down',
        description: 'Total/new/used/demo units, stock depth. Per-brand stock levels. Monthly run-down (opening, arrivals, sales, closing, depth).',
        parameters: [...timeParams],
        responses: { 200: { description: 'Stock overview data' } },
      },
    },
    '/api/stock-logistics/logistics': {
      get: {
        tags: ['Stock & Logistics'],
        summary: 'Supply pipeline',
        description: 'Factory ordered, in transit, at port, delivered. Per-brand pipeline breakdown.',
        parameters: [...timeParams],
        responses: { 200: { description: 'Logistics data' } },
      },
    },

    // ── Designs ──
    '/api/designs': {
      get: {
        tags: ['Designs'],
        summary: 'List all designs',
        description: 'Returns all saved design styles from MongoDB with full overrides and baseSnapshot.',
        parameters: [],
        responses: { 200: { description: 'List of designs' } },
      },
      post: {
        tags: ['Designs'],
        summary: 'Create or upsert a design',
        description: 'Creates a new design or updates existing one with same filename.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: {
            name: { type: 'string', example: 'My Design' },
            designerName: { type: 'string', example: 'John' },
            description: { type: 'string', example: 'Dark theme with gold accents' },
            overrides: { type: 'object', example: { appHeader: { backgroundColor: '#1a1a1a' } } },
            baseSnapshot: { type: 'object' },
          } } } },
        },
        responses: { 200: { description: 'Design created' } },
      },
    },
    '/api/designs/{file}': {
      get: {
        tags: ['Designs'],
        summary: 'Get a design by filename',
        parameters: [{ name: 'file', in: 'path', required: true, schema: { type: 'string', default: 'default.json' }, description: 'Design filename' }],
        responses: { 200: { description: 'Design data' }, 404: { description: 'Not found' } },
      },
      put: {
        tags: ['Designs'],
        summary: 'Update a design',
        parameters: [{ name: 'file', in: 'path', required: true, schema: { type: 'string' }, description: 'Design filename' }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: {
            overrides: { type: 'object' },
            comment: { type: 'string' },
            name: { type: 'string' },
          } } } },
        },
        responses: { 200: { description: 'Updated' } },
      },
      delete: {
        tags: ['Designs'],
        summary: 'Delete a design',
        parameters: [{ name: 'file', in: 'path', required: true, schema: { type: 'string' }, description: 'Design filename' }],
        responses: { 200: { description: 'Deleted' } },
      },
    },

    // ── System ──
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        parameters: [],
        responses: { 200: { description: 'Server status' } },
      },
    },
  },
};
