const db = require('./db');

async function dropTables() {
  try {
    await db.query('DROP TABLE IF EXISTS sessions CASCADE');
    await db.query('DROP TABLE IF EXISTS master_list_items CASCADE');
    await db.query('DROP TABLE IF EXISTS master_lists CASCADE');
    await db.query('DROP TABLE IF EXISTS grocery_items CASCADE');
    await db.query('DROP TABLE IF EXISTS grocery_lists CASCADE');
    await db.query('DROP TABLE IF EXISTS users CASCADE');
    
    console.log('All tables dropped successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error dropping tables:', error);
    process.exit(1);
  }
}

dropTables(); 