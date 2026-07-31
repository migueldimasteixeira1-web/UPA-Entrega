import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import {
  app,
  createUser,
  loginAs,
  createPatientWithAddress,
  createMedicationRecord,
  createOrderRecord,
  postOrder,
  TEST_PIN,
} from './helpers.js';
import prisma from '../src/lib/prisma.js';
import { processPendingEmails } from '../src/lib/email/worker.js';
import { comparePassword } from '../src/lib/password.js';

describe('Confirmation email on order creation', () => {
  let token;
  let medication;

  beforeEach(async () => {
    const operator = await createUser({ role: 'OPERADOR' });
    token = await loginAs(operator);
    medication = await createMedicationRecord();
  });

  it('enqueues a confirmation email with the PIN when the patient has an e-mail', async () => {
    const { patient, address } = await createPatientWithAddress({ data: { email: 'paciente@example.com' } });

    const res = await postOrder(token, {
      patientId: patient.id,
      addressId: address.id,
      items: [{ medicationId: medication.id, quantity: 1 }],
    });

    expect(res.status).toBe(201);
    expect(res.body.emailStatus).toBe('pendente');
    // O PIN não é mais retornado em nenhuma resposta de staff (issue #37).
    expect(JSON.stringify(res.body)).not.toContain('deliveryPin');

    const notifications = await prisma.emailNotification.findMany({ where: { orderId: res.body.id } });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].to).toBe('paciente@example.com');
    expect(notifications[0].status).toBe('PENDING');

    // O PIN no e-mail precisa ser o mesmo que valida a entrega — como a API
    // não devolve mais o PIN em texto puro, comparamos o que está no HTML
    // enfileirado contra o hash gravado no pedido (única forma de verificar
    // sem reintroduzir uma leitura direta do PIN).
    const [, rawPinInEmail] = notifications[0].html.match(/data-pin-code[^>]*>(\d{6})</);
    const order = await prisma.order.findUnique({ where: { id: res.body.id } });
    expect(await comparePassword(rawPinInEmail, order.deliveryPinHash)).toBe(true);
  });

  it('does not enqueue anything and does not fail order creation when the patient has no e-mail', async () => {
    const { patient, address } = await createPatientWithAddress();

    const res = await postOrder(token, {
      patientId: patient.id,
      addressId: address.id,
      items: [{ medicationId: medication.id, quantity: 1 }],
    });

    expect(res.status).toBe(201);
    expect(res.body.emailStatus).toBe('sem_email');

    const notifications = await prisma.emailNotification.findMany({ where: { orderId: res.body.id } });
    expect(notifications).toHaveLength(0);
  });

  it('never leaks the raw e-mail queue rows (html/content) in the order response', async () => {
    const { patient, address } = await createPatientWithAddress({ data: { email: 'paciente@example.com' } });

    const res = await postOrder(token, {
      patientId: patient.id,
      addressId: address.id,
      items: [{ medicationId: medication.id, quantity: 1 }],
    });

    expect(res.body.emails).toBeUndefined();
  });
});

describe('Resend confirmation e-mail', () => {
  let operatorToken;
  let courierToken;
  let order;

  beforeEach(async () => {
    const operator = await createUser({ role: 'OPERADOR' });
    operatorToken = await loginAs(operator);
    const courier = await createUser({ role: 'ENTREGADOR' });
    courierToken = await loginAs(courier);

    const { patient, address } = await createPatientWithAddress({ data: { email: 'paciente@example.com' } });
    const medication = await createMedicationRecord();
    order = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationId: medication.id,
      createdById: operator.id,
      extra: { patientEmail: 'paciente@example.com' },
    });

    // createOrderRecord cria o pedido direto via Prisma (não passa por
    // createOrder), então não existe ainda o e-mail original enfileirado —
    // simula a mesma linha que a criação real teria gerado, já que resend
    // agora clona o último e-mail em vez de re-renderizar a partir do PIN
    // (que só existe como hash depois da criação — issue #37).
    await prisma.emailNotification.create({
      data: {
        orderId: order.id,
        type: 'confirmacao_pedido',
        to: 'paciente@example.com',
        subject: 'Pedido registrado',
        html: '<p>123456</p>',
      },
    });
  });

  it('creates a new queued e-mail with the same content, without regenerating the PIN', async () => {
    const res = await request(app)
      .post(`/api/orders/${order.id}/resend-email`)
      .set('Authorization', `Bearer ${operatorToken}`);

    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('deliveryPin');

    const notifications = await prisma.emailNotification.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(notifications).toHaveLength(2);
    expect(notifications[1].html).toBe(notifications[0].html);
    expect(notifications[1].html).toContain('123456');

    const history = await prisma.orderHistory.findMany({ where: { orderId: order.id } });
    expect(history.some((h) => h.action === 'E-mail reenviado')).toBe(true);
  });

  it('rejects resend when no confirmation e-mail was ever sent for this order', async () => {
    const { patient, address } = await createPatientWithAddress({ cpf: '55566677788', data: { email: 'novo@example.com' } });
    const medication = await createMedicationRecord();
    const neverEmailedOrder = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationId: medication.id,
      createdById: (await createUser({ role: 'ADMIN' })).id,
      extra: { patientEmail: 'novo@example.com' },
    });

    const res = await request(app)
      .post(`/api/orders/${neverEmailedOrder.id}/resend-email`)
      .set('Authorization', `Bearer ${operatorToken}`);

    expect(res.status).toBe(400);
  });

  it('rejects resend for a patient without e-mail', async () => {
    const { patient, address } = await createPatientWithAddress({ cpf: '11122233344' });
    const medication = await createMedicationRecord();
    const noEmailOrder = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationId: medication.id,
      createdById: (await createUser({ role: 'ADMIN' })).id,
    });

    const res = await request(app)
      .post(`/api/orders/${noEmailOrder.id}/resend-email`)
      .set('Authorization', `Bearer ${operatorToken}`);

    expect(res.status).toBe(400);
  });

  it('is not accessible to ENTREGADOR', async () => {
    const res = await request(app)
      .post(`/api/orders/${order.id}/resend-email`)
      .set('Authorization', `Bearer ${courierToken}`);

    expect(res.status).toBe(403);
  });
});

