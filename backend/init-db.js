const db = require('./db');
require('dotenv').config();

async function initializeDatabase() {
  try {
    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        name TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create sessions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        token TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create grocery_lists table
    await db.query(`
      CREATE TABLE IF NOT EXISTS grocery_lists (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        owner_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create grocery_items table
    await db.query(`
      DROP TABLE IF EXISTS grocery_items CASCADE;
      CREATE TABLE IF NOT EXISTS grocery_items (
        id SERIAL PRIMARY KEY,
        list_id INTEGER NOT NULL,
        master_item_id INTEGER NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (list_id) REFERENCES grocery_lists(id) ON DELETE CASCADE,
        FOREIGN KEY (master_item_id) REFERENCES master_list_items(id) ON DELETE CASCADE
      );
    `);

    // Create master_lists table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS master_lists (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create master_list_items table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS master_list_items (
        id SERIAL PRIMARY KEY,
        master_list_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (master_list_id) REFERENCES master_lists(id) ON DELETE CASCADE
      );
    `);

    // Create tags table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        color TEXT NOT NULL,
        user_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (text, user_id)
      );
    `);

    // Drop item_tags table since tags will only be stored with master items
    await db.query(`DROP TABLE IF EXISTS item_tags CASCADE;`);

    // Create item_tags_master table for master list items
    await db.query(`
      CREATE TABLE IF NOT EXISTS item_tags_master (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (item_id) REFERENCES master_list_items(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
        UNIQUE (item_id, tag_id)
      );
    `);

    // Create shared_lists table for list sharing functionality
    await db.query(`
      CREATE TABLE IF NOT EXISTS shared_lists (
        id SERIAL PRIMARY KEY,
        list_id INTEGER NOT NULL,
        owner_id UUID NOT NULL,
        shared_with_email TEXT NOT NULL,
        shared_with_id UUID,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (list_id) REFERENCES grocery_lists(id) ON DELETE CASCADE,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (shared_with_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    // Add is_shared column to grocery_lists table
    await db.query(`
      ALTER TABLE grocery_lists 
      ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE;
    `);

    // Add shared_with_email column to grocery_lists table
    await db.query(`
      ALTER TABLE grocery_lists 
      ADD COLUMN IF NOT EXISTS shared_with_email TEXT DEFAULT NULL;
    `);

    console.log('Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase(); 