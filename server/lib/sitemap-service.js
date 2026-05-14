/**
 * Sitemap analysis service
 * Extracted from routes/sitemap.js for reuse by MCP server and CLI
 */
const https = require('https');
const http = require('http');

const MAX_SITEMAP_BODY = 1024 * 1024;
const MAX_PAGE_BODY = 256 * 1024;
const PROBE_CONCURRENCY = 4;

function isValidDomain(domain) {
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(domain)) return false;
  if (/^\[/.test(domain)) return false;
  if (/^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|169\.254\.)/.test(domain)) return false;
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(domain)) return false;
  return true;
}

function fetchResponse(url, options) {
  options = options || {};
  var timeout = options.timeout || 8000;
  var method = options.method || 'GET';
  var maxBody = typeof options.maxBody === 'number' ? options.maxBody : MAX_SITEMAP_BODY;
  var redirectBase = options.redirectBase || url;

  return new Promise(function(resolve, reject) {
    var mod = url.startsWith('https') ? https : http;
    var req = mod.request(url, { method: method, timeout: timeout }, function(res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        var loc;
        var origHost = new URL(redirectBase).host;
        try {
          loc = new URL(res.headers.location, url).toString();
        } catch (e) {
          return reject(new Error('invalid redirect'));
        }
        if (new URL(loc).host !== origHost) return reject(new Error('cross-origin redirect blocked'));
        return fetchResponse(loc, {
          timeout: timeout,
          method: method,
          maxBody: maxBody,
          redirectBase: redirectBase
        }).then(resolve, reject);
      }

      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error('HTTP ' + res.statusCode));
      }

      if (method === 'HEAD') {
        res.resume();
        return resolve({ headers: res.headers, body: '' });
      }

      var data = '';
      var bytes = 0;
      res.setEncoding('utf8');
      res.on('data', function(chunk) {
        bytes += chunk.length;
        if (bytes > maxBody) {
          res.destroy();
          return reject(new Error('response too large'));
        }
        data += chunk;
      });
      res.on('end', function() {
        resolve({ headers: res.headers, body: data });
      });
    });

    req.on('error', reject);
    req.on('timeout', function() {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.end();
  });
}

function fetchUrl(url, timeout) {
  return fetchResponse(url, { timeout: timeout, maxBody: MAX_SITEMAP_BODY }).then(function(result) {
    return result.body;
  });
}

function parseSitemapEntries(xml) {
  var entries = [];
  var urlBlockRe = /<url>([\s\S]*?)<\/url>/gi;
  var m;
  while ((m = urlBlockRe.exec(xml)) !== null) {
    var block = m[1];
    var locMatch = block.match(/<loc>([^<]+)<\/loc>/i);
    if (!locMatch) continue;
    var lastmodMatch = block.match(/<lastmod>([^<]+)<\/lastmod>/i);
    entries.push({
      url: locMatch[1].trim(),
      lastmod: lastmodMatch ? lastmodMatch[1].trim() : ''
    });
  }
  return entries;
}

function parseSitemapUrls(xml) {
  var urls = [];
  var re = /<loc>([^<]+)<\/loc>/gi;
  var m;
  while ((m = re.exec(xml)) !== null) {
    urls.push(m[1].trim());
  }
  return urls;
}

function normalizeUpdatedValue(value) {
  if (!value) return { value: '', ts: null };
  var trimmed = String(value).trim();
  if (!trimmed) return { value: '', ts: null };
  var ts = Date.parse(trimmed);
  if (isNaN(ts)) return { value: trimmed, ts: null };
  return { value: trimmed, ts: ts };
}

