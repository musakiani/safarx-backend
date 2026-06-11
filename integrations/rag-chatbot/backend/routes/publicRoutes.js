const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const LoginController = require('../controllers/LoginController');
const ChatController = require('../controllers/ChatController');

// Validation middleware
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('phone')
    .matches(/^(\+92|0)?[0-9]{10}$/)
    .withMessage('Please provide a valid Pakistani phone number'),
  body('role')
    .optional()
    .isIn(['sender', 'traveler'])
    .withMessage('Role must be either sender or traveler')
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Public routes
router.post('/register', registerValidation, LoginController.register);
router.post('/login', loginValidation, LoginController.login);
router.post('/chat', ChatController.chat);

// Protected routes (require authentication)
const { protect } = require('../middleware/auth');
router.get('/profile', protect, LoginController.getProfile);
router.put('/profile', protect, LoginController.updateProfile);

module.exports = router;
