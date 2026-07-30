import prisma from '../lib/prisma.js';
import { generateRouteNumber, STATUS_LABELS } from '../lib/constants.js';
import { formatOrderForCourier } from '../lib/orderSerializer.js';

const routeInclude = {
  courier: { select: { id: true, name: true, phone: true } },
  createdBy: { select: { id: true, name: true } },
  orders: {
    orderBy: { routeSequence: 'asc' },
    include: {
      items: { select: { medicationName: true, quantity: true, unit: true } },
    },
  },
};

function formatRoute(route) {
  return {
    ...route,
    orders: route.orders.map((order) => ({
      ...order,
      statusLabel: STATUS_LABELS[order.status],
    })),
  };
}

// Usa o mesmo formatOrderForCourier de orderSerializer.js que protege
// /api/orders/:id e /api/delivery-routes/mine — um único lugar decide o que
// o papel ENTREGADOR pode ver (nunca o PIN, CPF sempre mascarado).
function formatRouteForCourier(route) {
  return {
    ...route,
    orders: route.orders.map(formatOrderForCourier),
  };
}

export async function listRoutes(req, res) {
  try {
    const { status } = req.query;

    const routes = await prisma.route.findMany({
      where: { ...(status && { status }) },
      include: routeInclude,
      orderBy: { createdAt: 'desc' },
    });

    res.json(routes.map(formatRoute));
  } catch (error) {
    console.error('List routes error:', error);
    res.status(500).json({ error: 'Erro ao listar rotas' });
  }
}

export async function getRoute(req, res) {
  try {
    const route = await prisma.route.findUnique({
      where: { id: req.params.id },
      include: routeInclude,
    });

    if (!route) {
      return res.status(404).json({ error: 'Rota não encontrada' });
    }

    res.json(formatRoute(route));
  } catch (error) {
    console.error('Get route error:', error);
    res.status(500).json({ error: 'Erro ao buscar rota' });
  }
}

export async function getMyRoutes(req, res) {
  try {
    const routes = await prisma.route.findMany({
      where: { courierId: req.user.id, status: 'EM_ANDAMENTO' },
      include: routeInclude,
      orderBy: { createdAt: 'desc' },
    });

    res.json(routes.map(formatRouteForCourier));
  } catch (error) {
    console.error('Get my routes error:', error);
    res.status(500).json({ error: 'Erro ao buscar suas rotas' });
  }
}

export async function createRoute(req, res) {
  try {
    const { courierId, orderIds } = req.body;

    const courier = await prisma.user.findUnique({ where: { id: courierId } });
    if (!courier || courier.role !== 'ENTREGADOR' || !courier.active) {
      return res.status(400).json({ error: 'Entregador inválido ou inativo' });
    }

    const orders = await prisma.order.findMany({ where: { id: { in: orderIds } } });
    if (orders.length !== orderIds.length) {
      return res.status(400).json({ error: 'Um ou mais pedidos não foram encontrados' });
    }

    const invalidOrder = orders.find((o) => o.status !== 'AGUARDANDO_SAIDA');
    if (invalidOrder) {
      return res.status(400).json({
        error: `Pedido ${invalidOrder.orderNumber} não está aguardando saída`,
      });
    }

    const route = await prisma.$transaction(async (tx) => {
      const routeNumber = await generateRouteNumber(tx);

      const created = await tx.route.create({
        data: {
          routeNumber,
          courierId,
          createdById: req.user.id,
          status: 'EM_ANDAMENTO',
        },
      });

      for (let i = 0; i < orderIds.length; i += 1) {
        const orderId = orderIds[i];
        await tx.order.update({
          where: { id: orderId },
          data: { routeId: created.id, routeSequence: i, status: 'EM_ROTA' },
        });

        await tx.orderHistory.create({
          data: {
            orderId,
            userId: req.user.id,
            action: 'Pedido em rota',
            fromStatus: 'AGUARDANDO_SAIDA',
            toStatus: 'EM_ROTA',
            details: `Vinculado à rota ${routeNumber} (${courier.name})`,
          },
        });
      }

      return tx.route.findUnique({ where: { id: created.id }, include: routeInclude });
    });

    res.status(201).json(formatRoute(route));
  } catch (error) {
    console.error('Create route error:', error);
    res.status(500).json({ error: 'Erro ao criar rota' });
  }
}
