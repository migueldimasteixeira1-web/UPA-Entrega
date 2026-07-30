import { generateMessages, getPublicTrackingUrl, maskCpf, STATUS_LABELS } from './constants.js';

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
};

// Visão para ADMIN/OPERADOR: CPF mascarado (nunca sai em texto puro pela API),
// PIN visível — a equipe da UPA pode precisar repassá-lo ao paciente por telefone.
export function formatOrder(order) {
  const mainMedication = order.items?.[0]?.medicationName || order.items?.[0]?.medication?.name;
  return {
    ...order,
    patientCpf: maskCpf(order.patientCpf),
    mainMedication,
    statusLabel: STATUS_LABELS[order.status],
    publicTrackingUrl: getPublicTrackingUrl(order, FRONTEND_URL),
    messages: generateMessages(order, FRONTEND_URL),
  };
}

// Visão para o entregador: o PIN só deve ser conhecido pelo paciente — é a
// prova de que a entrega foi de fato recebida por quem de direito. Nunca
// incluir deliveryPin numa resposta que o papel ENTREGADOR possa consumir.
export function formatOrderForCourier(order) {
  const { deliveryPin, ...rest } = order;
  return {
    ...rest,
    patientCpf: maskCpf(order.patientCpf),
    statusLabel: STATUS_LABELS[order.status],
  };
}
