import { generateMessages, getPublicTrackingUrl, maskCpf, STATUS_LABELS } from './constants.js';
import { EMAIL_TYPE } from './email/queue.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export const ORDER_INCLUDE = {
  createdBy: { select: { id: true, name: true, email: true } },
  deliveredBy: { select: { id: true, name: true } },
  route: {
    select: {
      id: true,
      routeNumber: true,
      status: true,
      courier: { select: { id: true, name: true, phone: true } },
    },
  },
  items: {
    include: {
      medication: { select: { id: true, name: true, unit: true } },
    },
  },
  history: {
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true } } },
  },
  // Só a linha mais recente do e-mail de confirmação, e só pra virar um
  // status resumido (ver computeEmailStatus) — o conteúdo (`html`, que
  // contém o PIN) nunca deve sobreviver ao formatOrder/formatOrderForCourier.
  emails: {
    where: { type: EMAIL_TYPE.CONFIRMACAO_PEDIDO },
    orderBy: { createdAt: 'desc' },
    take: 1,
  },
};

// pending -> "pendente" (na fila, ainda não tentou), sent -> "enviado",
// failed -> "falha". Sem e-mail cadastrado ou sem nenhuma linha enfileirada
// (nunca deveria acontecer com e-mail cadastrado, mas é o fallback seguro):
// "sem_email" — é assim que o operador sabe que só o comprovante impresso
// vai funcionar pra esse pedido.
function computeEmailStatus(order) {
  if (!order.patientEmail) return 'sem_email';
  const latest = order.emails?.[0];
  if (!latest) return 'sem_email';
  if (latest.status === 'SENT') return 'enviado';
  if (latest.status === 'FAILED') return 'falha';
  return 'pendente';
}

// Visão para ADMIN/OPERADOR: CPF mascarado (nunca sai em texto puro pela
// API). O PIN não aparece mais aqui (issue #37) — vive só como hash no
// banco, e em texto puro só no e-mail de confirmação (issue #35) ou no
// comprovante impresso (issue #40).
export function formatOrder(order) {
  const { deliveryPinHash, emails, ...rest } = order;
  const mainMedication = order.items?.[0]?.medicationName || order.items?.[0]?.medication?.name;
  return {
    ...rest,
    patientCpf: maskCpf(order.patientCpf),
    mainMedication,
    statusLabel: STATUS_LABELS[order.status],
    publicTrackingUrl: getPublicTrackingUrl(order, FRONTEND_URL),
    messages: generateMessages(order, FRONTEND_URL),
    emailStatus: computeEmailStatus(order),
  };
}

// Visão para o entregador: mesma regra do formatOrder — o PIN nunca aparece
// (nem o hash, nem o conteúdo do e-mail de confirmação, que carrega o PIN
// em texto puro no momento do envio).
export function formatOrderForCourier(order) {
  const { deliveryPinHash, emails, ...rest } = order;
  return {
    ...rest,
    patientCpf: maskCpf(order.patientCpf),
    statusLabel: STATUS_LABELS[order.status],
  };
}
