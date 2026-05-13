# 架构设计说明

## 为什么选择这个方案

### 核心问题

我们需要一套监控系统，能同时回答两个问题：
1. **哪些 AI 爬虫在爬我的网站？** — 爬虫监控
2. **真实用户怎么使用我的网站？** — 访客分析

### 方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| Nginx 日志分析（radarai.top 方案） | 不侵入代码，数据完整 | 需要服务器权限，无法采集设备/滚动等前端数据 |
| Google Analytics | 成熟，功能全 | 数据在 Google，无法自定义爬虫识别 |
| **前端 SDK + 自建后端（本方案）** | 数据自控，可自定义，一行接入 | 需要维护服务 |

### 选择本方案的原因

1. **爬虫识别是核心差异化**：GA 不会告诉你 GPTBot 昨天爬了哪些页面
2. **数据主权**：所有数据存在自己的服务器
3. **可扩展**：后续可以加告警、加爬虫规则、加自定义事件

## 数据流

```
浏览器（目标网站）
  │
  │  SDK 采集：
  │  1. navigator.userAgent → 爬虫识别
  │  2. fetch/XHR 拦截 → 网络请求
  │  3. Performance API → 资源加载
  │  4. scroll/stay time → 用户行为
  │
  ▼  POST /api/collect（批量，5秒/20条）
  
Nginx（腾讯云）
  │
  ▼  proxy_pass
  
Express 服务（:3000）
  │
  ├─ /api/collect → 写入 SQLite（page_events + request_events）
  ├─ /api/dashboard/* → 读取 SQLite，聚合计算
  ├─ /api/sites → CRUD
  └─ /api/sitemap/analyze → 抓取 sitemap.xml + 交叉分析
  
SQLite（/opt/monitor/server/data/monitor.db）
  │
  ├─ page_events：每条页面访问（含爬虫+人类）
  ├─ request_events：每条网络请求
  ├─ daily_stats：每日聚合（预留）
  └─ sites：网站配置
```

## 关键设计决策

### 1. 为什么用 SQLite 而不是 MySQL/PostgreSQL？

- **零配置**：不需要额外安装数据库服务
- **单文件**：备份就是 cp 一个文件
- **性能够用**：单机几千 PV/天完全没问题
- **迁移简单**：后续换 PG 只改连接层

### 2. 为什么用 sendBeacon 而不是 XHR？

- `navigator.sendBeacon` 在页面关闭时也能发送成功
- 不阻塞页面卸载
- 浏览器会自动重试

### 3. 为什么 SDK 要拦截 fetch/XHR？

- 能看到目标网站的真实网络请求
- 识别哪些 API 被爬虫频繁调用
- 发现异常请求模式

### 4. 爬虫识别为什么放在后端而不是只靠前端？

- 前端 SDK 传 `ua` 字段，后端再做一次分类
- 原因：SDK 可能被绕过（比如直接 curl），后端用 IP + UA 双重验证更可靠
- 当前版本只用 UA，后续可以加 IP 段验证

### 5. 为什么批量上报而不是实时？

- 减少网络请求次数
- 合并多条事件到一个请求
- 5 秒间隔足够实时，又不会太频繁

## 性能考虑

| 环节 | 策略 |
|------|------|
| SDK 体积 | < 5KB gzip，纯原生 JS，无依赖 |
| 上报频率 | 5 秒或 20 条，取先触发者 |
| 数据库写入 | 事务批量插入 |
| 看板查询 | 索引优化（site_id + ts） |
| 前端图表 | ECharts CDN，按需渲染 |

## 安全考虑

| 风险 | 措施 |
|------|------|
| SDK 被滥用上报假数据 | site_id 验证，后续可加域名白名单 |
| 看板 API 被未授权访问 | 后续可加 API Key |
| SQL 注入 | 使用参数化查询（better-sqlite3） |
| XSS | 前端输出全部 esc() 转义 |

## 后续扩展方向

1. **告警系统**：爬虫访问量异常时通知（邮件/Webhook）
2. **IP 段验证**：验证 Googlebot 等是否来自 Google 官方 IP
3. **自定义事件**：允许 SDK 上报自定义业务事件
4. **多站点对比**：跨站点数据对比看板
5. **数据导出**：CSV/JSON 导出
6. **API Key 认证**：看板 API 访问控制
