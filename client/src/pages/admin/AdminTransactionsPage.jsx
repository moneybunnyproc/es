import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { inputCls, labelCls, LoadingSpinner, Pagination, transactionTypeMap } from '../../components/common/index.jsx';

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ userId: '', type: '' });
  const [users, setUsers] = useState([]);

  const loadTransactions = async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 50 };
      if (filter.userId) params.userId = filter.userId;
      if (filter.type) params.type = filter.type;
      const { data } = await api.get('/admin/transactions', { params });
      setTransactions(data.transactions);
      setPage(data.page);
      setPages(data.pages);
      setTotal(data.total);
    } catch {
      toast.error('Ошибка загрузки транзакций');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/admin/users?limit=1000').then(({ data }) => setUsers(data.users || []));
  }, []);

  useEffect(() => { loadTransactions(1); }, [filter]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-on-surface">Пользовательские транзакции</h1>

      <div className="glass-card-static p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div>
            <label className={labelCls}>Пользователь</label>
            <select className={`${inputCls} min-w-[200px]`} value={filter.userId}
              onChange={(e) => setFilter({ ...filter, userId: e.target.value })}>
              <option value="">Любой</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Тип</label>
            <select className={`${inputCls} min-w-[160px]`} value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}>
              <option value="">Все</option>
              <option value="deposit">Пополнение</option>
              <option value="purchase">Покупка</option>
              <option value="refund">Возврат</option>
              <option value="admin">Админ</option>
            </select>
          </div>
        </div>

        {loading ? <LoadingSpinner /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline/20 text-left text-on-surface-variant">
                    <th className="pb-3 font-medium w-16">ID</th>
                    <th className="pb-3 font-medium">Пользователь</th>
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
                        <td className="py-2.5 text-on-surface font-medium">{t.user?.username || '—'}</td>
                        <td className="py-2.5 text-on-surface-variant whitespace-nowrap">
                          {new Date(t.createdAt).toLocaleString('ru')}
                        </td>
                        <td className={`py-2.5 text-right font-medium whitespace-nowrap ${amt >= 0 ? 'text-secondary' : 'text-error'}`}>
                          {amt >= 0 ? '+' : ''}{amt} ₽
                        </td>
                        <td className="py-2.5 text-center">
                          <span className={`badge ${tm.badge}`}>{tm.label}</span>
                        </td>
                        <td className="py-2.5 text-on-surface-variant text-xs max-w-[300px] truncate">
                          {t.description || '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {transactions.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-on-surface-variant">Транзакции не найдены</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between">
              <Pagination page={page} pages={pages} onChange={(p) => loadTransactions(p)} />
              <span className="text-xs text-on-surface-variant">Всего: {total}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
