import { Response } from 'express';
import prisma from '../prismaClient';
import { computeMatchScore, getMatchLabel } from '../utils/matchingEngine';

/**
 * GET /api/matches?sector=Fintech&stage=Seed&location=Bengaluru
 *
 * For FOUNDERs → returns scored Investors
 * For INVESTORs → returns scored Companies
 * For ADMINs → returns both
 *
 * Supports optional filter query params to prove search functionality works.
 */
export const getMatches = async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { sector, stage, location } = req.query as Record<string, string>;

    // Log an analytics event (profile view via discovery)
    if (user.id !== 'guest-bypass-001') {
      await prisma.analyticsEvent.create({
        data: {
          userId: user.id,
          eventType: 'MATCH_COMPUTED',
          targetId: null,
        },
      }).catch(() => {}); // non-blocking
    }

    if (user.role === 'INVESTOR' || user.role === 'ADMIN') {
      // Investors see startups — Company table
      const where: any = {};
      if (sector) where.industry = { contains: sector };
      if (stage) where.stage = stage;
      if (location) where.location = { contains: location };

      const companies = await prisma.company.findMany({ where });

      const scored = companies.map(c => ({
        ...c,
        type: 'COMPANY' as const,
        matchScore: computeMatchScore(user, c),
        matchLabel: getMatchLabel(computeMatchScore(user, c)),
      })).sort((a, b) => b.matchScore - a.matchScore);

      return res.json({ matches: scored, total: scored.length });
    }

    // FOUNDERs see investors — Investor table
    const where: any = {};
    if (sector) where.targetSectors = { contains: sector };
    if (location) where.location = { contains: location };

    const investors = await prisma.investor.findMany({ where });

    const scored = investors.map(inv => ({
      ...inv,
      type: 'INVESTOR' as const,
      matchScore: computeMatchScore(user, { ...inv, industry: inv.targetSectors }),
      matchLabel: getMatchLabel(computeMatchScore(user, { ...inv, industry: inv.targetSectors })),
    })).sort((a, b) => b.matchScore - a.matchScore);

    return res.json({ matches: scored, total: scored.length });
  } catch (error) {
    console.error('Match error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
