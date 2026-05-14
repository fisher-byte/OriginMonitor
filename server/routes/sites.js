const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/init');
const queries = require('../../shared/queries');

const router = express.Router();

// Create site
router.post('/', (req, res) => {
  const { name, domain } = req.body;
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name is required' });

  const cleanName = name.trim().slice(0, 100);
  const cleanDomain = (domain || '').trim().slice(0, 255);
  if (!cleanName) return res.status(400).json({ error: 'name is required' });

  const id = uuidv4();
  queries.createSite(getDb(), id, cleanName, cleanDomain);
  res.json({ success: true, site_id: id, name: cleanName, domain: cleanDomain });
});

// List sites
router.get('/', (req, res) => {
  const sites = queries.listSites(getDb());
  res.json({ success: true, data: sites });
});

// Site detail
router.get('/:id', (req, res) => {
  const site = queries.getSite(getDb(), req.params.id);
  if (!site) return res.status(404).json({ error: 'site not found' });
  res.json({ success: true, data: site });
});

// Delete site
router.delete('/:id', (req, res) => {
  const deleted = queries.deleteSite(getDb(), req.params.id);
  if (!deleted) return res.status(404).json({ error: 'site not found' });
  res.json({ success: true });
});

module.exports = router;
