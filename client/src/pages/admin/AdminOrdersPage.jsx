import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { orderStatusMap } from '../../components/common/index.jsx';

const statuses = ['pending', 'paid', 'delivered', 'cancelled', 'refunded'];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState('');

  const load = () => {
    api.get(`/admin/orders?page=${page}${filter ? `&status=${filter}` : ''}`).then(({ data }) => {
      setOrders(data.orders);
      setPages(data.pages);
    });
  };

  useEffect(() => { load(); }, [page, filter]);

  const changeStatus = async (id, status) => {
    try {
      await api.put(`/admin/orders/${id}/status`, { status });
      toast.success('Статус обновлён');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Заказы</h1>
        <select
          className="bg-surface-container border border-outline/30 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(1); }}
        >
          <option value="">Все статусы</option>
          {statuses.map(s => <option key={s} value={s}>{orderStatusMap[s]?.label ?? s}</option>)}
        </select>
      </div>

      <div className="glass-card-static overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline/10">
                {['#', 'Пользователь', 'Товар', 'Кол-во', 'Сумма', 'Скидка', 'Статус', 'Дата', 'Действия'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs uppercase tracking-widest text-outline font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-outline/5 hover:bg-surface-container/40 transition-colors">
                  <td className="px-6 py-3 text-on-surface-variant">#{o.id}</td>
                  <td className="px-6 py-3 text-on-surface">{o.user?.username}</td>
                  <td className="px-6 py-3 text-on-surface-variant max-w-[160px] truncate">{o.product?.name}</td>
                  <td className="px-6 py-3 text-on-surface-variant">{o.quantity}</td>
                  <td className="px-6 py-3 font-bold text-on-surface">{o.totalPrice} ₽</td>
                  <td className="px-6 py-3 text-on-surface-variant">{o.discount} ₽</td>
                  <td className="px-6 py-3">
                    <span className={`badge ${orderStatusMap[o.status]?.badge ?? 'badge-info'}`}>
                      {orderStatusMap[o.status]?.label ?? o.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-on-surface-variant">{new Date(o.createdAt).toLocaleDateString('ru')}</td>
                  <td className="px-6 py-3">
                    <select
                      value={o.status}
                      onChange={(e) => changeStatus(o.id, e.target.value)}
                      className="bg-surface-container border border-outline/30 rounded-lg px-2 py-1 text-xs text-on-surface focus:outline-none focus:border-primary transition-colors"
                    >
                      {statuses.map(s => <option key={s} value={s}>{orderStatusMap[s]?.label ?? s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  );
}
