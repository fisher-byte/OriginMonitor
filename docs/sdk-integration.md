# SDK 接入指南

## 一行代码接入

在目标网站的 `<head>` 标签内添加：

```html
<script src="https://your-domain.com/sdk/tracker.js" data-site-id="YOUR_SITE_ID" async></script>
```

## 参数说明

| 属性 | 必填 | 说明 |
|------|------|------|
| `data-site-id` | 是 | 网站唯一标识，在管理后台创建网站后获得 |
| `src` | 是 | SDK 文件地址，指向你的服务器 |
| `async` | 推荐 | 异步加载，不阻塞页面渲染 |

## 采集的数据

### 爬虫识别
SDK 会自动检测访问者的 User-Agent，识别以下爬虫：
- **AI 爬虫**: GPTBot, ClaudeBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, anthropic-ai
- **搜索引擎**: Googlebot, Bingbot, Baiduspider, Applebot, Amazonbot
- **国内爬虫**: Bytespider, YisouSpider, SogouSpider, 360Spider, PetalBot, ChatGLM-Spider
- **其他**: CCBot, FacebookBot, cohere-ai, GenericBot

### 人类访客数据
- 页面浏览（PV/UV）
- 设备类型（Desktop/Mobile/Tablet）
- 操作系统、浏览器
- 屏幕分辨率、语言
- 来源页面（Referrer）
- 页面停留时间
- 滚动深度

### 网络请求
- 拦截 `fetch` 和 `XMLHttpRequest` 请求
- 记录 `Performance API` 的资源加载数据
- 包含请求 URL、状态码、响应时间

## 隐私合规

SDK 不采集以下数据：
- POST 请求体
- 敏感 Header（Cookie, Authorization）
- 个人身份信息

访客通过匿名 UUID 标识，存储在 `sessionStorage` 中。

## 自托管

将 `sdk/tracker.js` 部署到你的服务器，确保：
1. 文件可通过 HTTPS 访问
2. CORS 允许目标网站域名
3. `/api/collect` 端点可接收 POST 请求
