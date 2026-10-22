
import express from 'express';
import { getProfile, updateProfile, searchUsers } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.put('/profile', authenticate, updateProfile);
router.get('/search', authenticate, searchUsers);
router.get('/:id', authenticate, getProfile);

export default router;
