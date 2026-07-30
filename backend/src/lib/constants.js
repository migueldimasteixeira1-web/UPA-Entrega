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

// tx precisa ser um client Prisma com $queryRaw (a instância padrão ou um
// client de $transaction) — o chamador é responsável por rodar isso dentro
// da mesma transação da criação do registro (order/route), para não deixar a
// numeração fora de sincronia se o create falhar depois.
//
// "seed" é o maior sufixo numérico já existente na tabela real pra esse
// prefixo, +1. Isso é recalculado a cada chamada (barato pra este volume) e
// usado tanto na primeira linha do dia quanto como piso no incremento — sem
// isso, se já existirem registros de hoje criados antes do DailyCounter
// existir (ou por qualquer outro motivo o contador ficar defasado da tabela
// real), a numeração recomeça do zero e colide com o que já existe.
async function generateDailySequence(tx, scope, dateKey, prefix, seed) {
  const rows = await tx.$queryRaw`
    INSERT INTO "DailyCounter" (scope, "dateKey", counter)
    VALUES (${scope}, ${dateKey}, ${seed})
    ON CONFLICT (scope, "dateKey")
    DO UPDATE SET counter = GREATEST("DailyCounter".counter + 1, ${seed})
    RETURNING counter
  `;
  const counter = Number(rows[0].counter);
  return `${prefix}-${String(counter).padStart(3, '0')}`;
}

function todayDateKey() {
  const today = new Date();
  return `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
}

export async function generateOrderNumber(tx) {
  const dateKey = todayDateKey();
  const prefix = `UPA-${dateKey}`;
  // '\\d' (não '\d'): dentro de um template literal JS, uma barra invertida
  // seguida de um caractere sem significado especial (\d) é descartada
  // silenciosamente — o Postgres recebia o regex "(d+)$" (letra "d" literal),
  // que nunca casava com nada, deixando maxSeq sempre em 0.
  const [{ maxSeq }] = await tx.$queryRaw`
    SELECT COALESCE(MAX(CAST(SUBSTRING("orderNumber" FROM '(\\d+)$') AS INTEGER)), 0) AS "maxSeq"
    FROM "Order" WHERE "orderNumber" LIKE ${prefix + '-%'}
  `;
  return generateDailySequence(tx, 'order', dateKey, prefix, Number(maxSeq) + 1);
}

export async function generateRouteNumber(tx) {
  const dateKey = todayDateKey();
  const prefix = `ROTA-${dateKey}`;
  const [{ maxSeq }] = await tx.$queryRaw`
    SELECT COALESCE(MAX(CAST(SUBSTRING("routeNumber" FROM '(\\d+)$') AS INTEGER)), 0) AS "maxSeq"
    FROM "Route" WHERE "routeNumber" LIKE ${prefix + '-%'}
  `;
  return generateDailySequence(tx, 'route', dateKey, prefix, Number(maxSeq) + 1);
}
