import React, { useState, useEffect, useRef, useCallback } from 'react';
import anime from 'animejs';
import { io, Socket } from 'socket.io-client';
import { User, ChatMessage } from '../types';
import { apiService } from '../services/apiService';
import { LogoMark } from './Brand';

interface ChatProps {
  user: User;
  /** Bumped by the Dashboard when a notification is clicked → re-fetch. */
  refreshKey?: number;
}

interface Peer {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  industry?: string;
}

interface Conversation {
  peer: Peer;
  lastMessage: ChatMessage | null;
  unreadCount: number;
}

interface PendingRequest {
  id: string;               // connection id
  requester: Peer;
  createdAt: string;
}

const EMOJIS = ['🚀', '📈', '💰', '🔥', '🤝', '💎', '🎉', '💡', '✅', '✨'];

const timeLabel = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const Chat: React.FC<ChatProps> = ({ user, refreshKey = 0 }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<Peer | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [message, setMessage] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [sendError, setSendError] = useState('');
  const [peerTyping, setPeerTyping] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedPeerRef = useRef<Peer | null>(null);
  const lastTypingEmitRef = useRef(0);

  useEffect(() => { selectedPeerRef.current = selectedPeer; }, [selectedPeer]);

  // ── Socket.IO: authenticated, persistent messaging ────────────────────────
  // On platforms without WebSocket support (e.g. Vercel serverless) the UI
  // transparently falls back to REST + polling — nothing is ever faked.
  useEffect(() => {
    const token = localStorage.getItem('founders_circle_token');
    if (!token) return;

    const socket: Socket = io({
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 4,
    });
    socketRef.current = socket;

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));

    socket.on('receive_message', (msg: ChatMessage) => {
      const peer = selectedPeerRef.current;
      if (peer && (msg.senderId === peer.id || msg.receiverId === peer.id)) {
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        // Mark as read immediately — the conversation is open.
        apiService.markConversationRead(peer.id).catch(() => {});
      }
      refreshConversations();
    });

    socket.on('typing', (data: { senderId: string; isTyping: boolean }) => {
      if (selectedPeerRef.current?.id === data.senderId) {
        setPeerTyping(!!data.isTyping);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data loading ──────────────────────────────────────────────────────────
  const refreshConversations = useCallback(async () => {
    try {
      const data = await apiService.getConversations();
      // The API returns Prisma rows (`content`); the UI speaks ChatMessage (`text`).
      const conversations: Conversation[] = (data.conversations || []).map((c: any) => ({
        ...c,
        lastMessage: c.lastMessage
          ? { ...c.lastMessage, text: c.lastMessage.text ?? c.lastMessage.content }
          : null,
      }));
      setConversations(conversations);
      setLoadError('');
    } catch {
      setLoadError('Could not load conversations. Retrying shortly.');
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  const refreshPending = useCallback(async () => {
    try {
      const data = await apiService.getMyConnections();
      setPendingRequests((data.received || []).filter((c: any) => c.status === 'PENDING'));
    } catch { /* non-fatal — sidebar section simply stays empty */ }
  }, []);

  useEffect(() => {
    refreshConversations();
    refreshPending();
    // Fallback polling when sockets are unavailable; harmless when connected.
    const interval = setInterval(() => {
      if (socketRef.current?.connected) return;
      refreshConversations();
    }, 10000);
    return () => clearInterval(interval);
  }, [refreshConversations, refreshPending, refreshKey]);

  const loadMessages = useCallback(async (peerId: string, targetPage: number, append = false) => {
    setIsLoadingMessages(true);
    try {
      const data = await apiService.getMessages(peerId, targetPage, 30);
      const mapped: ChatMessage[] = (data.messages || []).map((m: any) => ({
        id: m.id,
        senderId: m.senderId,
        receiverId: m.receiverId,
        text: m.content,
        createdAt: m.createdAt,
      }));
      setMessages(prev => append ? [...mapped, ...prev] : mapped);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
      // This conversation is now open — mark incoming as read.
      apiService.markConversationRead(peerId).catch(() => {});
    } catch {
      setLoadError('Could not load messages for this conversation.');
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // Fallback polling of the open conversation while sockets are down.
  useEffect(() => {
    if (!selectedPeer || socketConnected) return;
    const interval = setInterval(() => {
      loadMessages(selectedPeer.id, 1, false);
    }, 8000);
    return () => clearInterval(interval);
  }, [selectedPeer, socketConnected, loadMessages]);

  useEffect(() => {
    if (selectedPeer) {
      (anime as any)({
        targets: '.message-bubble',
        opacity: [0, 1],
        translateY: [10, 0],
        delay: (anime as any).stagger(50),
        duration: 400,
        easing: 'easeOutQuad',
      });
    }
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedPeer, messages]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const openConversation = (peer: Peer) => {
    setSelectedPeer(peer);
    setSendError('');
    setPeerTyping(false);
    loadMessages(peer.id, 1);
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await apiService.updateConnectionStatus(requestId, 'ACCEPTED');
      await Promise.all([refreshPending(), refreshConversations()]);
    } catch {
      setLoadError('Could not accept the request. Please retry.');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await apiService.updateConnectionStatus(requestId, 'REJECTED');
      refreshPending();
    } catch {
      setLoadError('Could not reject the request. Please retry.');
    }
  };

  const deliverViaSocket = (receiverId: string, text: string): Promise<ChatMessage | null> =>
    new Promise((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket?.connected) return reject(new Error('socket-unavailable'));
      const timer = setTimeout(() => reject(new Error('timeout')), 6000);
      socket.emit('send_message', { receiverId, text }, (response: any) => {
        clearTimeout(timer);
        if (response?.ok && response.message) {
          resolve({
            id: response.message.id,
            senderId: response.message.senderId,
            receiverId: response.message.receiverId,
            text: response.message.text,
            createdAt: response.message.createdAt || new Date().toISOString(),
          });
        } else {
          reject(new Error(response?.error || 'Delivery failed'));
        }
      });
    });

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = message.trim();
    if (!text || !selectedPeer || isSending) return;

    setIsSending(true);
    setSendError('');
    try {
      let delivered: ChatMessage;
      try {
        // Real-time path: server persists + authorizes before acking.
        const viaSocket = await deliverViaSocket(selectedPeer.id, text);
        if (!viaSocket) throw new Error('Delivery failed');
        delivered = viaSocket;
      } catch (err: any) {
        if (err?.message && err.message !== 'socket-unavailable' && err.message !== 'timeout') {
          // Server refused (e.g. connection revoked) — surface honestly.
          throw err;
        }
        // REST fallback (serverless / offline socket).
        const data = await apiService.sendChatMessage(selectedPeer.id, text);
        delivered = {
          id: data.message.id,
          senderId: data.message.senderId,
          receiverId: data.message.receiverId,
          text: data.message.content,
          createdAt: data.message.createdAt,
        };
      }
      setMessages(prev => prev.some(m => m.id === delivered.id) ? prev : [...prev, delivered]);
      setMessage('');
      refreshConversations();
    } catch (err: any) {
      setSendError(err?.response?.data?.message || err?.message || 'Failed to send. Please retry.');
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = (value: string) => {
    setMessage(value);
    const socket = socketRef.current;
    if (socket?.connected && selectedPeer) {
      const now = Date.now();
      if (now - lastTypingEmitRef.current > 1500) {
        lastTypingEmitRef.current = now;
        socket.emit('typing', { receiverId: selectedPeer.id, isTyping: value.length > 0 });
      }
    }
  };

  const addEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojis(false);
  };

  const filteredConversations = conversations.filter(c =>
    c.peer.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex h-[75vh]">
      {/* Contact List */}
      <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex bg-slate-50/50 dark:bg-surface-0/50">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white">Messages</h2>
            {!socketConnected && (
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                Polling mode
              </span>
            )}
          </div>
          <div className="relative">
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-blue-500 text-slate-900 dark:text-white placeholder-slate-400 transition-colors shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Pending connection requests → accept/reject to unlock chat */}
          {pendingRequests.length > 0 && (
            <div className="mb-3">
              <p className="label-caps text-[9px] text-slate-400 px-3 py-2">Connection Requests</p>
              {pendingRequests.map(req => (
                <div key={req.id} className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/40 mb-2">
                  <div className="flex items-center gap-3">
                    <img src={req.requester.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${req.requester.name}`} className="w-10 h-10 rounded-full object-cover border border-amber-200 dark:border-amber-800" alt={req.requester.name} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{req.requester.name}</h4>
                      <p className="text-xs text-slate-500 truncate">wants to connect</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2.5">
                    <button
                      onClick={() => handleAcceptRequest(req.id)}
                      className="flex-1 bg-blue-600 text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req.id)}
                      className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isLoadingConversations ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="w-6 h-6 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Loading conversations...</p>
            </div>
          ) : loadError && conversations.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs text-red-500 font-medium mb-3">{loadError}</p>
              <button onClick={() => { setIsLoadingConversations(true); refreshConversations(); }} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                Retry
              </button>
            </div>
          ) : (
            <>
              {filteredConversations.map(c => (
                <button
                  key={c.peer.id}
                  onClick={() => openConversation(c.peer)}
                  className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all text-left ${selectedPeer?.id === c.peer.id ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent'}`}
                >
                  <img
                    src={c.peer.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${c.peer.name}`}
                    className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    alt={c.peer.name}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className={`font-bold text-sm truncate ${selectedPeer?.id === c.peer.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>{c.peer.name}</h3>
                      {c.lastMessage && <span className="text-[10px] text-slate-400 font-medium">{timeLabel(c.lastMessage.createdAt)}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs truncate text-slate-500 dark:text-slate-400 font-medium">
                        {c.lastMessage
                          ? `${c.lastMessage.senderId === user.id ? 'You: ' : ''}${c.lastMessage.text}`
                          : 'No messages yet — say hello'}
                      </p>
                      {c.unreadCount > 0 && (
                        <span className="shrink-0 min-w-[18px] h-[18px] px-1 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {c.unreadCount > 9 ? '9+' : c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {filteredConversations.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-sm font-medium">
                  {searchQuery ? 'No matching conversations' : 'No connections yet — connect with members from the Feed or Discover to start messaging.'}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-surface-1 relative">
        {selectedPeer ? (
          <>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-surface-1">
              <div className="flex items-center gap-4">
                <img src={selectedPeer.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedPeer.name}`} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" alt={selectedPeer.name} />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{selectedPeer.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs text-slate-500 font-medium">Connected · {selectedPeer.role}{selectedPeer.industry ? ` · ${selectedPeer.industry}` : ''}</span>
                  </div>
                </div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-50/50 dark:bg-surface-0/50">
              {/* Older history */}
              {page < totalPages && (
                <div className="flex justify-center">
                  <button
                    onClick={() => loadMessages(selectedPeer.id, page + 1, true)}
                    disabled={isLoadingMessages}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-full shadow-sm disabled:opacity-50"
                  >
                    {isLoadingMessages ? 'Loading...' : `Load earlier messages (${totalPages - page} more page${totalPages - page > 1 ? 's' : ''})`}
                  </button>
                </div>
              )}

              {isLoadingMessages && messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-6 h-6 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                  <p className="text-xs text-slate-400 font-medium">Loading conversation...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <p className="text-sm font-medium">No messages yet. Send a message to start the conversation.</p>
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`flex ${m.senderId === user.id ? 'justify-end' : 'justify-start'} message-bubble`}>
                    <div className={`relative ${m.senderId === user.id
                      ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl rounded-tl-sm'
                      } px-5 py-3 max-w-[75%] shadow-sm flex flex-col`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>
                      <div className={`text-[10px] mt-1.5 font-medium text-right ${m.senderId === user.id ? 'text-blue-200' : 'text-slate-400'}`}>
                        {timeLabel(m.createdAt)}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {peerTyping && (
                <div className="flex justify-start message-bubble">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              )}
            </div>

            {sendError && (
              <div className="px-6 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center justify-between">
                <span>{sendError}</span>
                <button onClick={() => setSendError('')} className="ml-3 underline hover:no-underline">Dismiss</button>
              </div>
            )}

            <div className="p-4 bg-white dark:bg-surface-1 border-t border-slate-200 dark:border-slate-800">
              <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojis(!showEmojis)}
                    className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </button>

                  {showEmojis && (
                    <div className="absolute bottom-14 left-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-xl flex flex-wrap gap-2 w-64 z-50">
                      {EMOJIS.map(e => (
                        <button key={e} type="button" onClick={() => addEmoji(e)} className="text-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">{e}</button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center pr-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                  <textarea
                    className="flex-1 bg-transparent border-none outline-none dark:text-white text-sm placeholder-slate-400 px-4 py-3 max-h-32 min-h-[44px] resize-none"
                    placeholder="Write a message..."
                    value={message}
                    onChange={(e) => handleTyping(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={1}
                  />
                  <button
                    type="submit"
                    disabled={!message.trim() || isSending}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending
                      ? <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-20 text-center relative z-0">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <LogoMark size={40} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Your Messages</h2>
            <p className="text-sm text-slate-500 max-w-xs">
              Select a connection from the sidebar to view your conversation. Messaging opens once a connection request is accepted.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
