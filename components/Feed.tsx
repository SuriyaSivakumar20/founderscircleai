
import React, { useState, useEffect, useRef } from 'react';
import anime from 'animejs';
import { User, Post } from '../types';
import { apiService } from '../services/apiService';

interface FeedProps {
  user: User;
}

// Post type for display (company raise or investor opening)
type PostType = 'COMPANY' | 'INVESTOR';

interface MockPost {
  id: string;
  type: PostType;
  author: {
    name: string;
    title: string;
    avatar: string;
    industry: string;
    location: string;
    verified: boolean;
  };
  content: string;
  tag: string;
  tagColor: string;
  metric?: string;
  metricLabel?: string;
  image: string;
  createdAt: string;
  endorsements: number;
}

const MOCK_POSTS: MockPost[] = [
  {
    id: '1',
    type: 'COMPANY',
    author: {
      name: 'Kiran Infra Systems',
      title: 'Series A Stage · Infrastructure Tech',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=KIS&backgroundColor=C5A059&textColor=ffffff',
      industry: 'Construction Technology',
      location: 'Bengaluru, India',
      verified: true,
    },
    content: 'We\'ve built India\'s first AI-powered site supervision platform for large-scale infrastructure projects — reducing on-site delays by 38% and material wastage by 22%. Our system is live across 14 NHAI highway projects, processing over 2.4 million sensor events per day. We are raising ₹42 Cr in Series A to expand into port and metro rail verticals across South and West India.',
    tag: 'Raising Series A',
    tagColor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    metric: '₹42 Cr',
    metricLabel: 'Target Raise',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&q=80',
    createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    endorsements: 47,
  },
  {
    id: '2',
    type: 'INVESTOR',
    author: {
      name: 'Priya Venture Partners',
      title: 'Family Office · Deep Tech Focus',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=PVP&backgroundColor=2D3A3A&textColor=C5A059',
      industry: 'Venture Capital',
      location: 'Mumbai, India',
      verified: true,
    },
    content: 'We are actively deploying capital in B2B SaaS and Climate Tech. Ticket size: ₹3–15 Cr for Seed/Pre-A. Open to co-invest alongside institutional VCs. Portfolio includes 12 companies across India, SE Asia. Currently looking for founders building for Tier-2 cities, agri-value chains, or industrial IoT. If your product has been live for 6+ months with paying customers — let\'s talk.',
    tag: 'Open for Deals',
    tagColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    metric: '₹3–15 Cr',
    metricLabel: 'Ticket Size',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80',
    createdAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
    endorsements: 83,
  },
  {
    id: '3',
    type: 'COMPANY',
    author: {
      name: 'ZephyrHealth AI',
      title: 'Pre-Series A · HealthTech · DPIIT Recognised',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=ZHA&backgroundColor=658f8f&textColor=ffffff',
      industry: 'Digital Health',
      location: 'Hyderabad, India',
      verified: false,
    },
    content: 'ZephyrHealth has developed a voice-first AI diagnostic assistant designed for ASHA workers and rural health workers in low-connectivity environments. Our app works offline on ₹5,000 Android phones and supports 9 Indian languages. We have onboarded 1,800 health workers across Telangana and Odisha, conducting 34,000+ screenings in 8 months. Seeking ₹18 Cr to scale to 5 new states and integrate with the Ayushman Bharat digital health stack.',
    tag: 'Raising Pre-Series A',
    tagColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    metric: '₹18 Cr',
    metricLabel: 'Target Raise',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=600&q=80',
    createdAt: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
    endorsements: 62,
  },
  {
    id: '4',
    type: 'INVESTOR',
    author: {
      name: 'Anant Capital Group',
      title: 'NBFC · Growth Stage Investments',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=ACG&backgroundColor=1c2424&textColor=C5A059',
      industry: 'Private Equity',
      location: 'New Delhi, India',
      verified: true,
    },
    content: 'Anant Capital is looking at EdTech, Fintech for MSMEs, and Circular Economy businesses at the Series A/B stage. We write checks between ₹25–80 Cr and have board-level experience in 7 portfolio companies. Our focus this quarter is on businesses with strong unit economics, preferably profitable or 12–18 months to breakeven. We avoid pre-revenue businesses. Founders with strong op backgrounds get our attention.',
    tag: 'Series A/B Domain',
    tagColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    metric: '₹25–80 Cr',
    metricLabel: 'Ticket Size',
    image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&q=80',
    createdAt: new Date(Date.now() - 3600 * 1000 * 14).toISOString(),
    endorsements: 119,
  },
  {
    id: '5',
    type: 'COMPANY',
    author: {
      name: 'NitiGrid Technologies',
      title: 'Seed Stage · Energy Transition',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=NGT&backgroundColor=C5A059&textColor=ffffff',
      industry: 'CleanTech / Smart Grid',
      location: 'Chennai, India',
      verified: false,
    },
    content: 'NitiGrid enables commercial & industrial (C&I) buyers to purchase renewable energy directly from solar and wind producers via a blockchain-verified energy marketplace. We\'ve facilitated 12 MW of bilateral trades in Tamil Nadu in the past 4 months — saving buyers 18% on power costs vs. utility rates. Our smart contract layer handles scheduling, balancing, and REC issuance end-to-end. Raising ₹8 Cr Seed to expand to Gujarat and Karnataka and onboard 50 new C&I buyers.',
    tag: 'Raising Seed',
    tagColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    metric: '₹8 Cr',
    metricLabel: 'Target Raise',
    image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&q=80',
    createdAt: new Date(Date.now() - 3600 * 1000 * 22).toISOString(),
    endorsements: 34,
  },
  {
    id: '6',
    type: 'INVESTOR',
    author: {
      name: 'Smriti Rajan · Angel Network',
      title: 'LP Collective · Consumer & D2C',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=SRA&backgroundColor=91afaf&textColor=ffffff',
      industry: 'Angel Investing',
      location: 'Pune, India',
      verified: true,
    },
    content: 'Our angel network of 28 HNI LPs is open to co-investments in Consumer, D2C, and quick-commerce enablement. We write collective tickets of ₹50L–2 Cr and can close in 30 days with minimal due diligence overhead. We bring operational firepower — 6 of our LPs are ex-FMCG/retail executives who actively advise portfolio companies. Current focus: female-led brands, sustainable packaging innovations, and premium regional food products. Reach out with your one-pager.',
    tag: 'Angel Co-Invest Open',
    tagColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
    metric: '₹50L–2 Cr',
    metricLabel: 'Ticket Size',
    image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&q=80',
    createdAt: new Date(Date.now() - 3600 * 1000 * 36).toISOString(),
    endorsements: 91,
  },
];

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'just now';
};

