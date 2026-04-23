/**
 * backend/utils/runSeed.ts
 * Standalone seed script called during Vercel build.
 * Run with: npx tsx backend/utils/runSeed.ts
 */
import { seedDatabase } from './seed.js';
import prisma from '../prismaClient.js';

async function main() {
  try {
    await seedDatabase();
    console.log('Seed completed successfully.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
