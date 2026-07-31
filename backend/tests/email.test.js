import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, createUser, loginAs, createPatientWithAddress, createMedicationRecord, createOrderRecord } from './helpers.js';
import prisma from '../src/lib/prisma.js';
import { processPendingEmails } from '../src/lib/email/worker.js';

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

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientId: patient.id,
        addressId: address.id,
        items: [{ medicationId: medication.id, quantity: 1 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.emailStatus).toBe('pendente');

    const notifications = await prisma.emailNotification.findMany({ where: { orderId: res.body.id } });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].to).toBe('paciente@example.com');
    expect(notifications[0].status).toBe('PENDING');
    expect(notifications[0].html).toContain(res.body.deliveryPin);
  });

  it('does not enqueue anything and does not fail order creation when the patient has no e-mail', async () => {
    const { patient, address } = await createPatientWithAddress();

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
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

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
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
  });

  it('creates a new queued e-mail with the same PIN, without regenerating it', async () => {
    const res = await request(app)
      .post(`/api/orders/${order.id}/resend-email`)
      .set('Authorization', `Bearer ${operatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.deliveryPin).toBe('123456');

    const notifications = await prisma.emailNotification.findMany({ where: { orderId: order.id } });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].html).toContain('123456');

    const history = await prisma.orderHistory.findMany({ where: { orderId: order.id } });
    expect(history.some((h) => h.action === 'E-mail reenviado')).toBe(true);
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
