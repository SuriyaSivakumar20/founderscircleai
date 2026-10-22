/**
 * smoke.mjs — end-to-end smoke test against a RUNNING server.
 *
 * Usage:  npm run dev        (in one terminal)
 *         npm run test:smoke (in another)
 *
 * BASE_URL defaults to http://localhost:3000.
 *
 * Exercises the real product loop with real HTTP:
 *   health → register (x3) → login → feed → connection request →
 *   receiver-only accept → messaging (incl. 403 without connection) →
 *   notifications → read-all → matches + persisted interest →
 *   analytics → profile (PII stripped) → profile update.
 *
 * No test framework, no extra deps — plain fetch + node:assert.
 * Exits non-zero on the first failure.
 */

import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const stamp = Date.now();

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ✓ ${name}`); };

const api = async (method, path, { token, body } = {}) => {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, data };
};

const register = async (role, name) => {
  const { status, data } = await api('POST', '/auth/register', {
    body: {
      email: `smoke-${role.toLowerCase()}-${stamp}-${Math.floor(Math.random() * 1e6)}@bird.ai`,
      password: 'smoketest123',
      name,
      role,
      industry: 'SaaS / B2B',
      location: 'Bengaluru, Karnataka',
      description: 'Smoke test account created by scripts/smoke.mjs.',
    },
  });
  assert.equal(status, 201, `register ${role}: ${JSON.stringify(data)}`);
  assert.ok(data.token, 'register returns a JWT');
  assert.ok(!JSON.stringify(data).includes('smoketest123'), 'password never echoed');
  ok(`register ${role} (${name}) → JWT issued`);
  return data;
};

const main = async () => {
  console.log(`\nB.I.R.D smoke test → ${BASE}\n`);

  // 1. Health
  {
    const { status, data } = await api('GET', '/health');
    assert.equal(status, 200);
    assert.equal(data.status, 'ok');
    ok('health check');
  }

  // 2. Register three users
  const founder = await register('FOUNDER', `Smoke Founder ${stamp}`);
  const investor = await register('INVESTOR', `Smoke Investor ${stamp}`);
  const stranger = await register('FOUNDER', `Smoke Stranger ${stamp}`);

  // 3. /auth/me returns the real user
  {
    const { status, data } = await api('GET', '/auth/me', { token: founder.token });
    assert.equal(status, 200);
    assert.equal(data.email.startsWith('smoke-founder-'), true);
    ok('GET /auth/me returns the authenticated user');
  }

  // 4. Feed is reachable and paginated
  {
    const { status, data } = await api('GET', '/posts/feed?page=1&limit=5', { token: founder.token });
    assert.equal(status, 200);
    assert.ok(Array.isArray(data.posts));
    assert.ok('totalPages' in data);
    ok(`GET /posts/feed paginated (${data.posts.length} posts, ${data.totalPages} pages)`);
  }

  // 5. Connection request: founder → investor
  let connectionId;
  {
    const { status, data } = await api('POST', '/connections', {
      token: founder.token,
      body: { receiverId: investor.user.id },
    });
    assert.equal(status, 201, `sendConnection: ${JSON.stringify(data)}`);
    connectionId = data.connection.id;
    assert.equal(data.connection.status, 'PENDING');
    ok('connection request created (PENDING)');
  }

  // 6. Requester cannot self-accept (receiver-only authorization)
  {
    const { status } = await api('PATCH', `/connections/${connectionId}`, {
      token: founder.token,
      body: { status: 'ACCEPTED' },
    });
    assert.equal(status, 403);
    ok('requester cannot accept their own request (403)');
  }

  // 7. Messaging is blocked before acceptance
  {
    const { status } = await api('POST', '/messages', {
      token: founder.token,
      body: { receiverId: investor.user.id, content: 'Should be blocked.' },
    });
    assert.equal(status, 403);
    ok('messaging blocked without accepted connection (403)');
  }

  // 8. Receiver accepts
  {
    const { status } = await api('PATCH', `/connections/${connectionId}`, {
      token: investor.token,
      body: { status: 'ACCEPTED' },
    });
    assert.equal(status, 200);
    ok('receiver accepted the connection');
  }

  // 9. Real message persists
  let messageId;
  {
    const text = `Hello from the smoke test at ${new Date().toISOString()}`;
    const { status, data } = await api('POST', '/messages', {
      token: founder.token,
      body: { receiverId: investor.user.id, content: text },
    });
    assert.equal(status, 201, `sendMessage: ${JSON.stringify(data)}`);
    assert.ok(data.message.id);
    assert.equal(data.message.content, text);
    messageId = data.message.id;
    ok('message persisted with server id + timestamp');
  }

  // 10. Conversation history round-trips
  {
    const { status, data } = await api('GET', `/messages/${investor.user.id}`, { token: founder.token });
    assert.equal(status, 200);
    assert.ok(data.messages.some(m => m.id === messageId));
    assert.ok('totalPages' in data);
    ok('conversation history contains the persisted message');
  }

  // 11. Conversations list has the peer + unread count
  {
    const { status, data } = await api('GET', '/messages/conversations', { token: investor.token });
    assert.equal(status, 200);
    const convo = data.conversations.find(c => c.peer.id === founder.user.id);
    assert.ok(convo, 'peer appears in conversations');
    assert.equal(convo.unreadCount, 1);
    ok('conversations list: peer + unread count = 1');
  }

  // 12. Stranger cannot read or write this conversation
  {
    const read = await api('GET', `/messages/${investor.user.id}`, { token: stranger.token });
    assert.equal(read.status, 403);
    const write = await api('POST', '/messages', {
      token: stranger.token,
      body: { receiverId: investor.user.id, content: '_intrusive_' },
    });
    assert.equal(write.status, 403);
    ok('third party blocked from reading/writing the conversation (403)');
  }

  // 13. Receiver saw the notification and can mark all read
  {
    const { status, data } = await api('GET', '/notifications', { token: investor.token });
    assert.equal(status, 200);
    assert.ok(data.notifications.length > 0);
    assert.ok(data.unreadCount > 0);
    const readAll = await api('POST', '/notifications/read-all', { token: investor.token });
    assert.equal(readAll.status, 200);
    assert.ok(readAll.data.markedRead >= 1);
    ok(`notifications listed (${data.unreadCount} unread) + read-all (${readAll.data.markedRead} marked)`);
  }

  // 14. Read receipts: message becomes read
  {
    await api('POST', `/messages/${founder.user.id}/read`, { token: investor.token });
    const { data } = await api('GET', '/messages/conversations', { token: founder.token });
    const convo = data.conversations.find(c => c.peer.id === investor.user.id);
    assert.equal(convo.unreadCount, 0);
    ok('markConversationRead clears the unread count');
  }

  // 15. Matches + persisted interest
  let interestEntityId;
  {
    const { status, data } = await api('GET', '/matches', { token: founder.token });
    assert.equal(status, 200);
    assert.ok(Array.isArray(data.matches));
    assert.equal(data.viewerRole, 'FOUNDER');
    assert.ok(data.matches.length > 0, 'seeded investors visible to founder');
    assert.ok('interested' in data.matches[0], 'matches carry the persisted interested flag');
    interestEntityId = data.matches[0].id;
    ok(`GET /matches → ${data.matches.length} scored investors with interested flags`);

    const interest = await api('POST', '/matches/interest', {
      token: founder.token,
      body: { entityId: interestEntityId, entityType: 'investor' },
    });
    assert.equal(interest.status, 201);

    // Idempotent: second call returns the same row, not an error
    const again = await api('POST', '/matches/interest', {
      token: founder.token,
      body: { entityId: interestEntityId, entityType: 'investor' },
    });
    assert.equal(again.status, 201);
    assert.equal(again.data.interest.id, interest.data.interest.id);

    const after = await api('GET', '/matches', { token: founder.token });
    const match = after.data.matches.find(m => m.id === interestEntityId);
    assert.equal(match.interested, true, 'interest persists across requests');
    ok('interest persisted (idempotent) and reflected in GET /matches');
  }

  // 16. Analytics: honest counts
  {
    const { status, data } = await api('GET', '/analytics/summary', { token: founder.token });
    assert.equal(status, 200);
    assert.ok(data.platform.totalMatches >= 1, 'accepted connections counted as matches');
    assert.equal(data.user.myConnections, 1);
    ok('analytics summary reflects the real accepted connection');
  }

  // 17. Profile: email stripped from public view
  {
    const { status, data } = await api('GET', `/users/${investor.user.id}`, { token: founder.token });
    assert.equal(status, 200);
    assert.equal('email' in data, false, 'email must not leak across users');
    assert.ok(data.name);
    ok('GET /users/:id returns a profile without the email (PII)');
  }

  // 18. Profile update persists + rejects javascript: URLs
  {
    const put = await api('PUT', '/users/profile', {
      token: founder.token,
      body: { description: `Updated by smoke test ${stamp}`, website: 'https://example.com' },
    });
    assert.equal(put.status, 200);
    assert.equal(put.data.description, `Updated by smoke test ${stamp}`);

    const bad = await api('PUT', '/users/profile', {
      token: founder.token,
      body: { website: 'javascript:alert(1)' },
    });
    assert.equal(bad.status, 400);
    ok('profile update persists; javascript: URL rejected (400)');
  }

  // 19. Bad credentials are rejected
  {
    const { status } = await api('POST', '/auth/login', {
      body: { email: `smoke-founder-${stamp}@bird.ai`, password: 'wrong-password' },
    });
    assert.equal(status, 401);
    ok('wrong password rejected (401)');
  }

  // 20. Socket.IO handshake: real JWT accepted, forged token rejected
  //     (regression: ESM/CJS interop broke jwt.verify on dynamic import,
  //      which made every legitimate handshake fail as "invalid token")
  {
    const { io } = await import('socket.io-client');
    const connectWith = (auth) => new Promise((resolve) => {
      const s = io(BASE, { auth, reconnection: false, timeout: 5000, transports: ['websocket'] });
      const done = (result) => { try { s.close(); } catch { /* already closed */ } resolve(result); };
      s.on('connect', () => done('connected'));
      s.on('connect_error', () => done('rejected'));
      setTimeout(() => done('timeout'), 6000);
    });

    assert.equal(await connectWith({ token: founder.token }), 'connected',
      'valid JWT must be accepted by the socket handshake');
    assert.equal(await connectWith({ token: 'forged.token.here' }), 'rejected',
      'forged JWT must be rejected by the socket handshake');
    assert.equal(await connectWith({}), 'rejected',
      'missing token must be rejected by the socket handshake');
    ok('socket handshake: valid JWT accepted, forged/missing token rejected');
  }

  console.log(`\n✅ Smoke test passed — ${passed} checks against ${BASE}\n`);
};

main().catch((err) => {
  console.error(`\n❌ Smoke test FAILED: ${err.message}\n`);
  if (String(err.message).includes('fetch failed')) {
    console.error(`Is the server running at ${BASE}? Start it with: npm run dev\n`);
  }
  process.exit(1);
});
