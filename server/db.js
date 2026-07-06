// Flexible DB Wrapper (SQLite + PostgreSQL support)
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const { Pool } = require('pg');

let isPg = false;
let pgPool = null;
let sqliteDb = null;

if (process.env.DATABASE_URL) {
  isPg = true;
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('✅ Connected to PostgreSQL');
} else {
  sqliteDb = new DatabaseSync(path.join(__dirname, 'studymind.db'));
  sqliteDb.exec('PRAGMA journal_mode = WAL');
  sqliteDb.exec('PRAGMA foreign_keys = ON');
  console.log('✅ Database ready (node:sqlite): studymind.db');
}

// Convert SQLite ? to PG $1, $2, ...
function convertSql(sql) {
  if (!isPg) return sql;
  let i = 1;
  return sql.replace(/\?/g, () => `$${i++}`);
}

async function queryGet(sql, params = []) {
  if (isPg) {
    const res = await pgPool.query(convertSql(sql), params);
    return res.rows[0];
  } else {
    return sqliteDb.prepare(sql).get(...params);
  }
}

async function queryAll(sql, params = []) {
  if (isPg) {
    const res = await pgPool.query(convertSql(sql), params);
    return res.rows;
  } else {
    return sqliteDb.prepare(sql).all(...params);
  }
}

async function queryRun(sql, params = []) {
  if (isPg) {
    // Basic conversion for INSERT to get lastInsertRowid
    let finalSql = convertSql(sql);
    if (finalSql.trim().toUpperCase().startsWith('INSERT') && !finalSql.toUpperCase().includes('RETURNING')) {
      finalSql += ' RETURNING id';
    }
    const res = await pgPool.query(finalSql, params);
    return { lastInsertRowid: res.rows[0]?.id || null };
  } else {
    const res = sqliteDb.prepare(sql).run(...params);
    return { lastInsertRowid: res.lastInsertRowid };
  }
}

async function initDb() {
  if (isPg) {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        two_factor_enabled INTEGER DEFAULT 0,
        two_factor_secret TEXT,
        oauth_provider TEXT,
        oauth_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL DEFAULT 'New Conversation',
        icon TEXT DEFAULT '💡',
        mode TEXT DEFAULT 'auto',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_memory (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, key)
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL DEFAULT 'todo',
        title TEXT NOT NULL,
        notes TEXT DEFAULT '',
        due_at TIMESTAMP DEFAULT NULL,
        done INTEGER DEFAULT 0,
        priority TEXT DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('⚡ Migrations applied for PostgreSQL');
  } else {
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        username   TEXT    UNIQUE NOT NULL,
        email      TEXT    UNIQUE NOT NULL,
        password   TEXT    NOT NULL,
        two_factor_enabled INTEGER DEFAULT 0,
        two_factor_secret  TEXT,
        created_at TEXT    DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title      TEXT    NOT NULL DEFAULT 'New Conversation',
        icon       TEXT    DEFAULT '💡',
        mode       TEXT    DEFAULT 'auto',
        created_at TEXT    DEFAULT (datetime('now')),
        updated_at TEXT    DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS messages (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role            TEXT    NOT NULL,
        content         TEXT    NOT NULL,
        created_at      TEXT    DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS user_memory (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        key        TEXT    NOT NULL,
        value      TEXT    NOT NULL,
        updated_at TEXT    DEFAULT (datetime('now')),
        UNIQUE(user_id, key)
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type       TEXT    NOT NULL DEFAULT 'todo',
        title      TEXT    NOT NULL,
        notes      TEXT    DEFAULT '',
        due_at     TEXT    DEFAULT NULL,
        done       INTEGER DEFAULT 0,
        priority   TEXT    DEFAULT 'medium',
        created_at TEXT    DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_convs_user ON conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_msgs_conv  ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_memory_user ON user_memory(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
    `);

    try { sqliteDb.exec('ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0'); } catch(e){}
    try { sqliteDb.exec('ALTER TABLE users ADD COLUMN two_factor_secret TEXT'); } catch(e){}
    try { sqliteDb.exec('ALTER TABLE users ADD COLUMN oauth_provider TEXT'); } catch(e){}
    try { sqliteDb.exec('ALTER TABLE users ADD COLUMN oauth_id TEXT'); } catch(e){}
  }
}

initDb();

module.exports = {
  queryGet,
  queryAll,
  queryRun,
  initDb
};
