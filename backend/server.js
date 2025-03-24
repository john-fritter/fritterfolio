const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

// Import routes
const authRoutes = require('./routes/authRoutes');
const groceryListsRoutes = require('./routes/groceryListsRoutes');
const groceryItemsRoutes = require('./routes/groceryItemsRoutes');
const masterListRoutes = require('./routes/masterListRoutes');
const tagsRoutes = require('./routes/tagsRoutes');
const userRoutes = require('./routes/userRoutes');
const miscRoutes = require('./routes/miscRoutes');

// Middleware
const corsOptions = {
  origin: function(origin, callback) {
    callback(null, true); // Allow all origins for now
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());

// Set proper headers for all responses
app.use((req, res, next) => {
  next();
});

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Verify the token first
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (tokenError) {
      return res.status(401).json({ error: 'Invalid token: ' + tokenError.message });
    }
    
    // Check if token exists and is not expired in the database
    const sessionResult = await db.query(
      'SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    
    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    const session = sessionResult.rows[0];
    
    // Get user using UUID
    const userResult = await db.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [session.user_id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    req.user = userResult.rows[0];
    next();
  } catch (err) {
    console.error("Authentication error:", err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(401).json({ error: 'Authentication failed: ' + err.message });
  }
};

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/grocery-lists', groceryListsRoutes);
app.use('/api/grocery-lists', groceryItemsRoutes);
app.use('/api/master-list', masterListRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/users', userRoutes);
app.use('/api', miscRoutes);

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Server running on port ${PORT}`);
}); 