const express = require('express');
const { getDb } = require('../db/init');

const router = express.Router();

function getSiteId(req) {
  return req.query.site_id || req.params.site_id || '';
}

function getSinceTs(hours) {
  return Math.floor(Date.now() / 1000) - hours * 3600;
}

// 概览：总 PV、爬虫 PV、人类 PV、UV
router.get('/overview', (req, res) => {
  const siteId = getSiteId(req);
  if (!siteId) return res.status(400).json({ error: 'site_id required' });

  const db = getDb();
  const hours = parseInt(req.query.hours) || 24;
  const since = getSinceTs(hours);

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_pv,
      SUM(CASE WHEN is_bot = 1 THEN 1 ELSE 0 END) as bot_pv,
      SUM(CASE WHEN is_bot = 0 THEN 1 ELSE 0 END) as human_pv,
      COUNT(DISTINCT CASE WHEN is_bot = 0 AND visitor_id != '' THEN visitor_id END) as uv
    FROM page_events
    WHERE site_id = ? AND ts >= ?
  `).get(siteId, since);

  res.json({ success: true, data: stats, hours });
});

// 趋势：按天的爬虫/人类 PV 折线
router.get('/trend', (req, res) => {
  const siteId = getSiteId(req);
  if (!siteId) return res.status(400).json({ error: 'site_id required' });

  const db = getDb();
  const days = parseInt(req.query.days) || 30;
  const since = Math.floor(Date.now() / 1000) - days * 86400;

  const rows = db.prepare(`
    SELECT
      date(ts, 'unixepoch', 'localtime') as day,
      COUNT(*) as total,
      SUM(CASE WHEN is_bot = 1 THEN 1 ELSE 0 END) as bot,
      SUM(CASE WHEN is_bot = 0 THEN 1 ELSE 0 END) as human,
      COUNT(DISTINCT CASE WHEN is_bot = 0 AND visitor_id != '' THEN visitor_id END) as uv
    FROM page_events
    WHERE site_id = ? AND ts >= ?
    GROUP BY day
    ORDER BY day
  `).all(siteId, since);

  res.json({ success: true, data: rows, days });
});

// 实时：最近 N 分钟的爬虫活动
router.get('/realtime', (req, res) => {
  const siteId = getSiteId(req);
  if (!siteId) return res.status(400).json({ error: 'site_id required' });

  const db = getDb();
  const minutes = parseInt(req.query.minutes) || 5;
  const since = Math.floor(Date.now() / 1000) - minutes * 60;

  const rows = db.prepare(`
    SELECT page_url, bot_name, bot_family, ua, created_at, ip
    FROM page_events
    WHERE site_id = ? AND ts >= ? AND is_bot = 1
    ORDER BY ts DESC
    LIMIT 100
  `).all(siteId, since);

  res.json({ success: true, data: rows, minutes });
});

// 页面排名
router.get('/pages', (req, res) => {
  const siteId = getSiteId(req);
  if (!siteId) return res.status(400).json({ error: 'site_id required' });

  const db = getDb();
  const hours = parseInt(req.query.hours) || 24 * 7;
  const limit = parseInt(req.query.limit) || 20;
  const since = getSinceTs(hours);

  const rows = db.prepare(`
    SELECT
      page_url,
      COUNT(*) as total,
      SUM(CASE WHEN is_bot = 1 THEN 1 ELSE 0 END) as bot_count,
      SUM(CASE WHEN is_bot = 0 THEN 1 ELSE 0 END) as human_count,
      GROUP_CONCAT(DISTINCT CASE WHEN is_bot = 1 THEN bot_name END) as bot_names
    FROM page_events
    WHERE site_id = ? AND ts >= ?
    GROUP BY page_url
    ORDER BY total DESC
    LIMIT ?
  `).all(siteId, since, limit);

  res.json({ success: true, data: rows, hours });
});

// 爬虫排名
router.get('/bots', (req, res) => {
  const siteId = getSiteId(req);
  if (!siteId) return res.status(400).json({ error: 'site_id required' });

  const db = getDb();
  const hours = parseInt(req.query.hours) || 24 * 7;
  const since = getSinceTs(hours);

  const rows = db.prepare(`
    SELECT
      bot_name,
      bot_family,
      COUNT(*) as count,
      COUNT(DISTINCT page_url) as unique_pages,
      MAX(created_at) as last_seen
    FROM page_events
    WHERE site_id = ? AND ts >= ? AND is_bot = 1
    GROUP BY bot_name, bot_family
    ORDER BY count DESC
    LIMIT 20
  `).all(siteId, since);

  res.json({ success: true, data: rows, hours });
});

// 访客统计（人类）
router.get('/visitors', (req, res) => {
  const siteId = getSiteId(req);
  if (!siteId) return res.status(400).json({ error: 'site_id required' });

  const db = getDb();
  const hours = parseInt(req.query.hours) || 24;
  const since = getSinceTs(hours);

  const overview = db.prepare(`
    SELECT
      COUNT(*) as pv,
      COUNT(DISTINCT visitor_id) as uv,
      AVG(CASE WHEN stay_time > 0 THEN stay_time END) as avg_stay,
      AVG(CASE WHEN scroll_depth > 0 THEN scroll_depth END) as avg_scroll
    FROM page_events
    WHERE site_id = ? AND ts >= ? AND is_bot = 0 AND visitor_id != ''
  `).get(siteId, since);

  const devices = db.prepare(`
    SELECT device, COUNT(*) as count
    FROM page_events
    WHERE site_id = ? AND ts >= ? AND is_bot = 0 AND device != ''
    GROUP BY device
    ORDER BY count DESC
  `).all(siteId, since);

  const browsers = db.prepare(`
    SELECT browser, COUNT(*) as count
    FROM page_events
    WHERE site_id = ? AND ts >= ? AND is_bot = 0 AND browser != ''
    GROUP BY browser
    ORDER BY count DESC
    LIMIT 10
  `).all(siteId, since);

  const osList = db.prepare(`
    SELECT os, COUNT(*) as count
    FROM page_events
    WHERE site_id = ? AND ts >= ? AND is_bot = 0 AND os != ''
    GROUP BY os
    ORDER BY count DESC
    LIMIT 10
  `).all(siteId, since);

  res.json({
    success: true,
    data: { overview, devices, browsers, os: osList },
    hours,
  });
});

// 访客趋势
router.get('/visitor-trend', (req, res) => {
  const siteId = getSiteId(req);
  if (!siteId) return res.status(400).json({ error: 'site_id required' });

  const db = getDb();
  const days = parseInt(req.query.days) || 30;
  const since = Math.floor(Date.now() / 1000) - days * 86400;

  const rows = db.prepare(`
    SELECT
      date(ts, 'unixepoch', 'localtime') as day,
      COUNT(*) as pv,
      COUNT(DISTINCT CASE WHEN visitor_id != '' THEN visitor_id END) as uv
    FROM page_events
    WHERE site_id = ? AND ts >= ? AND is_bot = 0
    GROUP BY day
    ORDER BY day
  `).all(siteId, since);

  res.json({ success: true, data: rows, days });
});

// 流量来源
router.get('/referrers', (req, res) => {
  const siteId = getSiteId(req);
  if (!siteId) return res.status(400).json({ error: 'site_id required' });

  const db = getDb();
  const hours = parseInt(req.query.hours) || 24 * 7;
  const since = getSinceTs(hours);

  const rows = db.prepare(`
    SELECT ref, COUNT(*) as count
    FROM page_events
    WHERE site_id = ? AND ts >= ? AND is_bot = 0 AND ref != ''
    GROUP BY ref
    ORDER BY count DESC
    LIMIT 20
  `).all(siteId, since);

  res.json({ success: true, data: rows, hours });
});

// 设备分布
router.get('/devices', (req, res) => {
  const siteId = getSiteId(req);
  if (!siteId) return res.status(400).json({ error: 'site_id required' });

  const db = getDb();
  const hours = parseInt(req.query.hours) || 24 * 7;
  const since = getSinceTs(hours);

  const devices = db.prepare(`
    SELECT device, COUNT(*) as count
    FROM page_events
    WHERE site_id = ? AND ts >= ? AND is_bot = 0 AND device != ''
    GROUP BY device
    ORDER BY count DESC
  `).all(siteId, since);

  const osList = db.prepare(`
    SELECT os, COUNT(*) as count
    FROM page_events
    WHERE site_id = ? AND ts >= ? AND is_bot = 0 AND os != ''
    GROUP BY os
    ORDER BY count DESC
  `).all(siteId, since);

  const browsers = db.prepare(`
    SELECT browser, COUNT(*) as count
    FROM page_events
    WHERE site_id = ? AND ts >= ? AND is_bot = 0 AND browser != ''
    GROUP BY browser
    ORDER BY count DESC
  `).all(siteId, since);

  res.json({ success: true, data: { devices, os: osList, browsers }, hours });
});

// 性能指标
router.get('/performance', (req, res) => {
  const siteId = getSiteId(req);
  if (!siteId) return res.status(400).json({ error: 'site_id required' });

  const db = getDb();
  const hours = parseInt(req.query.hours) || 24 * 7;
  const since = getSinceTs(hours);

  const rows = db.prepare(`
    SELECT
      req_url,
      AVG(duration) as avg_duration,
      COUNT(*) as count
    FROM request_events
    WHERE site_id = ? AND ts >= ? AND duration > 0 AND req_type = 'resource'
    GROUP BY req_url
    ORDER BY avg_duration DESC
    LIMIT 20
  `).all(siteId, since);

  const overall = db.prepare(`
    SELECT
      AVG(duration) as avg_duration,
      MAX(duration) as max_duration,
      COUNT(*) as total_requests
    FROM request_events
    WHERE site_id = ? AND ts >= ? AND duration > 0
  `).get(siteId, since);

  res.json({ success: true, data: { overall, slowest: rows }, hours });
});

module.exports = router;
