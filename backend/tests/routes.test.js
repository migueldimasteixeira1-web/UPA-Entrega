import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import prisma from '../src/lib/prisma.js';
import {
  app,
  createUser,
  loginAs,
  createPatientWithAddress,
  createMedicationRecord,
  createOrderRecord,
  TEST_PIN,
} from './helpers.js';

describe('Delivery routes', () => {
  let operatorToken;
  let admin;
  let courier;
  let patient;
  let address;
  let medication;

  beforeEach(async () => {
    const operator = await createUser({ role: 'OPERADOR' });
    operatorToken = await loginAs(operator);
    admin = await createUser({ role: 'ADMIN' });
    courier = await createUser({ role: 'ENTREGADOR' });
    ({ patient, address } = await createPatientWithAddress());
    medication = await createMedicationRecord();
  });

  it('creates a route, moves orders to EM_ROTA and assigns sequence', async () => {
    const order = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationId: medication.id,
      createdById: admin.id,
      status: 'AGUARDANDO_SAIDA',
    });

    const res = await request(app)
      .post('/api/delivery-routes')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ courierId: courier.id, orderIds: [order.id] });

    expect(res.status).toBe(201);
    expect(res.body.orders[0].status).toBe('EM_ROTA');
    expect(res.body.orders[0].routeSequence).toBe(0);
  });

  it('rejects orders that are not AGUARDANDO_SAIDA', async () => {
    const order = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationId: medication.id,
      createdById: admin.id,
      status: 'PEDIDO_RECEBIDO',
    });

    const res = await request(app)
      .post('/api/delivery-routes')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ courierId: courier.id, orderIds: [order.id] });

    expect(res.status).toBe(400);
  });

  it('rejects a courierId that is not an active ENTREGADOR', async () => {
    const order = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationId: medication.id,
      createdById: admin.id,
      status: 'AGUARDANDO_SAIDA',
    });

    const res = await request(app)
      .post('/api/delivery-routes')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ courierId: admin.id, orderIds: [order.id] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Entregador inválido ou inativo');
  });

  it('assigns distinct route numbers to concurrent creations on the same day, no 500s', async () => {
    // Um pedido próprio por rota, para a corrida testada ser só a numeração —
    // não a regra de negócio de um pedido já ter saído de AGUARDANDO_SAIDA.
    const orders = await Promise.all(
      Array.from({ length: 5 }).map(() =>
        createOrderRecord({
          patientId: patient.id,
          addressId: address.id,
          medicationId: medication.id,
          createdById: admin.id,
          status: 'AGUARDANDO_SAIDA',
        })
      )
    );

    const responses = await Promise.all(
      orders.map((order) =>
        request(app)
          .post('/api/delivery-routes')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({ courierId: courier.id, orderIds: [order.id] })
      )
    );

    for (const res of responses) {
      expect(res.status).toBe(201);
    }

    const routeNumbers = responses.map((res) => res.body.routeNumber);
    expect(new Set(routeNumbers).size).toBe(routeNumbers.length);
  });
});

