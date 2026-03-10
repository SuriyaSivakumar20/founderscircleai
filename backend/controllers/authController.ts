import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../prismaClient';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['FOUNDER', 'INVESTOR', 'ADMIN']),
  industry: z.string().optional(),
  description: z.string().optional(),
  avatar: z.string().optional(),
  website: z.string().optional(),
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

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

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

    // Vercel Presentation Fallback: Hardcode the demo user so it ALWAYS works, even if DB fails to seed
    if (email === 'testing@test.com' && password === 'password') {
      const demoToken = jwt.sign({ id: 'demo-admin-id' }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        user: {
          id: 'demo-admin-id',
          email: 'testing@test.com',
          name: 'FoundersCircle Admin',
          role: 'ADMIN',
          industry: 'Technology',
          description: 'Official administrator for the FoundersCircle platform.',
          avatar: 'https://picsum.photos/seed/admin/200',
        },
        token: demoToken
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

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
