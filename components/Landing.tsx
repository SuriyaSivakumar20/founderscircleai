
import React from 'react';

interface LandingProps {
  onSignup: () => void;
  onLogin: () => void;
  onDirectAccess: () => void;
}

const Landing: React.FC<LandingProps> = ({ onSignup, onLogin, onDirectAccess }) => {
  return (
    <div className="min-h-screen bg-paper dark:bg-ink text-ink dark:text-paper flex flex-col items-center relative overflow-x-hidden">
      {/* Minimalist Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(197,160,89,0.1),transparent_70%)]"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(26,26,26,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(26,26,26,0.05)_1px,transparent_1px)] bg-[size:100px_100px]"></div>
      </div>

      {/* Hero Section */}
      <section className="min-h-screen w-full flex flex-col items-center justify-center p-10 text-center relative z-10">
        <div className="max-w-5xl">
          <div className="inline-block mb-12">
            <div className="flex items-center gap-4 mb-2 justify-center">
              <div className="w-12 h-12 border border-accent flex items-center justify-center text-accent font-serif italic text-3xl">F</div>
              <h1 className="text-2xl font-serif tracking-tight text-ink dark:text-paper">FoundersCircle</h1>
            </div>
            <div className="h-[1px] w-full bg-accent/30 mb-2"></div>
            <span className="text-[10px] font-medium uppercase tracking-[0.5em] text-accent block">Private Institutional Access</span>
          </div>

          <h2 className="text-7xl md:text-9xl font-serif italic mb-12 tracking-tighter leading-none text-ink dark:text-paper">
            The Elite <span className="text-accent">Nexus</span>
          </h2>

          <p className="mt-8 text-zinc-500 dark:text-zinc-500 font-serif italic">
          Currently vetting Cohort IV
        </p>

        {/* Sample Dealflow */}
        <div className="mt-24 w-full max-w-4xl opacity-50 hover:opacity-100 transition-opacity duration-1000 hidden md:block">
          <span className="text-[10px] uppercase tracking-[0.4em] text-accent font-bold mb-8 block">Sample Deals</span>
          <div className="flex gap-4 blur-[2px] pointer-events-none hover:blur-none transition-all duration-1000">
            <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 text-left shadow-2xl">
               <h4 className="font-serif italic text-2xl mb-2 text-ink dark:text-paper">ZephyrHealth AI</h4>
               <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-4 font-bold">Raising Series A • HealthTech</p>
               <p className="text-sm font-light text-zinc-500 mb-4 line-clamp-2">Voice-first AI diagnostic assistant designed for ASHA workers in low-connectivity rural environments...</p>
               <span className="text-accent text-[10px] uppercase font-bold tracking-widest">₹18 Cr Target</span>
            </div>
            <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 text-left shadow-2xl">
               <h4 className="font-serif italic text-2xl mb-2 text-ink dark:text-paper">Kiran Infra Systems</h4>
               <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-4 font-bold">Raising Seed • ConstructionTech</p>
               <p className="text-sm font-light text-zinc-500 mb-4 line-clamp-2">India's first AI-powered site supervision platform for large-scale infrastructure projects processing 2.4M items...</p>
               <span className="text-accent text-[10px] uppercase font-bold tracking-widest">₹42 Cr Target</span>
            </div>
          </div>
        </div>

          <p className="text-zinc-500 dark:text-zinc-400 text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed mb-12 font-light italic">
            A private ecosystem where clarity of thought meets strategic capital. Admittance is granted only through rigorous AI synthesis.
          </p>

          <div className="mb-12 inline-flex items-center gap-3 bg-accent/5 border border-accent/20 px-6 py-3">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-accent font-bold">India-Focused Public Entity Demo Mode Active</span>
          </div>

          <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
            <div className="flex flex-col md:flex-row gap-8 justify-center w-full">
              <button
                onClick={onSignup}
                className="flex-1 bg-accent text-white py-6 px-12 rounded-none font-bold transition-all hover:opacity-90 uppercase tracking-[0.4em] text-[10px] shadow-2xl shadow-accent/20"
              >
                Initialize Signup
              </button>
              <button
                onClick={onLogin}
                className="flex-1 border border-accent text-accent py-6 px-12 rounded-none font-bold transition-all hover:bg-accent hover:text-white uppercase tracking-[0.4em] text-[10px]"
              >
                Institutional Login
              </button>
            </div>
            <button
              onClick={onDirectAccess}
              className="w-full border border-zinc-200 dark:border-zinc-800 text-zinc-400 py-4 px-12 rounded-none font-bold transition-all hover:text-ink dark:hover:text-paper uppercase tracking-[0.4em] text-[10px]"
            >
              Direct Access (Bypass AI)
            </button>
          </div>
        </div>

        <div className="mt-24 flex flex-col items-center text-accent/40">
          <div className="w-px h-16 bg-accent/30 animate-pulse"></div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-16 px-10 border-t border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between text-zinc-400 gap-10 relative z-10">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold tracking-[0.3em] uppercase">© 2025 FoundersCircle Institutional.</span>
        </div>
        <div className="flex gap-12 text-[9px] font-bold uppercase tracking-[0.3em]">
          <a href="#" className="hover:text-accent transition-colors">Privacy</a>
          <a href="#" className="hover:text-accent transition-colors">Terms</a>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
