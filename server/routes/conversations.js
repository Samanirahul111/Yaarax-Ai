const express = require('express');
const db      = require('../db');
const { verifyToken } = require('../auth');
const { encryptText, decryptText } = require('../utils/crypto');

const router = express.Router();
router.use(verifyToken);

// ─── LIST conversations ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const data = await db.queryAll(`
    SELECT c.*,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
    FROM conversations c
    WHERE c.user_id = ?
    ORDER BY c.updated_at DESC
  `, [req.userId]);
  const convs = data.map(c => ({ ...c, title: decryptText(c.title) }));
  res.json(convs);
});

// ─── CREATE conversation ───────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { title, icon, mode } = req.body;
  const icons = ['💡','📚','💻','🧠','🎯','🔬','📐','🌐','⚡','🎓','🔭','🧬','📊','🎨','🚀'];
  const randomIcon = icons[Math.floor(Math.random() * icons.length)];

  const result = await db.queryRun(
    'INSERT INTO conversations (user_id, title, icon, mode) VALUES (?, ?, ?, ?)',
    [req.userId, encryptText(title || 'New Conversation'), icon || randomIcon, mode || 'auto']
  );

  const conv = await db.queryGet('SELECT * FROM conversations WHERE id = ?', [result.lastInsertRowid]);
  if (conv) conv.title = decryptText(conv.title);
  res.status(201).json(conv);
});

// ─── UPDATE conversation title / mode ─────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  const conv = await db.queryGet('SELECT * FROM conversations WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  const { title, mode } = req.body;
  const newTitle = title !== undefined ? encryptText(title) : conv.title;
  const newMode  = mode  ?? conv.mode;

  await db.queryRun(
    "UPDATE conversations SET title = ?, mode = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [newTitle, newMode, req.params.id]
  );

  res.json({ success: true });
});

// ─── DELETE conversation ───────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const conv = await db.queryGet('SELECT * FROM conversations WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  await db.queryRun('DELETE FROM conversations WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ─── GET messages for a conversation ──────────────────────────────────────────
router.get('/:id/messages', async (req, res) => {
  const conv = await db.queryGet('SELECT * FROM conversations WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  conv.title = decryptText(conv.title);

  const data = await db.queryAll(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    [req.params.id]
  );
  const messages = data.map(m => ({ ...m, content: decryptText(m.content) }));

  res.json({ conversation: conv, messages });
});

// ─── CLEAR messages in a conversation ─────────────────────────────────────────
router.delete('/:id/messages', async (req, res) => {
  const conv = await db.queryGet('SELECT * FROM conversations WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  await db.queryRun('DELETE FROM messages WHERE conversation_id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
