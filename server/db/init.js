const path = require('path');
const { getDb: sharedGetDb, closeDb: sharedCloseDb } = require('../../shared/db');

const DB_PATH = process.env.MONITOR_DB_PATH || path.join(__dirname, '..', 'data', 'monitor.db');

function getDb() {
  return sharedGetDb(DB_PATH);
}

function closeDb() {
  sharedCloseDb();
}

module.exports = { getDb, closeDb, DB_PATH };
