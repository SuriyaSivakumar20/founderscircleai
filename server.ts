
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { seedDatabase } from "./backend/utils/seed";
import { createApp } from "./backend/app";
import prisma from "./backend/prismaClient";
import { corsOriginVerifier } from "./backend/config/security";
import { areConnected } from "./backend/controllers/messageController";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = createApp();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    // SECURITY: origin was "*" — any website could open a socket as a user.
    cors: { origin: corsOriginVerifier, methods: ["GET", "POST"] }
  });

  const PORT = 3000;

  // Always seed on start (upsert is idempotent)
  await seedDatabase();

  // ── Socket.IO — persistent, authorized direct messaging ───────────────────
  // userId → set of socket ids (a user may have several tabs/devices open).
  const activeUsers = new Map<string, Set<string>>();

  // SECURITY: the client must prove its identity via the same JWT used for the
  // REST API. The server never trusts a client-supplied senderId.
  const jwtModule = (await import("jsonwebtoken")) as any;
  // ESM/CJS interop: the named `verify` export may only exist on `.default`
  // (without this, every handshake would throw a masked "invalid token").
  const jwtVerify: (token: string, secret: string) => { id: string } =
    jwtModule.verify ?? jwtModule.default?.verify;
  const { getJwtSecret } = await import("./backend/config/security");

  io.use((socket, next) => {
    const token =
      (socket.handshake.auth?.token as string) ||
      (socket.handshake.headers.authorization || "").replace(/^Bearer /i, "");
    if (!token) return next(new Error("Unauthorized — no token provided"));
    try {
      const decoded = jwtVerify(token, getJwtSecret());
      (socket.data as any).userId = decoded.id;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = (socket.data as any).userId as string;

    // Auto-register — no client "register" event needed.
    if (!activeUsers.has(userId)) activeUsers.set(userId, new Set());
    activeUsers.get(userId)!.add(socket.id);

    socket.on(
      "send_message",
      async (data: { receiverId: string; text: string }, ack?: (response: any) => void) => {
        try {
          const receiverId = data?.receiverId;
          const text = typeof data?.text === "string" ? data.text.trim() : "";
          if (typeof receiverId !== "string" || !receiverId || !text || text.length > 5000) {
            ack?.({ ok: false, error: "Invalid message" });
            return;
          }

          // AUTHORIZATION: messaging requires an accepted connection.
          if (!(await areConnected(userId, receiverId))) {
            ack?.({ ok: false, error: "No accepted connection with this user" });
            return;
          }

          // Persist first — delivery is never simulated.
          const message = await prisma.message.create({
            data: { senderId: userId, receiverId, content: text },
          });

          // Best-effort notification for the bell (non-blocking).
          const sender = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true },
          });
          prisma.notification.create({
            data: {
              receiverId,
              type: "MESSAGE",
              message: `New message from ${sender?.name ?? "a connection"}.`,
              referenceId: message.id,
            },
          }).catch(() => {});

          // Deliver to every online socket of the receiver, and echo to the
          // sender's other sockets (the sending socket gets the ack).
          const payload = { id: message.id, senderId: userId, receiverId, text: message.content, timestamp: message.createdAt.getTime(), createdAt: message.createdAt };
          const receiverSockets = activeUsers.get(receiverId);
          if (receiverSockets) {
            for (const sid of receiverSockets) io.to(sid).emit("receive_message", payload);
          }
          for (const sid of activeUsers.get(userId) ?? []) {
            if (sid !== socket.id) io.to(sid).emit("receive_message", payload);
          }
          ack?.({ ok: true, message: payload });
        } catch (err: any) {
          console.error("socket send_message error:", err?.message);
          ack?.({ ok: false, error: "Failed to send message" });
        }
      }
    );

    socket.on("typing", (data: { receiverId: string; isTyping: boolean }) => {
      if (typeof data?.receiverId !== "string") return;
      const receiverSockets = activeUsers.get(data.receiverId);
      if (!receiverSockets) return;
      const payload = { senderId: userId, isTyping: !!data?.isTyping };
      for (const sid of receiverSockets) io.to(sid).emit("typing", payload);
    });

    socket.on("disconnect", () => {
      const sockets = activeUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) activeUsers.delete(userId);
      }
    });
  });

  // ── Vite Dev Middleware ───────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { server: httpServer } },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.use(async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        const fs = await import('fs/promises');
        let template = await fs.readFile(path.join(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        // SECURITY: never echo stack traces to the client (information leak)
        console.error("SSR render error:", e);
        res.status(500).end("Internal Server Error");
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use((req, res) => {
      if (req.originalUrl.startsWith('/api')) return res.status(404).json({ message: "Not Found" });
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`B.I.R.D server running → http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal server error:", err);
  process.exit(1);
});
