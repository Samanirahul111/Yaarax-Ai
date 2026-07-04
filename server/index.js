const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Init DB (creates tables on first run)
require('./db');

const authRoutes  = require('./routes/auth');
const convRoutes  = require('./routes/conversations');
const chatRoutes  = require('./routes/chat');
const memoryRoutes = require('./routes/memory');
const tasksRoutes  = require('./routes/tasks');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'] : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/conversations', convRoutes);
app.use('/api/chat',          chatRoutes);
app.use('/api/memory',        memoryRoutes);
app.use('/api/tasks',         tasksRoutes);

// Root endpoint
app.get('/', (_, res) => res.json({ 
  message: '🚀 Yaarax AI Server is running!',
  status: 'active',
  docs: '/api/health'
}));

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// 404
app.use((_, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Yaarax AI Server running at http://localhost:${PORT}`);
  console.log(`📡 API ready at http://localhost:${PORT}/api/health\n`);
});
 
