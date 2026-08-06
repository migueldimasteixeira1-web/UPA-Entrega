import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, createUser, loginAs, createPatientWithAddress, createMedicationRecord, postOrder } from './helpers.js';

describe('GET /api/orders/history', () => {
  let adminToken;
  let admin;
  let patient;
  let address;
  let medication;

  beforeEach(async () => {
    admin = await createUser({ role: 'ADMIN' });
    adminToken = await loginAs(admin);
    ({ patient, address } = await createPatientWithAddress());
    medication = await createMedicationRecord();
  });

  it('is not reachable by OPERADOR — visão cruzada é só para Admin', async () => {
    const operator = await createUser({ role: 'OPERADOR' });
    const operatorToken = await loginAs(operator);

    const res = await request(app)
      .get('/api/orders/history')
      .set('Authorization', `Bearer ${operatorToken}`);

    expect(res.status).toBe(403);
  });

  it('aggregates history entries across different orders, most recent first', async () => {
    const createRes = await postOrder(adminToken, {
      patientId: patient.id,
      addressId: address.id,
      items: [{ medicationPresentationId: medication.presentationId, quantity: 1 }],
    });
    const orderId = createRes.body.id;

    await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'EM_SEPARACAO' });

    const res = await request(app)
      .get('/api/orders/history')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(2);
    expect(res.body.pageSize).toBeGreaterThan(0);

    const actions = res.body.items.map((e) => e.action);
    expect(actions).toContain('Pedido criado');
    expect(actions).toContain('Status alterado');

    const withOrder = res.body.items.find((e) => e.order?.id === orderId);
    expect(withOrder.order.orderNumber).toBe(createRes.body.orderNumber);
    expect(withOrder.user.name).toBe(admin.name);

    // mais recente primeiro
    const dates = res.body.items.map((e) => new Date(e.createdAt).getTime());
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it('filters by userId', async () => {
    const otherAdmin = await createUser({ role: 'ADMIN' });
    const otherToken = await loginAs(otherAdmin);

    await postOrder(adminToken, {
      patientId: patient.id,
      addressId: address.id,
      items: [{ medicationPresentationId: medication.presentationId, quantity: 1 }],
    });
    await postOrder(otherToken, {
      patientId: patient.id,
      addressId: address.id,
      items: [{ medicationPresentationId: medication.presentationId, quantity: 1 }],
    });

    const res = await request(app)
      .get('/api/orders/history')
      .query({ userId: otherAdmin.id })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    for (const entry of res.body.items) {
      expect(entry.user.id).toBe(otherAdmin.id);
    }
  });
});
