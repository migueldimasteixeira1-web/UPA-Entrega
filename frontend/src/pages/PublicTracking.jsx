import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, Key, Info, ShieldCheck, Copy, Check, Clock, Truck } from 'lucide-react';
import { api } from '../lib/api';
import { copyToClipboard } from '../lib/clipboard';
import StatusBadge from '../components/StatusBadge';
import AppBrand, { MunicipalityBrand } from '../components/AppBrand';

function formatHistoryDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export default function PublicTracking() {
  const { token } = useParams();
  const [pinCopied, setPinCopied] = useState(false);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['public-order', token],
    queryFn: () => api.getPublicOrder(token),
    retry: false,
    refetchInterval: 20000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-upa-50 to-slate-50 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-upa-600 border-t-transparent" />
        <p className="text-sm text-slate-500">Carregando acompanhamento...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center max-w-sm bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <p className="text-slate-600">Pedido não encontrado ou link inválido.</p>
          <p className="text-sm text-slate-400 mt-2">Verifique o link enviado pela UPA.</p>
        </div>
      </div>
    );
  }

  const showPin = !['ENTREGUE', 'CANCELADO'].includes(order.status);

  return (
    <div className="min-h-screen bg-gradient-to-b from-upa-50 via-white to-slate-50">
      <header className="bg-upa-800 text-white py-6 sm:py-8 px-4 shadow-md">
        <div className="max-w-lg mx-auto">
          <AppBrand variant="public" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 sm:py-8 space-y-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-start gap-3 text-sm text-blue-900">
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
          <p>Esta página é apenas para consulta. Para alterações, entre em contato com a UPA.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 text-center">
          <StatusBadge status={order.status} size="lg" />
          <p className="text-lg sm:text-xl font-semibold text-slate-800 mt-4 leading-snug break-words">{order.statusMessage}</p>
          <p className="text-sm text-slate-500 mt-2">Pedido {order.orderNumber}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-5">
          <div className="flex items-start gap-3 pb-4 border-b border-slate-100">
            <Package className="w-5 h-5 text-upa-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-slate-500">Destinatário</p>
              <p className="font-medium text-slate-800">{order.patientName}</p>
            </div>
          </div>

          {order.courierName && (
            <div className="flex items-start gap-3">
              <Truck className="w-5 h-5 text-upa-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-slate-500">Entregador</p>
                <p className="font-medium text-slate-800">{order.courierName}</p>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm text-slate-500 mb-2">Medicamentos</p>
            <div className="space-y-1">
              {order.items.map((item, i) => (
                <p key={i} className="text-sm text-slate-700">{item.quantity}x {item.name}</p>
              ))}
            </div>
          </div>
        </div>

        {showPin && (
          <div className="bg-upa-50 rounded-2xl border border-upa-200 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <Key className="w-5 h-5 text-upa-700 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-upa-900">PIN de entrega</p>
                <p className="text-sm text-upa-800 mt-1 leading-relaxed">{order.pinInstruction}</p>
                <p className="mt-4 text-3xl sm:text-4xl font-mono font-bold tracking-widest text-upa-900 text-center sm:text-left break-all select-text">
                  {order.deliveryPin}
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await copyToClipboard(order.deliveryPin);
                    if (ok) {
                      setPinCopied(true);
                      setTimeout(() => setPinCopied(false), 2000);
                    }
                  }}
                  className={`mt-4 inline-flex items-center justify-center gap-2 w-full min-h-11 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    pinCopied
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-upa-800 text-white hover:bg-upa-900 active:bg-upa-900'
                  }`}
                >
                  {pinCopied ? (
                    <>
                      <Check className="w-4 h-4" /> PIN copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copiar PIN
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-slate-500" />
            <h2 className="font-semibold text-slate-800">Histórico</h2>
          </div>
          <div className="space-y-3">
            {order.history.map((entry, i) => (
              <div key={i} className="relative pl-4 border-l-2 border-upa-200">
                <p className="text-sm font-medium text-slate-800">{entry.statusLabel || entry.action}</p>
                <p className="text-xs text-slate-400 mt-0.5">{formatHistoryDate(entry.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 text-sm text-emerald-900 leading-relaxed">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p>Esta entrega é gratuita, realizada por um entregador da UPA.</p>
              <p className="mt-3 text-emerald-800/80">Em caso de dúvidas, entre em contato com a UPA.</p>
            </div>
          </div>
        </div>

        <MunicipalityBrand className="pt-4 pb-2" logoClassName="h-9 w-auto max-w-[200px]" />
      </main>
    </div>
  );
}
