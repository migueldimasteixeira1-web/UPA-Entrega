import prisma from '../lib/prisma.js';
import { buildOrderAuditEntries, buildUberFlashAuditEntries } from '../lib/audit.js';
import {
  canTransition,
  generateMessages,
  generateOrderNumber,
  getPublicTrackingUrl,
  maskCpf,
  maskName,
  STATUS_LABELS,
} from '../lib/constants.js';
import { checkStockAvailability, reserveStock, restoreStock } from '../lib/stock.js';
import { parsePositiveDecimal, parsePositiveInteger } from '../lib/validation.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const orderInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
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

function formatOrder(order) {
  const mainMedication = order.items?.[0]?.medicationName || order.items?.[0]?.medication?.name;
  const uberFlashRegistered = order.deliveryService === 'UBER_FLASH';
  return {
    ...order,
    patientCpf: maskCpf(order.patientCpf),
    mainMedication,
    deliveryServiceLabel: uberFlashRegistered ? 'Uber Flash' : null,
    statusLabel: STATUS_LABELS[order.status],
    hasPin: !!order.deliveryPin,
    hasTracking: !!order.trackingLink,
    uberFlashRegistered,
    canRegisterUberFlash:
      order.paymentConfirmed &&
      order.status === 'FRETE_PAGO' &&
      !uberFlashRegistered &&
      !['ENTREGUE', 'CANCELADO'].includes(order.status),
    publicTrackingUrl: getPublicTrackingUrl(order, FRONTEND_URL),
    messages: generateMessages(order, FRONTEND_URL),
  };
}

