/**
 * Shared query functions
 * Used by server routes, MCP server, and CLI
 */

function getOverview(db, siteId, hours = 24) {
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  return db.prepare(`
    SELECT
      COUNT(*) as total_pv,
      SUM(CASE WHEN is_bot = 1 THEN 1 ELSE 0 END) as bot_pv,
      SUM(CASE WHEN is_bot = 0 THEN 1 ELSE 0 END) as human_pv,
      COUNT(DISTINCT CASE WHEN is_bot = 0 THEN COALESCE(NULLIF(visitor_id, ''), NULLIF(ip || '|' || ua, '|')) END) as uv
    FROM page_events
    WHERE site_id = ? AND ts >= ?
  `).get(siteId, since);
}

function getTrend(db, siteId, days = 30) {
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  return db.prepare(`
    SELECT
      date(ts, 'unixepoch', 'localtime') as day,
      COUNT(*) as total,
      SUM(CASE WHEN is_bot = 1 THEN 1 ELSE 0 END) as bot,
      SUM(CASE WHEN is_bot = 0 THEN 1 ELSE 0 END) as human,
      COUNT(DISTINCT CASE WHEN is_bot = 0 THEN COALESCE(NULLIF(visitor_id, ''), NULLIF(ip || '|' || ua, '|')) END) as uv
    FROM page_events
    WHERE site_id = ? AND ts >= ?
    GROUP BY day
    ORDER BY day
  `).all(siteId, since);
}

function getRealtime(db, siteId, minutes = 5) {
  const since = Math.floor(Date.now() / 1000) - minutes * 60;
  return db.prepare(`
    SELECT page_url, bot_name, bot_family, ua, created_at, ip
    FROM page_events
    WHERE site_id = ? AND ts >= ? AND is_bot = 1
    ORDER BY ts DESC
    LIMIT 100
  `).all(siteId, since);
}

function getActiveVisitors(db, siteId, minutes = 30) {
  const since = Math.floor(Date.now() / 1000) - minutes * 60;
  const active = db.prepare(`
    SELECT
      COUNT(DISTINCT CASE WHEN is_bot = 1 THEN bot_name END) as active_bots,
      COUNT(DISTINCT CASE WHEN is_bot = 0 THEN COALESCE(NULLIF(visitor_id, ''), NULLIF(ip || '|' || ua, '|')) END) as active_humans
    FROM page_events
    WHERE site_id = ? AND ts >= ?
  `).get(siteId, since);
  const latest = db.prepare(`
    SELECT MAX(ts) as last_event_ts
    FROM page_events
    WHERE site_id = ?
  `).get(siteId);
  const lastEventTs = latest.last_event_ts || null;
  return {
    active_bots: active.active_bots,
    active_humans: active.active_humans,
    last_event_ts: lastEventTs,
    last_event_age_minutes: lastEventTs ? Math.floor((Math.floor(Date.now() / 1000) - lastEventTs) / 60) : null,
  };
}

function getBots(db, siteId, hours = 24 * 7) {
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  return db.prepare(`
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
}

function getPages(db, siteId, hours = 24 * 7, limit = 20) {
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  const query = `
    SELECT
      page_url,
      COUNT(*) as total,
      SUM(CASE WHEN is_bot = 1 THEN 1 ELSE 0 END) as bot_count,
      SUM(CASE WHEN is_bot = 0 THEN 1 ELSE 0 END) as human_count,
      GROUP_CONCAT(DISTINCT CASE WHEN is_bot = 1 THEN bot_name END) as bot_names,
      MAX(ts) as last_seen_ts,
      MAX(CASE WHEN is_bot = 1 THEN ts END) as last_bot_ts,
      MAX(CASE WHEN is_bot = 0 THEN ts END) as last_human_ts,
      MAX(created_at) as last_seen_at,
      MAX(CASE WHEN is_bot = 1 THEN created_at END) as last_bot_seen_at,
      MAX(CASE WHEN is_bot = 0 THEN created_at END) as last_human_seen_at
    FROM page_events
    WHERE site_id = ? AND ts >= ?
    GROUP BY page_url
    ORDER BY total DESC
    ${limit > 0 ? 'LIMIT ?' : ''}
  `;
  if (limit > 0) {
    return db.prepare(query).all(siteId, since, limit);
  }
  return db.prepare(query).all(siteId, since);
}

function getVisitors(db, siteId, hours = 24) {
  const since = Math.floor(Date.now() / 1000) - hours * 3600;

  const overview = db.prepare(`
    SELECT
      COUNT(*) as pv,
      COUNT(DISTINCT COALESCE(NULLIF(visitor_id, ''), NULLIF(ip || '|' || ua, '|'))) as uv,
      AVG(CASE WHEN stay_time > 0 THEN stay_time END) as avg_stay,
      AVG(CASE WHEN scroll_depth > 0 THEN scroll_depth END) as avg_scroll
    FROM page_events
    WHERE site_id = ? AND ts >= ? AND is_bot = 0
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

  return { overview, devices, browsers, os: osList };
}

function getVisitorTrend(db, siteId, days = 30) {
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  return db.prepare(`
    SELECT
      date(ts, 'unixepoch', 'localtime') as day,
      COUNT(*) as pv,
      COUNT(DISTINCT COALESCE(NULLIF(visitor_id, ''), NULLIF(ip || '|' || ua, '|'))) as uv
    FROM page_events
    WHERE site_id = ? AND ts >= ? AND is_bot = 0
    GROUP BY day
    ORDER BY day
  `).all(siteId, since);
}

function getReferrers(db, siteId, hours = 24 * 7) {
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  return db.prepare(`
    SELECT ref, COUNT(*) as count
    FROM page_events
    WHERE site_id = ? AND ts >= ? AND is_bot = 0 AND ref != ''
    GROUP BY ref
    ORDER BY count DESC
    LIMIT 20
  `).all(siteId, since);
}

function getDevices(db, siteId, hours = 24 * 7) {
  const since = Math.floor(Date.now() / 1000) - hours * 3600;

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

  return { devices, os: osList, browsers };
}

function getPerformance(db, siteId, hours = 24 * 7) {
  const since = Math.floor(Date.now() / 1000) - hours * 3600;

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

  return { overall, slowest: rows };
}

function listSites(db) {
  return db.prepare('SELECT * FROM sites ORDER BY created_at DESC').all();
}

function getSite(db, siteId) {
  return db.prepare('SELECT * FROM sites WHERE id = ?').get(siteId);
}

function createSite(db, id, name, domain = '') {
  db.prepare('INSERT INTO sites (id, name, domain) VALUES (?, ?, ?)').run(id, name, domain);
}

function deleteSite(db, siteId) {
  const site = db.prepare('SELECT * FROM sites WHERE id = ?').get(siteId);
  if (!site) return false;
  const del = db.transaction((id) => {
    db.prepare('DELETE FROM page_events WHERE site_id = ?').run(id);
    db.prepare('DELETE FROM request_events WHERE site_id = ?').run(id);
    db.prepare('DELETE FROM daily_stats WHERE site_id = ?').run(id);
    db.prepare('DELETE FROM sites WHERE id = ?').run(id);
  });
  del(siteId);
  return true;
}

module.exports = {
  getOverview,
  getTrend,
  getRealtime,
  getActiveVisitors,
  getBots,
  getPages,
  getVisitors,
  getVisitorTrend,
  getReferrers,
  getDevices,
  getPerformance,
  listSites,
  getSite,
  createSite,
  deleteSite,
};
