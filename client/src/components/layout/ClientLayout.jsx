import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import useAuthStore from '../../store/authStore';
import useShopStore from '../../store/shopStore';

export default function ClientLayout() {
  const { user, logout } = useAuthStore();
  const { searchProducts, searchResults } = useShopStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearch = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    setShowSearch(q.length >= 2);
    searchProducts(q);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinkClass = (path) => {
    const active = location.pathname === path;
    return active
      ? 'text-sm text-primary font-bold border-b-2 border-primary pb-0.5 whitespace-nowrap'
      : 'text-sm text-on-surface-variant font-medium hover:text-primary transition-colors whitespace-nowrap';
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30">
        <div className="max-w-[1280px] mx-auto h-full px-4 md:px-10 flex items-center gap-8">
          {/* Logo */}
          <Link to="/" className="text-primary font-extrabold text-2xl tracking-tight shrink-0">
            ExShop
          </Link>

          {/* Search */}
          <div className="relative flex-1 max-w-xs hidden md:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">
              search
            </span>
            <input
              type="text"
              placeholder="Поиск товаров..."
              value={searchQuery}
              onChange={handleSearch}
              onBlur={() => setTimeout(() => setShowSearch(false), 200)}
              onFocus={() => searchQuery.length >= 2 && setShowSearch(true)}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-full pl-10 pr-4 py-2 text-sm text-on-surface placeholder-outline focus:outline-none focus:border-primary/50 transition-colors"
            />
            {showSearch && searchResults.length > 0 && (
              <div className="absolute top-full mt-2 left-0 right-0 glass-card-static rounded-xl overflow-hidden z-50 shadow-lg min-w-[300px]">
                {searchResults.map((p) => (
                  <Link
                    key={p.id}
                    to={`/product/${p.id}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-container-high transition-colors"
                    onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                  >
                    <span className="text-on-surface text-sm">{p.name}</span>
                    <span className="text-secondary text-sm font-medium">{p.price} ₽</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Nav */}
          <nav className="flex items-center gap-6 shrink-0">
            <Link to="/" className={navLinkClass('/')}>Товары</Link>
            <Link to="/reviews" className={navLinkClass('/reviews')}>Отзывы</Link>
            {user ? (
              <>
                <Link to="/orders" className={navLinkClass('/orders')}>Заказы</Link>
                <Link to="/chat" className={navLinkClass('/chat')}>Поддержка</Link>
                <Link to="/deposit" className="text-secondary bg-secondary/10 rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap hover:bg-secondary/20 transition-colors">
                  {parseFloat(user.balance).toFixed(2)} ₽ +
                </Link>
                <button
                  onClick={handleLogout}
                  title="Выйти"
                  className="text-outline hover:text-error transition-colors flex items-center"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-primary text-sm px-5 py-2">Войти</Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pt-24 pb-12 px-4 md:px-10 max-w-[1280px] mx-auto w-full">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest border-t border-outline-variant/10 py-8 mt-auto">
        <div className="max-w-[1280px] mx-auto px-4 md:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-primary font-extrabold text-lg">ExShop</span>
          <span className="text-outline text-sm">© {new Date().getFullYear()} ExShop Digital Marketplace</span>
          <div className="flex items-center gap-6">
            <Link to="/" className="text-on-surface-variant hover:text-primary text-sm transition-colors">Товары</Link>
            <Link to="/reviews" className="text-on-surface-variant hover:text-primary text-sm transition-colors">Отзывы</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
