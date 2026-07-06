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
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = (await db.queryGet('SELECT COUNT(*) as count FROM users')).count;
    const totalConversations = (await db.queryGet('SELECT COUNT(*) as count FROM conversations')).count;
    const totalMessages = (await db.queryGet('SELECT COUNT(*) as count FROM messages')).count;
    const featureUsage = await db.queryAll('SELECT mode, COUNT(*) as count FROM conversations GROUP BY mode');
    const recentUsers = await db.queryAll('SELECT username, created_at FROM users ORDER BY created_at DESC LIMIT 5');

    res.json({ success: true, data: { totalUsers, totalConversations, totalMessages, featureUsage, recentUsers }});
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// Endpoint: Users List
router.get('/users', async (req, res) => {
  try {
    const allUsers = await db.queryAll('SELECT id, username, email, created_at, two_factor_enabled FROM users ORDER BY created_at DESC');
    res.json({ success: true, data: allUsers });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// Endpoint: Deep Analytics
router.get('/analytics', async (req, res) => {
  try {
    const topUsers = await db.queryAll(`
      SELECT u.username, COUNT(c.id) as conv_count 
      FROM users u 
      LEFT JOIN conversations c ON u.id = c.user_id 
      GROUP BY u.id 
      ORDER BY conv_count DESC LIMIT 5
    `);

    const totalTasks = (await db.queryGet('SELECT COUNT(*) as count FROM tasks')).count;
    const totalMemories = (await db.queryGet('SELECT COUNT(*) as count FROM user_memory')).count;
    const msgByRole = await db.queryAll('SELECT role, COUNT(*) as count FROM messages GROUP BY role');

    res.json({ 
      success: true, 
      data: { topUsers, totalTasks, totalMemories, msgByRole }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
