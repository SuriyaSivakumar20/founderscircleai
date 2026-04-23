import express from 'express';
import { getMatches, expressInterest } from '../controllers/matchController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// GET /api/matches — role-aware: founders see investors, investors see companies
router.get('/',        authenticate, getMatches);

// POST /api/matches/interest — log interest in a Company or Investor entity
router.post('/interest', authenticate, expressInterest);

export default router;
