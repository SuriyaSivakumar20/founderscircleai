import { Request, Response } from 'express';
import prisma from '../prismaClient.js';
import { z } from 'zod';

// SECURITY: user-controlled URLs are rendered as live links elsewhere in the
// app (Matches, ProfileView). Allowing arbitrary schemes such as
// `javascript:` or `data:` would enable stored XSS / phishing. Only real
// http(s) URLs are accepted.
const safeHttpUrl = z
  .string()
  .max(300)
  .refine(v => {
    try {
      const u = new URL(v);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'Must be a valid http(s) URL');

const updateProfileSchema = z.object({
  name:        z.string().trim().min(2).max(80).optional(),
  industry:    z.string().trim().max(80).optional(),
  description: z.string().trim().max(2000).optional(),
  avatar:      safeHttpUrl.optional(),
  website:     safeHttpUrl.optional(),
});

export const getProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        industry: true,
        description: true,
        avatar: true,
        website: true,
        posts: { take: 10, orderBy: { createdAt: 'desc' } },
        followers: { select: { followerId: true } },
        following: { select: { followingId: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateProfile = async (req: any, res: Response) => {
  try {
    // SECURITY: only whitelisted, length-capped, URL-validated fields are
    // accepted — role/email/password can never be escalated through here.
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid profile data', errors: parsed.error.issues });
    }
    const data = parsed.data;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data,
    });

    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const followUser = async (req: any, res: Response) => {
  try {
    const { id: followingId } = req.params;
    const followerId = req.user.id;

    if (followerId === followingId) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    const existingFollow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });

    if (existingFollow) {
      await prisma.follow.delete({
        where: { id: existingFollow.id },
      });
      return res.json({ message: 'Unfollowed' });
    }

    await prisma.follow.create({
      data: { followerId, followingId },
    });
    res.json({ message: 'Followed' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Public Entity Endpoints
export const getCompanies = async (req: Request, res: Response) => {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getInvestors = async (req: Request, res: Response) => {
  try {
    const investors = await prisma.investor.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(investors);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
