#!/usr/bin/env node
/**
 * OriginMonitor MCP Server
 * Exposes monitoring data as MCP tools for AI assistants
 */
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../shared/db');
const queries = require('../shared/queries');
const { analyzeSitemap } = require('../server/lib/sitemap-service');

const DB_PATH = process.env.MONITOR_DB_PATH || undefined;

const server = new McpServer({
  name: 'origin-monitor',
  version: '2.0.0',
});

function db() {
  return getDb(DB_PATH);
}

// --- Tools ---

server.tool('list_sites', 'List all monitored websites', {}, async () => {
  const sites = queries.listSites(db());
  return { content: [{ type: 'text', text: JSON.stringify(sites, null, 2) }] };
});

server.tool('get_site', 'Get website details by ID', {
  site_id: z.string().describe('The site UUID'),
}, async ({ site_id }) => {
  const site = queries.getSite(db(), site_id);
  if (!site) return { content: [{ type: 'text', text: 'Site not found' }], isError: true };
  return { content: [{ type: 'text', text: JSON.stringify(site, null, 2) }] };
});

server.tool('get_overview', 'Get PV/UV overview stats for a site', {
  site_id: z.string().describe('The site UUID'),
  hours: z.number().optional().describe('Lookback window in hours (default: 24)'),
}, async ({ site_id, hours }) => {
  const stats = queries.getOverview(db(), site_id, hours || 24);
  return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] };
});

server.tool('get_trend', 'Get daily traffic trend (bot vs human)', {
  site_id: z.string().describe('The site UUID'),
  days: z.number().optional().describe('Number of days (default: 30)'),
}, async ({ site_id, days }) => {
  const data = queries.getTrend(db(), site_id, days || 30);
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});

server.tool('get_bots', 'Get bot ranking by visit count', {
  site_id: z.string().describe('The site UUID'),
  hours: z.number().optional().describe('Lookback window in hours (default: 168)'),
}, async ({ site_id, hours }) => {
  const data = queries.getBots(db(), site_id, hours || 168);
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});

server.tool('get_pages', 'Get page ranking by traffic', {
  site_id: z.string().describe('The site UUID'),
  hours: z.number().optional().describe('Lookback window in hours (default: 168)'),
  limit: z.number().optional().describe('Max results (0 for all, default: 20)'),
}, async ({ site_id, hours, limit }) => {
  const data = queries.getPages(db(), site_id, hours || 168, limit ?? 20);
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});

server.tool('get_realtime', 'Get live bot activity in the last N minutes', {
  site_id: z.string().describe('The site UUID'),
  minutes: z.number().optional().describe('Time window in minutes (default: 5)'),
}, async ({ site_id, minutes }) => {
  const data = queries.getRealtime(db(), site_id, minutes || 5);
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});

server.tool('get_visitors', 'Get human visitor analytics', {
  site_id: z.string().describe('The site UUID'),
  hours: z.number().optional().describe('Lookback window in hours (default: 24)'),
}, async ({ site_id, hours }) => {
  const data = queries.getVisitors(db(), site_id, hours || 24);
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});

server.tool('get_devices', 'Get device/OS/browser distribution', {
  site_id: z.string().describe('The site UUID'),
  hours: z.number().optional().describe('Lookback window in hours (default: 168)'),
}, async ({ site_id, hours }) => {
  const data = queries.getDevices(db(), site_id, hours || 168);
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});

server.tool('get_referrers', 'Get traffic source ranking', {
  site_id: z.string().describe('The site UUID'),
  hours: z.number().optional().describe('Lookback window in hours (default: 168)'),
}, async ({ site_id, hours }) => {
  const data = queries.getReferrers(db(), site_id, hours || 168);
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});

server.tool('get_performance', 'Get performance metrics (slowest resources)', {
  site_id: z.string().describe('The site UUID'),
  hours: z.number().optional().describe('Lookback window in hours (default: 168)'),
}, async ({ site_id, hours }) => {
  const data = queries.getPerformance(db(), site_id, hours || 168);
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});

server.tool('analyze_sitemap', 'Fetch sitemap.xml and cross-reference with crawl data', {
  site_id: z.string().describe('The site UUID'),
  domain: z.string().describe('Target domain without protocol (e.g. example.com)'),
  hours: z.number().optional().describe('Lookback window in hours (default: 720)'),
}, async ({ site_id, domain, hours }) => {
  try {
    const result = await analyzeSitemap(db(), site_id, domain, hours || 720);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
  }
});

server.tool('create_site', 'Create a new monitored website', {
  name: z.string().describe('Site name'),
  domain: z.string().optional().describe('Domain (e.g. example.com)'),
}, async ({ name, domain }) => {
  const id = uuidv4();
  queries.createSite(db(), id, name, domain || '');
  return { content: [{ type: 'text', text: JSON.stringify({ success: true, site_id: id, name, domain }) }] };
});

server.tool('delete_site', 'Delete a website and all its data', {
  site_id: z.string().describe('The site UUID'),
}, async ({ site_id }) => {
  const deleted = queries.deleteSite(db(), site_id);
  if (!deleted) return { content: [{ type: 'text', text: 'Site not found' }], isError: true };
  return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] };
});

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
