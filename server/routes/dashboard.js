const express = require('express');
const { getDb } = require('../db/init');
const queries = require('../../shared/queries');

const router = express.Router();

function getSiteId(req) {
  return req.query.site_id || req.params.site_id || '';
}

// Overview: total PV, bot PV, human PV, UV
router.get('/overview', (req, res) => {
  const siteId = getSiteId(req);
  if (!siteId) return res.status(400).json({ error: 'site_id required' });
  const hours = parseInt(req.query.hours) || 24;
  const stats = queries.getOverview(getDb(), siteId, hours);
  res.json({ success: true, data: stats, hours });
});

// Trend: daily bot/human PV
router.get('/trend', (req, res) => {
  const siteId = getSiteId(req);
  if (!siteId) return res.status(400).json({ error: 'site_id required' });
  const days = parseInt(req.query.days) || 30;
  const rows = queries.getTrend(getDb(), siteId, days);
  res.json({ success: true, data: rows, days });
});

// Realtime: last N minutes of bot activity
router.get('/realtime', (req, res) => {
  const siteId = getSiteId(req);
  if (!siteId) return res.status(400).json({ error: 'site_id required' });
  const minutes = parseInt(req.query.minutes) || 5;
  const rows = queries.getRealtime(getDb(), siteId, minutes);
  res.json({ success: true, data: rows, minutes });
});

// Pages ranking
router.get('/pages', (req, res) => {
  const siteId = getSiteId(req);
  if (!siteId) return res.status(400).json({ error: 'site_id required' });
  const hours = parseInt(req.query.hours) || 24 * 7;
  const limitParam = req.query.limit;
  const useAll = !limitParam || String(limitParam).toLowerCase() === 'all';
  const limit = useAll ? 0 : (parseInt(limitParam, 10) || 20);
  const rows = queries.getPages(getDb(), siteId, hours, limit);
  res.json({ success: true, data: rows, hours });
});

// Bot ranking
router.get('/bots', (req, res) => {
  const siteId = getSiteId(req);
  if (!siteId) return res.status(400).json({ error: 'site_id required' });
  const hours = parseInt(req.query.hours) || 24 * 7;
  const rows = queries.getBots(getDb(), siteId, hours);
  res.json({ success: true, data: rows, hours });
});

// Visitor stats (human)
router.get('/visitors', (req, res) => {
  const siteId = getSiteId(req);
  if (!siteId) return res.status(400).json({ error: 'site_id required' });
  const hours = parseInt(req.query.hours) || 24;
  const data = queries.getVisitors(getDb(), siteId, hours);
  res.json({ success: true, data, hours });
});

// Visitor trend
router.get('/visitor-trend', (req, res) => {
  const siteId = getSiteId(req);
  if (!siteId) return res.status(400).json({ error: 'site_id required' });
  const days = parseInt(req.query.days) || 30;
  const rows = queries.getVisitorTrend(getDb(), siteId, days);
  res.json({ success: true, data: rows, days });
});

// Referrers
router.get('/referrers', (req, res) => {
  const siteId = getSiteId(req);
  if (!siteId) return res.status(400).json({ error: 'site_id required' });
  const hours = parseInt(req.query.hours) || 24 * 7;
  const rows = queries.getReferrers(getDb(), siteId, hours);
  res.json({ success: true, data: rows, hours });
});

// Device distribution
router.get('/devices', (req, res) => {
  const siteId = getSiteId(req);
  if (!siteId) return res.status(400).json({ error: 'site_id required' });
  const hours = parseInt(req.query.hours) || 24 * 7;
  const data = queries.getDevices(getDb(), siteId, hours);
  res.json({ success: true, data, hours });
});

// Performance metrics
router.get('/performance', (req, res) => {
  const siteId = getSiteId(req);
  if (!siteId) return res.status(400).json({ error: 'site_id required' });
  const hours = parseInt(req.query.hours) || 24 * 7;
  const data = queries.getPerformance(getDb(), siteId, hours);
  res.json({ success: true, data, hours });
});

module.exports = router;
