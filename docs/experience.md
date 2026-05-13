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

### 6. 测试策略

**API 测试比单元测试更实用**：
- 这个项目的核心是 HTTP API
- 测试每个端点的输入输出比 mock 内部函数更有价值
- 42 个测试覆盖所有端点，包括错误情况

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

## 思路总结

```
需求分析 → 参考已有方案 → 移植核心逻辑 → 设计数据结构 → 实现 API → 实现 SDK → 实现前端 → 测试 → 部署
```

关键原则：
1. **先跑通再优化**：SQLite 够用就先用，不需要上来就 PG
2. **移植优于重写**：爬虫规则从 radarai.top 移植，省时间
3. **测试驱动信心**：42 个测试通过才敢部署
4. **文档即产品**：好文档让别人（包括未来的自己）能快速理解
