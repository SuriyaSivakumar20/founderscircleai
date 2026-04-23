import { Response } from 'express';
import prisma from '../prismaClient.js';
import { computeMatchScore, getMatchLabel } from '../utils/matchingEngine.js';

/**
 * GET /api/matches?sector=Fintech&stage=Seed&location=Bengaluru
 *
 * FOUNDERs  → see Investors ranked by B.I.R.D compatibility score
 * INVESTORs → see Companies ranked by B.I.R.D compatibility score
 * ADMINs    → see both
 */
export const getMatches = async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { sector, stage, location } = req.query as Record<string, string>;

    // Log analytics event (non-blocking)
    if (user.id !== 'guest-bypass-001') {
      prisma.analyticsEvent.create({
        data: { userId: user.id, eventType: 'MATCH_COMPUTED', targetId: null },
      }).catch(() => {});
    }

    if (user.role === 'INVESTOR' || user.role === 'ADMIN') {
      // ── INVESTORs see STARTUPS ──────────────────────────────────────────
      const where: any = {};
      if (sector) where.industry = { contains: sector, mode: 'insensitive' };
      if (stage)  where.stage    = stage;
      if (location) where.location = { contains: location, mode: 'insensitive' };

      const companies = await prisma.company.findMany({ where, orderBy: { foundedYear: 'desc' } });

      const scored = companies.map(c => ({
        ...c,
        type:        'COMPANY' as const,
        matchScore:  computeMatchScore(user, c),
        matchLabel:  getMatchLabel(computeMatchScore(user, c)),
        entityType:  'company',  // client uses this to render the right UI
      })).sort((a, b) => b.matchScore - a.matchScore);

      return res.json({ matches: scored, total: scored.length, viewerRole: user.role });
    }

    // ── FOUNDERs see INVESTORS ──────────────────────────────────────────────
    const where: any = {};
    if (sector)   where.targetSectors = { contains: sector, mode: 'insensitive' };
    if (location) where.location      = { contains: location, mode: 'insensitive' };

    const investors = await prisma.investor.findMany({ where });

    const scored = investors.map(inv => ({
      ...inv,
      type:       'INVESTOR' as const,
      matchScore: computeMatchScore(user, { ...inv, industry: inv.targetSectors }),
      matchLabel: getMatchLabel(computeMatchScore(user, { ...inv, industry: inv.targetSectors })),
      entityType: 'investor',
    })).sort((a, b) => b.matchScore - a.matchScore);

    return res.json({ matches: scored, total: scored.length, viewerRole: user.role });
  } catch (error) {
    console.error('Match error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/matches/interest
 * Body: { entityId, entityType: 'company' | 'investor' }
 *
 * Logs a PROFILE_VIEW analytics event when a user expresses interest in
 * a Company or Investor entity. These are not Users so we cannot create
 * a Connection FK row — we use AnalyticsEvent instead.
 */
export const expressInterest = async (req: any, res: Response) => {
  try {
    const { entityId, entityType } = req.body;

    if (!entityId) {
      return res.status(400).json({ message: 'entityId is required' });
    }

    if (req.user.id !== 'guest-bypass-001') {
      await prisma.analyticsEvent.create({
        data: {
          userId:    req.user.id,
          eventType: 'PROFILE_VIEW',
          targetId:  entityId,
        },
      });
    }

    // Return a success payload so the UI can show "Interest Sent"
    res.status(201).json({
      success:    true,
      entityId,
      entityType,
      message:    `Interest in ${entityType} logged. Our team will follow up if there is a mutual match.`,
    });
  } catch (error) {
    console.error('Interest error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
