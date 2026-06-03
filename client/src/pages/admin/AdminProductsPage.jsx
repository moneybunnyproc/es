import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { inputCls, labelCls } from '../../components/common/index.jsx';

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({
    categoryId: '', name: '', description: '', shortDescription: '',
    price: '', oldPrice: '', minQuantity: 1, maxQuantity: 100, type: 'text', sortOrder: 0, isActive: true,
  });

  const load = () => {
    api.get(`/admin/products?page=${page}`).then(({ data }) => { setProducts(data.products); setPages(data.pages); });
  };

  useEffect(() => { load(); }, [page]);
  useEffect(() => { api.get('/admin/categories').then(({ data }) => setCategories(data)); }, []);

  const openCreate = () => {
    setForm({
      categoryId: categories[0]?.id || '', name: '', description: '', shortDescription: '',
      price: '', oldPrice: '', minQuantity: 1, maxQuantity: 100, type: 'text', sortOrder: 0, isActive: true,
    });
    setModal({ mode: 'create' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, price: parseFloat(form.price), categoryId: parseInt(form.categoryId) };
      if (form.oldPrice) payload.oldPrice = parseFloat(form.oldPrice);
      await api.post('/admin/products', payload);
      toast.success('Товар создан');
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить товар?')) return;
    await api.delete(`/admin/products/${id}`);
    toast.success('Удалено');
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Товары</h1>
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
                {['ID', 'Название', 'Категория', 'Цена', 'Склад', 'Продано', 'Статус', 'Действия'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs uppercase tracking-widest text-outline font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-outline/5 hover:bg-surface-container/40 transition-colors">
                  <td className="px-6 py-3 text-on-surface-variant">{p.id}</td>
                  <td className="px-6 py-3 font-medium text-on-surface">{p.name}</td>
                  <td className="px-6 py-3 text-on-surface-variant">{p.category?.name}</td>
                  <td className="px-6 py-3 font-bold text-on-surface">{p.price} ₽</td>
                  <td className="px-6 py-3">
                    <span className="badge badge-info">{p.dataValues?.stockCount ?? '—'}</span>
                  </td>
                  <td className="px-6 py-3 text-on-surface-variant">{p.salesCount}</td>
                  <td className="px-6 py-3">
                    <span className={`badge ${p.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {p.isActive ? 'Активен' : 'Скрыт'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/products/${p.id}`} className="btn-ghost text-xs px-3 py-1 rounded-lg">Ред.</Link>
                      <button
                        className="text-xs px-3 py-1 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors"
                        onClick={() => handleDelete(p.id)}
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

      {pages > 1 && (
        <div className="flex gap-1">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setPage(i + 1)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                page === i + 1
                  ? 'bg-primary-action text-white'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(null)}>
          <div className="glass-card-static rounded-2xl p-6 w-full max-w-lg mx-4 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-on-surface">Новый товар</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className={labelCls}>Категория</label>
                <select className={inputCls} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                  <option value="">Выберите...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.shop?.name} → {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Название</label>
                <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className={labelCls}>Короткое описание</label>
                <input className={inputCls} value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Описание</label>
                <textarea className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Цена</label>
                  <input className={inputCls} type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </div>
                <div>
                  <label className={labelCls}>Старая цена</label>
                  <input className={inputCls} type="number" step="0.01" value={form.oldPrice} onChange={(e) => setForm({ ...form, oldPrice: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Мин. кол-во</label>
                  <input className={inputCls} type="number" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: parseInt(e.target.value) || 1 })} />
                </div>
                <div>
                  <label className={labelCls}>Макс. кол-во</label>
                  <input className={inputCls} type="number" value={form.maxQuantity} onChange={(e) => setForm({ ...form, maxQuantity: parseInt(e.target.value) || 100 })} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer select-none">
                <input type="checkbox" className="accent-primary" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Активен
              </label>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" className="btn-ghost px-4 py-2 rounded-lg text-sm" onClick={() => setModal(null)}>Отмена</button>
                <button type="submit" className="btn-primary px-4 py-2 rounded-lg text-sm">Создать</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
