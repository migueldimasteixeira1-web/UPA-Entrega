import { hashPassword } from '../lib/password.js';
import prisma from '../lib/prisma.js';

const VALID_ROLES = ['ADMIN', 'OPERADOR', 'ENTREGADOR'];

function normalizeRole(role) {
  return VALID_ROLES.includes(role) ? role : 'OPERADOR';
}

// Sem dado sensível (email, papel, criado em) — só o suficiente pra montar
// um seletor de entregador. ADMIN e OPERADOR podem chamar (montar rota e
// filtrar o painel são tarefas de ambos), diferente de listUsers, que é
// gestão de usuário de verdade e continua restrita a ADMIN.
//
// activeDeliveries: quantos pedidos EM_ROTA esse entregador tem agora —
// informativo pro despachante escolher entre vários entregadores
// disponíveis (issue #102), não é usado pra nenhuma sugestão automática.
export async function listCouriers(req, res) {
  try {
    const couriers = await prisma.user.findMany({
      where: { role: 'ENTREGADOR', active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const pendingOrders = await prisma.order.findMany({
      where: { status: 'EM_ROTA', route: { courierId: { in: couriers.map((c) => c.id) } } },
      select: { route: { select: { courierId: true } } },
    });
    const loadByCourier = pendingOrders.reduce((acc, order) => {
      acc[order.route.courierId] = (acc[order.route.courierId] || 0) + 1;
      return acc;
    }, {});

    res.json(couriers.map((c) => ({ ...c, activeDeliveries: loadByCourier[c.id] || 0 })));
  } catch (error) {
    console.error('List couriers error:', error);
    res.status(500).json({ error: 'Erro ao listar entregadores' });
  }
}

export async function listUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });
    res.json(users);
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
}

export async function createUser(req, res) {
  try {
    const { name, email, password, role } = req.body;

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: await hashPassword(password),
        role: normalizeRole(role),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
}

export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, email, role, active } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (id === req.user.id && active === false) {
      return res.status(400).json({ error: 'Você não pode desativar sua própria conta' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(email && { email: email.toLowerCase().trim() }),
        ...(role && { role: normalizeRole(role) }),
        ...(typeof active === 'boolean' && { active }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
}

export async function resetPassword(req, res) {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    await prisma.user.update({
      where: { id },
      data: { password: await hashPassword(password) },
    });

    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
}
