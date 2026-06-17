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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-medium text-slate-800 text-sm">{title}</h4>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-upa-50 px-3 py-1.5 text-xs font-medium text-upa-700 hover:bg-upa-100 transition-colors shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  );
}
