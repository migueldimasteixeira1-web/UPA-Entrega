import prisma from '../lib/prisma.js';
import { buildOrderAuditEntries } from '../lib/audit.js';
import {
  canTransition,
  generateDeliveryPin,
  generateMessages,
  generateOrderNumber,
  getPublicTrackingUrl,
  maskCpf,
  maskName,
  STATUS_LABELS,
} from '../lib/constants.js';
import { parsePositiveInteger, validateCpf } from '../lib/validation.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const orderInclude = {
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

function formatOrder(order) {
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
        route: { select: { routeNumber: true, courier: { select: { name: true } } } },
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

  if (canTransition(from, 'EM_SEPARACAO')) {
    base.push({ to: 'EM_SEPARACAO', label: STATUS_LABELS.EM_SEPARACAO });
  }
  if (canTransition(from, 'SEPARADO')) {
    base.push({ to: 'SEPARADO', label: STATUS_LABELS.SEPARADO });
  }
  if (canTransition(from, 'AGUARDANDO_SAIDA')) {
    base.push({ to: 'AGUARDANDO_SAIDA', label: STATUS_LABELS.AGUARDANDO_SAIDA });
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

async function resolvePatient(tx, { patientId, patient }) {
  if (patientId) {
    const existing = await tx.patient.findUnique({ where: { id: patientId } });
    if (!existing) throw new Error('Paciente não encontrado');
    return existing;
  }

  if (!patient?.name?.trim() || !patient?.phone?.trim()) {
    throw new Error('Dados do paciente são obrigatórios');
  }

  const cpfDigits = validateCpf(patient.cpf);
  const existingByCpf = await tx.patient.findUnique({ where: { cpf: cpfDigits } });
  if (existingByCpf) {
    throw new Error('Já existe um paciente cadastrado com este CPF. Busque pelo CPF antes de criar um novo.');
  }

  return tx.patient.create({
    data: {
      name: patient.name.trim(),
      cpf: cpfDigits,
      phone: patient.phone.trim(),
    },
  });
}

async function resolveAddress(tx, { addressId, address }, patientId) {
  if (addressId) {
    const existing = await tx.address.findUnique({ where: { id: addressId } });
    if (!existing || existing.patientId !== patientId) {
      throw new Error('Endereço inválido para este paciente');
    }
    return existing;
  }

  const required = ['street', 'number', 'neighborhood', 'city', 'state'];
  for (const field of required) {
    if (!address?.[field]?.toString().trim()) {
      throw new Error(`Endereço incompleto: informe ${field}`);
    }
  }

  return tx.address.create({
    data: {
      patientId,
      label: address.label?.trim() || 'Endereço',
      street: address.street.trim(),
      number: address.number.trim(),
      complement: address.complement?.trim() || null,
      neighborhood: address.neighborhood.trim(),
      city: address.city.trim(),
      state: address.state.trim(),
      zipCode: address.zipCode?.trim() || null,
      referencePoint: address.referencePoint?.trim() || null,
    },
  });
}

export async function createOrder(req, res) {
  try {
    const { patientId, patient, addressId, address, internalNotes, patientNotes, items } = req.body;

    let validatedItems;
    try {
      validatedItems = validateOrderItems(items);
    } catch (validationError) {
      return res.status(400).json({ error: validationError.message });
    }

    const order = await prisma.$transaction(async (tx) => {
      const resolvedPatient = await resolvePatient(tx, { patientId, patient });
      const resolvedAddress = await resolveAddress(tx, { addressId, address }, resolvedPatient.id);

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

      const orderNumber = await generateOrderNumber(tx);

      const created = await tx.order.create({
        data: {
          orderNumber,
          patientId: resolvedPatient.id,
          addressId: resolvedAddress.id,
          patientName: resolvedPatient.name,
          patientPhone: resolvedPatient.phone,
          patientCpf: resolvedPatient.cpf,
          street: resolvedAddress.street,
          number: resolvedAddress.number,
          complement: resolvedAddress.complement,
          neighborhood: resolvedAddress.neighborhood,
          city: resolvedAddress.city,
          state: resolvedAddress.state,
          zipCode: resolvedAddress.zipCode,
          referencePoint: resolvedAddress.referencePoint,
          internalNotes: internalNotes?.trim() || null,
          patientNotes: patientNotes?.trim() || null,
          deliveryPin: generateDeliveryPin(),
          status: 'PEDIDO_RECEBIDO',
          createdById: req.user.id,
          items: { create: orderItemsData },
        },
        include: orderInclude,
      });

      await addHistory(tx, {
        orderId: created.id,
        userId: req.user.id,
        action: 'Pedido criado',
        toStatus: 'PEDIDO_RECEBIDO',
        details: `Pedido ${orderNumber} registrado para entrega`,
      });

      return created;
    });

    res.status(201).json(formatOrder(order));
  } catch (error) {
    console.error('Create order error:', error);
    if (
      error.message?.includes('Medicamento') ||
      error.message?.includes('Quantidade') ||
      error.message?.includes('item') ||
      error.message?.includes('paciente') ||
      error.message?.includes('Paciente') ||
      error.message?.includes('CPF') ||
      error.message?.includes('Endereço') ||
      error.message?.includes('endereço')
    ) {
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

    if (!['PEDIDO_RECEBIDO', 'EM_SEPARACAO'].includes(existing.status)) {
      return res.status(400).json({ error: 'Pedido só pode ser editado enquanto está recebido ou em separação' });
    }

    let validatedItems;
    if (body.items !== undefined) {
      try {
        validatedItems = validateOrderItems(body.items);
      } catch (validationError) {
        return res.status(400).json({ error: validationError.message });
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      const updateData = {};
      if (body.internalNotes !== undefined) updateData.internalNotes = body.internalNotes?.trim() || null;
      if (body.patientNotes !== undefined) updateData.patientNotes = body.patientNotes?.trim() || null;

      if (validatedItems) {
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

        await tx.orderItem.deleteMany({ where: { orderId: id } });
        updateData.items = { create: orderItemsData };
      }

      const updated = await tx.order.update({
        where: { id },
        data: updateData,
        include: orderInclude,
      });

      const auditEntries = buildOrderAuditEntries(existing, body);
      for (const entry of auditEntries) {
        await addHistory(tx, { orderId: id, userId: req.user.id, ...entry });
      }

      return updated;
    });

    res.json({
      ...formatOrder(order),
      allowedTransitions: getAllowedTransitions(order),
    });
  } catch (error) {
    console.error('Update order error:', error);
    if (error.message?.includes('Medicamento') || error.message?.includes('Quantidade')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Erro ao atualizar pedido' });
  }
}

export async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, cancelReason, notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }

    const existing = await prisma.order.findUnique({ where: { id } });
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

    const order = await prisma.$transaction(async (tx) => {
      const updateData = {
        status,
        ...(status === 'CANCELADO' && { cancelReason: cancelReason.trim() }),
      };

      const updated = await tx.order.update({
        where: { id },
        data: updateData,
        include: orderInclude,
      });

      const statusAction = status === 'CANCELADO' ? 'Pedido cancelado' : 'Status alterado';

      await addHistory(tx, {
        orderId: id,
        userId: req.user.id,
        action: statusAction,
        fromStatus: existing.status,
        toStatus: status,
        details: notes?.trim() || (status === 'CANCELADO' ? cancelReason.trim() : STATUS_LABELS[status]),
      });

      return updated;
    });

    res.json({
      ...formatOrder(order),
      allowedTransitions: getAllowedTransitions(order),
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
}

export async function confirmDelivery(req, res) {
  try {
    const { id } = req.params;
    const { pin } = req.body;

    if (!pin?.trim()) {
      return res.status(400).json({ error: 'Informe o PIN de confirmação' });
    }

    const existing = await prisma.order.findUnique({
      where: { id },
      include: { route: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    if (existing.status !== 'EM_ROTA') {
      return res.status(400).json({ error: 'Pedido não está em rota de entrega' });
    }

    const isOwningCourier = existing.route && existing.route.courierId === req.user.id;
    if (req.user.role !== 'ADMIN' && !isOwningCourier) {
      return res.status(403).json({ error: 'Você não é o entregador responsável por este pedido' });
    }

    if (pin.trim() !== existing.deliveryPin) {
      return res.status(400).json({ error: 'PIN incorreto' });
    }

    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { status: 'ENTREGUE', deliveredAt: new Date(), deliveredById: req.user.id },
        include: orderInclude,
      });

      await addHistory(tx, {
        orderId: id,
        userId: req.user.id,
        action: 'Pedido entregue',
        fromStatus: 'EM_ROTA',
        toStatus: 'ENTREGUE',
        details: 'Entrega confirmada com PIN',
      });

      if (existing.routeId) {
        const remaining = await tx.order.count({
          where: { routeId: existing.routeId, status: { notIn: ['ENTREGUE', 'CANCELADO'] } },
        });
        if (remaining === 0) {
          await tx.route.update({
            where: { id: existing.routeId },
            data: { status: 'FINALIZADA', finishedAt: new Date() },
          });
        }
      }

      return updated;
    });

    res.json({
      ...formatOrder(order),
      allowedTransitions: getAllowedTransitions(order),
    });
  } catch (error) {
    console.error('Confirm delivery error:', error);
    res.status(500).json({ error: 'Erro ao confirmar entrega' });
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

const PUBLIC_STATUS_MESSAGES = {
  PEDIDO_RECEBIDO: 'Seu pedido foi registrado pela UPA e será separado em breve.',
  EM_SEPARACAO: 'Seu medicamento está sendo separado na farmácia da UPA.',
  SEPARADO: 'Seu medicamento já foi separado e será encaminhado para entrega.',
  AGUARDANDO_SAIDA: 'Seu pedido está pronto e aguardando saída para entrega.',
  EM_ROTA: 'Seu medicamento está a caminho do seu endereço.',
  ENTREGUE: 'Entrega concluída com sucesso.',
  CANCELADO: 'Este pedido foi cancelado.',
};

export async function getPublicOrder(req, res) {
  try {
    const order = await prisma.order.findUnique({
      where: { publicToken: req.params.token },
      include: {
        items: { select: { medicationName: true, quantity: true, unit: true } },
        route: { select: { courier: { select: { name: true } } } },
        history: {
          orderBy: { createdAt: 'asc' },
          select: { action: true, toStatus: true, createdAt: true },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    res.json({
      orderNumber: order.orderNumber,
      patientName: maskName(order.patientName),
      status: order.status,
      statusLabel: STATUS_LABELS[order.status],
      statusMessage: PUBLIC_STATUS_MESSAGES[order.status],
      courierName: order.route?.courier?.name || null,
      deliveryPin: order.deliveryPin,
      pinInstruction: 'Informe este código ao entregador no momento do recebimento. Ele garante a entrega segura do medicamento.',
      items: order.items.map((i) => ({
        name: i.medicationName,
        quantity: i.quantity,
        unit: i.unit,
      })),
      history: order.history.map((h) => ({
        action: h.action,
        statusLabel: h.toStatus ? STATUS_LABELS[h.toStatus] : null,
        createdAt: h.createdAt,
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

    const statusCounts = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const deliveredToday = await prisma.order.count({
      where: { status: 'ENTREGUE', deliveredAt: { gte: startOfToday } },
    });

    res.json({
      total,
      byStatus: statusCounts,
      emSeparacao: statusCounts.EM_SEPARACAO || 0,
      aguardandoSaida: statusCounts.AGUARDANDO_SAIDA || 0,
      emRota: statusCounts.EM_ROTA || 0,
      deliveredToday,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
}
