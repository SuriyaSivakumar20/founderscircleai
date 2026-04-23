import express from 'express';
import { getAnalyticsSummary } from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/analytics/summary — dashboard stats
router.get('/summary', authenticate, getAnalyticsSummary);

export default router;
