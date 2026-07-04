// Uses Node.js built-in sqlite (available since Node v22.5+)
// No compilation, no external packages needed!
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'studymind.db'));

// Performance & safety
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ─── SCHEMA ───────────────────────────────────────────────────────────────────
db.exec(`
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

// ─── RUN MIGRATIONS ──────────────────────────────────────────────────────────
try {
  db.exec('ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0');
  console.log('⚡ Migrated: Added two_factor_enabled column to users');
} catch (e) {
  // Column already exists, ignore
}

try {
  db.exec('ALTER TABLE users ADD COLUMN two_factor_secret TEXT');
  console.log('⚡ Migrated: Added two_factor_secret column to users');
} catch (e) {
  // Column already exists, ignore
}

try {
  db.exec('ALTER TABLE users ADD COLUMN oauth_provider TEXT');
  console.log('⚡ Migrated: Added oauth_provider column to users');
} catch (e) {
  // Column already exists, ignore
}

try {
  db.exec('ALTER TABLE users ADD COLUMN oauth_id TEXT');
  console.log('⚡ Migrated: Added oauth_id column to users');
} catch (e) {
  // Column already exists, ignore
}

console.log('✅ Database ready (node:sqlite): studymind.db');
module.exports = db;
