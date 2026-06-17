import { STATUS_COLORS, STATUS_LABELS } from '../lib/constants';

export default function StatusBadge({ status, size = 'sm' }) {
  const sizeClass = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-medium ring-1 ring-inset whitespace-normal text-center leading-tight ${sizeClass} ${STATUS_COLORS[status] || STATUS_COLORS.PEDIDO_CRIADO}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
