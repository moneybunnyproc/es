import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { StarDisplay } from '../../components/common/index.jsx';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);

  const load = () => api.get('/admin/reviews').then(({ data }) => setReviews(data));
  useEffect(() => { load(); }, []);

  const toggleVisibility = async (id) => {
    await api.put(`/admin/reviews/${id}/toggle`);
    toast.success('Обновлено');
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить отзыв?')) return;
    await api.delete(`/admin/reviews/${id}`);
    toast.success('Удалено');
    load();
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-on-surface">Отзывы</h1>

      <div className="glass-card-static overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline/10">
                {['ID', 'Пользователь', 'Товар', 'Рейтинг', 'Текст', 'Видимость', 'Дата', 'Действия'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs uppercase tracking-widest text-outline font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} className="border-b border-outline/5 hover:bg-surface-container/40 transition-colors">
                  <td className="px-6 py-3 text-on-surface-variant">{r.id}</td>
                  <td className="px-6 py-3 text-on-surface font-medium">{r.user?.username}</td>
                  <td className="px-6 py-3 text-on-surface-variant max-w-[140px] truncate">{r.product?.name}</td>
                  <td className="px-6 py-3"><StarDisplay rating={r.rating} /></td>
                  <td className="px-6 py-3 text-on-surface-variant max-w-[200px] truncate">{r.text}</td>
                  <td className="px-6 py-3">
                    <span className={`badge ${r.isVisible ? 'badge-success' : 'badge-danger'}`}>
                      {r.isVisible ? 'Виден' : 'Скрыт'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-on-surface-variant">{new Date(r.createdAt).toLocaleDateString('ru')}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <button className="btn-ghost text-xs px-3 py-1 rounded-lg" onClick={() => toggleVisibility(r.id)}>
                        {r.isVisible ? 'Скрыть' : 'Показать'}
                      </button>
                      <button
                        className="text-xs px-3 py-1 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors"
                        onClick={() => handleDelete(r.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
