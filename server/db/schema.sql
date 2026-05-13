-- 网站表
CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 页面访问事件表（人类 + 爬虫）
CREATE TABLE IF NOT EXISTS page_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  page_url TEXT NOT NULL,
  ref TEXT DEFAULT '',
  ua TEXT DEFAULT '',
  ip TEXT DEFAULT '',
  is_bot INTEGER DEFAULT 0,
  bot_name TEXT DEFAULT '',
  bot_family TEXT DEFAULT '',
  visitor_id TEXT DEFAULT '',
  device TEXT DEFAULT '',
  os TEXT DEFAULT '',
  browser TEXT DEFAULT '',
  screen TEXT DEFAULT '',
  language TEXT DEFAULT '',
  country TEXT DEFAULT '',
  scroll_depth INTEGER DEFAULT 0,
  stay_time INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id)
);

-- 网络请求事件表
CREATE TABLE IF NOT EXISTS request_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  page_url TEXT DEFAULT '',
  req_url TEXT NOT NULL,
  method TEXT DEFAULT 'GET',
  status INTEGER DEFAULT 0,
  duration INTEGER DEFAULT 0,
  req_type TEXT DEFAULT '',
  is_bot INTEGER DEFAULT 0,
  bot_name TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id)
);

-- 每日聚合统计表
CREATE TABLE IF NOT EXISTS daily_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL,
  date TEXT NOT NULL,
  total_pv INTEGER DEFAULT 0,
  bot_pv INTEGER DEFAULT 0,
  human_pv INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  top_bots TEXT DEFAULT '[]',
  top_pages TEXT DEFAULT '[]',
  top_referrers TEXT DEFAULT '[]',
  top_devices TEXT DEFAULT '[]',
  avg_stay_time INTEGER DEFAULT 0,
  avg_scroll_depth INTEGER DEFAULT 0,
  bounce_rate REAL DEFAULT 0,
  UNIQUE(site_id, date)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_page_events_site_ts ON page_events(site_id, ts);
CREATE INDEX IF NOT EXISTS idx_page_events_site_bot ON page_events(site_id, is_bot);
CREATE INDEX IF NOT EXISTS idx_request_events_site_ts ON request_events(site_id, ts);
CREATE INDEX IF NOT EXISTS idx_daily_stats_site_date ON daily_stats(site_id, date);
