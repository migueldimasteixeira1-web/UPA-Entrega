import { getPublicTrackingUrl } from '../constants.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function wrapEmail(title, bodyHtml) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
      <h2 style="color: #0f4c65;">${title}</h2>
      ${bodyHtml}
      <p style="font-size: 12px; color: #94a3b8; margin-top: 32px;">SEDOM — mensagem automática, não responda este e-mail.</p>
    </div>
  `;
}

// Conteúdo minimizado de propósito: nunca CPF completo, receita anexada ou
// dado clínico. O PIN só aparece aqui, uma única vez — nas notificações de
// andamento (#36) ele não é repetido.
//
// `rawPin` vem de fora (não de `order.deliveryPinHash`, que é irreversível
// por design — ver issue #37): quem chama isto é o único lugar do sistema
// que ainda tem o PIN em texto puro em mãos, no instante em que acabou de
// ser gerado.
export function confirmationEmailTemplate(order, rawPin, baseUrl) {
  const firstName = order.patientName.split(' ')[0];
  const publicLink = getPublicTrackingUrl(order, baseUrl);
  const createdAt = new Date(order.createdAt).toLocaleString('pt-BR');

  const subject = `Pedido ${order.orderNumber} registrado — SEDOM`;
  const html = wrapEmail(
    'Pedido registrado',
    `
      <p>Olá, ${escapeHtml(firstName)}. Seu pedido de medicamento foi registrado pela unidade de saúde e será entregue em seu endereço, sem custo.</p>
      <p><strong>Número do pedido:</strong> ${escapeHtml(order.orderNumber)}<br/>
      <strong>Data:</strong> ${escapeHtml(createdAt)}</p>
      <p style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; text-align: center;">
        <span style="font-size: 13px; color: #475569;">Código de recebimento</span><br/>
        <strong data-pin-code style="font-size: 28px; letter-spacing: 4px; color: #0f4c65;">${escapeHtml(rawPin)}</strong>
      </p>
      <p><strong>Guarde este código.</strong> Ele será solicitado pelo entregador no momento do recebimento. Não compartilhe o código antes de receber o medicamento.</p>
      <p>Acompanhe seu pedido: <a href="${publicLink}">${publicLink}</a></p>
    `
  );

  return { subject, html };
}

// Conteúdo de cada notificação de andamento (#36): curto, sem repetir PIN
// nem endereço completo — só a confirmação inicial carrega o PIN. Cada
// entrada gera o assunto e o corpo a partir do pedido + link público.
const STATUS_EMAIL_CONTENT = {
  separado: {
    subject: (order) => `Pedido ${order.orderNumber} separado — SEDOM`,
    title: 'Medicamento separado',
    body: (firstName) =>
      `<p>Olá, ${firstName}. Seu medicamento já foi separado e será encaminhado para entrega em breve.</p>`,
  },
  em_rota: {
    subject: (order) => `Pedido ${order.orderNumber} saiu para entrega — SEDOM`,
    title: 'Pedido em rota',
    body: (firstName) =>
      `<p>Olá, ${firstName}. Seu medicamento saiu para entrega. Tenha em mãos o código que você recebeu por e-mail (ou o comprovante impresso) para informar ao entregador.</p>`,
  },
  entregue: {
    subject: (order) => `Pedido ${order.orderNumber} entregue — SEDOM`,
    title: 'Entrega concluída',
    body: (firstName) =>
      `<p>Olá, ${firstName}. Sua entrega de medicamento foi registrada como concluída. Em caso de dúvidas, entre em contato com a unidade de saúde.</p>`,
  },
  tentativa_falha: {
    subject: (order) => `Pedido ${order.orderNumber}: entrega não concluída — SEDOM`,
    title: 'Tentativa de entrega não concluída',
    body: (firstName) =>
      `<p>Olá, ${firstName}. Não foi possível concluir a entrega do seu medicamento nesta tentativa. A unidade poderá entrar em contato para orientar os próximos passos.</p>`,
  },
};

export function statusUpdateEmailTemplate(order, kind, baseUrl) {
  const content = STATUS_EMAIL_CONTENT[kind];
  const firstName = escapeHtml(order.patientName.split(' ')[0]);
  const publicLink = getPublicTrackingUrl(order, baseUrl);

  const subject = content.subject(order);
  const html = wrapEmail(
    content.title,
    `${content.body(firstName)}<p>Acompanhe seu pedido: <a href="${publicLink}">${publicLink}</a></p>`
  );

  return { subject, html };
}
