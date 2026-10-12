/**
 * security.ts — Centralized security configuration & helpers
 *
 * Fixes applied here:
 *  1. JWT secret is REQUIRED from the environment. The old code fell back to a
 *     public, hardcoded secret (`founderscircle-jwt-secret-2025` / `your-secret-key`)
 *     which meant anyone could forge admin tokens if the env var was missing.
 *  2. CORS is no longer `origin: "*"`. Allowed origins come from CORS_ORIGIN;
 *     production defaults to same-origin only.
 *  3. Basic in-memory rate limiting for the unauthenticated AI endpoints so the
 *     Gemini API quota cannot be drained by a third party.
 *  4. Basic security headers for every response.
 */

import type { Request, Response, NextFunction } from 'express';

// ── 1. JWT secret ────────────────────────────────────────────────────────────
const KNOWN_LEAKED_SECRETS = new Set([
  'founderscircle-jwt-secret-2025',
  'your-secret-key',
  'secret',
  'jwt-secret',
]);

let cachedJwtSecret: string | null = null;

export function getJwtSecret(): string {
  if (cachedJwtSecret) return cachedJwtSecret;

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      'JWT_SECRET is not set. Refusing to start with a predictable token secret. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
    );
  }

  if (KNOWN_LEAKED_SECRETS.has(secret)) {
    throw new Error(
      'JWT_SECRET uses a value that was committed to git history and must be treated as public. ' +
        'Rotate it immediately — tokens signed with it can be forged by anyone.'
    );
  }

  if (secret.length < 32) {
    throw new Error('JWT_SECRET is too short. Use at least 32 characters (48 random bytes recommended).');
  }

  cachedJwtSecret = secret;
  return secret;
}

// ── 2. CORS ──────────────────────────────────────────────────────────────────
const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

export function getAllowedOrigins(): string[] {
  const fromEnv = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (fromEnv.length > 0) return fromEnv;

  // Production without an explicit allow-list → same-origin only (frontend is
  // served by this same Express/Vercel deployment, so cross-origin is not needed).
  if (process.env.NODE_ENV === 'production') return [];

  return DEV_ORIGINS;
}

export function corsOriginVerifier(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) {
  // No Origin header → same-origin / non-browser request.
  if (!origin) return cb(null, true);
  cb(null, getAllowedOrigins().includes(origin));
}

// ── 3. Simple per-IP rate limiter ────────────────────────────────────────────
interface RateWindow {
  count: number;
  resetAt: number;
}

export function rateLimit(maxRequests: number, windowMs: number) {
  const windows = new Map<string, RateWindow>();

  // Periodically drop expired buckets so the map cannot grow unbounded.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of windows.entries()) {
      if (entry.resetAt <= now) windows.delete(key);
    }
  }, windowMs);
  sweep.unref?.();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown';

    const now = Date.now();
    let entry = windows.get(ip);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      windows.set(ip, entry);
    }

    entry.count += 1;

    if (entry.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({
        message: 'Too many requests — please slow down and try again shortly.',
      });
    }

    next();
  };
}

// ── 4. Security headers ──────────────────────────────────────────────────────
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  // Camera/mic are needed by the in-app video call (same-origin only).
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');

  // API responses carry tokens/PII — never let browsers or proxies cache them.
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store');
  }

  if (process.env.NODE_ENV === 'production') {
    // HTTPS-only once deployed behind TLS (Vercel terminates TLS).
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // Baseline XSS/Injection containment. Only applied in production: the
    // Vite dev server injects an inline React-refresh preamble that a strict
    // script-src would block.
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' ws: wss:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'",
      ].join('; ')
    );
  }

  next();
}
