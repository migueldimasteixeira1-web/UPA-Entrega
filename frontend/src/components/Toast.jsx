import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

const variants = {
  success: {
    wrapper: 'bg-emerald-600 text-white',
    icon: CheckCircle,
  },
  error: {
    wrapper: 'bg-red-600 text-white',
    icon: AlertCircle,
  },
  info: {
    wrapper: 'bg-slate-800 text-white',
    icon: Info,
  },
};

export default function Toast({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="fixed z-[100] bottom-4 right-4 left-4 sm:left-auto sm:w-96 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const { wrapper, icon: Icon } = variants[toast.type] || variants.success;
        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg ${wrapper}`}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="flex-1 text-sm">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="opacity-80 hover:opacity-100 shrink-0"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
