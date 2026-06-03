// Shared CSS class constants
export const inputCls = 'w-full bg-surface-container border border-outline/30 rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors';
export const labelCls = 'block text-xs text-on-surface-variant mb-1';

// Shared status maps
export const orderStatusMap = {
  pending: { label: 'Ожидает', badge: 'badge-warning' },
  paid: { label: 'Оплачен', badge: 'badge-primary' },
  delivered: { label: 'Доставлен', badge: 'badge-success' },
  cancelled: { label: 'Отменён', badge: 'badge-danger' },
  refunded: { label: 'Возврат', badge: 'badge-danger' },
};

export const depositStatusMap = {
  pending: { label: 'Ожидает', badge: 'badge-warning' },
  paid: { label: 'Оплачен', badge: 'badge-success' },
  cancelled: { label: 'Отменён', badge: 'badge-danger' },
  expired: { label: 'Истёк', badge: 'badge-danger' },
};

// Avatar helpers
export function getInitials(name) {
  if (!name) return '?';
  return name.slice(0, 2).toUpperCase();
}

const avatarColors = [
  'bg-primary/20 text-primary',
  'bg-secondary/20 text-secondary',
  'bg-tertiary/20 text-tertiary',
  'bg-error/20 text-error',
];
export function avatarColor(name) {
  if (!name) return avatarColors[0];
  return avatarColors[name.charCodeAt(0) % avatarColors.length];
}

// Loading spinner
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20 text-on-surface-variant">
      <span className="material-symbols-outlined mr-2 animate-spin">progress_activity</span>
      Загрузка...
    </div>
  );
}

// Star display
export function StarDisplay({ rating, size = 'text-base', interactive = false, onChange }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <span
          key={s}
          onClick={interactive ? () => onChange?.(s) : undefined}
          className={`material-symbols-outlined ${size} ${interactive ? 'cursor-pointer' : ''} ${s <= rating ? 'star-filled' : 'star-empty'}`}
        >
          star
        </span>
      ))}
    </div>
  );
}

// Pagination
export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="flex gap-1 justify-center pt-4">
      {Array.from({ length: pages }, (_, i) => (
        <button
          key={i + 1}
          onClick={() => onChange(i + 1)}
          className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
            page === i + 1
              ? 'bg-primary-action text-white shadow-md shadow-primary-action/20'
              : 'bg-surface-container border border-outline-variant/30 text-on-surface-variant hover:border-primary-action'
          }`}
        >
          {i + 1}
        </button>
      ))}
    </div>
  );
}
