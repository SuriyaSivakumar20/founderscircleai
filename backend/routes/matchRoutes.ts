import express from 'express';
import { getMatches } from '../controllers/matchController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// GET /api/matches?sector=Fintech&stage=Seed&location=Bengaluru
router.get('/', authenticate, getMatches);

export default router;
