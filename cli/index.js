#!/usr/bin/env node
/**
 * OriginMonitor CLI
 * Query monitoring data from the terminal
 */
const path = require('path');
const { getDb } = require('../shared/db');
const { commands, parseArgs, getHelp } = require('./commands');

const DB_PATH = process.env.MONITOR_DB_PATH || path.join(__dirname, '..', 'server', 'data', 'monitor.db');

async function main() {
  const rawArgs = process.argv.slice(2);

  if (rawArgs.length === 0 || rawArgs[0] === '--help' || rawArgs[0] === '-h') {
    console.log(getHelp());
    process.exit(0);
  }

  const commandName = rawArgs[0];
  const db = getDb(DB_PATH);

  try {
    const cmd = commands[commandName];

    if (!cmd) {
      console.log(`Unknown command: ${commandName}`);
      console.log(getHelp());
      process.exit(1);
    }

    // Direct command (e.g., "overview", "bots")
    if (typeof cmd.run === 'function') {
      const args = parseArgs(rawArgs.slice(1));
      const result = await cmd.run(db, args);
      console.log(result);
      return;
    }

    // Subcommand group (e.g., "sites list")
    if (typeof cmd === 'object') {
      const subName = rawArgs[1];
      if (!subName) {
        console.log(`Usage: origin-monitor ${commandName} <subcommand>`);
        console.log(`Available: ${Object.keys(cmd).join(', ')}`);
        process.exit(1);
      }
      const subCmd = cmd[subName];
      if (!subCmd || typeof subCmd.run !== 'function') {
        console.log(`Unknown subcommand: ${commandName} ${subName}`);
        console.log(`Available: ${Object.keys(cmd).join(', ')}`);
        process.exit(1);
      }
      const args = parseArgs(rawArgs.slice(2));
      const result = await subCmd.run(db, args);
      console.log(result);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
