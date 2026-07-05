const express = require('express');
const router = express.Router();
const db = require('../db');

// Security middleware to protect admin routes
router.use((req, res, next) => {
  const secretKey = req.headers['x-admin-secret'];
  if (!secretKey || secretKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ success: false, error: 'Unauthorized: Invalid Admin Secret' });
  }
  next();
});

// Endpoint: General Stats
router.get('/stats', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalConversations = db.prepare('SELECT COUNT(*) as count FROM conversations').get().count;
    const totalMessages = db.prepare('SELECT COUNT(*) as count FROM messages').get().count;
    const featureUsage = db.prepare('SELECT mode, COUNT(*) as count FROM conversations GROUP BY mode').all();
    const recentUsers = db.prepare('SELECT username, created_at FROM users ORDER BY created_at DESC LIMIT 5').all();

    res.json({ success: true, data: { totalUsers, totalConversations, totalMessages, featureUsage, recentUsers }});
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// Endpoint: Users List
router.get('/users', (req, res) => {
  try {
    const allUsers = db.prepare('SELECT id, username, email, created_at, two_factor_enabled FROM users ORDER BY created_at DESC').all();
    res.json({ success: true, data: allUsers });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// Endpoint: Deep Analytics
router.get('/analytics', (req, res) => {
  try {
    const topUsers = db.prepare(`
      SELECT u.username, COUNT(c.id) as conv_count 
      FROM users u 
      LEFT JOIN conversations c ON u.id = c.user_id 
      GROUP BY u.id 
      ORDER BY conv_count DESC LIMIT 5
    `).all();

    const totalTasks = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
    const totalMemories = db.prepare('SELECT COUNT(*) as count FROM user_memory').get().count;
    const msgByRole = db.prepare('SELECT role, COUNT(*) as count FROM messages GROUP BY role').all();

    res.json({ 
      success: true, 
      data: { topUsers, totalTasks, totalMemories, msgByRole }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
