import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { inputCls, labelCls } from '../../components/common/index.jsx';

export default function AdminPromoCodesPage() {
  const [codes, setCodes] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ code: '', discountType: 'percent', discountValue: '', maxUses: '', minOrderAmount: 0, expiresAt: '', isActive: true });

  const load = () => api.get('/admin/promo-codes').then(({ data }) => setCodes(data));
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ code: '', discountType: 'percent', discountValue: '', maxUses: '', minOrderAmount: 0, expiresAt: '', isActive: true });
    setModal({ mode: 'create' });
  };

  const openEdit = (c) => {
    setForm({ ...c, expiresAt: c.expiresAt ? c.expiresAt.slice(0, 16) : '' });
    setModal({ mode: 'edit', promo: c });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, discountValue: parseFloat(form.discountValue) };
      if (form.maxUses) payload.maxUses = parseInt(form.maxUses);
      if (!form.expiresAt) delete payload.expiresAt;

      if (modal.mode === 'create') {
        await api.post('/admin/promo-codes', payload);
        toast.success('Промокод создан');
      } else {
        await api.put(`/admin/promo-codes/${modal.promo.id}`, payload);
        toast.success('Обновлено');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить?')) return;
    await api.delete(`/admin/promo-codes/${id}`);
    toast.success('Удалено');
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Промокоды</h1>
        <button className="btn-primary flex items-center gap-1 px-4 py-2 rounded-lg text-sm" onClick={openCreate}>
          <span className="material-symbols-outlined text-[18px]">add</span>
          Создать
        </button>
      </div>

      <div className="glass-card-static overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline/10">
                {['Код', 'Тип', 'Скидка', 'Использовано', 'Макс.', 'Мин. сумма', 'Истекает', 'Статус', 'Действия'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs uppercase tracking-widest text-outline font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-b border-outline/5 hover:bg-surface-container/40 transition-colors">
                  <td className="px-6 py-3">
                    <span className="font-mono font-bold text-on-surface tracking-wider">{c.code}</span>
                  </td>
                  <td className="px-6 py-3 text-on-surface-variant">{c.discountType === 'percent' ? '%' : '₽'}</td>
                  <td className="px-6 py-3 font-bold text-on-surface">{c.discountValue}{c.discountType === 'percent' ? '%' : ' ₽'}</td>
                  <td className="px-6 py-3 text-on-surface-variant">{c.usedCount}</td>
                  <td className="px-6 py-3 text-on-surface-variant">{c.maxUses || '∞'}</td>
                  <td className="px-6 py-3 text-on-surface-variant">{c.minOrderAmount} ₽</td>
                  <td className="px-6 py-3 text-on-surface-variant">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('ru') : '—'}</td>
                  <td className="px-6 py-3">
                    <span className={`badge ${c.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {c.isActive ? 'Активен' : 'Неактивен'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <button className="btn-ghost text-xs px-3 py-1 rounded-lg" onClick={() => openEdit(c)}>Ред.</button>
                      <button
                        className="text-xs px-3 py-1 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors"
                        onClick={() => handleDelete(c.id)}
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

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(null)}>
          <div className="glass-card-static rounded-2xl p-6 w-full max-w-md mx-4 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-on-surface">
              {modal.mode === 'create' ? 'Новый промокод' : 'Редактирование'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className={labelCls}>Код</label>
                <input className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Тип скидки</label>
                  <select className={inputCls} value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
                    <option value="percent">Процент</option>
                    <option value="fixed">Фиксированная</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Значение</label>
                  <input className={inputCls} type="number" step="0.01" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Макс. использований</label>
                  <input className={inputCls} type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="Без ограничений" />
                </div>
                <div>
                  <label className={labelCls}>Мин. сумма заказа</label>
                  <input className={inputCls} type="number" step="0.01" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Дата истечения</label>
                <input className={inputCls} type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer select-none">
                <input type="checkbox" className="accent-primary" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Активен
              </label>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" className="btn-ghost px-4 py-2 rounded-lg text-sm" onClick={() => setModal(null)}>Отмена</button>
                <button type="submit" className="btn-primary px-4 py-2 rounded-lg text-sm">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
