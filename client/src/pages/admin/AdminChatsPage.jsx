import { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../../api/axios';
import { getInitials } from '../../components/common/index.jsx';

export default function AdminChatsPage() {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [activeName, setActiveName] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const messagesEnd = useRef(null);
  const socketRef = useRef(null);
  const activeChatRef = useRef(null);

  // Keep ref in sync with state
  activeChatRef.current = activeChat;

  const loadChats = useCallback(() => {
    api.get('/admin/chats').then(({ data }) => setChats(data));
  }, []);

  useEffect(() => {
    loadChats();
    const socket = io(window.location.origin, { withCredentials: true });
    socketRef.current = socket;
    socket.emit('joinOperators');

    // When a client sends a message
    socket.on('newClientMessage', (msg) => {
      // Refresh chat list (sidebar)
      loadChats();
      // If this chat is currently open, add message to it
      if (activeChatRef.current && msg.userId === activeChatRef.current) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });

    return () => socket.disconnect();
  }, [loadChats]);

  const openChat = async (userId, username) => {
    setActiveChat(userId);
    setActiveName(username);
    const { data } = await api.get(`/admin/chats/${userId}`);
    setMessages(data);
    loadChats();
  };

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendReply = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeChat) return;
    try {
      const { data } = await api.post(`/admin/chats/${activeChat}/reply`, { message: text });
      setMessages(prev => [...prev, data]);
      setText('');
    } catch {}
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-on-surface">Чат поддержки</h1>

      <div className="grid grid-cols-[280px_1fr] gap-4" style={{ height: 'calc(100vh - 140px)' }}>
        {/* Chat list */}
        <div className="glass-card-static overflow-y-auto rounded-2xl flex flex-col">
          <div className="px-4 py-3 border-b border-outline/10">
            <span className="text-xs uppercase tracking-widest text-outline font-medium">Диалоги</span>
          </div>
          {chats.length === 0 && (
            <p className="text-sm text-on-surface-variant text-center py-10">Нет чатов</p>
          )}
          {chats.map((c) => (
            <button
              key={c.userId}
              onClick={() => openChat(c.userId, c.username)}
              className={`w-full text-left px-4 py-3 border-b border-outline/5 last:border-0 transition-colors ${
                activeChat === c.userId
                  ? 'bg-primary/10'
                  : 'hover:bg-surface-container/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-xs font-bold shrink-0">
                  {getInitials(c.username)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-on-surface">{c.username}</span>
                    {c.unreadCount > 0 && (
                      <span className="badge badge-danger text-xs">{c.unreadCount}</span>
                    )}
                  </div>
                  {c.lastMessage && (
                    <p className="text-xs text-on-surface-variant truncate mt-0.5">
                      {c.lastMessage.message || 'Изображение'}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Messages panel */}
        <div className="glass-card-static rounded-2xl flex flex-col overflow-hidden">
          {activeChat ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-outline/10 shrink-0">
                <div className="w-9 h-9 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-xs font-bold">
                  {getInitials(activeName)}
                </div>
                <span className="font-semibold text-on-surface">{activeName}</span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.isFromOperator ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                        m.isFromOperator
                          ? 'bg-primary-action text-white rounded-br-sm'
                          : 'bg-surface-container-high text-on-surface rounded-bl-sm'
                      }`}
                    >
                      {m.message && <p className="leading-relaxed">{m.message}</p>}
                      {m.imageUrl && (
                        <img src={m.imageUrl} alt="" className="max-w-full max-h-48 rounded-lg mt-1" />
                      )}
                      <span className="block text-[10px] opacity-60 mt-1 text-right">
                        {new Date(m.createdAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEnd} />
              </div>

              {/* Input */}
              <form onSubmit={sendReply} className="flex items-center gap-2 px-4 py-3 border-t border-outline/10 shrink-0">
                <input
                  className="flex-1 bg-surface-container border border-outline/30 rounded-xl px-4 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Ответить..."
                />
                <button
                  type="submit"
                  className="btn-primary w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl opacity-30">chat</span>
              <p className="text-sm">Выберите диалог</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
