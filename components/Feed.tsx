import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types';
import { apiService } from '../services/apiService';

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
}

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
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [dealForm, setDealForm] = useState({
    tag: user.role === 'FOUNDER' ? 'Raising Seed' : 'Investment Mandate',
    metric: '',
    metricLabel: user.role === 'FOUNDER' ? 'Target Raise' : 'Ticket Size',
    content: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFeed = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getFeed(1, 20);
      setPosts(data.posts || []);

      // Track which posts the user has liked
      const liked = new Set<string>();
      (data.posts || []).forEach((p: LivePost) => {
        if (p.likes.some(l => l.userId === user.id)) liked.add(p.id);
      });
      setLikedPosts(liked);
    } catch (err) {
      console.error('Feed load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

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
      // Prepend the new post returned from the DB to the feed
      setPosts(prev => [newPost, ...prev]);
      setDealForm({ ...dealForm, content: '', metric: '' });
      setAttachedImage(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to post';
      alert(msg);
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
      // Update likes count in state without re-fetching
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        return {
          ...p,
          likes: result.liked
            ? [...p.likes, { userId: user.id }]
            : p.likes.filter(l => l.userId !== user.id),
        };
      }));
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const handleComment = async (postId: string) => {
    const content = (commentInputs[postId] || '').trim();
    if (!content) return;
    try {
      const comment = await apiService.addComment(postId, content);
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, comments: [comment, ...p.comments] }
          : p
      ));
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Comment error:', err);
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

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      
      {/* Create Post */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
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
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center pl-16">
          <button onClick={() => fileInputRef.current?.click()} className="text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 text-sm font-semibold rounded-lg px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/20">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
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
      ) : posts.length === 0 ? (
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-16 text-center shadow-sm">
          <div className="text-4xl mb-4">🐦</div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No posts yet</h3>
          <p className="text-slate-500 text-sm">Be the first to post a deal update on the B.I.R.D platform.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {posts.map(post => {
            const isLiked = likedPosts.has(post.id);
            const showComments = expandedComments.has(post.id);
            const isOwn = post.author.id === user.id;

            return (
              <div key={post.id} className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="p-5">
                  {/* Author Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={post.author.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${post.author.name}`}
                        className="w-11 h-11 rounded-full object-cover border border-slate-100 dark:border-slate-800"
                        alt={post.author.name}
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{post.author.name}</h3>
                          {isOwn && <span className="text-xs text-blue-500 font-semibold">• You</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{post.author.role} · {post.author.industry || 'Multi-Sector'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{timeAgo(post.createdAt)} ago</p>
                      </div>
                    </div>
                  </div>

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
                  <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{post.content}</p>
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
                      {post.comments.length > 0 && <span>{post.comments.length}</span>}
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
                    {post.comments.slice(0, 5).map(comment => (
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Feed;
