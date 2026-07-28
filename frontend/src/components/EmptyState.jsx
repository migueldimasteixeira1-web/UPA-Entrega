export default function EmptyState({ icon: Icon, title, className = '' }) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-10 px-4 bg-slate-50/80 rounded-xl border border-dashed border-slate-200 ${className}`}
    >
      {Icon && <Icon className="w-8 h-8 text-slate-300 mb-2" />}
      <p className="text-xs text-slate-400 text-center">{title}</p>
    </div>
  );
}
