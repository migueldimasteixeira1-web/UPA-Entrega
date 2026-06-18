import { Copy, Check, AlertCircle, Share2 } from 'lucide-react';
import { useState } from 'react';
import { canShare, copyToClipboard, shareText } from '../lib/clipboard';

export default function CopyMessage({ title, text }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [shared, setShared] = useState(false);

  const handleCopy = async () => {
    setCopyError(false);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 4000);
    }
  };

  const handleShare = async () => {
    setCopyError(false);
    const ok = await shareText({ title, text });
    if (ok) {
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm hover:border-upa-200 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
        <h4 className="font-medium text-slate-800 text-sm min-w-0">{title}</h4>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg min-h-11 px-3 py-2 text-xs font-medium transition-colors flex-1 sm:flex-none ${
              copied
                ? 'bg-emerald-50 text-emerald-700'
                : copyError
                  ? 'bg-red-50 text-red-700'
                  : 'bg-upa-50 text-upa-700 hover:bg-upa-100 active:bg-upa-100'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" /> Copiado!
              </>
            ) : copyError ? (
              <>
                <AlertCircle className="w-3.5 h-3.5" /> Toque e segure o texto
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copiar
              </>
            )}
          </button>
          {canShare() && (
            <button
              type="button"
              onClick={handleShare}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg min-h-11 px-3 py-2 text-xs font-medium transition-colors flex-1 sm:flex-none ${
                shared
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-200'
              }`}
            >
              {shared ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Enviado
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" /> Compartilhar
                </>
              )}
            </button>
          )}
        </div>
      </div>
      {copyError && (
        <p className="text-xs text-amber-700 mb-2">
          Não foi possível copiar automaticamente. Use &quot;Compartilhar&quot; ou selecione o texto abaixo.
        </p>
      )}
      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-white/70 rounded-lg p-3 border border-slate-100 select-text cursor-text">
        {text}
      </p>
    </div>
  );
}
