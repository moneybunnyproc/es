import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { inputCls, labelCls } from '../../components/common/index.jsx';

export default function AdminProductEditPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [items, setItems] = useState([]);
  const [newItems, setNewItems] = useState('');
  const [categories, setCategories] = useState([]);
  const [stockTab, setStockTab] = useState('multiple'); // 'multiple' | 'dump'
  const [rows, setRows] = useState([{ content: '', imageUrl: '' }]);
  const [form, setForm] = useState({});

  const loadProduct = () => {
    api.get(`/products/${id}`).then(({ data }) => {
      setProduct(data);
      setForm({
        name: data.name, description: data.description || '', shortDescription: data.shortDescription || '',
        price: data.price, oldPrice: data.oldPrice || '', categoryId: data.categoryId,
        minQuantity: data.minQuantity, maxQuantity: data.maxQuantity, sortOrder: data.sortOrder, isActive: data.isActive,
      });
    });
    api.get(`/admin/products/${id}/items`).then(({ data }) => setItems(data));
  };

  useEffect(() => {
    loadProduct();
    api.get('/admin/categories').then(({ data }) => setCategories(data));
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/products/${id}`, { ...form, price: parseFloat(form.price) });
      toast.success('Товар обновлён');
      loadProduct();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    try {
      await api.post(`/admin/products/${id}/images`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Изображение загружено');
      loadProduct();
    } catch {
      toast.error('Ошибка загрузки');
    }
    e.target.value = '';
  };

  const handleDeleteImage = async (imageId) => {
    await api.delete(`/admin/products/${id}/images/${imageId}`);
    loadProduct();
  };

  const handleAddItems = async () => {
    if (!newItems.trim()) return;
    try {
      const { data } = await api.post(`/admin/products/${id}/items`, { items: newItems });
      toast.success(`Добавлено: ${data.count} шт`);
      setNewItems('');
      loadProduct();
    } catch {
      toast.error('Ошибка');
    }
  };

  const handleDeleteItem = async (itemId) => {
    await api.delete(`/admin/products/${id}/items/${itemId}`);
    loadProduct();
  };

  if (!product) return (
    <div className="flex items-center justify-center h-64">
      <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
    </div>
  );

  const availableCount = items.filter(i => !i.isSold).length;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-on-surface">Редактирование: {product.name}</h1>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Left: Product form */}
        <div className="glass-card-static p-6 space-y-4">
          <h3 className="text-base font-semibold text-on-surface">Основная информация</h3>
          <form onSubmit={handleUpdate} className="space-y-3">
            <div>
              <label className={labelCls}>Категория</label>
              <select className={inputCls} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: parseInt(e.target.value) })}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.shop?.name} → {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Название</label>
              <input className={inputCls} value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Короткое описание</label>
              <input className={inputCls} value={form.shortDescription || ''} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Описание</label>
              <textarea className={inputCls} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Цена</label>
                <input className={inputCls} type="number" step="0.01" value={form.price || ''} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Старая цена</label>
                <input className={inputCls} type="number" step="0.01" value={form.oldPrice || ''} onChange={(e) => setForm({ ...form, oldPrice: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer select-none">
              <input type="checkbox" className="accent-primary" checked={form.isActive ?? true} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Активен
            </label>
            <button type="submit" className="btn-primary px-5 py-2 rounded-lg text-sm">Сохранить</button>
          </form>
        </div>

        {/* Right: Images & Items */}
        <div className="space-y-5">
          {/* Images */}
          <div className="glass-card-static p-6 space-y-3">
            <h3 className="text-base font-semibold text-on-surface">Изображения</h3>
            <div className="flex flex-wrap gap-3">
              {product.images?.map((img) => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.url}
                    alt=""
                    className="w-20 h-20 object-cover rounded-lg border border-outline/10"
                  />
                  <button
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-error text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    onClick={() => handleDeleteImage(img.id)}
                    title="Удалить"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ))}
              {product.images?.length === 0 && (
                <p className="text-sm text-on-surface-variant">Нет изображений</p>
              )}
            </div>
            <label className="btn-ghost inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">upload</span>
              Загрузить
              <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
            </label>
          </div>

          {/* Digital items stock */}
          <div className="glass-card-static p-6 space-y-4">
            {/* Header with counts */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-on-surface">Загрузка позиций</h3>
              <div className="flex gap-2">
                <span className="badge badge-success">{availableCount} дост.</span>
                <span className="badge badge-primary">{items.length} всего</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 border-b border-outline/20">
              <button
                onClick={() => setStockTab('multiple')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  stockTab === 'multiple'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Добавить несколько
              </button>
              <button
                onClick={() => setStockTab('dump')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  stockTab === 'dump'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Загрузить дамп
              </button>
            </div>

            {/* Tab: Добавить несколько */}
            {stockTab === 'multiple' && (
              <div className="space-y-4">
                {rows.map((row, idx) => (
                  <div key={idx} className="flex gap-4 items-start">
                    <div className="flex-1">
                      <label className={labelCls}>Содержимое</label>
                      <textarea
                        className={inputCls}
                        rows={3}
                        value={row.content}
                        onChange={(e) => {
                          const updated = [...rows];
                          updated[idx] = { ...updated[idx], content: e.target.value };
                          setRows(updated);
                        }}
                        placeholder="Данные товара (аккаунт, ключ, ссылка...)"
                      />
                    </div>
                    <div className="w-28 shrink-0">
                      <label className={labelCls}>Фото</label>
                      {row.imageUrl ? (
                        <div className="relative w-28 h-24">
                          <img src={row.imageUrl} alt="" className="w-full h-full object-cover rounded-lg border border-outline/20" />
                          <button
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-error text-white flex items-center justify-center shadow"
                            onClick={() => {
                              const updated = [...rows];
                              updated[idx] = { ...updated[idx], imageUrl: '' };
                              setRows(updated);
                            }}
                          >
                            <span className="material-symbols-outlined text-[12px]">close</span>
                          </button>
                        </div>
                      ) : (
                        <label className="w-28 h-24 flex flex-col items-center justify-center rounded-lg border border-dashed border-outline/30 cursor-pointer hover:border-primary/50 transition-colors">
                          <span className="material-symbols-outlined text-outline text-2xl">download</span>
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const fd = new FormData();
                              fd.append('image', file);
                              try {
                                const { data } = await api.post(`/admin/products/${id}/items/upload-image`, fd, {
                                  headers: { 'Content-Type': 'multipart/form-data' },
                                });
                                const updated = [...rows];
                                updated[idx] = { ...updated[idx], imageUrl: data.url };
                                setRows(updated);
                              } catch {
                                toast.error('Ошибка загрузки фото');
                              }
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}
                    </div>
                    {rows.length > 1 && (
                      <button
                        className="mt-6 w-7 h-7 rounded-full bg-error/10 text-error flex items-center justify-center hover:bg-error/20 transition-colors shrink-0"
                        onClick={() => setRows(rows.filter((_, i) => i !== idx))}
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    )}
                  </div>
                ))}

                <div className="flex justify-center">
                  <button
                    className="btn-ghost px-6 py-2 rounded-lg text-sm"
                    onClick={() => setRows([...rows, { content: '', imageUrl: '' }])}
                  >
                    Добавить ещё
                  </button>
                </div>

                <div className="border-t border-outline/20 pt-4">
                  <button
                    className="btn-primary px-6 py-2.5 rounded-lg text-sm flex items-center gap-2"
                    onClick={async () => {
                      const validRows = rows.filter(r => r.content.trim());
                      if (!validRows.length) return toast.error('Заполните хотя бы одну позицию');
                      try {
                        const { data } = await api.post(`/admin/products/${id}/items`, {
                          items: validRows.map(r => ({ content: r.content.trim(), imageUrl: r.imageUrl || null })),
                        });
                        toast.success(`Добавлено: ${data.count} шт`);
                        setRows([{ content: '', imageUrl: '' }]);
                        loadProduct();
                      } catch {
                        toast.error('Ошибка добавления');
                      }
                    }}
                  >
                    <span className="material-symbols-outlined text-[18px]">check</span>
                    Подтвердить
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Загрузить дамп */}
            {stockTab === 'dump' && (
              <div className="space-y-3">
                <p className="text-xs text-on-surface-variant">Вставьте данные по одной позиции на строку. Каждая строка станет отдельным товаром на складе.</p>
                <textarea
                  className={inputCls}
                  value={newItems}
                  onChange={(e) => setNewItems(e.target.value)}
                  rows={8}
                  placeholder={'account1:password1\naccount2:password2\naccount3:password3\n...'}
                />
                <button
                  className="btn-primary px-6 py-2.5 rounded-lg text-sm flex items-center gap-2"
                  onClick={handleAddItems}
                >
                  <span className="material-symbols-outlined text-[18px]">upload</span>
                  Загрузить
                </button>
              </div>
            )}

            {/* Existing items list */}
            {items.length > 0 && (
              <div className="border-t border-outline/20 pt-4 space-y-2">
                <h4 className="text-sm font-medium text-on-surface-variant">Позиции на складе</h4>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-container/40 transition-colors border-b border-outline/5 last:border-0">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {item.imageUrl && (
                          <img src={item.imageUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                        )}
                        <span className={`text-xs truncate ${item.isSold ? 'text-on-surface-variant opacity-50 line-through' : 'text-on-surface'}`}>
                          {item.content}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className={`badge ${item.isSold ? 'badge-danger' : 'badge-success'}`}>
                          {item.isSold ? 'Продано' : 'В наличии'}
                        </span>
                        {!item.isSold && (
                          <button
                            className="w-6 h-6 rounded-full bg-error/10 text-error flex items-center justify-center hover:bg-error/20 transition-colors"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
