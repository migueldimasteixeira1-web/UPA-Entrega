export const STATUS_LABELS = {
  PEDIDO_RECEBIDO: 'Pedido recebido',
  EM_SEPARACAO: 'Em separação',
  SEPARADO: 'Separado',
  AGUARDANDO_SAIDA: 'Aguardando saída',
  EM_ROTA: 'Em rota',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

// Cada etapa com um matiz distinto — evita a antiga escala de 4 tons quase
// idênticos de azul, que tornava impossível diferenciar o status de relance.
export const STATUS_COLORS = {
  PEDIDO_RECEBIDO: 'bg-slate-100 text-slate-600 ring-slate-200',
  EM_SEPARACAO: 'bg-amber-50 text-amber-700 ring-amber-200',
  SEPARADO: 'bg-sky-50 text-sky-700 ring-sky-200',
  AGUARDANDO_SAIDA: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  EM_ROTA: 'bg-upa-100 text-upa-900 ring-upa-300',
  ENTREGUE: 'bg-emerald-600 text-white ring-emerald-700',
  CANCELADO: 'bg-red-50 text-red-700 ring-red-200',
};

// Cor sólida equivalente, para pontos/indicadores compactos (ex.: dot em
// listas densas) onde um pill inteiro não cabe.
export const STATUS_DOT_COLORS = {
  PEDIDO_RECEBIDO: 'bg-slate-400',
  EM_SEPARACAO: 'bg-amber-500',
  SEPARADO: 'bg-sky-500',
  AGUARDANDO_SAIDA: 'bg-indigo-500',
  EM_ROTA: 'bg-upa-600',
  ENTREGUE: 'bg-emerald-600',
  CANCELADO: 'bg-red-500',
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

// Mantido em espelho com backend/src/lib/constants.js (MEDICATION_UNITS) —
// unidade de medicamento é cadastral, não texto livre.
export const MEDICATION_UNITS = [
  'unidade',
  'comprimido',
  'cápsula',
  'mL',
  'mg',
  'frasco',
  'ampola',
  'caixa',
  'tubo',
  'sachê',
  'gotas',
];

export const ADDRESS_LABELS = ['Residência', 'Trabalho', 'Casa de familiar', 'Outro'];
