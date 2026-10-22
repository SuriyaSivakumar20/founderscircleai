# B.I.R.D — Business Intelligence & Resource Development

A private capital network connecting high-growth Indian startups with tier-1 venture capital.
Founders and investors apply through a live AI analyst interview, are scored on a deterministic
rubric, and — once admitted — get a real matching engine, a paginated feed, persisted 1:1
messaging between accepted connections, and honest platform analytics.

**Everything in this product is real.** There are no mocked responses, no fabricated AI
fallbacks, and no client-side identity bypasses. When something fails (AI unavailable, network
down, authorization refused), the UI shows the real error — never fake success.

---

## Stack

| Layer      | Tech |
|------------|------|
| Frontend   | React 19 + Vite 6 + Tailwind CSS 4, React Router 7, animejs |
| Backend    | Express 5 (shared app: `backend/app.ts`), Socket.IO (dev/self-hosted) |
| Database   | PostgreSQL (Neon) via Prisma 6 |
| AI         | Google Gemini (`@google/genai`) — proxied server-side only |
| Auth       | JWT (HS256) + bcryptjs |
| Deploy     | Vercel (serverless `api/index.ts`) or any Node host (`server.ts` adds Socket.IO) |

## Project layout

```
backend/
  app.ts                 # createApp() — THE single Express app (both entry points)
  services/aiService.ts  # Gemini proxy routes (/api/ai/question, /api/ai/evaluate)
  controllers/           # auth, posts, users, matches, connections,
                         # messages, notifications, analytics
  routes/                # one router per domain
  middleware/auth.ts     # JWT authentication (loads the real DB user)
  config/security.ts     # JWT secret policy, CORS allow-list, rate limit, headers
  utils/seed.ts          # idempotent demo/dev seed
  prismaClient.ts        # Prisma singleton
prisma/schema.prisma     # Data model (PostgreSQL)
server.ts                # Dev/self-hosted entry: createApp() + Vite + Socket.IO
api/index.ts             # Vercel serverless entry: createApp()
components/              # React UI (Landing, Onboarding, Auth, Dashboard, Feed,
                         # Matches, Chat, ProfileView)
services/                # apiService.ts (REST client), geminiService.ts (SSE client)
tests/unit/              # Hermetic unit tests (node:test, no DB)
scripts/smoke.mjs        # End-to-end smoke test against a running server
```

## Setup

```bash
npm install                       # also runs `prisma generate`
cp .env.example .env              # then fill in real values
npm run seed                      # optional: load demo data
npm run dev                       # http://localhost:3000
```

### Required environment (`.env`)

| Variable        | Purpose |
|-----------------|---------|
| `DATABASE_URL`  | PostgreSQL connection string (Neon). Required. |
| `JWT_SECRET`    | **Required.** ≥ 32 chars, never a value that was ever committed. The server refuses to start with a missing/leaked/short secret. |
| `GEMINI_API_KEY`| Google AI Studio key for the onboarding interview. Server-side only. If unset/invalid, the AI endpoints return an honest 503 and the UI shows retry. |
| `GEMINI_MODEL`  | Optional model override (default `gemini-3.8-flash`). |
| `ADMIN_PASSWORD`| Optional password for the seeded `admin@bird.ai`. Random per boot if unset. |
| `SEED_DEMO_USERS`| `true` to seed demo accounts outside dev. |
| `VITE_SHOW_DEMO`| `true` to show the demo entry + login demo cards in a production build. |
| `CORS_ORIGIN`   | Comma-separated allow-list. Empty = same-origin only. |
| `NODE_ENV`      | `production` enables HSTS + CSP. |

Generate a JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Seeded accounts (dev only)

| Account | Password | Role |
|---------|----------|------|
| `founder@bird.ai` | `password123` | Founder (connected to the investor demo) |
| `investor@bird.ai` | `password123` | Investor |
| `guest@bird.ai` | `password123` | Guest used by the landing page's "Enter the demo" (real API login) |
| `admin@bird.ai` | `$ADMIN_PASSWORD` or random | Admin |

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Dev server with Vite middleware + Socket.IO on :3000 |
| `npm run build` | Production frontend build → `dist/` |
| `npm run typecheck` | `tsc --noEmit` across the whole repo |
| `npm test` | Hermetic unit tests (`node:test` via tsx, no DB needed) |
| `npm run test:smoke` | End-to-end HTTP smoke test — requires a running server (`npm run dev` first); creates throwaway users |
| `npm run seed` | Idempotent seed (companies, investors, demo users + accepted connection) |
| `npm run vercel-build` | `prisma generate && prisma db push && seed && vite build` |

## How the product works

1. **Apply** — the landing page routes into a live 5-question AI interview
   (`POST /api/ai/question`, streamed SSE). No fabricated fallback questions: if Gemini is
   down, you get an error + Retry.
2. **Evaluation** — `POST /api/ai/evaluate` streams a JSON rubric report
   (score /100, 5 dimensions, verdict, admission status). Scores are persisted on the account
   (`vettingScore`, `vettingReport`) at registration.
3. **Feed** — real paginated posts, likes, comments (with true per-post comment totals),
   connection requests to authors, and author profiles (profile views are tracked).
4. **Discover** — the deterministic matching engine scores Companies vs. Investors
   (sector 40 / stage 30 / geography 15 / ticket 15). "Request intro" persists an
   `Interest` row (idempotent) so the button state survives sessions.
5. **Connections** — connection requests are created from the Feed; only the **receiver**
   can accept/reject. Accepted connections unlock messaging.
6. **Messages** — 1:1 chat persisted in the `Message` table. In dev/self-hosted mode,
   Socket.IO delivers in real time (JWT-authenticated handshake, server-side authorization,
   ack on persistence). On Vercel (no WebSockets), the client falls back to REST + polling
   automatically. Reading a conversation marks messages read.
7. **Notifications** — connection requests, accepts, likes, comments, and messages land in
   the bell panel with a true unread count and mark-all-read.
8. **Analytics** — every number is a live `COUNT`: matches = accepted connections,
   profile views = real `PROFILE_VIEW` events with a target user.

## Deployment

### Vercel (serverless)

- Entry: `api/index.ts` (all routes under `/api/*`). `vercel-build` regenerates the Prisma
  client, pushes additive schema changes (`prisma db push`), seeds, and builds the frontend.
- Set `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY` in the project env.
- Chat works via REST + polling (WebSockets are not available on Vercel serverless).

### Node host (real-time chat)

```bash
npm run build
NODE_ENV=production npm run dev   # or run `tsx server.ts` under a process manager
```

`server.ts` serves `dist/` and adds JWT-authenticated Socket.IO messaging.

## Security notes

- JWT secret is enforced (missing/leaked/too-short values refuse startup).
- CORS is an explicit allow-list (same-origin by default in production).
- Unauthenticated AI endpoints are rate-limited per IP.
- Security headers on every response; strict CSP + HSTS in production.
- Public registration can never mint an `ADMIN` account.
- Profile/website/avatar URLs accept only `http(s)` (blocks stored XSS via `javascript:`).
- Emails are never returned on other users' profile views.
- Messaging and conversation reads require an ACCEPTED connection (server-enforced).
- Passwords: min 8 characters, bcrypt-hashed.

## Tests

```bash
npm test              # unit: input sanitizers, matching engine, security config
npm run test:smoke    # e2e: register → connect → accept → message → notify → analytics
```
