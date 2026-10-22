import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LogoMark } from './Brand';

interface LandingProps {
  onSignup: () => void;
  onLogin: () => void;
  /** Dev/demo deployments only — logs into the seeded guest account via the real API. */
  onDirectAccess?: () => void;
  /** Honest error surfaced when the demo account login fails. */
  notice?: string;
}

/* ═══ Hooks & micro-components ═══════════════════════════════ */

/** Adds .is-visible to every .reveal element when it scrolls into view. */
const useReveal = () => {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      }),
      { threshold: 0.12 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
};

/** Eased count-up that fires when the element enters the viewport. */
const CountUp: React.FC<{ to: number; className?: string }> = ({ to, className }) => {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { setN(to); return; }
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const dur = 1200;
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / dur);
        setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [to]);

  return <span ref={ref} className={className}>{String(n).padStart(2, '0')}</span>;
};

/** Animated engine-signal bar (sector / stage / geo / ticket). */
const SignalBar: React.FC<{ label: string; weight: number; width: number; delay: number }> = ({ label, weight, width, delay }) => {
  const [on, setOn] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { setOn(true); return; }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setOn(true); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="group">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
        <span className="label-caps text-slate-400 group-hover:text-gold-500 transition-colors">{weight} pts</span>
      </div>
      <div className="h-[7px] rounded-full bg-slate-200 dark:bg-surface-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-700 bar-fill"
          style={{ width: on ? `${width}%` : '0%', '--bar-delay': `${delay}ms` } as React.CSSProperties}
        />
      </div>
    </div>
  );
};

/** Score ring used in the hero artifact and engine cards. */
const Ring: React.FC<{ score: number; size?: number; stroke?: number }> = ({ score, size = 84, stroke = 5 }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 80 ? '#22A170' : score >= 60 ? '#48BA89' : '#D0A54F';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-slate-200 dark:text-surface-2" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (score / 100) * c}
          style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.16,1,0.3,1) 0.3s' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono font-semibold text-slate-900 dark:text-slate-50" style={{ fontSize: size * 0.26 }}>{score}</span>
      </div>
    </div>
  );
};

/* ═══ Navigation ════════════════════════════════════════════ */

const Nav: React.FC<{ onLogin: () => void; onSignup: () => void }> = ({ onLogin, onSignup }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-paper/80 dark:bg-surface-0/80 backdrop-blur-xl border-b border-slate-200/70 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <nav className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <a href="#" className="flex items-center gap-3 group">
          <LogoMark size={38} className="transition-transform duration-500 group-hover:rotate-[-4deg] group-hover:scale-105" />
          <div className="leading-none">
            <span className="font-display text-lg font-semibold tracking-[0.02em] text-slate-900 dark:text-slate-50">B.I.R.D</span>
            <span className="label-caps text-slate-400 block mt-[3px] text-[9px]">Private Capital Network</span>
          </div>
        </a>

        <div className="hidden md:flex items-center gap-9 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
          <a href="#protocol" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Protocol</a>
          <a href="#engine" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Engine</a>
          <a href="#access" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Access</a>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onLogin}
            className="hidden sm:block text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-3 py-2"
          >
            Sign in
          </button>
          <button
            onClick={onSignup}
            className="btn-shine text-[13px] font-bold bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 px-5 py-2.5 rounded-full hover:shadow-lg hover:shadow-blue-600/20 hover:-translate-y-px active:translate-y-0 transition-all duration-300"
          >
            Request access
          </button>
        </div>
      </nav>
    </header>
  );
}

/* ═══ Landing ═══════════════════════════════════════════════ */

