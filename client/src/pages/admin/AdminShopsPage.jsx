import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { inputCls, labelCls } from '../../components/common/index.jsx';

export default function AdminShopsPage() {
  const [shops, setShops] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', sortOrder: 0, isActive: true });

  const load = () => api.get('/admin/shops').then(({ data }) => setShops(data));
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ name: '', description: '', sortOrder: 0, isActive: true });
    setModal({ mode: 'create' });
  };

  const openEdit = (shop) => {
    setForm({ name: shop.name, description: shop.description || '', sortOrder: shop.sortOrder, isActive: shop.isActive });
    setModal({ mode: 'edit', shop });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === 'create') {
        await api.post('/admin/shops', form);
        toast.success('Витрина создана');
      } else {
        await api.put(`/admin/shops/${modal.shop.id}`, form);
        toast.success('Витрина обновлена');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить витрину?')) return;
    await api.delete(`/admin/shops/${id}`);
    toast.success('Удалено');
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Витрины</h1>
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
                {['ID', 'Название', 'Порядок', 'Статус', 'Действия'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs uppercase tracking-widest text-outline font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shops.map((s) => (
                <tr key={s.id} className="border-b border-outline/5 hover:bg-surface-container/40 transition-colors">
                  <td className="px-6 py-3 text-on-surface-variant">{s.id}</td>
                  <td className="px-6 py-3 font-medium text-on-surface">{s.name}</td>
                  <td className="px-6 py-3 text-on-surface-variant">{s.sortOrder}</td>
                  <td className="px-6 py-3">
                    <span className={`badge ${s.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {s.isActive ? 'Активна' : 'Скрыта'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <button className="btn-ghost text-xs px-3 py-1 rounded-lg" onClick={() => openEdit(s)}>Ред.</button>
                      <button
                        className="text-xs px-3 py-1 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors"
                        onClick={() => handleDelete(s.id)}
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
          <div className="glass-card-static rounded-2xl p-6 w-full max-w-md mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-on-surface">
              {modal.mode === 'create' ? 'Новая витрина' : 'Редактирование'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className={labelCls}>Название</label>
                <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className={labelCls}>Описание</label>
                <textarea className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div>
                <label className={labelCls}>Порядок сортировки</label>
                <input className={inputCls} type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
              </div>
              <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer select-none">
                <input type="checkbox" className="accent-primary" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Активна
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
