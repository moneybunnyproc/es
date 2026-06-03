import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';

export default function ChatPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEnd = useRef(null);
  const socketRef = useRef(null);
  const fileInput = useRef(null);

  useEffect(() => {
    api.get('/chat/messages').then(({ data }) => {
      setMessages(data);
      setLoading(false);
    });

    const socket = io(window.location.origin, { withCredentials: true });
    socketRef.current = socket;

    socket.emit('joinChat', user.id);
    socket.on('newMessage', (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => socket.disconnect();
  }, [user.id]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const { data } = await api.post('/chat/messages', { message: text });
      setMessages((prev) => [...prev, data]);
      setText('');
    } catch (err) {
      console.error('Send error:', err);
    }
  };

  const sendImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const { data } = await api.post('/chat/messages/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessages((prev) => [...prev, data]);
    } catch (err) {
      console.error('Image send error:', err);
    }
    e.target.value = '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-on-surface-variant">
        <span className="material-symbols-outlined mr-2 animate-spin">progress_activity</span>
        Загрузка...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-xl font-semibold text-on-surface">Поддержка</h2>

      <div className="glass-card-static rounded-2xl flex flex-col h-[600px]">
        {/* Operator header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-outline-variant/30">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-on-secondary font-bold text-sm flex-shrink-0">
            ОП
          </div>
          <div>
            <p className="font-semibold text-on-surface text-sm">Оператор Техподдержки</p>
            <p className="text-xs text-secondary">В сети</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-on-surface-variant py-10 text-sm">
              Напишите сообщение, и оператор ответит вам
            </p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.isFromOperator ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[75%] px-4 py-3 space-y-1 ${
                  m.isFromOperator
                    ? 'bg-surface-container-high rounded-2xl rounded-bl-sm'
                    : 'bg-primary-container/80 rounded-2xl rounded-br-sm'
                }`}
              >
                {m.message && (
                  <p className="text-on-surface text-sm">{m.message}</p>
                )}
                {m.imageUrl && (
                  <img src={m.imageUrl} alt="" className="rounded-lg max-w-full" />
                )}
                <span className="text-xs opacity-70 text-on-surface-variant block text-right">
                  {new Date(m.createdAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEnd} />
        </div>

        {/* Input area */}
        <form
          onSubmit={sendMessage}
          className="flex items-center gap-2 px-4 py-3 border-t border-outline-variant/30"
        >
          <input type="file" ref={fileInput} accept="image/*" hidden onChange={sendImage} />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary transition-colors flex-shrink-0"
          >
            <span className="material-symbols-outlined text-xl">attach_file</span>
          </button>
          <input
            className="flex-1 bg-surface-container/50 border border-outline-variant/30 rounded-full px-4 py-2 text-on-surface text-sm focus:outline-none focus:border-primary-action placeholder-on-surface-variant"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Введите сообщение..."
          />
          <button
            type="submit"
            className="w-9 h-9 bg-primary-action hover:bg-primary-action-hover rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <span className="material-symbols-outlined text-white text-base">send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
