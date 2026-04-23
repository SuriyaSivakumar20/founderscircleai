/**
 * api/index.ts — Vercel Serverless Entry Point
 * B.I.R.D — Business Intelligence & Resource Development
 *
 * This file is the single Express app that Vercel routes all /api/* traffic to.
 * It mirrors every route in server.ts but without Vite/Socket.io (not needed in serverless).
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from '../backend/routes/authRoutes.js';
import postRoutes from '../backend/routes/postRoutes.js';
import userRoutes from '../backend/routes/userRoutes.js';
import matchRoutes from '../backend/routes/matchRoutes.js';
import connectionRoutes from '../backend/routes/connectionRoutes.js';
import analyticsRoutes from '../backend/routes/analyticsRoutes.js';
import notificationRoutes from '../backend/routes/notificationRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ── All API Routes ────────────────────────────────────────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/posts",         postRoutes);
app.use("/api/users",         userRoutes);
app.use("/api/matches",       matchRoutes);
app.use("/api/connections",   connectionRoutes);
app.use("/api/analytics",     analyticsRoutes);
app.use("/api/notifications", notificationRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    platform: "B.I.R.D — Business Intelligence & Resource Development",
    env: process.env.NODE_ENV,
    vercel: true,
  });
});

// ── AI Routes (Gemini) ────────────────────────────────────────────────────────
const STARTUP_KNOWLEDGE_BASE = `
[STARTUP DATASET]
1. Detect Technologies (Industrial AI, Chennai): AI-powered inspection platform (T-Pulse). Moat: automated inspection. Investors: Accel, Elevation.
2. WayCool Foods (Agri-tech/Supply Chain, Chennai): Farm-to-retail supply chain. Target: Retailers, kirana. Investors: Lightrock, FMO.
3. Ather Energy (Electric Vehicles, Bangalore): Smart electric scooters. Investors: Hero MotoCorp, Tiger Global.
4. Yulu (Mobility/EV, Bangalore): Shared electric micro-mobility. Investors: Magna, Blume Ventures.
5. Khatabook (Fintech, Bangalore): Digital ledger app for SMBs. Investors: Sequoia India, Tencent.
[END DATASET]
`;

app.post("/api/ai/question", async (req, res) => {
  const { role, previousInteraction } = req.body;
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

    const conversationHistory = (previousInteraction || [])
      .map((i: any, idx: number) => `Exchange ${idx + 1}:\nAnalyst: ${i.q}\nSubject: ${i.a}`)
      .join("\n\n");

    const questionNumber = (previousInteraction || []).length + 1;
    const isFirst = questionNumber === 1;

    const ANALYST_PERSONA = `You are a senior strategic analyst at B.I.R.D (Business Intelligence & Resource Development), an elite investor-startup matching network.\n\n${STARTUP_KNOWLEDGE_BASE}`;
    const founderDirective = `Subject is a startup founder. Match their idea to the closest startup in the dataset. Name the company. Challenge them: "Why will you win against [Company]?"`;
    const investorDirective = `Subject is a VC/investor. Probe investment thesis. Use dataset companies as real-world benchmarks.`;
    const directive = role === "FOUNDER" ? founderDirective : investorDirective;

    const prompt = isFirst
      ? `${ANALYST_PERSONA}\n\n${directive}\n\nQuestion 1 of 5. Ask a sharp opening question to identify their industry for benchmarking. Return ONLY the question text.`
      : `${ANALYST_PERSONA}\n\n${directive}\n\nConversation:\n${conversationHistory}\n\nQuestion ${questionNumber} of 5. Based on their last answer, name a dataset company and demand specific differentiation. Return ONLY the question text.`;

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for await (const chunk of responseStream) {
      if (chunk.text) res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
    }
    res.end();
  } catch (err: any) {
    console.error("AI question error:", err.message);
    // Graceful fallback — onboarding never crashes on rate limit
    const fallbackQuestions = [
      "Describe your startup's core product and the primary problem it solves in one sentence.",
      "Who is your ideal customer, and how are you currently acquiring them?",
      "What is your current monthly revenue, and what drove your last month of growth?",
      "Who are your top 3 competitors and what specifically makes you better?",
      "What will you use the funding for, and what milestones will it unlock?",
    ];
    const qIdx = Math.min((req.body.previousInteraction || []).length, fallbackQuestions.length - 1);
    if (!res.headersSent) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.write(`data: ${JSON.stringify({ text: fallbackQuestions[qIdx] })}\n\n`);
      res.end();
    }
  }
});

app.post("/api/ai/evaluate", async (req, res) => {
  const { role, interaction } = req.body;

  // Backdoor bypass
  const lastAnswer = interaction?.length > 0 ? interaction[interaction.length - 1].a?.toLowerCase()?.trim() : "";
  if (lastAnswer === "founders backdoor bypass") {
    return res.json({
      score: 96, scoreLetter: "A",
      verdict: "Exceptional strategic clarity — direct admission granted.",
      feedback: "Override credentials accepted.",
      dimensionScores: { differentiation: 20, competitivePositioning: 19, businessViability: 19, strategyClarity: 20, innovationFactor: 18 },
      competitors: [], strengths: ["Full strategic clarity"], recommendations: [],
      admissionStatus: "ADMITTED",
    });
  }

  try {
    const { GoogleGenAI, Type } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

    const log = (interaction || []).map((i: any, idx: number) => `Q${idx + 1}: ${i.q}\nA${idx + 1}: ${i.a}`).join("\n\n");
    const roleContext = role === "FOUNDER" ? "startup founder" : "venture capitalist";

    const prompt = `You are a rigorous strategic analyst at B.I.R.D evaluating a ${roleContext} for platform admission.\n\n${STARTUP_KNOWLEDGE_BASE}\n\nInterview:\n${log}\n\nScore each dimension out of 20 (total=100): differentiation, competitivePositioning, businessViability, strategyClarity, innovationFactor.\nAdmission: ADMITTED if >=70, CONDITIONAL if 45-69, REJECTED if <45.\nReturn JSON only.`;

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
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
              required: ["differentiation", "competitivePositioning", "businessViability", "strategyClarity", "innovationFactor"],
            },
            competitors: { type: Type.ARRAY, items: { type: Type.STRING } },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            admissionStatus: { type: Type.STRING },
          },
          required: ["score", "scoreLetter", "verdict", "feedback", "dimensionScores", "competitors", "strengths", "recommendations", "admissionStatus"],
        },
      },
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for await (const chunk of responseStream) {
      if (chunk.text) res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
    }
    res.end();
  } catch (err: any) {
    console.error("AI evaluate error:", err.message);
    // Fallback evaluation — never block onboarding
    if (!res.headersSent) {
      const fallback = {
        score: 65, scoreLetter: "B",
        verdict: "Conditional admission — demonstrates potential with refinement needed.",
        feedback: "AI evaluation temporarily unavailable. Deterministic baseline score applied.",
        dimensionScores: { differentiation: 12, competitivePositioning: 13, businessViability: 14, strategyClarity: 13, innovationFactor: 13 },
        competitors: [],
        strengths: ["Clear problem identification", "Demonstrated domain knowledge"],
        recommendations: ["Sharpen competitive differentiation narrative", "Quantify traction metrics precisely"],
        admissionStatus: "CONDITIONAL",
      };
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.write(`data: ${JSON.stringify({ text: JSON.stringify(fallback) })}\n\n`);
      res.end();
    }
  }
});

export default app;
