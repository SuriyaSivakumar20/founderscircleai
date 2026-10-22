import { Request, Response } from 'express';
import prisma from '../prismaClient.js';
import { z } from 'zod';

const postSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty').max(5000),
  tag: z.string().max(40).optional().default('Update'),
  metric: z.string().max(40).optional(),
  metricLabel: z.string().max(40).optional(),
  // SECURITY: image is rendered directly in an <img src>. Accept only real
  // http(s) URLs or inline data: images — anything else could be a stored
  // XSS / phishing vector.
  image: z
    .string()
    .max(2_000_000)
    .refine(v => {
      if (v.startsWith('data:image/')) return true;
      try {
        const u = new URL(v);
        return u.protocol === 'https:' || u.protocol === 'http:';
      } catch {
        return false;
      }
    }, 'Image must be an http(s) URL or an inline image')
    .optional(),
  referencedCompanyId: z.string().max(64).optional(),
  referencedInvestorId: z.string().max(64).optional(),
});

export const createPost = async (req: any, res: Response) => {
  try {
    const { content, tag, metric, metricLabel, image, referencedCompanyId, referencedInvestorId } = postSchema.parse(req.body);

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
          take: 50,
          orderBy: { createdAt: 'asc' },
        },
      },
    });

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
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
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
            take: 50,
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      prisma.post.count(),
    ]);

    // True per-post comment totals (UI shows a capped preview + "view all").
    const commentCounts = await prisma.comment.groupBy({
      by: ['postId'],
      where: { postId: { in: posts.map(p => p.id) } },
      _count: { _all: true },
    });
    const countByPost = new Map(commentCounts.map(c => [c.postId, c._count._all]));

    const shaped = posts.map(p => ({ ...p, commentsTotal: countByPost.get(p.id) ?? p.comments.length }));

    res.json({ posts: shaped, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('getFeed error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const likePost = async (req: any, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const existingLike = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existingLike) {
      await prisma.like.delete({ where: { id: existingLike.id } });
      return res.json({ liked: false, message: 'Unliked' });
    }

    await prisma.like.create({ data: { userId, postId } });

    // Notify the post author (never for self-likes).
    if (post.authorId !== userId) {
      prisma.notification.create({
        data: {
          receiverId: post.authorId,
          type: 'NEW_LIKE',
          message: `${req.user.name} liked your post.`,
          referenceId: postId,
        },
      }).catch(() => {});
    }

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

    const zodParsed = z.string().trim().min(1, 'Comment content is required').max(2000).safeParse(content);
    if (!zodParsed.success) {
      return res.status(400).json({ message: zodParsed.error.issues[0]?.message || 'Invalid comment' });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = await prisma.comment.create({
      data: { content: zodParsed.data, userId, postId },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    if (post.authorId !== userId) {
      prisma.notification.create({
        data: {
          receiverId: post.authorId,
          type: 'NEW_COMMENT',
          message: `${req.user.name} commented on your post.`,
          referenceId: postId,
        },
      }).catch(() => {});
    }

    res.status(201).json(comment);
  } catch (error) {
    console.error('addComment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
