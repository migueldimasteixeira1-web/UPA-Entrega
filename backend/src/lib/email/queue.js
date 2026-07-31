import { confirmationEmailTemplate, statusUpdateEmailTemplate } from './templates.js';

export const EMAIL_TYPE = {
  CONFIRMACAO_PEDIDO: 'confirmacao_pedido',
  STATUS_SEPARADO: 'status_separado',
  STATUS_EM_ROTA: 'status_em_rota',
  STATUS_ENTREGUE: 'status_entregue',
  STATUS_TENTATIVA_FALHA: 'status_tentativa_falha',
};

const STATUS_EMAIL_TYPE_BY_KIND = {
  separado: EMAIL_TYPE.STATUS_SEPARADO,
  em_rota: EMAIL_TYPE.STATUS_EM_ROTA,
  entregue: EMAIL_TYPE.STATUS_ENTREGUE,
  tentativa_falha: EMAIL_TYPE.STATUS_TENTATIVA_FALHA,
};

// `client` pode ser o prisma padrão ou um client de $transaction. Enfileirar
// (criar a linha) dentro da mesma transação da criação do pedido é seguro e
// desejável — se a criação do pedido falhar, não sobra uma linha de e-mail
// órfã. O que precisa ser assíncrono é o *envio* de verdade (feito pelo
// worker depois, fora de qualquer transação), não o enfileiramento.
async function enqueue(client, { orderId, type, to, subject, html }) {
  return client.emailNotification.create({
    data: { orderId, type, to, subject, html },
  });
}

// Chamado na confirmação do pedido, com o PIN em texto puro que acabou de
// ser gerado (nunca lido de volta do banco — lá só fica o hash). Se o
// paciente não tem e-mail cadastrado, não enfileira nada — isso não é uma
// falha, é o caminho esperado pro fallback de comprovante impresso (#40).
export async function enqueueConfirmationEmail(client, order, rawPin, baseUrl) {
  if (!order.patientEmail) return null;

  const { subject, html } = confirmationEmailTemplate(order, rawPin, baseUrl);
  return enqueue(client, {
    orderId: order.id,
    type: EMAIL_TYPE.CONFIRMACAO_PEDIDO,
    to: order.patientEmail,
    subject,
    html,
  });
}

// Notificações de andamento (#36) — separado/em_rota/entregue/tentativa_falha.
// Nunca repetem o PIN (só a confirmação inicial carrega). Mesmo caminho de
// "sem e-mail cadastrado, não enfileira nada" da confirmação.
export async function enqueueStatusEmail(client, order, kind, baseUrl) {
  if (!order.patientEmail) return null;

  const { subject, html } = statusUpdateEmailTemplate(order, kind, baseUrl);
  return enqueue(client, {
    orderId: order.id,
    type: STATUS_EMAIL_TYPE_BY_KIND[kind],
    to: order.patientEmail,
    subject,
    html,
  });
}
