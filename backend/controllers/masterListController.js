const db = require('../db');

const getMasterList = async (req, res) => {
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
};

const createItem = async (req, res) => {
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
};

const updateItem = async (req, res) => {
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
};

const deleteItem = async (req, res) => {
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

    // Delete any tag associations first
    await db.query('DELETE FROM item_tags_master WHERE item_id = $1', [itemId]);
    
    // Delete from grocery_items (this will remove references from all grocery lists)
    await db.query('DELETE FROM grocery_items WHERE master_item_id = $1', [itemId]);
    
    // Finally delete from master_list_items
    await db.query('DELETE FROM master_list_items WHERE id = $1', [itemId]);
    
    await db.query('COMMIT');
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error deleting master list item:', error);
    res.status(500).json({ 
      error: 'Database error',
      message: 'Failed to delete item. Please try again.'
    });
  }
};

module.exports = {
  getMasterList,
  createItem,
  updateItem,
  deleteItem
}; 