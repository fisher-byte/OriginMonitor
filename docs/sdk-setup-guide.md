# OriginMonitor SDK 接入教程（GitHub 公共版）

本文档用于指导任意网站接入 OriginMonitor 前端采集 SDK。

SDK 接入后，网站访问会自动上报到监控服务，用于统计：

- AI 爬虫访问
- 人类访问 PV / UV
- 页面访问路径
- 来源页面、设备、浏览器、语言
- 页面停留时间、滚动深度
- 页面内资源请求性能

## 1. 接入前准备

接入前需要确认三件事。

### 1.1 监控服务地址

监控服务需要能公开访问，至少包含以下两个地址：

```text
https://你的监控域名/sdk/tracker.js
https://你的监控域名/api/collect
```

含义：

- `/sdk/tracker.js`：前端 SDK 文件，给目标网站加载。
- `/api/collect`：数据上报接口，接收 SDK 采集的数据。

### 1.2 网站 ID

每个被监控网站都需要一个 `site_id`。

可以在监控后台添加网站后获得，也可以通过接口创建：

```bash
curl -X POST https://你的监控域名/api/sites \
  -H "Content-Type: application/json" \
  -d '{"name":"Example Site","domain":"example.com"}'
```

返回里的 `site_id` 就是 SDK 接入时要使用的 ID。

### 1.3 目标网站可修改 HTML

需要能在目标网站的全站模板中插入一段 `<script>`。

推荐放在：

- `<head>` 内
- 或 `</body>` 前

如果是静态站、模板站、SSR 站点，都建议放在全站公共模板中，保证所有页面都能采集。

## 2. 推荐接入方式

如果目标网站使用远程监控服务采集数据，推荐写法如下：

```html
<script
  src="https://你的监控域名/sdk/tracker.js"
  data-site-id="YOUR_SITE_ID"
  data-api-url="https://你的监控域名/api/collect"
  async>
</script>
```

把 `https://你的监控域名` 替换成实际部署 OriginMonitor 的域名。

例如：

```html
<script
  src="https://monitor.example.com/sdk/tracker.js"
  data-site-id="YOUR_SITE_ID"
  data-api-url="https://monitor.example.com/api/collect"
  async>
</script>
```

说明：

- `src` 指向 SDK 文件。
- `data-site-id` 指定当前网站。
- `data-api-url` 明确指定上报接口，跨域接入时建议保留。
- `async` 表示异步加载，不阻塞页面打开。

## 3. 通用接入方式

### 3.1 SDK 与采集接口在同一个监控域名

这是最推荐的方式。

```html
<script
  src="https://monitor.example.com/sdk/tracker.js"
  data-site-id="YOUR_SITE_ID"
  async>
</script>
```

SDK 会默认把数据上报到：

```text
https://monitor.example.com/api/collect
```

### 3.2 SDK 文件和采集接口不在同一个域名

如果 SDK 文件通过 CDN 分发，但数据要上报到自己的监控服务，需要显式指定 `data-api-url`：

```html
<script
  src="https://cdn.example.com/origin-monitor/tracker.js"
  data-site-id="YOUR_SITE_ID"
  data-api-url="https://monitor.example.com/api/collect"
  async>
</script>
```

### 3.3 本地测试接入

本地开发时，如果监控服务运行在 `http://localhost:3000`：

```html
<script
  src="http://localhost:3000/sdk/tracker.js"
  data-site-id="YOUR_SITE_ID"
  data-api-url="http://localhost:3000/api/collect"
  async>
</script>
```

注意：如果目标网站是 HTTPS 页面，浏览器可能会拦截 HTTP SDK 或 HTTP 上报接口。正式环境建议统一使用 HTTPS。

## 4. 是否需要“同步 SDK 数据”

通常不需要额外同步。

SDK 的工作方式是：

```text
用户或爬虫访问网站
  ↓
浏览器加载 tracker.js
  ↓
SDK 自动生成访问数据
  ↓
POST 到 /api/collect
  ↓
写入 monitor.db
  ↓
看板实时展示
```

也就是说，只要 SDK 正常加载并成功请求 `/api/collect`，数据会直接进入监控库。

不需要再做一层“定时同步”。

只有下面两种情况才需要同步任务：

- 网站不能嵌入前端 SDK，只能从 Nginx / CDN 日志导入。
- 线上监控服务和看板使用的数据库不是同一个，需要把生产库同步到看板库。

## 5. 如何验证 SDK 是否生效

接入后必须验证。不要只看代码里有没有 `<script>`。

### 5.1 浏览器 Network 检查

打开目标网站，例如：

```text
https://example.com/
```

打开浏览器开发者工具，进入 Network 面板，刷新页面，检查是否有：

```text
/sdk/tracker.js
/api/collect
```

判断标准：

