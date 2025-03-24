const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');

// Auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/demo', authController.demoLogin);
router.post('/logout', authenticate, authController.logout);
router.get('/user', authController.getUser);
router.get('/protected', authenticate, authController.protectedRoute);

module.exports = router; 