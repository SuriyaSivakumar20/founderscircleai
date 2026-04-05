
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
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [contactsState, setContactsState] = useState([
    { id: 'c1', name: 'Alice from Helix Capital', avatar: 'https://picsum.photos/seed/alice/100', lastMsg: "We loved your pitch!", online: true, status: 'APPROVED' },
    { id: 'c2', name: 'Bob from GreenWave', avatar: 'https://picsum.photos/seed/bob/100', lastMsg: "System: Secure link established.", online: false, status: 'LOCKED' },
    { id: 'c3', name: 'Elena • Peak Ventures', avatar: 'https://picsum.photos/seed/elena/100', lastMsg: "System: Deal room interest.", online: true, status: 'LOCKED' }
  ]);

  const EMOJIS = ['🚀', '📈', '💰', '🔥', '🤝', '💎', '🎉', '💡', '✅', '✨'];

  useEffect(() => {
    // For Vercel demo mode: Use static chat layout since WebSockets are unsupported
    const defaultHistory: ChatMessage[] = [
      { id: 'm1', senderId: 'c1', receiverId: user.id, text: "We loved your pitch yesterday!", createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 'm2', senderId: user.id, receiverId: 'c1', text: "Thank you! Let me know when you'd like to dive into the diligence room.", createdAt: new Date(Date.now() - 1800000).toISOString() },
    ];
    setChatHistory(defaultHistory);
  }, [user.id]);

  useEffect(() => {
    if (selectedContact) {
      (anime as any)({
        targets: '.message-bubble',
        opacity: [0, 1],
        translateX: [-10, 0],
        delay: (anime as any).stagger(100),
        duration: 500,
        easing: 'easeOutQuad'
      });
    }

    // Scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedContact, chatHistory]);

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
          text: "Noted. I'll review these materials and come back with strategic follow-ups by EOD.",
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

  return (
    <div className="bg-white dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 shadow-2xl overflow-hidden flex h-[75vh]">
      {/* Contact List */}
      <div className="w-1/3 border-r border-zinc-100 dark:border-zinc-800 flex flex-col hidden md:flex">
        <div className="p-10 border-b border-zinc-100 dark:border-zinc-800">
          <span className="text-[10px] uppercase tracking-[0.3em] text-accent font-bold mb-2 block">Secure Network</span>
          <h2 className="text-3xl font-serif italic text-ink dark:text-paper mb-6">Connections</h2>
          <input 
            type="text" 
            placeholder="Search network..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 px-4 py-3 text-sm font-sans outline-none focus:border-accent text-ink dark:text-paper placeholder-zinc-400 transition-colors"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
        {filteredContacts.map(c => {
          const lastMsg = chatHistory.filter(m =>
            (m.senderId === user.id && m.receiverId === c.id) ||
            (m.senderId === c.id && m.receiverId === user.id)
          ).slice(-1)[0];

          return (
            <button
              key={c.id}
              onClick={() => setSelectedContact(c)}
              className={`w-full p-8 flex items-center gap-6 border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-all text-left group relative ${selectedContact?.id === c.id ? 'bg-zinc-50 dark:bg-zinc-800/30' : ''}`}
            >
              {selectedContact?.id === c.id && (
                <div className="absolute left-0 top-0 w-1 h-full bg-accent"></div>
              )}
              <div className="relative">
                <img src={c.avatar} className={`w-14 h-14 rounded-none object-cover transition-all duration-500 ${c.status !== 'APPROVED' ? 'blur-[2px] opacity-50 grayscale' : 'grayscale group-hover:grayscale-0'}`} alt={c.name} />
                {c.status === 'LOCKED' && <div className="absolute inset-0 flex items-center justify-center text-ink dark:text-paper"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17a2 2 0 100-4 2 2 0 000 4zm6-9V6a6 6 0 10-12 0v2h-1v14h14V8h-1zm-6-5a4 4 0 014 4v2H8V6a4 4 0 014-4z" /></svg></div>}
                {c.online && c.status === 'APPROVED' && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-accent border-2 border-white dark:border-zinc-900"></div>}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-serif text-lg transition-colors truncate ${selectedContact?.id === c.id ? 'text-accent italic' : 'text-zinc-900 dark:text-zinc-100'}`}>{c.name}</h3>
                <p className={`text-[10px] uppercase tracking-widest truncate mt-1 ${c.status !== 'APPROVED' ? 'text-amber-600 dark:text-amber-500 font-bold' : 'text-zinc-400'}`}>
                  {c.status === 'LOCKED' ? 'Restricted Access' : c.status === 'PENDING' ? 'Pending Intro...' : (lastMsg ? lastMsg.text : c.lastMsg)}
                </p>
              </div>
            </button>
          );
        })}
        {filteredContacts.length === 0 && (
          <div className="p-8 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest">
            No connections found
          </div>
        )}
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 flex flex-col bg-zinc-50/10 dark:bg-zinc-950/10">
        {selectedContact ? (
          <>
            <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
              <div className="flex items-center gap-6">
                <img src={selectedContact.avatar} className={`w-12 h-12 rounded-none object-cover transition-all ${selectedContact.status !== 'APPROVED' ? 'blur-sm grayscale' : 'grayscale'}`} alt={selectedContact.name} />
                <div>
                  <h3 className="font-serif text-xl italic text-ink dark:text-paper">{selectedContact.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedContact.status === 'APPROVED' ? (
                      <>
                        <div className="w-1.5 h-1.5 bg-accent animate-pulse"></div>
                        <span className="text-[9px] text-accent font-bold uppercase tracking-widest">Encrypted Institutional Link</span>
                      </>
                    ) : (
                      <>
                        <div className="w-1.5 h-1.5 bg-zinc-500"></div>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Connection Strictly Gated</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button className="text-zinc-400 hover:text-accent transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg></button>
                <button className="text-zinc-400 hover:text-accent transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 p-10 space-y-10 overflow-y-auto">
              {filteredMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-zinc-400 opacity-50">
                  <p className="text-[10px] uppercase tracking-widest font-bold">No historical data available</p>
                </div>
              )}
              {filteredMessages.map((m) => (
                <div key={m.id} className={`flex ${m.senderId === user.id ? 'justify-end' : 'justify-start'} message-bubble`}>
                  <div className={`relative ${m.senderId === user.id
                    ? 'bg-accent text-white'
                    : 'bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-ink dark:text-paper'
                    } px-8 py-5 rounded-none max-w-[80%] shadow-sm flex flex-col`}>
                    <p className="font-serif italic text-lg leading-relaxed">{m.text}</p>
                    <div className={`flex justify-between items-center mt-2 ${m.senderId === user.id ? 'text-white/70' : 'text-zinc-400'} text-[9px] uppercase tracking-widest font-bold`}>
                      <span>{m.senderId === user.id ? 'Outgoing' : 'Incoming'}</span>
                      <span>{formatTime(m.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {selectedContact && isTyping[selectedContact.id] && (
                <div className="flex justify-start message-bubble">
                  <div className="bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-zinc-400 px-6 py-4 font-serif italic text-sm shadow-sm flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                      <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <span className="text-[10px] uppercase font-sans tracking-[0.2em] not-italic font-bold text-accent">{selectedContact.name} is formulating...</span>
                  </div>
                </div>
              )}
            </div>

            {selectedContact.status === 'APPROVED' ? (
              <div className="p-8 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
                <form onSubmit={handleSendMessage} className="relative flex items-center gap-6">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojis(!showEmojis)}
                      className="text-zinc-400 hover:text-accent transition-all"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>

                    {showEmojis && (
                      <div className="absolute bottom-16 left-0 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 p-6 rounded-none shadow-2xl flex gap-4 z-50">
                        {EMOJIS.map(e => (
                          <button key={e} type="button" onClick={() => addEmoji(e)} className="text-2xl hover:scale-125 transition-transform grayscale hover:grayscale-0">{e}</button>
                        ))}
                      </div>
                    )}
                  </div>

                  <input
                    className="flex-1 bg-transparent border-none outline-none dark:text-zinc-100 font-serif italic text-xl placeholder-zinc-300"
                    placeholder="Draft a strategic communication..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <button type="submit" className="text-accent hover:opacity-70 transition-all uppercase tracking-widest text-[10px] font-bold flex items-center gap-2">
                    Transmit
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-8 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-100 dark:border-zinc-800 flex justify-center">
                <button
                  onClick={() => handleRequestIntro(selectedContact.id)}
                  disabled={selectedContact.status === 'PENDING'}
                  className={`px-8 py-3 border transition-all uppercase tracking-widest text-[10px] font-bold shadow-lg ${selectedContact.status === 'PENDING' ? 'border-accent bg-accent/10 text-accent cursor-not-allowed opacity-80' : 'border-zinc-400 dark:border-zinc-700 bg-zinc-800 text-white hover:bg-accent hover:border-accent'}`}
                >
                  {selectedContact.status === 'PENDING' ? 'Intro Request Transmitted (Awaiting Counterparty)' : 'Request Strategic Introduction'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-20 text-center">
            <div className="w-24 h-24 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center mb-10 opacity-20">
              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
            </div>
            <h2 className="text-3xl font-serif italic text-ink dark:text-paper mb-4">Secure Terminal</h2>
            <p className="text-sm uppercase tracking-widest text-zinc-400 max-w-xs font-bold">Select a verified connection to initialize encrypted data exchange.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
