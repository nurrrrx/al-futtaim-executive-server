const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { connectDB } = require('./db');
const Design = require('./models/Design');
const Layout = require('./models/Layout');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Connect to MongoDB
connectDB();

// ── Swagger API Docs ────────────────────────────────────────
const swaggerUi = require('swagger-ui-express');
const openApiSpec = require('./openapi');
app.get('/openapi.json', (req, res) => res.json(openApiSpec));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  customCss: `
    body { background: #0b1a2e; }
    .swagger-ui { background: #0b1a2e; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #fff; }
    .swagger-ui .info p, .swagger-ui .info li { color: rgba(255,255,255,0.6); }
    .swagger-ui .scheme-container { background: #0f2240; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .swagger-ui .opblock-tag { color: #E6A817 !important; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .swagger-ui .opblock { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.1); }
    .swagger-ui .opblock .opblock-summary { border-color: rgba(255,255,255,0.08); }
    .swagger-ui .opblock-description-wrapper p { color: rgba(255,255,255,0.5); }
    .swagger-ui .parameter__name { color: #E6A817 !important; }
    .swagger-ui .parameter__type { color: rgba(255,255,255,0.4); }
    .swagger-ui table thead tr td, .swagger-ui table thead tr th { color: rgba(255,255,255,0.5); border-color: rgba(255,255,255,0.1); }
    .swagger-ui .response-col_status { color: #4CAF50; }
    .swagger-ui .responses-inner h4 { color: rgba(255,255,255,0.5); }
    .swagger-ui .model-title { color: #E6A817; }
    .swagger-ui input[type=text], .swagger-ui textarea, .swagger-ui select { background: rgba(255,255,255,0.06); color: #fff; border-color: rgba(255,255,255,0.2); }
    .swagger-ui .btn { border-color: rgba(255,255,255,0.2); }
    .swagger-ui .btn.execute { background: #E6A817; color: #000; border: none; }
    .swagger-ui .btn.cancel { background: rgba(255,255,255,0.1); color: #fff; }
    .swagger-ui .highlight-code { background: rgba(0,0,0,0.3); }
    .swagger-ui .highlight-code pre { color: #c6c6c6; }
    .swagger-ui .microlight { background: rgba(0,0,0,0.3) !important; color: #c6c6c6 !important; }
    .swagger-ui .copy-to-clipboard { background: rgba(255,255,255,0.08); }
    .swagger-ui .opblock-body pre.microlight { background: rgba(0,0,0,0.4) !important; }
    .swagger-ui .responses-table .response-col_description { color: rgba(255,255,255,0.5); }
    .swagger-ui .response-col_links { color: rgba(255,255,255,0.3); }
    .swagger-ui .model { color: rgba(255,255,255,0.6); }
    .swagger-ui section.models { border-color: rgba(255,255,255,0.1); }
    .swagger-ui .servers > label select { background: #0f2240; color: #fff; }
  `,
  customSiteTitle: 'Al Futtaim Automotive API',
}));

// ── API Routes ──────────────────────────────────────────────
app.use('/api/market-intelligence', require('./routes/marketIntelligence'));
app.use('/api/sales-insights', require('./routes/salesInsights'));
app.use('/api/lead-management', require('./routes/leadManagement'));
app.use('/api/customer-intelligence', require('./routes/customerIntelligence'));
app.use('/api/financial-intelligence', require('./routes/financialIntelligence'));
app.use('/api/stock-logistics', require('./routes/stockLogistics'));

// ── Existing Endpoints (preserve backward compatibility) ────

// Designs API — MongoDB-backed persistent storage

app.get('/api/designs', async (req, res) => {
  try {
    const designs = await Design.find({}).lean();
    res.json({ designs: designs.map(d => ({ id: d._id, name: d.name, file: d.file, designerName: d.designerName, description: d.description, overrides: d.overrides, baseSnapshot: d.baseSnapshot, createdDate: d.createdDate, updatedDate: d.updatedDate, lastComment: d.lastComment })) });
  } catch (e) {
    res.json({ designs: [] });
  }
});

