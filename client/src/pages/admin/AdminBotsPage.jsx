import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { inputCls, labelCls } from '../../components/common/index.jsx';

export default function AdminBotsPage() {
  const [bots, setBots] = useState([]);
  const [modal, setModal] = useState(null);
  const [showToken, setShowToken] = useState({});
  const [fullTokens, setFullTokens] = useState({});
  const [form, setForm] = useState({ name: '', token: '', welcomeMessage: '' });

  const load = () => api.get('/admin/bots').then(({ data }) => setBots(data));
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ name: '', token: '', welcomeMessage: '' });
    setModal({ mode: 'create' });
  };

  const openEdit = async (bot) => {
    // Fetch full token
    try {
      const { data } = await api.get(`/admin/bots/${bot.id}`);
      setForm({ name: data.name, token: data.token, welcomeMessage: data.welcomeMessage || '' });
      setModal({ mode: 'edit', bot: data });
    } catch {
      toast.error('Ошибка загрузки');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === 'create') {
        await api.post('/admin/bots', form);
        toast.success('Бот создан');
      } else {
        await api.put(`/admin/bots/${modal.bot.id}`, form);
        toast.success('Обновлено');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить бота?')) return;
    await api.delete(`/admin/bots/${id}`);
    toast.success('Удалено');
    load();
  };

  const handleStart = async (id) => {
    try {
      const { data } = await api.post(`/admin/bots/${id}/start`);
      toast.success(`Бот @${data.username || ''} запущен`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка запуска');
    }
  };

  const handleStop = async (id) => {
    try {
      await api.post(`/admin/bots/${id}/stop`);
      toast.success('Бот остановлен');
      load();
    } catch (err) {
      toast.error('Ошибка остановки');
    }
  };

  const toggleShowToken = async (botId) => {
    if (showToken[botId]) {
      setShowToken({ ...showToken, [botId]: false });
      return;
    }
    // Fetch full token
    if (!fullTokens[botId]) {
      try {
        const { data } = await api.get(`/admin/bots/${botId}`);
        setFullTokens({ ...fullTokens, [botId]: data.token });
      } catch { return; }
    }
    setShowToken({ ...showToken, [botId]: true });
  };

  const statusColor = (s) => {
    if (s === 'running') return 'badge-success';
    if (s === 'error') return 'badge-danger';
    return 'badge-warning';
  };
  const statusLabel = (s) => {
    if (s === 'running') return 'Работает';
    if (s === 'error') return 'Ошибка';
    return 'Остановлен';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Боты</h1>
        <button className="btn-primary flex items-center gap-1 px-4 py-2 rounded-lg text-sm" onClick={openCreate}>
          <span className="material-symbols-outlined text-[18px]">add</span>
          Добавить бота
        </button>
      </div>

      {bots.length === 0 && (
        <div className="glass-card-static p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-outline mb-3 block">smart_toy</span>
          <p className="text-on-surface-variant">Нет ботов. Создайте первого Telegram-бота.</p>
        </div>
      )}

      <div className="space-y-4">
        {bots.map((bot) => (
          <div key={bot.id} className="glass-card-static p-5 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bot.status === 'running' ? 'bg-secondary/20' : 'bg-surface-container-high'}`}>
                  <span className="material-symbols-outlined text-xl text-primary">smart_toy</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-on-surface">{bot.name}</span>
                    {bot.username && <span className="text-primary text-sm">@{bot.username}</span>}
                    <span className={`badge ${statusColor(bot.status)}`}>{statusLabel(bot.status)}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    ID: {bot.id} • Создан: {new Date(bot.createdAt).toLocaleDateString('ru')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {bot.status === 'running' ? (
                  <button className="text-xs px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors" onClick={() => handleStop(bot.id)}>
                    <span className="material-symbols-outlined text-[14px] align-middle mr-1">stop</span>
                    Стоп
                  </button>
                ) : (
                  <button className="btn-primary text-xs px-3 py-1.5 rounded-lg" onClick={() => handleStart(bot.id)}>
                    <span className="material-symbols-outlined text-[14px] align-middle mr-1">play_arrow</span>
                    Запустить
                  </button>
                )}
                <button className="btn-ghost text-xs px-3 py-1.5 rounded-lg" onClick={() => openEdit(bot)}>Ред.</button>
                <button className="text-xs px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors" onClick={() => handleDelete(bot.id)}>
                  Удалить
                </button>
              </div>
            </div>

            {/* Token */}
            <div className="flex items-center gap-2 bg-surface/50 rounded-lg px-3 py-2">
              <span className="text-xs text-on-surface-variant shrink-0">Токен:</span>
              <code className="text-xs text-on-surface font-mono flex-1 truncate">
                {showToken[bot.id] ? (fullTokens[bot.id] || bot.token) : bot.tokenMasked}
              </code>
              <button
                onClick={() => toggleShowToken(bot.id)}
                className="text-on-surface-variant hover:text-primary transition-colors shrink-0"
                title={showToken[bot.id] ? 'Скрыть' : 'Показать'}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showToken[bot.id] ? 'visibility_off' : 'visibility'}
                </span>
              </button>
              <button
                onClick={() => {
                  const token = fullTokens[bot.id] || bot.tokenMasked;
                  navigator.clipboard.writeText(token);
                  toast.success('Скопировано');
                }}
                className="text-on-surface-variant hover:text-primary transition-colors shrink-0"
                title="Копировать"
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
              </button>
            </div>

            {/* Error */}
            {bot.lastError && (
              <div className="bg-error/10 text-error text-xs rounded-lg px-3 py-2">
                {bot.lastError}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(null)}>
          <div className="glass-card-static rounded-2xl p-6 w-full max-w-md mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-on-surface">
              {modal.mode === 'create' ? 'Новый бот' : 'Редактирование'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className={labelCls}>Название</label>
                <input className={inputCls} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="ExShop Bot" />
              </div>
              <div>
                <label className={labelCls}>Токен (от @BotFather)</label>
                <input className={inputCls} value={form.token} onChange={e => setForm({...form, token: e.target.value})} required placeholder="123456:ABC-DEF..." />
              </div>
              <div>
                <label className={labelCls}>Приветственное сообщение (необязательно)</label>
                <textarea className={inputCls} value={form.welcomeMessage} onChange={e => setForm({...form, welcomeMessage: e.target.value})} rows={3} placeholder="Текст при /start..." />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" className="btn-ghost px-4 py-2 rounded-lg text-sm" onClick={() => setModal(null)}>Отмена</button>
                <button type="submit" className="btn-primary px-4 py-2 rounded-lg text-sm">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