function extractUpdatedFromHtml(html) {
  if (!html) return '';

  var patterns = [
    /<meta[^>]+property=["']article:modified_time["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']article:modified_time["']/i,
    /<meta[^>]+property=["']og:updated_time["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:updated_time["']/i,
    /<meta[^>]+name=["']last-modified["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']last-modified["']/i,
    /<meta[^>]+itemprop=["']dateModified["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+itemprop=["']dateModified["']/i,
    /"dateModified"\s*:\s*"([^"]+)"/i
  ];

  for (var i = 0; i < patterns.length; i++) {
    var match = html.match(patterns[i]);
    if (match && match[1]) return match[1].trim();
  }

  var timeMatch = html.match(/<time[^>]+datetime=["']([^"']+)["'][^>]*(updated|modified|published|date)/i);
  if (timeMatch && timeMatch[1]) return timeMatch[1].trim();

  return '';
}

async function probePageUpdatedAt(pageUrl) {
  try {
    var headResult = await fetchResponse(pageUrl, { method: 'HEAD', timeout: 4000, maxBody: 0 });
    var headerUpdated = normalizeUpdatedValue(headResult.headers['last-modified']);
    if (headerUpdated.ts) {
      return { page_updated_at: headerUpdated.value, page_updated_ts: headerUpdated.ts, page_updated_source: 'http_header' };
    }
  } catch (e) {}

  try {
    var pageResult = await fetchResponse(pageUrl, { method: 'GET', timeout: 5000, maxBody: MAX_PAGE_BODY });
    var getHeaderUpdated = normalizeUpdatedValue(pageResult.headers['last-modified']);
    if (getHeaderUpdated.ts) {
      return { page_updated_at: getHeaderUpdated.value, page_updated_ts: getHeaderUpdated.ts, page_updated_source: 'http_header' };
    }

    var htmlUpdated = normalizeUpdatedValue(extractUpdatedFromHtml(pageResult.body));
    if (htmlUpdated.ts) {
      return { page_updated_at: htmlUpdated.value, page_updated_ts: htmlUpdated.ts, page_updated_source: 'html_meta' };
    }
  } catch (e) {}

  return { page_updated_at: '', page_updated_ts: null, page_updated_source: '' };
}

async function enrichPagesWithUpdatedAt(pages) {
  var missing = pages.filter(function(page) { return !page.page_updated_ts; });
  for (var i = 0; i < missing.length; i += PROBE_CONCURRENCY) {
    var batch = missing.slice(i, i + PROBE_CONCURRENCY);
    var results = await Promise.all(batch.map(function(page) {
      return probePageUpdatedAt(page.fullUrl);
    }));
    for (var j = 0; j < batch.length; j++) {
      if (results[j].page_updated_ts) {
        batch[j].page_updated_at = results[j].page_updated_at;
        batch[j].page_updated_ts = results[j].page_updated_ts;
        batch[j].page_updated_source = results[j].page_updated_source;
      }
    }
  }
  return pages;
}

/**
 * Analyze sitemap for a domain and cross-reference with crawl data
 * @param {object} db - better-sqlite3 database instance
 * @param {string} siteId - site ID
 * @param {string} domain - target domain (without protocol)
 * @param {number} hours - lookback window in hours
 * @returns {object} analysis result
 */
async function analyzeSitemap(db, siteId, domain, hours = 24 * 30) {
  domain = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
  if (!isValidDomain(domain)) throw new Error('invalid domain');

  var sitemapUrl = 'https://' + domain + '/sitemap.xml';
  var xml = await fetchUrl(sitemapUrl, 8000);
  var entries = parseSitemapEntries(xml);
  var allUrls = entries.map(function(entry) { return entry.url; });

  if (allUrls.length === 0 || xml.indexOf('<sitemapindex') !== -1) {
    var sitemapUrls = parseSitemapUrls(xml);
    var subEntries = [];
    for (var i = 0; i < Math.min(sitemapUrls.length, 20); i++) {
      try {
        var subXml = await fetchUrl(sitemapUrls[i], 8000);
        subEntries = subEntries.concat(parseSitemapEntries(subXml));
      } catch (e) {}
    }
    if (subEntries.length > 0) entries = subEntries;
  }

  var seen = {};
  var pages = [];
  for (var j = 0; j < entries.length; j++) {
    var entry = entries[j];
    var pathOnly = entry.url.replace(/^https?:\/\/[^\/]+/, '') || '/';
    if (seen[pathOnly]) continue;
    seen[pathOnly] = true;

    var normalizedUpdated = normalizeUpdatedValue(entry.lastmod);
    pages.push({
      url: pathOnly,
      fullUrl: entry.url,
      page_updated_at: normalizedUpdated.value,
      page_updated_ts: normalizedUpdated.ts,
      page_updated_source: normalizedUpdated.ts ? 'sitemap_lastmod' : ''
    });
  }

  await enrichPagesWithUpdatedAt(pages);

  var since = Math.floor(Date.now() / 1000) - hours * 3600;

  var crawlData = db.prepare(`
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
  `).all(siteId, since);

  var crawlMap = {};
  crawlData.forEach(function(row) {
    crawlMap[row.page_url] = row;
  });

  var result = pages.map(function(page) {
    var crawl = crawlMap[page.url] || {
      total: 0, bot_count: 0, human_count: 0, bot_names: '',
      last_seen_ts: null, last_bot_ts: null, last_human_ts: null,
      last_seen_at: null, last_bot_seen_at: null, last_human_seen_at: null
    };

    return {
      page_url: page.url,
      full_url: page.fullUrl,
      page_updated_at: page.page_updated_at,
      page_updated_ts: page.page_updated_ts,
      page_updated_source: page.page_updated_source,
      bot_count: crawl.bot_count,
      human_count: crawl.human_count,
      bot_names: crawl.bot_names || '',
      total: crawl.total,
      last_seen_ts: crawl.last_seen_ts,
      last_bot_ts: crawl.last_bot_ts,
      last_human_ts: crawl.last_human_ts,
      last_seen_at: crawl.last_seen_at,
      last_bot_seen_at: crawl.last_bot_seen_at,
      last_human_seen_at: crawl.last_human_seen_at,
      crawled: crawl.total > 0
    };
  });

  result.sort(function(a, b) {
    return (b.page_updated_ts || 0) - (a.page_updated_ts || 0);
  });

  return {
    data: result,
    total_pages: result.length,
    crawled_pages: result.filter(function(row) { return row.crawled; }).length,
    source: sitemapUrl
  };
}

module.exports = {
  analyzeSitemap,
  isValidDomain,
  parseSitemapEntries,
  parseSitemapUrls,
  normalizeUpdatedValue,
  extractUpdatedFromHtml,
};
