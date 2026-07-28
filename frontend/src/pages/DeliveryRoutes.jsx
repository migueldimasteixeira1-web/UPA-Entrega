import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, Package, CheckCircle2, Circle, Route as RouteIcon, ChevronUp, ChevronDown } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { formatDate } from '../lib/constants';
import { useToast } from '../lib/toast';
import Alert from '../components/Alert';
import EmptyState from '../components/EmptyState';
import { SkeletonList } from '../components/Skeleton';

export default function DeliveryRoutes() {
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [courierId, setCourierId] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: readyOrders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['orders', { status: 'AGUARDANDO_SAIDA' }],
    queryFn: () => api.getOrders({ status: 'AGUARDANDO_SAIDA' }),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: api.getUsers,
  });

  const { data: routes = [], isLoading: loadingRoutes } = useQuery({
    queryKey: ['delivery-routes'],
    queryFn: () => api.getDeliveryRoutes(),
    refetchInterval: 15000,
  });

  const couriers = users.filter((u) => u.role === 'ENTREGADOR' && u.active);

  const createRouteMutation = useMutation({
    mutationFn: (data) => api.createDeliveryRoute(data),
    onSuccess: (route) => {
      setError('');
      setSelectedOrderIds([]);
      setCourierId('');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-routes'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      showToast(`Rota ${route.routeNumber} criada com ${route.orders.length} pedido(s)`);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Erro ao criar rota'),
  });

  const toggleOrder = (orderId) => {
    setSelectedOrderIds((ids) => (ids.includes(orderId) ? ids.filter((i) => i !== orderId) : [...ids, orderId]));
  };

  const moveSelected = (index, direction) => {
    setSelectedOrderIds((ids) => {
      const target = index + direction;
      if (target < 0 || target >= ids.length) return ids;
      const next = [...ids];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleCreateRoute = () => {
    if (!courierId || !selectedOrderIds.length) return;
    createRouteMutation.mutate({ courierId, orderIds: selectedOrderIds });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Rotas de entrega</h1>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">
          Agrupe pedidos prontos e atribua a um entregador da UPA
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
              <label
                key={order.id}
                className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                  selectedOrderIds.includes(order.id)
                    ? 'border-upa-400 bg-upa-50/60 ring-1 ring-upa-200'
                    : 'border-slate-200 hover:border-upa-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedOrderIds.includes(order.id)}
                  onChange={() => toggleOrder(order.id)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{order.patientName}</p>
                  <p className="text-xs text-slate-500">{order.orderNumber} · {order.neighborhood}</p>
                  <p className="text-xs text-slate-500">{order.mainMedication}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        {selectedOrderIds.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-slate-700 mb-2">
              Ordem de entrega ({selectedOrderIds.length})
            </p>
            <div className="space-y-2">
              {selectedOrderIds.map((id, index) => {
                const order = readyOrders.find((o) => o.id === id);
                if (!order) return null;
                return (
                  <div key={id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-2.5">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-upa-800 text-white text-xs font-bold shrink-0">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{order.patientName}</p>
                      <p className="text-xs text-slate-500">{order.orderNumber}</p>
                    </div>
                    <div className="flex flex-col shrink-0">
                      <button
                        type="button"
                        onClick={() => moveSelected(index, -1)}
                        disabled={index === 0}
                        className="inline-flex items-center justify-center h-5 w-7 text-slate-400 hover:text-upa-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Mover para cima"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSelected(index, 1)}
                        disabled={index === selectedOrderIds.length - 1}
                        className="inline-flex items-center justify-center h-5 w-7 text-slate-400 hover:text-upa-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Mover para baixo"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
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
            onClick={handleCreateRoute}
            disabled={!courierId || !selectedOrderIds.length || createRouteMutation.isPending}
            className="inline-flex items-center justify-center gap-2 min-h-11 px-6 py-2.5 rounded-xl bg-upa-800 text-white font-medium hover:bg-upa-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Truck className="w-4 h-4" />
            {createRouteMutation.isPending ? 'Criando rota...' : `Criar rota (${selectedOrderIds.length})`}
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
