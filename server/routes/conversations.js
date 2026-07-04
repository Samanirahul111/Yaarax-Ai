const express = require('express');
const db      = require('../db');
const { verifyToken } = require('../auth');
const { encryptText, decryptText } = require('../utils/crypto');

const router = express.Router();
router.use(verifyToken);

// ─── LIST conversations ────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const convs = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
    FROM conversations c
    WHERE c.user_id = ?
    ORDER BY c.updated_at DESC
  `).all(req.userId).map(c => ({ ...c, title: decryptText(c.title) }));
  res.json(convs);
});

// ─── CREATE conversation ───────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { title, icon, mode } = req.body;
  const icons = ['💡','📚','💻','🧠','🎯','🔬','📐','🌐','⚡','🎓','🔭','🧬','📊','🎨','🚀'];
  const randomIcon = icons[Math.floor(Math.random() * icons.length)];

  const result = db.prepare(
    'INSERT INTO conversations (user_id, title, icon, mode) VALUES (?, ?, ?, ?)'
  ).run(req.userId, encryptText(title || 'New Conversation'), icon || randomIcon, mode || 'auto');

  const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(result.lastInsertRowid);
  if (conv) conv.title = decryptText(conv.title);
  res.status(201).json(conv);
});

// ─── UPDATE conversation title / mode ─────────────────────────────────────────
router.patch('/:id', (req, res) => {
  const conv = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  const { title, mode } = req.body;
  const newTitle = title !== undefined ? encryptText(title) : conv.title;
  const newMode  = mode  ?? conv.mode;

  db.prepare(
    "UPDATE conversations SET title = ?, mode = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(newTitle, newMode, req.params.id);

  res.json({ success: true });
});

// ─── DELETE conversation ───────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const conv = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  db.prepare('DELETE FROM conversations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── GET messages for a conversation ──────────────────────────────────────────
router.get('/:id/messages', (req, res) => {
  const conv = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  conv.title = decryptText(conv.title);

  const messages = db.prepare(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
  ).all(req.params.id).map(m => ({ ...m, content: decryptText(m.content) }));

  res.json({ conversation: conv, messages });
});

// ─── CLEAR messages in a conversation ─────────────────────────────────────────
router.delete('/:id/messages', (req, res) => {
  const conv = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
