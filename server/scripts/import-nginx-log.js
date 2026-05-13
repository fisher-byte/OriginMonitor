#!/usr/bin/env node
/**
 * Nginx Access Log Importer
 *
 * Usage:
 *   node scripts/import-nginx-log.js <log-file-or-dir> [--site-name NAME] [--domain DOMAIN]
 *
 * Examples:
 *   node scripts/import-nginx-log.js /tmp/nginx-logs/
 *   node scripts/import-nginx-log.js /tmp/access.log --site-name "RadarAI" --domain radarai.top
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const Database = require('better-sqlite3');
const { classifyUserAgent } = require('../utils/bot-classify');

const DB_PATH = path.join(__dirname, '..', 'data', 'monitor.db');
const SITE_ID = 'a73b2ee2-9f23-49aa-93e3-edf64f854a77'; // radarai.top site ID

// Parse nginx combined log format
// 180.101.245.252 - - [13/May/2026:00:04:10 +0800] "GET / HTTP/1.1" 200 6175 "-" "Mozilla/5.0 ..."
const LOG_RE = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) \S+" (\d+) \d+ "([^"]*)" "([^"]*)"/;

function parseNginxDate(dateStr) {
  // 13/May/2026:00:04:10 +0800
  var months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  var parts = dateStr.match(/(\d+)\/(\w+)\/(\d+):(\d+):(\d+):(\d+)/);
  if (!parts) return Math.floor(Date.now() / 1000);
  var d = new Date(parseInt(parts[3]), months[parts[2]] || 0, parseInt(parts[1]), parseInt(parts[4]), parseInt(parts[5]), parseInt(parts[6]));
  return Math.floor(d.getTime() / 1000);
}

function parseLogFile(filePath) {
  var content;
  if (filePath.endsWith('.gz')) {
    var buf = fs.readFileSync(filePath);
    content = zlib.gunzipSync(buf).toString('utf8');
  } else {
    content = fs.readFileSync(filePath, 'utf8');
  }

  var lines = content.split('\n').filter(Boolean);
  var entries = [];

  for (var i = 0; i < lines.length; i++) {
    var m = lines[i].match(LOG_RE);
    if (!m) continue;

    var ip = m[1];
    var ts = parseNginxDate(m[2]);
    var method = m[3];
    var pageUrl = m[4];
    var status = parseInt(m[5]);
    var referrer = m[6];
    var ua = m[7];

    // Filter: only GET requests for pages (skip static assets)
    if (method !== 'GET') continue;
    if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|map)(\?|$)/i.test(pageUrl)) continue;
    if (pageUrl === '/healthz' || pageUrl === '/favicon.ico') continue;

    entries.push({ ip: ip, ts: ts, page_url: pageUrl, ref: referrer, ua: ua });
  }

  return entries;
}

function main() {
  var args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node scripts/import-nginx-log.js <log-file-or-directory>');
    process.exit(1);
  }

  var inputPath = args[0];
  var files = [];

  if (fs.statSync(inputPath).isDirectory()) {
    var allFiles = fs.readdirSync(inputPath);
    for (var i = 0; i < allFiles.length; i++) {
      var f = allFiles[i];
      if (f.startsWith('access.log')) {
        files.push(path.join(inputPath, f));
      }
    }
  } else {
    files.push(inputPath);
  }

  console.log('Found ' + files.length + ' log file(s)');

  var allEntries = [];
  for (var j = 0; j < files.length; j++) {
    var entries = parseLogFile(files[j]);
    console.log('  ' + path.basename(files[j]) + ': ' + entries.length + ' valid entries');
    allEntries = allEntries.concat(entries);
  }

  console.log('Total entries to import: ' + allEntries.length);

  if (allEntries.length === 0) {
    console.log('No entries to import.');
    process.exit(0);
  }

  // Open database
  var db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Ensure site exists
  var site = db.prepare('SELECT id FROM sites WHERE id = ?').get(SITE_ID);
  if (!site) {
    db.prepare('INSERT INTO sites (id, name, domain) VALUES (?, ?, ?)').run(SITE_ID, 'RadarAI', 'radarai.top');
    console.log('Created site: RadarAI (radarai.top)');
  }

  // Insert entries in transaction
  var insertStmt = db.prepare(`
    INSERT INTO page_events (site_id, ts, page_url, ref, ua, ip, is_bot, bot_name, bot_family, visitor_id, device, os, browser, screen, language)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '', '', '', '')
  `);

  var insertMany = db.transaction(function(entries) {
    var count = 0;
    var botCount = 0;
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var bot = classifyUserAgent(e.ua);
      insertStmt.run(
        SITE_ID,
        e.ts,
        e.page_url,
        e.ref || '',
        e.ua,
        e.ip,
        bot.is_bot ? 1 : 0,
        bot.bot_name,
        bot.bot_family
      );
      count++;
      if (bot.is_bot) botCount++;
    }
    return { total: count, bots: botCount };
  });

  var result = insertMany(allEntries);
  console.log('Imported: ' + result.total + ' entries (' + result.bots + ' bots, ' + (result.total - result.bots) + ' humans)');

  // Show stats
  var stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN is_bot = 1 THEN 1 ELSE 0 END) as bots,
      SUM(CASE WHEN is_bot = 0 THEN 1 ELSE 0 END) as humans,
      COUNT(DISTINCT page_url) as pages,
      MIN(date(ts, 'unixepoch', 'localtime')) as first_day,
      MAX(date(ts, 'unixepoch', 'localtime')) as last_day
    FROM page_events WHERE site_id = ?
  `).get(SITE_ID);

  console.log('\nDatabase stats:');
  console.log('  Total events: ' + stats.total);
  console.log('  Bots: ' + stats.bots + ', Humans: ' + stats.humans);
  console.log('  Unique pages: ' + stats.pages);
  console.log('  Date range: ' + stats.first_day + ' ~ ' + stats.last_day);

  var topBots = db.prepare(`
    SELECT bot_name, COUNT(*) as cnt FROM page_events
    WHERE site_id = ? AND is_bot = 1
    GROUP BY bot_name ORDER BY cnt DESC LIMIT 10
  `).all(SITE_ID);

  if (topBots.length) {
    console.log('\nTop bots:');
    for (var k = 0; k < topBots.length; k++) {
      console.log('  ' + topBots[k].bot_name + ': ' + topBots[k].cnt);
    }
  }

  db.close();
  console.log('\nDone!');
}

main();
