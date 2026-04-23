import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { apiService } from '../services/apiService';

interface MatchesProps {
  user: User;
}

interface ScoredMatch {
  id: string;
  name: string;
  description: string;
  location: string;
  industry?: string;
  targetSectors?: string;
  stage?: string;
  targetRaise?: number;
  minCheckSize?: number;
  maxCheckSize?: number;
  avatar?: string;
  website: string;
  linkedinUrl?: string;
  isPublicEntity: boolean;
  teamSize?: number;
  foundedYear?: number;
  type: 'COMPANY' | 'INVESTOR';
  matchScore: number;
  matchLabel: string;
}

const scoreBadge = (score: number): string => {
  if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  if (score >= 60) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  if (score >= 40) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
};

const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#22c55e' : score >= 50 ? '#3b82f6' : '#f59e0b';

  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg className="transform -rotate-90 w-16 h-16" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={radius} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-extrabold text-slate-800 dark:text-white">{score}</span>
      </div>
    </div>
  );
};

const Matches: React.FC<MatchesProps> = ({ user }) => {
  const [matches, setMatches] = useState<ScoredMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStates, setConnectionStates] = useState<Record<string, 'idle' | 'sending' | 'sent'>>({});
  const [activeProfile, setActiveProfile] = useState<ScoredMatch | null>(null);
  const [filters, setFilters] = useState({ sector: '', stage: '', location: '' });
  const [myConnections, setMyConnections] = useState<Set<string>>(new Set());

  const loadMatches = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (filters.sector)   params.sector   = filters.sector;
      if (filters.stage)    params.stage    = filters.stage;
      if (filters.location) params.location = filters.location;

      const data = await apiService.getMatches(params);
      setMatches(data.matches || []);
    } catch (err) {
      console.error('Matches load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadMatches(); }, [loadMatches]);

  // Load existing connection states from the DB on mount
  useEffect(() => {
    apiService.getMyConnections().then(data => {
      const sentIds = new Set<string>(
        (data.sent || []).map((c: any) => c.receiverId)
      );
      setMyConnections(sentIds);
    }).catch(() => {});
  }, []);

  const handleConnect = async (match: ScoredMatch) => {
    if (connectionStates[match.id] === 'sending' || myConnections.has(match.id)) return;
    setConnectionStates(prev => ({ ...prev, [match.id]: 'sending' }));
    try {
      // Connections are between Users — for Company/Investor entities we just
      // record against their ID (the backend handles the entity type distinction)
      await apiService.sendConnection(match.id);
      setConnectionStates(prev => ({ ...prev, [match.id]: 'sent' }));
      setMyConnections(prev => new Set(prev).add(match.id));
    } catch (err: any) {
      const msg = err?.response?.data?.message || '';
      if (msg.includes('duplicate') || msg.includes('Unique')) {
        setConnectionStates(prev => ({ ...prev, [match.id]: 'sent' }));
      } else {
        setConnectionStates(prev => ({ ...prev, [match.id]: 'idle' }));
      }
    }
  };

  const isSent = (id: string) =>
    connectionStates[id] === 'sent' || myConnections.has(id);
  const isSending = (id: string) => connectionStates[id] === 'sending';

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      
      {/* Header + Filter Bar */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">B.I.R.D Discover</h1>
            <p className="text-slate-500 text-sm">
              AI-scored compatibility matches based on sector, stage, geography, and ticket size.
              {' '}<span className="font-semibold text-blue-600">{matches.length} matches found.</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500 transition-colors dark:text-white w-36"
              placeholder="Sector..."
              value={filters.sector}
              onChange={e => setFilters(prev => ({ ...prev, sector: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') loadMatches(); }}
            />
            <input
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500 transition-colors dark:text-white w-28"
              placeholder="Stage..."
              value={filters.stage}
              onChange={e => setFilters(prev => ({ ...prev, stage: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') loadMatches(); }}
            />
            <input
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500 transition-colors dark:text-white w-28"
              placeholder="Location..."
              value={filters.location}
              onChange={e => setFilters(prev => ({ ...prev, location: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') loadMatches(); }}
            />
            <button
              onClick={loadMatches}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              Search
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Running B.I.R.D matching engine...</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-20 text-center shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No matches found</h3>
          <p className="text-slate-500">Try adjusting your search filters or update your profile for better results.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map(match => (
            <div key={match.id} className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md hover:border-blue-500/30 transition-all group flex flex-col">
              {/* Cover */}
              <div className="h-20 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative" />

              <div className="px-5 pb-5 pt-0 flex-1 flex flex-col relative -mt-8">
                <div className="flex justify-between items-end mb-4">
                  <img
                    src={match.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${match.name}&backgroundColor=dbeafe&textColor=1e40af`}
                    className="w-14 h-14 rounded-xl border-4 border-white dark:border-[#0f172a] object-cover bg-white shadow-sm"
                    alt={match.name}
                  />
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${scoreBadge(match.matchScore)}`}>
                      {match.matchLabel}
                    </span>
                    <ScoreRing score={match.matchScore} />
                  </div>
                </div>

                <div className="flex-1">
                  <h3
                    className="text-lg font-bold text-slate-900 dark:text-white mb-1 cursor-pointer hover:text-blue-600 transition-colors group-hover:text-blue-600"
                    onClick={() => setActiveProfile(match)}
                  >
                    {match.name}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mb-1">
                    {match.location} · {match.type === 'COMPANY' ? match.industry : 'Investor'}
                    {match.stage && ` · ${match.stage}`}
                  </p>
                  {match.type === 'COMPANY' && match.targetRaise && (
                    <p className="text-xs font-semibold text-blue-600 mb-3">Raising ₹{match.targetRaise} Cr</p>
                  )}
                  {match.type === 'INVESTOR' && (match.minCheckSize || match.maxCheckSize) && (
                    <p className="text-xs font-semibold text-blue-600 mb-3">
                      Ticket: ₹{match.minCheckSize}–{match.maxCheckSize} Cr
                    </p>
                  )}
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-5">{match.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-auto">
                  <button
                    onClick={() => handleConnect(match)}
                    disabled={isSent(match.id) || isSending(match.id)}
                    className={`py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                      isSent(match.id)
                        ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 cursor-default'
                        : isSending(match.id)
                        ? 'bg-slate-100 text-slate-500 cursor-wait'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    }`}
                  >
                    {isSent(match.id) && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                    {isSent(match.id) ? 'Connected' : isSending(match.id) ? 'Sending...' : 'Connect'}
                  </button>
                  <button
                    onClick={() => setActiveProfile(match)}
                    className="py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Profile Modal */}
      {activeProfile && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setActiveProfile(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="h-28 bg-gradient-to-r from-blue-600 to-indigo-600 relative shrink-0">
              <button onClick={() => setActiveProfile(null)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 p-2 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 pb-6 overflow-y-auto">
              <div className="flex justify-between items-end -mt-10 mb-5">
                <img
                  src={activeProfile.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${activeProfile.name}&backgroundColor=dbeafe&textColor=1e40af`}
                  className="w-20 h-20 rounded-2xl border-4 border-white dark:border-[#0f172a] shadow-md object-cover bg-white"
                  alt={activeProfile.name}
                />
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-semibold">B.I.R.D Score</p>
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{activeProfile.matchScore}<span className="text-sm text-slate-500">/100</span></p>
                  </div>
                  <ScoreRing score={activeProfile.matchScore} />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{activeProfile.name}</h2>
              <p className="text-slate-500 text-sm mb-4">
                {activeProfile.location} ·
                {activeProfile.type === 'COMPANY' ? ` ${activeProfile.industry}` : ' Investor'}
                {activeProfile.stage && ` · ${activeProfile.stage}`}
              </p>

              {/* Key metrics */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {activeProfile.teamSize && (
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-700">
                    <p className="text-lg font-extrabold text-slate-900 dark:text-white">{activeProfile.teamSize}+</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-semibold">Team Size</p>
                  </div>
                )}
                {activeProfile.foundedYear && (
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-700">
                    <p className="text-lg font-extrabold text-slate-900 dark:text-white">{activeProfile.foundedYear}</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-semibold">Founded</p>
                  </div>
                )}
                {activeProfile.targetRaise && (
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-700">
                    <p className="text-lg font-extrabold text-blue-600">₹{activeProfile.targetRaise}Cr</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-semibold">Target Raise</p>
                  </div>
                )}
                {activeProfile.minCheckSize && (
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-700">
                    <p className="text-sm font-extrabold text-blue-600">₹{activeProfile.minCheckSize}–{activeProfile.maxCheckSize}Cr</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-semibold">Ticket Size</p>
                  </div>
                )}
              </div>

              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-5 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                {activeProfile.description}
              </p>

              {activeProfile.targetSectors && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Focus Areas</p>
                  <div className="flex flex-wrap gap-2">
                    {activeProfile.targetSectors.split(',').map(s => (
                      <span key={s.trim()} className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 px-2.5 py-1 rounded-full text-xs font-semibold border border-blue-100 dark:border-blue-800">
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { handleConnect(activeProfile); setActiveProfile(null); }}
                  disabled={isSent(activeProfile.id) || isSending(activeProfile.id)}
                  className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
                    isSent(activeProfile.id)
                      ? 'bg-green-50 text-green-700 cursor-default dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                  }`}
                >
                  {isSent(activeProfile.id) ? '✓ Connected' : 'Send Connection Request'}
                </button>
                {activeProfile.website && (
                  <a href={activeProfile.website} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-3 rounded-xl font-semibold text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Matches;
