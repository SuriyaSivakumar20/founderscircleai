import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { corsOriginVerifier, rateLimit, securityHeaders } from './config/security.js';
import { registerAiRoutes } from './services/aiService.js';
import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/postRoutes.js';
import userRoutes from './routes/userRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import connectionRoutes from './routes/connectionRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import messageRoutes from './routes/messageRoutes.js';

/**
 * createApp — the single Express application used by BOTH entry points:
 *   • server.ts   — local dev (adds Vite + Socket.IO around this app)
 *   • api/index.ts — Vercel serverless
 *
 * Keeping the middleware stack and route table here guarantees the two
 * environments can never drift apart again.
 */
export function createApp(options: { vercel?: boolean } = {}): Express {
  const app = express();

  // SECURITY: origin was "*" — any origin could call the API with a user's token.
  app.use(cors({ origin: corsOriginVerifier }));
  app.use(securityHeaders);
  // 5mb: large enough for inline image posts (validated + capped at 2MB by Zod),
  // small enough to bound request memory.
  app.use(express.json({ limit: '5mb' }));
  app.disable('x-powered-by');

  // AI endpoints spend real money (Gemini) and are unauthenticated during
  // onboarding, so they are rate-limited per IP to prevent quota theft.
  const aiRateLimiter = rateLimit(20, 60_000);

  // ── API Routes ────────────────────────────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/matches', matchRoutes);
  app.use('/api/connections', connectionRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/messages', messageRoutes);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      platform: 'B.I.R.D — Business Intelligence & Resource Development',
      ...(options.vercel ? { vercel: true } : {}),
    });
  });

  // ── AI Proxy Routes (Gemini runs server-side; key never reaches the browser)
  registerAiRoutes(app, aiRateLimiter);

  // ── 404 for unknown /api routes (consistent JSON, no stack traces) ────────
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ message: 'Not Found' });
  });

  // ── Central error handler — never leaks stack traces to clients ───────────
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    if (res.headersSent) return;
    res.status(500).json({ message: 'Internal server error' });
  });

  return app;
}
