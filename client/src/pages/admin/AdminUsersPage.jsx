import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { inputCls, labelCls, getInitials, avatarColor } from '../../components/common/index.jsx';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [balanceModal, setBalanceModal] = useState(null);
  const [balanceAmount, setBalanceAmount] = useState('');

  const load = () => {
    api.get(`/admin/users?page=${page}&search=${search}`).then(({ data }) => {
      setUsers(data.users);
      setPages(data.pages);
    });
  };

  useEffect(() => { load(); }, [page, search]);

  const handleUpdate = async (id, updates) => {
    try {
      await api.put(`/admin/users/${id}`, updates);
      toast.success('Обновлено');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка');
    }
  };

  const handleBalance = async () => {
    try {
      await api.post(`/admin/users/${balanceModal.id}/balance`, { amount: parseFloat(balanceAmount) });
      toast.success('Баланс пополнен');
      setBalanceModal(null);
      setBalanceAmount('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Пользователи</h1>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
        <input
          className="w-full bg-surface-container border border-outline/30 rounded-lg pl-9 pr-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors"
          placeholder="Поиск по логину..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Table */}
      <div className="glass-card-static overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline/10">
                {['ID', 'Пользователь', 'Роль', 'Баланс', 'Скидка', 'Статус', 'Действия'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs uppercase tracking-widest text-outline font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-outline/5 hover:bg-surface-container/40 transition-colors">
                  <td className="px-6 py-3 text-on-surface-variant">{u.id}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(u.username)}`}>
                        {getInitials(u.username)}
                      </div>
                      <span className="text-on-surface font-medium">{u.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdate(u.id, { role: e.target.value })}
                      className="bg-surface-container border border-outline/30 rounded-lg px-2 py-1 text-xs text-on-surface focus:outline-none focus:border-primary transition-colors"
                    >
                      <option value="client">client</option>
                      <option value="operator">operator</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-3 text-on-surface font-medium">{parseFloat(u.balance).toFixed(2)} ₽</td>
                  <td className="px-6 py-3 text-on-surface-variant">{u.personalDiscount}%</td>
                  <td className="px-6 py-3">
                    <span className={`badge ${u.isBanned ? 'badge-danger' : 'badge-success'}`}>
                      {u.isBanned ? 'Бан' : 'Активен'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <button className="btn-primary text-xs px-3 py-1 rounded-lg" onClick={() => setBalanceModal(u)}>Баланс</button>
                      <button
                        className="btn-ghost text-xs px-3 py-1 rounded-lg"
                        onClick={() => handleUpdate(u.id, { isBanned: !u.isBanned })}
                      >
                        {u.isBanned ? 'Разбан' : 'Бан'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex gap-1">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setPage(i + 1)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                page === i + 1
                  ? 'bg-primary-action text-white'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Balance modal */}
      {balanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setBalanceModal(null)}>
          <div className="glass-card-static rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-on-surface">Пополнить баланс</h2>
            <p className="text-sm text-on-surface-variant">
              Пользователь: <span className="text-on-surface font-medium">{balanceModal.username}</span>
            </p>
            <p className="text-sm text-on-surface-variant">
              Текущий баланс: <span className="text-on-surface font-medium">{parseFloat(balanceModal.balance).toFixed(2)} ₽</span>
            </p>
            <div>
              <label className={labelCls}>Сумма (может быть отрицательной)</label>
              <input
                className={inputCls}
                type="number"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button className="btn-ghost px-4 py-2 rounded-lg text-sm" onClick={() => setBalanceModal(null)}>Отмена</button>
              <button className="btn-primary px-4 py-2 rounded-lg text-sm" onClick={handleBalance}>Пополнить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
