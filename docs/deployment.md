# 部署指南

这份文档覆盖两类真实部署场景：

1. 把当前监控服务本身部署到服务器。
2. 把 SDK 接到另一个已经在线的应用域名上，让外部应用把数据写入当前监控服务。

如果只按旧版文档把 `server/` 传上去，很多情况下会“看起来服务在线”，但实际上：

- `better-sqlite3` 会因为平台不一致直接报 `invalid ELF header`
- 外部应用会把 `/api/collect` 打到自己站内，而不是打到监控服务
- `tracker.js` 返回 200，但并没有写入当前监控数据库

下面这份是可以直接照着执行的版本。

## 1. 监控服务部署目标

默认约定：

- 监控服务服务器：`YOUR_MONITOR_SERVER_IP`
- 项目路径：`/opt/monitor/`
- Node 进程：`pm2` 中的 `monitor`
- Nginx 反代 Node：`127.0.0.1:3000`

部署成功后，应至少有这些地址：

- 看板：`http://YOUR_MONITOR_SERVER_IP/index.html`
- API：`http://YOUR_MONITOR_SERVER_IP/api/`
- SDK：`http://YOUR_MONITOR_SERVER_IP/sdk/tracker.js`
- 健康检查：`http://YOUR_MONITOR_SERVER_IP/healthz`

## 2. 监控服务标准部署

### 2.1 上传文件

```bash
# 上传源码（不要上传本地 node_modules / data）
rsync -av --delete --exclude node_modules --exclude data "server/" root@YOUR_MONITOR_SERVER_IP:/opt/monitor/server/
rsync -av --delete --exclude node_modules "shared/" root@YOUR_MONITOR_SERVER_IP:/opt/monitor/shared/
scp frontend/index.html root@YOUR_MONITOR_SERVER_IP:/opt/monitor/frontend/
scp sdk/tracker.js root@YOUR_MONITOR_SERVER_IP:/opt/monitor/sdk/
scp package.json root@YOUR_MONITOR_SERVER_IP:/opt/monitor/
```

### 2.2 服务器本机安装依赖并重启

```bash
ssh root@YOUR_MONITOR_SERVER_IP "
  cd /opt/monitor &&
  npm install --production &&
  cd server &&
  npm install --production &&
  npm rebuild better-sqlite3 --build-from-source &&
  pm2 restart monitor &&
  pm2 status
"
```

### 2.3 为什么一定要 `npm rebuild better-sqlite3`

`better-sqlite3` 是原生模块。

如果你把本地 `node_modules` 或本地构建产物带到 Linux 服务器，最典型的报错就是：

```text
better_sqlite3.node: invalid ELF header
```

这时不要只看 `pm2 status` 里的 `online`，要看日志。很多情况下：

- 健康检查 `GET /healthz` 仍然是 200
- 但任何真正读库的接口都会异常

### 2.4 部署后必须执行的服务检查

```bash
ssh root@YOUR_MONITOR_SERVER_IP "
  pm2 status &&
  pm2 logs monitor --lines 100 --nostream &&
  systemctl status nginx --no-pager &&
  nginx -t
"
```

## 3. 外部应用接入 SDK

这是最容易踩坑的一段。

### 3.1 场景 A：外部应用直接使用监控服务域名

这是最简单、最推荐的方式。

```html
<script
  src="https://MONITOR_DOMAIN/sdk/tracker.js"
  data-site-id="YOUR_SITE_ID"
  data-api-url="https://MONITOR_DOMAIN/api/collect"
  async>
</script>
```

优点：

- 请求路径清晰
- 不依赖外部应用服务器的代理配置
- 最容易排查

### 3.2 场景 B：外部应用必须保持同域名

如果外部应用页面必须继续使用自己域名下的 `/sdk/tracker.js` 和 `/api/collect`，那就不能只改前端模板，必须在外部应用所在服务器上做代理。

也就是说：

- `https://APP_DOMAIN/sdk/tracker.js` 要代理到监控服务
- `https://APP_DOMAIN/api/collect` 要代理到监控服务

否则会出现一种假正常：

- 页面里确实有 SDK
- 浏览器里 `POST /api/collect` 也是 200
- 但数据写进的是外部应用自己的库，或者只是被它本地接口吞掉
- 当前监控服务看板没有任何新增事件

### 3.3 外部应用 Nginx 代理示例

