import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useShopStore from '../../store/shopStore';

const ICON_COLORS = [
  'bg-primary/20 text-primary',
  'bg-secondary/20 text-secondary',
  'bg-tertiary/20 text-tertiary',
];

export default function HomePage() {
  const { shops, fetchShops, products, fetchProducts, loading } = useShopStore();
  const [selectedShop, setSelectedShop] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  const handleShopClick = (shop) => {
    setSelectedShop(shop);
    setSelectedCategory(null);
  };

  const handleCategoryClick = (cat) => {
    setSelectedCategory(cat);
    fetchProducts(cat.id);
  };

  if (loading && !shops.length) {
    return (
      <div className="flex items-center justify-center py-20 text-on-surface-variant">
        <span className="material-symbols-outlined mr-2 animate-spin">progress_activity</span>
        Загрузка...
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Витрины */}
      <section>
        <h2 className="text-lg font-semibold text-on-surface mb-4">Витрины</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {shops.map((shop, idx) => {
            const colorClass = ICON_COLORS[idx % ICON_COLORS.length];
            const isActive = selectedShop?.id === shop.id;
            return (
              <div
                key={shop.id}
                onClick={() => handleShopClick(shop)}
                className={`glass-card rounded-xl p-5 cursor-pointer${isActive ? ' active-glow' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${colorClass}`}>
                  <span className="material-symbols-outlined text-xl">storefront</span>
                </div>
                <h3 className="font-semibold text-on-surface truncate">{shop.name}</h3>
                {shop.description && (
                  <p className="text-on-surface-variant text-sm mt-1 truncate">{shop.description}</p>
                )}
                <span className="mt-3 block text-outline text-xs uppercase tracking-wider font-medium">
                  {shop.categories?.length || 0} разделов
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Категории */}
      {selectedShop && (
        <section>
          <h2 className="text-lg font-semibold text-on-surface mb-4">
            <span className="text-on-surface-variant">{selectedShop.name}</span>
            <span className="mx-2 text-outline">/</span>
            Разделы
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {selectedShop.categories?.map((cat) => {
              const isActive = selectedCategory?.id === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat)}
                  className={`glass-card rounded-full px-6 py-3 whitespace-nowrap text-sm font-medium transition-all flex-shrink-0 ${
                    isActive
                      ? 'active-glow border-primary-action text-primary'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Товары */}
      {selectedCategory && (
        <section>
          <h2 className="text-lg font-semibold text-on-surface mb-4">
            <span className="text-on-surface-variant">{selectedCategory.name}</span>
            <span className="mx-2 text-outline">/</span>
            Товары
          </h2>
          {loading ? (
            <div className="flex items-center gap-2 text-on-surface-variant py-10">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Загрузка товаров...
            </div>
          ) : products.length === 0 ? (
            <p className="text-on-surface-variant py-8">Нет товаров в этой категории</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((product) => (
                <Link
                  to={`/product/${product.id}`}
                  key={product.id}
                  className="glass-card rounded-xl overflow-hidden flex flex-col"
                >
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      className="w-full aspect-video object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-surface-container-high flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-outline">image</span>
                    </div>
                  )}
                  <div className="p-4 flex flex-col flex-1 gap-2">
                    <h4 className="font-semibold text-on-surface">{product.name}</h4>
                    {product.shortDescription && (
                      <p className="text-on-surface-variant text-sm line-clamp-2">{product.shortDescription}</p>
                    )}
                    <div className="mt-auto pt-3 flex items-end justify-between gap-2">
                      <div className="flex flex-col">
                        {product.oldPrice && (
                          <span className="line-through text-outline text-sm">{product.oldPrice} ₽</span>
                        )}
                        <span className="text-primary-action text-2xl font-bold">{product.price} ₽</span>
                      </div>
                      <span className="text-secondary text-xs">
                        В наличии: {product.dataValues?.stockCount ?? product.stockCount ?? '∞'}
                      </span>
                    </div>
                    <button className="mt-2 w-full py-2 bg-primary-action text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-primary-action-hover transition-colors">
                      <span className="material-symbols-outlined text-base">shopping_cart</span>
                      Купить
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Пустое состояние */}
      {!selectedShop && shops.length > 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-on-surface-variant">
          <span className="material-symbols-outlined text-6xl text-outline">shopping_cart_checkout</span>
          <p className="text-lg font-medium text-on-surface">Добро пожаловать в магазин</p>
          <p className="text-sm">Выберите витрину для просмотра товаров</p>
        </div>
      )}
    </div>
  );
}
