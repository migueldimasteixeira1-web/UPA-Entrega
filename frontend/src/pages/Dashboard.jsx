import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Plus,
  MapPin,
  Package,
  PackageOpen,
  CheckCircle2,
  Truck,
  LayoutGrid,
  List,
  Inbox,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatDate, KANBAN_COLUMNS, STATUS_LABELS, STATUS_DOT_COLORS } from '../lib/constants';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { SkeletonKanban } from '../components/Skeleton';
import { buttonClassName } from '../components/Button';

const ACCENT_STYLES = {
  amber: { border: 'border-l-amber-400', icon: 'bg-amber-50 text-amber-600' },
  indigo: { border: 'border-l-indigo-400', icon: 'bg-indigo-50 text-indigo-600' },
  upa: { border: 'border-l-upa-600', icon: 'bg-upa-50 text-upa-700' },
  emerald: { border: 'border-l-emerald-400', icon: 'bg-emerald-50 text-emerald-600' },
};

function OrderCard({ order }) {
  return (
    <Link
      to={`/pedidos/${order.id}`}
      className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-upa-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800 group-hover:text-upa-800 truncate">{order.patientName}</p>
          <p className="text-xs text-slate-500">{order.orderNumber}</p>
        </div>
        <div className="shrink-0 max-w-[46%] sm:max-w-[50%]">
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="space-y-2 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="truncate">{order.mainMedication || 'Sem medicamento'}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="truncate">{order.neighborhood}</span>
        </div>
      </div>

      {order.route && (
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <span className="inline-flex items-center gap-1 text-xs text-upa-800 bg-upa-50 px-2 py-0.5 rounded-full ring-1 ring-upa-100">
            <Truck className="w-3 h-3" /> {order.route.courier?.name || order.route.routeNumber}
          </span>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-2">{formatDate(order.createdAt)}</p>
    </Link>
  );
}

export default function Dashboard() {
  const [view, setView] = useState('kanban');
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    courierId: '',
  });
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: api.getStats,
    refetchInterval: 30000,
  });

  const { data: couriers = [] } = useQuery({
    queryKey: ['couriers'],
    queryFn: api.getCouriers,
  });

  const queryFilters = { ...filters, search: debouncedSearch };

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', queryFilters],
    queryFn: () =>
      api.getOrders(
        Object.fromEntries(Object.entries(queryFilters).filter(([, v]) => v))
      ),
    refetchInterval: 15000,
  });

  const activeOrders = orders.filter((o) => o.status !== 'CANCELADO');

  const statCards = [
    { label: 'Em separação', value: stats?.emSeparacao ?? 0, icon: Package, accent: 'amber' },
    { label: 'Aguardando saída', value: stats?.aguardandoSaida ?? 0, icon: PackageOpen, accent: 'indigo' },
    { label: 'Em rota', value: stats?.emRota ?? 0, icon: Truck, accent: 'upa' },
    { label: 'Entregues hoje', value: stats?.deliveredToday ?? 0, icon: CheckCircle2, accent: 'emerald' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Painel de entregas</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">Acompanhe pedidos, separação e entregas</p>
        </div>
        <Link to="/pedidos/novo" className={buttonClassName('primary', 'md', 'w-full sm:w-auto')}>
          <Plus className="w-4 h-4" />
          Novo pedido
        </Link>
      </div>

      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const accent = ACCENT_STYLES[stat.accent];
          return (
            <div
              key={stat.label}
              className={`rounded-xl border border-l-4 bg-white p-4 shadow-sm border-slate-200 ${accent.border}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs sm:text-sm text-slate-500 leading-snug">{stat.label}</p>
                <span className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-lg ${accent.icon}`}>
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <p className="text-3xl font-bold mt-3 text-slate-800">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por paciente, pedido, CPF, bairro..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-upa-500 focus:ring-2 focus:ring-upa-100 outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full sm:w-auto sm:min-w-[160px] px-3 py-2.5 min-h-11 rounded-xl border border-slate-200 text-sm outline-none focus:border-upa-500 bg-white"
            >
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full sm:w-auto px-3 py-2.5 min-h-11 rounded-xl border border-slate-200 text-sm outline-none focus:border-upa-500"
              aria-label="Data inicial"
            />

            <select
              value={filters.courierId}
              onChange={(e) => setFilters({ ...filters, courierId: e.target.value })}
              className="w-full sm:w-auto sm:min-w-[160px] px-3 py-2.5 min-h-11 rounded-xl border border-slate-200 text-sm outline-none focus:border-upa-500 bg-white"
            >
              <option value="">Todos os entregadores</option>
              {couriers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white shrink-0">
              <button
                type="button"
                onClick={() => setView('kanban')}
                className={`inline-flex items-center justify-center min-h-11 min-w-11 px-3 ${view === 'kanban' ? 'bg-upa-50 text-upa-800' : 'text-slate-500 hover:bg-slate-50'}`}
                aria-label="Visualização kanban"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className={`inline-flex items-center justify-center min-h-11 min-w-11 px-3 border-l border-slate-200 ${view === 'list' ? 'bg-upa-50 text-upa-800' : 'text-slate-500 hover:bg-slate-50'}`}
                aria-label="Visualização lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <SkeletonKanban />
        ) : view === 'kanban' ? (
          <div className="-mx-4 sm:mx-0">
            <p className="text-xs text-slate-400 mb-3 px-4 sm:px-0 xl:hidden">Deslize para ver todas as etapas</p>
            <div className="flex xl:grid xl:grid-cols-6 gap-4 overflow-x-auto pb-2 px-4 sm:px-0 snap-x snap-mandatory xl:snap-none scroll-smooth">
            {KANBAN_COLUMNS.map((status) => {
              const columnOrders = activeOrders.filter((o) => o.status === status);
              return (
                <div key={status} className="min-w-[82vw] sm:min-w-[300px] xl:min-w-0 shrink-0 xl:shrink snap-start">
                  <div className="flex items-center justify-between mb-3 px-1 gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 leading-tight min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT_COLORS[status]}`} />
                      {STATUS_LABELS[status]}
                    </h3>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      {columnOrders.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {columnOrders.map((order) => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                    {columnOrders.length === 0 && (
                      <EmptyState icon={Inbox} title="Nenhum pedido nesta etapa" />
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-3 px-4 sm:px-0 font-medium">Paciente</th>
                  <th className="pb-3 font-medium">Medicamento</th>
                  <th className="pb-3 font-medium">Bairro</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <td className="py-3 px-4 sm:px-0">
                      <Link to={`/pedidos/${order.id}`} className="font-medium text-upa-800 hover:underline">
                        {order.patientName}
                      </Link>
                      <p className="text-xs text-slate-400">{order.orderNumber}</p>
                    </td>
                    <td className="py-3 text-slate-600">{order.mainMedication || '-'}</td>
                    <td className="py-3 text-slate-600">{order.neighborhood}</td>
                    <td className="py-3"><StatusBadge status={order.status} /></td>
                    <td className="py-3 text-slate-500">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && (
              <EmptyState icon={Inbox} title="Nenhum pedido encontrado com os filtros atuais" className="mt-2" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
