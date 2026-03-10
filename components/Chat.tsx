
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
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const contacts = [
    { id: 'c1', name: 'Alice from Helix Capital', avatar: 'https://picsum.photos/seed/alice/100', lastMsg: "We loved your pitch!", online: true },
    { id: 'c2', name: 'Bob from GreenWave', avatar: 'https://picsum.photos/seed/bob/100', lastMsg: "When are you free for a call?", online: false }
  ];

  const EMOJIS = ['🚀', '📈', '💰', '🔥', '🤝', '💎', '🎉', '💡', '✅', '✨'];

  useEffect(() => {
    // Connect to socket
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to chat server');
      socket.emit('register', user.id);
    });

    socket.on('message_history', (history: ChatMessage[]) => {
      setChatHistory(history);
    });

    socket.on('receive_message', (msg: ChatMessage) => {
      setChatHistory(prev => {
        // Avoid duplicates if sender and receiver are same (for testing) or if message already exists
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user.id]);

  useEffect(() => {
    if (selectedContact) {
      // Fixed: Cast anime to any to resolve "not callable" type error
      (anime as any)({
        targets: '.message-bubble',
        opacity: [0, 1],
        translateX: [-10, 0],
        delay: anime.stagger(100),
        duration: 500,
        easing: 'easeOutQuad'
      });
    }
    
    // Scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedContact, chatHistory]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim() || !selectedContact || !socketRef.current) return;

    const messageData = {
      senderId: user.id,
      receiverId: selectedContact.id,
      text: message
    };

    socketRef.current.emit('send_message', messageData);
    setMessage('');
  };

  const addEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojis(false);
  };

  const filteredMessages = chatHistory.filter(m => 
    (m.senderId === user.id && m.receiverId === selectedContact?.id) ||
    (m.senderId === selectedContact?.id && m.receiverId === user.id)
  );

  return (
    <div className="bg-white dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 shadow-2xl overflow-hidden flex h-[75vh]">
      {/* Contact List */}
      <div className="w-1/3 border-r border-zinc-100 dark:border-zinc-800 overflow-y-auto hidden md:block">
        <div className="p-10 border-b border-zinc-100 dark:border-zinc-800">
          <span className="text-[10px] uppercase tracking-[0.3em] text-accent font-bold mb-2 block">Secure Network</span>
          <h2 className="text-3xl font-serif italic text-ink dark:text-paper">Connections</h2>
        </div>
        {contacts.map(c => {
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
                <img src={c.avatar} className="w-14 h-14 rounded-none object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt={c.name} />
                {c.online && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-accent border-2 border-white dark:border-zinc-900"></div>}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-serif text-lg transition-colors truncate ${selectedContact?.id === c.id ? 'text-accent italic' : 'text-zinc-900 dark:text-zinc-100'}`}>{c.name}</h3>
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 truncate mt-1">{lastMsg ? lastMsg.text : c.lastMsg}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Message Area */}
      <div className="flex-1 flex flex-col bg-zinc-50/10 dark:bg-zinc-950/10">
        {selectedContact ? (
          <>
            <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
              <div className="flex items-center gap-6">
                <img src={selectedContact.avatar} className="w-12 h-12 rounded-none object-cover grayscale" alt={selectedContact.name} />
                <div>
                  <h3 className="font-serif text-xl italic text-ink dark:text-paper">{selectedContact.name}</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-accent animate-pulse"></div>
                    <span className="text-[9px] text-accent font-bold uppercase tracking-widest">Encrypted Institutional Link</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                 <button className="text-zinc-400 hover:text-accent transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg></button>
                 <button className="text-zinc-400 hover:text-accent transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></button>
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
                  <div className={`relative ${
                    m.senderId === user.id 
                      ? 'bg-accent text-white' 
                      : 'bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-ink dark:text-paper'
                  } px-8 py-5 rounded-none max-w-[80%] font-serif italic text-lg shadow-sm`}>
                    {m.text}
                    <span className={`absolute bottom-full mb-1 text-[8px] uppercase tracking-widest font-bold ${m.senderId === user.id ? 'right-0 text-accent' : 'left-0 text-zinc-400'}`}>
                      {m.senderId === user.id ? 'Outgoing' : 'Incoming'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-8 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
              <form onSubmit={handleSendMessage} className="relative flex items-center gap-6">
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setShowEmojis(!showEmojis)}
                    className="text-zinc-400 hover:text-accent transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-20 text-center">
            <div className="w-24 h-24 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center mb-10 opacity-20">
              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
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
