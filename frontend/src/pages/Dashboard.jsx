import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Plus,
  CreditCard,
  Key,
  MapPin,
  Package,
  LayoutGrid,
  List,
  AlertTriangle,
  Inbox,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency, formatDate, KANBAN_COLUMNS, STATUS_LABELS } from '../lib/constants';
import StatusBadge from '../components/StatusBadge';

function OrderCard({ order }) {
  return (
    <Link
      to={`/pedidos/${order.id}`}
      className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-upa-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 group-hover:text-upa-800 truncate">{order.patientName}</p>
          <p className="text-xs text-slate-500">{order.orderNumber}</p>
        </div>
        <StatusBadge status={order.status} />
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
        <p className="text-xs font-medium text-slate-700">{formatCurrency(order.freightValue)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
        {order.paymentConfirmed ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full ring-1 ring-emerald-100">
            <CreditCard className="w-3 h-3" /> Pago
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-100">
            <CreditCard className="w-3 h-3" /> Pendente
          </span>
        )}
        {order.hasPin ? (
          <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full ring-1 ring-blue-100">
            <Key className="w-3 h-3" /> PIN
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            <Key className="w-3 h-3" /> Sem PIN
          </span>
        )}
        {order.uberFlashRegistered && (
          <span className="text-xs text-upa-700 bg-upa-50 px-2 py-0.5 rounded-full ml-auto">Uber Flash</span>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-2">{formatDate(order.createdAt)}</p>
    </Link>
  );
}

function EmptyColumn() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 bg-slate-50/80 rounded-xl border border-dashed border-slate-200">
      <Inbox className="w-8 h-8 text-slate-300 mb-2" />
      <p className="text-xs text-slate-400 text-center">Nenhum pedido nesta etapa</p>
    </div>
  );
}

export default function Dashboard() {
  const [view, setView] = useState('kanban');
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: api.getStats,
    refetchInterval: 30000,
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', filters],
    queryFn: () =>
      api.getOrders(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      ),
    refetchInterval: 15000,
  });

  const activeOrders = orders.filter((o) => o.status !== 'CANCELADO' && o.status !== 'PEDIDO_CRIADO');

  const statCards = [
    { label: 'Aguardando pagamento', value: stats?.pendingPayment ?? 0, icon: CreditCard, tone: 'amber' },
    { label: 'Aguardando retirada', value: stats?.awaitingPickup ?? 0, icon: Package, tone: 'purple' },
    { label: 'Em rota', value: stats?.inRoute ?? 0, icon: MapPin, tone: 'cyan' },
    { label: 'Estoque baixo', value: stats?.lowStockCount ?? 0, icon: AlertTriangle, tone: 'red' },
  ];

  const toneClasses = {
    amber: 'text-amber-700 bg-amber-50 border-amber-100',
    purple: 'text-purple-700 bg-purple-50 border-purple-100',
    cyan: 'text-cyan-700 bg-cyan-50 border-cyan-100',
    red: 'text-red-700 bg-red-50 border-red-100',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Painel de entregas</h1>
          <p className="text-slate-500 mt-1">Acompanhe pedidos, pagamentos e entregas via Uber Flash</p>
        </div>
        <Link
          to="/pedidos/novo"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-upa-800 text-white font-medium hover:bg-upa-900 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo pedido
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`rounded-xl border p-4 ${toneClasses[stat.tone]}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm opacity-80">{stat.label}</p>
                <Icon className="w-4 h-4 opacity-60" />
              </div>
              <p className="text-3xl font-bold mt-2">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {(stats?.lowStockCount ?? 0) > 0 && (
        <div className="flex items-start sm:items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-900">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" />
          <p className="text-sm">
            <strong>{stats.lowStockCount}</strong> medicamento(s) com estoque abaixo do mínimo.{' '}
            <Link to="/estoque" className="font-medium underline hover:text-amber-950">Ver estoque</Link>
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por paciente, pedido, bairro..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-upa-500 focus:ring-2 focus:ring-upa-100 outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-upa-500 bg-white min-w-[160px]"
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
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-upa-500"
              aria-label="Data inicial"
            />

            <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setView('kanban')}
                className={`px-3 py-2.5 ${view === 'kanban' ? 'bg-upa-50 text-upa-800' : 'text-slate-500 hover:bg-slate-50'}`}
                aria-label="Visualização kanban"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className={`px-3 py-2.5 border-l border-slate-200 ${view === 'list' ? 'bg-upa-50 text-upa-800' : 'text-slate-500 hover:bg-slate-50'}`}
                aria-label="Visualização lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-upa-600 border-t-transparent" />
            <p className="text-sm text-slate-500">Carregando pedidos...</p>
          </div>
        ) : view === 'kanban' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 overflow-x-auto pb-2">
            {KANBAN_COLUMNS.map((status) => {
              const columnOrders = activeOrders.filter((o) => o.status === status);
              return (
                <div key={status} className="min-w-[260px]">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-sm font-semibold text-slate-700 leading-tight">{STATUS_LABELS[status]}</h3>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      {columnOrders.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {columnOrders.map((order) => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                    {columnOrders.length === 0 && <EmptyColumn />}
                  </div>
                </div>
              );
            })}
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
                  <th className="pb-3 font-medium">Frete</th>
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
                    <td className="py-3 text-slate-600 font-medium">{formatCurrency(order.freightValue)}</td>
                    <td className="py-3 text-slate-500">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && (
              <div className="flex flex-col items-center py-16 text-slate-400">
                <Inbox className="w-10 h-10 mb-3" />
                <p>Nenhum pedido encontrado com os filtros atuais</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
