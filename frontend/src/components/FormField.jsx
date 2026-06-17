import { Loader2 } from 'lucide-react';

export function inputClassName(error, extra = '') {
  return [
    'w-full px-4 py-3 rounded-xl border outline-none transition-colors',
    'focus:ring-2 focus:ring-upa-100',
    error ? 'border-red-300 focus:border-red-400 bg-red-50/40' : 'border-slate-200 focus:border-upa-500',
    extra,
  ].join(' ');
}

export default function FormField({
  label,
  required = false,
  error,
  hint,
  loading = false,
  htmlFor,
  children,
  className = '',
}) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <div className="relative">
        {children}
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Loader2 className="w-4 h-4 animate-spin text-upa-600" aria-hidden />
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
      {!error && hint && <p className="text-xs text-slate-500 mt-1.5">{hint}</p>}
    </div>
  );
}
