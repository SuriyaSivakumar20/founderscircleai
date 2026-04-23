import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import { User } from './types';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import Landing from './components/Landing';
import Login from './components/Login';
import { apiService } from './services/apiService';

// ── Protected guard ──────────────────────────
const RequireAuth: React.FC<{ user: User | null; children: React.ReactNode }> = ({ user, children }) => {
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// ── Inner app with router hooks ───────────────
const AppRoutes: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [onboardingScore, setOnboardingScore] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      // Check for guest bypass in sessionStorage first
      const guestData = sessionStorage.getItem('fc_guest_user');
      if (guestData) {
        setUser(JSON.parse(guestData));
        setAuthChecked(true);
        return;
      }

      const token = localStorage.getItem('founders_circle_token');
      if (token) {

        try {
          const userData = await apiService.getMe();
          setUser(userData);
        } catch {
          localStorage.removeItem('founders_circle_token');
        }
      }
      setAuthChecked(true);
    };
    checkAuth();

    const savedTheme = localStorage.getItem('founders_circle_theme');
    const darkMode = savedTheme ? savedTheme === 'dark' : true;
    setIsDarkMode(darkMode);
    document.documentElement.classList.toggle('dark', darkMode);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('founders_circle_theme', newTheme ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newTheme);
  };

  const handleLogout = () => {
    localStorage.removeItem('founders_circle_token');
    sessionStorage.removeItem('fc_guest_user');
    setUser(null);
    setOnboardingScore(null);
    navigate('/');
  };

  const handleDirectAccess = () => {
    const guestUser: User = {
      id: 'guest-bypass-001',
      email: 'guest@founderscircle.ai',
      role: 'FOUNDER',
      name: 'Guest VIP',
      industry: 'Cross-Domain',
      description: 'Platform guest enjoying direct immediate access.',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=vipguest',
      createdAt: new Date().toISOString(),
    };
    sessionStorage.setItem('fc_guest_user', JSON.stringify(guestUser));
    setUser(guestUser);
    navigate('/dashboard/feed');
  };

  if (!authChecked) return null;

  return (
    <Routes>
      {/* ── Public routes ── */}
      <Route
        path="/"
        element={
          user
            ? <Navigate to="/dashboard/feed" replace />
            : <Landing
              onSignup={() => navigate('/onboarding')}
              onLogin={() => navigate('/login')}
              onDirectAccess={handleDirectAccess}
            />
        }
      />

      <Route
        path="/login"
        element={
          user
            ? <Navigate to="/dashboard/feed" replace />
            : <Login
              onLogin={(u) => { setUser(u); navigate('/dashboard/feed'); }}
              onBack={() => navigate('/')}
            />
        }
      />

      <Route
        path="/onboarding"
        element={
          <Onboarding
            onComplete={(score, _role) => {
              setOnboardingScore(score);
              navigate(score >= 8 ? '/register' : '/denied');
            }}
            onAdminBypass={(u) => { setUser(u); navigate('/dashboard/feed'); }}
          />
        }
      />

      <Route
        path="/register"
        element={
          onboardingScore !== null
            ? <Auth onboardingScore={onboardingScore} onRegister={(u) => { setUser(u); navigate('/dashboard/feed'); }} />
            : <Navigate to="/onboarding" replace />
        }
      />

      <Route
        path="/denied"
        element={
          <div className="min-h-screen flex items-center justify-center bg-paper dark:bg-ink text-ink dark:text-paper p-6 relative overflow-hidden">
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(197,160,89,0.1),transparent_70%)]"></div>
            </div>
            <div className="max-w-xl bg-white dark:bg-zinc-900/50 p-12 border border-zinc-100 dark:border-zinc-800 relative z-10 shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
              <span className="text-[10px] uppercase tracking-[0.4em] text-amber-600 dark:text-amber-500 font-bold mb-2 block">Status: Waitlisted</span>
              <h1 className="text-5xl font-serif italic mb-6 text-ink dark:text-paper tracking-tighter">Conditional Access</h1>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed font-light text-lg">
                Your initial strategic evaluation yielded a score of <span className="text-ink dark:text-paper font-bold">{onboardingScore}/10</span>. 
                While this doesn't meet the threshold for immediate institutional access, your profile shows promise. You have been placed on the priority waitlist.
              </p>
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => navigate('/register')}
                  className="w-full bg-amber-600 text-white px-6 py-5 rounded-none font-bold transition-all hover:bg-amber-700 uppercase tracking-widest text-[10px]"
                >
                  Confirm Waitlist Placement
                </button>
                <button
                  onClick={() => navigate('/onboarding')}
                  className="w-full border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 px-6 py-4 rounded-none font-medium transition-all hover:text-ink dark:hover:text-paper uppercase tracking-widest text-[10px]"
                >
                  Re-Attempt Vetting Protocol
                </button>
              </div>
            </div>
          </div>
        }
      />

      {/* ── Protected dashboard routes ── */}
      <Route
        path="/dashboard/*"
        element={
          <RequireAuth user={user}>
            <Dashboard
              user={user!}
              onLogout={handleLogout}
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
            />
          </RequireAuth>
        }
      />

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);

export default App;
