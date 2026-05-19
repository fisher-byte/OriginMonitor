# 代码更新与部署 SOP

这份 SOP 的目标不是“描述一个大概流程”，而是让别的应用团队拿过去也能直接执行。

适用场景：

1. 当前监控服务代码更新并重新部署。
2. 另一个外部应用接入当前监控 SDK。

## 一、上线前工作清单

每次开始前，先确认这 6 件事：

1. 当前改动范围是否清楚，是否只做增量修改。
2. 本地测试是否已经覆盖本次改动。
3. 是否涉及 SDK、Nginx、数据库或原生依赖。
4. 是否涉及外部应用同域代理。
5. 是否包含敏感信息，是否会进入公开仓库。
6. 是否准备好部署后的验证路径。

## 二、本地修改完成后的标准动作

### 1. 运行测试

```bash
cd server
node tests/test-api.js
```

要求：

- 所有测试必须通过
- 新增接口或关键逻辑时，补对应测试
- 测试站点数据要能自动清理，避免污染本地看板

### 2. 更新文档

按变更类型更新文档：

| 变更类型 | 需要更新的文档 |
|---------|--------------|
| API / 数据结构变化 | `docs/api-reference.md` |
| 功能修复/行为变化 | `docs/changelog.md` |
| 部署/运维经验变化 | `docs/deployment.md` |
| 实战经验/踩坑总结 | `docs/experience.md` |
| SDK 接入方式变化 | `docs/sdk-setup-guide.md` |

### 3. 本地自查

上线前至少确认这几个点：

- 公网 SDK 地址推导逻辑是否正确
- 最近 30 分钟、UV、页面更新时间等关键指标是否符合业务语义
- 文案是否区分“无数据”和“未上报”
- 站内功能和站外接入链路都没有被误伤

## 三、代码提交

```bash
git add -A
git commit -m "类型: 简要描述"
git push origin main
```

Commit 类型：

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具

## 四、监控服务部署 SOP

### 1. 上传代码

```bash
rsync -av --delete --exclude node_modules --exclude data "server/" root@YOUR_MONITOR_SERVER_IP:/opt/monitor/server/
rsync -av --delete --exclude node_modules "shared/" root@YOUR_MONITOR_SERVER_IP:/opt/monitor/shared/
scp frontend/index.html root@YOUR_MONITOR_SERVER_IP:/opt/monitor/frontend/
scp sdk/tracker.js root@YOUR_MONITOR_SERVER_IP:/opt/monitor/sdk/
scp package.json root@YOUR_MONITOR_SERVER_IP:/opt/monitor/
```

### 2. 服务器安装依赖并重启

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

这是本次补齐的关键缺口：

- `npm install` 不等于原生模块一定可用
- `better-sqlite3` 必须在目标服务器本机完成重建
- 否则很容易出现 `invalid ELF header`

### 3. 服务体检

```bash
ssh root@YOUR_MONITOR_SERVER_IP "
  pm2 status &&
  pm2 logs monitor --lines 100 --nostream &&
  systemctl status nginx --no-pager &&
  nginx -t
"
```

## 五、外部应用接入 SOP

### 场景判断

先判断外部应用属于哪种接入方式：

1. **直接指向监控域名**
2. **必须保持外部应用同域名**

### 方案 A：直接指向监控域名

页面直接插入：

```html
<script
  src="https://MONITOR_DOMAIN/sdk/tracker.js"
  data-site-id="YOUR_SITE_ID"
  data-api-url="https://MONITOR_DOMAIN/api/collect"
  async>
</script>
```

### 方案 B：保持同域名

如果页面里继续使用：

- `https://APP_DOMAIN/sdk/tracker.js`
- `https://APP_DOMAIN/api/collect`

那么必须在外部应用的 Nginx 上做代理，把这两个路径转发到监控服务。

这一步绝不能漏。

否则会出现：

- 页面正常
- 请求 200
- 但数据没有进入当前监控数据库

## 六、部署后验证 SOP

### 1. 先验监控服务本身

```bash
curl http://YOUR_MONITOR_SERVER_IP/healthz
curl http://YOUR_MONITOR_SERVER_IP/api/sites
curl http://YOUR_MONITOR_SERVER_IP/index.html
curl http://YOUR_MONITOR_SERVER_IP/sdk/tracker.js
```

### 2. 再验 SDK 是否是新版本

至少确认：

- 包含 `data-api-url`
- 包含 `new URL('/api/collect', scriptTag.src)`
- 不再包含旧的 `replace(/[^/]*$/, 'api/collect')`

### 3. 最后验“是否真正落库”

不要只看浏览器 200。

要同时验证：

1. 页面已加载 SDK
2. 网络请求确实发出
3. 当前监控服务接口能读到新增事件

推荐检查：

```bash
curl "http://YOUR_MONITOR_SERVER_IP/api/dashboard/active-visitors?site_id=YOUR_SITE_ID&minutes=30"
curl "http://YOUR_MONITOR_SERVER_IP/api/dashboard/pages?site_id=YOUR_SITE_ID&hours=1&limit=20"
```

### 4. 打开前端人工确认

重点看：

- 测试站是否已清理
- UV 是否正常
- 最近 30 分钟活跃是否正常
- 趋势图标签是否完整
- 页面更新时间是否符合内容时间，而不是抓取时间

## 七、异常处理 SOP

### 1. `invalid ELF header`

处理方式：

```bash
ssh root@YOUR_MONITOR_SERVER_IP "
  cd /opt/monitor/server &&
  npm rebuild better-sqlite3 --build-from-source &&
  pm2 restart monitor
"
```

### 2. `/api/collect` 返回 200 但看板没数据

按顺序排查：

1. 外部应用是否把 `/api/collect` 打到了自己服务
2. Nginx 是否把 `/api/collect` 代理到监控服务
3. `site_id` 是否正确
4. 当前监控服务数据库是否有新增事件

### 3. 外部应用页面已经插 SDK，但 tracker 不是新版本

优先排查：

1. 外部应用 Nginx 是否仍在返回旧静态文件
2. CDN/浏览器缓存是否未刷新
3. 代理配置是否漏了 `/sdk/`

## 八、注意事项

- 不要提交 `.env`、`node_modules`、`data/*.db`
- 敏感信息（密码、IP、私钥）不要写进公开仓库
- 不要把“接口 200”误判成“数据已进入正确数据库”
- 不要把本地 `node_modules` 直接上传到 Linux 服务器
- 每次部署后都要做一次站内与站外双向验证
