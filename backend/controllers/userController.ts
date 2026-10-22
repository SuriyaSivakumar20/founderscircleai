import { Response } from 'express';
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
  stage:       z.string().trim().max(40).optional(),
  location:    z.string().trim().max(80).optional(),
  description: z.string().trim().max(2000).optional(),
  avatar:      safeHttpUrl.optional(),
  website:     safeHttpUrl.optional(),
  teamSize:    z.number().int().min(1).max(100000).optional(),
  foundedYear: z.number().int().min(1900).max(2100).optional(),
  targetRaise: z.number().int().min(0).max(100000).optional(),
  minCheckSize: z.number().int().min(0).max(100000).optional(),
  maxCheckSize: z.number().int().min(0).max(100000).optional(),
});

/**
 * GET /api/users/:id — public profile view.
 * SECURITY: email is never returned (PII must not leak across users), and the
 * view is logged as a PROFILE_VIEW analytics event targeted at the profile owner.
 */
export const getProfile = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        role: true,
        industry: true,
        stage: true,
        location: true,
        description: true,
        avatar: true,
        website: true,
        teamSize: true,
        foundedYear: true,
        createdAt: true,
        vettingScore: true,
        posts: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Real profile-view tracking (viewer → target), non-blocking.
    if (req.user.id !== id) {
      prisma.analyticsEvent.create({
        data: { userId: req.user.id, eventType: 'PROFILE_VIEW', targetId: id },
      }).catch(() => {});
    }

    res.json(user);
  } catch (error) {
    console.error('getProfile error:', error);
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
    console.error('updateProfile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/users/search?q=term
 * Authenticated user search across name / industry / location.
 * Powers the dashboard header search (Discover pre-filter).
 */
export const searchUsers = async (req: any, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (q.length < 2) {
      return res.json({ users: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        id: { not: req.user.id },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { industry: { contains: q, mode: 'insensitive' } },
          { location: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, role: true, industry: true, location: true, avatar: true },
      take: 8,
      orderBy: { name: 'asc' },
    });

    res.json({ users });
  } catch (error) {
    console.error('searchUsers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
