import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import useCartStore from '../../store/cartStore';
import { orderStatusMap, LoadingSpinner } from '../../components/common/index.jsx';

export default function OrdersPage() {
  const { orders, fetchOrders, loading } = useCartStore();

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-on-surface">Мои заказы</h1>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl text-outline">receipt_long</span>
          <p>У вас пока нет заказов</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-outline-variant/20">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container text-on-surface-variant text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium">Товар</th>
                <th className="px-4 py-3 text-left font-medium">Кол-во</th>
                <th className="px-4 py-3 text-left font-medium">Сумма</th>
                <th className="px-4 py-3 text-left font-medium">Статус</th>
                <th className="px-4 py-3 text-left font-medium">Дата</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {orders.map((o) => (
                <tr key={o.id} className="bg-surface-container-low hover:bg-surface-container transition-colors">
                  <td className="px-4 py-3 text-on-surface-variant font-mono">{o.id}</td>
                  <td className="px-4 py-3 text-on-surface font-medium max-w-[200px] truncate">
                    {o.product?.name}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{o.quantity}</td>
                  <td className="px-4 py-3 text-primary-action font-semibold">{o.totalPrice} ₽</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${orderStatusMap[o.status]?.badge ?? 'badge-primary'}`}>
                      {orderStatusMap[o.status]?.label ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {new Date(o.createdAt).toLocaleDateString('ru')}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/orders/${o.id}`}
                      className="btn-ghost px-3 py-1.5 text-xs"
                    >
                      Подробнее
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
