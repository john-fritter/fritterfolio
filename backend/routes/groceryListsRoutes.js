const express = require('express');
const router = express.Router();
const groceryListsController = require('../controllers/groceryListsController');
const authenticate = require('../middleware/authenticate');

// Apply authentication middleware to all routes
router.use(authenticate);

// Grocery Lists Routes
router.get('/', groceryListsController.getAllLists);
router.post('/', groceryListsController.createList);
router.put('/:listId', groceryListsController.updateList);
router.delete('/:listId', groceryListsController.deleteList);

// Sharing Routes
router.post('/:listId/share', groceryListsController.shareList);
router.put('/shared/:shareId', groceryListsController.handleShareResponse);
router.get('/shared/pending', groceryListsController.getPendingShares);
router.get('/shared/accepted', groceryListsController.getAcceptedShares);

module.exports = router; 