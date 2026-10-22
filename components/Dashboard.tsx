import React, { useEffect, useState } from 'react';
import anime from 'animejs';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { User } from '../types';
import Feed from './Feed';
import Chat from './Chat';
import ProfileView from './ProfileView';
import Matches from './Matches';
import { LogoMark } from './Brand';
import { apiService } from '../services/apiService';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

type TabId = 'feed' | 'matches' | 'network' | 'profile';

const timeAgoShort = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
};

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, isDarkMode, toggleTheme }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [platformStats, setPlatformStats] = useState<{ totalUsers: number; totalPosts: number; acceptedConnections: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsError, setNotificationsError] = useState('');
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  // Bumped when a notification is clicked → Chat re-fetches requests/conversations
  // (clicking a connection request while already on Messages must not show stale data).
  const [chatRefreshKey, setChatRefreshKey] = useState(0);

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

  // ── Notification panel ────────────────────────────────────────────────────
  const refreshNotifications = async () => {
    try {
      const data = await apiService.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setNotificationsError('');
    } catch {
      setNotificationsError('Could not load notifications.');
    }
  };

  useEffect(() => {
    if (!showNotifications) return;
    setIsLoadingNotifications(true);
    refreshNotifications().finally(() => setIsLoadingNotifications(false));
  }, [showNotifications]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNotificationClick = async (n: any) => {
    try {
      if (!n.isRead) {
        await apiService.markNotificationRead(n.id);
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch { /* click still navigates below */ }

    setShowNotifications(false);
    setChatRefreshKey(prev => prev + 1); // Chat re-reads requests + conversations
    if (n.type === 'CONNECTION_REQUEST' && n.referenceId) {
      navigate('/dashboard/network'); // pending requests are actionable in Chat
    } else if (n.type === 'MESSAGE') {
      navigate('/dashboard/network');
    } else if (n.type === 'NEW_LIKE' || n.type === 'NEW_COMMENT') {
      navigate('/dashboard/feed');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiService.markAllNotificationsRead();
      setNotifications(prev => prev.map(x => ({ ...x, isRead: true })));
      setUnreadCount(0);
    } catch {
      setNotificationsError('Could not mark notifications as read.');
    }
  };

  // ── Header search → Discover pre-filtered ─────────────────────────────────
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/dashboard/matches?q=${encodeURIComponent(q)}` : '/dashboard/matches');
  };

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
    <div className="min-h-screen bg-slate-50 dark:bg-surface-0 flex transition-colors duration-300">

      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white dark:bg-surface-1 border-r border-slate-200 dark:border-slate-800 p-6 z-50 hairline-gold">
        {/* Logo */}
        <div className="mb-10 flex items-center gap-3">
          <LogoMark size={38} />
          <div>
            <span className="font-display text-lg font-semibold tracking-[0.02em] text-slate-900 dark:text-slate-50 leading-tight block">B.I.R.D</span>
            <span className="label-caps text-[8px] text-slate-400 leading-tight block mt-1">Private Capital Network</span>
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
              <p className="text-[10px] text-slate-500 font-semibold">Connections</p>
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
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-surface-1/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white tracking-tight">{pageTitle}</h2>

          <div className="hidden md:flex flex-1 max-w-xs mx-6">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Search sector, city, stage..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-xl pl-9 pr-4 py-2 font-medium focus:border-blue-500 focus:outline-none transition-colors dark:text-white"
              />
            </form>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification bell — real unread count, real panel */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(prev => !prev)}
                className="relative text-slate-500 hover:text-blue-600 dark:text-slate-400 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-white dark:bg-surface-1 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notifications</h3>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {isLoadingNotifications ? (
                        <div className="p-6 flex justify-center">
                          <div className="w-6 h-6 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                        </div>
                      ) : notificationsError ? (
                        <div className="p-6 text-center">
                          <p className="text-xs text-red-500 font-medium mb-3">{notificationsError}</p>
                          <button onClick={refreshNotifications} className="text-xs font-semibold text-blue-600 hover:text-blue-700">Retry</button>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">
                          Nothing yet. Connection requests, likes and messages will appear here.
                        </div>
                      ) : (
                        notifications.map(n => (
                          <button
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-3 ${n.isRead ? 'opacity-60' : ''}`}
                          >
                            {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-800 dark:text-slate-200 font-medium leading-snug">{n.message}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {n.type.replace(/_/g, ' ').toLowerCase()} · {timeAgoShort(n.createdAt)}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

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
            <Route path="network" element={<Chat user={user} refreshKey={chatRefreshKey} />} />
            <Route path="profile" element={<ProfileView user={user} />} />
            <Route path="*"       element={<Navigate to="feed" replace />} />
          </Routes>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-surface-1/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-around p-3 z-50">
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
