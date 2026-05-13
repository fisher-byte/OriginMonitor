const cors = require('cors');

// 允许任意域名上报数据（SDK 需要跨域）
const collectCors = cors({
  origin: '*',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400,
});

// 看板 API 限制来源
const dashboardCors = cors({
  origin: true,
  credentials: true,
});

module.exports = { collectCors, dashboardCors };
