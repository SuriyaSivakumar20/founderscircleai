/**
 * api/index.ts — Vercel Serverless Entry Point
 * B.I.R.D — Business Intelligence & Resource Development
 *
 * Thin entry: all middleware, routes and AI proxy logic live in
 * backend/app.ts so the serverless and local-dev servers are identical
 * (Socket.IO is a dev/self-hosted extra in server.ts; on Vercel, the chat
 * UI falls back to REST + polling).
 */

import dotenv from "dotenv";
import { createApp } from "../backend/app.js";

dotenv.config();

const app = createApp({ vercel: true });

export default app;
