// Gerador de classe (não um wrapper de componente) porque botões deste app
// ora são <button>, ora <Link> (react-router) — uma função de classe serve
// os dois sem precisar de um componente polimórfico.
export function buttonClassName(variant = 'primary', size = 'md', extra = '') {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  const sizes = {
    md: 'min-h-11 px-5 py-2.5 text-sm',
    sm: 'min-h-9 px-3.5 py-2 text-xs',
  };

  const variants = {
    primary: 'bg-upa-800 text-white shadow-sm shadow-upa-900/10 hover:bg-upa-900',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    ghost: 'text-upa-700 hover:bg-upa-50',
    danger: 'bg-red-50 text-red-700 hover:bg-red-100',
    dangerSolid: 'bg-red-600 text-white shadow-sm shadow-red-900/10 hover:bg-red-700',
    success: 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/10 hover:bg-emerald-700',
  };

  return [base, sizes[size] || sizes.md, variants[variant] || variants.primary, extra].join(' ');
}
