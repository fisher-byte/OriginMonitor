# 经验与思路总结

## 项目背景

这个项目的目标是构建一套「一行代码接入」的网站监控系统，同时覆盖爬虫监控和人类访问分析。

灵感来自：
- **Google Analytics**：一行代码、看板可视化
- **radarai.top**：爬虫识别规则、Nginx 日志分析

## 核心经验

### 1. 从已有项目移植规则比从零写更可靠

radarai.top 已经有成熟的爬虫识别规则（20+ 已知爬虫），包括：
- AI 爬虫：GPTBot, ClaudeBot, OAI-SearchBot, PerplexityBot
- 搜索引擎：Googlebot, Bingbot, Baiduspider
- 国内爬虫：Bytespider, YisouSpider, PetalBot

直接把这些规则从 Python 移植到 JS，省去了大量调研时间，而且规则已经在生产环境验证过。

**教训**：开始新项目前，先看看已有项目里有什么可以复用。

### 2. SDK 设计的几个关键点

**sendBeacon vs XHR**：
- 页面关闭时 XHR 会被浏览器取消
- `navigator.sendBeacon` 会由浏览器保证发送成功
- 但 sendBeacon 需要用 `Blob` 设置 Content-Type，直接传字符串会丢失 header

**fetch 拦截的 method 问题**：
- 原始写法总是报告 `method: 'GET'`
- 需要从 `arguments[1].method` 获取实际 method
- 很多库（如 axios）底层用 fetch，不拦截就丢失数据

**首次页面浏览**：
- SDK 加载时 `pendingEvents` 为空
- 但页面浏览本身就是一个重要事件
- 解决：首次 flush 即使没有 request events 也要发送

**批量上报的时机**：
- 定时器（5秒）保证周期性
- 数量阈值（20条）保证不丢数据
- `beforeunload` + `visibilitychange` 保证页面离开时发送

### 3. SQLite 的使用技巧

**WAL 模式**：
```javascript
db.pragma('journal_mode = WAL');
```
WAL（Write-Ahead Logging）允许读写并发，不会因为写入阻塞读取。

**事务批量插入**：
```javascript
const insertMany = db.transaction((events) => {
  for (const evt of events) {
    insertStmt.run(...);
  }
});
insertMany(events);
```
比逐条插入快 10-100 倍。

**日期查询用 ts 而不是 created_at**：
- `created_at` 是字符串格式（`DEFAULT CURRENT_TIMESTAMP`）
- `ts` 是 Unix timestamp（整数）
- 日期聚合用 `date(ts, 'unixepoch', 'localtime')` 而不是 `date(created_at, 'unixepoch', 'localtime')`

### 4. 看板设计思路

**GA4 风格侧边栏导航**：
- 从 Tab 切换改为左侧导航栏（参考 GA4）
- Overview / AI Traffic / Pages / Realtime 四个面板
- 首页 Overview 底部放完整页面列表，一站式查看

**ECharts 选型**：
- 比 Chart.js 功能更全（支持饼图、折线图、混合图）
- CDN 引入，不需要打包
- 按需使用，不影响 SDK 体积

**GA4 风格**：
- 白色背景、细边框、圆角卡片
- 左侧导航栏 + 顶部日期选择器（参考 Google Analytics 4）
- Amber 作为主色（AI/爬虫）、Blue 作为辅色（人类数据）
- 配色精简：只用 amber 渐变 + blue 双色系，避免杂乱

**多语言（i18n）**：
- 用 `data-i18n` 属性标记需要翻译的元素
- JS 端维护 `i18n` 对象，`applyI18n()` 函数统一更新
- 语言偏好存储在 `localStorage`

### 4.1 页面更新时间不要直接等于爬虫抓取时间

这次踩得最明显的点是：
- 用户要看的“页面更新时间”，不是“AI 最后一次访问时间”
- 两者看起来都像“最近时间”，但业务含义完全不一样

更稳的做法是分层取值：
1. **优先用 sitemap 的 `lastmod`**，这是站点自己声明的更新时间
2. **没有 `lastmod` 时**，再看页面响应头 `Last-Modified`
3. **还没有时**，再轻量抓取页面 HTML，检查 `article:modified_time`、`dateModified`、`og:updated_time`、`time[datetime]`

**教训**：只要用户说的是“内容更新时间”，就不要默认拿访问日志里的时间字段顶上去。

### 5. 部署经验

**TencentOS Server 兼容性**：
- NodeSource 的 RPM 脚本不支持 TencentOS
- 解决：直接下载 Node.js 官方 tarball，手动安装到 `/usr/local/`
- 这个方法在任何 Linux 发行版上都适用

**PM2 进程管理**：
- `pm2 startup` 配置开机自启
- `pm2 save` 保存当前进程列表
- systemd 服务文件自动生成在 `/etc/systemd/system/pm2-root.service`

**Nginx CORS 配置**：
- SDK 被其他网站加载，需要 `Access-Control-Allow-Origin: *`
- `/api/collect` 需要处理 OPTIONS 预检请求
- 静态 SDK 文件加 `Cache-Control` 减少重复请求

