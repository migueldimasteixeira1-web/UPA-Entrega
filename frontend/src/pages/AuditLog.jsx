import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { History, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { formatDate } from '../lib/constants';
import EmptyState from '../components/EmptyState';
import { SkeletonTableRows } from '../components/Skeleton';
import { buttonClassName } from '../components/Button';

export default function AuditLog() {
  const [filters, setFilters] = useState({ userId: '', dateFrom: '', dateTo: '' });
  const [page, setPage] = useState(1);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: api.getUsers,
  });

  const queryParams = { ...filters, page };

  const { data, isLoading } = useQuery({
    queryKey: ['order-history', queryParams],
    queryFn: () =>
      api.getOrderHistory(Object.fromEntries(Object.entries(queryParams).filter(([, v]) => v))),
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const pageSize = data?.pageSize || 50;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const updateFilter = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Auditoria</h1>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">
          Histórico de alterações em todos os pedidos, sem precisar abrir um por um
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={filters.userId}
          onChange={(e) => updateFilter({ userId: e.target.value })}
          className="w-full sm:w-auto sm:min-w-[200px] px-3 py-2.5 min-h-11 rounded-xl border border-slate-200 text-sm outline-none focus:border-upa-500 bg-white"
        >
          <option value="">Todos os usuários</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => updateFilter({ dateFrom: e.target.value })}
          className="w-full sm:w-auto px-3 py-2.5 min-h-11 rounded-xl border border-slate-200 text-sm outline-none focus:border-upa-500"
          aria-label="Data inicial"
        />

        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => updateFilter({ dateTo: e.target.value })}
          className="w-full sm:w-auto px-3 py-2.5 min-h-11 rounded-xl border border-slate-200 text-sm outline-none focus:border-upa-500"
          aria-label="Data final"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto -mx-px">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-slate-500">
                <th className="px-4 sm:px-6 py-3 font-semibold text-xs uppercase tracking-wide">Quando</th>
                <th className="px-4 sm:px-6 py-3 font-semibold text-xs uppercase tracking-wide">Usuário</th>
                <th className="px-4 sm:px-6 py-3 font-semibold text-xs uppercase tracking-wide">Ação</th>
                <th className="px-4 sm:px-6 py-3 font-semibold text-xs uppercase tracking-wide">Pedido</th>
                <th className="px-4 sm:px-6 py-3 font-semibold text-xs uppercase tracking-wide">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonTableRows rows={8} columns={5} />
              ) : (
                items.map((entry, index) => (
                  <tr
                    key={entry.id}
                    className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors ${
                      index % 2 === 1 ? 'bg-slate-50/40' : ''
                    }`}
                  >
                    <td className="px-4 sm:px-6 py-4 text-slate-500 whitespace-nowrap">{formatDate(entry.createdAt)}</td>
                    <td className="px-4 sm:px-6 py-4 text-slate-700">{entry.user?.name || 'Sistema'}</td>
                    <td className="px-4 sm:px-6 py-4 text-slate-800 font-medium">{entry.action}</td>
                    <td className="px-4 sm:px-6 py-4">
                      {entry.order && (
                        <Link to={`/pedidos/${entry.order.id}`} className="text-upa-700 hover:underline">
                          {entry.order.orderNumber}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-slate-500">{entry.details || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!isLoading && items.length === 0 && (
            <EmptyState icon={History} title="Nenhuma alteração encontrada com os filtros atuais" className="m-4" />
          )}
        </div>

        {!isLoading && total > 0 && (
          <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Página {page} de {totalPages} · {total} registro(s)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={buttonClassName('secondary', 'sm')}
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className={buttonClassName('secondary', 'sm')}
              >
                Próxima <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
