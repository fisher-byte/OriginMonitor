# 更新日志

## v2.0.3 (2026-05-19)

### 修复

- 测试脚本结束后自动清理测试站点，避免本地看板残留大量"测试站"
- UV 统计对历史 nginx 导入数据增加 `IP + UA` 兜底识别，避免没有 SDK `visitor_id` 时显示为 0
- 最近 30 分钟活跃与实时爬虫改用事件时间 `ts` 判断，避免导入时间污染实时数据
- `/updates/brief-YYYYMMDD-HHMM` 页面优先使用 URL 中的内容时间，避免 sitemap 批量更新时间覆盖真实内容时间
- SDK 默认上报地址修正为根路径 `/api/collect`，避免从 `/sdk/tracker.js` 误推导成 `/sdk/api/collect`
- 最近 30 分钟活跃增加数据新鲜度提示，区分“确实无访问”和“SDK 未实时上报”
- `/updates/weekly-YYYY-MM-DD` 页面优先使用 URL 中的内容日期，避免统一构建时间覆盖真实内容日期
- 趋势图增加右侧安全边距，避免右侧日期标签被裁切
- 部署文档与 SOP 重写为可直接执行版本，补齐 `better-sqlite3` 重建与外部应用反向代理接入两类关键缺口

## v2.0.2 (2026-05-15)

### 修复

**前端体验（基于用户反馈）**
- "独立访客"标签改为"独立访客（UV）"，副标题说明"同一访客多次访问只计1次"，更清晰
- UV 模式第二张卡片改为"人类 UV"并加说明"排除爬虫后的独立人类访客"
- 趋势图 legend 间距增大（bottom 4→24px，grid bottom 72→80px），标识不再紧贴图表
- 选择"今天"时趋势图改用 bar chart 显示单数据点，解决默认不可见问题
- 单数据点 xAxis boundaryGap 自适应（bar 模式用 true，line 模式用 false）
- 实时动态加载增加 loading 状态提示，超时从 10s 增至 15s
- 实时动态错误提示增加重试指引文案
- 30 分钟 fallback 请求增加 catch 处理，避免静默失败

**PV/UV 切换联动**
- 新增 `renderOverviewCharts()` 函数，PV/UV 切换时联动更新所有图表
- UV 模式下趋势图显示 AI PV + Human UV 数据
- 新增 `overviewTrendData` 变量缓存趋势数据，避免切换时重复请求

**智能刷新**
- scorecard 自动刷新改为对比新旧数据，值不变时不更新 DOM，消除不必要重绘
- active users 同理，文本内容不变时不触发 DOM 更新

### 测试
- 自动化测试合计 **67** 条，全部通过

## v2.0.1 (2026-05-14)

### 修复

**前端体验**
- 概览页新增"最近30分钟活跃"展示条，实时显示爬虫和人类活动数量
- UV 标签改为"人类访客（UV）"，子标题更清晰说明去重逻辑
- 趋势图 legend 与图表间距增大（grid.bottom 52→72），不再紧贴
- 自动刷新改为只刷新分数卡和活跃数据，不再重建图表，消除闪烁
- "今天"视图下趋势图单个数据点现在默认可见（showSymbol + padding 空数据居中）
- 实时动态加载加 10 秒超时和错误处理，失败时显示错误提示
- 空数据改为"暂无实时爬虫活动"而非"加载中"
- 实时动态 5 分钟无数据时自动扩大到 30 分钟重试
- "全部页面分析"标题改为"页面访问分析"，更准确反映内容

**数据一致性**
- 全部页面分析改为以 crawl 数据为基础，合并 sitemap 更新时间
- 保留 crawl 中有但 sitemap 没有的页面，保证数字与总量一致
- sitemap 中有但未被爬取的页面也会展示（bot_count=0）
- 活跃用户人数改用独立访客数（UV）而非 PV，数字更准确

### 新增
- `GET /api/dashboard/active-visitors` 端点：返回最近 N 分钟内的活跃爬虫种类数和人类独立访客数

### 测试
- 新增 `active-visitors` 端点相关断言
- 自动化测试合计 **67** 条（`cd server && node tests/test-api.js`）

### 文档与流程
- `docs/sop.md`、`docs/README.md`、`docs/deployment.md`、`docs/experience.md` 与测试数量对齐

## v2.0.0 (2026-05-14)

### 新增

**AI 原生架构**
- MCP Server (`mcp/`): 14 个工具，AI 助手可直接查询所有监控数据
- CLI 工具 (`cli/`): 终端命令行访问，支持表格和 JSON 输出
- 共享模块 (`shared/`): 数据库连接和查询函数，server/MCP/CLI 三方复用
- Sitemap 服务模块 (`server/lib/`): 核心分析逻辑从路由中提取，可独立调用

**API Key 认证**
- 可选的 API Key 认证中间件 (`server/middleware/auth.js`)
- 通过 `API_KEY` 环境变量启用
- 支持 `Authorization: Bearer <key>` 和 `?api_key=<key>` 两种方式
- `/api/collect` 和 `/healthz` 不需要认证（向后兼容）

**安全加固**
- `.gitignore` 添加 `.claude/`、`prompt.md` 等忽略项
- 文档脱敏：移除硬编码服务器 IP，使用占位符
- 新增 `.env.example` 配置模板

**文档**
- 新增 MCP 接入指南 (`docs/mcp-integration.md`)
- 新增 CLI 命令参考 (`docs/cli-reference.md`)
- 新增 OpenAPI 规范 (`docs/openapi.yaml`)
- 更新项目结构和架构说明

### 变更

- `server/db/init.js` 改为使用 `shared/db.js` 共享模块
- `server/routes/dashboard.js` 改为使用 `shared/queries.js` 共享查询
- `server/routes/sites.js` 改为使用 `shared/queries.js` 共享查询
- `server/routes/sitemap.js` 改为使用 `server/lib/sitemap-service.js`
- 根目录新增 `package.json`，统一管理共享依赖

### 安全修复

- API Key 认证使用 `crypto.timingSafeEqual` 防止时序攻击
- `deleteSite` 操作使用事务保证数据一致性

### 测试

- 新增 6 个 API Key 认证中间件单元测试
- 测试总数更新为 67 个（含 API Key 与后续看板相关用例）

## v1.2.1 (2026-05-14)

### 修复

**页面分析**
- “全部页面分析”新增“页面更新时间”列，默认按更新时间倒序排列
- 页面更新时间不再误用 AI 抓取时间，而是按以下优先级解析：
  - sitemap `lastmod`
  - 页面响应头 `Last-Modified`
  - 页面 HTML 中的 `article:modified_time`、`dateModified`、`og:updated_time`、`time[datetime]`
- 页面分析接口支持 `limit=all`，避免只看到前 200 条页面数据
- `sitemap` 抓取失败时改为优雅降级，不再直接返回 `500`
- 自动加载 `sitemap` 失败时，前端会回退到已有页面聚合数据

**看板刷新**
- 看板新增自动刷新，解决页面长时间停留时 0514 新数据不自动出现的问题
- 自动刷新改为轻量模式，避免每分钟重复重抓全站 sitemap

### 测试
- 新增 sitemap / 页面更新时间解析测试
- 测试总数更新为 53 个

### 文档
- 更新 API 文档中的页面更新时间字段说明
- 更新部署文档、README、经验总结中的测试数量与实现策略说明
- 修正部署文档与 SOP，避免把本地 `node_modules` 上传到 Linux 服务器

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
