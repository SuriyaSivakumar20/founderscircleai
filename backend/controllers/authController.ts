import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../prismaClient.js';
import { z } from 'zod';
import { getJwtSecret } from '../config/security.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2),
  // SECURITY: public self-registration can never mint an ADMIN account.
  // Admin accounts are created only through the seed/admin tooling.
  role: z.enum(['FOUNDER', 'INVESTOR']),
  industry: z.string().max(80).optional(),
  location: z.string().max(80).optional(),
  description: z.string().optional(),
  avatar: z.string().optional(),
  website: z.string().optional(),
  // AI vetting interview result (computed client-side from the streamed
  // /api/ai/evaluate response; stored so the platform has an auditable
  // admission record for every account).
  vettingScore: z.number().int().min(0).max(100).optional(),
  vettingReport: z.record(z.string(), z.any()).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const register = async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email: validatedData.email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10);
    const user = await prisma.user.create({
      data: {
        ...validatedData,
        password: hashedPassword,
      },
    });

    const token = jwt.sign({ id: user.id }, getJwtSecret(), { expiresIn: '7d' });

    const { password, ...userWithoutPassword } = user;
    res.status(201).json({ user: userWithoutPassword, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues });
    }
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // SECURITY: the hardcoded demo-admin login ("testing@test.com" / "password")
    // that granted a permanent ADMIN token has been removed — it was a
    // full authentication bypass readable by anyone with source access.

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, getJwtSecret(), { expiresIn: '7d' });

    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
