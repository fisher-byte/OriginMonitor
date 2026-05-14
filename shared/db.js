/**
 * Shared database connection module
 * Used by server, MCP server, and CLI
 */
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

let db = null;
let dbPath = null;

function getDb(customPath) {
  const resolvedPath = customPath || path.join(__dirname, '..', 'server', 'data', 'monitor.db');

  if (db && dbPath === resolvedPath) return db;

  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const instance = new Database(resolvedPath);
  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');

  const schemaPath = path.join(__dirname, '..', 'server', 'db', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    instance.exec(schema);
  }

  db = instance;
  dbPath = resolvedPath;

  return instance;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
    dbPath = null;
  }
}

module.exports = { getDb, closeDb };
