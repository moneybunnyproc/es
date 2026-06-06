import { toast } from 'react-toastify';
import api from '../../api/axios';
import { inputCls, labelCls } from './index.jsx';

const hasUrl = (text) => /https?:\/\/\S+/i.test(text);

export function validateRows(rows) {
  const filled = rows.filter(r => r.content.trim() || r.imageUrl);
  if (!filled.length) return 'Заполните хотя бы одну позицию';
  const invalid = filled.find(r => !r.imageUrl && !hasUrl(r.content));
  if (invalid) return 'Каждая позиция должна содержать фото или ссылку на файлообменник';
  return null;
}

export default function StockItemRows({ productId, rows, setRows, adding, onSubmit }) {
  const updateRow = (idx, patch) => {
    const updated = [...rows];
    updated[idx] = { ...updated[idx], ...patch };
    setRows(updated);
  };

  const handleImageUpload = async (e, idx) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!productId) { toast.error('Сначала выберите товар'); return; }
    const fd = new FormData();
    fd.append('image', file);
    try {
      const { data } = await api.post(`/admin/products/${productId}/items/upload-image`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateRow(idx, { imageUrl: data.url });
    } catch {
      toast.error('Ошибка загрузки фото');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-on-surface-variant">
        Каждая позиция должна содержать фото или ссылку на файлообменник в содержимом.
      </p>
      {rows.map((row, idx) => {
        const filled = row.content.trim() || row.imageUrl;
        const valid = !filled || row.imageUrl || hasUrl(row.content);
        return (
          <div key={idx} className={`flex gap-3 items-start rounded-lg p-2 -mx-2 ${filled && !valid ? 'bg-error/5 ring-1 ring-error/30' : ''}`}>
            <div className="flex-1">
              <label className={labelCls}>Содержимое</label>
              <textarea
                className={inputCls}
                rows={3}
                value={row.content}
                onChange={(e) => updateRow(idx, { content: e.target.value })}
                placeholder="Ссылка на файлообменник или данные товара"
              />
              {filled && !valid && (
                <p className="text-xs text-error mt-1">Добавьте фото или вставьте ссылку (http://...)</p>
              )}
            </div>
            <div className="w-24 shrink-0">
              <label className={labelCls}>Фото</label>
              {row.imageUrl ? (
                <div className="relative w-24 h-20">
                  <img src={row.imageUrl} alt="" className="w-full h-full object-cover rounded-lg border border-outline/20" />
                  <button
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-error text-white flex items-center justify-center shadow"
                    onClick={() => updateRow(idx, { imageUrl: '' })}
                  >
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  </button>
                </div>
              ) : (
                <label className={`w-24 h-20 flex flex-col items-center justify-center rounded-lg border border-dashed cursor-pointer hover:border-primary/50 transition-colors ${filled && !valid ? 'border-error/50' : 'border-outline/30'}`}>
                  <span className="material-symbols-outlined text-outline text-xl">download</span>
                  <input type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e, idx)} />
                </label>
              )}
            </div>
            {rows.length > 1 && (
              <button
                className="mt-6 w-6 h-6 rounded-full bg-error/10 text-error flex items-center justify-center hover:bg-error/20 transition-colors shrink-0"
                onClick={() => setRows(rows.filter((_, i) => i !== idx))}
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
          </div>
        );
      })}

      <button
        className="btn-ghost px-5 py-2 rounded-lg text-sm w-full"
        onClick={() => setRows([...rows, { content: '', imageUrl: '' }])}
      >
        + Добавить ещё
      </button>

      <div className="border-t border-outline/20 pt-4">
        <button
          className="btn-primary px-6 py-2.5 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
          disabled={adding}
          onClick={onSubmit}
        >
          <span className="material-symbols-outlined text-[18px]">check</span>
          {adding ? 'Загрузка...' : 'Подтвердить'}
        </button>
      </div>
    </div>
  );
}
