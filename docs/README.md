# Monitor - 爬虫 & 访客监控系统

一套轻量级网站监控方案，一行代码嵌入即可同时监控 AI 爬虫行为和人类访问数据。

## 核心功能

### 爬虫监控
- 识别 22+ 已知 AI/搜索引擎爬虫（GPTBot, ClaudeBot, Googlebot, Bingbot, Bytespider...）
- 实时追踪爬虫活动
- 爬虫访问趋势、页面排名、家族分布
- Sitemap 交叉分析：哪些页面被 AI 爬取
- 页面更新时间分析：优先使用 sitemap `lastmod`，缺失时自动探测页面更新时间

### 访客分析
- PV/UV 统计、独立访客追踪
- 设备分布（Desktop/Mobile/Tablet）
- 流量来源分析
- 页面停留时间、滚动深度
- 热门页面排名

### 多语言
- 支持中文 / 英文切换
- 所有 UI 文本均支持双语

## 快速开始

### 1. 启动后端

```bash
cd server
npm install
npm start
```

服务将在 `http://localhost:3000` 启动。

### 2. 嵌入 SDK

在目标网站的 `<head>` 中添加一行代码：

```html
<script src="http://your-server:3000/sdk/tracker.js" data-site-id="YOUR_SITE_ID" async></script>
```

### 3. 查看看板

打开 `http://localhost:3000/index.html`，选择网站即可查看监控数据。

## 项目结构

```
OriginMonitor/
├── sdk/
│   └── tracker.js          # 前端采集 SDK（< 5KB）
├── server/
│   ├── index.js            # Express 服务入口
│   ├── routes/
│   │   ├── collect.js      # 数据接收 API
│   │   ├── dashboard.js    # 看板数据 API
│   │   ├── sites.js        # 网站管理 API
│   │   └── sitemap.js      # Sitemap 分析 API
│   ├── db/
│   │   ├── init.js         # 数据库初始化
│   │   └── schema.sql      # 表结构
│   ├── utils/
│   │   └── bot-classify.js # 爬虫识别
│   └── middleware/
│       └── cors.js         # CORS 配置
├── frontend/
│   └── index.html          # GA4 风格看板（含 i18n）
└── docs/
    ├── README.md           # 本文件
    ├── sdk-integration.md  # SDK 接入指南
    ├── api-reference.md    # API 文档
    ├── deployment.md       # 部署指南
    ├── architecture.md     # 架构设计
    ├── bot-database.md     # 爬虫识别库
    ├── experience.md       # 经验总结
    ├── changelog.md        # 更新日志
    └── sop.md              # 代码更新标准流程
```

## 测试

```bash
cd server
npm test
```

运行 53 个测试用例，覆盖接口和页面更新时间解析逻辑。

## 技术栈

- **SDK**: 原生 JavaScript，< 5KB
- **后端**: Node.js + Express
- **数据库**: SQLite（better-sqlite3）
- **前端**: HTML + ECharts（CDN）

## 相关文档

- [SDK 接入指南](sdk-integration.md)
- [API 接口文档](api-reference.md)
- [部署指南](deployment.md)
- [架构设计](architecture.md)
- [爬虫识别库](bot-database.md)
- [经验与思路](experience.md)
- [更新日志](changelog.md)
