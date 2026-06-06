import { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../../api/axios';
import { getInitials, orderStatusMap, InfoRow } from '../../components/common/index.jsx';

export default function AdminChatsPage() {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [activeName, setActiveName] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const messagesEnd = useRef(null);
  const socketRef = useRef(null);
  const activeChatRef = useRef(null);

  activeChatRef.current = activeChat;

  const loadChats = useCallback(() => {
    api.get('/admin/chats').then(({ data }) => setChats(data));
  }, []);

  useEffect(() => {
    loadChats();
    const socket = io(window.location.origin, { withCredentials: true });
    socketRef.current = socket;
    socket.emit('joinOperators');

    socket.on('newClientMessage', (msg) => {
      loadChats();
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
    setUserInfo(null);
    const [messagesRes, infoRes] = await Promise.all([
      api.get(`/admin/chats/${userId}`),
      api.get(`/admin/chats/${userId}/info`),
    ]);
    setMessages(messagesRes.data);
    setUserInfo(infoRes.data);
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

      <div className={`grid gap-4 ${activeChat ? 'grid-cols-[260px_1fr_280px]' : 'grid-cols-[260px_1fr]'}`} style={{ height: 'calc(100vh - 140px)' }}>
        {/* === Left: Chat list === */}
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
                activeChat === c.userId ? 'bg-primary/10' : 'hover:bg-surface-container/60'
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

        {/* === Center: Messages === */}
        <div className="glass-card-static rounded-2xl flex flex-col overflow-hidden">
          {activeChat ? (
            <>
              <div className="flex items-center gap-3 px-5 py-3 border-b border-outline/10 shrink-0">
                <div className="w-9 h-9 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-xs font-bold">
                  {getInitials(activeName)}
                </div>
                <span className="font-semibold text-on-surface">{activeName}</span>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.isFromOperator ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                      m.isFromOperator
                        ? 'bg-primary-action text-white rounded-br-sm'
                        : 'bg-surface-container-high text-on-surface rounded-bl-sm'
                    }`}>
                      {m.message && <p className="leading-relaxed">{m.message}</p>}
                      {m.imageUrl && <img src={m.imageUrl} alt="" className="max-w-full max-h-48 rounded-lg mt-1" />}
                      <span className="block text-[10px] opacity-60 mt-1 text-right">
                        {new Date(m.createdAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEnd} />
              </div>

              <form onSubmit={sendReply} className="flex items-center gap-2 px-4 py-3 border-t border-outline/10 shrink-0">
                <input
                  className="flex-1 bg-surface-container border border-outline/30 rounded-xl px-4 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Ответить..."
                />
                <button type="submit" className="btn-primary w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
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

        {/* === Right: Client info === */}
        {activeChat && (
          <div className="glass-card-static rounded-2xl overflow-y-auto flex flex-col">
            {userInfo ? (
              <div className="p-4 space-y-4">
                {/* User info */}
                <div className="space-y-2 text-xs">
                  <h3 className="text-sm font-semibold text-on-surface">Информация о клиенте</h3>
                  <InfoRow label="Имя" value={userInfo.user.username} />
                  {userInfo.user.email && <InfoRow label="Email" value={userInfo.user.email} />}
                  <InfoRow label="Баланс" value={`${userInfo.user.balance} ₽`} highlight />
                  <InfoRow label="Скидка" value={`${userInfo.user.personalDiscount}%`} />
                  <InfoRow label="Заказов" value={userInfo.totalOrders} />
                  <InfoRow label="Потрачено" value={`${userInfo.totalSpent} ₽`} />
                  <InfoRow label="Регистрация" value={new Date(userInfo.user.createdAt).toLocaleDateString('ru')} />
                  {userInfo.user.isBanned && (
                    <div className="badge badge-danger text-xs">Заблокирован</div>
                  )}
                </div>

                {/* Orders */}
                {userInfo.orders.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-on-surface">Последние заказы</h3>
                    <div className="space-y-1.5">
                      {userInfo.orders.map(order => (
                        <div key={order.id} className="p-2.5 rounded-lg bg-surface-container/50 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-on-surface">#{order.id}</span>
                            <span className={`badge text-[10px] ${orderStatusMap[order.status]?.badge ?? 'badge-primary'}`}>
                              {orderStatusMap[order.status]?.label ?? order.status}
                            </span>
                          </div>
                          <div className="text-xs text-on-surface-variant">{order.product?.name || '—'}</div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-on-surface-variant">{order.quantity} шт</span>
                            <span className="text-primary-action font-medium">{order.totalPrice} ₽</span>
                          </div>
                          <div className="text-[10px] text-outline">
                            {new Date(order.createdAt).toLocaleString('ru')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-on-surface-variant">progress_activity</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
