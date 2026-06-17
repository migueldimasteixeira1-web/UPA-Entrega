import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function CopyMessage({ title, text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm hover:border-upa-200 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
        <h4 className="font-medium text-slate-800 text-sm min-w-0">{title}</h4>
        <button
          type="button"
          onClick={handleCopy}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg min-h-11 px-3 py-2 text-xs font-medium transition-colors shrink-0 w-full sm:w-auto ${
            copied
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-upa-50 text-upa-700 hover:bg-upa-100'
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-white/70 rounded-lg p-3 border border-slate-100">
        {text}
      </p>
    </div>
  );
}
