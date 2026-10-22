import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getJwtSecret, corsOriginVerifier, rateLimit, securityHeaders } from '../../backend/config/security.js';

// NOTE: getJwtSecret caches on first success, so throwing cases run first.

test('getJwtSecret: refuses to start without JWT_SECRET', () => {
  delete process.env.JWT_SECRET;
  assert.throws(() => getJwtSecret(), /JWT_SECRET is not set/);
});

test('getJwtSecret: rejects secrets that were leaked in git history', () => {
  process.env.JWT_SECRET = 'founderscircle-jwt-secret-2025';
  assert.throws(() => getJwtSecret(), /committed to git history/);
  process.env.JWT_SECRET = 'your-secret-key';
  assert.throws(() => getJwtSecret(), /committed to git history/);
});

test('getJwtSecret: rejects short secrets', () => {
  process.env.JWT_SECRET = 'short-secret';
  assert.throws(() => getJwtSecret(), /too short/);
});

test('getJwtSecret: accepts a strong secret', () => {
  const secret = 'a'.repeat(64);
  process.env.JWT_SECRET = secret;
  assert.equal(getJwtSecret(), secret);
  // Second call returns the cached value.
  assert.equal(getJwtSecret(), secret);
});

test('corsOriginVerifier: no origin header (same-origin/curl) is allowed', (t, done) => {
  corsOriginVerifier(undefined, (err, allow) => {
    assert.equal(err, null);
    assert.equal(allow, true);
    done();
  });
});

test('corsOriginVerifier: dev origins are allowed outside production', (t, done) => {
  corsOriginVerifier('http://localhost:3000', (err, allow) => {
    assert.equal(allow, true);
    done();
  });
});

test('corsOriginVerifier: unknown origins are rejected', (t, done) => {
  corsOriginVerifier('https://evil.example.com', (err, allow) => {
    assert.equal(allow, false);
    done();
  });
});

// ── rate limiter ────────────────────────────────────────────────────────────
function mockReqRes(ip = '1.2.3.4') {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 0,
    body: undefined as any,
    headers,
    setHeader(k: string, v: string | number) { headers[k] = String(v); },
    status(code: number) { this.statusCode = code; return this; },
    json(payload: any) { this.body = payload; return this; },
  };
  return { req: { headers, ip } as any, res: res as any };
}

test('rateLimit: allows up to max, then 429s with Retry-After', () => {
  const limiter = rateLimit(3, 60_000);
  for (let i = 0; i < 3; i++) {
    const { req, res } = mockReqRes();
    let nextCalled = false;
    limiter(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true, `request ${i + 1} should pass`);
  }
  const { req, res } = mockReqRes();
  let nextCalled = false;
  limiter(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 429);
  assert.ok(res.headers['Retry-After']);
});

test('rateLimit: limits per IP, not globally', () => {
  const limiter = rateLimit(1, 60_000);
  const a1 = mockReqRes('10.0.0.1');
  const a2 = mockReqRes('10.0.0.1');
  const b = mockReqRes('10.0.0.2');
  let na1 = false, na2 = false, nb = false;
  limiter(a1.req, a1.res, () => { na1 = true; });
  limiter(a2.req, a2.res, () => { na2 = true; });
  limiter(b.req, b.res, () => { nb = true; });
  assert.equal(na1, true);
  assert.equal(na2, false); // same IP over limit
  assert.equal(nb, true);   // different IP unaffected
});

// ── security headers ────────────────────────────────────────────────────────
test('securityHeaders: sets baseline hardening headers on API responses', () => {
  const { req, res } = mockReqRes();
  (req as any).path = '/api/auth/login';
  securityHeaders(req, res, () => {});
  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(res.headers['X-Frame-Options'], 'SAMEORIGIN');
  assert.equal(res.headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.equal(res.headers['Cache-Control'], 'no-store');
  // Camera/mic are denied — nothing in the app uses them.
  assert.equal(res.headers['Permissions-Policy'], 'camera=(), microphone=(), geolocation=()');
});
