# OriginMonitor MCP Server

MCP (Model Context Protocol) server for OriginMonitor. Allows AI assistants to query monitoring data directly.

## Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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

Add to `.claude/settings.json`:

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

If the database is in the default location (`server/data/monitor.db`), no `MONITOR_DB_PATH` is needed.

## Available Tools

| Tool | Description |
|------|-------------|
| `list_sites` | List all monitored websites |
| `get_site` | Get website details by ID |
| `get_overview` | PV/UV overview stats |
| `get_trend` | Daily traffic trend (bot vs human) |
| `get_bots` | Bot ranking by visit count |
| `get_pages` | Page ranking by traffic |
| `get_realtime` | Live bot activity |
| `get_visitors` | Human visitor analytics |
| `get_devices` | Device/OS/browser distribution |
| `get_referrers` | Traffic source ranking |
| `get_performance` | Performance metrics |
| `analyze_sitemap` | Sitemap vs crawl data analysis |
| `create_site` | Create a new monitored website |
| `delete_site` | Delete a website and all its data |

## Example Usage

Once configured, you can ask your AI assistant:

- "What sites are being monitored?"
- "Show me the bot traffic for the last 7 days"
- "Which pages are being crawled most by AI bots?"
- "What's the PV/UV overview for site X?"
- "Analyze the sitemap for example.com"
