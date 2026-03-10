
import React, { useState, useEffect, useRef } from 'react';
import anime from 'animejs';
import { generateNextQuestion, evaluateInterview, EvaluationResult } from '../services/geminiService';
import { UserRole, User } from '../types';

interface OnboardingProps {
  onComplete: (score: number, role: UserRole) => void;
  onAdminBypass: (user: User) => void;
}

const TOTAL_QUESTIONS = 5;

const FALLBACK_QUESTIONS: Record<string, string[]> = {
  FOUNDER: [
    "What specific problem are you solving, and why have incumbents like existing market leaders failed to crack it at scale?",
    "You mentioned 9K gold jewellery — players like Mia by Tanishq and Melorra own the digital-first affordable segment. What is your defensible positioning against them?",
    "Who is your primary customer and what is the one behavioral insight about them that your competitors have fundamentally missed?",
    "What does your revenue model look like — direct-to-consumer or B2B wholesale — and what does your margin structure look like vs. the category average?",
    "Describe your distribution strategy — why can't it be replicated by a player with 10x your capital in 18 months?",
  ],
  INVESTOR: [
    "What is your investment thesis, and in which sector do you claim genuine information asymmetry over firms like Blume Ventures or 3one4 Capital?",
    "How do you evaluate founder-market fit — what specific signals separate a domain native from someone who has merely researched the problem?",
    "Describe your portfolio construction logic: stage mix, sector concentration, and target return multiple.",
    "What follow-on investment triggers do you use — when do you double down vs. write off an underperformer?",
    "How does your value-add differentiate you from a purely capital-providing LP?",
  ],
};

