export const STATUS_LABELS = {
  PEDIDO_CRIADO: 'Pedido criado',
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento do frete',
  FRETE_PAGO: 'Frete pago',
  AGUARDANDO_RETIRADA: 'Entrega solicitada / aguardando retirada',
  EM_ROTA: 'Em rota',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

export const STATUS_COLORS = {
  PEDIDO_CRIADO: 'bg-slate-100 text-slate-700 ring-slate-200',
  AGUARDANDO_PAGAMENTO: 'bg-amber-50 text-amber-800 ring-amber-200',
  FRETE_PAGO: 'bg-blue-50 text-blue-800 ring-blue-200',
  AGUARDANDO_RETIRADA: 'bg-purple-50 text-purple-800 ring-purple-200',
  EM_ROTA: 'bg-cyan-50 text-cyan-800 ring-cyan-200',
  ENTREGUE: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  CANCELADO: 'bg-red-50 text-red-800 ring-red-200',
};

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value) || 0);
}

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
  'AGUARDANDO_PAGAMENTO',
  'FRETE_PAGO',
  'AGUARDANDO_RETIRADA',
  'EM_ROTA',
  'ENTREGUE',
];
