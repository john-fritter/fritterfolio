const db = require('../db');

const getAllTags = async (req, res) => {
  try {
    // Get tags from user's own master list items and shared lists
    const result = await db.query(`
      WITH user_tags AS (
        -- Get tags from user's own master list
        SELECT DISTINCT ON (t.text) t.text, t.color
        FROM tags t
        JOIN item_tags_master itm ON itm.tag_id = t.id
        JOIN master_list_items mli ON mli.id = itm.item_id
        JOIN master_lists ml ON ml.id = mli.master_list_id
        WHERE ml.user_id = $1
        ORDER BY t.text, t.created_at DESC
      ),
      shared_list_tags AS (
        -- Get tags from lists shared with the user
        SELECT DISTINCT ON (t.text) t.text, t.color
        FROM tags t
        JOIN item_tags_master itm ON itm.tag_id = t.id
        JOIN master_list_items mli ON mli.id = itm.item_id
        JOIN grocery_items gi ON gi.master_item_id = mli.id
        JOIN grocery_lists gl ON gl.id = gi.list_id
        JOIN shared_lists sl ON sl.list_id = gl.id
        WHERE sl.shared_with_id = $1 AND sl.status = 'accepted'
        ORDER BY t.text, t.created_at DESC
      )
      SELECT * FROM user_tags
      UNION
      SELECT * FROM shared_list_tags
      ORDER BY text
    `, [req.user.id]);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteTag = async (req, res) => {
  const { text } = req.params;
  
  try {
    // First find the tag
    const tagResult = await db.query(
      'DELETE FROM tags WHERE text = $1 AND user_id = $2 RETURNING *',
      [text, req.user.id]
    );
    
    if (tagResult.rowCount === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllTags,
  deleteTag
}; 