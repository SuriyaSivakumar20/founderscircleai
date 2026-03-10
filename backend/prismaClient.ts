import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

let prisma: PrismaClient;

if (process.env.VERCEL) {
    // Vercel Serverless Functions have a read-only filesystem, except for /tmp
    const originalDbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    const tmpDbPath = '/tmp/dev.db';

    try {
        if (!fs.existsSync(tmpDbPath)) {
            if (fs.existsSync(originalDbPath)) {
                fs.copyFileSync(originalDbPath, tmpDbPath);
                console.log('Copied SQLite database to /tmp for Vercel Serverless execution.');
            } else {
                console.warn('Original database not found. Prisma may fail to initialize.');
            }
        }

        prisma = new PrismaClient({
            datasources: {
                db: {
                    url: 'file:/tmp/dev.db',
                },
            },
        });
    } catch (error) {
        console.error('Failed to initialize Vercel Prisma DB interceptor:', error);
        // Fallback just in case
        prisma = new PrismaClient();
    }
} else {
    // Local Development
    prisma = new PrismaClient();
}

export default prisma;
