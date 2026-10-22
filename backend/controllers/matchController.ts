import { Response } from 'express';
import prisma from '../prismaClient.js';
import { computeMatchScore, getMatchLabel } from '../utils/matchingEngine.js';

/**
 * GET /api/matches?sector=Fintech&stage=Seed&location=Bengaluru
 *
 * FOUNDERs  → see Investors ranked by B.I.R.D compatibility score
 * INVESTORs → see Companies ranked by B.I.R.D compatibility score
 * ADMINs    → see both
 *
 * Each match carries `interested: boolean` — whether the current user has
 * already expressed interest in that entity (persisted in the Interest table).
 */
export const getMatches = async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { sector, stage, location } = req.query as Record<string, string>;

    if (user.role === 'INVESTOR' || user.role === 'ADMIN') {
      // ── INVESTORs see STARTUPS ──────────────────────────────────────────
      const where: any = {};
      if (sector) where.industry = { contains: sector, mode: 'insensitive' };
      if (stage)  where.stage    = stage;
      if (location) where.location = { contains: location, mode: 'insensitive' };

      const [companies, myInterests] = await Promise.all([
        prisma.company.findMany({ where, orderBy: { foundedYear: 'desc' } }),
        prisma.interest.findMany({
          where: { userId: user.id, entityType: 'company' },
          select: { entityId: true },
        }),
      ]);
      const interestedIds = new Set(myInterests.map(i => i.entityId));

      const scored = companies.map(c => {
        const matchScore = computeMatchScore(user, c);
        return {
          ...c,
          type:        'COMPANY' as const,
          matchScore,
          matchLabel:  getMatchLabel(matchScore),
          entityType:  'company',  // client uses this to render the right UI
          interested:  interestedIds.has(c.id),
        };
      }).sort((a, b) => b.matchScore - a.matchScore);

      return res.json({ matches: scored, total: scored.length, viewerRole: user.role });
    }

    // ── FOUNDERs see INVESTORS ──────────────────────────────────────────────
    const where: any = {};
    if (sector)   where.targetSectors = { contains: sector, mode: 'insensitive' };
    if (location) where.location      = { contains: location, mode: 'insensitive' };

    const [investors, myInterests] = await Promise.all([
      prisma.investor.findMany({ where }),
      prisma.interest.findMany({
        where: { userId: user.id, entityType: 'investor' },
        select: { entityId: true },
      }),
    ]);
    const interestedIds = new Set(myInterests.map(i => i.entityId));

    const scored = investors.map(inv => {
      const matchScore = computeMatchScore(user, { ...inv, industry: inv.targetSectors });
      return {
        ...inv,
        type:       'INVESTOR' as const,
        matchScore,
        matchLabel: getMatchLabel(matchScore),
        entityType: 'investor',
        interested: interestedIds.has(inv.id),
      };
    }).sort((a, b) => b.matchScore - a.matchScore);

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
 * Persists the interest in the Interest table (idempotent via @@unique) so the
 * Discover page can show "Request Sent" truthfully across sessions and devices.
 */
export const expressInterest = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { entityId, entityType } = req.body;

    if (!entityId || typeof entityId !== 'string' || entityId.length > 64) {
      return res.status(400).json({ message: 'entityId is required' });
    }
    if (!['company', 'investor'].includes(entityType)) {
      return res.status(400).json({ message: 'entityType must be company or investor' });
    }

    // Verify the entity actually exists.
    const entity = entityType === 'company'
      ? await prisma.company.findUnique({ where: { id: entityId } })
      : await prisma.investor.findUnique({ where: { id: entityId } });
    if (!entity) return res.status(404).json({ message: `Unknown ${entityType}` });

    // Idempotent create — a second click returns the existing row.
    const interest = await prisma.interest.upsert({
      where: {
        userId_entityType_entityId: { userId, entityType, entityId },
      },
      create: { userId, entityType, entityId },
      update: {},
    });

    res.status(201).json({ interest, message: 'Interest recorded.' });
  } catch (error) {
    console.error('Interest error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
