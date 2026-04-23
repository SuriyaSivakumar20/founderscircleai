import express from 'express';
import { getNotifications, markRead } from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.get('/',          authenticate, getNotifications);
router.patch('/:id/read', authenticate, markRead);

export default router;