app.get('/api/designs/:file', async (req, res) => {
  try {
    const d = await Design.findOne({ file: req.params.file }).lean();
    if (!d) return res.status(404).json({ error: 'Not found' });
    res.json({ id: d._id, name: d.name, file: d.file, designerName: d.designerName, description: d.description, overrides: d.overrides, baseSnapshot: d.baseSnapshot, createdDate: d.createdDate, updatedDate: d.updatedDate, lastComment: d.lastComment });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/designs', async (req, res) => {
  try {
    const { name, designerName, description, overrides, baseSnapshot } = req.body;
    const file = `${name.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').toLowerCase()}.json`;
    // Upsert — if same file exists, update it
    const d = await Design.findOneAndUpdate(
      { file },
      { name, file, designerName: designerName || '', description: description || '', overrides: overrides || {}, baseSnapshot: baseSnapshot || null, lastComment: '' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ file: d.file, id: d._id, name: d.name });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/designs/:file', async (req, res) => {
  try {
    const update = {};
    if (req.body.overrides) update.overrides = req.body.overrides;
    if (req.body.comment) update.lastComment = req.body.comment;
    if (req.body.name) update.name = req.body.name;
    if (req.body.designerName) update.designerName = req.body.designerName;
    if (req.body.description !== undefined) update.description = req.body.description;
    await Design.findOneAndUpdate({ file: req.params.file }, update);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/designs/:file', async (req, res) => {
  try {
    await Design.findOneAndDelete({ file: req.params.file });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Layouts API — MongoDB-backed persistent storage for card positions/sizes

app.get('/api/layouts', async (req, res) => {
  try {
    const layouts = await Layout.find({}).lean();
    res.json({ layouts: layouts.map(d => ({ id: d._id, name: d.name, file: d.file, designerName: d.designerName, description: d.description, positions: d.positions, basePositions: d.basePositions, createdDate: d.createdDate, updatedDate: d.updatedDate, lastComment: d.lastComment })) });
  } catch (e) {
    res.json({ layouts: [] });
  }
});

app.get('/api/layouts/:file', async (req, res) => {
  try {
    const d = await Layout.findOne({ file: req.params.file }).lean();
    if (!d) return res.status(404).json({ error: 'Not found' });
    res.json({ id: d._id, name: d.name, file: d.file, designerName: d.designerName, description: d.description, positions: d.positions, basePositions: d.basePositions, createdDate: d.createdDate, updatedDate: d.updatedDate, lastComment: d.lastComment });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/layouts', async (req, res) => {
  try {
    const { name, designerName, description, positions, basePositions } = req.body;
    const file = `${name.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').toLowerCase()}.json`;
    const d = await Layout.findOneAndUpdate(
      { file },
      { name, file, designerName: designerName || '', description: description || '', positions: positions || {}, basePositions: basePositions || null, lastComment: '' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ file: d.file, id: d._id, name: d.name });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/layouts/:file', async (req, res) => {
  try {
    const update = {};
    if (req.body.positions) update.positions = req.body.positions;
    if (req.body.comment) update.lastComment = req.body.comment;
    if (req.body.name) update.name = req.body.name;
    if (req.body.designerName) update.designerName = req.body.designerName;
    if (req.body.description !== undefined) update.description = req.body.description;
    await Layout.findOneAndUpdate({ file: req.params.file }, update);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/layouts/:file', async (req, res) => {
  try {
    await Layout.findOneAndDelete({ file: req.params.file });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Logistics grid — file lives inside the server repo so Railway can find it.
const GRID_DATA_PATH = path.join(__dirname, 'data', '(v2)', 'logistics', 'yard_grid_data.json');
app.get('/api/logistics/grid/full', (req, res) => {
  if (fs.existsSync(GRID_DATA_PATH)) {
    res.json(JSON.parse(fs.readFileSync(GRID_DATA_PATH, 'utf8')));
  } else {
    res.status(404).json({ error: 'Grid data not found' });
  }
});

// ── Health check ────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', services: ['logistics', 'designs'], timestamp: new Date().toISOString() }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', services: ['logistics', 'designs'], timestamp: new Date().toISOString() }));

// ── API index ───────────────────────────────────────────────
app.get('/api', (req, res) => {
  res.json({
    endpoints: {
      'market-intelligence': {
        'GET /api/market-intelligence/overview': 'Country cards with market size & share. Params: month, period',
        'GET /api/market-intelligence/detail': 'Brand market share for a country. Params: country, month, period',
        'GET /api/market-intelligence/competition': 'Top 10 brands, winners, losers. Params: month, period',
        'GET /api/market-intelligence/geo': 'Static geographic config (coordinates, cameras)',
      },
      'sales-insights': {
        'GET /api/sales-insights/overview': 'Sales KPIs, country & brand breakdown, sales plan. Params: month, period',
        'GET /api/sales-insights/daily': 'Daily sales with cumulative. Params: month, period',
        'GET /api/sales-insights/model-channel': 'Sales by model and channel. Params: month, period',
        'GET /api/sales-insights/showroom': 'Showroom performance. Params: month, period',
      },
      'lead-management': {
        'GET /api/lead-management/overview': 'Lead funnel, conversion rates, lost reasons. Params: month, period',
        'GET /api/lead-management/brands': 'Lead metrics by brand and region. Params: month, period',
      },
      'customer-intelligence': {
        'GET /api/customer-intelligence/overview': 'Customer KPIs & demographics. Params: month, period',
        'GET /api/customer-intelligence/sentiment': 'Sentiment analysis by topic. Params: month, period',
        'GET /api/customer-intelligence/brand-comparison': 'Brand comparison metrics. Params: month, period',
      },
      'financial-intelligence': {
        'GET /api/financial-intelligence/overview': 'Financial KPIs & monthly forecast. Params: month, period',
        'GET /api/financial-intelligence/profitability': 'Brand profitability. Params: month, period',
        'GET /api/financial-intelligence/indirect-costs': 'Indirect cost categories. Params: month, period',
        'GET /api/financial-intelligence/fcf': 'Free cash flow components. Params: month, period',
      },
      'stock-logistics': {
        'GET /api/stock-logistics/overview': 'Stock KPIs, brand stock, run-down. Params: month, period',
        'GET /api/stock-logistics/logistics': 'Supply pipeline & brand logistics. Params: month, period',
      },
      'designs': {
        'GET /api/designs': 'List saved designs with full overrides & baseSnapshot',
        'POST /api/designs': 'Create design. Body: { name, overrides }',
        'PUT /api/designs/:file': 'Update design',
        'DELETE /api/designs/:file': 'Delete design',
      },
    },
  });
});

// Auto-seed default design on startup
async function seedDefault() {
  try {
    const existing = await Design.findOne({ file: 'default.json' });
    if (!existing) {
      await Design.create({
        name: 'Default',
        file: 'default.json',
        designerName: 'System',
        description: 'Default style configuration',
        overrides: {},
        lastComment: '',
      });
      console.log('Default design seeded');
    }
  } catch (e) {
    console.log('Seed skipped:', e.message);
  }
}
setTimeout(seedDefault, 3000); // Wait for MongoDB connection

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
