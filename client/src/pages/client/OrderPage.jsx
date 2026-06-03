import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import useCartStore from '../../store/cartStore';
import { orderStatusMap, LoadingSpinner } from '../../components/common/index.jsx';

function Row({ label, children }) {
  return (
    <div className="flex justify-between items-start gap-4 py-3 border-b border-outline-variant/10 last:border-0">
      <span className="text-on-surface-variant text-sm">{label}</span>
      <span className="text-on-surface text-sm font-medium text-right">{children}</span>
    </div>
  );
}

export default function OrderPage() {
  const { id } = useParams();
  const { fetchOrder } = useCartStore();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder(id).then((o) => { setOrder(o); setLoading(false); }).catch(() => setLoading(false));
  }, [id, fetchOrder]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!order) {
    return (
      <div className="text-center py-20 text-on-surface-variant">
        <span className="material-symbols-outlined text-5xl text-outline block mb-3">search_off</span>
        Заказ не найден
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-5">
      <Link
        to="/orders"
        className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Назад к заказам
      </Link>

      <div className="glass-card-static rounded-xl p-6 space-y-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-on-surface">Заказ #{order.id}</h2>
          <span className={`badge ${orderStatusMap[order.status]?.badge ?? 'badge-primary'}`}>
            {orderStatusMap[order.status]?.label ?? order.status}
          </span>
        </div>

        <Row label="Товар">{order.product?.name}</Row>
        <Row label="Количество">{order.quantity}</Row>
        <Row label="Сумма">
          <span className="text-primary-action font-bold">{order.totalPrice} ₽</span>
        </Row>
        {parseFloat(order.discount) > 0 && (
          <Row label="Скидка">
            <span className="text-secondary">-{order.discount} ₽</span>
          </Row>
        )}
        <Row label="Способ оплаты">{order.paymentMethod}</Row>
        <Row label="Дата">{new Date(order.createdAt).toLocaleString('ru')}</Row>
      </div>

      {order.deliveredContent && (
        <div className="bg-surface border border-outline-variant/20 rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">check_circle</span>
            <h3 className="font-semibold text-on-surface">Полученные данные</h3>
          </div>
          <pre className="whitespace-pre-wrap break-all text-sm text-secondary font-mono leading-relaxed">
            {order.deliveredContent}
          </pre>
        </div>
      )}
    </div>
  );
}
