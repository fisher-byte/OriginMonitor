# API 接口文档

## 数据上报

### POST /api/collect

SDK 上报数据端点，CORS 开放。

**请求体：**
```json
{
  "site_id": "uuid",
  "ts": 1715600000,
  "page_url": "/blog/hello",
  "ref": "https://google.com",
  "ua": "Mozilla/5.0 ...",
  "visitor": {
    "id": "anon-uuid",
    "screen": "1920x1080",
    "device": "desktop",
    "os": "macOS",
    "browser": "Chrome",
    "language": "zh-CN",
    "scroll_depth": 85,
    "stay_time": 12000
  },
  "events": [
    {
      "url": "/api/data",
      "method": "GET",
      "status": 200,
      "duration": 120,
      "type": "fetch"
    }
  ]
}
```

**响应：**
```json
{ "success": true }
```

---

## 看板 API

所有看板 API 需要 `site_id` 参数。

### GET /api/dashboard/overview

概览数据。

| 参数 | 默认 | 说明 |
|------|------|------|
| site_id | 必填 | 网站 ID |
| hours | 24 | 统计时间窗口（小时） |

**响应：**
```json
{
  "success": true,
  "data": {
    "total_pv": 1234,
    "bot_pv": 567,
    "human_pv": 667,
    "uv": 234
  }
}
```

**失败降级：**
- 当目标域名不可达、没有 sitemap、或抓取失败时，接口会返回 `200` + `success: false`
- 此时 `data` 为空数组，并在 `error` 字段中给出失败原因
- 这样前端可以回退到已有页面聚合数据，而不是直接报 `500`

### GET /api/dashboard/trend

按天的趋势数据。

| 参数 | 默认 | 说明 |
|------|------|------|
| site_id | 必填 | 网站 ID |
| days | 30 | 统计天数 |

### GET /api/dashboard/realtime

最近 N 分钟的爬虫活动。

| 参数 | 默认 | 说明 |
|------|------|------|
| site_id | 必填 | 网站 ID |
| minutes | 5 | 时间窗口（分钟） |

### GET /api/dashboard/pages

页面排名。

| 参数 | 默认 | 说明 |
|------|------|------|
| site_id | 必填 | 网站 ID |
| hours | 168 | 时间窗口 |
| limit | 20 | 返回数量 |

**说明：**
- `limit=all` 时返回当前时间窗口内的全部页面
- 返回结果会包含页面级聚合数据，如 `bot_count`、`human_count`

### GET /api/dashboard/bots

爬虫排名。

### GET /api/dashboard/visitors

访客统计（人类）。

### GET /api/dashboard/visitor-trend

PV/UV 趋势。

### GET /api/dashboard/referrers

流量来源排名。

### GET /api/dashboard/devices

设备分布。

### GET /api/dashboard/performance

性能指标。

---

## Sitemap 分析

### GET /api/sitemap/analyze

抓取目标网站的 sitemap.xml，与爬取数据交叉分析。

| 参数 | 默认 | 说明 |
|------|------|------|
| site_id | 必填 | 网站 ID |
| domain | 必填 | 目标域名（不含协议） |
| hours | 720 | 统计时间窗口（小时） |

**页面更新时间来源优先级：**
1. `sitemap.xml` 中的 `<lastmod>`
2. 页面响应头 `Last-Modified`
3. 页面 HTML 中的 `article:modified_time`、`dateModified`、`og:updated_time`、`time[datetime]` 等常见更新时间标记

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "page_url": "/blog/ai-tools",
      "full_url": "https://example.com/blog/ai-tools",
      "page_updated_at": "2026-05-14T10:00:00+08:00",
      "page_updated_ts": 1747188000000,
      "page_updated_source": "sitemap_lastmod",
      "bot_count": 12,
      "human_count": 5,
      "bot_names": "GPTBot,ClaudeBot",
      "total": 17,
      "crawled": true
    }
  ],
  "total_pages": 45,
  "crawled_pages": 12,
  "source": "https://example.com/sitemap.xml"
}
```

**安全限制：**
- 仅支持域名，禁止 IP 地址、localhost、内网地址
- 响应体限制 1MB
- 子 sitemap 最多抓取 20 个

---

## 网站管理

### POST /api/sites

创建网站。

**请求体：**
```json
{ "name": "我的网站", "domain": "example.com" }
```

**响应：**
```json
{ "success": true, "site_id": "uuid", "name": "我的网站" }
```

### GET /api/sites

获取网站列表。

### DELETE /api/sites/:id

删除网站及其所有关联数据（page_events、request_events、daily_stats）。

**响应：**
```json
{ "success": true }
```

**错误：**
- 404：网站不存在

---

## API Key 认证

当环境变量 `API_KEY` 设置后，以下 API 需要认证：

- `/api/dashboard/*`
- `/api/sites/*`
- `/api/sitemap/*`

**不需要认证的端点：**

- `/api/collect`（SDK 数据上报）
- `/healthz`（健康检查）

**认证方式：**

1. Header: `Authorization: Bearer <api-key>`
2. Query: `?api_key=<api-key>`

**错误响应：**

```json
{ "error": "Unauthorized: invalid or missing API key" }
```

---

## MCP Server

MCP (Model Context Protocol) 让 AI 助手直接查询监控数据。

详细配置请参考 [MCP 接入指南](mcp-integration.md)。

**可用工具：** list_sites, get_site, get_overview, get_trend, get_bots, get_pages, get_realtime, get_visitors, get_devices, get_referrers, get_performance, analyze_sitemap, create_site, delete_site

---

## CLI 工具

命令行访问监控数据。

详细用法请参考 [CLI 命令参考](cli-reference.md)。

```bash
origin-monitor sites list
origin-monitor overview <site-id> --hours 24
origin-monitor bots <site-id> --json
```
