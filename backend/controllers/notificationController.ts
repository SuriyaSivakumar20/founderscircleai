import { Response } from 'express';
import prisma from '../prismaClient';

/**
 * GET /api/notifications
 * Returns all notifications for the logged-in user, newest first.
 */
export const getNotifications = async (req: any, res: Response) => {
  try {
    const receiverId = req.user.id;

    const notifications = await prisma.notification.findMany({
      where: { receiverId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read.
 */
export const markRead = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({ notification });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
