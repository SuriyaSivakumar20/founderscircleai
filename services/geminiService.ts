
import { UserRole } from "../types";

// ─────────────────────────────────────────────
// All Gemini calls are proxied through the Express server
// so the API key stays secure (server-side env) and never
// touches the browser bundle.
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

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunkStr = decoder.decode(value, { stream: true });
    const lines = chunkStr.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.text) fullText += data.text;
        } catch (e) {
          // Ignore JSON parse errors for incomplete chunks
        }
      }
    }
  }
  return fullText;
}

// ── Generate next question ────────────────────
export async function generateNextQuestion(
  role: UserRole,
  previousInteraction: { q: string; a: string }[]
): Promise<string> {
  try {
    const res = await fetch('/api/ai/question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, previousInteraction }),
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    let text = '';
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('text/event-stream')) {
      text = await readSseStream(res);
    } else {
      const data = await res.json();
      text = data.question || '';
    }

    return text.trim() || getFallbackQuestion(role, previousInteraction.length + 1);
  } catch (e) {
    console.error('generateNextQuestion failed:', e);
    return getFallbackQuestion(role, previousInteraction.length + 1);
  }
}

// ── Evaluate interview ────────────────────────
export async function evaluateInterview(
  role: UserRole,
  interaction: { q: string; a: string }[]
): Promise<EvaluationResult> {
  try {
    const res = await fetch('/api/ai/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, interaction }),
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    let data: any = {};
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('text/event-stream')) {
      const fullText = await readSseStream(res);
      data = JSON.parse(fullText || '{}');
    } else {
      data = await res.json();
    }

    if (!data.admissionStatus) {
      data.admissionStatus = data.score >= 70 ? 'ADMITTED' : data.score >= 45 ? 'CONDITIONAL' : 'REJECTED';
    }
    return data as EvaluationResult;
  } catch (e) {
    console.error('evaluateInterview failed:', e);
    return {
      score: 50, scoreLetter: 'C',
      verdict: 'Evaluation incomplete — partial score assigned.',
      feedback: 'The AI synthesis engine encountered an issue. Please retry for a full evaluation.',
      dimensionScores: { differentiation: 10, competitivePositioning: 10, businessViability: 10, strategyClarity: 10, innovationFactor: 10 },
      competitors: [], strengths: [], recommendations: ['Resubmit for full evaluation'],
      admissionStatus: 'CONDITIONAL',
    };
  }
}

// ── Match profiles ───────────────────────────
export async function getMatches(userProfile: any, otherProfiles: any[]): Promise<string[]> {
  try {
    const res = await fetch('/api/ai/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userProfile, otherProfiles }),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// ── Fallback questions (when server call fails) ──
function getFallbackQuestion(role: UserRole, questionNumber: number): string {
  const founderFallbacks = [
    "What specific problem are you solving, and why have companies like existing incumbents failed to solve it at scale?",
    "You've described your product — how does your unit economics compare to similar businesses, and what is your estimated margin profile?",
    "What is your distribution moat? Give me a concrete reason why a well-funded competitor cannot replicate your go-to-market in 18 months.",
    "Who is your primary customer, and what is the one behavioral insight about them that your competitors have fundamentally missed?",
    "If a market leader entered your exact segment tomorrow with 10x your capital, what is your defensible asymmetric advantage?",
  ];
  const investorFallbacks = [
    "What is the core thesis behind your investment strategy, and in which sector do you believe you have a genuine information asymmetry?",
    "How do you evaluate founder-market fit — what specific signals separate a domain native from someone who has merely researched the problem?",
    "Describe your follow-on investment policy — when do you double down, and what metrics trigger a write-off decision?",
    "How does your value-add differentiate from a purely capital-providing LP — what operational or network leverage can you deploy?",
    "Walk me through your portfolio construction logic — stage mix, sector concentration limits, and target return multiple.",
  ];
  const fallbacks = role === 'FOUNDER' ? founderFallbacks : investorFallbacks;
  return fallbacks[Math.min(questionNumber - 1, fallbacks.length - 1)];
}

// ── Backward-compat export object ────────────
export const geminiService = {
  generateNextQuestion,
  evaluateInterview,
  getMatches,
};
