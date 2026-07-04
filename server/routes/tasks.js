const express = require('express');
const db = require('../db');
const { verifyToken } = require('../auth');
const { encryptText, decryptText } = require('../utils/crypto');

const router = express.Router();
router.use(verifyToken);

// GET all tasks for user
router.get('/', (req, res) => {
  const { type } = req.query;
  let rows;
  const decryptTask = t => ({ ...t, title: decryptText(t.title), notes: decryptText(t.notes) });
  if (type) {
    rows = db.prepare('SELECT * FROM tasks WHERE user_id = ? AND type = ? ORDER BY created_at DESC').all(req.userId, type).map(decryptTask);
  } else {
    rows = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC').all(req.userId).map(decryptTask);
  }
  res.json(rows);
});

// POST — create a task
router.post('/', (req, res) => {
  const { type = 'todo', title, notes = '', due_at = null, priority = 'medium' } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  const result = db.prepare(
    'INSERT INTO tasks (user_id, type, title, notes, due_at, priority) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.userId, type, encryptText(title), encryptText(notes), due_at, priority);

  res.json({ id: result.lastInsertRowid, ok: true });
});

// PATCH — update task
router.patch('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!task) return res.status(404).json({ error: 'Not found' });

  const { title, notes, due_at, done, priority } = req.body;
  const newTitle = title !== undefined ? encryptText(title) : task.title;
  const newNotes = notes !== undefined ? encryptText(notes) : task.notes;
  const newDueAt = due_at !== undefined ? due_at : task.due_at;
  const newDone = done !== undefined ? (done ? 1 : 0) : task.done;
  const newPriority = priority !== undefined ? priority : task.priority;

  db.prepare(`
    UPDATE tasks SET
      title    = ?,
      notes    = ?,
      due_at   = ?,
      done     = ?,
      priority = ?
    WHERE id = ? AND user_id = ?
  `).run(
    newTitle, newNotes, newDueAt, newDone, newPriority,
    req.params.id, req.userId
  );
  res.json({ ok: true });
});

// DELETE a task
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ ok: true });
});

module.exports = router;
