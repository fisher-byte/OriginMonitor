const express = require('express');
const path = require('path');
const { getDb, closeDb } = require('./db/init');
const { collectCors, dashboardCors } = require('./middleware/cors');
const { apiKeyAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '1mb' }));

// SDK data collection (open CORS, no auth)
app.use('/api/collect', collectCors);

// Dashboard API (CORS + optional auth)
app.use('/api/dashboard', dashboardCors, apiKeyAuth);
app.use('/api/sites', apiKeyAuth);
app.use('/api/sitemap', apiKeyAuth);

// Static files - frontend dashboard
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// SDK file (CORS enabled)
app.get('/sdk/tracker.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.sendFile(path.join(__dirname, '..', 'sdk', 'tracker.js'));
});

// API routes
app.use('/api/collect', require('./routes/collect'));
app.use('/api/sites', require('./routes/sites'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/sitemap', require('./routes/sitemap'));

// Health check (no auth)
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', ts: Date.now() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'internal error' });
});

// Start
app.listen(PORT, () => {
  console.log(`Monitor server running on http://localhost:${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/index.html`);
  console.log(`Collect API: POST http://localhost:${PORT}/api/collect`);
  if (process.env.API_KEY) console.log('API Key authentication: ENABLED');
});

// Graceful shutdown
process.on('SIGINT', () => {
  closeDb();
  process.exit(0);
});
process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});
