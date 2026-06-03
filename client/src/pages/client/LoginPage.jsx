import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/authStore';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Вы вошли в систему');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center px-4">
      <div className="glass-card-static p-8 rounded-2xl w-full max-w-md mt-20 space-y-6">
        <div className="text-center space-y-1">
          <span className="material-symbols-outlined text-4xl text-primary">lock</span>
          <h2 className="text-2xl font-bold text-on-surface">Вход</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-on-surface-variant">Логин</label>
            <input
              className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-4 py-3 text-on-surface text-sm focus:outline-none focus:border-primary-action transition-colors"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-on-surface-variant">Пароль</label>
            <input
              className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-4 py-3 text-on-surface text-sm focus:outline-none focus:border-primary-action transition-colors"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 justify-center disabled:opacity-50"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p className="text-center text-sm text-on-surface-variant">
          Нет аккаунта?{' '}
          <Link to="/register" className="text-primary hover:text-primary-action transition-colors">
            Регистрация
          </Link>
        </p>
      </div>
    </div>
  );
}
