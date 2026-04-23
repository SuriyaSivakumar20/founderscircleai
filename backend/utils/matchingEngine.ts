/**
 * B.I.R.D Deterministic Matching Engine
 * 
 * Scores compatibility between a User and an opposing entity (Company or Investor).
 * Returns a score out of 100. This is a fallback algorithm that does NOT require
 * any external LLM API and therefore cannot hit rate limits.
 *
 * Dimensions:
 *  - Sector Alignment    (40 pts) — most important signal
 *  - Stage Alignment     (30 pts) — investment stage match
 *  - Geography           (15 pts) — location overlap
 *  - Ticket Size         (15 pts) — funding ask vs check size
 */

interface UserProfile {
  role: string;
  industry?: string | null;
  stage?: string | null;
  location?: string | null;
  targetRaise?: number | null;   // Crores — used when role=FOUNDER
  minCheckSize?: number | null;  // Crores — used when role=INVESTOR
  maxCheckSize?: number | null;
}

interface MatchCandidate {
  id: string;
  name: string;
  industry?: string | null;
  stage?: string | null;
  location?: string | null;
  targetRaise?: number | null;
  minCheckSize?: number | null;
  maxCheckSize?: number | null;
  description?: string | null;
  [key: string]: any;
}

// Broad sector groups for partial matching (+20 pts when in same group)
const SECTOR_GROUPS: Record<string, string[]> = {
  fintech:    ['Fintech', 'FinTech', 'Payments', 'Banking', 'Insurance', 'BFSI', 'Fintech / Payments', 'Fintech / Brokerage'],
  saas:       ['SaaS', 'Enterprise Software', 'B2B SaaS', 'SaaS / Customer Engagement', 'SaaS / Enterprise Software'],
  healthtech: ['HealthTech', 'Digital Health', 'MedTech', 'Pharma', 'Biotech'],
  edtech:     ['EdTech', 'Education', 'Learning'],
  ecommerce:  ['E-commerce', 'D2C', 'Retail', 'Quick Commerce', 'Social Commerce'],
  logistics:  ['Logistics', 'Supply Chain', 'Foodtech / Logistics', 'Last-mile'],
  climatetech: ['CleanTech', 'Climate', 'Sustainability', 'EV', 'Energy'],
  deeptech:   ['Deep Tech', 'AI', 'ML', 'Industrial AI', 'Robotics'],
};

const STAGE_ORDER = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth'];

function getSectorGroup(industry: string): string | null {
  const normalised = industry.toLowerCase();
  for (const [group, sectors] of Object.entries(SECTOR_GROUPS)) {
    if (sectors.some(s => normalised.includes(s.toLowerCase()) || s.toLowerCase().includes(normalised))) {
      return group;
    }
  }
  return null;
}

function getSectorScore(userIndustry: string | null | undefined, candidateIndustry: string | null | undefined): number {
  if (!userIndustry || !candidateIndustry) return 0;
  const u = userIndustry.toLowerCase().trim();
  const c = candidateIndustry.toLowerCase().trim();
  if (u === c) return 40;                        // Exact match
  const uGroup = getSectorGroup(userIndustry);
  const cGroup = getSectorGroup(candidateIndustry);
  if (uGroup && cGroup && uGroup === cGroup) return 20; // Same group (partial)
  return 0;
}

function getStageScore(userStage: string | null | undefined, candidateStage: string | null | undefined): number {
  if (!userStage || !candidateStage) return 10; // neutral if unknown
  if (userStage === candidateStage) return 30;
  const uIdx = STAGE_ORDER.indexOf(userStage);
  const cIdx = STAGE_ORDER.indexOf(candidateStage);
  if (uIdx !== -1 && cIdx !== -1 && Math.abs(uIdx - cIdx) === 1) return 15; // adjacent stage
  return 0;
}

function getGeographyScore(userLoc: string | null | undefined, candidateLoc: string | null | undefined): number {
  if (!userLoc || !candidateLoc) return 5; // neutral
  const u = userLoc.toLowerCase();
  const c = candidateLoc.toLowerCase();
  if (u === c) return 15;
  // Indian cities — same state / pan-India overlap
  const cityParts = (loc: string) => loc.split(/[\s,/]+/).map(s => s.trim().toLowerCase());
  if (cityParts(u).some(p => cityParts(c).includes(p))) return 10;
  return 0;
}

function getTicketScore(
  user: UserProfile,
  candidate: MatchCandidate
): number {
  // When user is a FOUNDER looking at investors:
  //   candidate has minCheckSize / maxCheckSize
  //   user has targetRaise
  if (user.role === 'FOUNDER' && user.targetRaise) {
    const min = candidate.minCheckSize;
    const max = candidate.maxCheckSize;
    if (!min && !max) return 5; // unknown — neutral
    if (min !== null && min !== undefined && max !== null && max !== undefined) {
      if (user.targetRaise >= min && user.targetRaise <= max) return 15;
      // Within 2x range — partial
      if (user.targetRaise >= min * 0.5 && user.targetRaise <= max * 2) return 7;
      return 0;
    }
    if (max !== null && max !== undefined && user.targetRaise <= max) return 10;
    if (min !== null && min !== undefined && user.targetRaise >= min) return 10;
  }

  // When user is an INVESTOR looking at companies:
  //   candidate has targetRaise; user has minCheckSize/maxCheckSize
  if (user.role === 'INVESTOR' && candidate.targetRaise) {
    const min = user.minCheckSize;
    const max = user.maxCheckSize;
    if (!min && !max) return 5;
    if (min !== null && min !== undefined && max !== null && max !== undefined) {
      if (candidate.targetRaise >= min && candidate.targetRaise <= max) return 15;
      if (candidate.targetRaise >= min * 0.5 && candidate.targetRaise <= max * 2) return 7;
      return 0;
    }
  }
  return 5;
}

export function computeMatchScore(user: UserProfile, candidate: MatchCandidate): number {
  const sector   = getSectorScore(user.industry, candidate.industry);
  const stage    = getStageScore(user.stage, candidate.stage);
  const location = getGeographyScore(user.location, candidate.location);
  const ticket   = getTicketScore(user, candidate);
  return Math.min(100, sector + stage + location + ticket);
}

export function getMatchLabel(score: number): string {
  if (score >= 80) return 'High Match';
  if (score >= 60) return 'Good Match';
  if (score >= 40) return 'Moderate';
  return 'Low Match';
}
