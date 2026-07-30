import { randomInt } from 'node:crypto';

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

export const ORDER_STATUS = {
  PEDIDO_RECEBIDO: 'PEDIDO_RECEBIDO',
  EM_SEPARACAO: 'EM_SEPARACAO',
  SEPARADO: 'SEPARADO',
  AGUARDANDO_SAIDA: 'AGUARDANDO_SAIDA',
  EM_ROTA: 'EM_ROTA',
  ENTREGUE: 'ENTREGUE',
  CANCELADO: 'CANCELADO',
};

export const STATUS_LABELS = {
  PEDIDO_RECEBIDO: 'Pedido recebido',
  EM_SEPARACAO: 'Em separação',
  SEPARADO: 'Separado',
  AGUARDANDO_SAIDA: 'Aguardando saída',
  EM_ROTA: 'Em rota',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

// EM_ROTA só é atingido ao vincular o pedido a uma rota (routes.routes.js).
// ENTREGUE só é atingido confirmando o PIN de entrega (confirmDelivery em orders.routes.js).
export const VALID_TRANSITIONS = {
  PEDIDO_RECEBIDO: ['EM_SEPARACAO', 'CANCELADO'],
  EM_SEPARACAO: ['SEPARADO', 'CANCELADO'],
  SEPARADO: ['AGUARDANDO_SAIDA', 'CANCELADO'],
  AGUARDANDO_SAIDA: ['CANCELADO'],
  EM_ROTA: ['CANCELADO'],
  ENTREGUE: [],
  CANCELADO: [],
};

export function canTransition(from, to) {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function maskCpf(cpf) {
  if (!cpf) return null;
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return '***';
  return `***.***.${digits.slice(6, 9)}-**`;
}

export function maskName(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0) + '***';
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}***`;
}

export function getPublicTrackingUrl(order, baseUrl) {
  const frontend = baseUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${frontend.replace(/\/$/, '')}/acompanhar/${order.publicToken}`;
}

export function generateDeliveryPin() {
  return String(randomInt(0, 1000000)).padStart(6, '0');
}

export function generateMessages(order, baseUrl) {
  const name = order.patientName.split(' ')[0];
  const publicLink = getPublicTrackingUrl(order, baseUrl);
  const messages = [];

  messages.push({
    id: 'recebido',
    title: 'Pedido registrado',
    text: `Olá, ${name}. Seu pedido de medicamento foi registrado pela UPA e será entregue em seu endereço, sem custo. Acompanhe o andamento por aqui: ${publicLink}.`,
  });

  if (order.status === 'EM_ROTA') {
    messages.push({
      id: 'rota',
      title: 'Pedido em rota',
      text: `Olá, ${name}. Seu medicamento saiu para entrega. No momento do recebimento, informe ao entregador o código: ${order.deliveryPin}. Acompanhe: ${publicLink}.`,
    });
  }

  if (order.status === 'ENTREGUE') {
    messages.push({
      id: 'entregue',
      title: 'Entrega concluída',
      text: `Olá, ${name}. Sua entrega de medicamento foi concluída com sucesso. Em caso de dúvidas, entre em contato com a UPA.`,
    });
  }

  return messages;
}

async function generateDailySequence(prisma, model, field, prefix) {
  const count = await prisma[model].count({
    where: { [field]: { startsWith: prefix } },
  });
  return `${prefix}-${String(count + 1).padStart(3, '0')}`;
}

export async function generateOrderNumber(prisma) {
  const today = new Date();
  const prefix = `UPA-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  return generateDailySequence(prisma, 'order', 'orderNumber', prefix);
}

export async function generateRouteNumber(prisma) {
  const today = new Date();
  const prefix = `ROTA-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  return generateDailySequence(prisma, 'route', 'routeNumber', prefix);
}
