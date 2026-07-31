import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Phone, Package, KeyRound, CheckCircle2, Navigation } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { formatPhone } from '../lib/constants';
import { buildMapsUrl } from '../lib/masks';
import { useToast } from '../lib/toast';
import Alert from '../components/Alert';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { SkeletonOrderCard } from '../components/Skeleton';
import { buttonClassName } from '../components/Button';
import PinInput from '../components/PinInput';

export default function MyDeliveries() {
  const [confirmOrder, setConfirmOrder] = useState(null);
  const [pin, setPin] = useState('');
  const [modalError, setModalError] = useState('');
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: routes = [], isLoading } = useQuery({
    queryKey: ['delivery-routes', 'mine'],
    queryFn: api.getMyDeliveryRoutes,
    refetchInterval: 15000,
  });

  const confirmMutation = useMutation({
    mutationFn: () => api.confirmDelivery(confirmOrder.id, pin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-routes', 'mine'] });
      showToast('Entrega confirmada com sucesso');
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
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonOrderCard key={i} />
          ))}
        </div>
      ) : pendingOrders.length === 0 ? (
        <EmptyState icon={Package} title="Nenhuma entrega pendente no momento." className="bg-white py-16" />
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
                  <div className="min-w-0 flex-1">
                    <p>{order.street}, {order.number}{order.complement ? ` — ${order.complement}` : ''}</p>
                    <p className="text-slate-500">{order.neighborhood} · {order.city}/{order.state}</p>
                    {order.referencePoint && <p className="text-slate-500 text-xs">Ref: {order.referencePoint}</p>}
                    <a
                      href={buildMapsUrl(order)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-upa-700 hover:text-upa-900"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Abrir no Maps
                    </a>
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
                className={buttonClassName('success', 'md', 'w-full')}
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
            Peça ao paciente o código de confirmação recebido por e-mail ou no comprovante impresso.
          </p>
          <PinInput length={6} value={pin} onChange={setPin} autoFocus />
          <button
            type="button"
            onClick={() => confirmMutation.mutate()}
            disabled={!/^\d{6}$/.test(pin) || confirmMutation.isPending}
            className={buttonClassName('success', 'md', 'w-full')}
          >
            {confirmMutation.isPending ? 'Confirmando...' : 'Confirmar entrega'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
