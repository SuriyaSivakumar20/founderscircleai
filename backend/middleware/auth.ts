import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient.js';
import { getJwtSecret } from '../config/security.js';

export const authenticate = async (req: any, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized — no token provided' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, getJwtSecret()) as { id: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        industry: true,
        stage: true,
        location: true,
        targetRaise: true,
        minCheckSize: true,
        maxCheckSize: true,
        description: true,
        avatar: true,
        website: true,
        followerCount: true,
        teamSize: true,
        foundedYear: true,
        vettingScore: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
