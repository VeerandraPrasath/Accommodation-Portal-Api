// routes/users.js
import express from 'express';
import {
  createUser,
  getUserById,
  getUserByName,
  getUsersByRole,
  getAllUsers
} from '../controllers/usersController.js';

const router = express.Router();

// Create user
router.post('/', createUser);

// Get all users
router.get('/', getAllUsers);

// Get user by ID
router.get('/id/:id', getUserById);

// Get user(s) by name
router.get('/name/:name', getUserByName);

// Get users by role
router.get('/role/:role', getUsersByRole);

export default router;
