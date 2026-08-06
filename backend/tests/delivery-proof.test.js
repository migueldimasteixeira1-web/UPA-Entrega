import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import {
  app,
  createUser,
  loginAs,
  createPatientWithAddress,
  createMedicationRecord,
  createOrderRecord,
  confirmDelivery,
  TEST_PIN,
} from './helpers.js';

describe('Delivery proof photo', () => {
  let operatorToken;
  let admin;
  let courier;
  let courierToken;
  let order;

  beforeEach(async () => {
    const operator = await createUser({ role: 'OPERADOR' });
    operatorToken = await loginAs(operator);
    admin = await createUser({ role: 'ADMIN' });
    courier = await createUser({ role: 'ENTREGADOR' });
    courierToken = await loginAs(courier);

    const { patient, address } = await createPatientWithAddress();
    const medication = await createMedicationRecord();
    const readyOrder = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationPresentationId: medication.presentationId,
      createdById: admin.id,
      status: 'AGUARDANDO_SAIDA',
    });

    const routeRes = await request(app)
      .post('/api/delivery-routes')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ courierId: courier.id, orderIds: [readyOrder.id] });

    order = routeRes.body.orders[0];
  });

  it('marks hasDeliveryProof and never leaks the storage key when delivery is confirmed with a photo', async () => {
    const res = await confirmDelivery(courierToken, order.id, TEST_PIN);

    expect(res.status).toBe(200);
    // A resposta pro entregador (formatOrderForCourier) nem inclui
    // hasPrescription/hasDeliveryProof — só a visão de staff traz esses
    // campos, então a checagem é via GET como ADMIN/OPERADOR.
    expect(JSON.stringify(res.body)).not.toContain('deliveryProofKey');

    const staffView = await request(app)
      .get(`/api/orders/${order.id}`)
      .set('Authorization', `Bearer ${operatorToken}`);
    expect(staffView.body.hasDeliveryProof).toBe(true);
    expect(JSON.stringify(staffView.body)).not.toContain('deliveryProofKey');
  });

  it('rejects an unsupported file type for the proof photo', async () => {
    const res = await request(app)
      .post(`/api/orders/${order.id}/confirm-delivery`)
      .set('Authorization', `Bearer ${courierToken}`)
      .field('pin', TEST_PIN)
      .attach('proof', Buffer.from('not an image'), { filename: 'foto.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
  });

  it('does not finalize the order when the PIN is correct but no photo is attached', async () => {
    const res = await request(app)
      .post(`/api/orders/${order.id}/confirm-delivery`)
      .set('Authorization', `Bearer ${courierToken}`)
      .field('pin', TEST_PIN);

    expect(res.status).toBe(400);

    const check = await request(app)
      .get(`/api/orders/${order.id}`)
      .set('Authorization', `Bearer ${operatorToken}`);
    expect(check.body.status).toBe('EM_ROTA');
  });
});

describe('GET /api/orders/:id/delivery-proof', () => {
  let operatorToken;
  let courierToken;
  let orderId;

  beforeEach(async () => {
    const operator = await createUser({ role: 'OPERADOR' });
    operatorToken = await loginAs(operator);
    const admin = await createUser({ role: 'ADMIN' });
    const courier = await createUser({ role: 'ENTREGADOR' });
    courierToken = await loginAs(courier);

    const { patient, address } = await createPatientWithAddress();
    const medication = await createMedicationRecord();
    const readyOrder = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationPresentationId: medication.presentationId,
      createdById: admin.id,
      status: 'AGUARDANDO_SAIDA',
    });

    const routeRes = await request(app)
      .post('/api/delivery-routes')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ courierId: courier.id, orderIds: [readyOrder.id] });

    const confirmRes = await confirmDelivery(courierToken, routeRes.body.orders[0].id, TEST_PIN);
    orderId = confirmRes.body.id;
  });

  it('returns a signed URL for ADMIN/OPERADOR', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderId}/delivery-proof`)
      .set('Authorization', `Bearer ${operatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/^https?:\/\//);
  });

  it('is not accessible to ENTREGADOR', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderId}/delivery-proof`)
      .set('Authorization', `Bearer ${courierToken}`);

    expect(res.status).toBe(403);
  });
});
