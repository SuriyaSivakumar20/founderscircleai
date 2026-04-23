import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { z } from 'zod';

const postSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),
  tag: z.string().optional().default('Update'),
  metric: z.string().optional(),
  metricLabel: z.string().optional(),
  image: z.string().optional(),
  referencedCompanyId: z.string().optional(),
  referencedInvestorId: z.string().optional(),
});

export const createPost = async (req: any, res: Response) => {
  try {
    const { content, tag, metric, metricLabel, image, referencedCompanyId, referencedInvestorId } = postSchema.parse(req.body);

    // Guest bypass — deny writes
    if (req.user.id === 'guest-bypass-001') {
      return res.status(403).json({ message: 'Guest mode: sign up to post deals' });
    }

    const post = await prisma.post.create({
      data: {
        content,
        tag,
        metric,
        metricLabel,
        image,
        authorId: req.user.id,
        referencedCompanyId: referencedCompanyId || null,
        referencedInvestorId: referencedInvestorId || null,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true, industry: true } },
        referencedCompany: true,
        referencedInvestor: true,
        likes: { select: { userId: true } },
        comments: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });

    // Log analytics event
    prisma.analyticsEvent.create({
      data: { userId: req.user.id, eventType: 'POST_IMPRESSION', targetId: post.id },
    }).catch(() => {});

    res.status(201).json(post);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues });
    }
    console.error('createPost error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getFeed = async (req: any, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const posts = await prisma.post.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true, industry: true, location: true } },
        referencedCompany: true,
        referencedInvestor: true,
        likes: { select: { userId: true } },
        comments: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const total = await prisma.post.count();

    // Log profile-view event if user is viewing the feed
    if (req.user.id !== 'guest-bypass-001') {
      prisma.analyticsEvent.create({
        data: { userId: req.user.id, eventType: 'PROFILE_VIEW', targetId: null },
      }).catch(() => {});
    }

    res.json({ posts, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('getFeed error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const likePost = async (req: any, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    if (userId === 'guest-bypass-001') {
      return res.status(403).json({ message: 'Sign up to like posts' });
    }

    const existingLike = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existingLike) {
      await prisma.like.delete({ where: { id: existingLike.id } });
      return res.json({ liked: false, message: 'Unliked' });
    }

    await prisma.like.create({ data: { userId, postId } });
    res.json({ liked: true, message: 'Liked' });
  } catch (error) {
    console.error('likePost error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const addComment = async (req: any, res: Response) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content?.trim()) {
      return res.status(400).json({ message: 'Comment content is required' });
    }
    if (userId === 'guest-bypass-001') {
      return res.status(403).json({ message: 'Sign up to comment' });
    }

    const comment = await prisma.comment.create({
      data: { content, userId, postId },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('addComment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
