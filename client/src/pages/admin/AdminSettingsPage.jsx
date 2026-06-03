import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { inputCls, labelCls } from '../../components/common/index.jsx';

const defaultSettings = [
  { key: 'site_name', label: 'Название сайта', type: 'text' },
  { key: 'support_telegram', label: 'Telegram поддержки', type: 'text' },
  { key: 'min_deposit', label: 'Мин. сумма пополнения', type: 'number' },
  { key: 'welcome_message', label: 'Приветственное сообщение', type: 'textarea' },
  { key: 'rules_text', label: 'Правила магазина', type: 'textarea' },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/settings').then(({ data }) => {
      setSettings(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    try {
      await api.put('/admin/settings', settings);
      toast.success('Настройки сохранены');
    } catch {
      toast.error('Ошибка сохранения');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
    </div>
  );

  return (
    <div className="space-y-5 max-w-xl">
      <h1 className="text-2xl font-bold text-on-surface">Настройки</h1>

      <div className="glass-card-static p-6 space-y-4">
        {defaultSettings.map(({ key, label, type }) => (
          <div key={key}>
            <label className={labelCls}>{label}</label>
            {type === 'textarea' ? (
              <textarea
                className={inputCls}
                value={settings[key] || ''}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                rows={4}
              />
            ) : (
              <input
                className={inputCls}
                type={type}
                value={settings[key] || ''}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
              />
            )}
          </div>
        ))}

        <div className="pt-2">
          <button className="btn-primary px-6 py-2 rounded-lg text-sm" onClick={handleSave}>
            Сохранить настройки
          </button>
        </div>
      </div>
    </div>
  );
}