const Feed: React.FC<FeedProps> = ({ user }) => {
  const [posts, setPosts] = useState<MockPost[]>(MOCK_POSTS);
  const [newPostContent, setNewPostContent] = useState('');
  const [endorsedIds, setEndorsedIds] = useState<Set<string>>(new Set());
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (anime as any)({
      targets: '.feed-item',
      opacity: [0, 1],
      translateY: [40, 0],
      delay: anime.stagger(120),
      duration: 900,
      easing: 'easeOutExpo',
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setAttachedImage(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = () => {
    if (!newPostContent.trim()) return;
    const userPost: MockPost = {
      id: `user-${Date.now()}`,
      type: 'COMPANY',
      author: {
        name: user.name,
        title: user.role === 'FOUNDER' ? 'Founder · Private' : 'Investor · Private',
        avatar: user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`,
        industry: user.industry || 'General',
        location: 'India',
        verified: false,
      },
      content: newPostContent,
      tag: user.role === 'FOUNDER' ? 'Startup Update' : 'Investment Interest',
      tagColor: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
      image: attachedImage || `https://picsum.photos/seed/${Date.now()}/600/400`,
      createdAt: new Date().toISOString(),
      endorsements: 0,
    };
    setPosts([userPost, ...posts]);
    setNewPostContent('');
    setAttachedImage(null);
  };

  const handleEndorse = (id: string) => {
    if (endorsedIds.has(id)) return;
    setEndorsedIds(prev => new Set(prev).add(id));
    setPosts(prev => prev.map(p => p.id === id ? { ...p, endorsements: p.endorsements + 1 } : p));
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Create Post */}
      <div className="bg-white dark:bg-zinc-900/50 p-8 border border-zinc-100 dark:border-zinc-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
        <div className="flex gap-6">
          <div className="hidden sm:block flex-shrink-0">
            <img src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} className="w-14 h-14 rounded-none object-cover" alt="Me" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] uppercase tracking-[0.3em] text-accent font-bold mb-3 block">New Insight</span>
            <textarea
              className="w-full bg-transparent border-none p-0 outline-none resize-none h-20 placeholder-zinc-300 dark:placeholder-zinc-600 text-ink dark:text-paper font-serif text-xl italic leading-relaxed"
              placeholder={`Share a market insight or funding interest, ${user.name.split(' ')[0]}…`}
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
            />
          </div>
        </div>

        {attachedImage && (
          <div className="mt-4 relative inline-block">
            <img src={attachedImage} className="max-h-48 border border-zinc-200 dark:border-zinc-700" alt="Preview" />
            <button onClick={() => setAttachedImage(null)} className="absolute -top-2 -right-2 bg-accent text-white p-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-zinc-50 dark:border-zinc-800 flex justify-between items-center">
          <button onClick={() => fileInputRef.current?.click()} className="text-zinc-400 hover:text-accent transition-all flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Attach Asset
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          <button
            onClick={handlePost}
            disabled={!newPostContent.trim()}
            className="border border-accent text-accent px-8 py-3 font-bold transition-all hover:bg-accent hover:text-white active:scale-95 uppercase tracking-widest text-[10px] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Publish Insight
          </button>
        </div>
      </div>

      {/* Feed List */}
      <div className="space-y-12">
        {posts.map((post, idx) => (
          <div key={post.id} className="feed-item group relative" style={{ opacity: 0 }}>
            {/* Number */}
            <div className="absolute -left-10 top-0 text-zinc-100 dark:text-zinc-800/80 font-serif italic text-5xl select-none pointer-events-none">
              {String(idx + 1).padStart(2, '0')}
            </div>

            <div className="bg-white dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800 overflow-hidden transition-all duration-500 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5">
              <div className="flex flex-col md:flex-row">
                {/* Image Panel */}
                <div className="w-full md:w-2/5 relative overflow-hidden" style={{ minHeight: '260px' }}>
                  <img
                    src={post.image}
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${post.id}/600/400`; }}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-105"
                    alt={post.author.name}
                    style={{ position: 'absolute', inset: 0 }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent group-hover:opacity-0 transition-opacity duration-700" />
                  {/* Type badge on top of image */}
                  <div className="absolute top-4 left-4">
                    <span className={`text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 ${post.tagColor}`}>
                      {post.tag}
                    </span>
                  </div>
                  {post.metric && (
                    <div className="absolute bottom-4 left-4 bg-ink/80 dark:bg-zinc-900/90 px-4 py-3 backdrop-blur-sm">
                      <div className="text-accent font-serif italic text-2xl font-bold leading-none">{post.metric}</div>
                      <div className="text-[9px] uppercase tracking-widest text-zinc-400 mt-1">{post.metricLabel}</div>
                    </div>
                  )}
                </div>

                {/* Content Panel */}
                <div className="flex-1 p-8 flex flex-col justify-between">
                  <div>
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-6">
                      <img
                        src={post.author.avatar}
                        className="w-12 h-12 flex-shrink-0 object-cover"
                        alt={post.author.name}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-serif italic text-ink dark:text-paper leading-tight">{post.author.name}</h3>
                          {post.author.verified && (
                            <svg className="w-4 h-4 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                          )}
                        </div>
                        <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mt-0.5">{post.author.title}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[9px] text-zinc-400">{post.author.industry}</span>
                          <span className="text-zinc-200 dark:text-zinc-700">·</span>
                          <span className="text-[9px] text-zinc-400">{post.author.location}</span>
                        </div>
                      </div>
                      <span className="text-[9px] uppercase tracking-widest text-zinc-300 dark:text-zinc-600 font-bold flex-shrink-0">
                        {timeAgo(post.createdAt)}
                      </span>
                    </div>

                    {/* Content */}
                    <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-sm font-light mb-6 line-clamp-5">
                      {post.content}
                    </p>

                    {/* Post type indicator */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className={`w-2 h-2 rounded-full ${post.type === 'COMPANY' ? 'bg-green-500' : 'bg-blue-500'}`} />
                      <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-zinc-400">
                        {post.type === 'COMPANY' ? 'Company Looking to Raise' : 'Investor Opening'}
                      </span>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-6 border-t border-zinc-50 dark:border-zinc-800/60">
                    <div className="flex gap-6">
                      <button
                        onClick={() => handleEndorse(post.id)}
                        className={`flex items-center gap-2 transition-colors uppercase tracking-widest text-[9px] font-bold ${endorsedIds.has(post.id) ? 'text-accent' : 'text-zinc-400 hover:text-accent'
                          }`}
                      >
                        <svg className="w-4 h-4" fill={endorsedIds.has(post.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        <span className="text-accent italic text-sm">{post.endorsements}</span> Endorse
                      </button>
                      <button className="text-zinc-400 hover:text-accent transition-colors uppercase tracking-widest text-[9px] font-bold">
                        Request Briefing
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="text-zinc-300 hover:text-accent transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Feed;
