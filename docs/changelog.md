# 更新日志

## v1.2.0 (2026-05-13)

### 新增

**站点管理**
- 站点删除功能（DELETE /api/sites/:id），级联删除所有关联数据
- 站点创建后自动验证（GET /api/sites/:id 确认存在）
- 下拉菜单中显示删除按钮

**前端改进**
- 折线图改为直线段（smooth: false），去掉圆润曲线
- GA4 风格自定义时间选择器：预设按钮（今天/7天/28天/90天）+ 自定义日期范围输入
- 全部页面分析表格支持排序（点击 AI/人类访问量表头切换升降序）
- 修复 AI Traffic 图表空白问题（图表实例正确销毁/重建）
- 实时爬虫活动改为追加模式（新数据追加到列表顶部，保留历史）

**多语言扩展**
- 语言系统改为可扩展的 LANGS 对象，新增语言只需添加一个 key
- 语言切换按钮动态生成

### 测试
- 新增 6 个 DELETE 端点测试用例（共 48 个测试全部通过）

### 文档
- API 文档添加 DELETE /api/sites/:id
- 新建 SOP 文档（代码更新标准流程）

## v1.1.0 (2026-05-13)

### 新增

**Sitemap 分析**
- 新增 `/api/sitemap/analyze` 端点
- 抓取目标网站 sitemap.xml，与爬取数据交叉分析
- 支持 sitemap index（自动抓取子 sitemap）
- 安全防护：域名验证、响应体限制、重定向限制

**前端重构（GA4 风格）**
- 从 Notion 风格重构为 Google Analytics 4 风格
- 左侧导航栏、顶部日期选择器、分数卡
- 全部页面分析：首页底部展示完整页面列表（含 sitemap 数据）
- 自定义下拉选择器（替代原生 select）

**多语言支持（i18n）**
- 支持中文/英文切换
- 顶部语言切换按钮
- 所有 UI 文本均支持双语

### 安全修复
- Sitemap API 添加 SSRF 防护（禁止 IP、localhost、内网地址）
- Sitemap 响应体限制 1MB
- 跨域重定向限制
- 网站创建接口添加输入长度验证

### 优化
- 前端配色简化：统一为 amber + blue 双色系
- 饼图使用 amber 渐变色（替代多色混搭）
- Badge 统一为 amber 色系

## v1.0.0 (2026-05-13)

### 新增

**SDK (tracker.js)**
- 一行代码嵌入，支持 `data-site-id` 配置
- 自动拦截 fetch / XMLHttpRequest 请求
- Performance API 资源加载采集
- 20+ 已知 AI/搜索引擎爬虫识别
- 人类访客数据采集（PV/UV、设备、来源、停留时间、滚动深度）
- 批量上报（5 秒间隔或 20 条触发）
- sendBeacon 优先 + XHR 降级
- 页面离开时自动上报

**后端 (server)**
- Express + SQLite 服务
- 数据接收 API（POST /api/collect）
- 爬虫监控看板 API（overview, trend, realtime, pages, bots）
- 访客分析看板 API（visitors, visitor-trend, referrers, devices, performance）
- 网站管理 API（CRUD /api/sites）
- 爬虫识别引擎（移植自 radarai.top）
- CORS 跨域支持

**前端看板 (frontend)**
- 爬虫监控 Tab：趋势图、实时活动、爬虫排名、页面排名、家族分布
- 访客分析 Tab：PV/UV 趋势、设备分布、流量来源、热门页面
- ECharts 图表
- Notion-like 设计风格
- 网站创建功能

**文档 (docs)**
- README 项目总览
- SDK 接入指南
- API 接口文档
- 部署指南（腾讯云）
- 爬虫识别库说明
- 更新日志

**测试**
- 42 个 API 测试用例
- 覆盖所有端点
