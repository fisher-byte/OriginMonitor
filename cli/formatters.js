/**
 * CLI output formatters
 */

function table(headers, rows) {
  const cols = headers.map(h => h.length);
  rows.forEach(row => {
    row.forEach((cell, i) => {
      cols[i] = Math.max(cols[i], String(cell).length);
    });
  });

  const sep = cols.map(c => '-'.repeat(c + 2)).join('+');
  const headerLine = headers.map((h, i) => ' ' + h.padEnd(cols[i]) + ' ').join('|');
  const dataLines = rows.map(row =>
    row.map((cell, i) => ' ' + String(cell).padEnd(cols[i]) + ' ').join('|')
  );

  return [headerLine, sep, ...dataLines].join('\n');
}

function formatSites(sites) {
  if (!sites.length) return 'No sites found.';
  return table(
    ['ID', 'Name', 'Domain', 'Created'],
    sites.map(s => [s.id, s.name, s.domain || '-', s.created_at || '-'])
  );
}

function formatOverview(data, hours) {
  return [
    `Overview (last ${hours}h)`,
    `  Total PV:     ${data.total_pv || 0}`,
    `  Bot PV:       ${data.bot_pv || 0}`,
    `  Human PV:     ${data.human_pv || 0}`,
    `  UV:           ${data.uv || 0}`,
  ].join('\n');
}

function formatTrend(data) {
  if (!data.length) return 'No trend data.';
  return table(
    ['Date', 'Total', 'Bot', 'Human', 'UV'],
    data.map(d => [d.day, d.total, d.bot, d.human, d.uv])
  );
}

function formatBots(data) {
  if (!data.length) return 'No bot data.';
  return table(
    ['Bot', 'Family', 'Visits', 'Pages', 'Last Seen'],
    data.map(b => [b.bot_name, b.bot_family, b.count, b.unique_pages, b.last_seen || '-'])
  );
}

function formatPages(data) {
  if (!data.length) return 'No page data.';
  return table(
    ['Page', 'Bot', 'Human', 'Total', 'AI Bots'],
    data.map(p => [
      p.page_url,
      p.bot_count || 0,
      p.human_count || 0,
      p.total || 0,
      (p.bot_names || '-').substring(0, 40)
    ])
  );
}

function formatRealtime(data) {
  if (!data.length) return 'No realtime bot activity.';
  return table(
    ['Time', 'Bot', 'Page'],
    data.map(r => [
      r.created_at ? r.created_at.split(' ')[1] || '' : '',
      r.bot_name,
      r.page_url
    ])
  );
}

function formatVisitors(data) {
  const lines = ['Visitor Stats:'];
  if (data.overview) {
    lines.push(`  PV:           ${data.overview.pv || 0}`);
    lines.push(`  UV:           ${data.overview.uv || 0}`);
    lines.push(`  Avg Stay:     ${Math.round(data.overview.avg_stay || 0)}ms`);
    lines.push(`  Avg Scroll:   ${Math.round(data.overview.avg_scroll || 0)}%`);
  }
  if (data.devices && data.devices.length) {
    lines.push('\n  Devices:');
    data.devices.forEach(d => lines.push(`    ${d.device}: ${d.count}`));
  }
  if (data.browsers && data.browsers.length) {
    lines.push('\n  Browsers:');
    data.browsers.forEach(b => lines.push(`    ${b.browser}: ${b.count}`));
  }
  if (data.os && data.os.length) {
    lines.push('\n  OS:');
    data.os.forEach(o => lines.push(`    ${o.os}: ${o.count}`));
  }
  return lines.join('\n');
}

function formatDevices(data) {
  const lines = [];
  if (data.devices && data.devices.length) {
    lines.push('Devices:');
    lines.push(table(['Device', 'Count'], data.devices.map(d => [d.device, d.count])));
  }
  if (data.os && data.os.length) {
    lines.push('\nOS:');
    lines.push(table(['OS', 'Count'], data.os.map(o => [o.os, o.count])));
  }
  if (data.browsers && data.browsers.length) {
    lines.push('\nBrowsers:');
    lines.push(table(['Browser', 'Count'], data.browsers.map(b => [b.browser, b.count])));
  }
  return lines.join('\n') || 'No device data.';
}

function formatReferrers(data) {
  if (!data.length) return 'No referrer data.';
  return table(['Referrer', 'Count'], data.map(r => [r.ref, r.count]));
}

function formatPerformance(data) {
  const lines = [];
  if (data.overall) {
    lines.push('Overall Performance:');
    lines.push(`  Avg Duration:     ${Math.round(data.overall.avg_duration || 0)}ms`);
    lines.push(`  Max Duration:     ${Math.round(data.overall.max_duration || 0)}ms`);
    lines.push(`  Total Requests:   ${data.overall.total_requests || 0}`);
  }
  if (data.slowest && data.slowest.length) {
    lines.push('\nSlowest Resources:');
    lines.push(table(
      ['URL', 'Avg Duration', 'Count'],
      data.slowest.map(s => [s.req_url, Math.round(s.avg_duration) + 'ms', s.count])
    ));
  }
  return lines.join('\n') || 'No performance data.';
}

function formatSitemap(data) {
  const lines = [
    `Sitemap Analysis: ${data.source}`,
    `Total Pages: ${data.total_pages}`,
    `Crawled Pages: ${data.crawled_pages}`,
  ];
  if (data.data && data.data.length) {
    lines.push('');
    lines.push(table(
      ['Page', 'Updated', 'Bot', 'Human', 'Crawled'],
      data.data.slice(0, 30).map(p => [
        p.page_url,
        p.page_updated_at || '-',
        p.bot_count || 0,
        p.human_count || 0,
        p.crawled ? 'Yes' : 'No'
      ])
    ));
    if (data.data.length > 30) lines.push(`... and ${data.data.length - 30} more pages`);
  }
  return lines.join('\n');
}

module.exports = {
  table,
  formatSites,
  formatOverview,
  formatTrend,
  formatBots,
  formatPages,
  formatRealtime,
  formatVisitors,
  formatDevices,
  formatReferrers,
  formatPerformance,
  formatSitemap,
};
