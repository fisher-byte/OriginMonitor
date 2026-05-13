const express = require('express');
const path = require('path');
const { getDb, closeDb } = require('./db/init');
const { collectCors, dashboardCors } = require('./middleware/cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json({ limit: '1mb' }));

// SDK 数据上报（跨域开放）
app.use('/api/collect', collectCors);

// 看板 API
app.use('/api/dashboard', dashboardCors);

// 静态文件 - 前端看板
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// SDK 文件（允许跨域加载）
app.get('/sdk/tracker.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.sendFile(path.join(__dirname, '..', 'sdk', 'tracker.js'));
});

// API 路由
app.use('/api/collect', require('./routes/collect'));
app.use('/api/sites', require('./routes/sites'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/sitemap', require('./routes/sitemap'));

// 健康检查
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', ts: Date.now() });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'internal error' });
});

// 启动
app.listen(PORT, () => {
  console.log(`Monitor server running on http://localhost:${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/index.html`);
  console.log(`Collect API: POST http://localhost:${PORT}/api/collect`);
});

// 优雅关闭
process.on('SIGINT', () => {
  closeDb();
  process.exit(0);
});
process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});
