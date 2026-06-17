import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

const variants = {
  error: {
    wrapper: 'bg-red-50 border-red-200 text-red-800',
    icon: AlertCircle,
  },
  success: {
    wrapper: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    icon: CheckCircle,
  },
  info: {
    wrapper: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: Info,
  },
};

export default function Alert({ type = 'error', message, onDismiss, className = '' }) {
  if (!message) return null;

  const { wrapper, icon: Icon } = variants[type] || variants.error;

  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${wrapper} ${className}`}>
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <p className="flex-1">{message}</p>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="opacity-60 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
