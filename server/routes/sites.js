const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/init');

const router = express.Router();

// 创建网站
router.post('/', (req, res) => {
  const { name, domain } = req.body;
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name is required' });

  const cleanName = name.trim().slice(0, 100);
  const cleanDomain = (domain || '').trim().slice(0, 255);
  if (!cleanName) return res.status(400).json({ error: 'name is required' });

  const id = uuidv4();
  const db = getDb();
  db.prepare('INSERT INTO sites (id, name, domain) VALUES (?, ?, ?)').run(id, cleanName, cleanDomain);
  res.json({ success: true, site_id: id, name: cleanName, domain: cleanDomain });
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

// 删除网站
router.delete('/:id', (req, res) => {
  const db = getDb();
  const site = db.prepare('SELECT * FROM sites WHERE id = ?').get(req.params.id);
  if (!site) return res.status(404).json({ error: 'site not found' });

  db.prepare('DELETE FROM page_events WHERE site_id = ?').run(req.params.id);
  db.prepare('DELETE FROM request_events WHERE site_id = ?').run(req.params.id);
  db.prepare('DELETE FROM daily_stats WHERE site_id = ?').run(req.params.id);
  db.prepare('DELETE FROM sites WHERE id = ?').run(req.params.id);

  res.json({ success: true });
});

module.exports = router;
