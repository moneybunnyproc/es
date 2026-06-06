import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { inputCls, labelCls, LoadingSpinner, orderStatusMap, transactionTypeMap, InfoRow } from '../../components/common/index.jsx';

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('orders');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceDesc, setBalanceDesc] = useState('');
  const [note, setNote] = useState('');

  const load = () => {
    api.get(`/admin/users/${id}`).then(({ data }) => {
      setData(data);
      setNote(data.user.adminNote || '');
    }).catch(() => toast.error('Ошибка загрузки'));
  };

  useEffect(() => { load(); }, [id]);

  const handleBalance = async () => {
    if (!balanceAmount) return;
    try {
      await api.post(`/admin/users/${id}/balance`, { amount: parseFloat(balanceAmount), description: balanceDesc || undefined });
      toast.success('Баланс обновлён');
      setBalanceAmount('');
      setBalanceDesc('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка');
    }
  };

  const handleUpdate = async (updates) => {
    try {
      await api.put(`/admin/users/${id}`, updates);
      toast.success('Обновлено');
      load();
    } catch {
      toast.error('Ошибка');
    }
  };

  if (!data) return <LoadingSpinner />;

  const { user, orders, transactions, reviews, totalSpent } = data;
  const tabs = [
    { key: 'orders', label: 'Заказы', count: orders.length },
    { key: 'transactions', label: 'Транзакции', count: transactions.length },
    { key: 'reviews', label: 'Отзывы', count: reviews.length },
  ];

  return (
    <div className="space-y-5">
      <Link to="/admin/users" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Назад к пользователям
      </Link>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-5">
        {/* Left: User card */}
        <div className="space-y-5">
          <div className="glass-card-static p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center text-lg font-bold">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-on-surface">{user.username}</h2>
                <span className={`badge ${user.isBanned ? 'badge-danger' : 'badge-success'} text-xs`}>
                  {user.isBanned ? 'Заблокирован' : 'Активен'}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <InfoRow label="ID" value={user.id} />
              {user.email && <InfoRow label="Email" value={user.email} />}
              <InfoRow label="Роль" value={user.role} />
              <InfoRow label="Баланс" value={`${parseFloat(user.balance).toFixed(2)} ₽`} highlight />
              <InfoRow label="Скидка" value={`${user.personalDiscount}%`} />
              <InfoRow label="Потрачено" value={`${parseFloat(totalSpent).toFixed(2)} ₽`} />
              <InfoRow label="Заказов" value={orders.length} />
              <InfoRow label="Отзывов" value={reviews.length} />
              <InfoRow label="Регистрация" value={new Date(user.createdAt).toLocaleDateString('ru')} />
              {user.telegramUsername && <InfoRow label="Telegram" value={`@${user.telegramUsername}`} />}
              {user.walletBtc && <InfoRow label="BTC" value={user.walletBtc} />}
              {user.walletUsdt && <InfoRow label="USDT" value={user.walletUsdt} />}
            </div>

            {/* Wallets */}
            <div className="border-t border-outline/20 pt-3 space-y-2">
              <h4 className="text-xs font-medium text-on-surface-variant">Крипто-кошельки</h4>
              <div>
                <label className={labelCls}>BTC</label>
                <input className={`${inputCls} text-xs font-mono`} defaultValue={user.walletBtc || ''}
                  onBlur={(e) => { if (e.target.value !== (user.walletBtc || '')) handleUpdate({ walletBtc: e.target.value }); }}
                  placeholder="bc1q..." />
              </div>
              <div>
                <label className={labelCls}>USDT (TRC-20)</label>
                <input className={`${inputCls} text-xs font-mono`} defaultValue={user.walletUsdt || ''}
                  onBlur={(e) => { if (e.target.value !== (user.walletUsdt || '')) handleUpdate({ walletUsdt: e.target.value }); }}
                  placeholder="T..." />
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-outline/20 pt-3 space-y-2">
              <div className="flex gap-2">
                <select className={`${inputCls} text-xs`} value={user.role} onChange={(e) => handleUpdate({ role: e.target.value })}>
                  <option value="client">client</option>
                  <option value="operator">operator</option>
                  <option value="admin">admin</option>
                </select>
                <button className="btn-ghost text-xs px-3 py-1.5 rounded-lg whitespace-nowrap"
                  onClick={() => handleUpdate({ isBanned: !user.isBanned })}>
                  {user.isBanned ? 'Разбанить' : 'Забанить'}
                </button>
              </div>
            </div>
          </div>

          {/* Balance */}
          <div className="glass-card-static p-6 space-y-3">
            <h3 className="text-sm font-semibold text-on-surface">Пополнить баланс</h3>
            <div>
              <label className={labelCls}>Сумма</label>
              <input className={inputCls} type="number" step="0.01" value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)} placeholder="100 или -50" />
            </div>
            <div>
              <label className={labelCls}>Комментарий</label>
              <input className={inputCls} value={balanceDesc} onChange={(e) => setBalanceDesc(e.target.value)} placeholder="Необязательно" />
            </div>
            <button className="btn-primary px-4 py-2 rounded-lg text-sm w-full" onClick={handleBalance}>Пополнить</button>
          </div>

          {/* Admin note */}
          <div className="glass-card-static p-6 space-y-3">
            <h3 className="text-sm font-semibold text-on-surface">Комментарий</h3>
            <p className="text-xs text-on-surface-variant">Видно только администратору</p>
            <textarea className={inputCls} rows={4} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Заметка о клиенте..." />
            <button className="btn-primary px-4 py-2 rounded-lg text-sm w-full"
              onClick={() => handleUpdate({ adminNote: note })}>Сохранить</button>
          </div>
        </div>

        {/* Right: Tabs content */}
        <div className="glass-card-static p-6 space-y-4">
          {/* Tabs */}
          <div className="flex gap-0 border-b border-outline/20">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.key ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}>
                {t.label} <span className="text-xs opacity-60">({t.count})</span>
              </button>
            ))}
          </div>

          {/* Orders */}
          {tab === 'orders' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline/20 text-left text-on-surface-variant">
                    <th className="pb-3 font-medium">ID</th>
                    <th className="pb-3 font-medium">Товар</th>
                    <th className="pb-3 font-medium text-center">Кол-во</th>
                    <th className="pb-3 font-medium text-right">Сумма</th>
                    <th className="pb-3 font-medium text-center">Статус</th>
                    <th className="pb-3 font-medium">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="border-b border-outline/10 hover:bg-surface-container/40 transition-colors">
                      <td className="py-2.5 text-on-surface">#{o.id}</td>
                      <td className="py-2.5 text-on-surface">{o.product?.name || '—'}</td>
                      <td className="py-2.5 text-center text-on-surface-variant">{o.quantity}</td>
                      <td className="py-2.5 text-right text-primary-action font-medium">{o.totalPrice} ₽</td>
                      <td className="py-2.5 text-center">
                        <span className={`badge ${orderStatusMap[o.status]?.badge ?? 'badge-primary'}`}>
                          {orderStatusMap[o.status]?.label ?? o.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-on-surface-variant whitespace-nowrap">{new Date(o.createdAt).toLocaleString('ru')}</td>
                    </tr>
                  ))}
                  {orders.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-on-surface-variant">Нет заказов</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Transactions */}
          {tab === 'transactions' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline/20 text-left text-on-surface-variant">
                    <th className="pb-3 font-medium">ID</th>
                    <th className="pb-3 font-medium">Дата</th>
                    <th className="pb-3 font-medium text-right">Сумма</th>
                    <th className="pb-3 font-medium text-center">Тип</th>
                    <th className="pb-3 font-medium">Комментарий</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => {
                    const amt = parseFloat(t.amount);
                    const tm = transactionTypeMap[t.type] || { label: t.type, badge: 'badge-primary' };
                    return (
                      <tr key={t.id} className="border-b border-outline/10 hover:bg-surface-container/40 transition-colors">
                        <td className="py-2.5 text-on-surface-variant">{t.id}</td>
                        <td className="py-2.5 text-on-surface-variant whitespace-nowrap">{new Date(t.createdAt).toLocaleString('ru')}</td>
                        <td className={`py-2.5 text-right font-medium ${amt >= 0 ? 'text-secondary' : 'text-error'}`}>
                          {amt >= 0 ? '+' : ''}{amt} ₽
                        </td>
                        <td className="py-2.5 text-center"><span className={`badge ${tm.badge}`}>{tm.label}</span></td>
                        <td className="py-2.5 text-on-surface-variant text-xs truncate max-w-[250px]">{t.description || '—'}</td>
                      </tr>
                    );
                  })}
                  {transactions.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-on-surface-variant">Нет транзакций</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Reviews */}
          {tab === 'reviews' && (
            <div className="space-y-3">
              {reviews.map(r => (
                <div key={r.id} className="p-4 rounded-lg bg-surface-container/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-on-surface">{r.product?.name || '—'}</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <span key={s} className={`material-symbols-outlined text-sm ${s <= r.rating ? 'star-filled' : 'star-empty'}`}>star</span>
                      ))}
                    </div>
                  </div>
                  {r.text && <p className="text-sm text-on-surface-variant">{r.text}</p>}
                  <div className="flex items-center justify-between text-xs text-outline">
                    <span>{new Date(r.createdAt).toLocaleString('ru')}</span>
                    <span className={`badge ${r.isVisible ? 'badge-success' : 'badge-danger'}`}>
                      {r.isVisible ? 'Виден' : 'Скрыт'}
                    </span>
                  </div>
                </div>
              ))}
              {reviews.length === 0 && <p className="py-8 text-center text-on-surface-variant text-sm">Нет отзывов</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
