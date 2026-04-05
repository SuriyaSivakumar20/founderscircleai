
import React, { useEffect } from 'react';
import anime from 'animejs';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { User } from '../types';
import Feed from './Feed';
import Chat from './Chat';
import ProfileView from './ProfileView';
import Matches from './Matches';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

type TabId = 'feed' | 'matches' | 'network' | 'profile';

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, isDarkMode, toggleTheme }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Derive current tab from URL
  const pathSegment = location.pathname.split('/').pop() as TabId | undefined;
  const activeTab: TabId = (['feed', 'matches', 'network', 'profile'] as TabId[]).includes(pathSegment as TabId)
    ? (pathSegment as TabId)
    : 'feed';

  useEffect(() => {
    (anime as any)({
      targets: '.dashboard-content',
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 800,
      easing: 'easeOutExpo',
    });
  }, [activeTab]);

  const tabs: { id: TabId; label: string; path: string; icon: React.ReactNode }[] = [
    {
      id: 'feed', label: 'Deal Room', path: '/dashboard/feed',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>,
    },
    {
      id: 'matches', label: 'Matches', path: '/dashboard/matches',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    },
    {
      id: 'network', label: 'Network', path: '/dashboard/network',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
    },
    {
      id: 'profile', label: 'Profile', path: '/dashboard/profile',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    },
  ];

  return (
    <div className="min-h-screen bg-paper dark:bg-ink flex flex-col pb-20 md:pb-0 md:pl-72 transition-colors duration-500">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-72 h-screen fixed left-0 top-0 bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 p-10 z-50">
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 border border-accent flex items-center justify-center text-accent font-serif italic text-xl">F</div>
            <h1 className="text-lg font-serif tracking-tight text-ink dark:text-paper">FoundersCircle</h1>
          </div>
          <div className="h-[1px] w-full bg-accent/20 mb-2" />
          <span className="text-[9px] font-medium uppercase tracking-[0.3em] text-accent block">Private Institutional Access</span>
        </div>

        <nav className="flex-1 space-y-6">
          {tabs.map((tab, idx) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`w-full flex items-center gap-4 py-2 font-serif text-lg transition-all group relative ${activeTab === tab.id
                  ? 'text-accent italic'
                  : 'text-zinc-400 hover:text-ink dark:hover:text-paper'
                }`}
            >
              {activeTab === tab.id && (
                <div className="absolute -left-10 w-1 h-6 bg-accent" />
              )}
              <span className="text-xs font-sans not-italic opacity-50 tracking-widest mr-2">0{idx + 1}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="space-y-6 pt-10 mt-10 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-4 text-[10px] uppercase tracking-widest text-zinc-400 hover:text-accent transition-all font-bold"
          >
            {isDarkMode ? 'Solar Mode' : 'Lunar Mode'}
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-4 text-[10px] uppercase tracking-widest text-red-800 dark:text-red-400 hover:opacity-70 transition-all font-bold"
          >
            Terminate Session
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full dashboard-content relative overflow-x-hidden">
        {/* Sticky Header */}
        <div className="sticky top-0 z-40 bg-paper/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800/60 px-8 py-8 md:px-16 md:py-10 flex justify-between items-end transition-colors duration-500">
          <div>
            <span className="text-[10px] uppercase tracking-[0.4em] text-accent font-bold mb-2 block">Current Workspace</span>
            <h2 className="text-5xl font-serif italic text-ink dark:text-paper capitalize transition-all">
              {activeTab === 'feed' ? 'Deal Room' : activeTab}
            </h2>
          </div>
          <div className="text-right hidden md:block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-bold block mb-1">Authenticated As</span>
            <span className="text-sm font-serif italic text-ink dark:text-paper">{user.name}</span>
          </div>
        </div>

        {/* scrollable routable content area */}
        <div className="p-8 md:p-16 max-w-6xl mx-auto">

        <Routes>
          <Route path="feed" element={<Feed user={user} />} />
          <Route path="matches" element={<Matches user={user} />} />
          <Route path="network" element={<Chat user={user} />} />
          <Route path="profile" element={<ProfileView user={user} />} />
          <Route path="*" element={<Navigate to="feed" replace />} />
        </Routes>
        </div>
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-paper dark:bg-ink border-t border-zinc-200 dark:border-zinc-800 flex justify-around p-6 z-50 backdrop-blur-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`transition-all ${activeTab === tab.id ? 'text-accent' : 'text-zinc-400'}`}
          >
            {tab.icon}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Dashboard;
