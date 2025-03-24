const express = require('express');
const router = express.Router();
const masterListController = require('../controllers/masterListController');
const authenticate = require('../middleware/authenticate');

// Apply authentication middleware to all routes
router.use(authenticate);

// Master List Routes
router.get('/', masterListController.getMasterList);
router.post('/items', masterListController.createItem);
router.put('/items/:itemId', masterListController.updateItem);
router.delete('/items/:itemId', masterListController.deleteItem);

module.exports = router; 