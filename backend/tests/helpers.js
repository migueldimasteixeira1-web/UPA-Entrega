import request from 'supertest';
import { createApp } from '../src/app.js';
import prisma from '../src/lib/prisma.js';
import { hashPassword } from '../src/lib/password.js';

// Um único app é reaproveitado por todos os arquivos de teste (fileParallelism
// desligado). Os rate limiters (login, confirmação de entrega) são globais ao
// processo, então um limite baixo aqui derrubaria testes não relacionados com
// 429 — o comportamento dos limiters em si é coberto isoladamente em
// auth.test.js / routes.test.js.
export const app = createApp({
  loginRateLimit: { windowMs: 15 * 60 * 1000, limit: 100000 },
  confirmDeliveryRateLimit: { windowMs: 15 * 60 * 1000, limit: 100000 },
  resendEmailRateLimit: { windowMs: 15 * 60 * 1000, limit: 100000 },
});

export async function createUser({ role = 'OPERADOR', email, password = 'Senha@123', name = 'Usuário Teste', active = true } = {}) {
  const finalEmail = email || `${role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2)}@upa.local`;
  const user = await prisma.user.create({
    data: {
      name,
      email: finalEmail,
      password: await hashPassword(password),
      role,
      active,
    },
  });
  return { ...user, plainPassword: password };
}

export async function loginAs(user) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: user.plainPassword });
  return res.body.token;
}

export async function createPatientWithAddress(overrides = {}) {
  const patient = await prisma.patient.create({
    data: {
      name: 'Paciente Teste',
      cpf: overrides.cpf || String(Date.now()).slice(-11).padStart(11, '0'),
      phone: '22999990000',
      addresses: {
        create: {
          label: 'Residência',
          street: 'Rua Teste',
          number: '1',
          neighborhood: 'Centro',
          city: 'Cabo Frio',
          state: 'RJ',
        },
      },
      ...overrides.data,
    },
    include: { addresses: true },
  });
  return { patient, address: patient.addresses[0] };
}

export async function createMedicationRecord(overrides = {}) {
  return prisma.medication.create({
    data: {
      name: overrides.name || 'Dipirona 500mg',
      unit: overrides.unit || 'comprimido',
      active: overrides.active ?? true,
    },
  });
}

// PIN de teste fixo ('123456') — os testes que precisam confirmar entrega
// enviam esse valor; o hash é o que realmente vai para o banco, igual ao
// fluxo real (ver issue #37).
export const TEST_PIN = '123456';

export async function createOrderRecord({ patientId, addressId, medicationId, status = 'PEDIDO_RECEBIDO', createdById, extra = {} }) {
  const orderNumber = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return prisma.order.create({
    data: {
      orderNumber,
      patientId,
      addressId,
      patientName: 'Paciente Teste',
      patientPhone: '22999990000',
      patientCpf: '00000000000',
      street: 'Rua Teste',
      number: '1',
      neighborhood: 'Centro',
      city: 'Cabo Frio',
      state: 'RJ',
      deliveryPinHash: await hashPassword(TEST_PIN),
      status,
      createdById,
      items: {
        create: {
          medicationId,
          medicationName: 'Dipirona 500mg',
          unit: 'comprimido',
          quantity: 1,
        },
      },
      ...extra,
    },
  });
}
