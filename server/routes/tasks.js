const express = require('express');
const db = require('../db');
const { verifyToken } = require('../auth');
const { encryptText, decryptText } = require('../utils/crypto');

const router = express.Router();
router.use(verifyToken);

// GET all tasks for user
router.get('/', async (req, res) => {
  const { type } = req.query;
  let rows;
  const decryptTask = t => ({ ...t, title: decryptText(t.title), notes: decryptText(t.notes) });
  if (type) {
    const data = await db.queryAll('SELECT * FROM tasks WHERE user_id = ? AND type = ? ORDER BY created_at DESC', [req.userId, type]);
    rows = data.map(decryptTask);
  } else {
    const data = await db.queryAll('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
    rows = data.map(decryptTask);
  }
  res.json(rows);
});

// POST — create a task
router.post('/', async (req, res) => {
  const { type = 'todo', title, notes = '', due_at = null, priority = 'medium' } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  const result = await db.queryRun(
    'INSERT INTO tasks (user_id, type, title, notes, due_at, priority) VALUES (?, ?, ?, ?, ?, ?)',
    [req.userId, type, encryptText(title), encryptText(notes), due_at, priority]
  );

  res.json({ id: result.lastInsertRowid, ok: true });
});

// PATCH — update task
router.patch('/:id', async (req, res) => {
  const task = await db.queryGet('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!task) return res.status(404).json({ error: 'Not found' });

  const { title, notes, due_at, done, priority } = req.body;
  const newTitle = title !== undefined ? encryptText(title) : task.title;
  const newNotes = notes !== undefined ? encryptText(notes) : task.notes;
  const newDueAt = due_at !== undefined ? due_at : task.due_at;
  const newDone = done !== undefined ? (done ? 1 : 0) : task.done;
  const newPriority = priority !== undefined ? priority : task.priority;

  await db.queryRun(`
    UPDATE tasks SET
      title    = ?,
      notes    = ?,
      due_at   = ?,
      done     = ?,
      priority = ?
    WHERE id = ? AND user_id = ?
  `, [
    newTitle, newNotes, newDueAt, newDone, newPriority,
    req.params.id, req.userId
  ]);
  res.json({ ok: true });
});

// DELETE a task
router.delete('/:id', async (req, res) => {
  await db.queryRun('DELETE FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  res.json({ ok: true });
});

module.exports = router;
