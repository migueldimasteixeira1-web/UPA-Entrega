import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Truck, Package, ExternalLink, Key, Info, CreditCard, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import AppBrand, { MunicipalityBrand } from '../components/AppBrand';

export default function PublicTracking() {
  const { token } = useParams();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['public-order', token],
    queryFn: () => api.getPublicOrder(token),
    retry: false,
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

          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                order.paymentConfirmed
                  ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100'
                  : 'bg-amber-50 text-amber-800 ring-1 ring-amber-100'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              {order.paymentConfirmed ? 'Frete confirmado' : 'Aguardando pagamento do frete'}
            </span>
            {order.uberFlashRegistered && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-800 ring-1 ring-blue-100">
                <Truck className="w-4 h-4" />
                Uber Flash solicitado
              </span>
            )}
          </div>

          {order.deliveryService && (
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <p className="text-slate-500 mb-1">Serviço de entrega</p>
              <p className="font-medium text-slate-800">{order.deliveryService}</p>
            </div>
          )}

          {order.trackingLink && (
            <a
              href={order.trackingLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-upa-800 text-white font-medium hover:bg-upa-900 transition-colors shadow-sm"
            >
              Acompanhar entrega <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {order.deliveryPin && (
          <div className="bg-upa-50 rounded-2xl border border-upa-200 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <Key className="w-5 h-5 text-upa-700 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-upa-900">PIN de entrega</p>
                <p className="text-sm text-upa-800 mt-1 leading-relaxed">{order.pinInstruction}</p>
                <p className="mt-4 text-3xl sm:text-4xl font-mono font-bold tracking-widest text-upa-900 text-center sm:text-left break-all">
                  {order.deliveryPin}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 text-sm text-emerald-900 leading-relaxed">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p>{order.freightInfo || 'O medicamento não possui custo. O valor cobrado é referente apenas ao frete de entrega.'}</p>
              <p className="mt-3 text-emerald-800/80">Em caso de dúvidas, entre em contato com a UPA.</p>
            </div>
          </div>
        </div>

        <MunicipalityBrand className="pt-4 pb-2" logoClassName="h-9 w-auto max-w-[200px]" />
      </main>
    </div>
  );
}
