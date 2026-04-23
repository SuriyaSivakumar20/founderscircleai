import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { apiService } from '../services/apiService';

interface AuthProps {
  onboardingScore: number;
  onRegister: (user: User) => void;
}

const SECTORS = [
  'Fintech / Payments',
  'Fintech / Lending',
  'SaaS / B2B',
  'SaaS / Enterprise Software',
  'HealthTech',
  'EdTech',
  'Quick Commerce / E-commerce',
  'Logistics / Supply Chain',
  'Manufacturing / Deep Tech',
  'AI / Machine Learning',
  'CleanTech / Sustainability',
  'Agriculture / AgriTech',
  'Mobility / EV',
  'Consumer / D2C',
  'Media / Content',
  'Venture Capital',
  'Technology',
  'Other',
];

const Auth: React.FC<AuthProps> = ({ onboardingScore, onRegister }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    industry: 'Fintech / Payments',
    location: '',
    description: '',
    role: 'FOUNDER' as UserRole,
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      // Direct call to POST /api/auth/register — saved permanently to PostgreSQL (Neon)
      const data = await apiService.register({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        name: formData.name.trim(),
        role: formData.role,
        industry: formData.industry,
        location: formData.location.trim() || undefined,
        description: formData.description.trim() || undefined,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(formData.name)}&backgroundColor=dbeafe&textColor=1e40af`,
      });
      // data.token is stored by apiService.register → localStorage
      onRegister(data.user);
    } catch (err: any) {
      // Show the real error — NO silent fallback that hides DB failures
      const msg = err?.response?.data?.message
        || err?.response?.data?.errors?.[0]?.message
        || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const isFounder = formData.role === 'FOUNDER';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 mb-4 text-2xl">
            🐦
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Create your B.I.R.D profile
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            AI Vetting Score:
            <span className="ml-1 font-bold text-blue-600">{onboardingScore}/10</span>
            {' '}— Your account will be permanently saved to our database.
          </p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Role toggle */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                I am joining as a
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['FOUNDER', 'INVESTOR'] as UserRole[]).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setFormData(f => ({ ...f, role: r }))}
                    className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                      formData.role === r
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    {r === 'FOUNDER' ? '🚀 Startup Founder' : '💼 Investor / VC'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {isFounder
                  ? 'As a Founder, you\'ll see matched investors on your Discover page.'
                  : 'As an Investor, you\'ll see matched startups on your Discover page.'}
              </p>
            </div>

            {/* Name + Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isFounder ? 'Your Full Name' : 'Name / Firm Name'}
                </label>
                <input
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all dark:text-white"
                  placeholder={isFounder ? 'Arjun Nair' : 'Kavya Reddy / Blume Ventures'}
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all dark:text-white"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all dark:text-white"
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all dark:text-white"
                  placeholder="Repeat password"
                  value={formData.confirmPassword}
                  onChange={e => setFormData(f => ({ ...f, confirmPassword: e.target.value }))}
                />
              </div>
            </div>

            {/* Sector + Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isFounder ? 'Your Sector' : 'Focus Sectors'}
                </label>
                <select
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 transition-all dark:text-white cursor-pointer"
                  value={formData.industry}
                  onChange={e => setFormData(f => ({ ...f, industry: e.target.value }))}
                >
                  {SECTORS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Location</label>
                <input
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all dark:text-white"
                  placeholder="Bengaluru, Karnataka"
                  value={formData.location}
                  onChange={e => setFormData(f => ({ ...f, location: e.target.value }))}
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isFounder ? 'What are you building?' : 'Investment thesis / mandate'}
              </label>
              <textarea
                required
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all dark:text-white resize-none"
                placeholder={
                  isFounder
                    ? 'Building payment infrastructure for India\'s 50M SMBs. ₹4.2 Cr ARR, Seed stage...'
                    : 'Deploying ₹5–20 Cr at Seed stage in B2B SaaS and Fintech. 6+ months traction required...'
                }
                value={formData.description}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
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
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold text-sm transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
            >
              {isLoading && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {isLoading ? 'Creating your account...' : 'Create B.I.R.D Account'}
            </button>

            <p className="text-center text-xs text-slate-400">
              Your profile is permanently saved to our secure database and will persist across all sessions.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