export async function listOrders(req, res) {
  try {
    const { status, search, dateFrom, dateTo } = req.query;

    const orders = await prisma.order.findMany({
      where: {
        ...(status && { status }),
        ...(search && {
          OR: [
            { patientName: { contains: search, mode: 'insensitive' } },
            { orderNumber: { contains: search, mode: 'insensitive' } },
            { neighborhood: { contains: search, mode: 'insensitive' } },
            { patientPhone: { contains: search } },
          ],
        }),
        ...(dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom && { gte: new Date(dateFrom) }),
                ...(dateTo && { lte: new Date(`${dateTo}T23:59:59`) }),
              },
            }
          : {}),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        items: {
          take: 1,
          select: { medicationName: true, quantity: true, unit: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      orders.map((order) => ({
        ...order,
        mainMedication: order.items[0]?.medicationName,
        statusLabel: STATUS_LABELS[order.status],
        deliveryServiceLabel: order.deliveryService === 'UBER_FLASH' ? 'Uber Flash' : null,
        hasPin: !!order.deliveryPin,
        hasTracking: !!order.trackingLink,
        freightValue: Number(order.freightValue),
      }))
    );
  } catch (error) {
    console.error('List orders error:', error);
    res.status(500).json({ error: 'Erro ao listar pedidos' });
  }
}

export async function getOrder(req, res) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: orderInclude,
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    res.json({
      ...formatOrder(order),
      freightValue: Number(order.freightValue),
      allowedTransitions: getAllowedTransitions(order),
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Erro ao buscar pedido' });
  }
}

function getAllowedTransitions(order) {
  const base = [];
  const from = order.status;

  if (canTransition(from, 'AGUARDANDO_PAGAMENTO') && from === 'PEDIDO_CRIADO') {
    base.push({ to: 'AGUARDANDO_PAGAMENTO', label: STATUS_LABELS.AGUARDANDO_PAGAMENTO });
  }
  if (canTransition(from, 'FRETE_PAGO') && !order.paymentConfirmed) {
    base.push({ to: 'FRETE_PAGO', label: 'Confirmar pagamento do frete', action: 'confirm_payment' });
  }
  if (
    canTransition(from, 'AGUARDANDO_RETIRADA') &&
    order.paymentConfirmed &&
    order.deliveryService === 'UBER_FLASH' &&
    order.deliveryPin
  ) {
    base.push({ to: 'AGUARDANDO_RETIRADA', label: STATUS_LABELS.AGUARDANDO_RETIRADA });
  }
  if (canTransition(from, 'EM_ROTA')) {
    base.push({ to: 'EM_ROTA', label: STATUS_LABELS.EM_ROTA });
  }
  if (canTransition(from, 'ENTREGUE')) {
    base.push({ to: 'ENTREGUE', label: STATUS_LABELS.ENTREGUE });
  }
  if (canTransition(from, 'CANCELADO')) {
    base.push({ to: 'CANCELADO', label: STATUS_LABELS.CANCELADO, requiresReason: true });
  }

  return base;
}

async function addHistory(tx, { orderId, userId, action, fromStatus, toStatus, details }) {
  return tx.orderHistory.create({
    data: { orderId, userId, action, fromStatus, toStatus, details },
  });
}

function hasUberFlashFields(body) {
  return (
    body.deliveryService !== undefined ||
    body.deliveryPin !== undefined ||
    body.trackingLink !== undefined ||
    body.deliveryNotes !== undefined
  );
}

function validateOrderItems(items) {
  if (!Array.isArray(items) || !items.length) {
    throw new Error('Informe ao menos um medicamento');
  }

  return items.map((item, index) => {
    if (!item?.medicationId?.trim()) {
      throw new Error(`Medicamento inválido no item ${index + 1}`);
    }

    const quantity = parsePositiveInteger(item.quantity, `Quantidade do item ${index + 1}`);

    return {
      medicationId: item.medicationId.trim(),
      quantity,
    };
  });
}

export async function createOrder(req, res) {
  try {
    const {
      patientName,
      patientPhone,
      patientCpf,
      address,
      neighborhood,
      city,
      state,
      zipCode,
      referencePoint,
      internalNotes,
      patientNotes,
      freightValue,
      items,
    } = req.body;

    if (!patientName?.trim() || !patientPhone?.trim() || !address?.trim() || !neighborhood?.trim()) {
      return res.status(400).json({ error: 'Dados do paciente e endereço são obrigatórios' });
    }

    let validatedItems;
    let validatedFreight;
    try {
      validatedItems = validateOrderItems(items);
      validatedFreight = parsePositiveDecimal(freightValue, 'Valor do frete');
    } catch (validationError) {
      return res.status(400).json({ error: validationError.message });
    }

    const orderNumber = await generateOrderNumber(prisma);
    const initialStatus = 'AGUARDANDO_PAGAMENTO';

    const order = await prisma.$transaction(async (tx) => {
      const orderItemsData = await Promise.all(
        validatedItems.map(async (item) => {
          const med = await tx.medication.findUnique({ where: { id: item.medicationId } });
          if (!med || !med.active) {
            throw new Error(`Medicamento inválido: ${item.medicationId}`);
          }
          return {
            medicationId: med.id,
            medicationName: med.name,
            quantity: item.quantity,
            unit: med.unit,
          };
        })
      );

      // Verifica disponibilidade sem baixar estoque (baixa ocorre em "Aguardando retirada")
      await checkStockAvailability(tx, orderItemsData);

      const created = await tx.order.create({
        data: {
          orderNumber,
          patientName: patientName.trim(),
          patientPhone: patientPhone.trim(),
          patientCpf: patientCpf?.replace(/\D/g, '') || null,
          address: address.trim(),
          neighborhood: neighborhood.trim(),
          city: city?.trim() || '',
          state: state?.trim() || '',
          zipCode: zipCode?.trim() || null,
          referencePoint: referencePoint?.trim() || null,
          internalNotes: internalNotes?.trim() || null,
          patientNotes: patientNotes?.trim() || null,
          freightValue: validatedFreight,
          status: initialStatus,
          stockReserved: false,
          createdById: req.user.id,
          items: { create: orderItemsData },
        },
        include: orderInclude,
      });

      await addHistory(tx, {
        orderId: created.id,
        userId: req.user.id,
        action: 'Pedido criado',
        toStatus: initialStatus,
        details: `Pedido ${orderNumber} registrado. Aguardando pagamento do frete.`,
      });

      return created;
    });

    res.status(201).json(formatOrder(order));
  } catch (error) {
    console.error('Create order error:', error);
    if (error.message?.includes('Estoque') || error.message?.includes('Medicamento') || error.message?.includes('Quantidade') || error.message?.includes('item') || error.message?.includes('frete') || error.message?.includes('Valor do frete')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Erro ao criar pedido' });
  }
}

export async function updateOrder(req, res) {
  try {
    const { id } = req.params;
    const body = req.body;

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    if (['ENTREGUE', 'CANCELADO'].includes(existing.status)) {
      return res.status(400).json({ error: 'Pedido finalizado não pode ser editado' });
    }

    if (hasUberFlashFields(body)) {
      return res.status(400).json({
        error: 'Dados do Uber Flash devem ser registrados após confirmação do pagamento',
      });
    }

    if (body.freightValue !== undefined) {
      if (existing.paymentConfirmed) {
        return res.status(400).json({
          error: 'Não é possível alterar o valor do frete após a confirmação do pagamento',
        });
      }

      try {
        parsePositiveDecimal(body.freightValue, 'Valor do frete');
      } catch (validationError) {
        return res.status(400).json({ error: validationError.message });
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      const updateData = {};

      if (body.patientName !== undefined) updateData.patientName = body.patientName.trim();
      if (body.patientPhone !== undefined) updateData.patientPhone = body.patientPhone.trim();
      if (body.patientCpf !== undefined) updateData.patientCpf = body.patientCpf?.replace(/\D/g, '') || null;
      if (body.address !== undefined) updateData.address = body.address.trim();
      if (body.neighborhood !== undefined) updateData.neighborhood = body.neighborhood.trim();
      if (body.city !== undefined) updateData.city = body.city.trim();
      if (body.state !== undefined) updateData.state = body.state.trim();
      if (body.zipCode !== undefined) updateData.zipCode = body.zipCode?.trim() || null;
      if (body.referencePoint !== undefined) updateData.referencePoint = body.referencePoint?.trim() || null;
      if (body.internalNotes !== undefined) updateData.internalNotes = body.internalNotes?.trim() || null;
      if (body.patientNotes !== undefined) updateData.patientNotes = body.patientNotes?.trim() || null;
      if (body.freightValue !== undefined) {
        updateData.freightValue = parsePositiveDecimal(body.freightValue, 'Valor do frete');
      }

      const updated = await tx.order.update({
        where: { id },
        data: updateData,
        include: orderInclude,
      });

      const auditEntries = buildOrderAuditEntries(existing, body, updated);
      for (const entry of auditEntries) {
        await addHistory(tx, {
          orderId: id,
          userId: req.user.id,
          ...entry,
        });
      }

      return updated;
    });

    res.json({
      ...formatOrder(order),
      allowedTransitions: getAllowedTransitions(order),
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Erro ao atualizar pedido' });
  }
}

export async function confirmPayment(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    if (existing.paymentConfirmed) {
      return res.status(400).json({ error: 'Pagamento já confirmado' });
    }

    if (!['PEDIDO_CRIADO', 'AGUARDANDO_PAGAMENTO'].includes(existing.status)) {
      return res.status(400).json({ error: 'Pagamento só pode ser confirmado nesta etapa' });
    }

    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          paymentConfirmed: true,
          paymentConfirmedAt: new Date(),
          paymentConfirmedById: req.user.id,
          status: 'FRETE_PAGO',
        },
        include: orderInclude,
      });

      await addHistory(tx, {
        orderId: id,
        userId: req.user.id,
        action: 'Pagamento do frete confirmado',
        fromStatus: existing.status,
        toStatus: 'FRETE_PAGO',
        details: `Frete de R$ ${Number(existing.freightValue).toFixed(2)} confirmado manualmente`,
      });

      return tx.order.findUnique({ where: { id }, include: orderInclude });
    });

    res.json({
      ...formatOrder(order),
      allowedTransitions: getAllowedTransitions(order),
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: 'Erro ao confirmar pagamento' });
  }
}

