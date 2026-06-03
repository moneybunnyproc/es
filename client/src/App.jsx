import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import useAuthStore from './store/authStore';
import ClientLayout from './components/layout/ClientLayout';
import AdminLayout from './components/layout/AdminLayout';
import HomePage from './pages/client/HomePage';
import ProductPage from './pages/client/ProductPage';
import ReviewsPage from './pages/client/ReviewsPage';
import OrdersPage from './pages/client/OrdersPage';
import OrderPage from './pages/client/OrderPage';
import ChatPage from './pages/client/ChatPage';
import LoginPage from './pages/client/LoginPage';
import RegisterPage from './pages/client/RegisterPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminShopsPage from './pages/admin/AdminShopsPage';
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminProductEditPage from './pages/admin/AdminProductEditPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminPromoCodesPage from './pages/admin/AdminPromoCodesPage';
import AdminReviewsPage from './pages/admin/AdminReviewsPage';
import AdminChatsPage from './pages/admin/AdminChatsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage';
import AdminBotsPage from './pages/admin/AdminBotsPage';
import DepositPage from './pages/client/DepositPage';
function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuthStore();
  if (loading) return <div className="flex items-center justify-center min-h-screen bg-surface text-on-surface-variant">Загрузка...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

function App() {
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
      <Routes>
        <Route element={<ClientLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><OrderPage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/deposit" element={<ProtectedRoute><DepositPage /></ProtectedRoute>} />
        </Route>

        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<ProtectedRoute roles={['admin', 'operator']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="shops" element={<AdminShopsPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="products/:id" element={<AdminProductEditPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="promo-codes" element={<AdminPromoCodesPage />} />
          <Route path="reviews" element={<AdminReviewsPage />} />
          <Route path="chats" element={<AdminChatsPage />} />
          <Route path="payments" element={<AdminPaymentsPage />} />
          <Route path="bots" element={<AdminBotsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
