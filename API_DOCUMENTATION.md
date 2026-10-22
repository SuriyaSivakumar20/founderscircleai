# B.I.R.D API Documentation

Base URL: `http://localhost:3000/api` (dev) — every route below lives under `/api`.

Authentication uses `Authorization: Bearer <token>` on every endpoint except
`/auth/register`, `/auth/login`, `/ai/*` (rate-limited, pre-signup) and `/health`.
All error responses are JSON: `{ "message": string }` (validation errors may also
include `{ "errors": zodIssue[] }`).

---

## Health

### `GET /health`
No auth. → `{ status: "ok", platform, vercel? }`

---

## Auth (`/auth`)

### `POST /auth/register` *(rate-limited)*
Body: `email` (valid), `password` (**min 8 chars**), `name` (min 2), `role`
(`FOUNDER` | `INVESTOR` — `ADMIN` can never be self-registered), optional
`industry`, `location`, `description`, `avatar`, `website`, and the AI vetting
outcome `vettingScore` (0–100 int) + `vettingReport` (object).
→ `201 { user, token }` — user has no password hash; token is HS256 JWT.

### `POST /auth/login` *(rate-limited)*
Body: `email`, `password`.
→ `200 { user, token }` · `401` on bad credentials.

### `GET /auth/me`
→ The full authenticated user row (minus password), including `vettingScore`.

---

## Posts (`/posts`)

### `POST /posts`
Body: `content` (1–5000), optional `tag`, `metric`, `metricLabel`, `image`
(http(s) URL or inline `data:image/…`, capped 2 MB), `referencedCompanyId`,
`referencedInvestorId`.
→ `201` full post (author, likes, up to 50 comments) · `400` validation.

### `GET /posts/feed?page=1&limit=10`
→ `{ posts, total, page, totalPages }` — newest first; each post carries
`likes[]`, up to 50 recent `comments[]` and the true `commentsTotal`.

### `POST /posts/:postId/like`
Toggles. → `{ liked: boolean, message }` · `404` if the post doesn't exist.
Notifies the author (never for self-likes).

### `POST /posts/:postId/comment`
Body: `content` (1–2000). → `201` comment with user · `400`/`404`.
Notifies the author (never for self-comments).

---

## Users (`/users`)

### `PUT /users/profile`
Body (all optional, whitelisted — role/email/password can never be escalated):
`name`, `industry`, `stage`, `location`, `description`, `teamSize`,
`foundedYear`, `targetRaise`, `minCheckSize`, `maxCheckSize`, `avatar`,
`website` (both must be valid http(s) URLs).
→ Updated user (minus password) · `400` on invalid input.

### `GET /users/search?q=term`
Auth required. Up to 8 users matching name/industry/location (excluding self).
→ `{ users: [...] }` (id, name, role, industry, location, avatar).

### `GET /users/:id`
Auth required. Public profile **without email** (PII) + last 10 posts +
`createdAt` + `vettingScore`. Logs a real `PROFILE_VIEW` analytics event
targeted at the profile owner (never for self-views). → `404` if unknown.

---

## Matches (`/matches`)

The deterministic engine scores the opposing entity type:
founders see Investors, investors see Companies, admins see Companies.
Weights: sector 40 (exact 40 / same group 20) · stage 30 (exact 30 / adjacent 15 /
unknown 10) · geography 15 (exact 15 / shared token 10 / unknown 5) ·
ticket 15 (in range 15 / within 2× 7 / unknown 5). Capped at 100.

### `GET /matches?sector=&stage=&location=`
→ `{ matches, total, viewerRole }` — each match includes `matchScore`,
`matchLabel` (High ≥80 / Good ≥60 / Moderate ≥40 / Low), `entityType`, and
`interested: boolean` (persisted for the current user).

### `POST /matches/interest`
Body: `entityId`, `entityType` (`company` | `investor`).
Idempotent (unique per user+entity). → `201 { interest, message }` ·
`404` if the entity doesn't exist.

---

## Connections (`/connections`)

Messaging is unlocked only by an `ACCEPTED` connection. Only the **receiver**
of a request can accept or reject it.

### `POST /connections`
Body: `receiverId` (must be another existing user).
→ `201 { connection }` (status `PENDING`, notifies the receiver) ·
`400` self-connect · existing row returned with `duplicate: true`.

