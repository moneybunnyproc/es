import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { LoadingSpinner } from '../../components/common/index.jsx';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/reviews?page=${page}&limit=20`).then(({ data }) => {
      setReviews(data.reviews);
      setPages(data.pages);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [page]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-on-surface">Отзывы покупателей</h1>

      {reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl text-outline">reviews</span>
          <p>Пока нет отзывов</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="bg-surface-container/30 border border-outline-variant/10 p-6 rounded-xl space-y-3"
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold text-on-surface">{r.user?.username}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      className={`material-symbols-outlined text-base ${s <= r.rating ? 'star-filled' : 'star-empty'}`}
                    >
                      star
                    </span>
                  ))}
                </div>
                <Link
                  to={`/product/${r.product?.id}`}
                  className="ml-auto text-primary hover:text-primary-action text-sm transition-colors truncate max-w-[200px]"
                >
                  {r.product?.name}
                </Link>
                <span className="text-outline text-xs">
                  {new Date(r.createdAt).toLocaleDateString('ru')}
                </span>
              </div>
              {r.text && (
                <p className="text-on-surface-variant text-sm leading-relaxed">{r.text}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setPage(i + 1)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                page === i + 1
                  ? 'bg-primary-action text-white shadow-md shadow-primary-action/20'
                  : 'bg-surface-container border border-outline-variant/30 text-on-surface-variant hover:border-primary-action hover:text-on-surface'
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
