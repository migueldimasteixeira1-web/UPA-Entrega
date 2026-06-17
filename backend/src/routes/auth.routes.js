import { comparePassword, hashPassword } from '../lib/password.js';
import { signToken } from '../lib/jwt.js';
import prisma from '../lib/prisma.js';

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = signToken({ userId: user.id, role: user.role });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro ao realizar login' });
  }
}

export async function me(req, res) {
  res.json({ user: req.user });
}

export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Senha atual e nova senha (mín. 6 caracteres) são obrigatórias' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await comparePassword(currentPassword, user.password);

    if (!valid) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: await hashPassword(newPassword) },
    });

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
}
