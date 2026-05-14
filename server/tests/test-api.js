#!/usr/bin/env node
/**
 * Monitor API 测试用例
 * 运行: node tests/test-api.js
 */

const http = require('http');
const sitemapHelpers = require('../routes/sitemap')._private;

const BASE = 'http://localhost:3000';
let siteId = '';
let passed = 0;
let failed = 0;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function assert(name, condition, detail) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

function testSitemapHelpers() {
  console.log('\n[0] Sitemap / 页面更新时间辅助逻辑');

  const sitemapXml = [
    '<urlset>',
    '  <url><loc>https://example.com/a</loc><lastmod>2026-05-14T10:00:00+08:00</lastmod></url>',
    '  <url><loc>https://example.com/b</loc></url>',
    '</urlset>'
  ].join('');
  const entries = sitemapHelpers.parseSitemapEntries(sitemapXml);
  assert('可解析 sitemap url 条目', entries.length === 2, `got ${entries.length}`);
  assert('可读取 sitemap lastmod', entries[0].lastmod === '2026-05-14T10:00:00+08:00', `got ${entries[0].lastmod}`);

  const normalized = sitemapHelpers.normalizeUpdatedValue('2026-05-14T10:00:00+08:00');
  assert('可标准化更新时间', normalized.ts !== null, `got ${normalized.ts}`);

  const htmlMeta = '<html><head><meta property="article:modified_time" content="2026-05-14T09:30:00+08:00"></head></html>';
  assert(
    '可从 HTML meta 提取更新时间',
    sitemapHelpers.extractUpdatedFromHtml(htmlMeta) === '2026-05-14T09:30:00+08:00',
    `got ${sitemapHelpers.extractUpdatedFromHtml(htmlMeta)}`
  );

  const htmlJsonLd = '<script type="application/ld+json">{"dateModified":"2026-05-13T18:00:00+08:00"}</script>';
  assert(
    '可从 JSON-LD 提取更新时间',
    sitemapHelpers.extractUpdatedFromHtml(htmlJsonLd) === '2026-05-13T18:00:00+08:00',
    `got ${sitemapHelpers.extractUpdatedFromHtml(htmlJsonLd)}`
  );
}

async function testSites() {
  console.log('\n[1] POST /api/sites — 创建网站');
  const res = await request('POST', '/api/sites', { name: '测试站', domain: 'test.com' });
  assert('状态码 200', res.status === 200, `got ${res.status}`);
  assert('返回 success', res.body.success === true);
  assert('返回 site_id', typeof res.body.site_id === 'string' && res.body.site_id.length > 0);
  siteId = res.body.site_id;

  console.log('\n[2] GET /api/sites — 网站列表');
  const list = await request('GET', '/api/sites');
  assert('状态码 200', list.status === 200);
  assert('返回数据数组', Array.isArray(list.body.data));
  assert('包含刚创建的网站', list.body.data.some(s => s.id === siteId));

  console.log('\n[3] GET /api/sites/:id — 网站详情');
  const detail = await request('GET', `/api/sites/${siteId}`);
  assert('状态码 200', detail.status === 200);
  assert('名称正确', detail.body.data.name === '测试站');
}

async function testSiteDelete() {
  // 创建一个临时站点用于删除测试
  console.log('\n[21] POST /api/sites — 创建临时站点（删除测试）');
  const create = await request('POST', '/api/sites', { name: '待删除站', domain: 'delete-me.com' });
  assert('状态码 200', create.status === 200);
  assert('返回 site_id', typeof create.body.site_id === 'string');
  const tmpId = create.body.site_id;

  console.log('\n[22] DELETE /api/sites/:id — 删除站点');
  const del = await request('DELETE', `/api/sites/${tmpId}`);
  assert('状态码 200', del.status === 200);
  assert('返回 success', del.body.success === true);

  console.log('\n[23] GET /api/sites/:id — 删除后查询返回 404');
  const check = await request('GET', `/api/sites/${tmpId}`);
  assert('状态码 404', check.status === 404);

  console.log('\n[24] DELETE /api/sites/:id — 删除不存在的站点');
  const delBad = await request('DELETE', '/api/sites/non-existent-id');
  assert('状态码 404', delBad.status === 404);
}

async function testCollect() {
  console.log('\n[4] POST /api/collect — 缺少 site_id');
  const noId = await request('POST', '/api/collect', { page_url: '/' });
  assert('返回 400', noId.status === 400);

  console.log('\n[5] POST /api/collect — 无效 site_id');
  const badId = await request('POST', '/api/collect', { site_id: 'fake-uuid', page_url: '/' });
  assert('返回 404', badId.status === 404);

  console.log('\n[6] POST /api/collect — 人类访客');
  const human = await request('POST', '/api/collect', {
    site_id: siteId,
    ts: Math.floor(Date.now() / 1000),
    page_url: '/blog/test',
    ref: 'https://google.com',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/120.0',
    visitor: {
      id: 'test-v-1', screen: '1920x1080', device: 'desktop',
      os: 'macOS', browser: 'Chrome', language: 'zh-CN',
      scroll_depth: 80, stay_time: 10000,
    },
    events: [{ url: '/api/data', method: 'GET', status: 200, duration: 50, type: 'fetch' }],
  });
  assert('返回 success', human.body.success === true);

  console.log('\n[7] POST /api/collect — GPTBot 爬虫');
  const bot1 = await request('POST', '/api/collect', {
    site_id: siteId,
    ts: Math.floor(Date.now() / 1000),
    page_url: '/blog/test',
    ua: 'Mozilla/5.0 (compatible; GPTBot/1.0)',
    events: [],
  });
  assert('返回 success', bot1.body.success === true);

  console.log('\n[8] POST /api/collect — ClaudeBot');
  const bot2 = await request('POST', '/api/collect', {
    site_id: siteId,
    ts: Math.floor(Date.now() / 1000),
    page_url: '/blog/ai-tools',
    ua: 'ClaudeBot/1.0',
    events: [],
  });
  assert('返回 success', bot2.body.success === true);

  console.log('\n[9] POST /api/collect — Googlebot');
  const bot3 = await request('POST', '/api/collect', {
    site_id: siteId,
    ts: Math.floor(Date.now() / 1000),
    page_url: '/',
    ua: 'Googlebot/2.1',
    events: [],
  });
  assert('返回 success', bot3.body.success === true);

  console.log('\n[10] POST /api/collect — Bytespider');
  const bot4 = await request('POST', '/api/collect', {
    site_id: siteId,
    ts: Math.floor(Date.now() / 1000),
    page_url: '/blog/test',
    ua: 'Mozilla/5.0 (compatible; Bytespider/1.0)',
    events: [],
  });
  assert('返回 success', bot4.body.success === true);
}

