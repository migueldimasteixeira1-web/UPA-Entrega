import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Truck, Package, ExternalLink, Key, Info } from 'lucide-react';
import { api } from '../lib/api';
import StatusBadge from '../components/StatusBadge';

export default function PublicTracking() {
  const { token } = useParams();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['public-order', token],
    queryFn: () => api.getPublicOrder(token),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-upa-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center max-w-sm">
          <p className="text-slate-600">Pedido não encontrado ou link inválido.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-upa-50 to-slate-50">
      <header className="bg-upa-800 text-white py-6 px-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg">UPA Entrega</h1>
            <p className="text-blue-100 text-sm">Acompanhamento informativo</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-5">
        <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-start gap-3 text-sm text-blue-900">
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <p>Esta página é apenas para consulta. Para alterações, entre em contato com a UPA.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
          <StatusBadge status={order.status} size="lg" />
          <p className="text-xl font-semibold text-slate-800 mt-4 leading-snug">{order.statusMessage}</p>
          <p className="text-sm text-slate-500 mt-2">Pedido {order.orderNumber}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-upa-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-slate-500">Destinatário</p>
              <p className="font-medium">{order.patientName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className={`px-2.5 py-1 rounded-full ${order.paymentConfirmed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {order.paymentConfirmed ? 'Frete confirmado' : 'Aguardando pagamento do frete'}
            </span>
            {order.uberFlashRegistered && (
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">Uber Flash solicitado</span>
            )}
          </div>

          {order.deliveryService && (
            <div className="flex items-start gap-3">
              <Truck className="w-5 h-5 text-upa-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-slate-500">Serviço de entrega</p>
                <p className="font-medium">{order.deliveryService}</p>
              </div>
            </div>
          )}

          {order.trackingLink && (
            <a
              href={order.trackingLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-upa-800 text-white font-medium hover:bg-upa-900 transition-colors"
            >
              Acompanhar no serviço de entrega <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {order.hasPin && (
          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-6">
            <div className="flex items-start gap-3">
              <Key className="w-5 h-5 text-blue-700 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-blue-900">Sobre o PIN de entrega</p>
                <p className="text-sm text-blue-800 mt-1 leading-relaxed">{order.pinInstruction}</p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 leading-relaxed">
          <p>{order.freightInfo || 'O medicamento não possui custo. O valor cobrado é referente apenas ao frete de entrega.'}</p>
          <p className="mt-3 text-slate-500">Em caso de dúvidas, entre em contato com a UPA.</p>
        </div>
      </main>
    </div>
  );
}
