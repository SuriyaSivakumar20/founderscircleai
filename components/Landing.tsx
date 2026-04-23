import React, { useState, useEffect } from 'react';

interface LandingProps {
  onSignup: () => void;
  onLogin: () => void;
  onDirectAccess: () => void;
}

const Navbar: React.FC<{ onLogin: () => void, onSignup: () => void }> = ({ onLogin, onSignup }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">FC</div>
          <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">FoundersCircle</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-300">
          <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
          <a href="#network" className="hover:text-blue-600 transition-colors">Network</a>
          <a href="#startups" className="hover:text-blue-600 transition-colors">Startups</a>
          <a href="#investors" className="hover:text-blue-600 transition-colors">Investors</a>
          <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={onLogin} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">Sign In</button>
          <button onClick={onSignup} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-all shadow-md shadow-blue-600/20 active:scale-95">Get Started</button>
        </div>
      </div>
    </nav>
  );
};

const Landing: React.FC<LandingProps> = ({ onSignup, onLogin, onDirectAccess }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-200 dark:selection:bg-blue-900">
      <Navbar onLogin={onLogin} onSignup={onSignup} />
      
      {/* 2. Hero Section */}
      <section className="pt-32 pb-20 md:pt-48 md:pb-32 px-6 relative overflow-hidden">
        {/* Decorative background blur */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            The #1 Platform for Founders & VCs
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight text-slate-900 dark:text-white">
            Where Startups Meet <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Smart Capital.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            An AI-powered professional ecosystem for startup discovery, investor matching, and growth intelligence. Build your network, raise funds, or deploy capital.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onSignup} className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-xl font-medium text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2">
              Start Free Trial
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
            <button onClick={onDirectAccess} className="w-full sm:w-auto bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-8 py-4 rounded-xl font-medium text-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">
              Explore Platform Demo
            </button>
          </div>
        </div>

        {/* Hero Dashboard Preview */}
        <div className="mt-20 max-w-6xl mx-auto relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-2xl overflow-hidden translate-y-4 hover:translate-y-0 transition-transform duration-700 ease-out">
          <div className="h-12 border-b border-slate-100 dark:border-slate-800 flex items-center px-4 gap-2 bg-slate-50 dark:bg-[#1e293b]">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-amber-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>
          <div className="p-2 md:p-8 flex gap-6 opacity-80 pointer-events-none">
             <div className="hidden md:flex flex-col w-64 gap-4 border-r border-slate-100 dark:border-slate-800 pr-6">
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
                <div className="h-8 w-full bg-blue-50 dark:bg-blue-900/40 rounded-lg"></div>
                <div className="h-8 w-full bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                <div className="h-8 w-full bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
             </div>
             <div className="flex-1 flex flex-col gap-6">
                <div className="h-10 w-full bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                <div className="flex gap-4">
                  <div className="flex-1 h-32 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                  <div className="flex-1 h-32 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                  <div className="flex-1 h-32 pl bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800"></div>
                </div>
                <div className="h-64 w-full bg-slate-50 dark:bg-[#1e293b] rounded-xl border border-slate-100 dark:border-slate-800"></div>
             </div>
          </div>
        </div>
      </section>

      {/* 3. Stats Section */}
      <section className="py-16 border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-slate-500 mb-10">Trusted by leading funds & founders</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-slate-100 dark:divide-slate-800">
            <div>
              <div className="text-4xl font-extrabold text-blue-600 mb-2">10K+</div>
              <div className="text-sm text-slate-500 font-medium">Verified Startups</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-blue-600 mb-2">2K+</div>
              <div className="text-sm text-slate-500 font-medium">Active Investors</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-blue-600 mb-2">₹500Cr+</div>
              <div className="text-sm text-slate-500 font-medium">Opportunities Mapped</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-blue-600 mb-2">95%</div>
              <div className="text-sm text-slate-500 font-medium">Match Accuracy</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Platform Features Grid */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">Everything you need to scale</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">A comprehensive suite of tools designed specifically for the venture asset class.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Intelligent Matching', icon: 'M13 10V3L4 14h7v7l9-11h-7z', desc: 'Our AI analyzes over 50 data points to connect founders with the investors most likely to fund them.' },
              { title: 'Rich Profiles', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', desc: 'Showcase business metrics, traction, and team backgrounds with beautiful, standardized profile pages.' },
              { title: 'Smart Analytics', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z', desc: 'Track profile views, engagement metrics, and investor interest over time from an intuitive dashboard.' },
              { title: 'Due Diligence Insights', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', desc: 'Access standardized data rooms and streamline your diligence process with verified company metrics.' },
              { title: 'Secure Messaging', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z', desc: 'Communicate directly with matched counterparts through our secure, integrated messaging platform.' },
              { title: 'Deal Flow CRM', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16', desc: 'Manage your pipeline, track conversations, and move deals forward using built-in CRM capabilities.' }
            ].map((f, i) => (
              <div key={i} className="p-8 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-blue-500/50 transition-all group">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} /></svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{f.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. How It Works */}
      <section className="py-24 bg-slate-50 dark:bg-[#0b1120] px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">How it works</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">Join the ecosystem and start extracting value in minutes.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-12 relative">
            <div className="hidden md:block absolute top-[45px] left-[10%] right-[10%] h-[2px] bg-slate-200 dark:bg-slate-800 -z-0"></div>
            {[
              { num: '01', title: 'Create Profile', desc: 'Sign up and build a rich profile highlighting your thesis or company metrics.' },
              { num: '02', title: 'Get Matched', desc: 'Our AI engine surfaces high-intent connections aligned with your specific goals.' },
              { num: '03', title: 'Connect & Close', desc: 'Reach out, manage diligence, and close deals directly on the platform.' }
            ].map((step, i) => (
              <div key={i} className="flex-1 text-center relative z-10">
                <div className="w-24 h-24 mx-auto bg-white dark:bg-[#0f172a] rounded-full border-4 border-slate-50 dark:border-[#0b1120] flex items-center justify-center shadow-lg mb-6 text-2xl font-bold text-blue-600 relative">
                   {step.num}
                   <div className="absolute inset-0 rounded-full border-2 border-slate-100 dark:border-slate-800 pointer-events-none"></div>
                </div>
                <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">{step.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Testimonials */}
      <section className="py-24 px-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]">
        <div className="max-w-7xl mx-auto">
           <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center text-slate-900 dark:text-white">Trusted by the ecosystem</h2>
           <div className="grid md:grid-cols-2 gap-8">
              <div className="p-8 rounded-2xl bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700">
                <div className="flex gap-2 text-amber-400 mb-6">
                  {Array(5).fill(0).map((_, i) => <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
                </div>
                <p className="text-lg text-slate-700 dark:text-slate-300 italic mb-8">"FoundersCircle cut our deal sourcing time in half. The quality of matches and the clarity of data presented is unmatched by traditional networks."</p>
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">AK</div>
                   <div>
                      <div className="font-bold text-slate-900 dark:text-white">Arjun Kumar</div>
                      <div className="text-xs text-slate-500">Partner at Nexus Ventures</div>
                   </div>
                </div>
              </div>
              <div className="p-8 rounded-2xl bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700">
                <div className="flex gap-2 text-amber-400 mb-6">
                  {Array(5).fill(0).map((_, i) => <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
                </div>
                <p className="text-lg text-slate-700 dark:text-slate-300 italic mb-8">"We raised our $2M Seed round entirely through connections made on FoundersCircle. The platform makes you look professional and enterprise-ready."</p>
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold">SR</div>
                   <div>
                      <div className="font-bold text-slate-900 dark:text-white">Simran Rawat</div>
                      <div className="text-xs text-slate-500">CEO, CloudCompute AI</div>
                   </div>
                </div>
              </div>
           </div>
        </div>
      </section>

      {/* 8. Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-50 dark:bg-[#0b1120] px-6">
         <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">Simple, transparent pricing</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">Choose the plan that fits your growth stage.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
             {/* Free Tier */}
             <div className="p-8 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 text-center flex flex-col">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Starter</h3>
                <p className="text-slate-500 mb-6 text-sm">Perfect for early stage startups.</p>
                <div className="mb-6"><span className="text-4xl font-extrabold text-slate-900 dark:text-white">₹0</span><span className="text-slate-500">/mo</span></div>
                <ul className="text-left space-y-4 mb-8 flex-1 text-sm text-slate-600 dark:text-slate-400">
                   <li className="flex items-center gap-3"><svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Basic Profile</li>
                   <li className="flex items-center gap-3"><svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> 5 Connections / month</li>
                   <li className="flex items-center gap-3"><svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Standard Support</li>
                </ul>
                <button onClick={onSignup} className="w-full py-3 rounded-xl font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition-colors">Get Started</button>
             </div>
             
             {/* Pro Tier */}
             <div className="p-8 rounded-3xl bg-blue-600 text-white border border-blue-500 text-center shadow-xl shadow-blue-500/20 relative flex flex-col transform md:-translate-y-4">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-800 text-xs font-bold px-3 py-1 rounded-full text-blue-100">MOST POPULAR</div>
                <h3 className="text-xl font-bold mb-2">Professional</h3>
                <p className="text-blue-100 mb-6 text-sm">For active fundraising & networking.</p>
                <div className="mb-6"><span className="text-4xl font-extrabold">₹4999</span><span className="text-blue-200">/mo</span></div>
                <ul className="text-left space-y-4 mb-8 flex-1 text-sm text-blue-100">
                   <li className="flex items-center gap-3"><svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Verified Badge</li>
                   <li className="flex items-center gap-3"><svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Unlimited Connections</li>
                   <li className="flex items-center gap-3"><svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Priority Matching Algorithm</li>
                   <li className="flex items-center gap-3"><svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Analytics Dashboard</li>
                </ul>
                <button onClick={onSignup} className="w-full py-3 rounded-xl font-medium text-blue-600 bg-white hover:bg-gray-50 transition-colors shadow-lg">Upgrade to Pro</button>
             </div>

             {/* Enterprise Tier */}
             <div className="p-8 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 text-center flex flex-col">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Institutional</h3>
                <p className="text-slate-500 mb-6 text-sm">Custom solutions for VC & PE firms.</p>
                <div className="mb-6 text-4xl font-extrabold text-slate-900 dark:text-white">Custom</div>
                <ul className="text-left space-y-4 mb-8 flex-1 text-sm text-slate-600 dark:text-slate-400">
                   <li className="flex items-center gap-3"><svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Team Accounts</li>
                   <li className="flex items-center gap-3"><svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> API Access</li>
                   <li className="flex items-center gap-3"><svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Data Room Integrations</li>
                   <li className="flex items-center gap-3"><svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Dedicated Success Manager</li>
                </ul>
                <button onClick={onSignup} className="w-full py-3 rounded-xl font-medium text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Contact Sales</button>
             </div>
          </div>
         </div>
      </section>

      {/* 9. Footer */}
      <footer className="py-12 bg-white dark:bg-[#0b1120] border-t border-slate-200 dark:border-slate-800 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
			<div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">FC</div>
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">FoundersCircle</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-blue-600 transition-colors">Platform</a>
            <a href="#" className="hover:text-blue-600 transition-colors">About</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Terms</a>
          </div>
          <div className="text-sm text-slate-400">
            &copy; 2025 FoundersCircle Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
