
import React, { useState, useEffect } from 'react';
import { User, Company, Investor } from '../types';
import { apiService } from '../services/apiService';

interface MatchesProps {
  user: User;
}

// Deterministic fake follower count from entity name
const fakeFollowerCount = (name: string): string => {
  let n = 0;
  for (const c of name) n += c.charCodeAt(0);
  const base = ((n * 137) % 48) + 12; // 12–59K range
  return `${base}.${(n % 9)}K`;
};

// Fake founding year / stage / team size seeded from name
const fakeDetails = (name: string) => {
  let n = 0;
  for (const c of name) n += c.charCodeAt(0);
  const year = 2012 + (n % 12);
  const stage = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Growth'][n % 5];
  const team = 20 + ((n * 7) % 180);
  return { year, stage, team };
};

// ── Profile Drawer ────────────────────────────
interface ProfileDrawerProps {
  profile: Company | Investor | null;
  onClose: () => void;
  sentState: 'idle' | 'sending' | 'sent';
  onConnect: () => void;
}

const ProfileDrawer: React.FC<ProfileDrawerProps> = ({ profile, onClose, sentState, onConnect }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (profile) {
      // Trigger slide-in after mount
      const t = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [profile]);

  if (!profile) return null;

  const followers = fakeFollowerCount(profile.name);
  const { year, stage, team } = fakeDetails(profile.name);
  const industry = (profile as Company).industry || 'Venture Capital';

  const isSending = sentState === 'sending';
  const isSent = sentState === 'sent';

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 380);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 40,
          opacity: visible ? 1 : 0, transition: 'opacity 0.35s ease',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, height: '100vh', width: '100%', maxWidth: '480px',
          background: '#FAFAF9', zIndex: 50, display: 'flex', flexDirection: 'column',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)',
          boxShadow: '-24px 0 64px rgba(0,0,0,0.18)',
        }}
        className="dark:bg-zinc-900"
      >
        {/* Accent stripe */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #C5A059, #D4B87E)', flexShrink: 0 }} />

        {/* Close */}
        <button
          onClick={handleClose}
          style={{ position: 'absolute', top: '20px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: '#a1a1aa', fontSize: '20px', lineHeight: 1, padding: '4px' }}
        >
          ✕
        </button>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px 40px 32px' }}>
          {/* Hero */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
            <div style={{ width: '88px', height: '88px', flexShrink: 0, overflow: 'hidden', border: '1px solid #e4e4e7' }}>
              <img
                src={profile.avatar || `https://picsum.photos/seed/${profile.id}/200`}
                alt={profile.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div>
              <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.4em', color: '#C5A059', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                {profile.isPublicEntity ? 'Public Entity' : 'Verified Partner'}
              </span>
              <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: '30px', color: '#18181b', margin: '0 0 6px', lineHeight: 1.1 }}
                className="dark:text-zinc-100">
                {profile.name}
              </h2>
              <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 500 }}>{profile.location}</span>
            </div>
          </div>

          {/* Follower + meta stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1px', background: '#e4e4e7', border: '1px solid #e4e4e7', marginBottom: '32px' }}
            className="dark:bg-zinc-700 dark:border-zinc-700">
            {[
              { label: 'Followers', value: followers },
              { label: 'Founded', value: String(year) },
              { label: 'Team Size', value: `${team}+` },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#FAFAF9', padding: '16px', textAlign: 'center' }} className="dark:bg-zinc-900">
                <div style={{ fontSize: '22px', fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', color: '#C5A059', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#71717a', fontWeight: 700, marginTop: '6px' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '28px' }}>
            {[industry, stage, profile.location.split(',')[0]].map((tag) => (
              <span key={tag} style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, border: '1px solid #e4e4e7', padding: '5px 12px', color: '#52525b' }}
                className="dark:border-zinc-700 dark:text-zinc-400">
                {tag}
              </span>
            ))}
          </div>

          {/* Separator */}
          <div style={{ borderTop: '1px solid #f4f4f5', marginBottom: '24px' }} className="dark:border-zinc-800" />

          {/* Description */}
          <div style={{ marginBottom: '28px' }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#71717a', fontWeight: 700, display: 'block', marginBottom: '12px' }}>About</span>
            <p style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: '18px', color: '#3f3f46', lineHeight: 1.7, margin: 0 }}
              className="dark:text-zinc-400">
              "{profile.description}"
            </p>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '36px' }}>
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, color: '#C5A059', textDecoration: 'none' }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Official Website
              </a>
            )}
            {profile.linkedinUrl && (
              <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, color: '#71717a', textDecoration: 'none' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                LinkedIn Profile
              </a>
            )}
          </div>
        </div>

        {/* Sticky CTA */}
        <div style={{ padding: '20px 40px 28px', borderTop: '1px solid #f4f4f5', flexShrink: 0, background: '#FAFAF9' }} className="dark:border-zinc-800 dark:bg-zinc-900">
          <button
            onClick={onConnect}
            disabled={isSent || isSending}
            style={{
              width: '100%', padding: '16px',
              background: isSent ? 'rgba(22,163,74,0.06)' : isSending ? 'none' : '#C5A059',
              color: isSent ? '#16a34a' : isSending ? '#C5A059' : 'white',
              border: isSent ? '1px solid rgba(22,163,74,0.3)' : isSending ? '1px solid rgba(197,160,89,0.4)' : 'none',
              fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4em', fontWeight: 700,
              cursor: isSent || isSending ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.3s ease',
            }}
          >
            {isSent ? (
              <>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                Request Sent
              </>
            ) : isSending ? (
              <>
                <span style={{ display: 'inline-flex', gap: '4px' }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#C5A059', animation: `pulse 1s ease-in-out ${i * 0.2}s infinite`, display: 'inline-block' }} />
                  ))}
                </span>
                Sending...
              </>
            ) : 'Initialize Connection'}
          </button>
        </div>
      </div>
    </>
  );
};


