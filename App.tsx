import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import { User } from './types';
import { EvaluationResult } from './services/geminiService';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import Landing from './components/Landing';
import Login from './components/Login';
import { apiService } from './services/apiService';

// Demo mode is only offered where the seeded guest account exists:
// local dev, or deployments that explicitly opt in with VITE_SHOW_DEMO=true.
const DEMO_AVAILABLE =
  import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO === 'true';

// ── Protected guard ──────────────────────────
const RequireAuth: React.FC<{ user: User | null; children: React.ReactNode }> = ({ user, children }) => {
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// ── Inner app with router hooks ───────────────
const AppRoutes: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [vetting, setVetting] = useState<EvaluationResult | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [demoError, setDemoError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      // Real token auth only — there is no client-side identity bypass.
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
    setUser(null);
    setVetting(null);
    navigate('/');
  };

  const handleDirectAccess = async () => {
    // Demo mode logs into the seeded guest@bird.ai account through the REAL
    // API — every dashboard call afterwards is authenticated and truthful.
    setDemoError('');
    try {
      const data = await apiService.login({ email: 'guest@bird.ai', password: 'password123' });
      setUser(data.user);
      navigate('/dashboard/feed');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setDemoError(
        msg
          ? `Demo account unavailable: ${msg}`
          : 'Demo account unavailable on this deployment. Create your own profile instead.'
      );
    }
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
              onDirectAccess={DEMO_AVAILABLE ? handleDirectAccess : undefined}
              notice={demoError}
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
            onComplete={(evaluation, _role) => {
              setVetting(evaluation);
              // Admission rule lives server-side in the rubric; the client only
              // routes on the returned admissionStatus.
              navigate(evaluation.admissionStatus === 'REJECTED' ? '/denied' : '/register');
            }}
          />
        }
      />

      <Route
        path="/register"
        element={
          vetting !== null
            ? <Auth vetting={vetting} onRegister={(u) => { setUser(u); navigate('/dashboard/feed'); }} />
            : <Navigate to="/onboarding" replace />
        }
      />

      <Route
        path="/denied"
        element={
          <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-surface-0 text-slate-900 dark:text-slate-100 p-6 relative overflow-hidden noise-overlay">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse,rgba(208,165,79,0.10),transparent_65%)]" />
              <div className="absolute inset-0 bg-grid-fade opacity-60" />
            </div>
            <div className="max-w-xl w-full bg-white dark:bg-surface-1 p-10 md:p-14 border border-slate-200 dark:border-white/[0.07] rounded-[24px] card-elevated hairline-gold relative z-10">
              <span className="label-caps text-gold-500 mb-4 block">Status · Evaluation Verdict</span>
              <h1 className="font-display text-5xl md:text-6xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-5 leading-[1.05]">
                Not yet.<br />
                <em className="display-italic text-gold-gradient" style={{ fontStyle: 'italic' }}>But close.</em>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[15px] mb-9">
                Your strategic evaluation yielded{' '}
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{vetting?.score ?? 0}/100</span>.
                Admission requires 45+ with a CONDITIONAL or ADMITTED verdict. Re-attempt the
                interview — each attempt is graded fresh by the analyst.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate('/onboarding')}
                  className="btn-shine flex-1 bg-blue-600 text-white px-6 py-4 rounded-full font-bold text-[14px] hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                >
                  Re-attempt the interview
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 border border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-300 px-6 py-4 rounded-full font-semibold text-[14px] hover:border-slate-400 dark:hover:border-white/30 hover:bg-white/70 dark:hover:bg-white/[0.04] transition-all"
                >
                  Back to home
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
