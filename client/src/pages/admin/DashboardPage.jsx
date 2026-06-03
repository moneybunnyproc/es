import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { getInitials, avatarColor, orderStatusMap } from '../../components/common/index.jsx';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard').then(({ data }) => {
      setData(data);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
    </div>
  );

  const { stats, recentOrders } = data;

  const statCards = [
    {
      icon: 'group',
      label: 'Пользователей',
      value: stats.usersCount,
      colorClass: 'bg-primary/20 text-primary',
    },
    {
      icon: 'shopping_cart',
      label: 'Заказов',
      value: stats.ordersCount,
      colorClass: 'bg-secondary/20 text-secondary',
    },
    {
      icon: 'payments',
      label: 'Выручка',
      value: `${parseFloat(stats.totalRevenue).toFixed(2)} ₽`,
      colorClass: 'bg-tertiary/20 text-tertiary',
    },
    {
      icon: 'inventory_2',
      label: 'Товаров',
      value: stats.productsCount,
      colorClass: 'bg-error/20 text-error',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-on-surface">Дашборд</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="glass-card-static p-6 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${card.colorClass}`}>
              <span className="material-symbols-outlined text-2xl">{card.icon}</span>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-outline font-medium mb-1">{card.label}</div>
              <div className="text-3xl font-bold text-on-surface">{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="glass-card-static overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline/10">
          <h2 className="text-base font-semibold text-on-surface">Последние заказы</h2>
          <a href="/admin/orders" className="text-sm text-primary hover:underline">Смотреть все →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline/10">
                {['#', 'Пользователь', 'Товар', 'Сумма', 'Статус', 'Дата'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs uppercase tracking-widest text-outline font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-b border-outline/5 hover:bg-surface-container/40 transition-colors">
                  <td className="px-6 py-3 text-on-surface-variant">#{o.id}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(o.user?.username)}`}>
                        {getInitials(o.user?.username)}
                      </div>
                      <span className="text-on-surface">{o.user?.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-on-surface-variant">{o.product?.name}</td>
                  <td className="px-6 py-3 font-bold text-on-surface">{o.totalPrice} ₽</td>
                  <td className="px-6 py-3">
                    <span className={`badge ${orderStatusMap[o.status]?.badge ?? 'badge-info'}`}>
                      {orderStatusMap[o.status]?.label ?? o.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-on-surface-variant">{new Date(o.createdAt).toLocaleDateString('ru')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
