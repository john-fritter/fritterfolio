const db = require('./db');
require('dotenv').config();

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test connection
    const connResult = await db.query('SELECT NOW()');
    console.log('Database connection successful. Current time:', connResult.rows[0].now);
    
    // Check tables
    console.log('\nChecking tables...');
    
    // Check shared_lists table
    try {
      const sharedListsResult = await db.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'shared_lists'
      `);
      
      if (sharedListsResult.rows.length > 0) {
        console.log('shared_lists table exists with columns:');
        sharedListsResult.rows.forEach(col => {
          console.log(`  - ${col.column_name} (${col.data_type})`);
        });
      } else {
        console.log('shared_lists table does not exist!');
      }
    } catch (err) {
      console.error('Error checking shared_lists table:', err);
    }
    
    // Check if tables have any data
    try {
      const usersCount = await db.query('SELECT COUNT(*) FROM users');
      console.log(`\nUsers count: ${usersCount.rows[0].count}`);
      
      const listsCount = await db.query('SELECT COUNT(*) FROM grocery_lists');
      console.log(`Grocery lists count: ${listsCount.rows[0].count}`);
      
      const sharedListsCount = await db.query('SELECT COUNT(*) FROM shared_lists');
      console.log(`Shared lists count: ${sharedListsCount.rows[0].count}`);
    } catch (err) {
      console.error('Error counting records:', err);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Database test error:', error);
    process.exit(1);
  }
}

testDatabase(); 