import { Response } from 'express';
import prisma from '../prismaClient.js';
import { z } from 'zod';

/**
 * Direct messaging between connected users.
 *
 * Authorization model (enforced on every path): you may only read or write
 * messages within a conversation where an ACCEPTED Connection exists between
 * you and the other user. There is no path to message arbitrary users.
 */

const sendMessageSchema = z.object({
  receiverId: z.string().min(1).max(64),
  content: z.string().trim().min(1, 'Message cannot be empty').max(5000),
});

/** True when an ACCEPTED connection exists between a and b (either direction). */
export async function areConnected(a: string, b: string): Promise<boolean> {
  const existing = await prisma.connection.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: a, receiverId: b },
        { requesterId: b, receiverId: a },
      ],
    },
    select: { id: true },
  });
  return !!existing;
}

/**
 * GET /api/messages/conversations
 * One row per ACCEPTED connection: peer profile, last message, unread count.
 */
export const getConversations = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const connections = await prisma.connection.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      include: {
        requester: { select: { id: true, name: true, avatar: true, role: true, industry: true } },
        receiver: { select: { id: true, name: true, avatar: true, role: true, industry: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const peers = connections.map(c =>
      c.requesterId === userId ? c.receiver : c.requester
    );

    // Batch-load last message + unread count for every peer in two queries.
    const peerIds = peers.map(p => p.id);
    const [lastMessages, unreadCounts] = await Promise.all([
      peerIds.length
        ? prisma.message.findMany({
            where: {
              OR: [
                { senderId: userId, receiverId: { in: peerIds } },
                { senderId: { in: peerIds }, receiverId: userId },
              ],
            },
            orderBy: { createdAt: 'desc' },
            take: Math.max(peerIds.length, 1) * 5, // over-fetch, then dedupe per peer
          })
        : Promise.resolve([]),
      peerIds.length
        ? prisma.message.groupBy({
            by: ['senderId'],
            where: { receiverId: userId, isRead: false, senderId: { in: peerIds } },
            _count: { _all: true },
          })
        : Promise.resolve([] as any[]),
    ]);

    const lastByPeer = new Map<string, any>();
    for (const m of lastMessages) {
      const peerId = m.senderId === userId ? m.receiverId : m.senderId;
      if (!lastByPeer.has(peerId)) lastByPeer.set(peerId, m);
    }
    const unreadByPeer = new Map<string, number>(
      unreadCounts.map((u: any) => [u.senderId, u._count._all])
    );

    const conversations = peers.map(peer => ({
      peer,
      lastMessage: lastByPeer.get(peer.id) || null,
      unreadCount: unreadByPeer.get(peer.id) || 0,
    }));

    res.json({ conversations });
  } catch (error) {
    console.error('getConversations error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/messages/:peerId?page=1&limit=30
 * Paginated message history with a connection check.
 */
export const getConversation = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { peerId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));

    if (!(await areConnected(userId, peerId))) {
      return res.status(403).json({ message: 'No accepted connection with this user' });
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: peerId },
            { senderId: peerId, receiverId: userId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.message.count({
        where: {
          OR: [
            { senderId: userId, receiverId: peerId },
            { senderId: peerId, receiverId: userId },
          ],
        },
      }),
    ]);

    // Oldest-first for rendering.
    res.json({
      messages: messages.reverse(),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('getConversation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/messages
 * Body: { receiverId, content }
 * Persists the message; delivery to an online peer is the Socket.IO layer's job.
 */
export const sendMessage = async (req: any, res: Response) => {
  try {
    const senderId = req.user.id;
    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid message', errors: parsed.error.issues });
    }
    const { receiverId, content } = parsed.data;

    if (senderId === receiverId) {
      return res.status(400).json({ message: 'Cannot message yourself' });
    }

    const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { id: true } });
    if (!receiver) return res.status(404).json({ message: 'Recipient not found' });

    if (!(await areConnected(senderId, receiverId))) {
      return res.status(403).json({ message: 'Messaging requires an accepted connection' });
    }

    const message = await prisma.message.create({
      data: { senderId, receiverId, content },
    });

    // Notify the recipient via the notifications bell (non-blocking).
    prisma.notification.create({
      data: {
        receiverId,
        type: 'MESSAGE',
        message: `New message from ${req.user.name}.`,
        referenceId: message.id,
      },
    }).catch(() => {});

    res.status(201).json({ message });
  } catch (error) {
    console.error('sendMessage error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/messages/:peerId/read
 * Marks every message from peerId → me as read (idempotent).
 */
export const markConversationRead = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { peerId } = req.params;

    const result = await prisma.message.updateMany({
      where: { senderId: peerId, receiverId: userId, isRead: false },
      data: { isRead: true },
    });

    res.json({ markedRead: result.count });
  } catch (error) {
    console.error('markConversationRead error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
