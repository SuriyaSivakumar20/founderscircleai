
import React, { useState } from 'react';
import { User } from '../types';
import { apiService } from '../services/apiService';

interface LoginProps {
  onLogin: (user: User) => void;
  onBack: () => void;
}

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
      // ── Demo Bypass (100% client-side, zero backend needed) ──────────
      if (email.trim().toLowerCase() === 'testing@test.com' && password === 'password') {
        const demoUser = {
          id: 'demo-admin-id',
          email: 'testing@test.com',
          name: 'FoundersCircle Admin',
          role: 'ADMIN' as const,
          industry: 'Technology',
          description: 'Official administrator for the FoundersCircle platform.',
          avatar: 'https://picsum.photos/seed/admin/200',
          createdAt: new Date().toISOString(),
        };
        // Store a fake token so getMe() doesn't fail on refresh
        localStorage.setItem('founders_circle_token', 'demo-token-bypass');
        localStorage.setItem('founders_circle_demo_user', JSON.stringify(demoUser));
        setIsLoading(false);
        onLogin(demoUser);
        return;
      }
      // ────────────────────────────────────────────────────────────────

      const data = await apiService.login({ email, password });
      onLogin(data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid institutional credentials. Please verify your access key.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper dark:bg-ink flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-12 rounded-none text-ink dark:text-paper shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-accent"></div>

        <div className="mb-12">
          <span className="text-[10px] uppercase tracking-[0.4em] text-accent font-bold mb-2 block">Institutional Access</span>
          <h2 className="text-4xl font-serif italic tracking-tight">Login</h2>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[9px] uppercase tracking-[0.3em] text-zinc-400 font-bold block">Email Address</label>
            <input
              type="email"
              required
              className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-3 outline-none focus:border-accent font-serif italic text-xl text-ink dark:text-paper placeholder-zinc-200"
              placeholder="nexus@founderscircle.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] uppercase tracking-[0.3em] text-zinc-400 font-bold block">Access Key</label>
            <input
              type="password"
              required
              className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-3 outline-none focus:border-accent font-serif italic text-xl text-ink dark:text-paper placeholder-zinc-200"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-red-800 dark:text-red-400 text-[10px] uppercase tracking-widest font-bold italic">
              {error}
            </p>
          )}

          <div className="pt-6 space-y-6">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent text-white py-5 rounded-none font-bold transition-all hover:opacity-90 uppercase tracking-[0.4em] text-[10px] shadow-xl shadow-accent/20 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Authorizing...' : 'Authorize Session'}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full border border-zinc-200 dark:border-zinc-800 text-zinc-500 py-5 rounded-none font-bold transition-all hover:text-ink dark:hover:text-paper uppercase tracking-[0.4em] text-[10px]"
            >
              Return to Nexus
            </button>
          </div>
        </form>

        <div className="mt-12 pt-8 border-t border-zinc-50 dark:border-zinc-800">
          <p className="text-[8px] uppercase tracking-[0.3em] text-zinc-400 font-bold text-center">
            Demo Credentials: testing@test.com / password
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
