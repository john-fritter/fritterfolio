const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const register = async (req, res) => {
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
};

const login = async (req, res) => {
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
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    // Calculate expiration date
    const expiration = new Date();
    const daysToAdd = parseInt(process.env.JWT_EXPIRES_IN);
    expiration.setDate(expiration.getDate() + (isNaN(daysToAdd) ? 7 : daysToAdd));

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
};

const logout = async (req, res) => {
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
};

const getUser = async (req, res) => {
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
};

const protectedRoute = (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
};

const demoLogin = async (req, res) => {
  try {
    console.log('Demo login initiated - Resetting demo data');
    // Demo user credentials
    const demoEmail = 'demo@user.com';
    const demoPassword = 'demoaccount'; // Will be hashed
    const demoName = 'Demo User';
    
    await db.query('BEGIN');
    
    // Check if demo user exists
    let result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [demoEmail]
    );
    
    let user;
    
    if (result.rows.length === 0) {
      // Create demo user if it doesn't exist
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(demoPassword, salt);
      const userId = uuidv4();
      
      result = await db.query(
        'INSERT INTO users (id, email, password, name) VALUES ($1, $2, $3, $4) RETURNING id, email, name',
        [userId, demoEmail, hashedPassword, demoName]
      );
      
      user = result.rows[0];
    } else {
      user = result.rows[0];
      
      // Reset demo user's data by deleting all their data
      await db.query('DELETE FROM grocery_items WHERE list_id IN (SELECT id FROM grocery_lists WHERE owner_id = $1)', [user.id]);
      await db.query('DELETE FROM grocery_lists WHERE owner_id = $1', [user.id]);
      await db.query('DELETE FROM item_tags_master WHERE item_id IN (SELECT id FROM master_list_items WHERE master_list_id IN (SELECT id FROM master_lists WHERE user_id = $1))', [user.id]);
      await db.query('DELETE FROM master_list_items WHERE master_list_id IN (SELECT id FROM master_lists WHERE user_id = $1)', [user.id]);
      await db.query('DELETE FROM master_lists WHERE user_id = $1', [user.id]);
      await db.query('DELETE FROM tags WHERE user_id = $1', [user.id]);
      await db.query('DELETE FROM shared_lists WHERE owner_id = $1 OR shared_with_id = $1', [user.id]);
    }

    // Create master list for demo user
    const masterListResult = await db.query(
      'INSERT INTO master_lists (user_id) VALUES ($1) RETURNING id',
      [user.id]
    );
    const masterListId = masterListResult.rows[0].id;

    // Create demo grocery lists
    const groceryList1 = await db.query(
      'INSERT INTO grocery_lists (name, owner_id) VALUES ($1, $2) RETURNING id',
      ['Weekly Groceries', user.id]
    );
    const groceryList2 = await db.query(
      'INSERT INTO grocery_lists (name, owner_id) VALUES ($1, $2) RETURNING id',
      ['Party Supplies', user.id]
    );

    // Create demo tags
    const tags = [
      { text: 'Fruit', color: 'green' },
      { text: 'Veggies', color: 'teal' },
      { text: 'Dairy', color: 'blue' },
      { text: 'Bakery', color: 'yellow' },
      { text: 'Meat', color: 'red' },
      { text: 'Snacks', color: 'purple' }
    ];

    // Insert tags and store their IDs
    const tagIds = {};
    for (const tag of tags) {
      const tagResult = await db.query(
        'INSERT INTO tags (text, color, user_id) VALUES ($1, $2, $3) RETURNING id',
        [tag.text, tag.color, user.id]
      );
      tagIds[tag.text] = tagResult.rows[0].id;
    }

    // Create demo items with tags
    const items = [
      { name: 'Apples', tags: ['Fruit'] },
      { name: 'Bananas', tags: ['Fruit', 'Snacks'] },
      { name: 'Bread', tags: ['Bakery'] },
      { name: 'Milk', tags: ['Dairy'] },
      { name: 'Cheese', tags: ['Dairy'] },
      { name: 'Chicken', tags: ['Meat'] },
      { name: 'Broccoli', tags: ['Veggies'] },
      { name: 'Carrots', tags: ['Veggies'] },
      { name: 'Chips', tags: ['Snacks'] }
    ];

    // Add items to master list and grocery lists
    for (const item of items) {
      // Add to master list
      const masterItemResult = await db.query(
        'INSERT INTO master_list_items (master_list_id, name) VALUES ($1, $2) RETURNING id',
        [masterListId, item.name]
      );
      const masterItemId = masterItemResult.rows[0].id;

      // Add tags to master item
      for (const tagName of item.tags) {
        await db.query(
          'INSERT INTO item_tags_master (item_id, tag_id) VALUES ($1, $2)',
          [masterItemId, tagIds[tagName]]
        );
      }

      // Add some items to the first grocery list
      if (['Apples', 'Bananas', 'Milk', 'Bread', 'Broccoli'].includes(item.name)) {
        await db.query(
          'INSERT INTO grocery_items (list_id, master_item_id, completed) VALUES ($1, $2, $3)',
          [groceryList1.rows[0].id, masterItemId, false]
        );
      }

      // Add some items to the second grocery list
      if (['Chips', 'Cheese', 'Carrots'].includes(item.name)) {
        await db.query(
          'INSERT INTO grocery_items (list_id, master_item_id, completed) VALUES ($1, $2, $3)',
          [groceryList2.rows[0].id, masterItemId, false]
        );
      }
    }
    
    // Create a token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    // Calculate expiration date
    const expiration = new Date();
    const daysToAdd = parseInt(process.env.JWT_EXPIRES_IN);
    expiration.setDate(expiration.getDate() + (isNaN(daysToAdd) ? 7 : daysToAdd));

    // Store token in database
    await db.query(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiration]
    );
    
    await db.query('COMMIT');
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isDemo: true
      }
    });
  } catch (err) {
    console.error('Demo login error details:', err);
    try {
      await db.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Error during rollback:', rollbackErr);
    }
    
    if (err.code) {
      console.error(`PostgreSQL error code: ${err.code}`);
      console.error(`Error detail: ${err.detail}`);
      console.error(`Error constraint: ${err.constraint}`);
      console.error(`Error table: ${err.table}`);
    }
    
    res.status(500).json({ 
      error: 'Server error during demo login. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  getUser,
  protectedRoute,
  demoLogin
}; 