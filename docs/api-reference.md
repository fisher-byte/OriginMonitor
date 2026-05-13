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
