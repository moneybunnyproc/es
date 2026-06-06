import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const menuItems = [
  { path: '/admin', icon: 'dashboard', label: 'Дашборд', exact: true },
  { path: '/admin/users', icon: 'people', label: 'Пользователи' },
  { path: '/admin/shops', icon: 'storefront', label: 'Витрины' },
  { path: '/admin/categories', icon: 'category', label: 'Категории' },
  { path: '/admin/products', icon: 'inventory_2', label: 'Товары' },
  { path: '/admin/warehouse', icon: 'warehouse', label: 'Склад' },
  { path: '/admin/orders', icon: 'shopping_cart', label: 'Заказы' },
  { path: '/admin/promo-codes', icon: 'sell', label: 'Промокоды' },
  { path: '/admin/reviews', icon: 'star', label: 'Отзывы' },
  { path: '/admin/chats', icon: 'chat', label: 'Чат' },
  { path: '/admin/transactions', icon: 'receipt_long', label: 'Транзакции' },
  { path: '/admin/payments', icon: 'account_balance_wallet', label: 'Платёжки' },
  { path: '/admin/bots', icon: 'smart_toy', label: 'Боты' },
  { path: '/admin/settings', icon: 'settings', label: 'Настройки' },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-60 bg-surface-container border-r border-outline-variant/30 flex flex-col z-40">
        {/* Header */}
        <div className="px-5 py-5 border-b border-outline-variant/20">
          <div className="text-primary font-extrabold text-xl leading-none">ExShop Admin</div>
          <div className="text-outline text-xs font-semibold tracking-widest mt-1">MANAGEMENT SUITE</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
          {menuItems.map((item) => {
            const active = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={
                  active
                    ? 'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary-action text-white font-medium transition-colors'
                    : 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors'
                }
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-outline-variant/20 flex flex-col gap-2">
          <Link
            to="/admin/products"
            className="btn-primary w-full text-center text-sm py-2.5"
          >
            + Новый товар
          </Link>
          <Link
            to="/admin/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-xl">manage_accounts</span>
            <span className="text-sm">Профиль{user?.username ? ` (${user.username})` : ''}</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-error hover:bg-error/10 transition-colors w-full text-left"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span className="text-sm">Выйти</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 p-8 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
