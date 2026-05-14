# CLI 命令参考

OriginMonitor CLI 提供命令行方式访问监控数据。

## 安装

```bash
# 全局安装（可选）
npm link

# 或直接运行
node cli/index.js <command>
```

## 通用选项

| 选项 | 说明 |
|------|------|
| `--json` | 输出 JSON 格式（默认为表格） |
| `--hours N` | 回溯时间窗口（小时） |
| `--days N` | 回溯时间窗口（天） |
| `--minutes N` | 时间窗口（分钟） |
| `--limit N` | 最大返回数量 |
| `--all` | 显示全部结果 |

## 命令

### sites

```bash
# 列出所有网站
origin-monitor sites list

# 创建网站
origin-monitor sites create "My Blog" --domain example.com

# 删除网站
origin-monitor sites delete <site-id>
```

### overview

```bash
# 查看概览（默认 24 小时）
origin-monitor overview <site-id>

# 指定时间窗口
origin-monitor overview <site-id> --hours 168

# JSON 输出
origin-monitor overview <site-id> --json
```

### trend

```bash
# 查看趋势（默认 30 天）
origin-monitor trend <site-id>

# 指定天数
origin-monitor trend <site-id> --days 7
```

### bots

```bash
# 查看爬虫排名
origin-monitor bots <site-id>

# JSON 输出
origin-monitor bots <site-id> --json
```

### pages

```bash
# 查看页面排名
origin-monitor pages <site-id>

# 显示全部页面
origin-monitor pages <site-id> --all

# 限制数量
origin-monitor pages <site-id> --limit 50
```

### realtime

```bash
# 查看实时爬虫活动
origin-monitor realtime <site-id>

# 指定时间窗口
origin-monitor realtime <site-id> --minutes 10
```

### visitors

```bash
# 查看访客统计
origin-monitor visitors <site-id>
```

### devices

```bash
# 查看设备分布
origin-monitor devices <site-id>
```

### referrers

```bash
# 查看流量来源
origin-monitor referrers <site-id>
```

### performance

```bash
# 查看性能指标
origin-monitor performance <site-id>
```

### sitemap

```bash
# 分析 sitemap
origin-monitor sitemap <site-id> example.com

# 指定时间窗口
origin-monitor sitemap <site-id> example.com --hours 720
```

### health

```bash
# 健康检查
origin-monitor health
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MONITOR_DB_PATH` | `server/data/monitor.db` | SQLite 数据库路径 |
