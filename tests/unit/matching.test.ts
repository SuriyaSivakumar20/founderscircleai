import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMatchScore, getMatchLabel } from '../../backend/utils/matchingEngine.js';

const founder = {
  role: 'FOUNDER',
  industry: 'Fintech / Payments',
  stage: 'Seed',
  location: 'Bengaluru, Karnataka',
  targetRaise: 10,
};

test('sector: exact match scores 40', () => {
  const score = computeMatchScore(founder, {
    id: '1', name: 'VC', industry: 'Fintech / Payments', stage: 'Seed',
    location: 'Bengaluru, Karnataka', minCheckSize: 5, maxCheckSize: 20,
  });
  assert.ok(score >= 40, `expected >= 40, got ${score}`);
});

test('sector: same broad group scores 20 (partial)', () => {
  const score = computeMatchScore(
    { role: 'FOUNDER', industry: 'Fintech' },
    { id: '1', name: 'VC', industry: 'Payments' }
  );
  // 20 (sector group) + 10 (stage neutral) + 5 (geo neutral) + 5 (ticket neutral) = 40
  assert.equal(score, 40);
});

test('sector: unrelated industries score 0 for sector', () => {
  const score = computeMatchScore(
    { role: 'FOUNDER', industry: 'EdTech' },
    { id: '1', name: 'VC', industry: 'Logistics' }
  );
  assert.equal(score, 20); // 0 sector + 10 stage-neutral + 5 geo + 5 ticket
});

test('stage: exact = 30, adjacent = 15, unknown user = 10, far apart = 0', () => {
  const base = { role: 'FOUNDER', industry: 'Fintech' };
  const exact = computeMatchScore({ ...base, stage: 'Seed' }, { id: 'x', name: 'x', stage: 'Seed' });
  const adjacent = computeMatchScore({ ...base, stage: 'Seed' }, { id: 'x', name: 'x', stage: 'Series A' });
  const unknown = computeMatchScore(base, { id: 'x', name: 'x', stage: 'Series A' });
  const far = computeMatchScore({ ...base, stage: 'Pre-Seed' }, { id: 'x', name: 'x', stage: 'Series C' });
  assert.equal(exact, 40);    // 0 sector + 30 stage + 5 geo + 5 ticket
  assert.equal(adjacent, 25); // 0 + 15 + 5 + 5
  assert.equal(unknown, 20);  // 0 + 10 (stage neutral) + 5 + 5
  assert.equal(far, 10);      // 0 + 0 + 5 + 5
});

test('geography: exact city = 15, shared token = 10, different = 0, unknown = 5', () => {
  const base = { role: 'FOUNDER' as const };
  const c = (location?: string) => ({ id: 'x', name: 'x', location });
  const exact  = computeMatchScore({ ...base, location: 'Bengaluru' }, c('Bengaluru'));
  const shared = computeMatchScore({ ...base, location: 'Bengaluru, Karnataka' }, c('Mysuru, Karnataka'));
  const diff   = computeMatchScore({ ...base, location: 'Bengaluru' }, c('Mumbai'));
  const unk    = computeMatchScore(base, c('Bengaluru'));
  assert.equal(exact, 15 + 10 + 5);   // geo 15 + stage-neutral 10 + ticket-neutral 5
  assert.equal(shared, 10 + 10 + 5);
  assert.equal(diff, 0 + 10 + 5);
  assert.equal(unk, 5 + 10 + 5);
});

test('ticket: founder raise inside investor range = 15, partial = 7, outside = 0', () => {
  const inRange = computeMatchScore(
    { role: 'FOUNDER', targetRaise: 10 },
    { id: 'x', name: 'VC', minCheckSize: 5, maxCheckSize: 20 }
  );
  const partial = computeMatchScore(
    { role: 'FOUNDER', targetRaise: 9 },
    { id: 'x', name: 'VC', minCheckSize: 5, maxCheckSize: 5 } // 9 > max, but <= max*2 → partial
  );
  const outside = computeMatchScore(
    { role: 'FOUNDER', targetRaise: 500 },
    { id: 'x', name: 'VC', minCheckSize: 1, maxCheckSize: 2 }
  );
  assert.equal(inRange, 30); // 0 sector + 10 stage-neutral + 5 geo + 15 ticket
  assert.equal(partial, 22); // 0 + 10 + 5 + 7
  assert.equal(outside, 15); // 0 + 10 + 5 + 0
});

test('investor viewing companies: ticket uses investor check size vs company raise', () => {
  const investor = { role: 'INVESTOR', minCheckSize: 2, maxCheckSize: 10 };
  const fit = computeMatchScore(investor, { id: 'c', name: 'Startup', targetRaise: 5 });
  const noFit = computeMatchScore(investor, { id: 'c', name: 'Startup', targetRaise: 90 });
  assert.equal(fit, 30);  // 0 sector + 10 stage-neutral + 5 geo + 15 ticket
  assert.equal(noFit, 15); // 0 + 10 + 5 + 0
});

test('score is capped at 100', () => {
  const perfect = computeMatchScore(
    { role: 'FOUNDER', industry: 'Fintech', stage: 'Seed', location: 'Bengaluru', targetRaise: 10 },
    { id: 'x', name: 'VC', industry: 'Fintech', stage: 'Seed', location: 'Bengaluru', minCheckSize: 5, maxCheckSize: 20 }
  );
  assert.equal(perfect, 100); // 40 + 30 + 15 + 15
});

test('match labels use documented thresholds', () => {
  assert.equal(getMatchLabel(85), 'High Match');
  assert.equal(getMatchLabel(80), 'High Match');
  assert.equal(getMatchLabel(79), 'Good Match');
  assert.equal(getMatchLabel(60), 'Good Match');
  assert.equal(getMatchLabel(59), 'Moderate');
  assert.equal(getMatchLabel(40), 'Moderate');
  assert.equal(getMatchLabel(39), 'Low Match');
});
