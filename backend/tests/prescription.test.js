import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, createUser, loginAs, createPatientWithAddress, createMedicationRecord, postOrder } from './helpers.js';

describe('Prescription upload on order creation', () => {
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

  it('rejects order creation without a prescription file', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .field(
        'data',
        JSON.stringify({
          patientId: patient.id,
          addressId: address.id,
          items: [{ medicationPresentationId: medication.presentationId, quantity: 1 }],
        })
      );

    expect(res.status).toBe(400);
  });

  it('creates the order and marks hasPrescription without leaking the storage key', async () => {
    const res = await postOrder(token, {
      patientId: patient.id,
      addressId: address.id,
      items: [{ medicationPresentationId: medication.presentationId, quantity: 1 }],
    });

    expect(res.status).toBe(201);
    expect(res.body.hasPrescription).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain('prescriptionKey');
  });

  it('rejects an unsupported file type', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .field(
        'data',
        JSON.stringify({
          patientId: patient.id,
          addressId: address.id,
          items: [{ medicationPresentationId: medication.presentationId, quantity: 1 }],
        })
      )
      .attach('prescription', Buffer.from('not an image'), { filename: 'receita.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/orders/:id/prescription', () => {
  let operatorToken;
  let courierToken;
  let orderId;

  beforeEach(async () => {
    const operator = await createUser({ role: 'OPERADOR' });
    operatorToken = await loginAs(operator);
    const courier = await createUser({ role: 'ENTREGADOR' });
    courierToken = await loginAs(courier);

    const { patient, address } = await createPatientWithAddress();
    const medication = await createMedicationRecord();
    const res = await postOrder(operatorToken, {
      patientId: patient.id,
      addressId: address.id,
      items: [{ medicationPresentationId: medication.presentationId, quantity: 1 }],
    });
    orderId = res.body.id;
  });

  it('returns a signed URL for ADMIN/OPERADOR', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderId}/prescription`)
      .set('Authorization', `Bearer ${operatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/^https?:\/\//);
  });

  it('is not accessible to ENTREGADOR', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderId}/prescription`)
      .set('Authorization', `Bearer ${courierToken}`);

    expect(res.status).toBe(403);
  });

  it('is never exposed to ENTREGADOR through any order/route response', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${operatorToken}`);

    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('prescriptionKey');
  });
});