// ── Main Matches Component ────────────────────
const Matches: React.FC<MatchesProps> = ({ user }) => {
  const [matches, setMatches] = useState<(Company | Investor)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requestStates, setRequestStates] = useState<Record<string, 'idle' | 'sending' | 'sent'>>({});
  const [activeProfile, setActiveProfile] = useState<Company | Investor | null>(null);

  useEffect(() => {
    const FALLBACK_COMPANIES: Company[] = [
      { id: 'c1', name: 'Zepto', industry: 'Quick Commerce', description: '10-minute grocery delivery operating across 10 Indian cities, backed by Y Combinator and a16z.', location: 'Mumbai', website: 'https://www.zeptonow.com', linkedinUrl: 'https://linkedin.com/company/zepto', isPublicEntity: false },
      { id: 'c2', name: 'Groww', industry: 'FinTech', description: 'India\'s leading investment platform with 40M+ users for mutual funds, stocks, and gold investments.', location: 'Bengaluru', website: 'https://groww.in', linkedinUrl: 'https://linkedin.com/company/groww', isPublicEntity: false },
      { id: 'c3', name: 'PharmEasy', industry: 'HealthTech', description: 'India\'s largest online pharmacy aggregator serving 3M+ monthly orders with telehealth capabilities.', location: 'Mumbai', website: 'https://pharmeasy.in', linkedinUrl: 'https://linkedin.com/company/pharmeasy', isPublicEntity: false },
      { id: 'c4', name: 'CRED', industry: 'FinTech / Rewards', description: 'Premium credit card payments platform offering exclusive rewards for creditworthy Indians. Valued at $6.4B.', location: 'Bengaluru', website: 'https://cred.club', linkedinUrl: 'https://linkedin.com/company/cred-club', isPublicEntity: false },
      { id: 'c5', name: 'Meesho', industry: 'Social Commerce', description: 'India\'s largest social commerce platform enabling 15M+ resellers, primarily targeting Tier 2/3 markets.', location: 'Bengaluru', website: 'https://meesho.com', linkedinUrl: 'https://linkedin.com/company/meesho', isPublicEntity: false },
      { id: 'c6', name: 'Urban Company', industry: 'Home Services', description: 'On-demand home services platform connecting skilled professionals to urban households across India & UAE.', location: 'Gurugram', website: 'https://urbancompany.com', linkedinUrl: 'https://linkedin.com/company/urban-company', isPublicEntity: false },
      { id: 'c7', name: 'Nykaa', industry: 'Beauty & Fashion', description: 'India\'s leading beauty omnichannel retailer with 150K+ SKUs and a premium direct brand portfolio.', location: 'Mumbai', website: 'https://nykaa.com', linkedinUrl: 'https://linkedin.com/company/nykaa', isPublicEntity: true },
      { id: 'c8', name: 'Slice', industry: 'FinTech / Credit', description: 'Next-gen credit card & payments app targeting young Indians with 5M+ active members and zero annual fees.', location: 'Bengaluru', website: 'https://sliceit.com', linkedinUrl: 'https://linkedin.com/company/sliceit', isPublicEntity: false },
    ];

    const FALLBACK_INVESTORS: Investor[] = [
      { id: 'i1', name: 'Sequoia Capital India', description: 'Tier-1 global VC with $4B+ deployed in India across Byju\'s, Zomato, CRED, and 100+ portfolio companies.', location: 'Bengaluru', website: 'https://www.sequoiacap.com', linkedinUrl: 'https://linkedin.com/company/sequoiacapital', isPublicEntity: true },
      { id: 'i2', name: 'Blume Ventures', description: 'India\'s most active early-stage VC backing 170+ startups including Unacademy, Dunzo, and Purplle.', location: 'Mumbai', website: 'https://blume.vc', linkedinUrl: 'https://linkedin.com/company/blume-ventures', isPublicEntity: false },
      { id: 'i3', name: '3one4 Capital', description: 'Bengaluru-based VC with 60+ portfolio companies. Known for sector-agnostic early bets in B2B SaaS and consumer tech.', location: 'Bengaluru', website: 'https://3one4capital.com', linkedinUrl: 'https://linkedin.com/company/3one4capital', isPublicEntity: false },
      { id: 'i4', name: 'Accel India', description: 'First investor in Flipkart and Swiggy. Manages $1.5B+ across India with a strong founder community.', location: 'Bengaluru', website: 'https://www.accel.com', linkedinUrl: 'https://linkedin.com/company/accel', isPublicEntity: false },
      { id: 'i5', name: 'Tiger Global Management', description: 'New York-based hedge fund and growth equity investor with 100+ Indian portfolio companies including Flipkart and CRED.', location: 'New York / India', website: 'https://www.tigerglobal.com', linkedinUrl: 'https://linkedin.com/company/tiger-global-management', isPublicEntity: false },
      { id: 'i6', name: 'Peak XV Partners', description: 'Formerly Sequoia Capital India/SEA — one of the most prolific VC firms in the region with $9B AUM.', location: 'Bengaluru', website: 'https://www.peakxv.com', linkedinUrl: 'https://linkedin.com/company/peakxv', isPublicEntity: false },
    ];

    const fetchMatches = async () => {
      try {
        setIsLoading(true);
        let companies: Company[] = [];
        let investors: Investor[] = [];

        try {
          companies = await apiService.getCompanies();
          investors = await apiService.getInvestors();
        } catch {
          // API unavailable on Vercel — use the fallback data
        }

        // Use fallback if API returned empty results
        if (companies.length === 0) companies = FALLBACK_COMPANIES;
        if (investors.length === 0) investors = FALLBACK_INVESTORS;

        if (user.role === 'FOUNDER') {
          setMatches(investors);
        } else if (user.role === 'INVESTOR') {
          setMatches(companies);
        } else {
          // ADMIN gets to see all
          setMatches([...companies, ...investors]);
        }
      } catch (error) {
        console.error('Failed to fetch matches', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, [user.role]);

  const handleConnect = async (entityId: string) => {
    if (requestStates[entityId] === 'sent' || requestStates[entityId] === 'sending') return;
    setRequestStates(prev => ({ ...prev, [entityId]: 'sending' }));
    try {
      await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUserId: user.id, toEntityId: entityId }),
      });
      await new Promise(r => setTimeout(r, 600));
      setRequestStates(prev => ({ ...prev, [entityId]: 'sent' }));
    } catch {
      setRequestStates(prev => ({ ...prev, [entityId]: 'idle' }));
    }
  };

  return (
    <>
      <div className="space-y-16 pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-100 dark:border-zinc-800 pb-10">
          <div className="max-w-xl">
            <span className="text-[10px] uppercase tracking-[0.4em] text-accent font-bold mb-3 block">Algorithmic Synthesis</span>
            <h2 className="text-5xl font-serif italic text-ink dark:text-paper">Verified Matches</h2>
            <p className="text-zinc-400 mt-4 font-light text-lg italic">Curated institutional partners identified by AI analysis of your strategic objectives.</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold block">Sector Focus</span>
            <span className="text-accent font-serif italic text-xl">{user.industry}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-16 h-16 border border-accent border-t-transparent animate-spin mb-8" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-bold animate-pulse">Synthesizing Profile Data...</p>
          </div>
        ) : matches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {matches.map((profile, idx) => {
              const state = requestStates[profile.id] || 'idle';
              const isSending = state === 'sending';
              const isSent = state === 'sent';

              return (
                <div key={profile.id} className="group relative bg-white dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800 p-0 transition-all duration-700 hover:border-accent/40">
                  <div className="absolute -top-4 -right-4 w-12 h-12 border border-zinc-100 dark:border-zinc-800 bg-paper dark:bg-ink flex items-center justify-center text-[10px] font-bold text-accent z-10">
                    0{idx + 1}
                  </div>

                  <div className="p-10">
                    <div className="flex items-center gap-8 mb-10">
                      <div className="relative w-24 h-24 overflow-hidden">
                        <img
                          src={profile.avatar || 'https://picsum.photos/seed/entity/200'}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000"
                          alt={profile.name}
                        />
                        <div className="absolute inset-0 border border-ink/10 dark:border-paper/10" />
                      </div>
                      <div>
                        <h3 className="text-3xl font-serif italic text-ink dark:text-paper mb-2">{profile.name}</h3>
                        <div className="flex gap-2 flex-wrap">
                          <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-accent border border-accent/30 px-3 py-1">
                            {profile.isPublicEntity ? 'Public Entity' : 'Verified Partner'}
                          </span>
                          {profile.location && (
                            <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-3 py-1">
                              {profile.location}
                            </span>
                          )}
                          {/* Follower count pill visible on card */}
                          <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-3 py-1 flex items-center gap-1">
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                            </svg>
                            {fakeFollowerCount(profile.name)} followers
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="h-[1px] w-full bg-zinc-50 dark:bg-zinc-800/50 mb-8" />

                    <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-lg font-light italic leading-relaxed">
                      "{profile.description}"
                    </p>

                    <div className="mb-8 flex flex-wrap gap-4">
                      <a href={profile.website} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] uppercase tracking-widest font-bold text-accent hover:underline flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Official Website
                      </a>
                      {profile.linkedinUrl && (
                        <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 hover:text-accent flex items-center gap-1">
                          LinkedIn Verification
                        </a>
                      )}
                    </div>

                    <div className="flex gap-4">
                      {/* Initialize Connection button */}
                      <button
                        onClick={() => handleConnect(profile.id)}
                        disabled={isSent || isSending}
                        className={`flex-1 border py-4 rounded-none font-bold transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2
                          ${isSent
                            ? 'border-green-500/40 text-green-500 bg-green-500/5 cursor-default'
                            : isSending
                              ? 'border-accent/40 text-accent/60 cursor-wait'
                              : 'border-accent text-accent hover:bg-accent hover:text-white'
                          }`}
                      >
                        {isSent ? (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                            </svg>
                            Request Sent
                          </>
                        ) : isSending ? (
                          <>
                            <span className="inline-flex gap-1">
                              {[0, 1, 2].map(i => (
                                <span key={i} style={{ animation: `pulse 1s ease-in-out ${i * 0.2}s infinite` }} className="w-1 h-1 bg-accent rounded-full inline-block" />
                              ))}
                            </span>
                            Sending...
                          </>
                        ) : 'Initialize Connection'}
                      </button>

                      {/* Profile button → opens drawer */}
                      <button
                        onClick={() => setActiveProfile(profile)}
                        title="View Profile"
                        className="border border-zinc-100 dark:border-zinc-800 p-4 text-zinc-400 hover:text-accent hover:border-accent/40 transition-all group/btn"
                      >
                        <svg className="w-5 h-5 transition-transform group-hover/btn:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-zinc-100 dark:border-zinc-800 p-20 text-center bg-zinc-50/10">
            <p className="text-zinc-400 font-serif italic text-2xl">No institutional matches identified for this sector at this time.</p>
            <button className="mt-8 text-accent uppercase tracking-widest text-[10px] font-bold hover:opacity-70 transition-all">Refresh Analysis</button>
          </div>
        )}
      </div>

      {/* Profile Drawer — rendered outside card grid to avoid layout clipping */}
      <ProfileDrawer
        profile={activeProfile}
        onClose={() => setActiveProfile(null)}
        sentState={activeProfile ? (requestStates[activeProfile.id] || 'idle') : 'idle'}
        onConnect={() => activeProfile && handleConnect(activeProfile.id)}
      />
    </>
  );
};

export default Matches;
