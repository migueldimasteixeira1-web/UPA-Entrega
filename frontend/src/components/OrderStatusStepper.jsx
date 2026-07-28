import { useEffect, useRef } from 'react';
import { ClipboardCheck, PackageSearch, PackageCheck, PackageOpen, Truck, CheckCircle2, Check, XCircle } from 'lucide-react';
import { STATUS_LABELS } from '../lib/constants';

const STAGES = [
  { key: 'PEDIDO_RECEBIDO', icon: ClipboardCheck },
  { key: 'EM_SEPARACAO', icon: PackageSearch },
  { key: 'SEPARADO', icon: PackageCheck },
  { key: 'AGUARDANDO_SAIDA', icon: PackageOpen },
  { key: 'EM_ROTA', icon: Truck },
  { key: 'ENTREGUE', icon: CheckCircle2 },
];

export default function OrderStatusStepper({ status }) {
  const currentRef = useRef(null);

  // Em telas estreitas (ex.: a página pública no celular) a trilha rola
  // horizontalmente — sem isso, a etapa atual pode nascer fora da área
  // visível e o paciente só veria as primeiras etapas já concluídas.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [status]);

  if (status === 'CANCELADO') {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-red-800">
        <XCircle className="w-5 h-5 shrink-0" />
        <p className="text-sm font-medium">Este pedido foi cancelado</p>
      </div>
    );
  }

  const currentIndex = STAGES.findIndex((s) => s.key === status);

  return (
    <div className="flex items-start overflow-x-auto pb-1 -mx-1 px-1">
      {STAGES.map((stage, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        const Icon = stage.icon;

        return (
          <div key={stage.key} className={`flex items-center ${index === STAGES.length - 1 ? '' : 'flex-1'}`}>
            <div
              ref={isCurrent ? currentRef : null}
              className="flex flex-col items-center gap-1.5 shrink-0 w-16 sm:w-20"
            >
              <div
                className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 shrink-0 transition-colors ${
                  isDone
                    ? 'bg-upa-800 border-upa-800 text-white'
                    : isCurrent
                      ? 'bg-white border-upa-800 text-upa-800 ring-4 ring-upa-100'
                      : 'bg-white border-slate-200 text-slate-300'
                }`}
              >
                {isDone ? (
                  <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </div>
              <p
                className={`text-[10px] sm:text-xs text-center leading-tight ${
                  isCurrent ? 'font-semibold text-upa-900' : isDone ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                {STATUS_LABELS[stage.key]}
              </p>
            </div>

            {index < STAGES.length - 1 && (
              <div
                className={`h-0.5 flex-1 min-w-[16px] sm:min-w-[24px] mt-[18px] sm:mt-[19px] transition-colors ${
                  index < currentIndex ? 'bg-upa-800' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
