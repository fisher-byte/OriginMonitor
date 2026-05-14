<p align="center">
  <img src="https://img.shields.io/badge/OriginMonitor-v1.1-D97706?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI4IiBmaWxsPSIjRDk3NzA2Ii8+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iOCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyLjUiIGZpbGw9Im5vbmUiLz48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIzIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" />
</p>

<h1 align="center">OriginMonitor</h1>
<p align="center" style="color:#6B7280;font-size:1.1rem;">AI-native website monitoring: crawler tracking + visitor analytics</p>

<p align="center">
  <strong>Track which AI bots are crawling your site, what pages they index, and how your human traffic compares.<br>
  Access data via REST API, MCP Server, or CLI.</strong>
</p>

---

## What it does

OriginMonitor is a lightweight analytics platform that helps you understand how AI systems interact with your website:

- **AI Crawler Detection** — Identifies 22+ known AI/search bots (GPTBot, ClaudeBot, Googlebot, PerplexityBot, Bytespider...)
- **Daily Trend Analysis** — See how AI crawl traffic changes day by day, broken down by bot family
- **Page-level Insights** — Know exactly which pages AI bots are indexing most
- **Sitemap Cross-reference** — Fetch your sitemap.xml and see which pages have been crawled by AI
- **Real-time Feed** — Watch bot activity happen live on your site
- **Visitor Analytics** — Standard PV/UV, device, referrer, and engagement metrics
- **AI-Native Access** — MCP Server for AI assistants, CLI for terminal, REST API for everything else
- **API Key Auth** — Optional authentication for dashboard APIs

## Quick Start

### 1. Start the server

```bash
cd server
npm install
npm start
# Server runs at http://localhost:3000
```

### 2. Add a site

Open `http://localhost:3000` and click **+ Add Site**, or use the API:

```bash
curl -X POST http://localhost:3000/api/sites \
  -H "Content-Type: application/json" \
  -d '{"name": "My Blog", "domain": "myblog.com"}'
```

### 3. Embed the SDK

Add one line to your website's `<head>`:

```html
<script src="http://your-server:3000/sdk/tracker.js" data-site-id="YOUR_SITE_ID" async></script>
```

That's it. The SDK automatically:
- Tracks page views with visitor fingerprinting
- Captures scroll depth and stay time
- Intercepts fetch/XHR requests for performance data
- Reports data via `sendBeacon` (zero impact on page load)

### 4. View the dashboard

Open `http://localhost:3000` to see your analytics.

## Architecture

```
OriginMonitor/
├── sdk/tracker.js              # Client SDK (< 5KB, zero dependencies)
├── server/
│   ├── index.js                # Express entry point
│   ├── routes/
│   │   ├── collect.js          # POST /api/collect — SDK data ingestion
│   │   ├── dashboard.js        # GET /api/dashboard/* — Analytics queries
│   │   ├── sites.js            # CRUD /api/sites
│   │   └── sitemap.js          # GET /api/sitemap/analyze — Sitemap crawler
│   ├── lib/
│   │   └── sitemap-service.js  # Sitemap analysis (reusable)
│   ├── db/
│   │   ├── init.js             # SQLite connection manager
│   │   └── schema.sql          # Database schema
│   ├── utils/
│   │   └── bot-classify.js     # User-Agent bot detection (22+ patterns)
│   └── middleware/
│       ├── cors.js             # CORS configuration
│       └── auth.js             # API Key authentication
├── shared/
│   ├── db.js                   # Shared database module
│   └── queries.js              # Shared query functions
├── mcp/
│   ├── index.js                # MCP Server (14 tools for AI assistants)
│   └── README.md               # MCP configuration guide
├── cli/
│   ├── index.js                # CLI entry point
│   ├── commands.js             # Command definitions
│   └── formatters.js           # Output formatters
├── frontend/index.html         # Single-page dashboard (ECharts)
└── docs/                       # Documentation
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| SDK | Vanilla JS, `< 5KB`, no dependencies |
| Backend | Node.js + Express + better-sqlite3 |
| Database | SQLite (WAL mode, zero config) |
| Frontend | HTML + ECharts (CDN) |
| Deploy | PM2 + Nginx (or any Node hosting) |

## Bot Detection

Recognized AI/search crawlers:

| Family | Bots |
|--------|------|
| OpenAI | GPTBot, OAI-SearchBot, ChatGPT-User |
| Anthropic | ClaudeBot, anthropic-ai |
| Google | Googlebot, Google-Extended, GoogleOther |
| Perplexity | PerplexityBot |
| Microsoft | Bingbot |
| ByteDance | Bytespider |
| Apple | Applebot |
| Amazon | Amazonbot |
| Meta | FacebookBot |
| Baidu | Baiduspider |
| Huawei | PetalBot |
| Zhipu | ChatGLM-Spider |
| Cohere | cohere-ai |
| + Generic | Any UA matching bot/crawler/spider pattern |

## AI-Native Access

### MCP Server

Let AI assistants query monitoring data directly:

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

14 tools available: `list_sites`, `get_overview`, `get_trend`, `get_bots`, `get_pages`, `get_realtime`, `analyze_sitemap`, etc. See [MCP docs](docs/mcp-integration.md).

### CLI

```bash
origin-monitor sites list
origin-monitor overview <site-id> --hours 168
origin-monitor bots <site-id> --json
```

See [CLI docs](docs/cli-reference.md).

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/collect` | POST | SDK data ingestion |
| `/api/sites` | GET/POST | List or create sites |
| `/api/dashboard/overview` | GET | PV/UV summary |
| `/api/dashboard/trend` | GET | Daily bot/human traffic trend |
| `/api/dashboard/bots` | GET | Bot ranking by visits |
| `/api/dashboard/pages` | GET | Page ranking (bot + human) |
| `/api/dashboard/realtime` | GET | Live bot activity (last N minutes) |
| `/api/dashboard/visitors` | GET | Human visitor stats |
| `/api/dashboard/visitor-trend` | GET | Daily PV/UV trend |
| `/api/dashboard/devices` | GET | Device/OS/browser distribution |
| `/api/dashboard/referrers` | GET | Traffic source ranking |
| `/api/sitemap/analyze` | GET | Sitemap crawl analysis |
| `/healthz` | GET | Health check |

**Authentication:** Optional API Key via `API_KEY` env var. See [API docs](docs/api-reference.md).

## Deployment

```bash
# On your server
git clone <repo> && cd OriginMonitor/server
npm install --production

# PM2
pm2 start index.js --name origin-monitor
pm2 save

# Nginx reverse proxy
# proxy_pass http://127.0.0.1:3000;
```

## Documentation

- [SDK Integration Guide](docs/sdk-integration.md)
- [API Reference](docs/api-reference.md)
- [Deployment Guide](docs/deployment.md)
- [Architecture](docs/architecture.md)
- [Bot Database](docs/bot-database.md)
- [Changelog](docs/changelog.md)

## License

MIT