describe('Delivery PIN security', () => {
  let admin;
  let courier;
  let otherCourier;
  let courierToken;
  let otherCourierToken;
  let order;

  beforeEach(async () => {
    admin = await createUser({ role: 'ADMIN' });
    courier = await createUser({ role: 'ENTREGADOR' });
    otherCourier = await createUser({ role: 'ENTREGADOR' });
    courierToken = await loginAs(courier);
    otherCourierToken = await loginAs(otherCourier);

    const { patient, address } = await createPatientWithAddress();
    const medication = await createMedicationRecord();
    const readyOrder = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationId: medication.id,
      createdById: admin.id,
      status: 'AGUARDANDO_SAIDA',
    });

    const operatorToken = await loginAs(await createUser({ role: 'OPERADOR' }));
    const routeRes = await request(app)
      .post('/api/delivery-routes')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ courierId: courier.id, orderIds: [readyOrder.id] });

    order = routeRes.body.orders[0];
  });

  it('never includes deliveryPin in /api/delivery-routes/mine for the courier', async () => {
    const res = await request(app)
      .get('/api/delivery-routes/mine')
      .set('Authorization', `Bearer ${courierToken}`);

    expect(res.status).toBe(200);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('deliveryPin');
    expect(res.body[0].orders[0].patientCpf).toMatch(/\*\*\*/);
  });

  it('blocks a courier from fetching the full order via GET /api/orders/:id', async () => {
    const res = await request(app).get(`/api/orders/${order.id}`).set('Authorization', `Bearer ${courierToken}`);

    expect(res.status).toBe(403);
  });

  it('rejects confirm-delivery with the wrong PIN', async () => {
    const res = await request(app)
      .post(`/api/orders/${order.id}/confirm-delivery`)
      .set('Authorization', `Bearer ${courierToken}`)
      .send({ pin: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('PIN incorreto');
  });

  it('rejects confirm-delivery from a courier who does not own the route', async () => {
    const res = await request(app)
      .post(`/api/orders/${order.id}/confirm-delivery`)
      .set('Authorization', `Bearer ${otherCourierToken}`)
      .send({ pin: TEST_PIN });

    expect(res.status).toBe(403);
  });

  it('confirms delivery with the right PIN and finalizes the route', async () => {
    const res = await request(app)
      .post(`/api/orders/${order.id}/confirm-delivery`)
      .set('Authorization', `Bearer ${courierToken}`)
      .send({ pin: TEST_PIN });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ENTREGUE');

    const routeRes = await request(app)
      .get('/api/delivery-routes/mine')
      .set('Authorization', `Bearer ${courierToken}`);
    const activeRoutes = routeRes.body;
    expect(activeRoutes).toHaveLength(0); // rota finalizada não aparece mais em "mine" (só EM_ANDAMENTO)
  });

  it('never includes the PIN (raw or via e-mail content) in the confirm-delivery response itself, for the courier', async () => {
    // Achado ao ligar o e-mail de confirmação (que embute o PIN no HTML) ao
    // mesmo include usado por formatOrder — sem tratamento por papel, a
    // própria resposta desta chamada vazaria o PIN pro entregador que
    // acabou de usá-lo.
    const res = await request(app)
      .post(`/api/orders/${order.id}/confirm-delivery`)
      .set('Authorization', `Bearer ${courierToken}`)
      .send({ pin: TEST_PIN });

    expect(res.status).toBe(200);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('deliveryPin');
    expect(raw).not.toContain(TEST_PIN);
    expect(raw).not.toContain('emails');
  });

  it('rate-limits repeated confirm-delivery attempts, so the PIN cannot be brute-forced', async () => {
    // App próprio, com limite baixo, para não depender/afetar o contador em
    // memória do rate limiter compartilhado pelos demais testes.
    const isolatedApp = createApp({ confirmDeliveryRateLimit: { windowMs: 15 * 60 * 1000, limit: 3 } });

    let lastStatus;
    for (let i = 0; i < 4; i += 1) {
      const res = await request(isolatedApp)
        .post(`/api/orders/${order.id}/confirm-delivery`)
        .set('Authorization', `Bearer ${courierToken}`)
        .send({ pin: '000000' });
      lastStatus = res.status;
    }

    expect(lastStatus).toBe(429);
  });
});

describe('Route number generation survives a pre-existing, uncounted route', () => {
  it('does not collide when a route already exists for today from before the DailyCounter row', async () => {
    const operator = await createUser({ role: 'OPERADOR' });
    const token = await loginAs(operator);
    const admin = await createUser({ role: 'ADMIN' });
    const courier = await createUser({ role: 'ENTREGADOR' });
    const { patient, address } = await createPatientWithAddress();
    const medication = await createMedicationRecord();

    const today = new Date();
    const dateKey = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const routeNumber = `ROTA-${dateKey}-001`;

    // Simula uma rota criada antes de qualquer linha existir em
    // DailyCounter para esse dia (cenário real: dado pré-existente na hora
    // do corte pra essa numeração).
    await prisma.route.create({
      data: { routeNumber, courierId: courier.id, createdById: admin.id, status: 'EM_ANDAMENTO' },
    });

    const order = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationId: medication.id,
      createdById: admin.id,
      status: 'AGUARDANDO_SAIDA',
    });

    const res = await request(app)
      .post('/api/delivery-routes')
      .set('Authorization', `Bearer ${token}`)
      .send({ courierId: courier.id, orderIds: [order.id] });

    expect(res.status).toBe(201);
    expect(res.body.routeNumber).not.toBe(routeNumber);
  });
});
