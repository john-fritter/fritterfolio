const db = require('../db');

async function addTagSupport() {
  try {
    // Create tags table
    await db.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        color TEXT NOT NULL,
        user_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(text, user_id)
      );
    `);

    // Create item_tags join table
    await db.query(`
      CREATE TABLE IF NOT EXISTS item_tags (
        item_id INTEGER REFERENCES grocery_items(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (item_id, tag_id)
      );
    `);

    // Drop old tag columns if they exist
    await db.query(`
      ALTER TABLE grocery_items 
      DROP COLUMN IF EXISTS tag_text,
      DROP COLUMN IF EXISTS tag_color;
    `);

    console.log('Added tag support successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding tag support:', error);
    process.exit(1);
  }
}

addTagSupport(); 