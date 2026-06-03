import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/authStore';
import api from '../../api/axios';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaText, setCaptchaText] = useState('');
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  const loadCaptcha = async () => {
    try {
      const { data } = await api.get('/auth/captcha');
      setCaptchaId(data.captchaId);
      setCaptchaSvg(data.svg);
      setCaptchaText('');
    } catch {
      toast.error('Ошибка загрузки капчи');
    }
  };

  useEffect(() => { loadCaptcha(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(username, password, captchaId, captchaText);
      toast.success('Регистрация успешна');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка регистрации');
      loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center px-4">
      <div className="glass-card-static p-8 rounded-2xl w-full max-w-md mt-20 space-y-6">
        <div className="text-center space-y-1">
          <span className="material-symbols-outlined text-4xl text-primary">person_add</span>
          <h2 className="text-2xl font-bold text-on-surface">Регистрация</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-on-surface-variant">Логин</label>
            <input
              className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-4 py-3 text-on-surface text-sm focus:outline-none focus:border-primary-action transition-colors"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
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
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          {/* Captcha */}
          <div className="space-y-2">
            <label className="text-sm text-on-surface-variant">Капча</label>
            <div
              className="cursor-pointer rounded-lg overflow-hidden border border-outline-variant/30 bg-surface-container-low p-2 flex items-center justify-center hover:border-primary-action transition-colors"
              onClick={loadCaptcha}
              dangerouslySetInnerHTML={{ __html: captchaSvg }}
              title="Нажмите для обновления"
            />
            <div className="flex items-center gap-2">
              <input
                className="flex-1 bg-surface-container border border-outline-variant/30 rounded-lg px-4 py-3 text-on-surface text-sm focus:outline-none focus:border-primary-action transition-colors"
                value={captchaText}
                onChange={(e) => setCaptchaText(e.target.value)}
                placeholder="Введите текст с картинки"
                required
              />
              <button
                type="button"
                onClick={loadCaptcha}
                className="w-11 h-11 flex items-center justify-center rounded-lg border border-outline-variant/30 text-on-surface-variant hover:border-primary-action hover:text-primary transition-colors flex-shrink-0"
                title="Обновить капчу"
              >
                <span className="material-symbols-outlined text-xl">refresh</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 justify-center disabled:opacity-50"
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="text-center text-sm text-on-surface-variant">
          Есть аккаунт?{' '}
          <Link to="/login" className="text-primary hover:text-primary-action transition-colors">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
