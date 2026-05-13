const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/init');

const router = express.Router();

// 创建网站
router.post('/', (req, res) => {
  const { name, domain } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const id = uuidv4();
  const db = getDb();
  db.prepare('INSERT INTO sites (id, name, domain) VALUES (?, ?, ?)').run(id, name, domain || '');
  res.json({ success: true, site_id: id, name, domain: domain || '' });
});

// 网站列表
router.get('/', (req, res) => {
  const db = getDb();
  const sites = db.prepare('SELECT * FROM sites ORDER BY created_at DESC').all();
  res.json({ success: true, data: sites });
});

// 网站详情
router.get('/:id', (req, res) => {
  const db = getDb();
  const site = db.prepare('SELECT * FROM sites WHERE id = ?').get(req.params.id);
  if (!site) return res.status(404).json({ error: 'site not found' });
  res.json({ success: true, data: site });
});

module.exports = router;
