const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── Service routers ─────────────────────────────────────────────
const logisticsRouter = require('./services/logistics');
app.use('/api/logistics', logisticsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', services: ['logistics'], timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Al-Futtaim Executive Server running on port ${PORT}`);
});
