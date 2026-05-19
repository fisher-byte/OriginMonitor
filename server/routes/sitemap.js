const express = require('express');
const { getDb } = require('../db/init');
const sitemapService = require('../lib/sitemap-service');

const router = express.Router();

router.get('/analyze', async function(req, res) {
  var siteId = req.query.site_id || '';
  var domain = req.query.domain || '';

  if (!siteId) return res.status(400).json({ error: 'site_id required' });
  if (!domain) return res.status(400).json({ error: 'domain required' });

  var hours = parseInt(req.query.hours, 10) || 24 * 30;

  try {
    var result = await sitemapService.analyzeSitemap(getDb(), siteId, domain, hours);
    res.json({
      success: true,
      data: result.data,
      total_pages: result.total_pages,
      crawled_pages: result.crawled_pages,
      source: result.source
    });
  } catch (err) {
    res.json({
      success: false,
      data: [],
      total_pages: 0,
      crawled_pages: 0,
      source: 'https://' + domain.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase() + '/sitemap.xml',
      error: 'Failed to fetch sitemap: ' + err.message
    });
  }
});

module.exports = router;
module.exports._private = {
  parseSitemapEntries: sitemapService.parseSitemapEntries,
  parseSitemapUrls: sitemapService.parseSitemapUrls,
  normalizeUpdatedValue: sitemapService.normalizeUpdatedValue,
  inferUpdatedFromPath: sitemapService.inferUpdatedFromPath,
  extractUpdatedFromHtml: sitemapService.extractUpdatedFromHtml
};
