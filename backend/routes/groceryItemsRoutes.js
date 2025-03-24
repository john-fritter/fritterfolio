const express = require('express');
const router = express.Router();
const groceryItemsController = require('../controllers/groceryItemsController');
const authenticate = require('../middleware/authenticate');

// Apply authentication middleware to all routes
router.use(authenticate);

// Grocery Items Routes
router.get('/:listId/items', groceryItemsController.getItems);
router.post('/:listId/items', groceryItemsController.createItem);
router.put('/:listId/items/:itemId', groceryItemsController.updateItem);
router.delete('/items/:itemId', groceryItemsController.deleteItem);

module.exports = router; 