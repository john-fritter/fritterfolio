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
    console.log('Demo login initiated - SIMPLIFIED VERSION');
    // Demo user credentials
    const demoEmail = 'demo@user.com';
    const demoPassword = 'demoaccount'; // Will be hashed
    const demoName = 'Demo User';
    
    await db.query('BEGIN');
    console.log('Transaction started');
    
    // Check if demo user exists
    console.log('Checking if demo user exists...');
    let result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [demoEmail]
    );
    
    let user;
    
    if (result.rows.length === 0) {
      console.log('Demo user does not exist, creating new user');
      // Create demo user if it doesn't exist
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(demoPassword, salt);
      const userId = uuidv4();
      
      result = await db.query(
        'INSERT INTO users (id, email, password, name) VALUES ($1, $2, $3, $4) RETURNING id, email, name',
        [userId, demoEmail, hashedPassword, demoName]
      );
      
      user = result.rows[0];
      console.log('New demo user created with ID:', user.id);
    } else {
      user = result.rows[0];
      console.log('Existing demo user found with ID:', user.id);
    }
    
    // Create a token
    console.log('Creating auth token for demo user...');
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
    console.log('Demo login transaction committed successfully');
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isDemo: true
      }
    });
    console.log('Demo login response sent');
  } catch (err) {
    console.error('Demo login error details:', err);
    try {
      await db.query('ROLLBACK');
      console.log('Transaction rolled back due to error');
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