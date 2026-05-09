import React, { useState, useEffect, useRef } from 'react';
import anime from 'animejs';
import { io, Socket } from 'socket.io-client';
import { User, ChatMessage } from '../types';

interface ChatProps {
  user: User;
}

const Chat: React.FC<ChatProps> = ({ user }) => {
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({});
  
  // Call Feature State
  const [activeCall, setActiveCall] = useState<'audio' | 'video' | null>(null);
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected'>('ringing');
  const [callDuration, setCallDuration] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [contactsState, setContactsState] = useState([
    { id: 'c1', name: 'Alice from Helix Capital', avatar: 'https://picsum.photos/seed/alice/100', lastMsg: "We loved your pitch!", online: true, status: 'APPROVED' },
    { id: 'c2', name: 'Bob from GreenWave', avatar: 'https://picsum.photos/seed/bob/100', lastMsg: "Please share the data room.", online: false, status: 'LOCKED' },
    { id: 'c3', name: 'Elena • Peak Ventures', avatar: 'https://picsum.photos/seed/elena/100', lastMsg: "Are you free for a call?", online: true, status: 'LOCKED' }
  ]);

  const EMOJIS = ['🚀', '📈', '💰', '🔥', '🤝', '💎', '🎉', '💡', '✅', '✨'];

  useEffect(() => {
    // For Vercel demo mode: Use static chat layout since WebSockets are unsupported
    const defaultHistory: ChatMessage[] = [
      { id: 'm1', senderId: 'c1', receiverId: user.id, text: "We loved your pitch yesterday! Looking forward to reviewing the data room.", createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 'm2', senderId: user.id, receiverId: 'c1', text: "Thank you! Let me know when you'd like to schedule the next call.", createdAt: new Date(Date.now() - 1800000).toISOString() },
    ];
    setChatHistory(defaultHistory);
  }, [user.id]);

  useEffect(() => {
    if (selectedContact) {
      (anime as any)({
        targets: '.message-bubble',
        opacity: [0, 1],
        translateY: [10, 0],
        delay: (anime as any).stagger(50),
        duration: 400,
        easing: 'easeOutQuad'
      });
    }

    // Scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedContact, chatHistory]);

  // Call Logic Effects
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeCall && callStatus === 'ringing') {
      timer = setTimeout(() => setCallStatus('connected'), 3000);
    } else if (activeCall && callStatus === 'connected') {
      timer = setInterval(() => setCallDuration(d => d + 1), 1000);
    }
    return () => { clearTimeout(timer); clearInterval(timer); };
  }, [activeCall, callStatus]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (activeCall === 'video' && callStatus === 'connected' && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(s => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch(e => console.error("Video play error", e));
          }
        })
        .catch(err => console.log("Camera access denied or unavailable", err));
    }
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [activeCall, callStatus]);

  const endCall = () => {
    setActiveCall(null);
    setCallStatus('ringing');
    setCallDuration(0);
  };

  const handleSendMessage = (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!message.trim() || !selectedContact) return;

    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      senderId: user.id,
      receiverId: selectedContact.id,
      text: message,
      createdAt: new Date().toISOString()
    };

    setChatHistory(prev => [...prev, newMsg]);

    // If socket exists (production), emit it
    if (socketRef.current) {
      socketRef.current.emit('send_message', { senderId: user.id, receiverId: selectedContact.id, text: message });
    } else {
      // Demo Mode: Mock auto-reply
      setTypingState(selectedContact.id, true);
      setTimeout(() => {
        const replyMsg: ChatMessage = {
          id: `m-${Date.now() + 1}`,
          senderId: selectedContact.id,
          receiverId: user.id,
          text: "Noted. I'll review these materials and come back with follow-ups by EOD.",
          createdAt: new Date().toISOString()
        };
        setChatHistory(prev => [...prev, replyMsg]);
        setTypingState(selectedContact.id, false);
      }, 2500);
    }
    
    setMessage('');
  };

  const setTypingState = (contactId: string, typing: boolean) => {
    setIsTyping(prev => ({ ...prev, [contactId]: typing }));
  };

  const addEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojis(false);
  };

  const handleRequestIntro = (contactId: string) => {
    setContactsState(prev => prev.map(c => c.id === contactId ? { ...c, status: 'PENDING' } : c));
  };

  const filteredContacts = contactsState.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const filteredMessages = chatHistory.filter(m =>
    (m.senderId === user.id && m.receiverId === selectedContact?.id) ||
    (m.senderId === selectedContact?.id && m.receiverId === user.id)
  );

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex h-[75vh]">
      {/* Contact List */}
      <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex bg-slate-50/50 dark:bg-[#0b1120]/50">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-4">Messages</h2>
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
        {filteredContacts.map(c => {
          const lastMsg = chatHistory.filter(m =>
            (m.senderId === user.id && m.receiverId === c.id) ||
            (m.senderId === c.id && m.receiverId === user.id)
          ).slice(-1)[0];

          return (
            <button
              key={c.id}
              onClick={() => setSelectedContact(c)}
              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all text-left ${selectedContact?.id === c.id ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent'}`}
            >
              <div className="relative shrink-0">
                <img src={c.avatar} className={`w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700 ${c.status !== 'APPROVED' ? 'opacity-50 grayscale' : ''}`} alt={c.name} />
                {c.online && c.status === 'APPROVED' && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className={`font-bold text-sm truncate ${selectedContact?.id === c.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>{c.name}</h3>
                  {lastMsg && <span className="text-[10px] text-slate-400 font-medium">{formatTime(lastMsg.createdAt)}</span>}
                </div>
                <p className={`text-xs truncate font-medium ${c.status !== 'APPROVED' ? 'text-amber-600 dark:text-amber-500' : 'text-slate-500 dark:text-slate-400'}`}>
                  {c.status === 'LOCKED' ? '🔒 Connection Restricted' : c.status === 'PENDING' ? '⏳ Request Pending' : (lastMsg ? lastMsg.text : c.lastMsg)}
                </p>
              </div>
            </button>
          );
        })}
        {filteredContacts.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-sm font-medium">
            No connections found
          </div>
        )}
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#0f172a] relative">
        {selectedContact ? (
          <>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#0f172a]">
              <div className="flex items-center gap-4">
                <img src={selectedContact.avatar} className={`w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 ${selectedContact.status !== 'APPROVED' ? 'opacity-50 grayscale' : ''}`} alt={selectedContact.name} />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{selectedContact.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {selectedContact.status === 'APPROVED' ? (
                      <>
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-xs text-slate-500 font-medium">Connected</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                        <span className="text-xs text-slate-500 font-medium">Not Connected</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setActiveCall('audio')} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Voice Call"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg></button>
                <button onClick={() => setActiveCall('video')} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Video Call"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
              </div>
            </div>

            {/* Call Overlay */}
            {activeCall && (
              <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center text-white overflow-hidden rounded-r-2xl">
                {activeCall === 'video' && callStatus === 'connected' ? (
                  <>
                    {/* Remote Video (Simulated using their avatar as a placeholder if no real remote stream) */}
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                      <img src={selectedContact.avatar} alt="Remote" className="w-full h-full object-cover opacity-40 blur-sm" />
                      <div className="absolute flex flex-col items-center">
                        <img src={selectedContact.avatar} alt="Remote Profile" className="w-32 h-32 rounded-full border-4 border-slate-700 shadow-2xl mb-4" />
                        <h2 className="text-2xl font-bold">{selectedContact.name}</h2>
                        <p className="text-blue-400 font-medium mt-2">{formatDuration(callDuration)}</p>
                      </div>
                    </div>
                    {/* Local Webcam Feed */}
                    <div className="absolute bottom-6 right-6 w-48 h-64 bg-black rounded-xl overflow-hidden border-2 border-slate-600 shadow-2xl">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center z-10">
                    <div className="relative mb-8">
                      <img src={selectedContact.avatar} alt={selectedContact.name} className="w-32 h-32 rounded-full border-4 border-slate-700 z-10 relative shadow-2xl" />
                      {callStatus === 'ringing' && (
                        <>
                          <div className="absolute inset-0 rounded-full border-4 border-blue-500 animate-ping opacity-75"></div>
                          <div className="absolute -inset-4 rounded-full border-2 border-blue-400 animate-ping opacity-50" style={{ animationDelay: '0.5s' }}></div>
                        </>
                      )}
                    </div>
                    <h2 className="text-3xl font-bold mb-2">{selectedContact.name}</h2>
                    <p className="text-slate-400 mb-12">
                      {callStatus === 'ringing' ? 'Calling...' : formatDuration(callDuration)}
                    </p>
                  </div>
                )}

                {/* Call Controls */}
                <div className="absolute bottom-10 flex items-center gap-6 z-10 bg-slate-900/80 px-8 py-4 rounded-full backdrop-blur-md border border-slate-700">
                  <button className="w-14 h-14 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  </button>
                  {activeCall === 'video' && (
                    <button className="w-14 h-14 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                  )}
                  <button onClick={endCall} className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors shadow-lg shadow-red-600/30">
                    <svg className="w-6 h-6 transform rotate-[135deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  </button>
                </div>
              </div>
            )}

            <div ref={scrollRef} className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-50/50 dark:bg-[#0b1120]/50">
              {filteredMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <p className="text-sm font-medium">No messages yet. Send a message to start the conversation.</p>
                </div>
              )}
              {filteredMessages.map((m) => (
                <div key={m.id} className={`flex ${m.senderId === user.id ? 'justify-end' : 'justify-start'} message-bubble`}>
                  <div className={`relative ${m.senderId === user.id
                    ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl rounded-tl-sm'
                    } px-5 py-3 max-w-[75%] shadow-sm flex flex-col`}>
                    <p className="text-sm leading-relaxed">{m.text}</p>
                    <div className={`text-[10px] mt-1.5 font-medium text-right ${m.senderId === user.id ? 'text-blue-200' : 'text-slate-400'}`}>
                      {formatTime(m.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
              {selectedContact && isTyping[selectedContact.id] && (
                <div className="flex justify-start message-bubble">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              )}
            </div>

            {selectedContact.status === 'APPROVED' ? (
              <div className="p-4 bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800">
                <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojis(!showEmojis)}
                      className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      rows={1}
                    />
                    <button type="submit" disabled={!message.trim()} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="p-6 bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 flex justify-center">
                <button
                  onClick={() => handleRequestIntro(selectedContact.id)}
                  disabled={selectedContact.status === 'PENDING'}
                  className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${selectedContact.status === 'PENDING' ? 'bg-slate-100 text-slate-500 cursor-not-allowed dark:bg-slate-800' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  {selectedContact.status === 'PENDING' ? 'Connection Request Sent' : 'Connect to Message'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-20 text-center relative z-0">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <svg className="w-10 h-10 text-slate-300 dark:text-slate-600" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Your Messages</h2>
            <p className="text-sm text-slate-500 max-w-xs">Select a connection from the sidebar to view your conversation.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