export async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, cancelReason, notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }

    const existing = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    if (!canTransition(existing.status, status)) {
      return res.status(400).json({
        error: `Transição inválida de "${STATUS_LABELS[existing.status]}" para "${STATUS_LABELS[status]}"`,
      });
    }

    if (status === 'CANCELADO' && !cancelReason?.trim()) {
      return res.status(400).json({ error: 'Motivo do cancelamento é obrigatório' });
    }

    if (status === 'FRETE_PAGO' && !existing.paymentConfirmed) {
      return res.status(400).json({ error: 'Confirme o pagamento antes de avançar' });
    }

    if (status === 'AGUARDANDO_RETIRADA') {
      if (!existing.paymentConfirmed) {
        return res.status(400).json({ error: 'Confirme o pagamento do frete antes de avançar' });
      }
      if (existing.deliveryService !== 'UBER_FLASH') {
        return res.status(400).json({ error: 'Registre os dados do Uber Flash antes de avançar' });
      }
      if (!existing.deliveryPin) {
        return res.status(400).json({ error: 'Registre o PIN do Uber Flash antes de avançar' });
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      const updateData = {
        status,
        ...(status === 'CANCELADO' && { cancelReason: cancelReason.trim() }),
        ...(status === 'ENTREGUE' && {
          deliveredAt: new Date(),
          deliveredById: req.user.id,
        }),
      };

      if (status === 'AGUARDANDO_RETIRADA' && !existing.stockReserved) {
        await reserveStock(tx, existing.items);
        updateData.stockReserved = true;

        await addHistory(tx, {
          orderId: id,
          userId: req.user.id,
          action: 'Estoque baixado',
          details: 'Medicamentos reservados para separação e retirada',
        });
      }

      const updated = await tx.order.update({
        where: { id },
        data: updateData,
        include: orderInclude,
      });

      if (status === 'CANCELADO' && existing.stockReserved) {
        await restoreStock(tx, existing.items);
        await addHistory(tx, {
          orderId: id,
          userId: req.user.id,
          action: 'Estoque devolvido',
          details: 'Quantidades restauradas após cancelamento',
        });
      }

      const statusAction =
        status === 'CANCELADO'
          ? 'Pedido cancelado'
          : status === 'ENTREGUE'
            ? 'Pedido entregue'
            : 'Status alterado';

      await addHistory(tx, {
        orderId: id,
        userId: req.user.id,
        action: statusAction,
        fromStatus: existing.status,
        toStatus: status,
        details: notes?.trim() || (status === 'CANCELADO' ? cancelReason.trim() : STATUS_LABELS[status]),
      });

      return tx.order.findUnique({ where: { id }, include: orderInclude });
    });

    res.json({
      ...formatOrder(order),
      allowedTransitions: getAllowedTransitions(order),
    });
  } catch (error) {
    console.error('Update status error:', error);
    if (error.message?.includes('Estoque')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
}

export async function registerUberFlash(req, res) {
  try {
    const { id } = req.params;
    const { deliveryPin, trackingLink, deliveryNotes } = req.body;

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    if (!existing.paymentConfirmed) {
      return res.status(400).json({ error: 'Confirme o pagamento do frete antes de registrar o Uber Flash' });
    }

    if (!['FRETE_PAGO', 'AGUARDANDO_RETIRADA', 'EM_ROTA'].includes(existing.status)) {
      return res.status(400).json({ error: 'Dados do Uber Flash não podem ser alterados nesta etapa' });
    }

    const pin = deliveryPin?.trim() || null;

    if (!pin) {
      return res.status(400).json({ error: 'PIN do Uber Flash é obrigatório' });
    }

    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          deliveryService: 'UBER_FLASH',
          deliveryPin: pin,
          trackingLink: trackingLink?.trim() || null,
          deliveryNotes: deliveryNotes?.trim() || null,
        },
        include: orderInclude,
      });

      const auditBody = { deliveryPin: pin, trackingLink, deliveryNotes };
      for (const entry of buildUberFlashAuditEntries(existing, auditBody)) {
        await addHistory(tx, {
          orderId: id,
          userId: req.user.id,
          ...entry,
        });
      }

      return tx.order.findUnique({ where: { id }, include: orderInclude });
    });

    res.json({
      ...formatOrder(order),
      allowedTransitions: getAllowedTransitions(order),
    });
  } catch (error) {
    console.error('Register Uber Flash error:', error);
    res.status(500).json({ error: 'Erro ao registrar dados do Uber Flash' });
  }
}

