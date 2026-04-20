const express = require('express');
const cors = require('cors');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerDoc = require('./swagger.json');
const { connectDB } = require('./db');
const Design = require('./models/Design');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(compression()); // gzip — 3.7MB → ~350KB over the wire
app.use(express.json());

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

const designsRouter = require('./services/designs');
app.use('/api/designs', designsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', services: ['logistics', 'designs'], timestamp: new Date().toISOString() });
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
