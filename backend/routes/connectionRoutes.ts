import express from 'express';
import {
  sendConnection,
  getMyConnections,
  updateConnectionStatus,
} from '../controllers/connectionController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.post('/',            authenticate, sendConnection);
router.get('/',             authenticate, getMyConnections);
router.patch('/:id',        authenticate, updateConnectionStatus);

export default router;
