import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { inputCls, labelCls } from '../../components/common/index.jsx';

const channelOptions = [
  'card', 'sbp', 'qr', 'sim', 'cash', 'transgran',
  'alfa2alfa', 'tbank2tbank', 'sber2sber', 'vtb2vtb',
  'gasprom2gasprom', 'psb2psb', 'card_with_pdf', 'sbp_with_pdf',
];

export default function AdminPaymentsPage() {
  const [systems, setSystems] = useState([]);
  const [callbacks, setCallbacks] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [cryptoDeposits, setCryptoDeposits] = useState([]);
  const [tab, setTab] = useState('systems');
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveHash, setResolveHash] = useState('');
  const [modal, setModal] = useState(null);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [form, setForm] = useState({
    name: '', code: '', baseUrl: 'https://moneybunny.live/api/v1',
    apiKey: '', apiSign: '', channels: ['card', 'sbp'],
    priority: 0, isActive: true, minAmount: 100, maxAmount: 100000,
  });

  const load = () => {
    api.get('/admin/payment-systems').then(({ data }) => setSystems(data));
    api.get('/admin/payment-callbacks').then(({ data }) => setCallbacks(data));
    api.get('/admin/deposits').then(({ data }) => setDeposits(data));
    api.get('/admin/crypto-deposits').then(({ data }) => setCryptoDeposits(data));
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({
      name: '', code: '', baseUrl: 'https://moneybunny.live/api/v1',
      apiKey: '', apiSign: '', channels: ['card', 'sbp'],
      priority: 0, isActive: true, minAmount: 100, maxAmount: 100000,
    });
    setModal({ mode: 'create' });
  };

  const openEdit = (ps) => {
    setForm({
      name: ps.name, code: ps.code, baseUrl: ps.baseUrl,
      apiKey: ps.apiKey, apiSign: ps.apiSign,
      channels: ps.channels || ['card', 'sbp'],
      priority: ps.priority, isActive: ps.isActive,
      minAmount: ps.minAmount, maxAmount: ps.maxAmount,
    });
    setModal({ mode: 'edit', ps });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === 'create') {
        await api.post('/admin/payment-systems', form);
        toast.success('Платёжка создана');
      } else {
        await api.put(`/admin/payment-systems/${modal.ps.id}`, form);
        toast.success('Обновлено');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить?')) return;
    await api.delete(`/admin/payment-systems/${id}`);
    toast.success('Удалено');
    load();
  };

  const handleInlinePriority = async (psId, value) => {
    try {
      await api.put(`/admin/payment-systems/${psId}`, { priority: parseInt(value) || 0 });
      load();
    } catch {
      toast.error('Ошибка обновления приоритета');
    }
  };

  const handleChannelToggle = (ch) => {
    const has = form.channels.includes(ch);
    setForm({
      ...form,
      channels: has ? form.channels.filter(c => c !== ch) : [...form.channels, ch],
    });
  };

  const statusBadge = (s) => {
    const map = { paid: 'badge-success', pending: 'badge-warning', confirming: 'badge-info', cancelled: 'badge-danger', expired: 'badge-danger' };
    return map[s] || 'badge-primary';
  };

  const handleResolve = async (id) => {
    if (!resolveHash.trim()) return toast.error('Введите txHash');
    try {
      await api.post(`/admin/crypto-deposits/${id}/resolve`, { txHash: resolveHash.trim() });
      toast.success('Депозит зачислен');
      setResolvingId(null);
      setResolveHash('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Платёжки</h1>
        <button className="btn-primary flex items-center gap-1 px-4 py-2 rounded-lg text-sm" onClick={openCreate}>
          <span className="material-symbols-outlined text-[18px]">add</span>
          Добавить
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-outline/20">
        {[
          { key: 'systems', label: 'Платёжные системы' },
          { key: 'callbacks', label: `Колбэки (${callbacks.length})` },
          { key: 'deposits', label: `Депозиты (${deposits.length})` },
          { key: 'crypto', label: `Крипто (${cryptoDeposits.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Systems */}
      {tab === 'systems' && (
        <div className="glass-card-static overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline/10">
                  {['ID', 'Название', 'Код', 'Каналы', 'Приоритет', 'Статус', 'Действия'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-widest text-outline font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {systems.map(ps => (
                  <tr key={ps.id} className="border-b border-outline/5 hover:bg-surface-container/40 transition-colors">
                    <td className="px-5 py-3 text-on-surface-variant">{ps.id}</td>
                    <td className="px-5 py-3 text-on-surface font-medium">{ps.name}</td>
                    <td className="px-5 py-3"><span className="badge badge-primary font-mono">{ps.code}</span></td>
                    <td className="px-5 py-3 text-on-surface-variant text-xs max-w-[250px] truncate">{ps.channels?.join(', ')}</td>
                    <td className="px-5 py-3">
                      <input
                        type="number"
                        className="w-16 bg-surface-container border border-outline/30 rounded-lg px-2 py-1 text-sm text-on-surface text-center focus:outline-none focus:border-primary transition-colors"
                        defaultValue={ps.priority}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          if (val !== ps.priority) handleInlinePriority(ps.id, val);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <span className={`badge ${ps.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {ps.isActive ? 'Активна' : 'Откл'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button className="btn-ghost px-3 py-1 text-xs rounded-lg" onClick={() => openEdit(ps)}>Ред.</button>
                        <button className="text-xs px-3 py-1 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors" onClick={() => handleDelete(ps.id)}>Удалить</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {systems.length === 0 && (
            <p className="text-center text-on-surface-variant py-10">Нет платёжных систем. Добавьте первую.</p>
          )}
        </div>
      )}

      {/* Tab: Callbacks */}
      {tab === 'callbacks' && (
        <div className="glass-card-static overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline/10">
                  {['ID', 'Система', 'Reference', 'Сумма', 'Статус', 'Канал', 'Обработан', 'Дата'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-widest text-outline font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {callbacks
                  .filter(c => !selectedSystem || c.paymentSystemId === selectedSystem)
                  .map(c => (
                  <tr key={c.id} className="border-b border-outline/5 hover:bg-surface-container/40 transition-colors">
                    <td className="px-5 py-3 text-on-surface-variant">{c.id}</td>
                    <td className="px-5 py-3 text-on-surface">{c.paymentSystem?.name}</td>
                    <td className="px-5 py-3 text-on-surface font-mono text-xs">{c.reference}</td>
                    <td className="px-5 py-3 font-bold text-on-surface">{c.amount} {c.currency}</td>
                    <td className="px-5 py-3"><span className={`badge ${statusBadge(c.status)}`}>{c.status}</span></td>
                    <td className="px-5 py-3 text-on-surface-variant">{c.channel || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${c.processed ? 'badge-success' : 'badge-warning'}`}>
                        {c.processed ? 'Да' : 'Нет'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant">{new Date(c.createdAt).toLocaleString('ru')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {callbacks.length === 0 && (
            <p className="text-center text-on-surface-variant py-10">Нет колбэков</p>
          )}
        </div>
      )}

      {/* Tab: Deposits */}
      {tab === 'deposits' && (
        <div className="glass-card-static overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline/10">
                  {['ID', 'Пользователь', 'Система', 'Сумма', 'Канал', 'Статус', 'Дата'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-widest text-outline font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deposits.map(d => (
                  <tr key={d.id} className="border-b border-outline/5 hover:bg-surface-container/40 transition-colors">
                    <td className="px-5 py-3 text-on-surface-variant">{d.id}</td>
                    <td className="px-5 py-3 text-on-surface">{d.user?.username}</td>
                    <td className="px-5 py-3 text-on-surface-variant">{d.paymentSystem?.name}</td>
                    <td className="px-5 py-3 font-bold text-on-surface">{d.amount} ₽</td>
                    <td className="px-5 py-3 text-on-surface-variant">{d.channel}</td>
                    <td className="px-5 py-3"><span className={`badge ${statusBadge(d.status)}`}>{d.status}</span></td>
                    <td className="px-5 py-3 text-on-surface-variant">{new Date(d.createdAt).toLocaleString('ru')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Crypto Deposits */}
      {tab === 'crypto' && (
        <div className="glass-card-static overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline/10">
                  {['ID', 'Пользователь', 'Валюта', 'Сумма крипто', 'Сумма ₽', 'TxHash', 'Статус', 'Дата', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-widest text-outline font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cryptoDeposits.map(d => (
                  <tr key={d.id} className="border-b border-outline/5 hover:bg-surface-container/40 transition-colors">
                    <td className="px-5 py-3 text-on-surface-variant">{d.id}</td>
                    <td className="px-5 py-3 text-on-surface">{d.user?.username}</td>
                    <td className="px-5 py-3"><span className="badge badge-primary">{d.currency?.toUpperCase()}</span></td>
                    <td className="px-5 py-3 font-mono text-on-surface">{d.amountCrypto}</td>
                    <td className="px-5 py-3 font-bold text-on-surface">{d.amountRub} ₽</td>
                    <td className="px-5 py-3 font-mono text-xs text-on-surface-variant max-w-[200px] truncate">{d.txHash || '—'}</td>
                    <td className="px-5 py-3"><span className={`badge ${statusBadge(d.status)}`}>{d.status}</span></td>
                    <td className="px-5 py-3 text-on-surface-variant">{new Date(d.createdAt).toLocaleString('ru')}</td>
                    <td className="px-5 py-3">
                      {d.status !== 'paid' && d.status !== 'expired' && (
                        resolvingId === d.id ? (
                          <div className="flex gap-1 items-center">
                            <input
                              className={`${inputCls} !py-1 !text-xs w-48`}
                              placeholder="txHash..."
                              value={resolveHash}
                              onChange={e => setResolveHash(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleResolve(d.id); }}
                              autoFocus
                            />
                            <button className="btn-primary px-2 py-1 text-xs rounded-lg" onClick={() => handleResolve(d.id)}>OK</button>
                            <button className="btn-ghost px-2 py-1 text-xs rounded-lg" onClick={() => { setResolvingId(null); setResolveHash(''); }}>×</button>
                          </div>
                        ) : (
                          <button className="btn-ghost px-3 py-1 text-xs rounded-lg" onClick={() => { setResolvingId(d.id); setResolveHash(''); }}>
                            Ввести txHash
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cryptoDeposits.length === 0 && (
            <p className="text-center text-on-surface-variant py-10">Нет крипто-депозитов</p>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(null)}>
          <div className="glass-card-static rounded-2xl p-6 w-full max-w-lg mx-4 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-on-surface">
              {modal.mode === 'create' ? 'Новая платёжная система' : 'Редактирование'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Название</label>
                  <input className={inputCls} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="MoneyBunny" />
                </div>
                <div>
                  <label className={labelCls}>Код (уникальный)</label>
                  <input className={inputCls} value={form.code} onChange={e => setForm({...form, code: e.target.value})} required placeholder="mb" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Base URL</label>
                <input className={inputCls} value={form.baseUrl} onChange={e => setForm({...form, baseUrl: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>X-Api-Key</label>
                  <input className={inputCls} value={form.apiKey} onChange={e => setForm({...form, apiKey: e.target.value})} required placeholder="store_pKm3..." />
                </div>
                <div>
                  <label className={labelCls}>X-Api-Sign</label>
                  <input className={inputCls} type="password" value={form.apiSign} onChange={e => setForm({...form, apiSign: e.target.value})} required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Приоритет</label>
                  <input className={inputCls} type="number" value={form.priority} onChange={e => setForm({...form, priority: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className={labelCls}>Мин. сумма</label>
                  <input className={inputCls} type="number" value={form.minAmount} onChange={e => setForm({...form, minAmount: e.target.value})} />
                </div>
                <div>
                  <label className={labelCls}>Макс. сумма</label>
                  <input className={inputCls} type="number" value={form.maxAmount} onChange={e => setForm({...form, maxAmount: e.target.value})} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Каналы оплаты</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {channelOptions.map(ch => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => handleChannelToggle(ch)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        form.channels.includes(ch)
                          ? 'bg-primary-action text-white'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer select-none">
                <input type="checkbox" className="accent-primary" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} />
                Активна
              </label>
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
