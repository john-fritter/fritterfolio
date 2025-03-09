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
    
    // Check if token exists and is not expired
    const sessionResult = await db.query(
      'SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    
    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    const session = sessionResult.rows[0];
    
    // Get user
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
    console.error(err);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Grocery Lists Routes
app.get('/api/grocery-lists', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM grocery_lists WHERE owner_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/grocery-lists', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    const result = await db.query(
      'INSERT INTO grocery_lists (name, owner_id) VALUES ($1, $2) RETURNING *',
      [name, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Grocery Items Routes
app.get('/api/grocery-lists/:listId/items', async (req, res) => {
  try {
    const { listId } = req.params;
    const result = await db.query(
      'SELECT * FROM grocery_items WHERE list_id = $1 ORDER BY created_at',
      [listId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/grocery-lists/:listId/items', async (req, res) => {
  try {
    const { listId } = req.params;
    const { name } = req.body;
    const result = await db.query(
      'INSERT INTO grocery_items (list_id, name) VALUES ($1, $2) RETURNING *',
      [listId, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/grocery-items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { completed, name } = req.body;
    let result;
    
    if (name !== undefined) {
      result = await db.query(
        'UPDATE grocery_items SET name = $1 WHERE id = $2 RETURNING *',
        [name, itemId]
      );
    } else {
      result = await db.query(
        'UPDATE grocery_items SET completed = $1 WHERE id = $2 RETURNING *',
        [completed, itemId]
      );
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/grocery-items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    await db.query('DELETE FROM grocery_items WHERE id = $1', [itemId]);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Master List Routes
app.get('/api/master-list', authenticate, async (req, res) => {
  try {
    // Check if master list exists
    let masterListResult = await db.query(
      'SELECT * FROM master_lists WHERE user_id = $1',
      [req.user.id]
    );
    
    // Create master list if it doesn't exist
    if (masterListResult.rows.length === 0) {
      masterListResult = await db.query(
        'INSERT INTO master_lists (user_id) VALUES ($1) RETURNING *',
        [req.user.id]
      );
    }
    
    const masterListId = masterListResult.rows[0].id;
    
    const items = await db.query(
      'SELECT * FROM master_list_items WHERE master_list_id = $1 ORDER BY created_at',
      [masterListId]
    );
    
    res.json({
      id: masterListId,
      items: items.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Master List Item Routes
app.post('/api/master-list/items', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;
    
    if (!name) {
      return res.status(400).json({ error: 'Item name is required' });
    }
    
    // Get or create master list for this user
    let masterListResult = await db.query(
      'SELECT id FROM master_lists WHERE user_id = $1',
      [userId]
    );
    
    let masterListId;
    
    if (masterListResult.rows.length === 0) {
      // Create master list for this user
      const newMasterList = await db.query(
        'INSERT INTO master_lists (user_id) VALUES ($1) RETURNING id',
        [userId]
      );
      masterListId = newMasterList.rows[0].id;
    } else {
      masterListId = masterListResult.rows[0].id;
    }
    
    // Add item to master list
    const result = await db.query(
      'INSERT INTO master_list_items (master_list_id, name) VALUES ($1, $2) RETURNING *',
      [masterListId, name]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding master list item:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// User route (to create or update user)
app.post('/api/users', async (req, res) => {
  try {
    const { id, email } = req.body;
    
    // Make sure we have a valid ID
    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Check if user exists
    const userResult = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    
    if (userResult.rows.length === 0) {
      // Create user if they don't exist
      await db.query(
        'INSERT INTO users (id, email) VALUES ($1, $2)',
        [id, email]
      );
    }
    
    res.status(200).json({ message: 'User created or updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a grocery list
app.delete('/api/grocery-lists/:listId', async (req, res) => {
  try {
    const { listId } = req.params;
    await db.query('DELETE FROM grocery_lists WHERE id = $1', [listId]);
    res.json({ message: 'List deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update master list item
app.put('/api/master-list-items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { completed, name } = req.body;
    let result;
    
    if (name !== undefined) {
      result = await db.query(
        'UPDATE master_list_items SET name = $1 WHERE id = $2 RETURNING *',
        [name, itemId]
      );
    } else {
      result = await db.query(
        'UPDATE master_list_items SET completed = $1 WHERE id = $2 RETURNING *',
        [completed, itemId]
      );
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete master list item
app.delete('/api/master-list-items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    await db.query('DELETE FROM master_list_items WHERE id = $1', [itemId]);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if user already exists
    const existingUser = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Generate UUID for new user
    const userId = uuidv4();
    
    // Create user with UUID
    const result = await db.query(
      'INSERT INTO users (id, email, password, name) VALUES ($1, $2, $3, $4) RETURNING id, email, name',
      [userId, email, hashedPassword, name]
    );
    
    const user = result.rows[0];
    
    // Create a token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + parseInt(process.env.JWT_EXPIRES_IN));

    // Store token in database
    await db.query(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiration]
    );
    
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create a token
    const token = jwt.sign(
      { userId: user.id }, 
      process.env.JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    const expiration = new Date();
    const days = parseInt(process.env.JWT_EXPIRES_IN);
    expiration.setDate(expiration.getDate() + days);

    // Store token in database
    await db.query(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiration]
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      // Remove token from database
      await db.query(
        'DELETE FROM sessions WHERE token = $1',
        [token]
      );
    }
    
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/user', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Check if token exists and is not expired
    const sessionResult = await db.query(
      'SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    
    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    const session = sessionResult.rows[0];
    
    // Get user
    const userResult = await db.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [session.user_id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      user: userResult.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Protected routes example
app.get('/api/protected-route', authenticate, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

// Clear all master list items
app.delete('/api/users/:userId/master-list/clear', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // First get the master list id
    const masterListResult = await db.query(
      'SELECT id FROM master_lists WHERE user_id = $1',
      [userId]
    );
    
    if (masterListResult.rows.length === 0) {
      return res.status(404).json({ error: 'Master list not found' });
    }
    
    const masterListId = masterListResult.rows[0].id;
    
    // Delete all items
    await db.query(
      'DELETE FROM master_list_items WHERE master_list_id = $1',
      [masterListId]
    );
    
    res.json({ message: 'Master list cleared successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a grocery list
app.put('/api/grocery-lists/:listId', authenticate, async (req, res) => {
  try {
    const { listId } = req.params;
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'List name is required' });
    }
    
    const result = await db.query(
      'UPDATE grocery_lists SET name = $1 WHERE id = $2 RETURNING *',
      [name, listId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'List not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating grocery list:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a simple network test endpoint
app.get('/api/network-test', (req, res) => {
  console.log("Network test endpoint called");
  res.json({ 
    status: 'ok',
    message: 'Network connection successful',
    timestamp: new Date(),
    clientIp: req.ip
  });
});

// Test endpoint for debugging registration
app.post('/api/test-register', (req, res) => {
  console.log('Test register endpoint reached');
  console.log('Request body:', req.body);
  return res.status(200).json({ success: true, message: 'Registration test successful' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
}); 