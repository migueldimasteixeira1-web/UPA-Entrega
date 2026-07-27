import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Phone, Package, KeyRound, CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { formatPhone } from '../lib/constants';
import Alert from '../components/Alert';
import Modal from '../components/Modal';

export default function MyDeliveries() {
  const [confirmOrder, setConfirmOrder] = useState(null);
  const [pin, setPin] = useState('');
  const [modalError, setModalError] = useState('');
  const queryClient = useQueryClient();

  const { data: routes = [], isLoading } = useQuery({
    queryKey: ['delivery-routes', 'mine'],
    queryFn: api.getMyDeliveryRoutes,
    refetchInterval: 15000,
  });

  const confirmMutation = useMutation({
    mutationFn: () => api.confirmDelivery(confirmOrder.id, pin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-routes', 'mine'] });
      setConfirmOrder(null);
      setPin('');
      setModalError('');
    },
    onError: (err) => setModalError(err instanceof ApiError ? err.message : 'Erro ao confirmar entrega'),
  });

  const openConfirm = (order) => {
    setConfirmOrder(order);
    setPin('');
    setModalError('');
  };

  const pendingOrders = routes.flatMap((route) =>
    route.orders
      .filter((o) => o.status === 'EM_ROTA')
      .map((o) => ({ ...o, routeNumber: route.routeNumber }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Minhas entregas</h1>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">Pedidos atribuídos a você, em ordem de rota</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-upa-600 border-t-transparent" />
        </div>
      ) : pendingOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
          <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400">Nenhuma entrega pendente no momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingOrders.map((order, index) => (
            <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-upa-800 text-white text-xs font-bold shrink-0">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800">{order.patientName}</p>
                    <p className="text-xs text-slate-500">{order.orderNumber} · {order.routeNumber}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p>{order.street}, {order.number}{order.complement ? ` — ${order.complement}` : ''}</p>
                    <p className="text-slate-500">{order.neighborhood} · {order.city}/{order.state}</p>
                    {order.referencePoint && <p className="text-slate-500 text-xs">Ref: {order.referencePoint}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{formatPhone(order.patientPhone)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Package className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    {order.items?.map((item, i) => (
                      <p key={i}>{item.quantity}x {item.medicationName}</p>
                    ))}
                  </div>
                </div>
                {order.internalNotes && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{order.internalNotes}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => openConfirm(order)}
                className="w-full inline-flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirmar entrega
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!confirmOrder} onClose={() => setConfirmOrder(null)} title="Confirmar entrega">
        <div className="space-y-4">
          {modalError && <Alert message={modalError} onDismiss={() => setModalError('')} />}
          <p className="text-sm text-slate-600 flex items-start gap-2">
            <KeyRound className="w-4 h-4 mt-0.5 shrink-0" />
            Peça ao paciente o código de confirmação recebido por mensagem ou exibido na página de acompanhamento.
          </p>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-upa-500 font-mono text-lg text-center tracking-widest"
            placeholder="000000"
            inputMode="numeric"
            autoFocus
          />
          <button
            type="button"
            onClick={() => confirmMutation.mutate()}
            disabled={!pin.trim() || confirmMutation.isPending}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {confirmMutation.isPending ? 'Confirmando...' : 'Confirmar entrega'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