export async function addNote(req, res) {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note?.trim()) {
      return res.status(400).json({ error: 'Observação é obrigatória' });
    }

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    await prisma.orderHistory.create({
      data: {
        orderId: id,
        userId: req.user.id,
        action: 'Observação adicionada',
        details: note.trim(),
      },
    });

    const order = await prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });

    res.json(formatOrder(order));
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({ error: 'Erro ao adicionar observação' });
  }
}

export async function getPublicOrder(req, res) {
  try {
    const order = await prisma.order.findUnique({
      where: { publicToken: req.params.token },
      include: {
        items: { select: { medicationName: true, quantity: true, unit: true } },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const statusMessages = {
      PEDIDO_CRIADO: 'Seu pedido foi registrado pela UPA.',
      AGUARDANDO_PAGAMENTO: 'Aguardando confirmação do pagamento do frete.',
      FRETE_PAGO: 'Pagamento do frete confirmado. A UPA solicitará a entrega via Uber Flash.',
      AGUARDANDO_RETIRADA: 'Entrega solicitada. Aguardando retirada do medicamento na UPA.',
      EM_ROTA: 'Seu medicamento está em rota.',
      ENTREGUE: 'Entrega concluída com sucesso.',
      CANCELADO: 'Este pedido foi cancelado.',
    };

    res.json({
      orderNumber: order.orderNumber,
      patientName: maskName(order.patientName),
      status: order.status,
      statusLabel: STATUS_LABELS[order.status],
      statusMessage: statusMessages[order.status],
      paymentConfirmed: order.paymentConfirmed,
      uberFlashRegistered: order.deliveryService === 'UBER_FLASH',
      deliveryService: order.deliveryService === 'UBER_FLASH' ? 'Uber Flash' : null,
      trackingLink: order.trackingLink,
      hasPin: !!order.deliveryPin,
      pinInstruction: order.deliveryPin
        ? 'Informe o PIN ao entregador no momento do recebimento. Este código garante a entrega segura.'
        : order.paymentConfirmed
          ? 'A UPA enviará orientações sobre o PIN quando a entrega for solicitada via Uber Flash.'
          : 'Quando disponível, a UPA enviará orientações sobre o PIN de entrega.',
      freightInfo: 'O medicamento não possui custo. O valor cobrado é referente apenas ao frete de entrega.',
      items: order.items.map((i) => ({
        name: 'Medicamento',
        quantity: i.quantity,
        unit: i.unit,
      })),
      updatedAt: order.updatedAt,
      readOnly: true,
    });
  } catch (error) {
    console.error('Public order error:', error);
    res.status(500).json({ error: 'Erro ao consultar pedido' });
  }
}

export async function getDashboardStats(req, res) {
  try {
    const [total, byStatus] = await Promise.all([
      prisma.order.count({ where: { status: { not: 'CANCELADO' } } }),
      prisma.order.groupBy({ by: ['status'], _count: true }),
    ]);

    const medications = await prisma.medication.findMany({
      where: { active: true },
      select: { quantity: true, minStock: true },
    });
    const lowStockCount = medications.filter((m) => m.quantity <= m.minStock).length;

    const pendingPayment = await prisma.order.count({
      where: { status: 'AGUARDANDO_PAGAMENTO' },
    });
    const inRoute = await prisma.order.count({ where: { status: 'EM_ROTA' } });
    const awaitingPickup = await prisma.order.count({ where: { status: 'AGUARDANDO_RETIRADA' } });

    res.json({
      total,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      pendingPayment,
      inRoute,
      awaitingPickup,
      lowStockCount,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
}