describe('Email worker', () => {
  it('processes pending notifications and marks them as sent (no SMTP configured in tests)', async () => {
    const { patient, address } = await createPatientWithAddress({ data: { email: 'paciente@example.com' } });
    const medication = await createMedicationRecord();
    const order = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationId: medication.id,
      createdById: (await createUser({ role: 'ADMIN' })).id,
      extra: { patientEmail: 'paciente@example.com' },
    });

    await prisma.emailNotification.create({
      data: {
        orderId: order.id,
        type: 'confirmacao_pedido',
        to: 'paciente@example.com',
        subject: 'Pedido registrado',
        html: '<p>123456</p>',
      },
    });

    const processed = await processPendingEmails();
    expect(processed).toBeGreaterThanOrEqual(1);

    const notification = await prisma.emailNotification.findFirst({ where: { orderId: order.id } });
    expect(notification.status).toBe('SENT');
    expect(notification.attempts).toBe(1);
    expect(notification.sentAt).toBeTruthy();
  });
});

describe('Status update emails', () => {
  let operatorToken;
  let admin;
  let courier;
  let patient;
  let address;
  let medication;

  async function notificationsFor(orderId, type) {
    return prisma.emailNotification.findMany({ where: { orderId, type } });
  }

  beforeEach(async () => {
    const operator = await createUser({ role: 'OPERADOR' });
    operatorToken = await loginAs(operator);
    admin = await createUser({ role: 'ADMIN' });
    courier = await createUser({ role: 'ENTREGADOR' });
    ({ patient, address } = await createPatientWithAddress({ data: { email: 'paciente@example.com' } }));
    medication = await createMedicationRecord();
  });

  it('enqueues a "separado" e-mail without repeating the PIN', async () => {
    const order = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationId: medication.id,
      createdById: admin.id,
      status: 'EM_SEPARACAO',
      extra: { patientEmail: 'paciente@example.com' },
    });

    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ status: 'SEPARADO' });

    expect(res.status).toBe(200);

    const notifications = await notificationsFor(order.id, 'status_separado');
    expect(notifications).toHaveLength(1);
    expect(notifications[0].html).not.toContain('data-pin-code');
  });

  it('enqueues an "em_rota" e-mail when a route is created', async () => {
    const order = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationId: medication.id,
      createdById: admin.id,
      status: 'AGUARDANDO_SAIDA',
      extra: { patientEmail: 'paciente@example.com' },
    });

    const res = await request(app)
      .post('/api/delivery-routes')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ courierId: courier.id, orderIds: [order.id] });

    expect(res.status).toBe(201);

    const notifications = await notificationsFor(order.id, 'status_em_rota');
    expect(notifications).toHaveLength(1);
    expect(notifications[0].html).not.toContain('data-pin-code');
  });

  it('enqueues an "entregue" e-mail when the PIN confirms the delivery', async () => {
    const order = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationId: medication.id,
      createdById: admin.id,
      status: 'AGUARDANDO_SAIDA',
      extra: { patientEmail: 'paciente@example.com' },
    });

    const routeRes = await request(app)
      .post('/api/delivery-routes')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ courierId: courier.id, orderIds: [order.id] });

    const courierToken = await loginAs(courier);
    const res = await request(app)
      .post(`/api/orders/${order.id}/confirm-delivery`)
      .set('Authorization', `Bearer ${courierToken}`)
      .send({ pin: TEST_PIN });

    expect(res.status).toBe(200);
    expect(routeRes.status).toBe(201);

    const notifications = await notificationsFor(order.id, 'status_entregue');
    expect(notifications).toHaveLength(1);
    expect(notifications[0].html).not.toContain('data-pin-code');
  });

  it('enqueues a "tentativa_falha" e-mail when a route delivery is cancelled mid-route', async () => {
    const order = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationId: medication.id,
      createdById: admin.id,
      status: 'AGUARDANDO_SAIDA',
      extra: { patientEmail: 'paciente@example.com' },
    });

    await request(app)
      .post('/api/delivery-routes')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ courierId: courier.id, orderIds: [order.id] });

    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ status: 'CANCELADO', cancelReason: 'Endereço não encontrado' });

    expect(res.status).toBe(200);

    const notifications = await notificationsFor(order.id, 'status_tentativa_falha');
    expect(notifications).toHaveLength(1);
  });

  it('does not send a "tentativa_falha" e-mail when cancelling before the order ever went out for delivery', async () => {
    const order = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationId: medication.id,
      createdById: admin.id,
      status: 'PEDIDO_RECEBIDO',
      extra: { patientEmail: 'paciente@example.com' },
    });

    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ status: 'CANCELADO', cancelReason: 'Paciente desistiu' });

    expect(res.status).toBe(200);

    const notifications = await notificationsFor(order.id, 'status_tentativa_falha');
    expect(notifications).toHaveLength(0);
  });
});