- `tracker.js` 状态码是 `200`
- `api/collect` 请求方法是 `POST`
- `api/collect` 状态码是 `200`

如果没有看到 `tracker.js`，说明 SDK 没有被页面加载。

如果看到 `tracker.js`，但没有看到 `/api/collect`，说明 SDK 加载了但没有完成上报。

如果 `/api/collect` 是 `404`，通常是上报地址错了。

如果 `/api/collect` 是 CORS 错误，通常是监控服务跨域配置不允许目标网站访问。

### 5.2 用 curl 检查 SDK 文件

```bash
curl -I https://你的监控域名/sdk/tracker.js
```

预期：

```text
HTTP/2 200
content-type: application/javascript
access-control-allow-origin: *
```

### 5.3 用 curl 检查采集接口

可以模拟一次访问上报：

```bash
curl -X POST https://你的监控域名/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": "YOUR_SITE_ID",
    "ts": 1779160000,
    "page_url": "/sdk-test",
    "ref": "",
    "ua": "Mozilla/5.0 SDK Test",
    "visitor": {
      "id": "sdk-test-visitor",
      "device": "desktop",
      "os": "macOS",
      "browser": "Chrome",
      "language": "zh-CN"
    },
    "events": []
  }'
```

预期返回：

```json
{ "success": true }
```

### 5.4 看板检查

进入监控看板：

```text
https://你的监控域名/index.html
```

选择对应网站后检查：

- 顶部“最近 30 分钟”是否出现人类访问
- 总 PV 是否增加
- 人类 PV / UV 是否增加
- 页面访问分析中是否出现刚访问的页面路径

如果顶部仍然显示：

```text
暂无实时上报，最新数据截至 ...
```

说明当前看板数据库里没有收到最近 30 分钟的新数据。

## 6. 常见问题

### 6.1 页面里嵌了 SDK，但看板还是 0

优先检查 Network。

常见原因：

- 页面实际没有加载 `tracker.js`
- SDK 被缓存或模板没有发布成功
- `data-site-id` 写错
- `/api/collect` 地址写错
- `/api/collect` 被 CORS 拦截
- 监控服务和看板不是同一个数据库

### 6.2 为什么 AI 爬虫可能没有实时数据

前端 SDK 主要依赖 JavaScript 执行。

部分 AI 爬虫不会执行 JS，这类爬虫访问不会通过 SDK 上报。

如果要完整监控不执行 JS 的爬虫，建议同时接入服务器日志导入：

- Nginx access log
- CDN log
- 反向代理日志

前端 SDK 适合统计真实浏览器访问和会执行 JS 的爬虫。

日志导入适合补全不会执行 JS 的爬虫。

### 6.3 是否会影响网站性能

SDK 使用 `async` 异步加载，不阻塞页面渲染。

上报优先使用 `navigator.sendBeacon`，浏览器不支持时再使用异步 XHR。

正常情况下对页面首屏影响很小。

### 6.4 会不会采集隐私数据

SDK 不采集：

- Cookie
- Authorization Header
- POST 请求体
- 用户姓名、手机号、邮箱等业务字段

SDK 会采集：

- 页面路径
- User-Agent
- 来源页面
- 设备、浏览器、语言
- 匿名访客 ID
- 页面性能和停留行为

匿名访客 ID 存储在 `sessionStorage`，用于当前会话内去重。

## 7. 上线检查清单

上线前逐项确认：

- [ ] 监控后台已创建网站，并拿到正确 `site_id`
- [ ] 目标网站模板已加入 SDK 脚本
- [ ] `src` 可以正常访问 `tracker.js`
- [ ] `data-site-id` 与后台网站一致
- [ ] 跨域场景已填写 `data-api-url`
- [ ] Network 中能看到 `POST /api/collect`
- [ ] `/api/collect` 返回 `200`
- [ ] 看板最近 30 分钟出现新访问
- [ ] 页面访问分析中出现测试页面路径
- [ ] 生产环境使用 HTTPS

## 8. 推荐给任意接入站点的最终检查

建议按下面顺序确认：

1. 打开目标网站首页，例如 `https://example.com/`
2. 查看页面源码，确认能搜索到 `tracker.js`
3. 打开浏览器 Network，刷新页面
4. 确认有 `GET https://你的监控域名/sdk/tracker.js`
5. 确认有 `POST https://你的监控域名/api/collect`
6. 打开监控看板，确认“最近 30 分钟”不再提示“暂无实时上报”

如果第 2 步搜不到 `tracker.js`，说明 SDK 还没有真正发布到线上页面。

如果第 4 步有、但第 5 步没有，说明 SDK 加载了但上报失败，需要检查 `data-site-id` 和 `data-api-url`。

如果第 5 步成功，但看板没有变化，说明采集服务写入的数据库和看板读取的数据库不是同一个，需要检查部署环境中的 `MONITOR_DB_PATH`。
