import express from 'express';
import {
  sendConnection,
  getMyConnections,
  updateConnectionStatus,
} from '../controllers/connectionController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/',            authenticate, sendConnection);
router.get('/',             authenticate, getMyConnections);
router.patch('/:id',        authenticate, updateConnectionStatus);

export default router;
