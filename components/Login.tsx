import React, { useState } from 'react';
import { User } from '../types';
import { apiService } from '../services/apiService';

interface LoginProps {
  onLogin: (user: User) => void;
  onBack: () => void;
}

const DEMO_ACCOUNTS = [
  { email: 'founder@bird.ai', password: 'password123', role: 'FOUNDER' as const, name: 'Arjun Nair', industry: 'Fintech / Payments', label: 'Founder Demo' },
  { email: 'investor@bird.ai', password: 'password123', role: 'INVESTOR' as const, name: 'Kavya Reddy', industry: 'Venture Capital', label: 'Investor Demo' },
];

const Login: React.FC<LoginProps> = ({ onLogin, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Removed fake client-side demo bypass. Real DB now handles all auth.

      const data = await apiService.login({ email: email.trim().toLowerCase(), password });
      onLogin(data.user);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (msg) {
        setError(msg);
      } else if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network')) {
        setError('Cannot reach server. Check your connection or use a demo account below.');
      } else {
        setError('Incorrect email or password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (demo: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(demo.email);
    setPassword(demo.password);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 mb-4 text-2xl">
            🐦
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Sign in to B.I.R.D</h1>
          <p className="text-slate-500 mt-2 text-sm">Business Intelligence & Resource Development</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all dark:text-white placeholder-slate-400"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all dark:text-white placeholder-slate-400"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-medium px-4 py-3 rounded-xl flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 mt-2"
            >
              {isLoading && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={onBack}
              className="w-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 py-3 rounded-xl font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              ← Back to Home
            </button>
          </form>
        </div>

        {/* Demo Accounts */}
        <div className="mt-5 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 text-center">
            Quick Access — Demo Accounts
          </p>
          <div className="grid grid-cols-2 gap-3">
            {DEMO_ACCOUNTS.map(demo => (
              <button
                key={demo.email}
                type="button"
                onClick={() => fillDemo(demo)}
                className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
              >
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1 group-hover:text-blue-700">{demo.label}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{demo.email}</p>
                <p className="text-xs text-slate-400 font-mono">password123</p>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-3">Click a card to auto-fill credentials</p>
        </div>

      </div>
    </div>
  );
};

export default Login;
