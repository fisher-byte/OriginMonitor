# 部署指南

## 腾讯云部署（已完成）

**服务器信息：**
- IP：`YOUR_SERVER_IP`
- 系统：Linux (x86_64)
- 项目路径：`/opt/monitor/`

### 当前部署状态

- [x] Node.js v20.18.0 已安装
- [x] PM2 进程管理已配置
- [x] Nginx 反向代理已配置
- [x] 开机自启动已启用
- [x] 53 个测试全部通过

### 访问地址

- 看板：http://YOUR_SERVER_IP/index.html
- API：http://YOUR_SERVER_IP/api/
- SDK：http://YOUR_SERVER_IP/sdk/tracker.js
- 健康检查：http://YOUR_SERVER_IP/healthz

### SDK 接入示例

```html
<script src="http://YOUR_SERVER_IP/sdk/tracker.js" data-site-id="YOUR_SITE_ID" async></script>
```

### 常用运维命令

```bash
# SSH 登录
ssh root@YOUR_SERVER_IP

# 查看服务状态
pm2 status

# 查看日志
pm2 logs monitor

# 重启服务
pm2 restart monitor

# 查看 Nginx 状态
systemctl status nginx

# 重载 Nginx 配置
nginx -t && nginx -s reload
```

### 更新部署

```bash
# 上传源码（排除本地 node_modules / data）
rsync -av --delete --exclude node_modules --exclude data "server/" root@YOUR_SERVER_IP:/opt/monitor/server/
scp sdk/tracker.js root@YOUR_SERVER_IP:/opt/monitor/sdk/
scp frontend/index.html root@YOUR_SERVER_IP:/opt/monitor/frontend/

# 服务器安装依赖并重启
ssh root@YOUR_SERVER_IP "cd /opt/monitor/server && npm install --production && pm2 restart monitor"
```

**重要：**
- 不要把本地 `server/node_modules` 直接传到服务器
- `better-sqlite3` 这类原生模块需要在服务器本机重新安装/重编译
- 如果误传导致报错 `invalid ELF header`，执行：

```bash
ssh root@YOUR_SERVER_IP "cd /opt/monitor/server && npm rebuild better-sqlite3 --build-from-source && pm2 restart monitor"
```

### 安全注意事项

- Sitemap API 已添加 SSRF 防护（禁止 IP、内网地址、响应体限制）
- 网站创建接口已添加输入长度验证
- SDK 数据上报 CORS 开放，看板 API 限制来源
- 后续建议：添加 API Key 认证、域名白名单

### Nginx 配置

配置文件：`/etc/nginx/conf.d/monitor.conf`

```nginx
server {
    listen 80;
    server_name YOUR_SERVER_IP;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /sdk/ {
        proxy_pass http://127.0.0.1:3000;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "public, max-age=3600";
    }

    location /api/collect {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header X-Real-IP $remote_addr;
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type";
        if ($request_method = OPTIONS) {
            return 204;
        }
    }
}
```

## 配置域名（可选）

如果有域名，可以配置 HTTPS：

```bash
# 安装 certbot
yum install certbot python3-certbot-nginx

# 申请证书
certbot --nginx -d monitor.your-domain.com

# 自动续期
echo "0 0,12 * * * root certbot renew --quiet" >> /etc/crontab
```

## 防火墙

确保开放端口：
- 80 (HTTP)
- 443 (HTTPS)
