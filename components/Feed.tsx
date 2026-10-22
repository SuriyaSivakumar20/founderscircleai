import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types';
import { apiService } from '../services/apiService';
import { LogoMark } from './Brand';

interface FeedProps {
  user: User;
}

interface LivePost {
  id: string;
  content: string;
  tag: string;
  metric?: string;
  metricLabel?: string;
  image?: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
    industry?: string;
    location?: string;
  };
  likes: { userId: string }[];
  comments: {
    id: string;
    content: string;
    createdAt: string;
    user: { id: string; name: string; avatar?: string };
  }[];
  commentsTotal?: number;
}

interface AuthorProfile {
  id: string;
  name: string;
  role: string;
  industry?: string;
  location?: string;
  description?: string;
  avatar?: string;
  website?: string;
  createdAt: string;
  vettingScore?: number;
  posts: { id: string; content: string; createdAt: string }[];
}

/** Connection status of the viewer relative to another user. */
type ConnectState = 'none' | 'sending' | 'pending' | 'connected';

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (mins > 0) return `${mins}m`;
  return 'just now';
};

const tagColors: Record<string, string> = {
  'Raising Seed':       'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Raising Series A':   'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'Raising Pre-Series A': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  'Open for Deals':     'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'Investment Mandate': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'Traction Update':    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const getTagColor = (tag: string) =>
  tagColors[tag] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

const Feed: React.FC<FeedProps> = ({ user }) => {
  const [posts, setPosts] = useState<LivePost[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [feedError, setFeedError] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [fullComments, setFullComments] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<Record<string, string>>({});
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [connections, setConnections] = useState<Map<string, ConnectState>>(new Map());
  const [viewingAuthor, setViewingAuthor] = useState<AuthorProfile | null>(null);
  const [authorLoading, setAuthorLoading] = useState(false);
  const [authorError, setAuthorError] = useState('');
  const [dealForm, setDealForm] = useState({
    tag: user.role === 'FOUNDER' ? 'Raising Seed' : 'Investment Mandate',
    metric: '',
    metricLabel: user.role === 'FOUNDER' ? 'Target Raise' : 'Ticket Size',
    content: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Connection states (for the Connect button on authors) ─────────────────
  const loadConnections = useCallback(async () => {
    try {
      const data = await apiService.getMyConnections();
      const map = new Map<string, ConnectState>();
      (data.sent || []).forEach((c: any) => {
        // The other side is the receiver for sent requests.
        map.set(c.receiverId, c.status === 'ACCEPTED' ? 'connected' : 'pending');
      });
      (data.received || []).forEach((c: any) => {
        map.set(c.requesterId, c.status === 'ACCEPTED' ? 'connected' : 'pending');
      });
      setConnections(map);
    } catch { /* Connect buttons degrade to 'Connect' — actions still re-check server-side */ }
  }, []);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  // ── Feed loading (paginated) ──────────────────────────────────────────────
  const loadFeed = useCallback(async () => {
    try {
      setIsLoading(true);
      setFeedError('');
      const data = await apiService.getFeed(1, 10);
      setPosts(data.posts || []);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);

      const liked = new Set<string>();
      (data.posts || []).forEach((p: LivePost) => {
        if (p.likes.some(l => l.userId === user.id)) liked.add(p.id);
      });
      setLikedPosts(liked);
    } catch {
      setFeedError('Could not load the feed. Check your connection and retry.');
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const handleLoadMore = async () => {
    if (isLoadingMore || page >= totalPages) return;
    setIsLoadingMore(true);
    try {
      const data = await apiService.getFeed(page + 1, 10);
      const newPosts: LivePost[] = data.posts || [];
      setPosts(prev => [...prev, ...newPosts]);
      setPage(data.page || page + 1);
      setTotalPages(data.totalPages || totalPages);
      setLikedPosts(prev => {
        const next = new Set(prev);
        newPosts.forEach(p => { if (p.likes.some(l => l.userId === user.id)) next.add(p.id); });
        return next;
      });
    } catch {
      setActionError(prev => ({ ...prev, __loadmore: 'Could not load more posts. Please retry.' }));
    } finally {
      setIsLoadingMore(false);
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handlePost = async () => {
    if (!dealForm.content.trim() || isPosting) return;
    setIsPosting(true);
    try {
      const newPost = await apiService.createPost({
        content: dealForm.content,
        tag: dealForm.tag,
        metric: dealForm.metric || undefined,
        metricLabel: dealForm.metricLabel || undefined,
        image: attachedImage || undefined,
      });
      setPosts(prev => [newPost, ...prev]);
      setDealForm({ ...dealForm, content: '', metric: '' });
      setAttachedImage(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to post';
      setActionError(prev => ({ ...prev, __post: msg }));
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const result = await apiService.likePost(postId);
      setLikedPosts(prev => {
        const next = new Set(prev);
        if (result.liked) next.add(postId); else next.delete(postId);
        return next;
      });
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        return {
          ...p,
          likes: result.liked
            ? [...p.likes, { userId: user.id }]
            : p.likes.filter(l => l.userId !== user.id),
        };
      }));
    } catch (err: any) {
      setActionError(prev => ({
        ...prev,
        [postId]: err?.response?.data?.message || 'Could not update like. Please retry.',
      }));
    }
  };

  const handleComment = async (postId: string) => {
    const content = (commentInputs[postId] || '').trim();
    if (!content) return;
    try {
      const comment = await apiService.addComment(postId, content);
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, comments: [...p.comments, comment], commentsTotal: (p.commentsTotal || p.comments.length) + 1 }
          : p
      ));
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      setActionError(prev => { const next = { ...prev }; delete next[postId]; return next; });
    } catch (err: any) {
      setActionError(prev => ({
        ...prev,
        [postId]: err?.response?.data?.message || 'Could not post comment. Please retry.',
      }));
    }
  };

  const handleConnect = async (authorId: string) => {
    if (connections.get(authorId) !== 'none' && connections.get(authorId) !== undefined) return;
    setConnections(prev => new Map(prev).set(authorId, 'sending'));
    try {
      await apiService.sendConnection(authorId);
      setConnections(prev => new Map(prev).set(authorId, 'pending'));
    } catch (err: any) {
      setConnections(prev => new Map(prev).set(authorId, 'none'));
      setActionError(prev => ({
        ...prev,
        [`connect-${authorId}`]: err?.response?.data?.message || 'Could not send connection request.',
      }));
    }
  };

  const openAuthorProfile = async (authorId: string) => {
    setViewingAuthor(null);
    setAuthorError('');
    setAuthorLoading(true);
    try {
      const profile = await apiService.getProfile(authorId);
      setViewingAuthor(profile);
    } catch (err: any) {
      setAuthorError(err?.response?.data?.message || 'Could not load profile.');
    } finally {
      setAuthorLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAttachedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const connectButton = (authorId: string, compact = false) => {
    if (authorId === user.id) return null;
    const state = connections.get(authorId) ?? 'none';
    const base = compact ? 'text-xs px-2.5 py-1' : 'text-sm px-4 py-1.5';
    if (state === 'connected') {
      return (
        <span className={`${base} rounded-full font-semibold bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 inline-flex items-center gap-1`}>
          ✓ Connected
        </span>
      );
    }
    if (state === 'pending') {
      return (
        <span className={`${base} rounded-full font-semibold bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 inline-flex items-center gap-1`}>
          ⏳ Pending
        </span>
      );
    }
    return (
      <button
        onClick={() => handleConnect(authorId)}
        disabled={state === 'sending'}
        className={`${base} rounded-full font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50`}
      >
        {state === 'sending' ? 'Sending...' : 'Connect'}
      </button>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">

      {/* Create Post */}
      <div className="bg-white dark:bg-surface-1 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex gap-4">
          <img
            src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
            className="w-12 h-12 rounded-full object-cover shrink-0 border border-slate-100 dark:border-slate-800"
            alt="Me"
          />
          <div className="flex-1">
            <div className="flex gap-3 mb-3">
              <select
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500 transition-colors dark:text-white cursor-pointer"
                value={dealForm.tag}
                onChange={e => setDealForm({...dealForm, tag: e.target.value})}
              >
                {user.role === 'FOUNDER' && <>
                  <option>Raising Seed</option>
                  <option>Raising Pre-Series A</option>
                  <option>Raising Series A</option>
                  <option>Traction Update</option>
                  <option>Update</option>
                </>}
                {user.role === 'INVESTOR' && <>
                  <option>Investment Mandate</option>
                  <option>Open for Deals</option>
                  <option>Update</option>
                </>}
                {user.role === 'ADMIN' && <option>Update</option>}
              </select>
              <input
                className="w-1/3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500 transition-colors dark:text-white"
                placeholder={user.role === 'FOUNDER' ? '₹10 Cr' : '₹5–20 Cr'}
                value={dealForm.metric}
                onChange={e => setDealForm({...dealForm, metric: e.target.value})}
              />
            </div>
            <textarea
              className="w-full bg-transparent border-none p-0 outline-none resize-none min-h-[70px] text-slate-800 dark:text-slate-200 font-medium placeholder-slate-400 text-sm leading-relaxed"
              placeholder={user.role === 'FOUNDER'
                ? 'Share a traction update, fundraise milestone, or insight...'
                : 'Share your investment thesis, deal criteria, or portfolio update...'}
              value={dealForm.content}
              onChange={e => setDealForm({...dealForm, content: e.target.value})}
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handlePost(); }}
            />
          </div>
        </div>

        {attachedImage && (
          <div className="mt-3 ml-16 relative inline-block">
            <img src={attachedImage} className="max-h-48 rounded-xl border border-slate-200 dark:border-slate-700" alt="Preview" />
            <button onClick={() => setAttachedImage(null)} className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 shadow-md hover:bg-slate-900">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {actionError.__post && (
          <div className="mt-3 ml-16 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center justify-between">
            <span>{actionError.__post}</span>
            <button onClick={() => setActionError(prev => { const n = {...prev}; delete n.__post; return n; })} className="ml-3 underline">Dismiss</button>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center pl-16">
          <button onClick={() => fileInputRef.current?.click()} className="text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 text-sm font-semibold rounded-lg px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/20">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Attach Image
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          <button
            onClick={handlePost}
            disabled={!dealForm.content.trim() || isPosting}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors hover:bg-blue-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
          >
            {isPosting && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>}
            {isPosting ? 'Posting...' : 'Post Deal Update'}
          </button>
        </div>
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Loading your B.I.R.D feed...</p>
        </div>
      ) : feedError ? (
        <div className="bg-white dark:bg-surface-1 rounded-2xl border border-slate-200 dark:border-slate-800 p-16 text-center shadow-sm">
          <div className="flex justify-center mb-5 text-red-300">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h3 className="font-display text-xl font-semibold text-slate-900 dark:text-white mb-2">Feed unavailable</h3>
          <p className="text-slate-500 text-sm mb-5">{feedError}</p>
          <button onClick={loadFeed} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
            Retry
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white dark:bg-surface-1 rounded-2xl border border-slate-200 dark:border-slate-800 p-16 text-center shadow-sm">
          <div className="flex justify-center mb-5 opacity-60"><LogoMark size={44} /></div>
          <h3 className="font-display text-xl font-semibold text-slate-900 dark:text-white mb-2">No posts yet</h3>
          <p className="text-slate-500 text-sm">Be the first to post a deal update on the B.I.R.D platform.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {posts.map(post => {
            const isLiked = likedPosts.has(post.id);
            const showComments = expandedComments.has(post.id);
            const isOwn = post.author.id === user.id;
            const totalComments = post.commentsTotal ?? post.comments.length;
            const showAllLoaded = fullComments[post.id];
            const visibleComments = showAllLoaded ? post.comments : post.comments.slice(0, 5);

            return (
              <div key={post.id} className="bg-white dark:bg-surface-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="p-5">
                  {/* Author Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={post.author.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${post.author.name}`}
                        className="w-11 h-11 rounded-full object-cover border border-slate-100 dark:border-slate-800 cursor-pointer"
                        alt={post.author.name}
                        onClick={() => openAuthorProfile(post.author.id)}
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3
                            className="font-bold text-slate-900 dark:text-white text-sm leading-tight cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => openAuthorProfile(post.author.id)}
                          >
                            {post.author.name}
                          </h3>
                          {isOwn && <span className="text-xs text-blue-500 font-semibold">• You</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{post.author.role} · {post.author.industry || 'Multi-Sector'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{timeAgo(post.createdAt)} ago</p>
                      </div>
                    </div>
                    {connectButton(post.author.id)}
                  </div>

                  {actionError[`connect-${post.author.id}`] && (
                    <div className="mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold px-3 py-2 rounded-xl">
                      {actionError[`connect-${post.author.id}`]}
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getTagColor(post.tag)}`}>{post.tag}</span>
                    {post.metric && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {post.metricLabel}: <span className="font-bold text-slate-900 dark:text-white">{post.metric}</span>
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                </div>

                {/* Image */}
                {post.image && (
                  <div className="border-y border-slate-100 dark:border-slate-800">
                    <img src={post.image} className="w-full max-h-80 object-cover" alt="Post attachment" />
                  </div>
                )}

                {/* Actions */}
                <div className="px-5 py-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                        isLiked
                          ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                    >
                      <svg className={`w-4 h-4 ${isLiked ? 'fill-blue-600' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                      {post.likes.length > 0 && <span>{post.likes.length}</span>}
                    </button>
                    <button
                      onClick={() => setExpandedComments(prev => {
                        const next = new Set(prev);
                        if (next.has(post.id)) next.delete(post.id); else next.add(post.id);
                        return next;
                      })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {totalComments > 0 && <span>{totalComments}</span>}
                    </button>
                  </div>
                </div>

                {/* Comments section */}
                {showComments && (
                  <div className="px-5 pb-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="pt-3 flex gap-3 mb-3">
                      <img
                        src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                        alt="Me"
                      />
                      <div className="flex-1 flex gap-2">
                        <input
                          className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors dark:text-white"
                          placeholder="Add a comment..."
                          value={commentInputs[post.id] || ''}
                          onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') handleComment(post.id); }}
                        />
                        <button
                          onClick={() => handleComment(post.id)}
                          disabled={!commentInputs[post.id]?.trim()}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
                        >
                          Post
                        </button>
                      </div>
                    </div>

                    {actionError[post.id] && (
                      <div className="mb-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold px-3 py-2 rounded-xl">
                        {actionError[post.id]}
                      </div>
                    )}

                    {visibleComments.map(comment => (
                      <div key={comment.id} className="flex gap-3 py-2 border-t border-slate-50 dark:border-slate-800">
                        <img
                          src={comment.user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.user.name}`}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                          alt={comment.user.name}
                        />
                        <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2">
                          <p className="text-xs font-bold text-slate-900 dark:text-white mb-0.5">{comment.user.name}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{comment.content}</p>
                        </div>
                      </div>
                    ))}

                    {totalComments > visibleComments.length && !showAllLoaded && (
                      <button
                        onClick={() => setFullComments(prev => ({ ...prev, [post.id]: true }))}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 py-2"
                      >
                        View all {totalComments} comments
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination */}
          {page < totalPages ? (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isLoadingMore && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>}
                {isLoadingMore ? 'Loading...' : `Load more (${totalPages - page} page${totalPages - page > 1 ? 's' : ''} left)`}
              </button>
            </div>
          ) : (
            <p className="text-center text-xs text-slate-400 pt-2">You're all caught up.</p>
          )}

          {actionError.__loadmore && (
            <p className="text-center text-xs text-red-500 font-semibold">{actionError.__loadmore}</p>
          )}
        </div>
      )}

      {/* Author profile modal — real GET /api/users/:id (logs a PROFILE_VIEW) */}
      {(viewingAuthor || authorLoading || authorError) && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => { setViewingAuthor(null); setAuthorError(''); }} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-surface-1 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="h-20 bg-gradient-to-r from-blue-600 to-cyan-600 relative shrink-0">
              <button onClick={() => { setViewingAuthor(null); setAuthorError(''); }} className="absolute top-3 right-3 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 p-2 rounded-full transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 pb-6 overflow-y-auto">
              {authorLoading ? (
                <div className="py-12 flex justify-center">
                  <div className="w-6 h-6 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
              ) : authorError ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-red-500 font-medium">{authorError}</p>
                </div>
              ) : viewingAuthor && (
                <>
                  <div className="flex justify-between items-end -mt-9 mb-4">
                    <img
                      src={viewingAuthor.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${viewingAuthor.name}`}
                      className="w-16 h-16 rounded-2xl border-4 border-white dark:border-surface-1 shadow-md object-cover bg-white"
                      alt={viewingAuthor.name}
                    />
                    <div className="mt-3">{connectButton(viewingAuthor.id)}</div>
                  </div>
                  <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white">{viewingAuthor.name}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {viewingAuthor.role}{viewingAuthor.industry ? ` · ${viewingAuthor.industry}` : ''}{viewingAuthor.location ? ` · ${viewingAuthor.location}` : ''}
                  </p>
                  {typeof viewingAuthor.vettingScore === 'number' && (
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">AI vetting score: {viewingAuthor.vettingScore}/100</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    Member since {new Date(viewingAuthor.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })}
                  </p>
                  {viewingAuthor.description && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mt-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      {viewingAuthor.description}
                    </p>
                  )}
                  {viewingAuthor.website && (
                    <a
                      href={viewingAuthor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 mt-3"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                      Website
                    </a>
                  )}
                  {viewingAuthor.posts && viewingAuthor.posts.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Recent posts</p>
                      <div className="space-y-2">
                        {viewingAuthor.posts.slice(0, 3).map(p => (
                          <div key={p.id} className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 line-clamp-2">
                            {p.content}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Feed;
