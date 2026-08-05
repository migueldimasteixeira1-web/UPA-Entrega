import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, Package, CheckCircle2, Circle, Route as RouteIcon } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { formatDate } from '../lib/constants';
import { useToast } from '../lib/toast';
import Alert from '../components/Alert';
import EmptyState from '../components/EmptyState';
import { SkeletonList } from '../components/Skeleton';
import { buttonClassName } from '../components/Button';

export default function DeliveryRoutes() {
  const [courierId, setCourierId] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Ordenado do mais antigo pro mais novo — vira a sequência de entrega
  // (routeSequence) até a #73 substituir por ordem otimizada por distância.
  const { data: readyOrdersDesc = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['orders', { status: 'AGUARDANDO_SAIDA' }],
    queryFn: () => api.getOrders({ status: 'AGUARDANDO_SAIDA' }),
  });
  const readyOrders = [...readyOrdersDesc].reverse();

  const { data: couriers = [] } = useQuery({
    queryKey: ['couriers'],
    queryFn: api.getCouriers,
  });

  const { data: routes = [], isLoading: loadingRoutes } = useQuery({
    queryKey: ['delivery-routes'],
    queryFn: () => api.getDeliveryRoutes(),
    refetchInterval: 15000,
  });

  const dispatchMutation = useMutation({
    mutationFn: (data) => api.createDeliveryRoute(data),
    onSuccess: (route) => {
      setError('');
      setCourierId('');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-routes'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      showToast(`Rota ${route.routeNumber} despachada com ${route.orders.length} pedido(s)`);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Erro ao despachar rota'),
  });

  const handleDispatch = () => {
    if (!courierId || !readyOrders.length) return;
    dispatchMutation.mutate({ courierId, orderIds: readyOrders.map((o) => o.id) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Rotas de entrega</h1>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">
          Despache os pedidos prontos para um entregador da UPA
        </p>
      </div>

      {error && <Alert message={error} onDismiss={() => setError('')} />}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" /> Pedidos aguardando saída
        </h2>

        {loadingOrders ? (
          <SkeletonList rows={3} rowClassName="h-16" />
        ) : readyOrders.length === 0 ? (
          <EmptyState icon={Package} title="Nenhum pedido aguardando saída no momento." />
        ) : (
          <div className="space-y-2 mb-6">
            {readyOrders.map((order) => (
              <div key={order.id} className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-800">{order.patientName}</p>
                <p className="text-xs text-slate-500">{order.orderNumber} · {order.neighborhood}</p>
                <p className="text-xs text-slate-500">{order.mainMedication}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
          <select
            value={courierId}
            onChange={(e) => setCourierId(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-upa-500 bg-white text-sm"
          >
            <option value="">Selecione o entregador...</option>
            {couriers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleDispatch}
            disabled={!courierId || !readyOrders.length || dispatchMutation.isPending}
            className={buttonClassName('primary', 'md', 'px-6')}
          >
            <Truck className="w-4 h-4" />
            {dispatchMutation.isPending ? 'Despachando...' : `Despachar (${readyOrders.length})`}
          </button>
        </div>
        {couriers.length === 0 && (
          <p className="text-xs text-amber-600 mt-2">
            Nenhum entregador ativo cadastrado. Cadastre um usuário com perfil Entregador em Usuários.
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <RouteIcon className="w-5 h-5" /> Rotas
        </h2>

        {loadingRoutes ? (
          <SkeletonList rows={3} rowClassName="h-20" />
        ) : routes.length === 0 ? (
          <EmptyState icon={RouteIcon} title="Nenhuma rota criada ainda." />
        ) : (
          <div className="space-y-4">
            {routes.map((route) => (
              <div key={route.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <p className="font-semibold text-slate-800">{route.routeNumber}</p>
                    <p className="text-xs text-slate-500">
                      {route.courier?.name} · {formatDate(route.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      route.status === 'FINALIZADA'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-upa-50 text-upa-800'
                    }`}
                  >
                    {route.status === 'FINALIZADA' ? 'Finalizada' : 'Em andamento'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {route.orders.map((order) => (
                    <Link
                      key={order.id}
                      to={`/pedidos/${order.id}`}
                      className="flex items-center gap-2 text-sm hover:bg-slate-50 rounded-lg px-2 py-1.5 -mx-2"
                    >
                      {order.status === 'ENTREGUE' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                      <span className="text-slate-700">{order.patientName}</span>
                      <span className="text-slate-400 text-xs">{order.orderNumber}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
