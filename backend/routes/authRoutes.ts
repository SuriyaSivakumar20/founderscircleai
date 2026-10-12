
import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { rateLimit } from '../config/security.js';

const router = express.Router();

// SECURITY: login/register are credential-guessing targets. 10 attempts per
// IP per minute makes online brute-force and credential-stuffing impractical.
const authLimiter = rateLimit(10, 60_000);

router.post('/register', authLimiter, register);
router.post('/login',    authLimiter, login);
router.get('/me',        authenticate, getMe);

export default router;
