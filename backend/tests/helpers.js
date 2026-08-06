import request from 'supertest';
import sharp from 'sharp';
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

// PNG 4x4 gerado pelo próprio sharp (já é dependência do projeto) — garante
// bytes válidos de verdade pro pipeline real de compressão/upload passar
// (issues #38/#39), sem precisar versionar um arquivo de imagem no repo.
// POST /api/orders exige receita anexada e confirm-delivery exige foto de
// comprovação, então todo teste que cria pedido ou confirma entrega via
// HTTP precisa desse arquivo — daí os helpers `postOrder`/`confirmDelivery`.
const testImagePngPromise = sharp({
  create: { width: 4, height: 4, channels: 3, background: { r: 200, g: 50, b: 50 } },
})
  .png()
  .toBuffer();

export async function postOrder(token, payload) {
  const prescriptionBuffer = await testImagePngPromise;
  return request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .field('data', JSON.stringify(payload))
    .attach('prescription', prescriptionBuffer, { filename: 'receita.png', contentType: 'image/png' });
}

export async function confirmDelivery(token, orderId, pin, { app: targetApp = app } = {}) {
  const proofBuffer = await testImagePngPromise;
  return request(targetApp)
    .post(`/api/orders/${orderId}/confirm-delivery`)
    .set('Authorization', `Bearer ${token}`)
    .field('pin', pin)
    .attach('proof', proofBuffer, { filename: 'comprovante.png', contentType: 'image/png' });
}

export async function createUser({ role = 'OPERADOR', email, password = 'Senha@123', name = 'Usuário Teste', active = true } = {}) {
  const finalEmail = email || `${role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2)}@sedom.local`;
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

// Cria um Medicamento com uma Apresentação (dosagem+unidade) por baixo e
// devolve os dois achatados num objeto só: `.id`/`.name`/`.active` são do
// medicamento (usados pelos testes de CRUD de medicamento), `.presentationId`
// é o que entra em item de pedido (medicationPresentationId).
export async function createMedicationRecord(overrides = {}) {
  const medication = await prisma.medication.create({
    data: {
      name: overrides.name || 'Dipirona',
      active: overrides.active ?? true,
    },
  });
  const presentation = await prisma.medicationPresentation.create({
    data: {
      medicationId: medication.id,
      dosage: overrides.dosage || '500mg',
      unit: overrides.unit || 'comprimido',
      active: overrides.presentationActive ?? true,
    },
  });
  return { ...medication, presentationId: presentation.id, dosage: presentation.dosage, unit: presentation.unit };
}

// PIN de teste fixo ('123456') — os testes que precisam confirmar entrega
// enviam esse valor; o hash é o que realmente vai para o banco, igual ao
// fluxo real (ver issue #37).
export const TEST_PIN = '123456';

export async function createOrderRecord({ patientId, addressId, medicationPresentationId, status = 'PEDIDO_RECEBIDO', createdById, extra = {} }) {
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
          medicationPresentationId,
          medicationName: 'Dipirona',
          dosage: '500mg',
          unit: 'comprimido',
          quantity: 1,
        },
      },
      ...extra,
    },
  });
}
