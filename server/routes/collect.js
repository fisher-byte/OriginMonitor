const express = require('express');
const { getDb } = require('../db/init');
const { classifyUserAgent } = require('../utils/bot-classify');

const router = express.Router();

// SDK 数据上报
router.post('/', (req, res) => {
  try {
    const { site_id, ts, page_url, ref, ua, visitor, events } = req.body;

    if (!site_id) return res.status(400).json({ error: 'site_id required' });

    const db = getDb();
    const site = db.prepare('SELECT id FROM sites WHERE id = ?').get(site_id);
    if (!site) return res.status(404).json({ error: 'invalid site_id' });

    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress || '';
    const clientIp = String(ip).split(',')[0].trim();
    const clientUa = ua || req.headers['user-agent'] || '';
    const bot = classifyUserAgent(clientUa);
    const now = Math.floor(Date.now() / 1000);
    const pageTs = ts || now;

    // 插入页面事件
    const insertPage = db.prepare(`
      INSERT INTO page_events (site_id, ts, page_url, ref, ua, ip, is_bot, bot_name, bot_family, visitor_id, device, os, browser, screen, language, scroll_depth, stay_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertPage.run(
      site_id,
      pageTs,
      page_url || '/',
      ref || '',
      clientUa,
      clientIp,
      bot.is_bot ? 1 : 0,
      bot.bot_name,
      bot.bot_family,
      visitor?.id || '',
      visitor?.device || '',
      visitor?.os || '',
      visitor?.browser || '',
      visitor?.screen || '',
      visitor?.language || '',
      visitor?.scroll_depth || 0,
      visitor?.stay_time || 0
    );

    // 插入网络请求事件
    if (events && events.length > 0) {
      const insertReq = db.prepare(`
        INSERT INTO request_events (site_id, ts, page_url, req_url, method, status, duration, req_type, is_bot, bot_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = db.transaction((evts) => {
        for (const evt of evts) {
          insertReq.run(
            site_id,
            pageTs,
            page_url || '/',
            evt.url || '',
            evt.method || 'GET',
            evt.status || 0,
            evt.duration || 0,
            evt.type || '',
            bot.is_bot ? 1 : 0,
            bot.bot_name
          );
        }
      });
      insertMany(events);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('collect error:', err);
    res.status(500).json({ error: 'internal error' });
  }
});

module.exports = router;
