const express = require('express');
const db = require('../db');
const { verifyToken } = require('../auth');
const { encryptText, decryptText } = require('../utils/crypto');

const router = express.Router();
router.use(verifyToken);

// GET all memories for user
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value, updated_at FROM user_memory WHERE user_id = ? ORDER BY updated_at DESC').all(req.userId)
    .map(row => ({ ...row, value: decryptText(row.value) }));
  res.json(rows);
});

// POST — upsert a memory key
router.post('/', (req, res) => {
  const { key, value } = req.body;
  if (!key || !value) return res.status(400).json({ error: 'key and value required' });

  db.prepare(`
    INSERT INTO user_memory (user_id, key, value, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(req.userId, key.trim(), encryptText(value.trim()));

  res.json({ ok: true });
});

// DELETE one memory by key
router.delete('/:key', (req, res) => {
  db.prepare('DELETE FROM user_memory WHERE user_id = ? AND key = ?').run(req.userId, req.params.key);
  res.json({ ok: true });
});

// DELETE ALL memories
router.delete('/', (req, res) => {
  db.prepare('DELETE FROM user_memory WHERE user_id = ?').run(req.userId);
  res.json({ ok: true });
});

module.exports = router;
