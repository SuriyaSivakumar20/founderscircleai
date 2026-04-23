import { Response } from 'express';
import prisma from '../prismaClient.js';
import { computeMatchScore } from '../utils/matchingEngine.js';

/**
 * POST /api/connections
 * Body: { receiverId: string }
 *
 * Creates a real Connection row in SQLite via Prisma.
 * Also creates a Notification for the receiver.
 * Also logs an analytics event.
 */
export const sendConnection = async (req: any, res: Response) => {
  try {
    const requesterId = req.user.id;
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({ message: 'receiverId is required' });
    }
    if (requesterId === receiverId) {
      return res.status(400).json({ message: 'Cannot connect to yourself' });
    }

    // Check for existing connection
    const existing = await prisma.connection.findUnique({
      where: { requesterId_receiverId: { requesterId, receiverId } },
    });

    if (existing) {
      return res.json({ connection: existing, duplicate: true });
    }

    // Compute match score for this pair
    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    const matchScore = receiver ? computeMatchScore(req.user, receiver as any) : null;

    const connection = await prisma.connection.create({
      data: { requesterId, receiverId, status: 'PENDING', matchScore },
    });

    // Create a notification for the receiver (non-blocking)
    if (receiver && requesterId !== 'guest-bypass-001') {
      prisma.notification.create({
        data: {
          receiverId,
          type: 'CONNECTION_REQUEST',
          message: `${req.user.name} sent you a connection request on B.I.R.D.`,
          referenceId: connection.id,
        },
      }).catch(() => {});

      // Analytics event
      prisma.analyticsEvent.create({
        data: {
          userId: requesterId,
          eventType: 'CONNECTION_SENT',
          targetId: receiverId,
        },
      }).catch(() => {});
    }

    res.status(201).json({ connection });
  } catch (error: any) {
    console.error('Connection error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/connections
 * Returns all connections for the authenticated user.
 */
export const getMyConnections = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const [sent, received] = await Promise.all([
      prisma.connection.findMany({
        where: { requesterId: userId },
        include: {
          receiver: { select: { id: true, name: true, avatar: true, industry: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.connection.findMany({
        where: { receiverId: userId },
        include: {
          requester: { select: { id: true, name: true, avatar: true, industry: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({ sent, received });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PATCH /api/connections/:id
 * Body: { status: 'ACCEPTED' | 'REJECTED' }
 */
export const updateConnectionStatus = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const connection = await prisma.connection.findUnique({ where: { id } });
    if (!connection) return res.status(404).json({ message: 'Connection not found' });
    if (connection.receiverId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden — not your connection request' });
    }

    const updated = await prisma.connection.update({
      where: { id },
      data: { status },
    });

    // Notify requester if accepted
    if (status === 'ACCEPTED') {
      prisma.notification.create({
        data: {
          receiverId: connection.requesterId,
          type: 'CONNECTION_ACCEPTED',
          message: `${req.user.name} accepted your connection request on B.I.R.D.`,
          referenceId: id,
        },
      }).catch(() => {});
    }

    res.json({ connection: updated });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
