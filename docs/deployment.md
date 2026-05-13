# 部署指南

## 腾讯云部署（已完成）

**服务器信息：**
- IP：`139.199.73.159`
- 内网：`172.16.0.10`
- 系统：TencentOS Server 4.4 (x86_64)
- 项目路径：`/opt/monitor/`

### 当前部署状态

- [x] Node.js v20.18.0 已安装
- [x] PM2 进程管理已配置
- [x] Nginx 反向代理已配置
- [x] 开机自启动已启用
- [x] 42 个 API 测试全部通过

### 访问地址

- 看板：http://139.199.73.159/index.html
- API：http://139.199.73.159/api/
- SDK：http://139.199.73.159/sdk/tracker.js
- 健康检查：http://139.199.73.159/healthz

### SDK 接入示例

```html
<script src="http://139.199.73.159/sdk/tracker.js" data-site-id="YOUR_SITE_ID" async></script>
```

### 常用运维命令

```bash
# SSH 登录
ssh root@139.199.73.159

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
# 本地打包上传
scp -r server/ root@139.199.73.159:/opt/monitor/
scp sdk/tracker.js root@139.199.73.159:/opt/monitor/sdk/
scp frontend/index.html root@139.199.73.159:/opt/monitor/frontend/

# 服务器重启
ssh root@139.199.73.159 "cd /opt/monitor/server && pm2 restart monitor"
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
    server_name 139.199.73.159;

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
