require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;
const RENDER_URL = process.env.RENDER_URL || 'https://yaarax-ai.onrender.com';
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY;

// Enable CORS if we want to run frontend separately
app.use(cors());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to fetch from remote
async function fetchRemote(endpoint, res) {
  try {
    // Dynamic import for node-fetch in CommonJS if native fetch isn't available
    // Note: Node 18+ has native fetch. Assuming Node 18+ for Yaarax AI.
    const response = await fetch(`${RENDER_URL}${endpoint}`, {
      headers: {
        'x-admin-secret': ADMIN_SECRET
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    res.status(500).json({ success: false, error: 'Failed to fetch from live server' });
  }
}

// API Endpoints for Dashboard
app.get('/api/stats', (req, res) => {
  fetchRemote('/api/admin/stats', res);
});

app.get('/api/users', (req, res) => {
  fetchRemote('/api/admin/users', res);
});

app.get('/api/analytics', (req, res) => {
  fetchRemote('/api/admin/analytics', res);
});

// Fallback for SPA routing if needed
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Admin Dashboard running on http://localhost:${PORT}`);
});