### `GET /your-connections` → `GET /connections`
→ `{ sent: [...], received: [...] }` full connection rows.

### `PATCH /connections/:id`
Body: `status` (`ACCEPTED` | `REJECTED`).
→ `{ connection }` · `403` if you are not the receiver · `404` unknown ·
`400` invalid status. Accepting notifies the requester.

---

## Messages (`/messages`)

Authorization (server-enforced on every path): both users must have an
`ACCEPTED` connection.

### `GET /messages/conversations`
→ `{ conversations: [{ peer, lastMessage, unreadCount }] }` — one row per
accepted connection with the peer's public profile, latest message and the
true unread count.

### `GET /messages/:peerId?page=1&limit=30`
→ `{ messages, total, page, totalPages }` — oldest-first in `messages`.
→ `403` without an accepted connection.

### `POST /messages`
Body: `receiverId`, `content` (1–5000).
→ `201 { message }` (server id + timestamp; notifies the recipient) ·
`400` invalid · `403` without accepted connection · `404` unknown recipient.

### `POST /messages/:peerId/read`
Marks every message from `peerId → me` as read (idempotent).
→ `{ markedRead: number }`.

---

## Notifications (`/notifications`)

Types: `CONNECTION_REQUEST`, `CONNECTION_ACCEPTED`, `NEW_LIKE`, `NEW_COMMENT`,
`MESSAGE`.

### `GET /notifications`
→ `{ notifications, unreadCount }` — latest 30 + the true unread count.

### `POST /notifications/read-all`
→ `{ markedRead: number }`.

### `PATCH /notifications/:id/read`
Scoped to the authenticated receiver (IDOR-safe).
→ `{ notification }` · `404` if not yours.

---

## Analytics (`/analytics`)

### `GET /analytics/summary`
Every figure is a live DB count:
- `platform`: `totalUsers`, `totalFounders`, `totalInvestors`, `totalPosts`,
  `totalConnections`, `acceptedConnections`, `pendingConnections`,
  `totalInterests`, `profileViewsThisWeek` (real PROFILE_VIEW events),
  `totalMatches` (= accepted connections), `matchAccuracy` (accepted/total %).
- `user`: `myConnections`, `myPosts`, `profileViews` (views of *your* profile),
  `connectionRate`.

---

## AI proxy (`/ai`) *(unauthenticated, rate-limited per IP)*

Both endpoints stream **SSE** (`data: {"text": "…"}` frames).

### `POST /ai/question`
Body: `role` (`FOUNDER` | `INVESTOR`; anything else is treated as FOUNDER),
`previousInteraction` (`[{q, a}]`, capped at the last 6 turns × 4000 chars).
→ Streamed question text.

### `POST /ai/evaluate`
Body: `role`, `interaction` (`[{q, a}]`).
→ Streamed JSON report: `score` (0–100), `scoreLetter`, `verdict`, `feedback`,
`dimensionScores` (5 × /20), `competitors[]`, `strengths[]`,
`recommendations[]`, `admissionStatus` (`ADMITTED` ≥70 / `CONDITIONAL` 45–69 /
`REJECTED` <45).

**Failure contract (no fabricated results):** if Gemini is unavailable the
server returns `503 { message }` before streaming, or an SSE frame
`data: {"error": "…"}` mid-stream. The client shows an error + Retry — it never
invents questions or scores.

---

## Socket.IO (dev / self-hosted only; `server.ts`)

- **Auth:** `io({ auth: { token: <JWT> } })` (or `Authorization` header). The
  server derives the sender identity from the token — client-supplied sender
  ids are ignored. Invalid/missing tokens are rejected at the handshake.
- **`send_message`** `{ receiverId, text }` → **ack**
  `{ ok: true, message: { id, senderId, receiverId, text, timestamp, createdAt } }`
  or `{ ok: false, error }`. The message is authorized (accepted connection
  required) and **persisted before delivery**.
- **`receive_message`** → same payload shape, emitted to every online socket of
  the receiver and the sender's other sockets.
- **`typing`** `{ receiverId, isTyping }` → forwarded as
  `{ senderId, isTyping }`.

On Vercel there are no WebSockets; the chat UI automatically falls back to the
REST endpoints above with polling.
