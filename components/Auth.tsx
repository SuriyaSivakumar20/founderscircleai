
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { apiService } from '../services/apiService';

interface AuthProps {
  onboardingScore: number;
  onRegister: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onboardingScore, onRegister }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    industry: 'Technology',
    description: '',
    role: 'FOUNDER' as UserRole
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const data = await apiService.register({
        ...formData,
        avatar: `https://picsum.photos/seed/${formData.name}/200`,
      });
      onRegister(data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initialize profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper dark:bg-ink flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-accent"></div>
        
        <div className="p-12 border-b border-zinc-50 dark:border-zinc-800 flex justify-between items-end">
          <div>
            <span className="text-[10px] uppercase tracking-[0.4em] text-accent font-bold mb-2 block">Identity Initialization</span>
            <h2 className="text-5xl font-serif italic text-ink dark:text-paper tracking-tight">Inner Circle</h2>
          </div>
          <div className="text-right">
             <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold block mb-1">Audit Result</span>
             <span className="text-3xl font-serif italic text-accent">{onboardingScore}<span className="text-sm not-italic opacity-30">/10</span></span>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-12 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-2">
              <label className="text-[9px] uppercase tracking-[0.3em] text-zinc-400 font-bold block">Email Address</label>
              <input 
                type="email"
                required
                className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-3 outline-none focus:border-accent font-serif italic text-xl text-ink dark:text-paper placeholder-zinc-200"
                placeholder="nexus@founderscircle.in"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] uppercase tracking-[0.3em] text-zinc-400 font-bold block">Access Key (Password)</label>
              <input 
                type="password"
                required
                className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-3 outline-none focus:border-accent font-serif italic text-xl text-ink dark:text-paper placeholder-zinc-200"
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-2">
              <label className="text-[9px] uppercase tracking-[0.3em] text-zinc-400 font-bold block">Entity Designation</label>
              <input 
                required
                className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-3 outline-none focus:border-accent font-serif italic text-2xl text-ink dark:text-paper placeholder-zinc-200"
                placeholder="Full Name / Firm"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[9px] uppercase tracking-[0.3em] text-zinc-400 font-bold block">Sector Domain</label>
              <select 
                className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-3 outline-none focus:border-accent font-serif italic text-xl text-zinc-500 appearance-none cursor-pointer"
                value={formData.industry}
                onChange={e => setFormData({...formData, industry: e.target.value})}
              >
                <option>Technology</option>
                <option>Medical / Healthcare</option>
                <option>Finance / Fintech</option>
                <option>Energy / Sustainability</option>
                <option>Consumer Goods</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] uppercase tracking-[0.3em] text-zinc-400 font-bold block">Strategic Narrative</label>
            <textarea 
              required
              className="w-full bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-100 dark:border-zinc-800 p-8 outline-none focus:border-accent h-32 resize-none font-serif italic text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed"
              placeholder="Articulate your institutional vision..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          {error && (
            <p className="text-red-800 dark:text-red-400 text-[10px] uppercase tracking-widest font-bold italic">
              {error}
            </p>
          )}

          <div className="pt-6">
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full border border-accent text-accent py-5 rounded-none font-bold transition-all hover:bg-accent hover:text-white uppercase tracking-[0.4em] text-[10px] shadow-xl shadow-accent/5 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Initializing...' : 'Initialize Profile Dossier'}
            </button>
            <p className="text-center mt-6 text-[8px] uppercase tracking-[0.3em] text-zinc-400 font-bold">
              By proceeding, you agree to the institutional terms of engagement.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;