const Landing: React.FC<LandingProps> = ({ onSignup, onLogin, onDirectAccess, notice }) => {
  useReveal();

  // Cursor parallax for the hero artifact
  const [ptr, setPtr] = useState({ x: 0, y: 0 });
  const onHeroMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPtr({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 });
  }, []);

  const ALLOCATORS = ['Peak XV', 'Blume', 'Accel', 'Elevation', 'Lightspeed', 'Z47', 'Matrix', 'Chiratae', 'Titan Capital', 'Omidyar'];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-surface-0 text-slate-900 dark:text-slate-100 selection:bg-blue-200 dark:selection:bg-blue-900 overflow-x-hidden">

      <Nav onLogin={onLogin} onSignup={onSignup} />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section onMouseMove={onHeroMove} className="relative pt-36 md:pt-44 pb-24 md:pb-32 px-6 noise-overlay">
        {/* Atmosphere */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[560px] bg-[radial-gradient(ellipse,rgba(34,161,112,0.14),transparent_65%)] dark:bg-[radial-gradient(ellipse,rgba(34,161,112,0.16),transparent_65%)]" />
          <div className="absolute top-24 right-[8%] w-[380px] h-[380px] bg-[radial-gradient(circle,rgba(208,165,79,0.10),transparent_65%)] rounded-full blur-2xl" />
          <div className="absolute inset-0 bg-grid-fade opacity-70" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10 grid lg:grid-cols-[1.05fr_0.95fr] gap-16 lg:gap-10 items-center">
          {/* Copy column */}
          <div className="text-center lg:text-left">
            <div className="reveal inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm mb-8">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-blue-500 animate-halo" />
                <span className="relative rounded-full h-2 w-2 bg-blue-500" />
              </span>
              <span className="label-caps text-slate-500 dark:text-slate-400">Invite-only · AI-vetted dealflow</span>
            </div>

            <h1
              className="reveal font-display text-[3.1rem] leading-[1.04] sm:text-7xl xl:text-[5.2rem] font-semibold tracking-[-0.015em] text-slate-900 dark:text-slate-50 mb-7"
              style={{ '--reveal-delay': '80ms' } as React.CSSProperties}
            >
              Capital, meets
              <br />
              <em className="display-italic text-gold-gradient not-italic font-normal" style={{ fontStyle: 'italic' }}>conviction.</em>
            </h1>

            <p
              className="reveal text-lg leading-relaxed text-slate-500 dark:text-slate-400 max-w-xl mx-auto lg:mx-0 mb-10"
              style={{ '--reveal-delay': '180ms' } as React.CSSProperties}
            >
              A private protocol where founders are interviewed by AI analysts, scored across five
              dimensions, and introduced only to capital that actually fits. No spray. No pray.
            </p>

            <div
              className="reveal flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 mb-10"
              style={{ '--reveal-delay': '280ms' } as React.CSSProperties}
            >
              <button
                onClick={onSignup}
                className="btn-shine w-full sm:w-auto group bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-[15px] hover:bg-blue-700 shadow-xl shadow-blue-600/25 hover:shadow-blue-600/35 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
              >
                Request access
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
              {onDirectAccess && (
                <button
                  onClick={onDirectAccess}
                  className="w-full sm:w-auto px-8 py-4 rounded-full font-semibold text-[15px] border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-white/30 hover:bg-white/70 dark:hover:bg-white/[0.04] backdrop-blur-sm transition-all duration-300"
                >
                  Enter the demo
                </button>
              )}
            </div>

            {notice && (
              <p className="reveal text-[13px] text-red-600 dark:text-red-400 font-semibold mt-3" style={{ '--reveal-delay': '300ms' } as React.CSSProperties}>
                {notice}
              </p>
            )}

            <p className="reveal text-[13px] text-slate-400 dark:text-slate-500" style={{ '--reveal-delay': '360ms' } as React.CSSProperties}>
              For founders raising <span className="font-mono text-slate-500 dark:text-slate-400">₹5–50 Cr</span>
              <span className="mx-2 text-slate-300 dark:text-slate-700">·</span>
              For funds deploying <span className="font-mono text-slate-500 dark:text-slate-400">₹2–100 Cr</span>
              <span className="mx-2 text-slate-300 dark:text-slate-700">·</span>
              <button onClick={onLogin} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline underline-offset-4">Already admitted? Sign in</button>
            </p>
          </div>

          {/* Artifact column — the product, alive */}
          <div
            className="relative mx-auto w-full max-w-[420px] lg:max-w-none"
            style={{ transform: `translate3d(${ptr.x * 12}px, ${ptr.y * 9}px, 0)`, transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1)' }}
          >
            {/* Main diagnostic card */}
            <div className="reveal card-elevated hairline-gold bg-white dark:bg-surface-1 border border-slate-200 dark:border-white/[0.06] rounded-[22px] p-7 relative z-10" style={{ '--reveal-delay': '220ms' } as React.CSSProperties}>
              <div className="flex items-center justify-between mb-6">
                <span className="label-caps text-slate-400">AI Diagnostic · Live</span>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inset-0 rounded-full bg-blue-500 animate-halo" />
                    <span className="relative rounded-full h-1.5 w-1.5 bg-blue-500" />
                  </span>
                  ANALYZING
                </span>
              </div>

              <div className="flex items-center gap-6 mb-7">
                <Ring score={84} size={92} />
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[11px] font-bold tracking-wide uppercase mb-2">
                    ✓ Admitted
                  </div>
                  <p className="font-display text-[17px] leading-snug text-slate-900 dark:text-slate-100">
                    “Defensible moat. Sharp ICP.<br />Raise readiness confirmed.”
                  </p>
                </div>
              </div>

              <div className="space-y-3.5">
                {[
                  { l: 'Differentiation', v: 17 },
                  { l: 'Competitive positioning', v: 16 },
                  { l: 'Business viability', v: 18 },
                  { l: 'Strategy clarity', v: 16 },
                ].map((d, i) => (
                  <div key={d.l} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-44 shrink-0">{d.l}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-surface-2 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 bar-fill" style={{ width: '0%', '--bar-delay': `${600 + i * 140}ms` } as React.CSSProperties} data-w={`${(d.v / 20) * 100}%`} ref={el => { if (el) requestAnimationFrame(() => { const p = el as HTMLElement; p.style.width = p.dataset.w || '0%'; }); }} />
                    </div>
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-300 w-10 text-right">{d.v}/20</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating match chip */}
            <div
              className="reveal animate-floaty absolute -left-4 sm:-left-10 bottom-[-28px] z-20 bg-white dark:bg-surface-2 border border-slate-200 dark:border-white/[0.07] rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3"
              style={{ '--reveal-delay': '520ms' } as React.CSSProperties}
            >
              <Ring score={92} size={44} stroke={3.5} />
              <div>
                <p className="text-[12px] font-bold text-slate-900 dark:text-slate-100 leading-tight">Aarna ⟷ Peak Ventures</p>
                <p className="label-caps text-[9px] text-blue-600 dark:text-blue-400 mt-1">High match · Fintech-adjacent</p>
              </div>
            </div>

            {/* Floating connection chip */}
            <div
              className="reveal animate-floaty-slow absolute -right-3 sm:-right-8 top-[-24px] z-20 bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-2.5"
              style={{ '--reveal-delay': '640ms' } as React.CSSProperties}
            >
              <span className="w-6 h-6 rounded-full bg-blue-500/90 flex items-center justify-center text-[11px]">✓</span>
              <span className="text-[12px] font-semibold">Kavya R. accepted your request</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Allocator marquee ────────────────────────────────── */}
      <section className="py-10 border-y border-slate-200/80 dark:border-white/5 bg-white/50 dark:bg-surface-1/50 marquee-mask">
        <div className="max-w-6xl mx-auto px-6 mb-5">
          <p className="label-caps text-slate-400 text-center">Allocators in the room</p>
        </div>
        <div className="overflow-hidden">
          <div className="marquee-track">
            {[...ALLOCATORS, ...ALLOCATORS].map((name, i) => (
              <span key={i} className="mx-8 md:mx-12 font-display text-xl md:text-2xl font-medium text-slate-300 dark:text-slate-700 hover:text-slate-500 dark:hover:text-slate-500 transition-colors duration-300 whitespace-nowrap">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats band ───────────────────────────────────────── */}
      <section className="py-16 md:py-20 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-200 dark:divide-white/5">
          {[
            { n: 5, label: 'Dimensions scored', sub: 'per interview' },
            { n: 100, label: 'Point engine', sub: 'fully explainable' },
            { n: 4, label: 'Weighted signals', sub: 'sector·stage·geo·ticket' },
            { n: 5, label: 'Minute verdict', sub: 'interview to decision' },
          ].map((s, i) => (
            <div key={i} className="reveal text-center px-4" style={{ '--reveal-delay': `${i * 90}ms` } as React.CSSProperties}>
              <div className="font-mono text-4xl md:text-5xl font-semibold text-slate-900 dark:text-slate-50 mb-2">
                <CountUp to={s.n} />
              </div>
              <p className="text-[13px] font-bold text-slate-700 dark:text-slate-300">{s.label}</p>
              <p className="label-caps text-[9px] text-slate-400 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── The Protocol ─────────────────────────────────────── */}
      <section id="protocol" className="py-24 md:py-32 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-16 md:mb-20">
            <p className="reveal label-caps text-blue-600 dark:text-blue-400 mb-4">The Protocol</p>
            <h2 className="reveal font-display text-4xl md:text-[3.4rem] leading-[1.08] font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-5" style={{ '--reveal-delay': '80ms' } as React.CSSProperties}>
              Admission is earned,<br /><em className="display-italic text-gold-gradient" style={{ fontStyle: 'italic' }}>not bought.</em>
            </h2>
            <p className="reveal text-lg text-slate-500 dark:text-slate-400 leading-relaxed" style={{ '--reveal-delay': '160ms' } as React.CSSProperties}>
              Every member faces the same five questions. The same rubric. The same public score.
              The door is narrow by design.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                n: '01', t: 'The Interview',
                d: 'An AI analyst — briefed on India\'s most recent benchmark companies — probes your thesis for five rounds. Founders get challenged on their moat. Investors on their edge.',
                icon: <path strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />,
              },
              {
                n: '02', t: 'The Diagnostic',
                d: 'Five dimensions, scored out of twenty: differentiation, positioning, viability, strategy, innovation. ≥70 admits you. The full report is yours either way.',
                icon: <path strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
              },
              {
                n: '03', t: 'The Room',
                d: 'Introductions are scored on sector, stage, geography and ticket size — then held behind an accept gate. Messaging unlocks only on a mutual yes.',
                icon: <path strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />,
              },
            ].map((s, i) => (
              <div
                key={s.n}
                className="reveal group relative bg-white dark:bg-surface-1 border border-slate-200 dark:border-white/[0.06] rounded-[20px] p-8 hover:border-blue-300 dark:hover:border-blue-800/60 hover:shadow-xl hover:shadow-blue-600/5 hover:-translate-y-1 transition-all duration-400"
                style={{ '--reveal-delay': `${i * 120}ms` } as React.CSSProperties}
              >
                <div className="flex items-center justify-between mb-8">
                  <span className="font-mono text-[13px] font-semibold text-gold-500 tracking-widest">{s.n}</span>
                  <svg className="w-6 h-6 text-slate-300 dark:text-slate-700 group-hover:text-blue-500 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    {s.icon}
                  </svg>
                </div>
                <h3 className="font-display text-[22px] font-semibold text-slate-900 dark:text-slate-50 mb-3">{s.t}</h3>
                <p className="text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">{s.d}</p>
                <div className="mt-7 h-px w-full bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Engine ───────────────────────────────────────── */}
      <section id="engine" className="py-24 md:py-32 px-6 bg-white/60 dark:bg-surface-1/60 border-y border-slate-200/80 dark:border-white/5 relative noise-overlay">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <div>
            <p className="reveal label-caps text-blue-600 dark:text-blue-400 mb-4">The Matching Engine</p>
            <h2 className="reveal font-display text-4xl md:text-[3.2rem] leading-[1.08] font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-5" style={{ '--reveal-delay': '80ms' } as React.CSSProperties}>
              Deterministic.<br />Explainable.<em className="display-italic text-gold-gradient" style={{ fontStyle: 'italic' }}> Boringly fair.</em>
            </h2>
            <p className="reveal text-lg text-slate-500 dark:text-slate-400 leading-relaxed mb-10" style={{ '--reveal-delay': '160ms' } as React.CSSProperties}>
              No black box, no LLM lottery. Every introduction carries a score you can
              decompose — so you always know why you were matched, and what to fix if you weren't.
            </p>

            <div className="reveal space-y-6 max-w-md" style={{ '--reveal-delay': '240ms' } as React.CSSProperties}>
              <SignalBar label="Sector alignment" weight={40} width={92} delay={100} />
              <SignalBar label="Stage compatibility" weight={30} width={70} delay={250} />
              <SignalBar label="Geography" weight={15} width={38} delay={400} />
              <SignalBar label="Ticket fit" weight={15} width={34} delay={550} />
            </div>
          </div>

          {/* Stacked mock match cards */}
          <div className="relative mx-auto w-full max-w-md" style={{ transform: `translate3d(${ptr.x * -10}px, ${ptr.y * -8}px, 0)`, transition: 'transform 0.5s cubic-bezier(0.22,1,0.36,1)' }}>
            <div className="reveal absolute inset-x-6 -top-6 bottom-10 bg-slate-100 dark:bg-surface-2 rounded-[22px] border border-slate-200 dark:border-white/5 rotate-2" style={{ '--reveal-delay': '200ms' } as React.CSSProperties} />
            <div className="reveal relative bg-white dark:bg-surface-1 border border-slate-200 dark:border-white/[0.07] rounded-[22px] p-7 card-elevated" style={{ '--reveal-delay': '320ms' } as React.CSSProperties}>
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-display text-xl font-semibold shadow-lg shadow-blue-600/20">A</div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-50 text-[15px]">Aarna</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">9K gold jewellery · Seed · Bengaluru</p>
                  </div>
                </div>
                <Ring score={87} size={58} stroke={4} />
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                {['Consumer', 'D2C', 'Trust-tech'].map(t => (
                  <span key={t} className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[11px] font-semibold">{t}</span>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { k: 'Raising', v: '₹10 Cr' },
                  { k: 'Team', v: '14' },
                  { k: 'ARR', v: '₹4.2 Cr' },
                ].map(m => (
                  <div key={m.k} className="bg-slate-50 dark:bg-surface-2 rounded-xl p-3 text-center border border-slate-100 dark:border-white/5">
                    <p className="font-mono text-[15px] font-semibold text-slate-900 dark:text-slate-100">{m.v}</p>
                    <p className="label-caps text-[8px] text-slate-400 mt-1">{m.k}</p>
                  </div>
                ))}
              </div>
              <button className="btn-shine w-full py-3 rounded-xl bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 font-bold text-[13px] hover:opacity-90 transition-opacity">
                Request introduction
              </button>
              <p className="label-caps text-[8px] text-slate-400 text-center mt-3">Gated · unlocks on mutual accept</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pull quote ───────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="reveal label-caps text-slate-400 mb-8">The B.I.R.D thesis</p>
          <blockquote className="reveal font-display text-[1.9rem] md:text-[2.7rem] leading-[1.25] font-normal text-slate-900 dark:text-slate-100 tracking-tight" style={{ '--reveal-delay': '100ms' } as React.CSSProperties}>
            “Deal flow is easy to find.{' '}
            <em className="display-italic text-gold-gradient" style={{ fontStyle: 'italic' }}>Conviction is not.</em>{' '}
            So we score for it.”
          </blockquote>
          <div className="reveal flex items-center justify-center gap-3 mt-10" style={{ '--reveal-delay': '200ms' } as React.CSSProperties}>
            <LogoMark size={30} />
            <span className="label-caps text-slate-400">B.I.R.D · Est. 2026</span>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section id="access" className="px-6 pb-28">
        <div className="max-w-5xl mx-auto reveal relative overflow-hidden rounded-[28px] bg-slate-900 dark:bg-surface-1 border border-slate-800 dark:border-white/[0.07] noise-overlay">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[380px] bg-[radial-gradient(ellipse,rgba(34,161,112,0.22),transparent_65%)]" />
            <div className="absolute bottom-[-140px] right-[-80px] w-[340px] h-[340px] bg-[radial-gradient(circle,rgba(208,165,79,0.12),transparent_65%)] rounded-full" />
          </div>

          <div className="relative z-10 px-8 py-16 md:px-16 md:py-20 text-center">
            <p className="label-caps text-gold-400 mb-5">Access</p>
            <h2 className="font-display text-4xl md:text-[3.4rem] leading-[1.08] font-semibold tracking-tight text-white mb-5">
              Five questions stand<br />between you and the room.
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
              Take the interview. Get scored. If the verdict is conviction — the room opens.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                onClick={onSignup}
                className="btn-shine bg-blue-500 hover:bg-blue-400 text-slate-950 px-9 py-4 rounded-full font-bold text-[15px] shadow-xl shadow-blue-600/25 hover:-translate-y-0.5 transition-all duration-300"
              >
                Begin the interview
              </button>
              {onDirectAccess && (
                <button
                  onClick={onDirectAccess}
                  className="px-9 py-4 rounded-full font-semibold text-[15px] text-slate-300 border border-white/15 hover:border-white/35 hover:bg-white/5 transition-all duration-300"
                >
                  Look around first
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 dark:border-white/5 px-6 py-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <LogoMark size={32} />
            <span className="font-display text-base font-semibold text-slate-900 dark:text-slate-50">B.I.R.D</span>
            <span className="label-caps text-slate-400 hidden sm:inline">Business Intelligence &amp; Resource Development</span>
          </div>
          <div className="flex gap-8 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
            <a href="#protocol" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Protocol</a>
            <a href="#engine" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Engine</a>
            <a href="#access" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Access</a>
            <button onClick={onLogin} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Sign in</button>
          </div>
          <p className="label-caps text-slate-400 text-[9px]">© 2026 · Demo project</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
