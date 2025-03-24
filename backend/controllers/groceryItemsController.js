const db = require('../db');

const getItems = async (req, res) => {
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
};

const createItem = async (req, res) => {
  const { listId } = req.params;
  const { name } = req.body;
  const userId = req.user.id;

  try {
    await db.query('BEGIN');

    // First check if user has access to this list and get list details
    const listAccess = await db.query(`
      SELECT 
        gl.id, 
        gl.owner_id, 
        gl.is_shared,
        sl.shared_with_id,
        sl2.shared_with_id as owner_share_id
      FROM grocery_lists gl
      LEFT JOIN shared_lists sl ON gl.id = sl.list_id AND sl.status = 'accepted' AND sl.shared_with_id = $1
      LEFT JOIN shared_lists sl2 ON gl.id = sl2.list_id AND sl2.status = 'accepted' AND sl2.owner_id = $1
      WHERE gl.id = $2 AND (gl.owner_id = $3 OR sl.shared_with_id = $3 OR sl2.owner_id = $3)
    `, [userId, listId, userId]);

    if (listAccess.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this list'
      });
    }

    const listDetails = listAccess.rows[0];

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

    // If this is a shared list, add the item to all users' master lists
    if (listDetails.is_shared) {
      // Get all users who have access to this list (owner and accepted shares)
      const listUsers = await db.query(`
        SELECT DISTINCT user_id
        FROM (
          -- Get the list owner
          SELECT owner_id as user_id
          FROM grocery_lists
          WHERE id = $1
          UNION
          -- Get users who have been shared with
          SELECT shared_with_id as user_id
          FROM shared_lists
          WHERE list_id = $1 AND status = 'accepted' AND shared_with_id IS NOT NULL
          UNION
          -- Get users who shared their lists
          SELECT owner_id as user_id
          FROM shared_lists
          WHERE list_id = $1 AND status = 'accepted'
        ) users
      `, [listId]);

      // For each user, add the item to their master list if it doesn't exist
      for (const user of listUsers.rows) {
        if (user.user_id !== userId) { // Skip the current user as we already handled them
          // Get or create user's master list
          let userMasterList = await db.query(`
            SELECT id FROM master_lists WHERE user_id = $1
          `, [user.user_id]);

          let userMasterListId;
          if (userMasterList.rows.length === 0) {
            const newUserMasterList = await db.query(`
              INSERT INTO master_lists (user_id) VALUES ($1) RETURNING id
            `, [user.user_id]);
            userMasterListId = newUserMasterList.rows[0].id;
          } else {
            userMasterListId = userMasterList.rows[0].id;
          }

          // Add item to user's master list if it doesn't exist
          await db.query(`
            INSERT INTO master_list_items (master_list_id, name)
            SELECT $1, $2
            WHERE NOT EXISTS (
              SELECT 1 FROM master_list_items 
              WHERE master_list_id = $1 AND LOWER(name) = LOWER($2)
            )
          `, [userMasterListId, name.trim()]);
        }
      }
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
};

