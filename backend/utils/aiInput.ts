/**
 * aiInput.ts — input normalization for the unauthenticated Gemini endpoints.
 *
 * /api/ai/question and /api/ai/evaluate are public (onboarding happens before
 * signup), so the request body is fully attacker-controlled. Unbounded arrays
 * and strings here translate directly into token spend (real money) and can be
 * used to stuff the analyst prompt. These helpers cap everything.
 */

// Keep at most the last 6 exchanges (interview is 5 questions).
const MAX_TURNS = 6;
const MAX_FIELD_LEN = 4000;

export interface Turn {
  q: string;
  a: string;
}

export function sanitizeInteraction(raw: unknown): Turn[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(-MAX_TURNS).map((item: any) => ({
    q: typeof item?.q === 'string' ? item.q.slice(0, MAX_FIELD_LEN) : '',
    a: typeof item?.a === 'string' ? item.a.slice(0, MAX_FIELD_LEN) : '',
  }));
}

export function sanitizeRole(raw: unknown): 'FOUNDER' | 'INVESTOR' {
  return raw === 'INVESTOR' ? 'INVESTOR' : 'FOUNDER';
}
