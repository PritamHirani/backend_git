// server.js - Express Backend with SQLite & Authentication
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Simple admin credentials (In production, use proper auth & hashing)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123'; // Change this!

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite Database
const db = new sqlite3.Database('./feedback.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    db.run(`
      CREATE TABLE IF NOT EXISTS feedbacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        mobile TEXT NOT NULL,
        message TEXT NOT NULL,
        rating INTEGER NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
});

// Validation helpers
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidMobile = (mobile) => {
  const mobileRegex = /^[0-9]{10}$/;
  return mobileRegex.test(mobile);
};

// POST /api/feedback - Add new feedback (PUBLIC)
app.post('/api/feedback', (req, res) => {
  const { name, email, mobile, message, rating } = req.body;

  // Validation
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (!mobile || !mobile.trim()) {
    return res.status(400).json({ error: 'Mobile number is required' });
  }
  if (!isValidMobile(mobile)) {
    return res.status(400).json({ error: 'Mobile number must be exactly 10 digits' });
  }
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  const query = `INSERT INTO feedbacks (name, email, mobile, message, rating) VALUES (?, ?, ?, ?, ?)`;
  
  db.run(query, [name.trim(), email.trim(), mobile.trim(), message.trim(), rating], function(err) {
    if (err) {
      console.error('Error inserting feedback:', err);
      return res.status(500).json({ error: 'Failed to save feedback' });
    }
    res.status(201).json({
      message: 'Thank you! Your feedback has been submitted successfully.',
      id: this.lastID
    });
  });
});

// POST /api/admin/login - Admin authentication
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    // In production, use JWT tokens
    res.json({ 
      success: true, 
      message: 'Login successful',
      token: 'simple-token-' + Date.now() // Simplified for demo
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// GET /api/admin/feedback - Get all feedbacks (ADMIN ONLY)
app.get('/api/admin/feedback', (req, res) => {
  // Simple token check (In production, use proper JWT verification)
  const token = req.headers.authorization;
  if (!token || !token.startsWith('simple-token-')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const query = `SELECT * FROM feedbacks ORDER BY createdAt DESC`;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching feedbacks:', err);
      return res.status(500).json({ error: 'Failed to fetch feedbacks' });
    }
    res.json(rows);
  });
});

// GET /api/admin/stats - Get analytics (ADMIN ONLY)
app.get('/api/admin/stats', (req, res) => {
  const token = req.headers.authorization;
  if (!token || !token.startsWith('simple-token-')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  db.all(`SELECT * FROM feedbacks`, [], (err, rows) => {
    if (err) {
      console.error('Error fetching stats:', err);
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }

    const total = rows.length;
    const avgRating = total > 0 
      ? (rows.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(2)
      : 0;
    const positive = rows.filter(r => r.rating >= 4).length;
    const negative = rows.filter(r => r.rating < 3).length;

    res.json({
      total,
      avgRating: parseFloat(avgRating),
      positive,
      negative
    });
  });
});

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Feedback API is running!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});