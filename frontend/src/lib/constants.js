export const STATUS_LABELS = {
  PEDIDO_RECEBIDO: 'Pedido recebido',
  EM_SEPARACAO: 'Em separação',
  SEPARADO: 'Separado',
  AGUARDANDO_SAIDA: 'Aguardando saída',
  EM_ROTA: 'Em rota',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

export const STATUS_COLORS = {
  PEDIDO_RECEBIDO: 'bg-slate-100 text-slate-700 ring-slate-200',
  EM_SEPARACAO: 'bg-slate-50 text-slate-700 ring-slate-200',
  SEPARADO: 'bg-upa-50 text-upa-800 ring-upa-200',
  AGUARDANDO_SAIDA: 'bg-upa-100/70 text-upa-800 ring-upa-200',
  EM_ROTA: 'bg-upa-100 text-upa-900 ring-upa-300',
  ENTREGUE: 'bg-upa-800 text-white ring-upa-700',
  CANCELADO: 'bg-red-50 text-red-800 ring-red-200',
};

export function formatDate(date) {
  if (!date) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export const KANBAN_COLUMNS = [
  'PEDIDO_RECEBIDO',
  'EM_SEPARACAO',
  'SEPARADO',
  'AGUARDANDO_SAIDA',
  'EM_ROTA',
  'ENTREGUE',
];
