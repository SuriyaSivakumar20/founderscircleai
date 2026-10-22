
// ─────────────────────────────────────────────
// All Gemini calls are proxied through the Express server
// so the API key stays secure (server-side env) and never
// touches the browser bundle.
//
// Honesty contract: if the AI backend is unavailable the server
// returns a real error (HTTP 503 or an SSE error frame). These
// functions throw in that case — they never fabricate questions
// or evaluation results. The UI renders an error + retry state.
// ─────────────────────────────────────────────

export interface EvaluationResult {
  score: number;             // 0–100
  scoreLetter: string;       // A / B / C / D
  verdict: string;           // One-line verdict
  feedback: string;          // Narrative analysis
  dimensionScores: {
    differentiation: number;
    competitivePositioning: number;
    businessViability: number;
    strategyClarity: number;
    innovationFactor: number;
  };
  competitors: string[];
  strengths: string[];
  recommendations: string[];
  admissionStatus: 'ADMITTED' | 'CONDITIONAL' | 'REJECTED';
}

// ── Helper to read SSE stream ──────────────────
async function readSseStream(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No readable stream available');
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith('data:')) continue;
      const jsonStr = line.slice(5).trim();
      if (!jsonStr) continue;
      try {
        const parsed = JSON.parse(jsonStr);
        // Server-side failure signalled mid-stream — surface it honestly.
        if (parsed && typeof parsed === 'object' && 'error' in parsed) {
          throw new Error(String(parsed.error));
        }
        if (parsed && typeof parsed === 'object' && 'text' in parsed) {
          fullText += parsed.text;
        }
      } catch (e) {
        if (e instanceof Error && e.message && !e.message.startsWith('JSON')) throw e;
        // Non-JSON keep-alive lines are ignored.
      }
    }
  }
  return fullText;
}

async function streamGeminiRequest(endpoint: string, body: object): Promise<string> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // Pre-stream failure: the server sends { message } with a 5xx status.
    let message = 'AI service is currently unavailable. Please retry in a moment.';
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch { /* keep default message */ }
    throw new Error(message);
  }

  const text = await readSseStream(res);
  if (!text.trim()) {
    throw new Error('The AI returned an empty response. Please retry.');
  }
  return text;
}

// ── Generate Next Question ─────────────────────
export const generateNextQuestion = async (
  role: string,
  previousInteraction: { q: string; a: string }[]
): Promise<string> => {
  return streamGeminiRequest('/api/ai/question', { role, previousInteraction });
};

// ── Evaluate Interview ─────────────────────────
export const evaluateInterview = async (
  role: string,
  interaction: { q: string; a: string }[]
): Promise<EvaluationResult> => {
  const fullJson = await streamGeminiRequest('/api/ai/evaluate', { role, interaction });

  // Extract JSON from potential markdown wrapping
  const jsonMatch = fullJson.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('The AI returned an invalid evaluation. Please retry.');
  }

  let evaluation: EvaluationResult;
  try {
    evaluation = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('The AI returned an invalid evaluation. Please retry.');
  }

  // Server enforces the rubric; clamp defensively so a bad model response
  // can never display a score outside 0–100.
  evaluation.score = Math.max(0, Math.min(100, Math.round(evaluation.score)));
  return evaluation;
};
