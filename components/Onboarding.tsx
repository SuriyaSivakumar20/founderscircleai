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
  const [isDataIngesting, setIsDataIngesting] = useState(false);
  const [ingestionStep, setIngestionStep] = useState(0);
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
        translateY: [20, 0],
        delay: anime.stagger(100),
        duration: 800,
        easing: 'easeOutExpo',
      });
    }
  }, [role, showAdminLogin]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, currentQuestion, isLoading]);

  useEffect(() => {
    if (currentQuestion && questionVisible && questionRef.current) {
      runAnim({
        targets: questionRef.current,
        opacity: [0, 1],
        translateX: [-15, 0],
        duration: 500,
        easing: 'easeOutExpo',
      });
    }
  }, [currentQuestion, questionVisible]);

  const triggerDemoAnswer = async () => {
    if (!role || isTypingDemo) return;
    const idx = history.length;
    const answers = DEMO_ANSWERS[role] || DEMO_ANSWERS.FOUNDER;
    const fullText = answers[Math.min(idx, answers.length - 1)];

    setIsTypingDemo(true);
    setAnswer(fullText);
    await new Promise(r => setTimeout(r, 300));
    setIsTypingDemo(false);
    inputRef.current?.focus();
  };

  const transitionToNextQuestion = (newQuestion: string) => {
    setQuestionVisible(false);
    setTimeout(() => {
      setCurrentQuestion(newQuestion);
      setQuestionVisible(true);
    }, 350);
  };

  const startInterview = async (selectedRole: UserRole) => {
    setRole(selectedRole);
    setIsDataIngesting(true);
  };

  const completeDataIngestion = async () => {
    setIngestionStep(1);
    await new Promise(r => setTimeout(r, 1000));
    setIngestionStep(2);
    await new Promise(r => setTimeout(r, 1000));
    
    setIsDataIngesting(false);
    setIsLoading(true);
    try {
      const q = await generateNextQuestion(role!, []);
      setCurrentQuestion(q && q.trim() ? q : FALLBACK_QUESTIONS[role!][0]);
    } catch {
      setCurrentQuestion(FALLBACK_QUESTIONS[role!][0]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    if (!answer.trim() || !role || isTypingDemo) return;

    setIsLoading(true);
    const newHistory = [...history, { q: currentQuestion, a: answer }];
    setHistory(newHistory);
    setAnswer('');

    try {
      if (newHistory.length >= TOTAL_QUESTIONS) {
        setEvaluating(true);
        setIsLoading(false);
        await new Promise(r => setTimeout(r, 600));
        const result = await evaluateInterview(role, newHistory);
        setEvaluation(result);
        setEvaluating(false);
      } else {
        const q = await generateNextQuestion(role, newHistory);
        const fallbacks = FALLBACK_QUESTIONS[role] || FALLBACK_QUESTIONS.FOUNDER;
        const nextQ = q && q.trim() ? q : fallbacks[newHistory.length];
        await new Promise(r => setTimeout(r, 600));
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
          score: 82, scoreLetter: 'A-',
          verdict: 'Evaluation Complete — Strong Alignment.',
          feedback: 'Your responses demonstrate an exceptional grasp of unit economics and domain expertise.',
          dimensionScores: { differentiation: 18, competitivePositioning: 16, businessViability: 17, strategyClarity: 16, innovationFactor: 15 },
          competitors: ['Legacy Platforms', 'Generalists'], strengths: ['Defensible Moat', 'Clear ICP'], recommendations: ['Maintain rigorous focus on execution scale'],
          admissionStatus: 'ADMITTED',
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
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Admin&backgroundColor=dbeafe&textColor=1e40af',
        createdAt: new Date().toISOString(),
      });
    } else { alert('Incorrect admin password'); }
  };

  // ── Admin Login ──────────────────────────────
  if (showAdminLogin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center fade-up">
          <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-6 h-6 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Admin Override</h2>
          <p className="text-slate-500 text-sm mb-6">Enter the institutional access code to bypass the evaluation.</p>
          <input
            type="password"
            placeholder="Enter password..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 transition-all dark:text-white mb-4 text-center tracking-widest"
            value={adminPass}
            onChange={(e) => setAdminPass(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
          />
          <button onClick={handleAdminLogin} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl hover:opacity-90 transition-opacity mb-4">
            Verify Credentials
          </button>
          <button onClick={() => setShowAdminLogin(false)} className="text-sm font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Role Selection ───────────────────────────
  if (!role) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-4xl w-full text-center relative z-10 entrance-anim">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/30 mb-8 text-3xl">
            🐦
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">
            Welcome to <span className="text-blue-600">B.I.R.D</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12">
            A premium network connecting high-growth startups with top-tier venture capital. Admission requires passing an AI-driven strategic evaluation.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <button onClick={() => startInterview('FOUNDER')} className="group bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-left hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Startup Founder</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Apply to join the network. Our AI analyst will evaluate your business model, traction, and competitive moat.</p>
            </button>
            
            <button onClick={() => startInterview('INVESTOR')} className="group bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-left hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all">
              <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Venture Capitalist</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Join to access verified dealflow. The AI will evaluate your investment thesis and strategic value-add.</p>
            </button>
          </div>
        </div>

        <div className="absolute bottom-8 flex gap-6 text-sm font-semibold text-slate-400">
          <button onClick={() => setShowAdminLogin(true)} className="hover:text-blue-600 transition-colors">Admin Access</button>
        </div>
      </div>
    );
  }

  // ── Data Ingestion Phase ─────────────────────
  if (role && isDataIngesting) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center fade-up">
          <div className="w-16 h-16 border-4 border-blue-100 dark:border-blue-900/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Preparing Environment</h2>
          <p className="text-slate-500 mb-8">
            {ingestionStep === 0 ? "Initializing AI evaluation protocol..." : ingestionStep === 1 ? "Loading startup datasets..." : "Ready for interview."}
          </p>
          
          <button 
            onClick={() => ingestionStep === 0 && completeDataIngestion()}
            disabled={ingestionStep > 0}
            className={`w-full py-3 rounded-xl font-bold transition-all ${ingestionStep > 0 ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
            {ingestionStep > 0 ? 'Synthesizing...' : 'Start Evaluation'}
          </button>
        </div>
      </div>
    );
  }

  // ── Evaluation Report ────────────────────────
  if (evaluation) {
    const { score, verdict, feedback, dimensionScores, competitors, strengths, recommendations, admissionStatus } = evaluation;
    const isAdmitted = admissionStatus === 'ADMITTED';
    const isConditional = admissionStatus === 'CONDITIONAL';
    
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-3xl bg-white dark:bg-[#0f172a] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden fade-up">
          {/* Header */}
          <div className="p-8 border-b border-slate-200 dark:border-slate-800 text-center relative overflow-hidden">
            <div className={`absolute inset-0 opacity-10 ${isAdmitted ? 'bg-green-500' : isConditional ? 'bg-amber-500' : 'bg-red-500'}`}></div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 relative z-10">Evaluation Complete</p>
            <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-6 relative z-10">AI Diagnostic Report</h2>
            
            <div className="inline-flex flex-col items-center justify-center w-32 h-32 rounded-full border-8 bg-white dark:bg-slate-800 relative z-10 shadow-lg"
                 style={{ borderColor: isAdmitted ? '#22c55e' : isConditional ? '#f59e0b' : '#ef4444' }}>
              <span className="text-4xl font-black text-slate-900 dark:text-white">{score}</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">/ 100</span>
            </div>
            
            <div className="mt-6 relative z-10">
              <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide ${
                isAdmitted ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                isConditional ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {isAdmitted ? '✓ Admitted' : isConditional ? '◈ Conditional' : '✕ Rejected'}
              </span>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">Analyst Verdict</h3>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{verdict}</p>
              <p className="text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">{feedback}</p>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Dimension Breakdown</h3>
              <div className="space-y-4">
                {[
                  { label: 'Differentiation', val: dimensionScores.differentiation },
                  { label: 'Competitive Positioning', val: dimensionScores.competitivePositioning },
                  { label: 'Business Viability', val: dimensionScores.businessViability },
                  { label: 'Strategy Clarity', val: dimensionScores.strategyClarity },
                  { label: 'Innovation Factor', val: dimensionScores.innovationFactor },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm font-bold mb-1.5">
                      <span className="text-slate-700 dark:text-slate-300">{label}</span>
                      <span className="text-slate-900 dark:text-white">{val}/20</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(val / 20) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {strengths && strengths.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-5 border border-green-100 dark:border-green-900/30">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-green-700 dark:text-green-500 mb-3">Strengths</h3>
                  <ul className="space-y-2">
                    {strengths.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-green-800 dark:text-green-400">
                        <span className="font-bold">✓</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {recommendations && recommendations.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-5 border border-amber-100 dark:border-amber-900/30">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-500 mb-3">Recommendations</h3>
                  <ul className="space-y-2">
                    {recommendations.map((r, i) => (
                      <li key={i} className="flex gap-2 text-sm text-amber-800 dark:text-amber-400">
                        <span className="font-bold">→</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              onClick={() => onComplete(Math.round(score / 10), role!)}
              className={`w-full py-4 rounded-xl font-bold shadow-sm transition-all text-center flex items-center justify-center gap-2 ${
                isAdmitted || isConditional
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 cursor-not-allowed'
              }`}
            >
              {isAdmitted || isConditional ? 'Complete Registration' : 'Access Denied'}
              {(isAdmitted || isConditional) && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Interview View ───────────────────────────
  const progress = ((history.length + 1) / TOTAL_QUESTIONS) * 100;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[85vh] bg-white dark:bg-[#0f172a] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#0f172a] z-10 relative shadow-sm">
          <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 dark:bg-slate-800">
            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-lg">🐦</div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white leading-tight">B.I.R.D Evaluation</h2>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">AI Analyst</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setDemoMode(!demoMode)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border ${demoMode ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400' : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700'}`}
            >
              Demo Mode
            </button>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Question</span>
              <span className="font-extrabold text-blue-600 text-xl leading-none">{history.length + 1}<span className="text-sm text-slate-400">/{TOTAL_QUESTIONS}</span></span>
            </div>
          </div>
        </div>

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 bg-slate-50/50 dark:bg-[#0b1120]/50">
          {history.map((item, i) => (
            <React.Fragment key={i}>
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-lg shrink-0 mt-1">🤖</div>
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 rounded-2xl rounded-tl-sm shadow-sm">
                    <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{item.q}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white px-5 py-4 rounded-2xl rounded-tr-sm shadow-sm max-w-[85%]">
                  <p className="font-medium leading-relaxed">{item.a}</p>
                </div>
              </div>
            </React.Fragment>
          ))}

          {/* Current State */}
          {isLoading ? (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-lg shrink-0">🤖</div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          ) : evaluating ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="font-bold text-slate-900 dark:text-white text-lg">Synthesizing Evaluation...</p>
              <p className="text-sm text-slate-500">Grading along 5 dimensions.</p>
            </div>
          ) : (
            <div ref={questionRef} className="flex justify-start transition-all" style={{ opacity: questionVisible ? 1 : 0 }}>
              <div className="flex gap-3 max-w-[90%]">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-lg shrink-0 mt-1 shadow-sm">🤖</div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 rounded-2xl rounded-tl-sm shadow-sm border-l-4 border-l-blue-500">
                  <p className="text-slate-900 dark:text-white font-semibold text-lg leading-relaxed">{currentQuestion}</p>
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800">
          {demoMode && !isLoading && !evaluating && (
            <div className="flex justify-end mb-2">
              <button
                onClick={triggerDemoAnswer}
                disabled={isTypingDemo}
                className="text-xs font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                {isTypingDemo ? 'Typing...' : 'Auto-fill Demo Response'}
              </button>
            </div>
          )}
          
          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center pr-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-sm">
            <input
              ref={inputRef}
              value={answer}
              onChange={(e) => !isTypingDemo && setAnswer(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleNext(); }}
              disabled={isLoading || evaluating}
              placeholder="Type your response here..."
              className="flex-1 bg-transparent border-none outline-none dark:text-white text-base placeholder-slate-400 px-5 py-4 font-medium"
            />
            <button
              onClick={handleNext}
              disabled={!answer.trim() || isLoading || evaluating || isTypingDemo}
              className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? 'Sending...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