const updateItem = async (req, res) => {
  const { listId, itemId } = req.params;
  const { name, completed, tags } = req.body;
  const userId = req.user.id;

  try {
    // First check if user has access to this list and get list details
    const listAccessResult = await db.query(`
      SELECT 
        gl.id,
        gl.owner_id,
        gl.is_shared,
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

    const listDetails = listAccessResult.rows[0];

    await db.query('BEGIN');

    // Get the current item to get its master_item_id and name
    const currentItem = await db.query(
      'SELECT gi.master_item_id, mli.name as current_name FROM grocery_items gi JOIN master_list_items mli ON mli.id = gi.master_item_id WHERE gi.id = $1',
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
    const currentName = currentItem.rows[0].current_name;

    // If name is being updated and this is a shared list
    if (name && listDetails.is_shared) {
      // Get all users who have access to this list
      const listUsers = await db.query(`
        SELECT DISTINCT user_id
        FROM (
          SELECT owner_id as user_id
          FROM grocery_lists
          WHERE id = $1
          UNION
          SELECT shared_with_id as user_id
          FROM shared_lists
          WHERE list_id = $1 AND status = 'accepted' AND shared_with_id IS NOT NULL
        ) users
      `, [listId]);

      // For each user, update or create the item in their master list
      for (const user of listUsers.rows) {
        // Find the corresponding master list item for this user
        const userMasterItem = await db.query(`
          SELECT mli.id
          FROM master_list_items mli
          JOIN master_lists ml ON ml.id = mli.master_list_id
          WHERE ml.user_id = $1 AND LOWER(mli.name) = LOWER($2)
        `, [user.user_id, currentName]);

        if (userMasterItem.rows.length > 0) {
          // Update existing item
          await db.query(
            'UPDATE master_list_items SET name = $1 WHERE id = $2',
            [name.trim(), userMasterItem.rows[0].id]
          );
        }
      }
    } else if (name) {
      // Update name for non-shared list
      await db.query(
        'UPDATE master_list_items SET name = $1 WHERE id = $2',
        [name.trim(), masterItemId]
      );
    }

    // If tags are being updated and this is a shared list
    if (tags && listDetails.is_shared) {
      // Get all users who have access to this list
      const listUsers = await db.query(`
        SELECT DISTINCT user_id
        FROM (
          SELECT owner_id as user_id
          FROM grocery_lists
          WHERE id = $1
          UNION
          SELECT shared_with_id as user_id
          FROM shared_lists
          WHERE list_id = $1 AND status = 'accepted' AND shared_with_id IS NOT NULL
        ) users
      `, [listId]);

      // For each user, ensure they have these tags
      for (const user of listUsers.rows) {
        for (const tag of tags) {
          // Get or create tag for each user
          const tagResult = await db.query(
            `INSERT INTO tags (text, color, user_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (text, user_id) DO UPDATE SET color = $2
             RETURNING id`,
            [tag.text, tag.color, user.user_id]
          );

          // Find the corresponding master list item for this user
          const userMasterItem = await db.query(`
            SELECT mli.id
            FROM master_list_items mli
            JOIN master_lists ml ON ml.id = mli.master_list_id
            WHERE ml.user_id = $1 AND LOWER(mli.name) = (
              SELECT LOWER(name) FROM master_list_items WHERE id = $2
            )
          `, [user.user_id, masterItemId]);

          if (userMasterItem.rows.length > 0) {
            // Create tag association if it doesn't exist
            await db.query(
              `INSERT INTO item_tags_master (item_id, tag_id)
               VALUES ($1, $2)
               ON CONFLICT (item_id, tag_id) DO NOTHING`,
              [userMasterItem.rows[0].id, tagResult.rows[0].id]
            );
          }
        }

        // Remove any tags that are no longer present
        if (user.user_id === userId) {
          const tagTexts = tags.map(t => t.text);
          await db.query(`
            DELETE FROM item_tags_master itm
            USING tags t
            WHERE itm.item_id = $1
            AND itm.tag_id = t.id
            AND t.user_id = $2
            AND t.text != ALL($3)
          `, [masterItemId, userId, tagTexts]);
        }
      }
    } else if (tags) {
      // Handle tags for non-shared list (original behavior)
      await db.query(
        'DELETE FROM item_tags_master WHERE item_id = $1',
        [masterItemId]
      );

      for (const tag of tags) {
        const tagResult = await db.query(
          `INSERT INTO tags (text, color, user_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (text, user_id) DO UPDATE SET color = $2
           RETURNING id`,
          [tag.text, tag.color, userId]
        );

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
};

const deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    await db.query('DELETE FROM grocery_items WHERE id = $1', [itemId]);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getItems,
  createItem,
  updateItem,
  deleteItem
}; 