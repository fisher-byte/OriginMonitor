/**
 * CLI command handlers
 */
const { v4: uuidv4 } = require('uuid');
const queries = require('../shared/queries');
const { analyzeSitemap } = require('../server/lib/sitemap-service');
const fmt = require('./formatters');

function parseArgs(args) {
  const result = { _: [] };
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      result[key] = val;
    } else {
      result._.push(args[i]);
    }
  }
  return result;
}

function toJSON(data) {
  return JSON.stringify(data, null, 2);
}

const commands = {
  sites: {
    list: {
      description: 'List all sites',
      run(db, args) {
        const sites = queries.listSites(db);
        return args.json ? toJSON(sites) : fmt.formatSites(sites);
      }
    },
    create: {
      description: 'Create a new site',
      run(db, args) {
        const name = args._[0];
        if (!name) return 'Usage: origin-monitor sites create <name> [--domain DOMAIN]';
        const id = uuidv4();
        queries.createSite(db, id, name, args.domain || '');
        const result = { success: true, site_id: id, name, domain: args.domain || '' };
        return args.json ? toJSON(result) : `Created site: ${name} (${id})`;
      }
    },
    delete: {
      description: 'Delete a site',
      run(db, args) {
        const id = args._[0];
        if (!id) return 'Usage: origin-monitor sites delete <site-id>';
        const deleted = queries.deleteSite(db, id);
        return deleted ? 'Site deleted.' : 'Site not found.';
      }
    }
  },

  overview: {
    description: 'Get PV/UV overview',
    run(db, args) {
      const siteId = args._[0];
      if (!siteId) return 'Usage: origin-monitor overview <site-id> [--hours 24]';
      const hours = parseInt(args.hours) || 24;
      const data = queries.getOverview(db, siteId, hours);
      return args.json ? toJSON(data) : fmt.formatOverview(data, hours);
    }
  },

  trend: {
    description: 'Get daily traffic trend',
    run(db, args) {
      const siteId = args._[0];
      if (!siteId) return 'Usage: origin-monitor trend <site-id> [--days 7]';
      const days = parseInt(args.days) || 30;
      const data = queries.getTrend(db, siteId, days);
      return args.json ? toJSON(data) : fmt.formatTrend(data);
    }
  },

  bots: {
    description: 'Get bot ranking',
    run(db, args) {
      const siteId = args._[0];
      if (!siteId) return 'Usage: origin-monitor bots <site-id> [--hours 168]';
      const hours = parseInt(args.hours) || 168;
      const data = queries.getBots(db, siteId, hours);
      return args.json ? toJSON(data) : fmt.formatBots(data);
    }
  },

  pages: {
    description: 'Get page ranking',
    run(db, args) {
      const siteId = args._[0];
      if (!siteId) return 'Usage: origin-monitor pages <site-id> [--hours 168] [--limit 20]';
      const hours = parseInt(args.hours) || 168;
      const limit = args.all ? 0 : (parseInt(args.limit) || 20);
      const data = queries.getPages(db, siteId, hours, limit);
      return args.json ? toJSON(data) : fmt.formatPages(data);
    }
  },

  realtime: {
    description: 'Get live bot activity',
    run(db, args) {
      const siteId = args._[0];
      if (!siteId) return 'Usage: origin-monitor realtime <site-id> [--minutes 5]';
      const minutes = parseInt(args.minutes) || 5;
      const data = queries.getRealtime(db, siteId, minutes);
      return args.json ? toJSON(data) : fmt.formatRealtime(data);
    }
  },

  visitors: {
    description: 'Get visitor analytics',
    run(db, args) {
      const siteId = args._[0];
      if (!siteId) return 'Usage: origin-monitor visitors <site-id> [--hours 24]';
      const hours = parseInt(args.hours) || 24;
      const data = queries.getVisitors(db, siteId, hours);
      return args.json ? toJSON(data) : fmt.formatVisitors(data);
    }
  },

  devices: {
    description: 'Get device distribution',
    run(db, args) {
      const siteId = args._[0];
      if (!siteId) return 'Usage: origin-monitor devices <site-id> [--hours 168]';
      const hours = parseInt(args.hours) || 168;
      const data = queries.getDevices(db, siteId, hours);
      return args.json ? toJSON(data) : fmt.formatDevices(data);
    }
  },

  referrers: {
    description: 'Get traffic sources',
    run(db, args) {
      const siteId = args._[0];
      if (!siteId) return 'Usage: origin-monitor referrers <site-id> [--hours 168]';
      const hours = parseInt(args.hours) || 168;
      const data = queries.getReferrers(db, siteId, hours);
      return args.json ? toJSON(data) : fmt.formatReferrers(data);
    }
  },

  performance: {
    description: 'Get performance metrics',
    run(db, args) {
      const siteId = args._[0];
      if (!siteId) return 'Usage: origin-monitor performance <site-id> [--hours 168]';
      const hours = parseInt(args.hours) || 168;
      const data = queries.getPerformance(db, siteId, hours);
      return args.json ? toJSON(data) : fmt.formatPerformance(data);
    }
  },

  sitemap: {
    description: 'Analyze sitemap vs crawl data',
    async run(db, args) {
      const siteId = args._[0];
      const domain = args._[1];
      if (!siteId || !domain) return 'Usage: origin-monitor sitemap <site-id> <domain> [--hours 720]';
      const hours = parseInt(args.hours) || 720;
      try {
        const data = await analyzeSitemap(db, siteId, domain, hours);
        return args.json ? toJSON(data) : fmt.formatSitemap(data);
      } catch (err) {
        return `Error: ${err.message}`;
      }
    }
  },

  health: {
    description: 'Health check',
    run(db) {
      try {
        db.prepare('SELECT 1').get();
        return 'Database: OK';
      } catch (err) {
        return `Database: ERROR - ${err.message}`;
      }
    }
  }
};

function getHelp() {
  const lines = ['OriginMonitor CLI - AI-native website monitoring', '', 'Usage: origin-monitor <command> [args] [--json]', '', 'Commands:'];
  for (const [name, cmd] of Object.entries(commands)) {
    if (cmd.run) {
      lines.push(`  ${name.padEnd(15)} ${cmd.description}`);
    } else {
      lines.push(`  ${name.padEnd(15)} (subcommands: ${Object.keys(cmd).join(', ')})`);
    }
  }
  lines.push('');
  lines.push('Options:');
  lines.push('  --json          Output as JSON');
  lines.push('  --hours N       Lookback window in hours');
  lines.push('  --days N        Lookback window in days');
  lines.push('  --minutes N     Time window in minutes');
  lines.push('  --limit N       Max results');
  lines.push('  --all           Show all results');
  lines.push('  --domain DOMAIN Domain for sitemap analysis');
  return lines.join('\n');
}

module.exports = { commands, parseArgs, getHelp };
