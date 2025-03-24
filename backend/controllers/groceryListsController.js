const db = require('../db');

const getAllLists = async (req, res) => {
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
};

const createList = async (req, res) => {
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
};

const updateList = async (req, res) => {
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
};

const deleteList = async (req, res) => {
  try {
    const { listId } = req.params;
    await db.query('DELETE FROM grocery_lists WHERE id = $1', [listId]);
    res.json({ message: 'List deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const shareList = async (req, res) => {
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
      await db.query('BEGIN');
      
      const shareResult = await db.query(
        'INSERT INTO shared_lists (list_id, owner_id, shared_with_email, shared_with_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [listId, req.user.id, email.toLowerCase(), sharedWithId, 'pending']
      );
      
      await db.query('COMMIT');
      
      res.status(201).json({ 
        message: 'List shared successfully',
        share: shareResult.rows[0]
      });
    } catch (dbError) {
      await db.query('ROLLBACK');
      console.error("Database error while sharing list:", dbError);
      return res.status(500).json({ error: 'Database error: ' + dbError.message });
    }
  } catch (err) {
    console.error("Share list error:", err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
};

const handleShareResponse = async (req, res) => {
  try {
    const { shareId } = req.params;
    const { status } = req.body;
    
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
    
    if (share.status !== 'pending') {
      return res.status(400).json({ error: `This share has already been ${share.status}` });
    }
    
    await db.query('BEGIN');
    
    try {
      const updatedShare = await db.query(
        'UPDATE shared_lists SET status = $1, shared_with_id = $2 WHERE id = $3 RETURNING *',
        [status, req.user.id, shareId]
      );
      
      if (status === 'accepted') {
        await db.query(
          'UPDATE shared_lists SET shared_with_id = $1 WHERE id = $2',
          [req.user.id, shareId]
        );
        
        await db.query(
          'UPDATE grocery_lists SET is_shared = true, shared_with_email = $1 WHERE id = $2',
          [req.user.email.toLowerCase(), share.list_id]
        );
        
        let masterListResult = await db.query(
          'SELECT id FROM master_lists WHERE user_id = $1',
          [req.user.id]
        );
        
        let masterListId;
        
        if (masterListResult.rows.length === 0) {
          const newMasterList = await db.query(
            'INSERT INTO master_lists (user_id) VALUES ($1) RETURNING id',
            [req.user.id]
          );
          masterListId = newMasterList.rows[0].id;
        } else {
          masterListId = masterListResult.rows[0].id;
        }
        
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
        await db.query(
          'DELETE FROM shared_lists WHERE id = $1',
          [shareId]
        );

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
      
      await db.query('COMMIT');
      
      res.json({ 
        message: `Share ${status}`,
        share: updatedShare.rows[0]
      });
    } catch (dbError) {
      await db.query('ROLLBACK');
      console.error("Database error while processing share response:", dbError);
      return res.status(500).json({ error: 'Database error: ' + dbError.message });
    }
  } catch (err) {
    console.error("Share response error:", err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
};

const getPendingShares = async (req, res) => {
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
};

const getAcceptedShares = async (req, res) => {
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
    
    let masterListResult = await db.query(
      'SELECT id FROM master_lists WHERE user_id = $1',
      [req.user.id]
    );
    
    let masterListId;
    
    if (masterListResult.rows.length === 0) {
      try {
        const newMasterList = await db.query(
          'INSERT INTO master_lists (user_id) VALUES ($1) RETURNING id',
          [req.user.id]
        );
        masterListId = newMasterList.rows[0].id;
      } catch (error) {
        console.error("Error creating master list:", error);
      }
    } else {
      masterListId = masterListResult.rows[0].id;
    }
    
    if (masterListId) {
      const existingMasterItems = await db.query(
        'SELECT LOWER(name) as name FROM master_list_items WHERE master_list_id = $1',
        [masterListId]
      );
      
      const existingMasterItemNames = new Set(
        existingMasterItems.rows.map(item => item.name)
      );
      
      await db.query('BEGIN');
      try {
        for (const list of sharedLists) {
          if (list.items && list.items.length > 0) {
            for (const item of list.items) {
              const normalizedName = item.name.toLowerCase().trim();
              
              if (!existingMasterItemNames.has(normalizedName)) {
                await db.query(
                  'INSERT INTO master_list_items (master_list_id, name) VALUES ($1, $2)',
                  [masterListId, item.name.trim()]
                );
                existingMasterItemNames.add(normalizedName);
              }
            }
          }
        }
        await db.query('COMMIT');
      } catch (error) {
        await db.query('ROLLBACK');
        console.error("Error syncing shared list items to master list:", error);
      }
    }
    
    res.json(sharedLists);
  } catch (err) {
    console.error("Error fetching accepted shared lists:", err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
};

module.exports = {
  getAllLists,
  createList,
  updateList,
  deleteList,
  shareList,
  handleShareResponse,
  getPendingShares,
  getAcceptedShares
}; 