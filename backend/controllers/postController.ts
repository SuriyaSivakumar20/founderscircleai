import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { z } from 'zod';

const postSchema = z.object({
  content: z.string().min(1),
  image: z.string().optional(),
  referencedCompanyId: z.string().optional(),
  referencedInvestorId: z.string().optional(),
});

export const createPost = async (req: any, res: Response) => {
  try {
    const { content, image, referencedCompanyId, referencedInvestorId } = postSchema.parse(req.body);
    const post = await prisma.post.create({
      data: {
        content,
        image,
        authorId: req.user.id,
        referencedCompanyId,
        referencedInvestorId,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true } },
        referencedCompany: true,
        referencedInvestor: true,
      },
    });

    res.status(201).json(post);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues });
    }
    console.error(error);
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
        author: { select: { id: true, name: true, avatar: true, role: true } },
        referencedCompany: true,
        referencedInvestor: true,
        likes: { select: { userId: true } },
        comments: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          take: 3,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const total = await prisma.post.count();

    res.json({
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const likePost = async (req: any, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const existingLike = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existingLike) {
      await prisma.like.delete({
        where: { id: existingLike.id },
      });
      return res.json({ message: 'Unliked' });
    }

    await prisma.like.create({
      data: { userId, postId },
    });
    res.json({ message: 'Liked' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const addComment = async (req: any, res: Response) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const comment = await prisma.comment.create({
      data: { content, userId, postId },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