```nginx
server {
    listen 443 ssl;
    server_name APP_DOMAIN;

    # 先把 SDK 和 collect 单独代理到监控服务
    location /sdk/ {
        proxy_pass http://YOUR_MONITOR_SERVER_IP;
        proxy_set_header Host YOUR_MONITOR_SERVER_IP;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /api/collect {
        proxy_pass http://YOUR_MONITOR_SERVER_IP/api/collect;
        proxy_set_header Host YOUR_MONITOR_SERVER_IP;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 其他请求继续走外部应用自身
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

应用后记得：

```bash
nginx -t && nginx -s reload
```

## 4. 监控服务 Nginx 配置

配置文件示例：`/etc/nginx/conf.d/monitor.conf`

```nginx
server {
    listen 80;
    server_name YOUR_MONITOR_SERVER_IP;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /sdk/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "public, max-age=3600";
    }

    location = /api/collect {
        proxy_pass http://127.0.0.1:3000/api/collect;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type";
        if ($request_method = OPTIONS) {
            return 204;
        }
    }
}
```

## 5. 部署后验证清单

### 5.1 验证监控服务本身

```bash
curl http://YOUR_MONITOR_SERVER_IP/healthz
curl http://YOUR_MONITOR_SERVER_IP/api/sites
curl http://YOUR_MONITOR_SERVER_IP/index.html
curl http://YOUR_MONITOR_SERVER_IP/sdk/tracker.js
```

至少要确认：

- `healthz` 返回 200
- `api/sites` 能正常读库
- 公网 `index.html` 是新版本
- 公网 `sdk/tracker.js` 是新版本

### 5.2 验证 `tracker.js` 版本

不要只看返回 200，要检查是不是你刚部署的版本。

这次实战里，最有效的验证点是：

- 新版应该包含 `data-api-url`
- 新版应该包含 `new URL('/api/collect', scriptTag.src)`
- 新版不应该再有 `replace(/[^/]*$/, 'api/collect')`

### 5.3 验证外部应用是否真正落库

这一步必须三段一起看：

1. 页面源码里确实有 SDK
2. 浏览器网络里确实发出了 `/api/collect`
3. 当前监控服务的数据库或 API 确实出现了最新事件

推荐用烟雾测试验证：

```bash
curl -X POST http://YOUR_MONITOR_SERVER_IP/api/collect \
  -H 'Content-Type: application/json' \
  -d '{
    "site_id": "YOUR_SITE_ID",
    "ts": 1779173613,
    "page_url": "/sdk-smoke-check",
    "ref": "",
    "ua": "Mozilla/5.0 SDKSmoke",
    "visitor": {
      "id": "smoke-test",
      "screen": "1440x900",
      "device": "desktop",
      "os": "macOS",
      "browser": "Chrome",
      "language": "zh-CN",
      "scroll_depth": 100,
      "stay_time": 1000
    },
    "events": []
  }'
```

然后立刻检查：

```bash
curl "http://YOUR_MONITOR_SERVER_IP/api/dashboard/active-visitors?site_id=YOUR_SITE_ID&minutes=30"
curl "http://YOUR_MONITOR_SERVER_IP/api/dashboard/pages?site_id=YOUR_SITE_ID&hours=1&limit=20"
```

如果浏览器网络里 `/api/collect` 返回 200，但这里没有任何新增事件，优先怀疑：

- 外部应用请求打到了自己本地服务
- 外部应用有另一套本地监控实现
- 同域名 `/api/collect` 没有代理到当前监控服务

## 6. 常用运维命令

```bash
# SSH 登录监控服务
ssh root@YOUR_MONITOR_SERVER_IP

# 查看 monitor 服务状态
pm2 status
pm2 logs monitor --lines 100 --nostream

# 重启 monitor
pm2 restart monitor

# 查看 Nginx 状态
systemctl status nginx
nginx -t
nginx -s reload
```

## 7. 安全与稳定性提醒

- 不要提交 `.env`、`node_modules`、`data/*.db`
- 不要把本地 `server/node_modules` 上传到 Linux 服务器
- 外部应用接入时，优先区分“返回 200”与“写入当前监控库”是不是同一回事
- 如果外部应用用了 CDN 或边缘缓存，要同时验证页面源码、静态 SDK 内容和数据库写入
- `Sitemap` 失败不应该把整站看板打坏，应允许前端回退到已有聚合数据
