# 更新日志

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