### 5.1 外部应用“接入成功”不等于“已经写入当前监控库”

这次实战里最容易误判的一点是：

- 外部应用页面里已经插入了 SDK
- 浏览器里 `tracker.js` 和 `POST /api/collect` 看起来都正常
- 甚至接口也返回了 `200`

但这并不自动等于“数据已经进入当前监控服务的数据库”。

根因通常是：

1. 外部应用自己的服务里本来就有 `/api/collect`
2. 页面虽然用了当前 SDK，但请求仍然打到了外部应用本地服务
3. 外部应用域名下的 `/sdk/` 或 `/api/collect` 没有代理到当前监控服务

**正确做法**：

- 要么直接把 SDK 和采集地址都指向监控服务域名
- 要么在外部应用 Nginx 上，明确把 `/sdk/` 和 `/api/collect` 代理到监控服务

**教训**：以后验证“接入成功”时，必须同时看页面、网络请求和监控数据库三层，不能只看前两层。

### 5.2 原生模块不是“上传就能跑”

这次线上再次验证了一个通用部署规律：

- `better-sqlite3`、`playwright` 这类依赖都和运行环境强相关
- 本地能跑，不代表服务器直接复制过去就能跑

这类依赖的正确策略是：

1. 代码上传时排除本地 `node_modules`
2. 目标服务器重新 `npm install`
3. 对 `better-sqlite3` 这种原生模块额外执行 `npm rebuild --build-from-source`
4. 对浏览器自动化类项目，确认目标环境里真的安装了对应运行时依赖

**教训**：部署 SOP 里如果没有把“服务器本机构建”写死，后面迟早会反复踩坑。

### 6. 测试策略

**API 测试比单元测试更实用**：
- 这个项目的核心是 HTTP API
- 测试每个端点的输入输出比 mock 内部函数更有价值
- 67 个测试覆盖所有端点，包括错误情况、页面更新时间解析逻辑与活跃访客接口

**测试顺序**：
1. 先测网站管理（创建 site_id）
2. 再测数据上报（写入数据）
3. 最后测看板 API（读取数据）

## 踩过的坑

### 坑 1：UV 统计包含空值

```sql
-- 错误：空 visitor_id 也会被 COUNT DISTINCT
COUNT(DISTINCT visitor_id) as uv

-- 正确：排除空值
COUNT(DISTINCT CASE WHEN visitor_id != '' THEN visitor_id END) as uv
```

爬虫访问没有 visitor_id，如果不排除，UV 会虚高。

### 坑 2：date() 函数对字符串不生效

```sql
-- 错误：created_at 是字符串，不是 unix timestamp
date(created_at, 'unixepoch', 'localtime')

-- 正确：用 ts 字段
date(ts, 'unixepoch', 'localtime')
```

SQLite 的 `date()` 配合 `'unixepoch'` 只对数字有效。

### 坑 3：sendBeacon 的 Content-Type

```javascript
// 错误：直接传字符串，浏览器不会设置 Content-Type
navigator.sendBeacon(url, JSON.stringify(payload));

// 正确：用 Blob 明确指定类型
var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
navigator.sendBeacon(url, blob);
```

### 坑 4：NodeSource 脚本不支持某些 OS

RPM 系的脚本会检测 `/etc/redhat-release`，TencentOS 没有这个文件就报错。

解决：直接下载 tarball，手动安装。这个方法最通用。

### 坑 5：外部 sitemap 抓取失败不应该打成 500

这次线上又补到一个典型坑：
- 页面分析会自动尝试抓站点的 `sitemap.xml`
- 如果站点配置的是测试域名、占位域名，或者域名临时不可达，接口很容易报 DNS 失败
- 这种失败本质上是“外部资源不可用”，不是我们服务自身崩了

正确处理方式：
- 接口返回 `200 + success: false`
- 前端自动回退到本地已有页面聚合数据
- 不要让看板因为一个外部域名失败就表现成整站坏了

### 坑 6：`/api/collect` 成功返回，不代表请求打到了正确服务

这次就是靠这个坑把旧 SOP 打穿了。

表象是：

- 页面正常
- SDK 正常
- 请求也是 `200`

但监控看板没有数据。

真正问题不是 SDK 本身，而是：

- 请求落在了错误的服务
- 或者外部应用域名下的反向代理没有改对

**结论**：以后所有站外接入验证，必须把“请求成功”拆成两步看：

1. 请求有没有发出去
2. 请求是不是写进了当前监控数据库

## 思路总结

```
需求分析 → 参考已有方案 → 移植核心逻辑 → 设计数据结构 → 实现 API → 实现 SDK → 实现前端 → 测试 → 部署
```

关键原则：
1. **先跑通再优化**：SQLite 够用就先用，不需要上来就 PG
2. **移植优于重写**：爬虫规则从 radarai.top 移植，省时间
3. **测试驱动信心**：67 个测试通过才敢部署
4. **文档即产品**：好文档让别人（包括未来的自己）能快速理解