// ── DEMO ANSWERS — jury showcase mode ──────
const DEMO_ANSWERS: Record<string, string[]> = {
  FOUNDER: [
    "We are building a 9K gold jewellery brand called Aarna, targeting working women in Tier-2 India aged 25–38 who want daily-wear gold that doesn't compromise on purity or aesthetics. Incumbent players like Tanishq focus on bridal heavy-weight jewellery, and Mia is digitally priced out for our segment at ₹5,000+ entry. We operate at ₹1,200–₹2,800 with verified BIS hallmarking.",
    "Our moat is three-layered: first, an exclusive manufacturing partnership with a Rajkot jewellery cluster that gives us 22% COGS advantage. Second, our DTC channel on Instagram and WhatsApp has 94% repeat purchase rate in pilot, which no aggregator can replicate. Third, our trust architecture — every piece ships with a tamper-proof BIS card linked to a QR-verified purity ledger.",
    "Our customer is a 29-year-old female government teacher or bank employee in Nashik or Coimbatore. She buys gold as savings, not fashion. The insight competitors miss: she's not price-sensitive — she's trust-sensitive. She will pay a premium if she can verify purity on her phone without going to a store. We built that verification layer.",
    "We operate on a DTC model with 58% gross margins on jewellery and 71% on accessories. Our CAC is ₹340 via WhatsApp referral loops. Industry CAC for digital-first jewellery brands is ₹900–₹1,200. We are pre-revenue at ₹12L/month ARR, targeting ₹1.8Cr by month 18 with our current pipeline.",
    "We are building a micro-franchise model with 200 women entrepreneurs in Tier-2 cities who become our physical trust touchpoints. Each franchisee earns 8% on sales. This creates a ground-level network that no funded startup can replicate in under 36 months — it requires community trust that money cannot buy.",
  ],
  INVESTOR: [
    "I lead early-stage investments in climate-tech and agri-fintech across South and Southeast Asia. My information asymmetry comes from 8 years as an operator at ITC Agribusiness before transitioning to venture — I understand the last-mile agriculture supply chain at a depth that no analyst-track investor can match.",
    "I look for three things: whether the founder has lost money in that industry before entering it, whether they have customer relationships before they have a product, and whether they can explain their pricing logic without a slide deck. These three signals filter out 80% of articulate storytellers who have no domain depth.",
    "I run a concentrated portfolio — 12 companies max. I focus on pre-Series A in India and Series A in Southeast Asia. Target 10x on each position with a 7-year horizon. I reserve 30% of each fund for follow-on into the top 3 performers by year 3.",
    "I follow-on only when two conditions are met: the unit economics have improved by at least 20% YoY, and the founder has made at least one difficult decision I disagreed with — and been proven right. That second condition is the real test of founder judgment at scale.",
    "I bring three things beyond capital: a direct introduction network into 40+ CXOs in agri and food manufacturing for commercial pilots, a policy advisory channel through NITI Aayog working groups I participate in, and a weekly founder operations call I run for my entire portfolio.",
  ],
};

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onAdminBypass }) => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [questionVisible, setQuestionVisible] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [isTypingDemo, setIsTypingDemo] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const runAnim = (config: any) => {
    try {
      if (typeof anime === 'function') (anime as any)(config);
      else if ((anime as any).default) (anime as any).default(config);
    } catch (e) { /* silent */ }
  };

  useEffect(() => {
    if (!role && !showAdminLogin) {
      runAnim({
        targets: '.entrance-anim',
        opacity: [0, 1],
        translateY: [40, 0],
        delay: anime.stagger(150),
        duration: 1200,
        easing: 'easeOutExpo',
      });
    }
  }, [role, showAdminLogin]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, currentQuestion, isLoading]);

  // Animate new question appearance
  useEffect(() => {
    if (currentQuestion && questionVisible && questionRef.current) {
      runAnim({
        targets: questionRef.current,
        opacity: [0, 1],
        translateX: [-24, 0],
        duration: 700,
        easing: 'easeOutExpo',
      });
    }
  }, [currentQuestion, questionVisible]);

  // Demo auto-type effect
  const triggerDemoAnswer = async () => {
    if (!role || isTypingDemo) return;
    const idx = history.length;
    const answers = DEMO_ANSWERS[role] || DEMO_ANSWERS.FOUNDER;
    const fullText = answers[Math.min(idx, answers.length - 1)];

    setIsTypingDemo(true);
    setAnswer('');

    // Simulate typing character by character
    for (let i = 0; i <= fullText.length; i++) {
      await new Promise(r => setTimeout(r, 18));
      setAnswer(fullText.slice(0, i));
    }
    setIsTypingDemo(false);
    inputRef.current?.focus();
  };

  // Transition between questions with fade/slide
  const transitionToNextQuestion = (newQuestion: string) => {
    // Fade out current question
    setQuestionVisible(false);
    setTimeout(() => {
      setCurrentQuestion(newQuestion);
      setQuestionVisible(true);
    }, 350);
  };

  const startInterview = async (selectedRole: UserRole) => {
    setRole(selectedRole);
    setIsLoading(true);
    try {
      const q = await generateNextQuestion(selectedRole, []);
      setCurrentQuestion(q && q.trim() ? q : FALLBACK_QUESTIONS[selectedRole][0]);
    } catch {
      setCurrentQuestion(FALLBACK_QUESTIONS[selectedRole][0]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    if (!answer.trim() || !role || isTypingDemo) return;

    // Slide the answer in before clearing
    setIsLoading(true);
    const newHistory = [...history, { q: currentQuestion, a: answer }];
    setHistory(newHistory);
    setAnswer('');

    try {
      if (newHistory.length >= TOTAL_QUESTIONS) {
        setEvaluating(true);
        setIsLoading(false);
        // Brief pause before evaluation starts
        await new Promise(r => setTimeout(r, 600));
        const result = await evaluateInterview(role, newHistory);
        setEvaluation(result);
        setEvaluating(false);
      } else {
        const q = await generateNextQuestion(role, newHistory);
        const fallbacks = FALLBACK_QUESTIONS[role] || FALLBACK_QUESTIONS.FOUNDER;
        const nextQ = q && q.trim() ? q : fallbacks[newHistory.length];
        // Transition with delay for smooth UX
        await new Promise(r => setTimeout(r, 800));
        setIsLoading(false);
        transitionToNextQuestion(nextQ);
      }
    } catch (e) {
      console.error('AI Error', e);
      const fallbacks = FALLBACK_QUESTIONS[role] || FALLBACK_QUESTIONS.FOUNDER;
      await new Promise(r => setTimeout(r, 600));
      if (newHistory.length < TOTAL_QUESTIONS) {
        transitionToNextQuestion(fallbacks[Math.min(newHistory.length, fallbacks.length - 1)]);
      } else {
        setEvaluation({
          score: 55, scoreLetter: 'C',
          verdict: 'Evaluation incomplete — partial score assigned.',
          feedback: 'AI synthesis encountered a delay. Please retry for a complete vetting report.',
          dimensionScores: { differentiation: 11, competitivePositioning: 11, businessViability: 11, strategyClarity: 11, innovationFactor: 11 },
          competitors: [], strengths: [], recommendations: ['Resubmit for full evaluation'],
          admissionStatus: 'CONDITIONAL',
        });
        setEvaluating(false);
      }
      setIsLoading(false);
    }
  };

  const handleAdminLogin = () => {
    if (adminPass === 'admin123') {
      onAdminBypass({
        id: 'admin-001', email: 'admin@founderscircle.in', role: 'ADMIN',
        name: 'System Admin', industry: 'Technology',
        description: 'Testing account with full access.',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
        createdAt: new Date().toISOString(),
      });
    } else { alert('Incorrect admin password'); }
  };

  // ── CSS keyframes ────────────────────────────
  const globalStyles = `
    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateX(-20px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes bubbleIn {
      from { opacity: 0; transform: translateY(16px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes dotPulse {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40%            { transform: scale(1);   opacity: 1; }
    }
    @keyframes progressGlow {
      0%, 100% { box-shadow: 0 0 0px rgba(197,160,89,0); }
      50%       { box-shadow: 0 0 12px rgba(197,160,89,0.5); }
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer {
      0%   { background-position: -200px 0; }
      100% { background-position: 200px 0; }
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .question-transition-in  { animation: fadeSlideIn 0.6s cubic-bezier(0.16,1,0.3,1) both; }
    .question-transition-out { opacity: 0; transform: translateX(20px); transition: opacity 0.3s ease, transform 0.3s ease; }
    .bubble-in  { animation: bubbleIn 0.5s cubic-bezier(0.16,1,0.3,1) both; }
    .fade-up    { animation: fadeUp  0.6s cubic-bezier(0.16,1,0.3,1) both; }

    /* Demo button hover */
    .demo-btn { transition: all 0.2s ease; }
    .demo-btn:hover { letter-spacing: 0.35em !important; }

    /* Transmit button */
    .transmit-btn { transition: opacity 0.2s ease, letter-spacing 0.2s ease; }
    .transmit-btn:not(:disabled):hover { letter-spacing: 0.35em !important; opacity: 0.8; }

    /* Input caret glow */
    input:focus { caret-color: #C5A059; }
  `;

  // ── Admin Login ──────────────────────────────
  if (showAdminLogin) {
    return (
      <div style={{ minHeight: '100vh', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <style>{globalStyles}</style>
        <div className="fade-up" style={{ maxWidth: '440px', width: '100%', background: '#18181b', border: '1px solid #27272a', padding: '48px', boxShadow: '0 25px 50px rgba(0,0,0,0.8)' }}>
          <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.4em', color: '#C5A059', fontWeight: 700, display: 'block', marginBottom: '16px' }}>System Access</span>
          <h2 style={{ color: '#f4f4f5', fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: '36px', margin: '0 0 32px' }}>Admin Gate</h2>
          <input
            type="password" placeholder="Institutional Password"
            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #3f3f46', color: '#f4f4f5', padding: '16px 0', marginBottom: '40px', outline: 'none', fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: '20px', boxSizing: 'border-box' }}
            value={adminPass}
            onChange={(e) => setAdminPass(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button onClick={handleAdminLogin}
              style={{ width: '100%', border: '1px solid #C5A059', background: 'none', color: '#C5A059', padding: '16px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.target as any).style.background = '#C5A059'; (e.target as any).style.color = 'white'; }}
              onMouseLeave={e => { (e.target as any).style.background = 'none'; (e.target as any).style.color = '#C5A059'; }}
            >Verify Credentials</button>
            <button onClick={() => setShowAdminLogin(false)}
              style={{ background: 'none', border: 'none', color: '#71717a', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 700, cursor: 'pointer', padding: '8px' }}>
              Return to Nexus
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Role Selection ───────────────────────────
  if (!role) {
    return (
      <div className="min-h-screen bg-paper dark:bg-ink text-ink dark:text-paper flex flex-col items-center relative overflow-x-hidden">
        <style>{globalStyles}</style>
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(197,160,89,0.1),transparent_70%)]" />
        </div>
        <section className="min-h-screen w-full flex flex-col items-center justify-center p-10 text-center relative z-10">
          <div className="max-w-5xl entrance-anim">
            <div className="inline-block mb-12">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 border border-accent flex items-center justify-center text-accent font-serif italic text-3xl">F</div>
                <h1 className="text-2xl font-serif tracking-tight">FoundersCircle</h1>
              </div>
              <div className="h-[1px] w-full bg-accent/30 mb-2" />
              <span className="text-[10px] font-medium uppercase tracking-[0.5em] text-accent block">Private Institutional Access</span>
            </div>
            <h2 className="text-7xl md:text-9xl font-serif italic mb-12 tracking-tighter leading-none">
              The Elite <span className="text-accent">Nexus</span>
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed mb-4 font-light italic">
              A private ecosystem where clarity of thought meets strategic capital. Admittance is granted only through rigorous AI synthesis.
            </p>
            <p className="text-[10px] uppercase tracking-[0.4em] text-accent font-bold mb-16">5-Question Strategic Vetting · Domain-Aware AI · Institutional Scoring</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-4xl mx-auto">
              <button onClick={() => startInterview('FOUNDER')}
                className="group relative bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 p-16 transition-all duration-700 text-left overflow-hidden hover:border-accent/50">
                <div className="absolute top-0 left-0 w-1 h-full bg-accent scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-700" />
                <span className="text-[10px] uppercase tracking-[0.4em] text-accent font-bold mb-4 block">Operation</span>
                <h3 className="text-4xl font-serif italic mb-4">Launch</h3>
                <p className="text-zinc-400 text-sm font-light leading-relaxed">Submit your vision for institutional auditing and sector-specific VC matching.</p>
              </button>
              <button onClick={() => startInterview('INVESTOR')}
                className="group relative bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 p-16 transition-all duration-700 text-left overflow-hidden hover:border-accent/50">
                <div className="absolute top-0 left-0 w-1 h-full bg-accent scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-700" />
                <span className="text-[10px] uppercase tracking-[0.4em] text-accent font-bold mb-4 block">Operation</span>
                <h3 className="text-4xl font-serif italic mb-4">Allocate</h3>
                <p className="text-zinc-400 text-sm font-light leading-relaxed">Access exclusive dealflow from AI-vetted visionary builders and institutional founders.</p>
              </button>
            </div>
          </div>
        </section>
        <footer className="w-full py-16 px-10 border-t border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between text-zinc-400 gap-10 relative z-10">
          <span className="text-[10px] font-bold tracking-[0.3em] uppercase">© 2025 FoundersCircle Institutional.</span>
          <div className="flex gap-12 text-[9px] font-bold uppercase tracking-[0.3em]">
            <a href="#" className="hover:text-accent transition-colors">Privacy</a>
            <a href="#" className="hover:text-accent transition-colors">Terms</a>
            <button onClick={() => setShowAdminLogin(true)} className="hover:text-accent transition-colors">Audit Override</button>
          </div>
        </footer>
      </div>
    );
  }

  // ── Evaluation Report ────────────────────────
  if (evaluation) {
    const { score, verdict, feedback, dimensionScores, competitors, strengths, recommendations, admissionStatus } = evaluation;
    const isAdmitted = admissionStatus === 'ADMITTED';
    const isConditional = admissionStatus === 'CONDITIONAL';
    const dimensions = [
      { label: 'Differentiation', val: dimensionScores.differentiation },
      { label: 'Competitive Positioning', val: dimensionScores.competitivePositioning },
      { label: 'Business Viability', val: dimensionScores.businessViability },
      { label: 'Strategy Clarity', val: dimensionScores.strategyClarity },
      { label: 'Innovation Factor', val: dimensionScores.innovationFactor },
    ];
    const statusColor = isAdmitted ? '#C5A059' : isConditional ? '#d97706' : '#991b1b';
    const statusLabel = isAdmitted ? '✓ Admitted' : isConditional ? '◈ Conditional' : '✕ Rejected';

    return (
      <div style={{ minHeight: '100vh', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 24px 64px' }}>
        <style>{globalStyles}</style>
        <div className="fade-up" style={{ maxWidth: '768px', width: '100%', background: '#18181b', border: '1px solid #27272a', boxShadow: '0 25px 50px rgba(0,0,0,0.8)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: statusColor, animation: 'progressGlow 2s ease-in-out infinite' }} />

          {/* Header */}
          <div style={{ padding: '40px 48px 32px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.4em', color: '#C5A059', fontWeight: 700, display: 'block', marginBottom: '8px' }}>Synthesis Result</span>
              <h2 style={{ color: '#f4f4f5', fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: '40px', margin: 0 }}>Vetting Report</h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#71717a', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Score / Grade</span>
              <div style={{ fontSize: '56px', fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', color: statusColor, lineHeight: 1 }}>
                {score}<span style={{ fontSize: '18px', fontStyle: 'normal', opacity: 0.3 }}>/100</span>
              </div>
              <div style={{ display: 'inline-block', marginTop: '8px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', padding: '4px 12px', border: `1px solid ${statusColor}40`, color: statusColor, background: `${statusColor}10` }}>
                {statusLabel}
              </div>
            </div>
          </div>

          <div style={{ padding: '40px 48px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ border: `1px solid ${statusColor}30`, padding: '24px', background: `${statusColor}08` }}>
              <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3em', color: statusColor, fontWeight: 700, display: 'block', marginBottom: '8px', opacity: 0.7 }}>Analyst Verdict</span>
              <p style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: '20px', color: '#f4f4f5', margin: 0 }}>{verdict}</p>
            </div>
            <div style={{ borderLeft: '2px solid rgba(197,160,89,0.3)', paddingLeft: '24px' }}>
              <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#71717a', fontWeight: 700, display: 'block', marginBottom: '12px' }}>Strategic Analysis</span>
              <p style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: '18px', color: '#f4f4f5', lineHeight: 1.7, margin: 0 }}>"{feedback}"</p>
            </div>
            <div>
              <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#71717a', fontWeight: 700, display: 'block', marginBottom: '24px' }}>Evaluation Dimensions</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {dimensions.map(({ label, val }, i) => (
                  <div key={label} style={{ animationDelay: `${i * 100}ms` }} className="fade-up">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#a1a1aa', fontWeight: 700 }}>{label}</span>
                      <span style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', color: '#C5A059', fontSize: '14px' }}>{val}<span style={{ fontSize: '10px', opacity: 0.4 }}>/20</span></span>
                    </div>
                    <div style={{ width: '100%', height: '2px', background: '#27272a', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#C5A059', width: `${(val / 20) * 100}%`, transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {competitors && competitors.length > 0 && (
              <div>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#71717a', fontWeight: 700, display: 'block', marginBottom: '12px' }}>Competitive Landscape</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {competitors.map((c, i) => (
                    <span key={i} style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, border: '1px solid #3f3f46', padding: '6px 12px', color: '#a1a1aa' }}>{c}</span>
                  ))}
                </div>
              </div>
            )}
            {strengths && strengths.length > 0 && (
              <div style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.15)', padding: '24px' }}>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#16a34a', fontWeight: 700, display: 'block', marginBottom: '16px' }}>Strategic Strengths</span>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {strengths.map((s, i) => (
                    <li key={i} style={{ color: '#86efac', fontSize: '14px', fontWeight: 300, display: 'flex', gap: '12px' }}>
                      <span style={{ color: '#16a34a', flexShrink: 0 }}>+</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {recommendations && recommendations.length > 0 && (
              <div style={{ background: 'rgba(153,27,27,0.04)', border: '1px solid rgba(153,27,27,0.15)', padding: '24px' }}>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#dc2626', fontWeight: 700, display: 'block', marginBottom: '16px' }}>Strategic Deficiencies</span>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recommendations.map((r, i) => (
                    <li key={i} style={{ color: '#fca5a5', fontSize: '14px', fontWeight: 300, display: 'flex', gap: '12px' }}>
                      <span style={{ color: '#dc2626', flexShrink: 0 }}>/</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              onClick={() => onComplete(Math.round(score / 10), role!)}
              style={{ width: '100%', padding: '20px', background: isAdmitted ? '#C5A059' : 'none', color: isAdmitted ? 'white' : statusColor, border: isAdmitted ? 'none' : `1px solid ${statusColor}60`, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4em', fontWeight: 700, cursor: 'pointer', transition: 'all 0.3s ease' }}
              onMouseEnter={e => { if (!isAdmitted) { (e.currentTarget as any).style.background = `${statusColor}15`; } else { (e.currentTarget as any).style.opacity = '0.85'; } }}
              onMouseLeave={e => { if (!isAdmitted) { (e.currentTarget as any).style.background = 'none'; } else { (e.currentTarget as any).style.opacity = '1'; } }}
            >
              {isAdmitted ? 'Initialize Credentials — Enter the Nexus' : isConditional ? 'Proceed with Conditional Access' : 'Terminate Session'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Interview View ───────────────────────────
  const progress = ((history.length + 1) / TOTAL_QUESTIONS) * 100;

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <style>{globalStyles}</style>
      <div style={{ width: '100%', maxWidth: '896px', height: '88vh', background: '#18181b', border: '1px solid #27272a', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)', position: 'relative' }}>

        {/* Progress Bar — animated glow */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', background: 'rgba(197,160,89,0.1)' }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg, #C5A059, #D4B87E, #C5A059)', width: `${progress}%`, transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)', animation: 'progressGlow 3s ease-in-out infinite' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '28px 32px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.4em', color: '#C5A059', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              {role === 'FOUNDER' ? 'Founder Vetting Protocol' : 'Investor Screening Protocol'}
            </span>
            <h2 style={{ color: '#f4f4f5', fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: '24px', margin: 0 }}>Strategic Synthesis</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Demo mode toggle */}
            <button
              className="demo-btn"
              onClick={() => setDemoMode(d => !d)}
              style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 700, color: demoMode ? '#C5A059' : '#52525b', background: demoMode ? 'rgba(197,160,89,0.08)' : 'none', border: `1px solid ${demoMode ? 'rgba(197,160,89,0.3)' : '#3f3f46'}`, padding: '6px 14px', cursor: 'pointer' }}
            >
              {demoMode ? '◈ Demo On' : '○ Demo'}
            </button>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#71717a', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Question</span>
              <span style={{ fontSize: '24px', fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', color: '#C5A059' }}>
                {String(history.length + 1).padStart(2, '0')}
                <span style={{ fontSize: '12px', fontStyle: 'normal', opacity: 0.3 }}>/{String(TOTAL_QUESTIONS).padStart(2, '0')}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Conversation scrollable area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

          {/* Past Q&A history */}
          {history.map((item, i) => (
            <React.Fragment key={i}>
              <div style={{ display: 'flex', justifyContent: 'flex-start' }} className="bubble-in">
                <div style={{ maxWidth: '85%', borderLeft: '2px solid #3f3f46', paddingLeft: '24px', paddingTop: '8px', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#71717a', fontWeight: 700, display: 'block', marginBottom: '8px' }}>Analyst</span>
                  <p style={{ color: '#a1a1aa', fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: '17px', lineHeight: 1.6, margin: 0 }}>"{item.q}"</p>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }} className="bubble-in">
                <div style={{ background: 'linear-gradient(135deg, #C5A059, #A68241)', color: 'white', padding: '16px 24px', maxWidth: '82%', fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: '17px', lineHeight: 1.5, boxShadow: '0 4px 20px rgba(197,160,89,0.2)' }}>
                  {item.a}
                </div>
              </div>
            </React.Fragment>
          ))}

          {/* Current state */}
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#C5A059', padding: '16px 24px', border: '1px solid rgba(197,160,89,0.12)', background: 'rgba(197,160,89,0.04)' }}>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: '6px', height: '6px', background: '#C5A059', borderRadius: '50%', animation: `dotPulse 1.4s ease-in-out ${i * 0.16}s infinite` }} />
                ))}
              </div>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>
                Formulating next inquiry...
              </span>
            </div>
          ) : evaluating ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '2px solid #C5A059', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '24px' }} />
              <p style={{ color: '#f4f4f5', fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: '22px', margin: '0 0 8px' }}>Synthesizing Evaluation</p>
              <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#C5A059', fontWeight: 700, margin: 0 }}>Cross-referencing competitive landscape...</p>
            </div>
          ) : (
            // Current question — transition controlled by questionVisible
            <div
              ref={questionRef}
              style={{ display: 'flex', justifyContent: 'flex-start', opacity: questionVisible ? 1 : 0, transform: questionVisible ? 'translateX(0)' : 'translateX(20px)', transition: 'opacity 0.35s ease, transform 0.35s ease' }}
            >
              <div style={{ maxWidth: '90%', borderLeft: '3px solid #C5A059', paddingLeft: '32px', paddingTop: '16px', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.4em', color: '#C5A059', fontWeight: 700 }}>Analyst Inquiry</span>
                  {history.length > 0 && (
                    <span style={{ fontSize: '8px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>— based on your response</span>
                  )}
                </div>
                <p style={{ color: '#f4f4f5', fontSize: '22px', fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', lineHeight: 1.65, margin: 0 }}>
                  "{currentQuestion || 'Initializing synthesis...'}"
                </p>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input area */}
        <div style={{ padding: '16px 32px 20px', background: '#18181b', borderTop: '1px solid #27272a' }}>

          {/* Demo auto-fill hint */}
          {demoMode && !isLoading && !evaluating && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button
                onClick={triggerDemoAnswer}
                disabled={isTypingDemo}
                style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.25em', color: isTypingDemo ? '#52525b' : '#C5A059', background: 'none', border: 'none', cursor: isTypingDemo ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: isTypingDemo ? 0.4 : 1, transition: 'all 0.2s' }}
              >
                {isTypingDemo ? '● Typing...' : '↓ Auto-fill Demo Answer'}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <input
              ref={inputRef}
              value={answer}
              onChange={(e) => !isTypingDemo && setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleNext()}
              disabled={isLoading || evaluating}
              placeholder="Formulate your strategic response…"
              style={{ flex: 1, background: 'transparent', border: 'none', color: '#f4f4f5', padding: '12px 0', outline: 'none', fontSize: '19px', fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', caretColor: '#C5A059' }}
            />
            <button
              onClick={handleNext}
              disabled={!answer.trim() || isLoading || evaluating || isTypingDemo}
              className="transmit-btn"
              style={{ color: '#C5A059', background: 'none', border: 'none', cursor: answer.trim() && !isLoading && !evaluating && !isTypingDemo ? 'pointer' : 'not-allowed', opacity: answer.trim() && !isLoading && !evaluating && !isTypingDemo ? 1 : 0.2, textTransform: 'uppercase', letterSpacing: '0.3em', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Transmit
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