async function testDashboard() {
  console.log('\n[11] GET /api/dashboard/overview');
  const ov = await request('GET', `/api/dashboard/overview?site_id=${siteId}&hours=24`);
  assert('状态码 200', ov.status === 200);
  assert('total_pv = 5', ov.body.data.total_pv === 5, `got ${ov.body.data.total_pv}`);
  assert('bot_pv = 4', ov.body.data.bot_pv === 4, `got ${ov.body.data.bot_pv}`);
  assert('human_pv = 1', ov.body.data.human_pv === 1, `got ${ov.body.data.human_pv}`);
  assert('uv >= 1', ov.body.data.uv >= 1, `got ${ov.body.data.uv}`);

  console.log('\n[12] GET /api/dashboard/bots');
  const bots = await request('GET', `/api/dashboard/bots?site_id=${siteId}&hours=24`);
  assert('状态码 200', bots.status === 200);
  assert('有爬虫数据', bots.body.data.length > 0);
  assert('包含 GPTBot', bots.body.data.some(b => b.bot_name === 'GPTBot'));
  assert('包含 ClaudeBot', bots.body.data.some(b => b.bot_name === 'ClaudeBot'));
  assert('包含 Googlebot', bots.body.data.some(b => b.bot_name === 'Googlebot'));

  console.log('\n[13] GET /api/dashboard/pages');
  const pages = await request('GET', `/api/dashboard/pages?site_id=${siteId}&hours=24`);
  assert('状态码 200', pages.status === 200);
  assert('有页面数据', pages.body.data.length > 0);
  assert('首页在排名中', pages.body.data.some(p => p.page_url === '/'));

  console.log('\n[14] GET /api/dashboard/realtime');
  const rt = await request('GET', `/api/dashboard/realtime?site_id=${siteId}&minutes=5`);
  assert('状态码 200', rt.status === 200);
  assert('有实时数据', rt.body.data.length > 0);

  console.log('\n[15] GET /api/dashboard/trend');
  const trend = await request('GET', `/api/dashboard/trend?site_id=${siteId}&days=7`);
  assert('状态码 200', trend.status === 200);
  assert('有趋势数据', trend.body.data.length > 0);

  console.log('\n[16] GET /api/dashboard/visitors');
  const visitors = await request('GET', `/api/dashboard/visitors?site_id=${siteId}&hours=24`);
  assert('状态码 200', visitors.status === 200);
  assert('有访客概览', visitors.body.data.overview !== undefined);
  assert('pv >= 1', visitors.body.data.overview.pv >= 1);

  console.log('\n[17] GET /api/dashboard/referrers');
  const refs = await request('GET', `/api/dashboard/referrers?site_id=${siteId}&hours=24`);
  assert('状态码 200', refs.status === 200);

  console.log('\n[18] GET /api/dashboard/devices');
  const devs = await request('GET', `/api/dashboard/devices?site_id=${siteId}&hours=24`);
  assert('状态码 200', devs.status === 200);
  assert('有设备数据', devs.body.data.devices.length > 0);
  assert('desktop 存在', devs.body.data.devices.some(d => d.device === 'desktop'));

  console.log('\n[19] GET /api/dashboard/performance');
  const perf = await request('GET', `/api/dashboard/performance?site_id=${siteId}&hours=24`);
  assert('状态码 200', perf.status === 200);

  console.log('\n[20] GET /healthz');
  const health = await request('GET', '/healthz');
  assert('状态码 200', health.status === 200);
  assert('status = ok', health.body.status === 'ok');

  console.log('\n[25] GET /api/sitemap/analyze — 不可达域名优雅降级');
  const sitemapFail = await request('GET', `/api/sitemap/analyze?site_id=${siteId}&domain=test.invalid&hours=24`);
  assert('状态码 200', sitemapFail.status === 200, `got ${sitemapFail.status}`);
  assert('success = false', sitemapFail.body.success === false, `got ${sitemapFail.body.success}`);
  assert('返回空 data', Array.isArray(sitemapFail.body.data) && sitemapFail.body.data.length === 0);
  assert('返回错误说明', typeof sitemapFail.body.error === 'string' && sitemapFail.body.error.length > 0);
}

async function run() {
  console.log('=== Monitor API 测试 ===\n');

  try {
    testSitemapHelpers();
    await testSites();
    await testSiteDelete();
    await testCollect();
    // 等一下让数据写入
    await new Promise(r => setTimeout(r, 200));
    await testDashboard();
  } catch (err) {
    console.error('\n测试异常:', err.message);
    failed++;
  }

  console.log(`\n=== 结果: ${passed} 通过, ${failed} 失败 ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
