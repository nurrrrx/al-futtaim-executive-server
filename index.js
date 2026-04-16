const express = require('express');
const cors = require('cors');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerDoc = require('./swagger.json');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(compression()); // gzip — 3.7MB → ~350KB over the wire
app.use(express.json());

// ── Swagger API docs ────────────────────────────────────────────
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Al-Futtaim Executive API',
}));

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

app.listen(PORT, () => {
  console.log(`Al-Futtaim Executive Server running on port ${PORT}`);
});
