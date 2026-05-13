const express = require('express');
const https = require('https');
const http = require('http');
const { getDb } = require('../db/init');

const router = express.Router();

// Security: validate domain to prevent SSRF
function isValidDomain(domain) {
  // Must be a valid domain, not an IP address
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(domain)) return false; // IPv4
  if (/^\[/.test(domain)) return false; // IPv6
  if (/^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|169\.254\.)/.test(domain)) return false;
  // Must look like a domain
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(domain)) return false;
  return true;
}

function fetchUrl(url, timeout) {
  timeout = timeout || 8000;
  var MAX_BODY = 1024 * 1024; // 1MB limit
  return new Promise(function(resolve, reject) {
    var mod = url.startsWith('https') ? https : http;
    var req = mod.get(url, { timeout: timeout }, function(res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        // Only follow same-origin redirects
        var loc = res.headers.location;
        var origHost = new URL(url).host;
        var locHost;
        try { locHost = new URL(loc, url).host; } catch(e) { return reject(new Error('invalid redirect')); }
        if (locHost !== origHost) return reject(new Error('cross-origin redirect blocked'));
        return fetchUrl(loc, timeout).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error('HTTP ' + res.statusCode));
      }
      var data = '';
      var bytes = 0;
      res.setEncoding('utf8');
      res.on('data', function(chunk) {
        bytes += chunk.length;
        if (bytes > MAX_BODY) {
          res.destroy();
          return reject(new Error('response too large'));
        }
        data += chunk;
      });
      res.on('end', function() { resolve(data); });
    });
    req.on('error', reject);
    req.on('timeout', function() { req.destroy(); reject(new Error('timeout')); });
  });
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

// Fetch sitemap and cross-reference with crawl data
router.get('/analyze', async function(req, res) {
  var siteId = req.query.site_id || '';
  var domain = req.query.domain || '';

  if (!siteId) return res.status(400).json({ error: 'site_id required' });
  if (!domain) return res.status(400).json({ error: 'domain required' });

  // Normalize and validate domain
  domain = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
  if (!isValidDomain(domain)) {
    return res.status(400).json({ error: 'invalid domain' });
  }

  var sitemapUrl = 'https://' + domain + '/sitemap.xml';

  try {
    var xml = await fetchUrl(sitemapUrl);
    var allUrls = parseSitemapUrls(xml);

    // If it's a sitemap index, fetch sub-sitemaps (max 20)
    if (allUrls.length === 0 || xml.indexOf('<sitemapindex') !== -1) {
      var subUrls = [];
      for (var i = 0; i < Math.min(allUrls.length, 20); i++) {
        try {
          var subXml = await fetchUrl(allUrls[i]);
          subUrls = subUrls.concat(parseSitemapUrls(subXml));
        } catch (e) {
          // skip failed sub-sitemaps
        }
      }
      if (subUrls.length > 0) allUrls = subUrls;
    }

    // Deduplicate and normalize
    var seen = {};
    var pages = [];
    for (var j = 0; j < allUrls.length; j++) {
      var url = allUrls[j];
      var pathOnly = url.replace(/^https?:\/\/[^\/]+/, '') || '/';
      if (!seen[pathOnly]) {
        seen[pathOnly] = true;
        pages.push({ url: pathOnly, fullUrl: url });
      }
    }

    // Cross-reference with crawl data
    var db = getDb();
    var hours = parseInt(req.query.hours) || 24 * 30;
    var since = Math.floor(Date.now() / 1000) - hours * 3600;

    var crawlData = db.prepare(`
      SELECT
        page_url,
        COUNT(*) as total,
        SUM(CASE WHEN is_bot = 1 THEN 1 ELSE 0 END) as bot_count,
        SUM(CASE WHEN is_bot = 0 THEN 1 ELSE 0 END) as human_count,
        GROUP_CONCAT(DISTINCT CASE WHEN is_bot = 1 THEN bot_name END) as bot_names
      FROM page_events
      WHERE site_id = ? AND ts >= ?
      GROUP BY page_url
    `).all(siteId, since);

    var crawlMap = {};
    crawlData.forEach(function(r) { crawlMap[r.page_url] = r; });

    var result = pages.map(function(p) {
      var crawl = crawlMap[p.url] || { total: 0, bot_count: 0, human_count: 0, bot_names: '' };
      return {
        page_url: p.url,
        full_url: p.fullUrl,
        bot_count: crawl.bot_count,
        human_count: crawl.human_count,
        bot_names: crawl.bot_names || '',
        total: crawl.total,
        crawled: crawl.total > 0
      };
    });

    // Sort by bot_count desc
    result.sort(function(a, b) { return b.bot_count - a.bot_count; });

    res.json({
      success: true,
      data: result,
      total_pages: result.length,
      crawled_pages: result.filter(function(r) { return r.crawled; }).length,
      source: sitemapUrl
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sitemap: ' + err.message });
  }
});

module.exports = router;
