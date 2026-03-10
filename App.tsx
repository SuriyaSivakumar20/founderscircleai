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
        // ── Demo user restore on page refresh (no backend call needed) ──
        if (token === 'demo-token-bypass') {
          const demoUser = localStorage.getItem('founders_circle_demo_user');
          if (demoUser) {
            setUser(JSON.parse(demoUser));
            setAuthChecked(true);
            return;
          }
        }
        // ────────────────────────────────────────────────────────────────
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
          <div className="min-h-screen flex items-center justify-center bg-paper dark:bg-ink text-ink dark:text-paper p-6">
            <div className="max-w-md text-center">
              <h1 className="text-6xl font-serif italic mb-4 text-accent tracking-tighter">Access Denied</h1>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed font-light">
                Your evaluation score of{' '}
                <span className="text-ink dark:text-paper font-bold">{onboardingScore}/10</span> was not sufficient for
                FoundersCircle. We maintain a high bar for excellence.
              </p>
              <button
                onClick={() => navigate('/onboarding')}
                className="border border-accent text-accent px-10 py-4 rounded-none font-medium transition-all hover:bg-accent hover:text-white uppercase tracking-widest text-xs"
              >
                Re-evaluate Application
              </button>
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
