import React, { useEffect, useState } from 'react';
import anime from 'animejs';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { User } from '../types';
import Feed from './Feed';
import Chat from './Chat';
import ProfileView from './ProfileView';
import Matches from './Matches';
import { apiService } from '../services/apiService';

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
  const [unreadCount, setUnreadCount] = useState(0);
  const [platformStats, setPlatformStats] = useState<{ totalUsers: number; totalPosts: number; acceptedConnections: number } | null>(null);

  const pathSegment = location.pathname.split('/').pop() as TabId | undefined;
  const activeTab: TabId = (['feed', 'matches', 'network', 'profile'] as TabId[]).includes(pathSegment as TabId)
    ? (pathSegment as TabId)
    : 'feed';

  useEffect(() => {
    (anime as any)({
      targets: '.dashboard-content',
      opacity: [0, 1],
      translateY: [8, 0],
      duration: 400,
      easing: 'easeOutQuad',
    });
  }, [activeTab]);

  // Real notification count from the DB
  useEffect(() => {
    const fetchNotifications = () => {
      apiService.getNotifications()
        .then(data => setUnreadCount(data.unreadCount || 0))
        .catch(() => {});
    };
    fetchNotifications();
    // Poll every 30 seconds for new notifications (real-time lite)
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Real analytics from the DB
  useEffect(() => {
    apiService.getAnalyticsSummary()
      .then(data => setPlatformStats(data.platform))
      .catch(() => {});
  }, []);

  const tabs: { id: TabId; label: string; path: string; icon: React.ReactNode }[] = [
    {
      id: 'feed', label: 'News Feed', path: '/dashboard/feed',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>,
    },
    {
      id: 'matches', label: 'Discover', path: '/dashboard/matches',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    },
    {
      id: 'network', label: 'Messages', path: '/dashboard/network',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
    },
    {
      id: 'profile', label: 'My Profile', path: '/dashboard/profile',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    },
  ];

  const pageTitle = tabs.find(t => t.id === activeTab)?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] flex transition-colors duration-300">

      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800 p-6 z-50">
        {/* Logo */}
        <div className="mb-10 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/30">
            🐦
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white leading-tight block">B.I.R.D</span>
            <span className="text-[10px] font-medium text-slate-500 leading-tight">Business Intelligence</span>
          </div>
        </div>

        {/* Platform Stats — live from DB */}
        {platformStats && (
          <div className="mb-6 grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
            <div className="text-center">
              <p className="text-base font-extrabold text-slate-900 dark:text-white">{platformStats.totalUsers}</p>
              <p className="text-[10px] text-slate-500 font-semibold">Users</p>
            </div>
            <div className="text-center">
              <p className="text-base font-extrabold text-slate-900 dark:text-white">{platformStats.totalPosts}</p>
              <p className="text-[10px] text-slate-500 font-semibold">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-base font-extrabold text-blue-600">{platformStats.acceptedConnections}</p>
              <p className="text-[10px] text-slate-500 font-semibold">Deals</p>
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-1">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="pt-5 mt-5 border-t border-slate-200 dark:border-slate-800 space-y-1">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isDarkMode
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              }
            </svg>
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full md:ml-64 flex flex-col min-h-screen">

        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{pageTitle}</h2>

          <div className="hidden md:flex flex-1 max-w-xs mx-6">
            <div className="relative w-full">
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Search B.I.R.D..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-xl pl-9 pr-4 py-2 font-medium focus:border-blue-500 focus:outline-none transition-colors dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification bell with real unread count */}
            <button className="relative text-slate-500 hover:text-blue-600 dark:text-slate-400 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-3">
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                alt="Profile"
                className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              />
              <div className="hidden sm:block">
                <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[120px]">{user.name}</div>
                <div className="text-xs font-medium text-slate-500 capitalize">{user.role.toLowerCase()}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 md:p-8 flex-1 max-w-[1600px] mx-auto w-full dashboard-content">
          <Routes>
            <Route path="feed"    element={<Feed user={user} />} />
            <Route path="matches" element={<Matches user={user} />} />
            <Route path="network" element={<Chat user={user} />} />
            <Route path="profile" element={<ProfileView user={user} />} />
            <Route path="*"       element={<Navigate to="feed" replace />} />
          </Routes>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-around p-3 z-50">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-colors ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-500'}`}
          >
            {tab.icon}
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Dashboard;
