import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getConversations,
  getConversation,
  sendMessage,
  markConversationRead,
} from '../controllers/messageController.js';

const router = Router();

router.use(authenticate);

router.get('/conversations', getConversations);
router.post('/', sendMessage);
router.post('/:peerId/read', markConversationRead);
router.get('/:peerId', getConversation);

export default router;
