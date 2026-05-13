# OriginMonitor

一行代码接入的网站监控系统，同时覆盖 **AI 爬虫监控** 和 **人类访客分析**。

## 功能

### 爬虫监控
- 识别 20+ 已知 AI/搜索引擎爬虫（GPTBot, ClaudeBot, Googlebot, Bingbot, Bytespider...）
- 实时追踪爬虫活动
- 爬虫访问趋势、页面排名、家族分布

### 访客分析
- PV/UV 统计、独立访客追踪
- 设备分布（Desktop/Mobile/Tablet）
- 流量来源分析
- 页面停留时间、滚动深度
- 热门页面排名

## 快速开始

### 1. 启动后端

```bash
cd server
npm install
npm start
```

### 2. 嵌入 SDK

```html
<script src="http://your-server:3000/sdk/tracker.js" data-site-id="YOUR_SITE_ID" async></script>
```

### 3. 查看看板

打开 `http://localhost:3000/index.html`

## 项目结构

```
OriginMonitor/
├── sdk/tracker.js          # 前端采集 SDK（< 5KB）
├── server/
│   ├── index.js            # Express 服务入口
│   ├── routes/             # API 路由
│   ├── db/                 # SQLite 数据库
│   ├── utils/              # 爬虫识别
│   └── tests/              # API 测试（42 个用例）
├── frontend/index.html     # 看板页面
└── docs/                   # 文档
```

## 技术栈

- **SDK**: 原生 JavaScript，< 5KB，无依赖
- **后端**: Node.js + Express + SQLite
- **前端**: HTML + ECharts（CDN）
- **部署**: PM2 + Nginx

## 文档

- [SDK 接入指南](docs/sdk-integration.md)
- [API 接口文档](docs/api-reference.md)
- [部署指南](docs/deployment.md)
- [架构设计](docs/architecture.md)
- [爬虫识别库](docs/bot-database.md)
- [经验与思路](docs/experience.md)
- [更新日志](docs/changelog.md)

## 测试

```bash
cd server
npm test
```

42 个 API 测试用例，覆盖所有端点。

## 线上演示

- 看板：http://139.199.73.159/index.html
- SDK：http://139.199.73.159/sdk/tracker.js
- API：http://139.199.73.159/api/

## License

MIT
