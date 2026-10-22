import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeInteraction, sanitizeRole } from '../../backend/utils/aiInput.js';

test('sanitizeInteraction: non-array input becomes empty list', () => {
  assert.deepEqual(sanitizeInteraction(undefined), []);
  assert.deepEqual(sanitizeInteraction('nope'), []);
  assert.deepEqual(sanitizeInteraction({ q: 'x', a: 'y' }), []);
  assert.deepEqual(sanitizeInteraction(42), []);
});

test('sanitizeInteraction: keeps only the last 6 exchanges (token-spend cap)', () => {
  const turns = Array.from({ length: 20 }, (_, i) => ({ q: `q${i}`, a: `a${i}` }));
  const result = sanitizeInteraction(turns);
  assert.equal(result.length, 6);
  assert.equal(result[0].q, 'q14'); // 20 turns → last six are 14..19
  assert.equal(result[5].a, 'a19');
});

test('sanitizeInteraction: caps each field at 4000 chars', () => {
  const huge = 'x'.repeat(10_000);
  const [turn] = sanitizeInteraction([{ q: huge, a: huge }]);
  assert.equal(turn.q.length, 4000);
  assert.equal(turn.a.length, 4000);
});

test('sanitizeInteraction: non-string fields become empty strings', () => {
  const [turn] = sanitizeInteraction([{ q: 123, a: { evil: true } }]);
  assert.equal(turn.q, '');
  assert.equal(turn.a, '');
});

test('sanitizeRole: only INVESTOR is accepted, everything else is FOUNDER', () => {
  assert.equal(sanitizeRole('INVESTOR'), 'INVESTOR');
  assert.equal(sanitizeRole('FOUNDER'), 'FOUNDER');
  // Attacker-controlled values never escalate: ADMIN/garbage → FOUNDER
  assert.equal(sanitizeRole('ADMIN'), 'FOUNDER');
  assert.equal(sanitizeRole('admin'), 'FOUNDER');
  assert.equal(sanitizeRole(null), 'FOUNDER');
  assert.equal(sanitizeRole(['INVESTOR']), 'FOUNDER');
});
