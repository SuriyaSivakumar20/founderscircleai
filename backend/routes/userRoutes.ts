
import express from 'express';
import { getProfile, updateProfile, followUser, getCompanies, getInvestors } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/companies', getCompanies);
router.get('/investors', getInvestors);
router.get('/:id', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/:id/follow', authenticate, followUser);

export default router;
