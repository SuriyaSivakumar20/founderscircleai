import { PrismaClient } from '@prisma/client';

// Single shared PrismaClient instance — works for both local and Vercel
// Local: SQLite via DATABASE_URL=file:./dev.db  
// Vercel: PostgreSQL via DATABASE_URL=postgresql://...@neon.tech/...

declare global {
  // Prevent multiple instances during hot reload in dev
  var __prisma: PrismaClient | undefined;
}

const prisma = globalThis.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export default prisma;
