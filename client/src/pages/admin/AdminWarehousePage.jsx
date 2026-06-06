import { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { inputCls, labelCls, LoadingSpinner, Pagination } from '../../components/common/index.jsx';
import StockItemRows, { validateRows } from '../../components/common/StockItemRows.jsx';

export default function AdminWarehousePage() {
  const [mainTab, setMainTab] = useState('stock'); // 'stock' | 'items'
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [addTab, setAddTab] = useState('single');
  const [dumpText, setDumpText] = useState('');
  const [rows, setRows] = useState([{ content: '', imageUrl: '' }]);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const fileRef = useRef(null);

  // Items tab state
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsPages, setItemsPages] = useState(1);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [itemsFilter, setItemsFilter] = useState({ productId: '', status: '', search: '' });

  // Debounce items filter to avoid spamming API on every keystroke
  const [debouncedFilter, setDebouncedFilter] = useState(itemsFilter);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilter(itemsFilter), 300);
    return () => clearTimeout(t);
  }, [itemsFilter]);

  const loadStock = async () => {
    try {
      const { data } = await api.get('/admin/warehouse');
      setProducts(data);
    } catch {
      toast.error('Ошибка загрузки склада');
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async (page = 1) => {
    setItemsLoading(true);
    try {
      const params = { page, limit: 50 };
      if (debouncedFilter.productId) params.productId = debouncedFilter.productId;
      if (debouncedFilter.status) params.status = debouncedFilter.status;
      if (debouncedFilter.search) params.search = debouncedFilter.search;
      const { data } = await api.get('/admin/warehouse/items', { params });
      setItems(data.items);
      setItemsPage(data.page);
      setItemsPages(data.pages);
      setItemsTotal(data.total);
    } catch {
      toast.error('Ошибка загрузки позиций');
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => { loadStock(); }, []);
  useEffect(() => { if (mainTab === 'items') loadItems(1); }, [mainTab, debouncedFilter]);

  const productPath = (p) => {
    let path = '';
    if (p.category?.shop?.name) path += `${p.category.shop.name} / `;
    if (p.category?.name) path += `${p.category.name} / `;
    return path + p.name;
  };

  const submitItems = async (itemsData, successMsg = 'Добавлено') => {
    if (!selectedProductId) return toast.error('Выберите товар');
    setAdding(true);
    try {
      const { data } = await api.post(`/admin/products/${selectedProductId}/items`, { items: itemsData });
      toast.success(`${successMsg}: ${data.count} шт`);
      loadStock();
      if (mainTab === 'items') loadItems(itemsPage);
      return true;
    } catch {
      toast.error('Ошибка добавления');
      return false;
    } finally {
      setAdding(false);
    }
  };

  const handleAddDump = async () => {
    if (!dumpText.trim()) return toast.error('Введите данные');
    if (await submitItems(dumpText)) setDumpText('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (!text.trim()) { toast.error('Файл пустой'); return; }
    await submitItems(text, 'Загружено из файла');
    e.target.value = '';
  };

  const handleAddSingle = async () => {
    const error = validateRows(rows);
    if (error) return toast.error(error);
    const validRows = rows.filter(r => r.content.trim() || r.imageUrl);
    const data = validRows.map(r => ({ content: r.content.trim(), imageUrl: r.imageUrl || null }));
    if (await submitItems(data)) setRows([{ content: '', imageUrl: '' }]);
  };

  const handleClearStock = async (productId, productName) => {
    if (!confirm(`Очистить все непроданные позиции товара "${productName}"?`)) return;
    try {
      const { data } = await api.delete(`/admin/warehouse/products/${productId}/items`);
      toast.success(`Удалено: ${data.deleted} шт`);
      loadStock();
      if (mainTab === 'items') loadItems(1);
    } catch {
      toast.error('Ошибка очистки');
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await api.delete(`/admin/warehouse/items/${itemId}`);
      loadItems(itemsPage);
      loadStock();
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  if (loading) return <LoadingSpinner />;

  const totalStock = products.reduce((s, p) => s + parseInt(p.stockCount || 0), 0);
  const totalSold = products.reduce((s, p) => s + parseInt(p.soldCount || 0), 0);
  const totalAll = totalStock + totalSold;

  const filtered = products.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.name.toLowerCase().includes(s) ||
      p.category?.name?.toLowerCase().includes(s) ||
      p.category?.shop?.name?.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Склад</h1>
          <p className="text-sm text-on-surface-variant">{products.length} товаров ({totalAll} позиций)</p>
        </div>
        <div className="flex gap-4">
          {[
            { key: 'stock', icon: 'inventory_2', label: 'Остатки' },
            { key: 'items', icon: 'list', label: 'Позиции' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setMainTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                mainTab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== TAB: Остатки ===== */}
      {mainTab === 'stock' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Left: Add items panel */}
          <div className="xl:col-span-1 space-y-5">
            <div className="glass-card-static p-6 space-y-4">
              <h3 className="text-base font-semibold text-on-surface">Добавить позиции</h3>
              <div>
                <label className={labelCls}>Товар</label>
                <select className={inputCls} value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
                  <option value="">-- Выберите товар --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{productPath(p)} ({p.stockCount || 0} шт)</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-0 border-b border-outline/20">
                {[
                  { key: 'single', label: 'По одной' },
                  { key: 'dump', label: 'Текст' },
                  { key: 'file', label: 'Из файла' },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setAddTab(t.key)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      addTab === t.key
                        ? 'border-primary text-primary'
                        : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {addTab === 'single' && (
                <StockItemRows productId={selectedProductId} rows={rows} setRows={setRows} adding={adding} onSubmit={handleAddSingle} />
              )}

              {addTab === 'dump' && (
                <div className="space-y-3">
                  <p className="text-xs text-on-surface-variant">Каждая строка — отдельная позиция на складе.</p>
                  <textarea className={inputCls} value={dumpText} onChange={(e) => setDumpText(e.target.value)} rows={10}
                    placeholder={'account1:password1\naccount2:password2\n...'} />
                  <button className="btn-primary px-6 py-2.5 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
                    onClick={handleAddDump} disabled={adding}>
                    <span className="material-symbols-outlined text-[18px]">upload</span>
                    {adding ? 'Загрузка...' : 'Загрузить'}
                  </button>
                </div>
              )}

              {addTab === 'file' && (
                <div className="space-y-3">
                  <p className="text-xs text-on-surface-variant">Загрузите .txt файл, где каждая строка — отдельная позиция.</p>
                  <div className="border-2 border-dashed border-outline/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileRef.current?.click()}>
                    <span className="material-symbols-outlined text-4xl text-outline mb-2 block">upload_file</span>
                    <p className="text-sm text-on-surface-variant">Нажмите для выбора файла</p>
                    <p className="text-xs text-outline mt-1">.txt</p>
                    <input ref={fileRef} type="file" accept=".txt,.csv" hidden onChange={handleFileUpload} />
                  </div>
                  {adding && (
                    <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                      <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                      Загрузка...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Stock table */}
          <div className="xl:col-span-2">
            <div className="glass-card-static p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-on-surface">Наличие по товарам</h3>
                <input className={`${inputCls} max-w-xs`} placeholder="Поиск..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline/20 text-left text-on-surface-variant">
                      <th className="pb-3 font-medium">Товар</th>
                      <th className="pb-3 font-medium text-center">В наличии</th>
                      <th className="pb-3 font-medium text-center">Продано</th>
                      <th className="pb-3 font-medium text-center">Всего</th>
                      <th className="pb-3 font-medium text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => {
                      const stock = parseInt(p.stockCount || 0);
                      const sold = parseInt(p.soldCount || 0);
                      const total = parseInt(p.totalItems || 0);
                      return (
                        <tr key={p.id} className="border-b border-outline/10 hover:bg-surface-container/40 transition-colors">
                          <td className="py-3">
                            <div className="font-medium text-on-surface">{p.name}</div>
                            <div className="text-xs text-on-surface-variant">
                              {p.category?.shop?.name && `${p.category.shop.name} / `}{p.category?.name}
                            </div>
                          </td>
                          <td className="py-3 text-center">
                            <span className={`badge ${stock > 0 ? 'badge-success' : 'badge-danger'}`}>{stock}</span>
                          </td>
                          <td className="py-3 text-center"><span className="badge badge-primary">{sold}</span></td>
                          <td className="py-3 text-center text-on-surface-variant">{total}</td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button className="px-3 py-1.5 rounded-lg text-xs btn-ghost" onClick={() => {
                                setSelectedProductId(String(p.id));
                                setAddTab('dump');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}>+ Добавить</button>
                              {stock > 0 && (
                                <button className="px-3 py-1.5 rounded-lg text-xs text-error hover:bg-error/10 transition-colors"
                                  onClick={() => handleClearStock(p.id, p.name)}>Очистить</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-on-surface-variant">Товары не найдены</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB: Позиции ===== */}
      {mainTab === 'items' && (
        <div className="glass-card-static p-6 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <input
              className={`${inputCls} max-w-[200px]`}
              placeholder="Поиск по содержимому..."
              value={itemsFilter.search}
              onChange={(e) => setItemsFilter({ ...itemsFilter, search: e.target.value })}
            />
            <select
              className={`${inputCls} max-w-[200px]`}
              value={itemsFilter.productId}
              onChange={(e) => setItemsFilter({ ...itemsFilter, productId: e.target.value })}
            >
              <option value="">Все товары</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{productPath(p)}</option>
              ))}
            </select>
            <select
              className={`${inputCls} max-w-[180px]`}
              value={itemsFilter.status}
              onChange={(e) => setItemsFilter({ ...itemsFilter, status: e.target.value })}
            >
              <option value="">Любой статус</option>
              <option value="available">На продаже</option>
              <option value="sold">Продано</option>
            </select>
          </div>

          {/* Items table */}
          {itemsLoading ? <LoadingSpinner /> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline/20 text-left text-on-surface-variant">
                      <th className="pb-3 font-medium w-10">#</th>
                      <th className="pb-3 font-medium">Витрина</th>
                      <th className="pb-3 font-medium">Категория</th>
                      <th className="pb-3 font-medium">Товар</th>
                      <th className="pb-3 font-medium">Позиция</th>
                      <th className="pb-3 font-medium">Дата</th>
                      <th className="pb-3 font-medium text-center">Статус</th>
                      <th className="pb-3 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id} className="border-b border-outline/10 hover:bg-surface-container/40 transition-colors">
                        <td className="py-2.5 text-on-surface-variant">{item.id}</td>
                        <td className="py-2.5 text-on-surface">{item.product?.category?.shop?.name || '—'}</td>
                        <td className="py-2.5 text-on-surface">{item.product?.category?.name || '—'}</td>
                        <td className="py-2.5 text-on-surface">{item.product?.name || '—'}</td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            {item.imageUrl && (
                              <img src={item.imageUrl} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                            )}
                            <span className="text-on-surface truncate max-w-[200px]">{item.content}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-on-surface-variant whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleString('ru')}
                        </td>
                        <td className="py-2.5 text-center">
                          <span className={`badge ${item.isSold ? 'badge-danger' : 'badge-success'}`}>
                            {item.isSold ? 'Продано' : 'На продаже'}
                          </span>
                        </td>
                        <td className="py-2.5">
                          {!item.isSold && (
                            <button
                              className="w-6 h-6 rounded-full bg-error/10 text-error flex items-center justify-center hover:bg-error/20 transition-colors"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr><td colSpan={8} className="py-8 text-center text-on-surface-variant">Позиции не найдены</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between">
                <Pagination page={itemsPage} pages={itemsPages} onChange={(p) => loadItems(p)} />
                <span className="text-xs text-on-surface-variant">Всего: {itemsTotal}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
