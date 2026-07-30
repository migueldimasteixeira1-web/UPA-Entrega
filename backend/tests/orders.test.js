import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, createUser, loginAs, createPatientWithAddress, createMedicationRecord, createOrderRecord } from './helpers.js';

describe('Order status transitions', () => {
  let token;
  let patient;
  let address;
  let medication;

  beforeEach(async () => {
    const operator = await createUser({ role: 'OPERADOR' });
    token = await loginAs(operator);
    ({ patient, address } = await createPatientWithAddress());
    medication = await createMedicationRecord();
  });

  it('creates an order starting at PEDIDO_RECEBIDO with a generated PIN', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientId: patient.id,
        addressId: address.id,
        items: [{ medicationId: medication.id, quantity: 2 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PEDIDO_RECEBIDO');
    expect(res.body.deliveryPin).toMatch(/^\d{6}$/);
  });

  it('walks the full happy path PEDIDO_RECEBIDO -> EM_SEPARACAO -> SEPARADO -> AGUARDANDO_SAIDA', async () => {
    const order = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationId: medication.id,
      createdById: (await createUser({ role: 'ADMIN' })).id,
    });

    for (const status of ['EM_SEPARACAO', 'SEPARADO', 'AGUARDANDO_SAIDA']) {
      const res = await request(app)
        .patch(`/api/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);
    }
  });

  it('rejects an invalid status transition', async () => {
    const order = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationId: medication.id,
      createdById: (await createUser({ role: 'ADMIN' })).id,
    });

    // PEDIDO_RECEBIDO não pode ir direto para AGUARDANDO_SAIDA
    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'AGUARDANDO_SAIDA' });

    expect(res.status).toBe(400);
  });

  it('requires a cancellation reason', async () => {
    const order = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationId: medication.id,
      createdById: (await createUser({ role: 'ADMIN' })).id,
    });

    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CANCELADO' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Motivo do cancelamento é obrigatório');
  });

  it('masks patientCpf in the order list, same as the single-order view', async () => {
    await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationId: medication.id,
      createdById: (await createUser({ role: 'ADMIN' })).id,
      extra: { patientCpf: '12345678900' },
    });

    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const order of res.body) {
      expect(order.patientCpf).not.toMatch(/^\d{11}$/);
    }
  });
});

describe('GET /api/orders filters', () => {
  let token;
  let admin;
  let patient;
  let address;
  let medication;

  beforeEach(async () => {
    const operator = await createUser({ role: 'OPERADOR' });
    token = await loginAs(operator);
    admin = await createUser({ role: 'ADMIN' });
    ({ patient, address } = await createPatientWithAddress({ cpf: '98765432100' }));
    medication = await createMedicationRecord();
  });

  it('finds an order by CPF even when the search text has punctuation', async () => {
    const order = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationId: medication.id,
      createdById: admin.id,
      extra: { patientCpf: '98765432100' },
    });

    const res = await request(app)
      .get('/api/orders')
      .query({ search: '987.654.321-00' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.map((o) => o.id)).toContain(order.id);
  });

  it('filters by courierId, returning only orders on that courier route', async () => {
    const courierA = await createUser({ role: 'ENTREGADOR' });
    const courierB = await createUser({ role: 'ENTREGADOR' });

    const orderForA = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationId: medication.id,
      createdById: admin.id,
      status: 'AGUARDANDO_SAIDA',
    });
    const orderForB = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationId: medication.id,
      createdById: admin.id,
      status: 'AGUARDANDO_SAIDA',
    });

    await request(app)
      .post('/api/delivery-routes')
      .set('Authorization', `Bearer ${token}`)
      .send({ courierId: courierA.id, orderIds: [orderForA.id] });
    await request(app)
      .post('/api/delivery-routes')
      .set('Authorization', `Bearer ${token}`)
      .send({ courierId: courierB.id, orderIds: [orderForB.id] });

    const res = await request(app)
      .get('/api/orders')
      .query({ courierId: courierA.id })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const ids = res.body.map((o) => o.id);
    expect(ids).toContain(orderForA.id);
    expect(ids).not.toContain(orderForB.id);
  });
});
