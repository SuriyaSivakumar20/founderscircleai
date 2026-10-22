import { Response } from 'express';
import prisma from '../prismaClient.js';

/**
 * GET /api/notifications
 * Latest 30 notifications plus the TRUE unread count across all rows.
 */
export const getNotifications = async (req: any, res: Response) => {
  try {
    const receiverId = req.user.id;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { receiverId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.notification.count({ where: { receiverId, isRead: false } }),
    ]);

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('getNotifications error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read (scoped to the authenticated receiver).
 */
export const markRead = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    // SECURITY: scope the update to the authenticated receiver — otherwise
    // any logged-in user could mark any other user's notifications read (IDOR).
    const result = await prisma.notification.updateMany({
      where: { id, receiverId: req.user.id },
      data: { isRead: true },
    });

    if (result.count === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const notification = await prisma.notification.findUnique({ where: { id } });
    res.json({ notification });
  } catch (error) {
    console.error('markRead error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/notifications/read-all
 * Marks every unread notification of the authenticated user as read.
 */
export const markAllRead = async (req: any, res: Response) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { receiverId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ markedRead: result.count });
  } catch (error) {
    console.error('markAllRead error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
