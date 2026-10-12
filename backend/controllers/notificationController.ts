import { Response } from 'express';
import prisma from '../prismaClient.js';

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
    res.status(500).json({ message: 'Internal server error' });
  }
};
