export const ORDER_STATUS = {
  PEDIDO_CRIADO: 'PEDIDO_CRIADO',
  AGUARDANDO_PAGAMENTO: 'AGUARDANDO_PAGAMENTO',
  FRETE_PAGO: 'FRETE_PAGO',
  AGUARDANDO_RETIRADA: 'AGUARDANDO_RETIRADA',
  EM_ROTA: 'EM_ROTA',
  ENTREGUE: 'ENTREGUE',
  CANCELADO: 'CANCELADO',
};

export const STATUS_LABELS = {
  PEDIDO_CRIADO: 'Pedido criado',
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento do frete',
  FRETE_PAGO: 'Frete pago',
  AGUARDANDO_RETIRADA: 'Entrega solicitada / aguardando retirada',
  EM_ROTA: 'Em rota',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

export const DELIVERY_SERVICE_LABEL = 'Uber Flash';

export const VALID_TRANSITIONS = {
  PEDIDO_CRIADO: ['AGUARDANDO_PAGAMENTO', 'CANCELADO'],
  AGUARDANDO_PAGAMENTO: ['FRETE_PAGO', 'CANCELADO'],
  FRETE_PAGO: ['AGUARDANDO_RETIRADA', 'CANCELADO'],
  AGUARDANDO_RETIRADA: ['EM_ROTA', 'CANCELADO'],
  EM_ROTA: ['ENTREGUE', 'CANCELADO'],
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

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value));
}

export function getPublicTrackingUrl(order, baseUrl) {
  const frontend = baseUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${frontend.replace(/\/$/, '')}/acompanhar/${order.publicToken}`;
}

export function generateMessages(order, baseUrl) {
  const name = order.patientName.split(' ')[0];
  const freight = formatCurrency(order.freightValue);
  const publicLink = getPublicTrackingUrl(order, baseUrl);
  const messages = [];
  const uberRegistered = order.deliveryService === 'UBER_FLASH';

  if (!order.paymentConfirmed) {
    messages.push({
      id: 'pagamento',
      title: 'Solicitação de pagamento do frete',
      text: `Olá, ${name}. Sua entrega de medicamento foi registrada pela UPA. O medicamento não possui custo. O valor do frete é ${freight}. Para dar continuidade, solicitamos o pagamento do frete. Você pode acompanhar o status por aqui: ${publicLink}.`,
    });
    return messages;
  }

  messages.push({
    id: 'pago',
    title: 'Pagamento confirmado',
    text: `Olá, ${name}. Confirmamos o recebimento do pagamento do frete (${freight}). A entrega será solicitada via Uber Flash.`,
  });

  if (uberRegistered && order.deliveryPin) {
    let text = `Olá, ${name}. Sua entrega foi solicitada via Uber Flash. No momento do recebimento, informe ao entregador o PIN: ${order.deliveryPin}.`;
    if (order.trackingLink) {
      text += ` Acompanhe pelo link: ${order.trackingLink}.`;
    }
    text += ` Você também pode consultar o status por aqui: ${publicLink}.`;

    messages.push({
      id: 'uber_flash',
      title: 'Entrega solicitada via Uber Flash',
      text,
    });
  }

  if (order.status === 'EM_ROTA') {
    let text = `Olá, ${name}. Seu medicamento está em rota via Uber Flash.`;
    if (order.deliveryPin) {
      text += ` No momento do recebimento, informe ao entregador o PIN: ${order.deliveryPin}.`;
    }
    if (order.trackingLink) {
      text += ` Acompanhe: ${order.trackingLink}.`;
    }
    text += ` Status: ${publicLink}.`;
    messages.push({ id: 'rota', title: 'Pedido em rota', text });
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

export async function generateOrderNumber(prisma) {
  const today = new Date();
  const prefix = `UPA-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const count = await prisma.order.count({
    where: {
      orderNumber: { startsWith: prefix },
    },
  });
  return `${prefix}-${String(count + 1).padStart(3, '0')}`;
}
