import React, { useState, useEffect, useRef } from 'react';
import anime from 'animejs';
import { generateNextQuestion, evaluateInterview, EvaluationResult } from '../services/geminiService';
import { UserRole } from '../types';
import { LogoMark } from './Brand';

interface OnboardingProps {
  /** Called with the real AI evaluation once the interview completes. */
  onComplete: (evaluation: EvaluationResult, role: UserRole) => void;
}

const TOTAL_QUESTIONS = 5;

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [aiError, setAiError] = useState('');
  // Which operation failed, so Retry can repeat exactly that call.
  const [failedOp, setFailedOp] = useState<'question' | 'evaluate' | null>(null);
  const [questionVisible, setQuestionVisible] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);

  const runAnim = (config: any) => {
    try {
      if (typeof anime === 'function') (anime as any)(config);
      else if ((anime as any).default) (anime as any).default(config);
    } catch (e) { /* animation failure must never break the flow */ }
  };

  useEffect(() => {
    if (!role) {
      runAnim({
        targets: '.entrance-anim',
        opacity: [0, 1],
        translateY: [20, 0],
        delay: (anime as any).stagger(100),
        duration: 800,
        easing: 'easeOutExpo',
      });
    }
  }, [role]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, currentQuestion, isLoading, aiError]);

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

  const transitionToNextQuestion = (newQuestion: string) => {
    setQuestionVisible(false);
    setTimeout(() => {
      setCurrentQuestion(newQuestion);
      setQuestionVisible(true);
    }, 350);
  };

  // ── The two real AI operations ────────────────────────────────────────────
  const fetchQuestion = async (hist: { q: string; a: string }[]) => {
    setIsLoading(true);
    setAiError('');
    setFailedOp(null);
    try {
      const q = await generateNextQuestion(role!, hist);
      if (hist.length === 0) {
        setCurrentQuestion(q);
      } else {
        transitionToNextQuestion(q);
      }
    } catch (err: any) {
      setAiError(err?.message || 'The AI analyst is unavailable right now.');
      setFailedOp('question');
    } finally {
      setIsLoading(false);
    }
  };

  const runEvaluation = async (hist: { q: string; a: string }[]) => {
    setEvaluating(true);
    setAiError('');
    setFailedOp(null);
    try {
      const result = await evaluateInterview(role!, hist);
      setEvaluation(result);
    } catch (err: any) {
      setAiError(err?.message || 'The AI evaluation is unavailable right now.');
      setFailedOp('evaluate');
    } finally {
      setEvaluating(false);
    }
  };

  const startInterview = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setHistory([]);
    setAnswer('');
    // Fetch the first question immediately — no fake "ingestion" theatre.
    fetchQuestionFor(selectedRole, []);
  };

  const fetchQuestionFor = async (selectedRole: UserRole, hist: { q: string; a: string }[]) => {
    setIsLoading(true);
    setAiError('');
    setFailedOp(null);
    try {
      const q = await generateNextQuestion(selectedRole, hist);
      setCurrentQuestion(q);
    } catch (err: any) {
      setAiError(err?.message || 'The AI analyst is unavailable right now.');
      setFailedOp('question');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (!answer.trim() || !role || isLoading || evaluating) return;
    const newHistory = [...history, { q: currentQuestion, a: answer.trim() }];
    setHistory(newHistory);
    setAnswer('');

    if (newHistory.length >= TOTAL_QUESTIONS) {
      runEvaluation(newHistory);
    } else {
      fetchQuestion(newHistory);
    }
  };

  const handleRetry = () => {
    if (!failedOp) return;
    // Retry repeats the exact operation that failed with the same history.
    if (failedOp === 'question') fetchQuestion(history);
    else runEvaluation(history);
  };

  const restartInterview = () => {
    setRole(null);
    setHistory([]);
    setCurrentQuestion('');
    setAnswer('');
    setEvaluation(null);
    setAiError('');
    setFailedOp(null);
  };

  // ── Role Selection ───────────────────────────────────────────────────────
  if (!role) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-surface-0 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-4xl w-full text-center relative z-10 entrance-anim">
          <div className="inline-flex mb-8">
            <LogoMark size={64} />
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-semibold text-slate-900 dark:text-white tracking-tight mb-6">
            Welcome to <span className="text-blue-600">B.I.R.D</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12">
            A premium network connecting high-growth startups with top-tier venture capital. Admission requires passing an AI-driven strategic evaluation.
          </p>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <button onClick={() => startInterview('FOUNDER')} className="group bg-white dark:bg-surface-1 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-left hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h2 className="font-display text-2xl font-semibold text-slate-900 dark:text-white mb-2">Startup Founder</h2>
              <p className="text-slate-500 text-sm leading-relaxed">Apply to join the network. Our AI analyst will evaluate your business model, traction, and competitive moat.</p>
            </button>

            <button onClick={() => startInterview('INVESTOR')} className="group bg-white dark:bg-surface-1 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-left hover:border-green-500 hover:shadow-xl hover:shadow-green-500/10 transition-all">
              <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h2 className="font-display text-2xl font-semibold text-slate-900 dark:text-white mb-2">Venture Capitalist</h2>
              <p className="text-slate-500 text-sm leading-relaxed">Join to access verified dealflow. The AI will evaluate your investment thesis and strategic value-add.</p>
            </button>
          </div>

          <p className="text-xs text-slate-400 mt-10">
            The interview runs live against the B.I.R.D analyst. If the AI service is unavailable you will be able to retry — results are never fabricated.
          </p>
        </div>
      </div>
    );
  }

  // ── Evaluation Report ────────────────────────────────────────────────────
  if (evaluation) {
    const { score, verdict, feedback, dimensionScores, strengths, recommendations, admissionStatus } = evaluation;
    const isAdmitted = admissionStatus === 'ADMITTED';
    const isConditional = admissionStatus === 'CONDITIONAL';

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-surface-0 flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-3xl bg-white dark:bg-surface-1 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden fade-up">
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
                {isAdmitted ? '✓ Admitted' : isConditional ? '◈ Conditional' : '✕ Not Admitted'}
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

            {isAdmitted || isConditional ? (
              <button
                onClick={() => onComplete(evaluation, role!)}
                className="w-full py-4 rounded-xl font-bold shadow-sm transition-all text-center flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
              >
                Complete Registration
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-500 text-center">
                  Admission starts at 45/100. You can re-attempt the interview — each attempt is graded fresh.
                </p>
                <button
                  onClick={restartInterview}
                  className="w-full py-4 rounded-xl font-bold shadow-sm transition-all text-center bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Re-attempt the interview
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Interview View ───────────────────────────────────────────────────────
  const progress = ((history.length + 1) / TOTAL_QUESTIONS) * 100;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-surface-0 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[85vh] bg-white dark:bg-surface-1 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-surface-1 z-10 relative shadow-sm">
          <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 dark:bg-slate-800">
            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>

          <div className="flex items-center gap-3">
            <LogoMark size={34} />
            <div>
              <h2 className="font-display font-semibold text-slate-900 dark:text-white leading-tight">B.I.R.D Evaluation</h2>
              <p className="label-caps text-[8px] text-slate-400 tracking-wider mt-0.5">{role === 'FOUNDER' ? 'Founder Track' : 'Investor Track'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={restartInterview} className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              Start over
            </button>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Question</span>
              <span className="font-extrabold text-blue-600 text-xl leading-none">{history.length + 1}<span className="text-sm text-slate-400">/{TOTAL_QUESTIONS}</span></span>
            </div>
          </div>
        </div>

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 bg-slate-50/50 dark:bg-surface-0/50">
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
                  <p className="font-medium leading-relaxed whitespace-pre-wrap">{item.a}</p>
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
          ) : aiError ? (
            /* Honest failure state — never a fabricated question */
            <div className="max-w-xl mx-auto bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-2xl p-6 text-center">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="font-bold text-red-700 dark:text-red-400 mb-1">The analyst is unavailable</p>
              <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-4">{aiError}</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={handleRetry}
                  className="bg-red-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={restartInterview}
                  className="border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Start over
                </button>
              </div>
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
        <div className="p-4 md:p-6 bg-white dark:bg-surface-1 border-t border-slate-200 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center pr-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-sm">
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleNext(); }}
              disabled={isLoading || evaluating || !!aiError || !currentQuestion}
              placeholder={currentQuestion && !aiError ? 'Type your response here...' : 'Waiting for the analyst...'}
              className="flex-1 bg-transparent border-none outline-none dark:text-white text-base placeholder-slate-400 px-5 py-4 font-medium"
            />
            <button
              onClick={handleNext}
              disabled={!answer.trim() || isLoading || evaluating || !!aiError}
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
