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

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Grocery Lists Routes
app.get('/api/grocery-lists', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `WITH list_items AS (
         SELECT 
           gi.list_id,
           CASE 
             WHEN COUNT(gi.id) = 0 THEN '[]'::json
             ELSE json_agg(
               json_build_object(
                 'id', gi.id,
                 'name', gi.name,
                 'completed', gi.completed,
                 'created_at', gi.created_at,
                 'tags', COALESCE(
                   (
                     SELECT json_agg(
                       json_build_object('text', t.text, 'color', t.color)
                     )
                     FROM item_tags it
                     JOIN tags t ON it.tag_id = t.id
                     WHERE it.item_id = gi.id
                   ),
                   '[]'
                 )
               )
             )
           END as items
         FROM grocery_items gi
         GROUP BY gi.list_id
       ),
       share_info AS (
         SELECT
           sl.list_id,
           sl.shared_with_email,
           sl.status
         FROM shared_lists sl
         WHERE sl.owner_id = $1 AND sl.status = 'accepted'
       )
       SELECT 
         gl.id,
         gl.name,
         gl.owner_id,
         gl.created_at,
         gl.is_shared,
         si.shared_with_email,
         COALESCE(li.items, '[]'::json) as items
       FROM grocery_lists gl
       LEFT JOIN list_items li ON gl.id = li.list_id
       LEFT JOIN share_info si ON gl.id = si.list_id
       WHERE gl.owner_id = $1
       ORDER BY gl.created_at DESC`,
      [req.user.id]
    );
    
    const lists = result.rows.map(list => ({
      ...list,
      items: Array.isArray(list.items) ? list.items : []
    }));
    
    res.json(lists);
  } catch (err) {
    console.error('Error in /api/grocery-lists:', err);
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
app.get('/api/grocery-lists/:listId/items', authenticate, async (req, res) => {
  try {
    const { listId } = req.params;
    const result = await db.query(
      `SELECT 
        gi.id, 
        gi.list_id, 
        gi.name, 
        gi.completed, 
        gi.created_at,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object('text', t.text, 'color', t.color)
            )
            FROM item_tags it
            JOIN tags t ON it.tag_id = t.id
            WHERE it.item_id = gi.id
          ),
          '[]'
        ) as tags
      FROM grocery_items gi
      WHERE gi.list_id = $1
      GROUP BY gi.id
      ORDER BY gi.created_at`,
      [listId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/grocery-lists/:listId/items', authenticate, async (req, res) => {
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

app.put('/api/grocery-items/:itemId', authenticate, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { completed, name, tags } = req.body;
    let result;
    
    await db.query('BEGIN');
    
    if (name !== undefined) {
      // Update item name
      result = await db.query(
        'UPDATE grocery_items SET name = $1 WHERE id = $2 RETURNING *',
        [name, itemId]
      );
      
      // Handle tags if provided
      if (tags !== undefined) {
        // First, remove all existing tags for this item
        await db.query(
          'DELETE FROM item_tags WHERE item_id = $1',
          [itemId]
        );
        
        // Then add new tags
        if (tags && tags.length > 0) {
          for (const tag of tags) {
            // First, get or create the tag
            const tagResult = await db.query(
              `INSERT INTO tags (text, color, user_id)
               VALUES ($1, $2, $3)
               ON CONFLICT (text, user_id) DO UPDATE SET color = $2
               RETURNING id`,
              [tag.text, tag.color, req.user.id]
            );
            
            // Then create the item-tag association
            await db.query(
              'INSERT INTO item_tags (item_id, tag_id) VALUES ($1, $2)',
              [itemId, tagResult.rows[0].id]
            );
          }
        }
      }
    } else {
      // Update completion status
      result = await db.query(
        'UPDATE grocery_items SET completed = $1 WHERE id = $2 RETURNING *',
        [completed, itemId]
      );
    }
    
    // Get the updated item with its tags
    const updatedResult = await db.query(
      `SELECT 
        gi.*,
        COALESCE(
          json_agg(
            CASE 
              WHEN t.id IS NOT NULL THEN 
                json_build_object('text', t.text, 'color', t.color)
              ELSE NULL 
            END
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags
      FROM grocery_items gi
      LEFT JOIN item_tags it ON gi.id = it.item_id
      LEFT JOIN tags t ON it.tag_id = t.id
      WHERE gi.id = $1
      GROUP BY gi.id`,
      [itemId]
    );
    
    await db.query('COMMIT');
    
    res.json(updatedResult.rows[0]);
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/grocery-items/:itemId', authenticate, async (req, res) => {
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
    
    // Create a token with UUID as userId
    const token = jwt.sign(
      { userId: user.id }, // Make sure we're using the UUID here
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    // Calculate expiration date
    const expiration = new Date();
    const daysToAdd = parseInt(process.env.JWT_EXPIRES_IN);
    expiration.setDate(expiration.getDate() + (isNaN(daysToAdd) ? 7 : daysToAdd)); // Default to 7 days if parse fails

    // Store token in database with UUID user_id
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
    res.status(500).json({ error: 'Server error during login. Please try again later.' });
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

// List Sharing Routes
app.post('/api/grocery-lists/:listId/share', authenticate, async (req, res) => {
  try {
    const { listId } = req.params;
    const { email } = req.body;
    
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    
    // Check if the list exists and belongs to the user
    const listResult = await db.query(
      'SELECT * FROM grocery_lists WHERE id = $1 AND owner_id = $2',
      [listId, req.user.id]
    );
    
    if (listResult.rows.length === 0) {
      return res.status(404).json({ error: 'List not found or not owned by you' });
    }
    
    // Check if the list is already shared
    const sharedResult = await db.query(
      'SELECT * FROM shared_lists WHERE list_id = $1',
      [listId]
    );
    
    if (sharedResult.rows.length > 0) {
      return res.status(400).json({ error: 'This list is already shared' });
    }
    
    // Check if the user is trying to share with themselves
    if (email.toLowerCase() === req.user.email.toLowerCase()) {
      return res.status(400).json({ error: 'You cannot share a list with yourself' });
    }
    
    // Check if the user to share with exists
    const userResult = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    let sharedWithId = null;
    if (userResult.rows.length > 0) {
      sharedWithId = userResult.rows[0].id;
    }
    
    // Create the share
    try {
      // Begin a transaction
      await db.query('BEGIN');
      
      const shareResult = await db.query(
        'INSERT INTO shared_lists (list_id, owner_id, shared_with_email, shared_with_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [listId, req.user.id, email.toLowerCase(), sharedWithId, 'pending']
      );
      
      // Update the list to mark it as shared and include recipient email
      await db.query(
        'UPDATE grocery_lists SET is_shared = true, shared_with_email = $1 WHERE id = $2',
        [email.toLowerCase(), listId]
      );
      
      // Commit the transaction
      await db.query('COMMIT');
      
      res.status(201).json({ 
        message: 'List shared successfully',
        share: shareResult.rows[0]
      });
    } catch (dbError) {
      // Rollback on error
      await db.query('ROLLBACK');
      console.error("Database error while sharing list:", dbError);
      return res.status(500).json({ error: 'Database error: ' + dbError.message });
    }
  } catch (err) {
    console.error("Share list error:", err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Accept/reject a shared list
app.put('/api/shared-lists/:shareId', authenticate, async (req, res) => {
  try {
    const { shareId } = req.params;
    const { status } = req.body; // 'accepted' or 'rejected'
    
    if (!status || (status !== 'accepted' && status !== 'rejected')) {
      return res.status(400).json({ error: 'Valid status is required (accepted/rejected)' });
    }
    
    // Check if the share exists and is for this user
    const shareResult = await db.query(
      `SELECT sl.*, gl.name as list_name, u.email as owner_email, u.name as owner_name 
       FROM shared_lists sl
       JOIN grocery_lists gl ON sl.list_id = gl.id
       JOIN users u ON sl.owner_id = u.id
       WHERE sl.id = $1 AND (sl.shared_with_id = $2 OR sl.shared_with_email = $3)`,
      [shareId, req.user.id, req.user.email]
    );
    
    if (shareResult.rows.length === 0) {
      return res.status(404).json({ error: 'Shared list not found' });
    }
    
    const share = shareResult.rows[0];
    
    // Check if it's already accepted or rejected
    if (share.status !== 'pending') {
      return res.status(400).json({ error: `This share has already been ${share.status}` });
    }
    
    // Begin transaction
    await db.query('BEGIN');
    
    try {
      // Update the share status
      const updatedShare = await db.query(
        'UPDATE shared_lists SET status = $1, shared_with_id = $2 WHERE id = $3 RETURNING *',
        [status, req.user.id, shareId]
      );
      
      if (status === 'accepted') {
        // If accepted, make sure the shared_with_id is updated in the shared_lists table
        await db.query(
          'UPDATE shared_lists SET shared_with_id = $1 WHERE id = $2',
          [req.user.id, shareId]
        );
      } else if (status === 'rejected') {
        // If rejected, update the list to mark it as not shared
        await db.query(
          'UPDATE grocery_lists SET is_shared = false, shared_with_email = NULL WHERE id = $1',
          [share.list_id]
        );
      }
      
      // Commit the transaction
      await db.query('COMMIT');
      
      res.json({ 
        message: `Share ${status}`,
        share: updatedShare.rows[0]
      });
    } catch (dbError) {
      // Rollback on error
      await db.query('ROLLBACK');
      console.error("Database error while processing share response:", dbError);
      return res.status(500).json({ error: 'Database error: ' + dbError.message });
    }
  } catch (err) {
    console.error("Share response error:", err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Get pending shared lists for the current user
app.get('/api/shared-lists/pending', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT sl.*, gl.name as list_name, u.email as owner_email, u.name as owner_name 
       FROM shared_lists sl
       JOIN grocery_lists gl ON sl.list_id = gl.id
       JOIN users u ON sl.owner_id = u.id
       WHERE (sl.shared_with_id = $1 OR sl.shared_with_email = $2) 
       AND sl.status = 'pending'
       ORDER BY sl.created_at DESC`,
      [req.user.id, req.user.email]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching pending shared lists:", err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Get all lists shared with the current user (accepted only)
app.get('/api/shared-lists/accepted', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT sl.*, gl.name as list_name, u.email as owner_email, u.name as owner_name,
         (SELECT
           CASE 
             WHEN COUNT(gi.id) = 0 THEN '[]'::json
             ELSE json_agg(
               json_build_object(
                 'id', gi.id,
                 'name', gi.name,
                 'completed', gi.completed,
                 'created_at', gi.created_at
               )
             )
           END
         FROM grocery_items gi
         WHERE gi.list_id = gl.id) as items
       FROM shared_lists sl
       JOIN grocery_lists gl ON sl.list_id = gl.id
       JOIN users u ON sl.owner_id = u.id
       WHERE (sl.shared_with_id = $1 OR sl.shared_with_email = $2) 
       AND sl.status = 'accepted'
       ORDER BY sl.created_at DESC`,
      [req.user.id, req.user.email]
    );
    
    const sharedLists = result.rows.map(list => ({
      ...list,
      items: Array.isArray(list.items) ? list.items : []
    }));
    
    res.json(sharedLists);
  } catch (err) {
    console.error("Error fetching accepted shared lists:", err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Tags endpoints
app.get('/api/tags', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT text, color FROM tags WHERE user_id = $1 ORDER BY text',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/tags/:text', authenticate, async (req, res) => {
  try {
    const { text } = req.params;
    await db.query(
      'DELETE FROM tags WHERE text = $1 AND user_id = $2',
      [text, req.user.id]
    );
    res.json({ message: 'Tag deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
}); 