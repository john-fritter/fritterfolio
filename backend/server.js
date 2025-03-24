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
                 'name', mli.name,
                 'completed', gi.completed,
                 'created_at', gi.created_at,
                 'tags', COALESCE(
                   (
                     SELECT json_agg(
                       json_build_object('text', t.text, 'color', t.color)
                     )
                     FROM item_tags_master itm
                     JOIN tags t ON itm.tag_id = t.id
                     WHERE itm.item_id = mli.id
                   ),
                   '[]'
                 )
               )
             )
           END as items
         FROM grocery_items gi
         JOIN master_list_items mli ON mli.id = gi.master_item_id
         GROUP BY gi.list_id
       ),
       share_info AS (
         SELECT
           sl.list_id,
           sl.shared_with_email,
           sl.status
         FROM shared_lists sl
         WHERE sl.owner_id = $1 AND sl.status = 'accepted'
       ),
       pending_shares AS (
         SELECT
           sl.list_id,
           COUNT(*) > 0 as has_pending_share
         FROM shared_lists sl
         WHERE sl.owner_id = $1 AND sl.status = 'pending'
         GROUP BY sl.list_id
       )
       SELECT 
         gl.id,
         gl.name,
         gl.owner_id,
         gl.created_at,
         gl.is_shared,
         si.shared_with_email,
         COALESCE(ps.has_pending_share, false) as has_pending_share,
         COALESCE(li.items, '[]'::json) as items
       FROM grocery_lists gl
       LEFT JOIN list_items li ON gl.id = li.list_id
       LEFT JOIN share_info si ON gl.id = si.list_id
       LEFT JOIN pending_shares ps ON gl.id = ps.list_id
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
  const { listId } = req.params;
  const userId = req.user.id;

  try {
    // First check if user has access to this list (either owns it or has an accepted share)
    const listAccessResult = await db.query(`
      SELECT 
        gl.id,
        gl.owner_id,
        COALESCE(sl.id, sl2.id) as share_id,
        COALESCE(sl.status, sl2.status) as share_status
      FROM grocery_lists gl
      LEFT JOIN shared_lists sl ON sl.list_id = gl.id AND sl.shared_with_id = $1
      LEFT JOIN shared_lists sl2 ON sl2.list_id = gl.id AND sl2.shared_with_email = $2
      WHERE gl.id = $3 AND (gl.owner_id = $4 OR sl.status = 'accepted' OR sl2.status = 'accepted')
    `, [userId, req.user.email, listId, userId]);

    if (listAccessResult.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have access to this list'
      });
    }

    // Now fetch the items with their tags from master list items
    const itemsResult = await db.query(`
      SELECT 
        gi.id,
        gi.completed,
        gi.created_at,
        gi.master_item_id,
        mli.name,
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
      JOIN master_list_items mli ON mli.id = gi.master_item_id
      LEFT JOIN item_tags_master itm ON itm.item_id = mli.id
      LEFT JOIN tags t ON t.id = itm.tag_id
      WHERE gi.list_id = $1
      GROUP BY gi.id, gi.completed, gi.created_at, gi.master_item_id, mli.name
      ORDER BY gi.created_at DESC
    `, [listId]);

    res.json(itemsResult.rows);
  } catch (err) {
    console.error('Error in /api/grocery-lists/:listId/items:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/grocery-lists/:listId/items', authenticate, async (req, res) => {
  const { listId } = req.params;
  const { name } = req.body;
  const userId = req.user.id;

  try {
    await db.query('BEGIN');

    // First check if user has access to this list
    const listAccess = await db.query(`
      SELECT gl.id, gl.owner_id, sl.shared_with_id 
      FROM grocery_lists gl
      LEFT JOIN shared_lists sl ON gl.id = sl.list_id AND sl.status = 'accepted'
      WHERE gl.id = $1 AND (gl.owner_id = $2 OR sl.shared_with_id = $2)
    `, [listId, userId]);

    if (listAccess.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this list'
      });
    }

    // Check for duplicates in the current list
    const duplicateCheck = await db.query(`
      SELECT gi.id 
      FROM grocery_items gi
      JOIN master_list_items mli ON gi.master_item_id = mli.id
      WHERE gi.list_id = $1 AND LOWER(mli.name) = LOWER($2)
    `, [listId, name.trim()]);

    if (duplicateCheck.rows.length > 0) {
      await db.query('ROLLBACK');
      return res.status(400).json({
        error: 'Duplicate item',
        message: 'This item is already in your list'
      });
    }

    // Get user's master list
    const masterList = await db.query(`
      SELECT id FROM master_lists WHERE user_id = $1
    `, [userId]);

    let masterListId;
    if (masterList.rows.length === 0) {
      // Create master list if it doesn't exist
      const newMasterList = await db.query(`
        INSERT INTO master_lists (user_id) VALUES ($1) RETURNING id
      `, [userId]);
      masterListId = newMasterList.rows[0].id;
    } else {
      masterListId = masterList.rows[0].id;
    }

    // Check if item exists in master list (case-insensitive)
    const existingMasterItem = await db.query(`
      SELECT mli.id, mli.name,
        COALESCE(
          json_agg(
            json_build_object('text', t.text, 'color', t.color)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags
      FROM master_list_items mli
      LEFT JOIN item_tags_master itm ON mli.id = itm.item_id
      LEFT JOIN tags t ON itm.tag_id = t.id
      WHERE mli.master_list_id = $1 AND LOWER(mli.name) = LOWER($2)
      GROUP BY mli.id
    `, [masterListId, name.trim()]);

    let masterItemId;
    if (existingMasterItem.rows.length > 0) {
      // Use existing master item
      masterItemId = existingMasterItem.rows[0].id;
    } else {
      // Create new master item
      const newMasterItem = await db.query(`
        INSERT INTO master_list_items (master_list_id, name)
        VALUES ($1, $2)
        RETURNING id
      `, [masterListId, name.trim()]);
      masterItemId = newMasterItem.rows[0].id;
    }

    // Add item to grocery list
    const result = await db.query(`
      INSERT INTO grocery_items (list_id, master_item_id)
      VALUES ($1, $2)
      RETURNING id, completed, created_at
    `, [listId, masterItemId]);

    // Get the complete item data including tags
    const newItem = await db.query(`
      SELECT 
        gi.id,
        gi.completed,
        gi.created_at,
        mli.name,
        COALESCE(
          json_agg(
            json_build_object('text', t.text, 'color', t.color)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags
      FROM grocery_items gi
      JOIN master_list_items mli ON gi.master_item_id = mli.id
      LEFT JOIN item_tags_master itm ON mli.id = itm.item_id
      LEFT JOIN tags t ON itm.tag_id = t.id
      WHERE gi.id = $1
      GROUP BY gi.id, gi.completed, gi.created_at, mli.name
    `, [result.rows[0].id]);

    await db.query('COMMIT');
    res.json(newItem.rows[0]);
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/grocery-lists/:listId/items/:itemId', authenticate, async (req, res) => {
  const { listId, itemId } = req.params;
  const { name, completed, tags } = req.body;
  const userId = req.user.id;

  try {
    // First check if user has access to this list
    const listAccessResult = await db.query(`
      SELECT 
        gl.id,
        gl.owner_id,
        sl.id as share_id,
        sl.status as share_status
      FROM grocery_lists gl
      LEFT JOIN shared_lists sl ON sl.list_id = gl.id AND sl.shared_with_id = $1
      WHERE gl.id = $2 AND (gl.owner_id = $3 OR (sl.status = 'accepted' AND sl.shared_with_id = $4))
    `, [userId, listId, userId, userId]);

    if (listAccessResult.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have access to this list'
      });
    }

    await db.query('BEGIN');

    // Get the current item to get its master_item_id
    const currentItem = await db.query(
      'SELECT master_item_id FROM grocery_items WHERE id = $1',
      [itemId]
    );

    if (currentItem.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({
        error: 'Not found',
        message: 'Item not found'
      });
    }

    const masterItemId = currentItem.rows[0].master_item_id;

    // If name is being updated, update it in the master list item
    if (name) {
      await db.query(
        'UPDATE master_list_items SET name = $1 WHERE id = $2',
        [name.trim(), masterItemId]
      );
    }

    // If tags are being updated, update them in the master list item
    if (tags) {
      // First remove all existing tags for this master item
      await db.query(
        'DELETE FROM item_tags_master WHERE item_id = $1',
        [masterItemId]
      );

      // Then add the new tags
      for (const tag of tags) {
        // Get or create tag
        const tagResult = await db.query(
          `INSERT INTO tags (text, color, user_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (text, user_id) DO UPDATE SET color = $2
           RETURNING id`,
          [tag.text, tag.color, userId]
        );

        // Create tag association
        await db.query(
          'INSERT INTO item_tags_master (item_id, tag_id) VALUES ($1, $2)',
          [masterItemId, tagResult.rows[0].id]
        );
      }
    }

    // Update the completed status in the grocery item
    if (completed !== undefined) {
      await db.query(
        'UPDATE grocery_items SET completed = $1 WHERE id = $2',
        [completed, itemId]
      );
    }

    // Get the updated item with all its information
    const result = await db.query(`
      SELECT 
        gi.id,
        mli.name,
        gi.completed,
        gi.created_at,
        gi.master_item_id,
        COALESCE(
          json_agg(
            json_build_object(
              'text', t.text,
              'color', t.color
            )
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags
      FROM grocery_items gi
      JOIN master_list_items mli ON mli.id = gi.master_item_id
      LEFT JOIN item_tags_master itm ON itm.item_id = mli.id
      LEFT JOIN tags t ON t.id = itm.tag_id
      WHERE gi.id = $1
      GROUP BY gi.id, mli.name, gi.completed, gi.created_at, gi.master_item_id
    `, [itemId]);

    await db.query('COMMIT');

    res.json(result.rows[0]);
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error updating item:', error);
    res.status(500).json({ 
      error: 'Database error',
      message: 'Failed to update item. Please try again.'
    });
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
    
    // Get items with their tags
    const items = await db.query(
      `SELECT 
        mli.*,
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
      FROM master_list_items mli
      LEFT JOIN item_tags_master itm ON mli.id = itm.item_id
      LEFT JOIN tags t ON itm.tag_id = t.id
      WHERE mli.master_list_id = $1
      GROUP BY mli.id
      ORDER BY mli.created_at`,
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
    const { name, tags } = req.body;
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
    
    await db.query('BEGIN');
    
    // Add item to master list
    const result = await db.query(
      'INSERT INTO master_list_items (master_list_id, name) VALUES ($1, $2) RETURNING *',
      [masterListId, name]
    );
    
    const newItem = result.rows[0];
    
    // Handle tags if provided
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        // First, get or create the tag
        const tagResult = await db.query(
          `INSERT INTO tags (text, color, user_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (text, user_id) DO UPDATE SET color = $2
           RETURNING id`,
          [tag.text, tag.color, userId]
        );
        
        // Then create the item-tag association
        await db.query(
          'INSERT INTO item_tags_master (item_id, tag_id) VALUES ($1, $2)',
          [newItem.id, tagResult.rows[0].id]
        );
      }
    }
    
    // Get the item with its tags
    const itemWithTags = await db.query(
      `SELECT 
        mli.*,
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
      FROM master_list_items mli
      LEFT JOIN item_tags_master itm ON mli.id = itm.item_id
      LEFT JOIN tags t ON itm.tag_id = t.id
      WHERE mli.id = $1
      GROUP BY mli.id`,
      [newItem.id]
    );
    
    await db.query('COMMIT');
    
    res.status(201).json(itemWithTags.rows[0]);
  } catch (err) {
    await db.query('ROLLBACK');
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
app.put('/api/master-list-items/:itemId', authenticate, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { completed, name, tags } = req.body;
    let result;
    
    await db.query('BEGIN');
    
    if (name !== undefined) {
      // Update item name
      result = await db.query(
        'UPDATE master_list_items SET name = $1 WHERE id = $2 RETURNING *',
        [name, itemId]
      );
      
      // Handle tags if provided
      if (tags !== undefined) {
        // First, remove all existing tags for this item
        await db.query(
          'DELETE FROM item_tags_master WHERE item_id = $1',
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
              'INSERT INTO item_tags_master (item_id, tag_id) VALUES ($1, $2)',
              [itemId, tagResult.rows[0].id]
            );
          }
        }
      }
    } else {
      // Update completion status
      result = await db.query(
        'UPDATE master_list_items SET completed = $1 WHERE id = $2 RETURNING *',
        [completed, itemId]
      );
    }
    
    // Get the updated item with its tags
    const updatedResult = await db.query(
      `SELECT 
        mli.*,
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
      FROM master_list_items mli
      LEFT JOIN item_tags_master itm ON mli.id = itm.item_id
      LEFT JOIN tags t ON itm.tag_id = t.id
      WHERE mli.id = $1
      GROUP BY mli.id`,
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

// Delete master list item
app.delete('/api/master-list-items/:itemId', authenticate, async (req, res) => {
  const { itemId } = req.params;
  const userId = req.user.id;

  try {
    await db.query('BEGIN');

    // First check if this master list item belongs to the user
    const masterItemCheck = await db.query(`
      SELECT mli.id 
      FROM master_list_items mli
      JOIN master_lists ml ON ml.id = mli.master_list_id
      WHERE mli.id = $1 AND ml.user_id = $2
    `, [itemId, userId]);

    if (masterItemCheck.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this item'
      });
    }

    // Check how many lists this item is in
    const listCountResult = await db.query(`
      SELECT COUNT(DISTINCT list_id) as list_count,
             array_agg(DISTINCT gl.name) as list_names
      FROM grocery_items gi
      JOIN grocery_lists gl ON gl.id = gi.list_id
      WHERE gi.master_item_id = $1
    `, [itemId]);

    const { list_count, list_names } = listCountResult.rows[0];

    // If item is in multiple lists, return a warning response
    if (list_count > 0) {
      await db.query('ROLLBACK');
      return res.status(409).json({
        error: 'Item in use',
        message: `This item is currently in ${list_count} list(s): ${list_names.join(', ')}. Deleting it will remove it from all these lists. Are you sure you want to proceed?`,
        requireConfirmation: true,
        affectedLists: list_names
      });
    }

    // If confirmed or item is not in any lists, proceed with deletion
    if (req.query.confirmed === 'true' || list_count === 0) {
      // Delete from master_list_items (this will cascade to item_tags_master and grocery_items)
      await db.query('DELETE FROM master_list_items WHERE id = $1', [itemId]);
      await db.query('COMMIT');
      res.json({ message: 'Item deleted successfully' });
    } else {
      await db.query('ROLLBACK');
      res.status(400).json({
        error: 'Confirmation required',
        message: 'Please confirm deletion of item from all lists'
      });
    }
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error deleting master list item:', error);
    res.status(500).json({ 
      error: 'Database error',
      message: 'Failed to delete item. Please try again.'
    });
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
      'SELECT * FROM shared_lists WHERE list_id = $1 AND status IN ($2, $3)',
      [listId, 'pending', 'accepted']
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
        
        // Mark the list as shared and update shared_with_email
        await db.query(
          'UPDATE grocery_lists SET is_shared = true, shared_with_email = $1 WHERE id = $2',
          [req.user.email.toLowerCase(), share.list_id]
        );
        
        // When accepting a shared list, add all its items to the user's master list
        // First get or create user's master list
        let masterListResult = await db.query(
          'SELECT id FROM master_lists WHERE user_id = $1',
          [req.user.id]
        );
        
        let masterListId;
        
        if (masterListResult.rows.length === 0) {
          // Create master list for this user
          const newMasterList = await db.query(
            'INSERT INTO master_lists (user_id) VALUES ($1) RETURNING id',
            [req.user.id]
          );
          masterListId = newMasterList.rows[0].id;
        } else {
          masterListId = masterListResult.rows[0].id;
        }
        
        // Get all items from the shared list
        const listItemsResult = await db.query(
          `SELECT 
            gi.*,
            mli.name,
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
          JOIN master_list_items mli ON gi.master_item_id = mli.id
          LEFT JOIN item_tags_master itm ON mli.id = itm.item_id
          LEFT JOIN tags t ON itm.tag_id = t.id
          WHERE gi.list_id = $1
          GROUP BY gi.id, mli.name`,
          [share.list_id]
        );
      } else if (status === 'rejected') {
        // Delete the rejected share record
        await db.query(
          'DELETE FROM shared_lists WHERE id = $1',
          [shareId]
        );

        // If there are no other pending shares for this list, remove the pending state
        const otherPendingShares = await db.query(
          'SELECT COUNT(*) as count FROM shared_lists WHERE list_id = $1 AND status = $2',
          [share.list_id, 'pending']
        );
        
        if (otherPendingShares.rows[0].count === '0') {
          await db.query(
            'UPDATE grocery_lists SET is_shared = false, shared_with_email = NULL WHERE id = $1',
            [share.list_id]
          );
        }
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
                 'name', mli.name,
                 'completed', gi.completed,
                 'created_at', gi.created_at
               )
             )
           END
         FROM grocery_items gi
         JOIN master_list_items mli ON mli.id = gi.master_item_id
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
    
    // Get or create master list for this user
    let masterListResult = await db.query(
      'SELECT id FROM master_lists WHERE user_id = $1',
      [req.user.id]
    );
    
    let masterListId;
    
    if (masterListResult.rows.length === 0) {
      // Create master list for this user
      try {
        const newMasterList = await db.query(
          'INSERT INTO master_lists (user_id) VALUES ($1) RETURNING id',
          [req.user.id]
        );
        masterListId = newMasterList.rows[0].id;
      } catch (error) {
        console.error("Error creating master list:", error);
        // Continue without failing the operation
      }
    } else {
      masterListId = masterListResult.rows[0].id;
    }
    
    if (masterListId) {
      // Get all existing master list item names in lowercase for efficient lookup
      const existingMasterItems = await db.query(
        'SELECT LOWER(name) as name FROM master_list_items WHERE master_list_id = $1',
        [masterListId]
      );
      
      const existingMasterItemNames = new Set(
        existingMasterItems.rows.map(item => item.name)
      );
      
      // For each shared list, add its items to the master list if they don't exist
      await db.query('BEGIN');
      try {
        for (const list of sharedLists) {
          if (list.items && list.items.length > 0) {
            for (const item of list.items) {
              const normalizedName = item.name.toLowerCase().trim();
              
              // Skip if the item already exists in the master list
              if (!existingMasterItemNames.has(normalizedName)) {
                await db.query(
                  'INSERT INTO master_list_items (master_list_id, name) VALUES ($1, $2)',
                  [masterListId, item.name.trim()]
                );
                // Add to our local cache to prevent duplicate inserts
                existingMasterItemNames.add(normalizedName);
              }
            }
          }
        }
        await db.query('COMMIT');
      } catch (error) {
        await db.query('ROLLBACK');
        console.error("Error syncing shared list items to master list:", error);
        // Continue without failing the operation
      }
    }
    
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