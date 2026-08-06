import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, Info, ShieldCheck, Clock, Truck, FileText } from 'lucide-react';
import { api, API_URL } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import OrderStatusStepper from '../components/OrderStatusStepper';
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
          <p className="text-sm text-slate-400 mt-2">Verifique o link enviado pela unidade de saúde.</p>
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
          <p>Esta página é apenas para consulta. Para alterações, entre em contato com a unidade de saúde.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 text-center">
          <StatusBadge status={order.status} size="lg" />
          <p className="text-lg sm:text-xl font-semibold text-slate-800 mt-4 leading-snug break-words">{order.statusMessage}</p>
          <p className="text-sm text-slate-500 mt-2">Pedido {order.orderNumber}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
          <OrderStatusStepper status={order.status} />
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

          <a
            href={`${API_URL}/api/public/orders/${token}/receipt-pdf`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-upa-700 hover:text-upa-900"
          >
            <FileText className="w-4 h-4" /> Baixar comprovante do pedido
          </a>
        </div>

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
              <p>Esta entrega é gratuita, realizada por um entregador da unidade de saúde.</p>
              <p className="mt-3 text-emerald-800/80">Em caso de dúvidas, entre em contato com a unidade de saúde.</p>
            </div>
          </div>
        </div>

        <MunicipalityBrand className="pt-4 pb-2" logoClassName="h-9 w-auto max-w-[200px]" />
      </main>
    </div>
  );
}
