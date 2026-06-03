import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import useShopStore from '../../store/shopStore';
import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';
import api from '../../api/axios';
import { LoadingSpinner } from '../../components/common/index.jsx';

export default function ProductPage() {
  const { id } = useParams();
  const { currentProduct, fetchProduct, loading } = useShopStore();
  const { createOrder, checkPromo } = useCartStore();
  const { user, fetchUser } = useAuthStore();
  const [quantity, setQuantity] = useState(1);
  const [promoCode, setPromoCode] = useState('');
  const [promoInfo, setPromoInfo] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    fetchProduct(id);
    api.get(`/reviews/product/${id}`).then(r => setReviews(r.data)).catch(() => {});
  }, [id, fetchProduct]);

  const handleCheckPromo = async () => {
    try {
      const info = await checkPromo(promoCode);
      setPromoInfo(info);
      toast.success('Промокод применён');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Неверный промокод');
      setPromoInfo(null);
    }
  };

  const handleBuy = async () => {
    if (!user) return toast.error('Войдите для покупки');
    setOrdering(true);
    try {
      await createOrder(parseInt(id), quantity, promoCode || undefined, 'balance');
      toast.success('Покупка успешна!');
      setShowBuyModal(false);
      fetchUser();
      fetchProduct(id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка покупки');
    } finally {
      setOrdering(false);
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/reviews', {
        productId: parseInt(id),
        rating: reviewRating,
        text: reviewText,
      });
      setReviews([data, ...reviews]);
      setReviewText('');
      toast.success('Отзыв добавлен');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка');
    }
  };

  const calcTotal = () => {
    if (!currentProduct) return 0;
    let total = parseFloat(currentProduct.price) * quantity;
    if (user?.personalDiscount > 0) {
      total -= total * (user.personalDiscount / 100);
    }
    if (promoInfo) {
      if (promoInfo.discountType === 'percent') {
        total -= total * (parseFloat(promoInfo.discountValue) / 100);
      } else {
        total -= parseFloat(promoInfo.discountValue);
      }
    }
    return Math.max(0, total).toFixed(2);
  };

  if (loading || !currentProduct) {
    return <LoadingSpinner />;
  }

  const p = currentProduct;
  const stock = p.dataValues?.stockCount ?? p.stockCount ?? 0;

  return (
    <div className="space-y-10">
      {/* Product detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: gallery */}
        <div className="lg:col-span-7 space-y-3">
          {p.images?.length > 0 ? (
            <>
              <div className="aspect-square rounded-xl overflow-hidden border border-outline-variant/30">
                <img
                  src={p.images[activeImage]?.url}
                  alt={p.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {p.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {p.images.map((img, i) => (
                    <button
                      key={img.id}
                      onClick={() => setActiveImage(i)}
                      className={`w-15 h-15 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                        i === activeImage ? 'border-primary-action' : 'border-outline-variant/30'
                      }`}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="aspect-square rounded-xl border border-outline-variant/30 bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-6xl text-outline">image</span>
            </div>
          )}
        </div>

        {/* Right: info */}
        <div className="lg:col-span-5 space-y-5">
          <div>
            <span className="inline-block bg-primary/20 text-primary text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
              NEW ARRIVAL
            </span>
            <p className="text-on-surface-variant text-sm mb-1">
              {p.category?.shop?.name} / {p.category?.name}
            </p>
            <h1 className="text-2xl font-bold text-on-surface leading-tight">{p.name}</h1>
            {p.shortDescription && (
              <p className="text-on-surface-variant mt-2">{p.shortDescription}</p>
            )}
          </div>

          {/* Price */}
          <div className="flex items-end gap-3">
            {p.oldPrice && (
              <span className="line-through text-outline text-lg">{p.oldPrice} ₽</span>
            )}
            <span className="text-primary-action text-3xl font-bold">{p.price} ₽</span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface/50 border border-outline-variant/10 rounded-xl p-4 text-center">
              <p className="text-on-surface-variant text-xs uppercase tracking-wider mb-1">В наличии</p>
              <p className="text-secondary text-xl font-bold">{stock}</p>
            </div>
            <div className="bg-surface/50 border border-outline-variant/10 rounded-xl p-4 text-center">
              <p className="text-on-surface-variant text-xs uppercase tracking-wider mb-1">Продано</p>
              <p className="text-tertiary text-xl font-bold">{p.salesCount}</p>
            </div>
          </div>

          {/* Buy button */}
          {stock > 0 ? (
            <button
              onClick={() => setShowBuyModal(true)}
              className="w-full py-4 bg-primary-action hover:bg-primary-action-hover text-white font-bold rounded-xl shadow-lg shadow-primary-action/20 flex items-center justify-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined">shopping_cart</span>
              Купить
            </button>
          ) : (
            <button
              disabled
              className="w-full py-4 bg-surface-container text-outline font-bold rounded-xl cursor-not-allowed"
            >
              Нет в наличии
            </button>
          )}

          {/* Description */}
          {p.description && (
            <div className="pt-4 border-t border-outline-variant/20">
              <h3 className="font-semibold text-on-surface mb-2">Описание</h3>
              <div
                className="text-on-surface-variant text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: p.description.replace(/\n/g, '<br/>') }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Buy Modal */}
      {showBuyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => setShowBuyModal(false)}
        >
          <div
            className="glass-card-static rounded-2xl p-8 w-full max-w-md space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-on-surface">Покупка: {p.name}</h2>

            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-sm text-on-surface-variant">Количество</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(p.minQuantity || 1, quantity - 1))}
                  className="w-9 h-9 rounded-full border border-outline-variant/30 text-on-surface hover:border-primary-action transition-colors flex items-center justify-center"
                >
                  −
                </button>
                <span className="text-on-surface font-bold text-lg w-8 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(p.maxQuantity || 99, stock, quantity + 1))}
                  className="w-9 h-9 rounded-full border border-outline-variant/30 text-on-surface hover:border-primary-action transition-colors flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Promo */}
            <div className="space-y-2">
              <label className="text-sm text-on-surface-variant">Промокод</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-surface-container border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface text-sm focus:outline-none focus:border-primary-action"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Введите промокод"
                />
                <button
                  onClick={handleCheckPromo}
                  className="btn-ghost px-4 py-2 text-sm"
                >
                  Применить
                </button>
              </div>
              {promoInfo && (
                <p className="text-secondary text-sm">
                  Скидка: {promoInfo.discountType === 'percent' ? `${promoInfo.discountValue}%` : `${promoInfo.discountValue} ₽`}
                </p>
              )}
            </div>

            {user?.personalDiscount > 0 && (
              <p className="text-tertiary text-sm">Ваша персональная скидка: {user.personalDiscount}%</p>
            )}

            {/* Total */}
            <div className="flex justify-between items-center py-3 border-t border-outline-variant/20">
              <span className="text-on-surface-variant">Итого:</span>
              <span className="text-primary-action text-2xl font-bold">{calcTotal()} ₽</span>
            </div>

            {user && (
              <p className="text-on-surface-variant text-sm">
                Баланс: <span className="text-on-surface font-medium">{parseFloat(user.balance).toFixed(2)} ₽</span>
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowBuyModal(false)}
                className="btn-ghost flex-1 py-3"
              >
                Отмена
              </button>
              <button
                onClick={handleBuy}
                disabled={ordering}
                className="btn-primary flex-1 py-3 justify-center disabled:opacity-50"
              >
                {ordering ? 'Обработка...' : 'Оплатить с баланса'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reviews */}
      <section className="space-y-6">
        <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary">star</span>
          Отзывы ({reviews.length})
        </h2>

        {user && (
          <form onSubmit={handleReview} className="glass-card-static rounded-xl p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-on-surface-variant">Оценка</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span
                    key={s}
                    onClick={() => setReviewRating(s)}
                    className={`material-symbols-outlined cursor-pointer text-2xl select-none ${
                      s <= reviewRating ? 'star-filled' : 'star-empty'
                    }`}
                  >
                    star
                  </span>
                ))}
              </div>
            </div>
            <div>
              <textarea
                className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface text-sm focus:outline-none focus:border-primary-action resize-none"
                rows={3}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Ваш отзыв..."
              />
            </div>
            <button type="submit" className="btn-primary py-2 px-6">
              Оставить отзыв
            </button>
          </form>
        )}

        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="bg-surface-container/30 border border-outline-variant/10 rounded-xl p-5 space-y-2"
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
                <span className="ml-auto text-outline text-xs">
                  {new Date(r.createdAt).toLocaleDateString('ru')}
                </span>
              </div>
              {r.text && <p className="text-on-surface-variant text-sm">{r.text}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
