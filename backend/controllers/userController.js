const db = require('../db');

const createOrUpdateUser = async (req, res) => {
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
};

module.exports = {
  createOrUpdateUser
}; 