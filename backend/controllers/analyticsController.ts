import { Response } from 'express';
import prisma from '../prismaClient.js';

/**
 * GET /api/analytics/summary
 *
 * Every number is a live Prisma COUNT over real rows:
 *   • totalMatches        = ACCEPTED connections ("matches made" on the platform)
 *   • matchAccuracy       = accepted / total connection requests
 *   • profileViews*       = PROFILE_VIEW events with a real target user
 *                           (written by GET /api/users/:id)
 */
export const getAnalyticsSummary = async (req: any, res: Response) => {
  try {
    const [
      totalUsers,
      totalFounders,
      totalInvestors,
      totalPosts,
      totalConnections,
      acceptedConnections,
      pendingConnections,
      totalInterests,
      profileViewsThisWeek,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'FOUNDER' } }),
      prisma.user.count({ where: { role: 'INVESTOR' } }),
      prisma.post.count(),
      prisma.connection.count(),
      prisma.connection.count({ where: { status: 'ACCEPTED' } }),
      prisma.connection.count({ where: { status: 'PENDING' } }),
      prisma.interest.count(),
      prisma.analyticsEvent.count({
        where: {
          eventType: 'PROFILE_VIEW',
          targetId: { not: null },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    // User-specific stats
    const userId = req.user.id;
    const [myConnections, myPosts, myProfileViews] = await Promise.all([
      prisma.connection.count({
        where: {
          OR: [{ requesterId: userId }, { receiverId: userId }],
          status: 'ACCEPTED',
        },
      }),
      prisma.post.count({ where: { authorId: userId } }),
      prisma.analyticsEvent.count({
        where: { eventType: 'PROFILE_VIEW', targetId: userId },
      }),
    ]);

    const matchAccuracy = totalConnections > 0
      ? Math.round((acceptedConnections / totalConnections) * 100)
      : 0;

    res.json({
      platform: {
        totalUsers,
        totalFounders,
        totalInvestors,
        totalPosts,
        totalConnections,
        acceptedConnections,
        pendingConnections,
        totalInterests,
        profileViewsThisWeek,
        totalMatches: acceptedConnections,
        matchAccuracy,
      },
      user: {
        myConnections,
        myPosts,
        profileViews: myProfileViews,
        connectionRate: matchAccuracy,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
