import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { api } from '../lib/api';
import { formatPhone } from '../lib/constants';
import { formatCpfDisplay } from '../lib/masks';

export default function OrderLabel() {
  const { id } = useParams();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.getOrder(id),
  });

  if (isLoading || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-upa-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:bg-white print:p-0">
      <style>{`
        @media print {
          @page { size: 100mm 150mm; margin: 4mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="max-w-sm mx-auto mb-4 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="w-full inline-flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 rounded-xl bg-upa-800 text-white font-medium hover:bg-upa-900 shadow-sm"
        >
          <Printer className="w-4 h-4" /> Imprimir etiqueta
        </button>
      </div>

      <div className="max-w-sm mx-auto bg-white border-2 border-slate-800 rounded-lg p-4 print:border-black print:rounded-none print:shadow-none shadow-sm">
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2 mb-3">
          <span className="font-bold text-lg">SEDOM</span>
          <span className="font-mono font-bold">{order.orderNumber}</span>
        </div>

        <div className="space-y-2 text-sm">
          <div>
            <p className="text-xs uppercase text-slate-500 font-semibold">Destinatário</p>
            <p className="font-bold text-base">{order.patientName}</p>
            {order.patientCpf && <p>CPF: {formatCpfDisplay(order.patientCpf)}</p>}
            <p>Tel: {formatPhone(order.patientPhone)}</p>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <p className="text-xs uppercase text-slate-500 font-semibold">Endereço</p>
            <p className="font-medium">{order.street}, {order.number}</p>
            {order.complement && <p>{order.complement}</p>}
            <p>{order.neighborhood} — {order.city}/{order.state}</p>
            {order.zipCode && <p>CEP: {order.zipCode}</p>}
            {order.referencePoint && <p className="text-xs mt-1">Ref: {order.referencePoint}</p>}
          </div>

          <div className="pt-2 border-t border-slate-200">
            <p className="text-xs uppercase text-slate-500 font-semibold">Medicamentos</p>
            {order.items?.map((item) => (
              <p key={item.id}>{item.quantity}x {item.medicationName} {item.dosage}</p>
            ))}
          </div>

          {order.internalNotes && (
            <div className="pt-2 border-t border-slate-200">
              <p className="text-xs uppercase text-slate-500 font-semibold">Observações</p>
              <p>{order.internalNotes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
