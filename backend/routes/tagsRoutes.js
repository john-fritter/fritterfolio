const express = require('express');
const router = express.Router();
const tagsController = require('../controllers/tagsController');
const authenticate = require('../middleware/authenticate');

// Apply authentication middleware to all routes
router.use(authenticate);

// Tags Routes
router.get('/', tagsController.getAllTags);
router.delete('/:text', tagsController.deleteTag);

module.exports = router; 