import prisma from '../lib/prisma.js';
import { buildOrderAuditEntries } from '../lib/audit.js';
import {
  canTransition,
  generateDeliveryPin,
  generateOrderNumber,
  maskCpf,
  maskName,
  STATUS_LABELS,
} from '../lib/constants.js';
import { ORDER_INCLUDE as orderInclude, formatOrder, formatOrderForCourier } from '../lib/orderSerializer.js';
import { validateCpf } from '../lib/validation.js';
import { toCsv } from '../lib/csv.js';
import { enqueueConfirmationEmail, enqueueStatusEmail, EMAIL_TYPE } from '../lib/email/queue.js';
import { hashPassword, comparePassword } from '../lib/password.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Compartilhado entre listOrders e exportOrdersCsv — os dois filtram do
// mesmo jeito, só muda o formato da resposta.
function buildOrdersWhere({ status, search, dateFrom, dateTo, courierId }) {
  const searchDigits = search ? search.replace(/\D/g, '') : '';

  return {
    ...(status && { status }),
    ...(search && {
      OR: [
        { patientName: { contains: search, mode: 'insensitive' } },
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { neighborhood: { contains: search, mode: 'insensitive' } },
        { patientPhone: { contains: search } },
        // CPF é salvo só com dígitos — busca pelo texto digitado
        // (com ou sem pontuação) precisa comparar contra os dígitos.
        ...(searchDigits ? [{ patientCpf: { contains: searchDigits } }] : []),
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
    ...(courierId && { route: { courierId } }),
  };
}

export async function listOrders(req, res) {
  try {
    const orders = await prisma.order.findMany({
      where: buildOrdersWhere(req.query),
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
        patientCpf: maskCpf(order.patientCpf),
        mainMedication: order.items[0]?.medicationName,
        statusLabel: STATUS_LABELS[order.status],
      }))
    );
  } catch (error) {
    console.error('List orders error:', error);
    res.status(500).json({ error: 'Erro ao listar pedidos' });
  }
}

const CSV_HEADERS = [
  'Pedido',
  'Paciente',
  'Status',
  'Criado em',
  'Entregue em',
  'Entregador',
  'Motivo do cancelamento',
];

export async function exportOrdersCsv(req, res) {
  try {
    const orders = await prisma.order.findMany({
      where: buildOrdersWhere(req.query),
      include: {
        route: { select: { courier: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = orders.map((order) => [
      order.orderNumber,
      order.patientName,
      STATUS_LABELS[order.status],
      order.createdAt.toISOString(),
      order.deliveredAt ? order.deliveredAt.toISOString() : '',
      order.route?.courier?.name || '',
      order.cancelReason || '',
    ]);

    const csv = toCsv(CSV_HEADERS, rows);
    const filename = `upa-entrega-pedidos-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // BOM: Excel no Windows abre acento corretamente sem isso adivinhar o encoding errado.
    res.send('﻿' + csv);
  } catch (error) {
    console.error('Export orders CSV error:', error);
    res.status(500).json({ error: 'Erro ao exportar relatório' });
  }
}

const HISTORY_PAGE_SIZE = 50;

// Visão cruzada entre pedidos — "o que o Operador X fez hoje", sem precisar
// abrir pedido por pedido. O histórico por pedido já existe em getOrder
// (order.history); isto agrega OrderHistory de todos os pedidos.
export async function listOrderHistory(req, res) {
  try {
    const { userId, dateFrom, dateTo } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    const where = {
      ...(userId && { userId }),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(`${dateTo}T23:59:59`) }),
            },
          }
        : {}),
    };

    const [total, entries] = await Promise.all([
      prisma.orderHistory.count({ where }),
      prisma.orderHistory.findMany({
        where,
        include: {
          user: { select: { id: true, name: true } },
          order: { select: { id: true, orderNumber: true, patientName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * HISTORY_PAGE_SIZE,
        take: HISTORY_PAGE_SIZE,
      }),
    ]);

    res.json({
      items: entries.map((entry) => ({
        id: entry.id,
        action: entry.action,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        details: entry.details,
        createdAt: entry.createdAt,
        user: entry.user,
        order: entry.order,
      })),
      total,
      page,
      pageSize: HISTORY_PAGE_SIZE,
    });
  } catch (error) {
    console.error('List order history error:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
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

async function resolvePatient(tx, { patientId, patient }) {
  if (patientId) {
    const existing = await tx.patient.findUnique({ where: { id: patientId } });
    if (!existing) throw new Error('Paciente não encontrado');
    return existing;
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
      email: patient.email?.trim() || null,
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

    const order = await prisma.$transaction(async (tx) => {
      const resolvedPatient = await resolvePatient(tx, { patientId, patient });
      const resolvedAddress = await resolveAddress(tx, { addressId, address }, resolvedPatient.id);

      const orderItemsData = await Promise.all(
        items.map(async (item) => {
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
      // Único lugar do sistema que segura o PIN em texto puro — usado só
      // para o hash gravado no banco e para o e-mail de confirmação; nunca
      // volta a existir em lugar nenhum depois deste bloco.
      const rawPin = generateDeliveryPin();

      const created = await tx.order.create({
        data: {
          orderNumber,
          patientId: resolvedPatient.id,
          addressId: resolvedAddress.id,
          patientName: resolvedPatient.name,
          patientPhone: resolvedPatient.phone,
          patientCpf: resolvedPatient.cpf,
          patientEmail: resolvedPatient.email,
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
          deliveryPinHash: await hashPassword(rawPin),
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

      // `created` já foi buscado com orderInclude (que traz `emails`) antes
      // desta linha existir — sem reatribuir aqui, computeEmailStatus veria
      // sempre `emails: []` e reportaria "sem_email" mesmo tendo acabado de
      // enfileirar.
      const emailRow = await enqueueConfirmationEmail(tx, created, rawPin, FRONTEND_URL);
      created.emails = emailRow ? [emailRow] : [];

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

    const order = await prisma.$transaction(async (tx) => {
      const updateData = {};
      if (body.internalNotes !== undefined) updateData.internalNotes = body.internalNotes?.trim() || null;
      if (body.patientNotes !== undefined) updateData.patientNotes = body.patientNotes?.trim() || null;

      if (body.items) {
        const orderItemsData = await Promise.all(
          body.items.map(async (item) => {
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

      if (status === 'SEPARADO') {
        await enqueueStatusEmail(tx, updated, 'separado', FRONTEND_URL);
      }
      // "Tentativa de entrega não concluída": só quando o cancelamento
      // interrompe uma entrega já em andamento (EM_ROTA) — cancelamento a
      // partir de qualquer outro status não é uma tentativa de entrega
      // frustrada, é o pedido nunca ter chegado a sair.
      if (status === 'CANCELADO' && existing.status === 'EM_ROTA') {
        await enqueueStatusEmail(tx, updated, 'tentativa_falha', FRONTEND_URL);
      }

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

    if (!(await comparePassword(pin.trim(), existing.deliveryPinHash))) {
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

      await enqueueStatusEmail(tx, updated, 'entregue', FRONTEND_URL);

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

    // confirmDelivery é chamado tanto por ADMIN quanto por ENTREGADOR
    // (requireRole('ADMIN', 'ENTREGADOR') em app.js) — a própria resposta
    // desta requisição não pode vazar o PIN pro entregador que acabou de
    // usá-lo, mesmo que já "gasto". Achado ao ligar o e-mail de confirmação
    // (que embute o PIN no HTML) neste mesmo include.
    const formatter = req.user.role === 'ENTREGADOR' ? formatOrderForCourier : formatOrder;

    res.json({
      ...formatter(order),
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

// Reenvia o e-mail de confirmação com o mesmo conteúdo já gerado — nunca
// re-renderiza a partir do PIN (que agora só existe como hash, irreversível
// por design). Clona o texto do e-mail enfileirado mais recente pra esse
// pedido; é por isso que o registro em EmailNotification nunca é apagado.
export async function resendConfirmationEmail(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const lastEmail = await prisma.emailNotification.findFirst({
      where: { orderId: id, type: EMAIL_TYPE.CONFIRMACAO_PEDIDO },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastEmail) {
      return res.status(400).json({ error: 'Nenhum e-mail de confirmação foi enviado para este pedido' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.emailNotification.create({
        data: {
          orderId: id,
          type: EMAIL_TYPE.CONFIRMACAO_PEDIDO,
          to: lastEmail.to,
          subject: lastEmail.subject,
          html: lastEmail.html,
        },
      });

      await addHistory(tx, {
        orderId: id,
        userId: req.user.id,
        action: 'E-mail reenviado',
        details: `Confirmação reenviada para ${lastEmail.to}`,
      });
    });

    const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });

    res.json(formatOrder(order));
  } catch (error) {
    console.error('Resend confirmation email error:', error);
    res.status(500).json({ error: 'Erro ao reenviar e-mail' });
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
