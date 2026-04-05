
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import { seedDatabase } from "./backend/utils/seed";
import authRoutes from "./backend/routes/authRoutes";
import postRoutes from "./backend/routes/postRoutes";
import userRoutes from "./backend/routes/userRoutes";
import prisma from "./backend/prismaClient";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Database sync and seed
  const shouldSeed = process.env.SEED_DB === 'true';
  if (shouldSeed) {
    await seedDatabase();
  }

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/posts", postRoutes);
  app.use("/api/users", userRoutes);

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // ── AI Proxy Routes (Gemini runs server-side, API key is secure) ───────────
  const STARTUP_KNOWLEDGE_BASE = `
[STARTUP DATASET]
1. Detect Technologies (Industrial AI, Chennai): Founders: Sriram Ramachandran. Product: AI-powered inspection platform (T-Pulse). Target: Oil & gas, infra. Moat: AI-based automated inspection reducing manual risk. Investors: Accel, Elevation.
2. WayCool Foods (Agri-tech/Supply Chain, Chennai): Founders: Karthik Jayaraman. Product: Farm-to-retail supply chain platform. Model: B2B distribution + logistics margins. Target: Retailers, kirana stores. Moat: Efficient sourcing + reduced wastage. Investors: Lightrock, FMO.
3. Ather Energy (Electric Vehicles, Bangalore): Founders: Tarun Mehta, Swapnil Jain. Product: Smart electric scooters + charging infra. Target: Urban commuters. Moat: Integrated EV ecosystem. Investors: Hero MotoCorp, Tiger Global.
4. Yulu (Mobility/EV, Bangalore): Founders: Amit Gupta. Product: Shared electric micro-mobility. Target: Urban daily commuters. Moat: Last-mile mobility focus. Investors: Magna, Blume Ventures.
5. Khatabook (Fintech, Bangalore): Founders: Ravish Naresh. Product: Digital ledger app for SMBs. Model: Freemium -> financial services. Target: Kirana stores. Moat: Simplicity + mass adoption. Investors: Sequoia India, Tencent.
[END DATASET]
`;

  app.post("/api/ai/question", async (req, res) => {
    const { role, previousInteraction } = req.body;
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '' });

      const conversationHistory = (previousInteraction || [])
        .map((i: any, idx: number) => `Exchange ${idx + 1}:\nAnalyst: ${i.q}\nSubject: ${i.a}`)
        .join('\n\n');

      const questionNumber = (previousInteraction || []).length + 1;
      const isFirst = questionNumber === 1;

      const ANALYST_PERSONA = `You are a senior strategic analyst and partner at FoundersCircle, an elite private investor network. You are a real-world benchmark-driven evaluator. You NEVER use generic openers. \n\n${STARTUP_KNOWLEDGE_BASE}`;

      const founderDirective = `The subject is a startup founder. CRITICAL INSTRUCTION: Dynamically match their idea to the closest startup in the [STARTUP DATASET]. If EV -> compare with Ather/Yulu. If Supply Chain -> WayCool. If Fintech SMB -> Khatabook. You MUST explicitly name the company and challenge them with real benchmarks. Always push the founder to answer: "Why will you win against [Company]?" or highlight gaps in their differentiation versus the dataset company. DO NOT hallucinate.`;
      
      const investorDirective = `The subject is a VC/investor. Probe: investment thesis & sector focus. Use the companies in the dataset as real-world benchmarks to test their thesis. Example: "If you are bullish on EV hardware, why haven't you invested in a play like Ather Energy?"`;

      const directive = role === 'FOUNDER' ? founderDirective : investorDirective;

      const prompt = isFirst
        ? `${ANALYST_PERSONA}\n\n${directive}\n\nThis is Question 1 of 5. Ask a sharp boundary-setting question to identify their exact industry so you can benchmark them. Return ONLY the question text.`
        : `${ANALYST_PERSONA}\n\n${directive}\n\nConversation so far:\n${conversationHistory}\n\nThis is Question ${questionNumber} of 5. Based specifically on their last answer, MATCH their domain to a company in the dataset, call out the company by name, and demand to know how they are differentiated. Return ONLY the question text.`;

      const responseStream = await ai.models.generateContentStream({ model: 'gemini-2.0-flash', contents: prompt });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
      res.end();
    } catch (err: any) {
      console.error('AI question route error:', err.message);
      // Fallback for stream error
      if (!res.headersSent) {
        res.status(500).json({ error: err.message, question: null });
      } else {
        res.end();
      }
    }
  });

  app.post("/api/ai/evaluate", async (req, res) => {
    const { role, interaction } = req.body;

    // Backdoor bypass
    const lastAnswer = interaction?.length > 0 ? interaction[interaction.length - 1].a?.toLowerCase()?.trim() : '';
    if (lastAnswer === 'founders backdoor bypass') {
      return res.json({
        score: 96, scoreLetter: 'A',
        verdict: 'Exceptional strategic clarity — direct admission granted.',
        feedback: 'Override credentials accepted. Subject exhibits institutional-grade acuity across all evaluation vectors.',
        dimensionScores: { differentiation: 20, competitivePositioning: 19, businessViability: 19, strategyClarity: 20, innovationFactor: 18 },
        competitors: [], strengths: ['Full strategic clarity', 'Override credentials verified'], recommendations: [],
        admissionStatus: 'ADMITTED',
      });
    }

    try {
      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '' });

      const log = (interaction || []).map((i: any, idx: number) => `Q${idx + 1}: ${i.q}\nA${idx + 1}: ${i.a}`).join('\n\n');
      const roleContext = role === 'FOUNDER' ? 'startup founder' : 'venture capitalist';

      const prompt = `You are a rigorous strategic analyst evaluating a ${roleContext} for elite network admission.
      
${STARTUP_KNOWLEDGE_BASE}

Full interview:
${log}

EVALUATION RULES: 
If the founder was challenged by a benchmark company (e.g. Ather, WayCool, Khatabook) and failed to provide a highly convincing, specific differentiation or moat against them, heavily DOCK points from their Differentiation and Strategy Clarity scores.

Score each dimension out of 20 (total = 100):
1. Differentiation (0-20): uniqueness vs dataset competitors
2. Competitive Positioning (0-20): knowledge of real market players
3. Business Viability (0-20): financial soundness of model/thesis
4. Strategy Clarity (0-20): specificity and coherence of answers
5. Innovation Factor (0-20): genuine edge or insight

Sum = total score.
Admission: ADMITTED if >=70, CONDITIONAL if 45-69, REJECTED if <45.
Identify real competitors/companies mentioned or implied.
Write 2-3 specific strengths and 2-3 actionable improvement areas.
Verdict = one sentence of 10-15 words.

Return JSON only.`;

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.0-flash',
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

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
      res.end();
    } catch (err: any) {
      console.error('AI evaluate route error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      } else {
        res.end();
      }
    }
  });


  // ── Connection Request Endpoints ────────────────────────────────────────────
  // In-memory store (no schema change needed — persists per server session)
  const connectionRequests: { id: string; fromUserId: string; toEntityId: string; status: string; createdAt: string }[] = [];

  // POST /api/connections — send a connection request
  app.post("/api/connections", async (req, res) => {
    try {
      const { fromUserId, toEntityId } = req.body;
      if (!fromUserId || !toEntityId) {
        return res.status(400).json({ error: "fromUserId and toEntityId are required" });
      }
      // Check for duplicate
      const existing = connectionRequests.find(c => c.fromUserId === fromUserId && c.toEntityId === toEntityId);
      if (existing) {
        return res.json({ connection: existing, duplicate: true });
      }
      const connection = {
        id: Math.random().toString(36).substr(2, 9),
        fromUserId,
        toEntityId,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      };
      connectionRequests.push(connection);
      res.status(201).json({ connection });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/connections/:userId — list connection requests by a user
  app.get("/api/connections/:userId", (req, res) => {
    const { userId } = req.params;
    const requests = connectionRequests.filter(c => c.fromUserId === userId);
    res.json({ connections: requests });
  });

  // PATCH /api/connections/:id — update status (ACCEPTED / REJECTED)
  app.patch("/api/connections/:id", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const conn = connectionRequests.find(c => c.id === id);
    if (!conn) return res.status(404).json({ error: "Connection not found" });
    conn.status = status || conn.status;
    res.json({ connection: conn });
  });




  // ── Socket.IO logic ────────────────────────────────────────────────────────
  const activeUsers = new Map<string, string>(); // userId -> socketId

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("register", (userId: string) => {
      activeUsers.set(userId, socket.id);
      console.log(`User ${userId} registered with socket ${socket.id}`);
    });

    socket.on("send_message", (data: { senderId: string; receiverId: string; text: string }) => {
      const newMessage = {
        id: Math.random().toString(36).substr(2, 9),
        ...data,
        timestamp: Date.now()
      };

      // Send to receiver if online
      const receiverSocketId = activeUsers.get(data.receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive_message", newMessage);
      }

      // Send back to sender for confirmation
      socket.emit("receive_message", newMessage);
    });

    socket.on("disconnect", () => {
      for (const [userId, socketId] of activeUsers.entries()) {
        if (socketId === socket.id) {
          activeUsers.delete(userId);
          break;
        }
      }
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Serve index.html for all non-API routes in development
    app.use(async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        const fs = await import('fs/promises');
        let template = await fs.readFile(
          path.join(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        console.error(e.stack);
        res.status(500).end(e.stack);
      }
    });

  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use((req, res) => {
      if (req.originalUrl.startsWith('/api')) return res.status(404).json({ error: "Not Found" });
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
