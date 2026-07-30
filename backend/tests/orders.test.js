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
