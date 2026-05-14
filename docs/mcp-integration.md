# MCP 接入指南

MCP (Model Context Protocol) 是 AI 助手调用外部工具的标准协议。OriginMonitor 提供了 MCP Server，让 AI 助手可以直接查询监控数据。

## 快速配置

### Claude Desktop

编辑配置文件：

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "origin-monitor": {
      "command": "node",
      "args": ["/path/to/OriginMonitor/mcp/index.js"],
      "env": {
        "MONITOR_DB_PATH": "/path/to/OriginMonitor/server/data/monitor.db"
      }
    }
  }
}
```

### Claude Code

在项目目录的 `.claude/settings.json` 中添加：

```json
{
  "mcpServers": {
    "origin-monitor": {
      "command": "node",
      "args": ["./mcp/index.js"]
    }
  }
}
```

如果数据库在默认位置（`server/data/monitor.db`），不需要设置 `MONITOR_DB_PATH`。

## 可用工具

| 工具 | 描述 | 参数 |
|------|------|------|
| `list_sites` | 列出所有监控网站 | 无 |
| `get_site` | 获取网站详情 | `site_id` |
| `get_overview` | PV/UV 概览 | `site_id`, `hours?` |
| `get_trend` | 流量趋势 | `site_id`, `days?` |
| `get_bots` | 爬虫排名 | `site_id`, `hours?` |
| `get_pages` | 页面排名 | `site_id`, `hours?`, `limit?` |
| `get_realtime` | 实时爬虫活动 | `site_id`, `minutes?` |
| `get_visitors` | 访客统计 | `site_id`, `hours?` |
| `get_devices` | 设备分布 | `site_id`, `hours?` |
| `get_referrers` | 流量来源 | `site_id`, `hours?` |
| `get_performance` | 性能指标 | `site_id`, `hours?` |
| `analyze_sitemap` | Sitemap 分析 | `site_id`, `domain`, `hours?` |
| `create_site` | 创建网站 | `name`, `domain?` |
| `delete_site` | 删除网站 | `site_id` |

## 使用示例

配置完成后，可以直接向 AI 助手提问：

- "有哪些网站在被监控？"
- "最近 7 天的爬虫流量趋势如何？"
- "哪些页面被 AI 爬取得最多？"
- "查看站点 X 的 PV/UV 概览"
- "分析 example.com 的 sitemap"

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MONITOR_DB_PATH` | `server/data/monitor.db` | SQLite 数据库路径 |
