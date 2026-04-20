const express = require('express');
const cors = require('cors');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerDoc = require('./swagger.json');
const { connectDB } = require('./db');
const Design = require('./models/Design');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Connect to MongoDB
connectDB();

// ── Swagger API docs ────────────────────────────────────────────
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Al-Futtaim Executive API',
  swaggerOptions: {
    requestInterceptor: (req) => {
      if (req.method === 'PUT' || req.method === 'DELETE' || req.method === 'POST') {
        req.url = req.url.split('/api/')[0] + '/api/mock?method=' + req.method;
        req.method = 'GET';
      }
      return req;
    }
  }
}));

// Mock endpoint for swagger — returns canned responses instead of executing real mutations
app.get('/api/mock', (req, res) => {
  const method = req.query.method || 'UNKNOWN';
  const mocks = {
    POST:   { mock: true, message: 'This is a mock response — no data was created', success: true, file: 'example.json' },
    PUT:    { mock: true, message: 'This is a mock response — no data was modified', success: true },
    DELETE: { mock: true, message: 'This is a mock response — no data was deleted', success: true },
  };
  res.json(mocks[method] || { mock: true, message: 'Mock response for ' + method });
});

// ── Service routers ─────────────────────────────────────────────
const logisticsRouter = require('./services/logistics');
app.use('/api/logistics', logisticsRouter);

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

// Root redirect to docs
app.get('/', (req, res) => { res.redirect('/docs'); });

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
setTimeout(seedDefault, 3000);

app.listen(PORT, () => {
  console.log(`Al-Futtaim Executive Server running on port ${PORT}`);
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

// Logistics grid (existing)
const GRID_DATA_PATH = path.join(__dirname, '..', 'data', '(v2)', 'logistics', 'yard_grid_data.json');
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
