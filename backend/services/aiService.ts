import type { Express, Request, Response } from 'express';
import { rateLimit } from '../config/security.js';
import { sanitizeInteraction, sanitizeRole } from '../utils/aiInput.js';

/**
 * aiService — the single source of truth for the Gemini proxy routes.
 *
 * Both entry points (server.ts for dev, api/index.ts for Vercel) register these
 * routes via registerAiRoutes(app) so the prompt logic can never drift apart.
 *
 * Honesty contract: if Gemini is unavailable (missing key, quota, network),
 * these endpoints return a REAL error (503 JSON before streaming, or an SSE
 * error frame mid-stream). They never fabricate questions or evaluation
 * scores — the client renders an error state with a retry button.
 */

const STARTUP_KNOWLEDGE_BASE = `
[STARTUP DATASET]
1. Detect Technologies (Industrial AI, Chennai): AI-powered inspection platform (T-Pulse). Moat: automated inspection. Investors: Accel, Elevation.
2. WayCool Foods (Agri-tech/Supply Chain, Chennai): Farm-to-retail supply chain. Target: Retailers, kirana. Investors: Lightrock, FMO.
3. Ather Energy (Electric Vehicles, Bangalore): Smart electric scooters. Investors: Hero MotoCorp, Tiger Global.
4. Yulu (Mobility/EV, Bangalore): Shared electric micro-mobility. Investors: Magna, Blume Ventures.
5. Khatabook (Fintech, Bangalore): Digital ledger app for SMBs. Investors: Sequoia India, Tencent.
[END DATASET]
`;

const MODEL = () => process.env.GEMINI_MODEL || 'gemini-3.8-flash';

function setSseHeaders(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
}

/** End an SSE response with an explicit error frame the client can detect. */
function endWithError(res: Response, message: string) {
  if (res.headersSent) {
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  } else {
    res.status(503).json({ message });
  }
}

function registerAiRoutes(app: Express, limiter: ReturnType<typeof rateLimit>) {
  // ── POST /api/ai/question — next interview question (SSE) ─────────────────
  app.post('/api/ai/question', limiter, async (req: Request, res: Response) => {
    const role = sanitizeRole(req.body?.role);
    const previousInteraction = sanitizeInteraction(req.body?.previousInteraction);

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

      const conversationHistory = previousInteraction
        .map((i, idx) => `Exchange ${idx + 1}:\nAnalyst: ${i.q}\nSubject: ${i.a}`)
        .join('\n\n');

      const questionNumber = previousInteraction.length + 1;
      const isFirst = questionNumber === 1;

      const ANALYST_PERSONA = `You are a senior strategic analyst at B.I.R.D (Business Intelligence & Resource Development), an elite investor-startup matching network.\n\n${STARTUP_KNOWLEDGE_BASE}`;
      const founderDirective = `Subject is a startup founder. Match their idea to the closest startup in the dataset. Name the company. Challenge them: "Why will you win against [Company]?"`;
      const investorDirective = `Subject is a VC/investor. Probe investment thesis. Use dataset companies as real-world benchmarks.`;
      const directive = role === 'FOUNDER' ? founderDirective : investorDirective;

      const prompt = isFirst
        ? `${ANALYST_PERSONA}\n\n${directive}\n\nQuestion 1 of 5. Ask a sharp opening question to identify their industry for benchmarking. Return ONLY the question text.`
        : `${ANALYST_PERSONA}\n\n${directive}\n\nConversation:\n${conversationHistory}\n\nQuestion ${questionNumber} of 5. Based on their last answer, name a dataset company and demand specific differentiation. Return ONLY the question text.`;

      const responseStream = await ai.models.generateContentStream({
        model: MODEL(),
        contents: prompt,
      });

      setSseHeaders(res);
      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
      res.end();
    } catch (err: any) {
      console.error('AI question error:', err?.message);
      endWithError(res, 'The AI analyst is currently unavailable. Please retry in a moment.');
    }
  });

  // ── POST /api/ai/evaluate — full interview evaluation (SSE of one JSON) ──
  app.post('/api/ai/evaluate', limiter, async (req: Request, res: Response) => {
    const role = sanitizeRole(req.body?.role);
    const interaction = sanitizeInteraction(req.body?.interaction);

    // SECURITY: no client-supplied admission bypass exists. Scores come only
    // from the model, and the client cannot influence the rubric.

    try {
      const { GoogleGenAI, Type } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

      const log = interaction.map((i, idx) => `Q${idx + 1}: ${i.q}\nA${idx + 1}: ${i.a}`).join('\n\n');
      const roleContext = role === 'FOUNDER' ? 'startup founder' : 'venture capitalist';

      const prompt = `You are a rigorous strategic analyst at B.I.R.D evaluating a ${roleContext} for platform admission.\n\n${STARTUP_KNOWLEDGE_BASE}\n\nInterview:\n${log}\n\nScore each dimension out of 20 (total = 100): differentiation, competitivePositioning, businessViability, strategyClarity, innovationFactor.\nAdmission: ADMITTED if >=70, CONDITIONAL if 45-69, REJECTED if <45.\nReturn JSON only.`;

      const responseStream = await ai.models.generateContentStream({
        model: MODEL(),
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              scoreLetter: { type: Type.STRING },
              verdict: { type: Type.STRING },
              feedback: { type: Type.STRING },
              dimensionScores: {
                type: Type.OBJECT,
                properties: {
                  differentiation: { type: Type.NUMBER },
                  competitivePositioning: { type: Type.NUMBER },
                  businessViability: { type: Type.NUMBER },
                  strategyClarity: { type: Type.NUMBER },
                  innovationFactor: { type: Type.NUMBER },
                },
                required: ['differentiation', 'competitivePositioning', 'businessViability', 'strategyClarity', 'innovationFactor'],
              },
              competitors: { type: Type.ARRAY, items: { type: Type.STRING } },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
              admissionStatus: { type: Type.STRING },
            },
            required: ['score', 'scoreLetter', 'verdict', 'feedback', 'dimensionScores', 'competitors', 'strengths', 'recommendations', 'admissionStatus'],
          },
        },
      });

      setSseHeaders(res);
      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
      res.end();
    } catch (err: any) {
      console.error('AI evaluate error:', err?.message);
      endWithError(res, 'The AI evaluation is currently unavailable. Please retry in a moment.');
    }
  });
}

export { registerAiRoutes };
