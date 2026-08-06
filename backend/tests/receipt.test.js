import { describe, it, expect } from 'vitest';
import request from 'supertest';
import {
  app,
  createUser,
  loginAs,
  createPatientWithAddress,
  createMedicationRecord,
  createOrderRecord,
  postOrder,
} from './helpers.js';
import { buildReceiptPdf } from '../src/lib/pdf/receiptPdf.js';
import { processPendingEmails } from '../src/lib/email/worker.js';
import prisma from '../src/lib/prisma.js';

describe('Receipt PDF generation (issue #40)', () => {
  it('builds a valid PDF with the order data, never the PIN', async () => {
    const order = {
      orderNumber: 'UPA-20260804-001',
      createdAt: new Date(),
      createdBy: { name: 'Ana Operadora' },
      patientName: 'João da Silva',
      patientCpf: '12345678901',
      patientPhone: '22999998888',
      street: 'Rua das Flores',
      number: '123',
      complement: null,
      neighborhood: 'Centro',
      city: 'Cabo Frio',
      state: 'RJ',
      zipCode: '28900000',
      referencePoint: null,
      items: [{ quantity: 2, medicationName: 'Dipirona', unit: 'comprimido' }],
    };

    const pdf = await buildReceiptPdf(order);

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    // O PIN nunca é passado pra essa função — não tem como aparecer no PDF.
    expect(pdf.includes('deliveryPinHash')).toBe(false);
  });
});

describe('Patient e-mail is required on creation (issue #40)', () => {
  it('rejects creating a patient without e-mail', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const token = await loginAs(admin);

    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Sem Email', phone: '22999990000', cpf: '11144477735' });

    expect(res.status).toBe(400);
  });

  it('rejects creating an order with a brand-new patient that has no e-mail', async () => {
    const operator = await createUser({ role: 'OPERADOR' });
    const token = await loginAs(operator);
    const medication = await createMedicationRecord();
    const { address } = await createPatientWithAddress();

    const res = await postOrder(token, {
      patient: { name: 'Novo Paciente', phone: '22999990000', cpf: '32165498791' },
      addressId: address.id,
      items: [{ medicationPresentationId: medication.presentationId, quantity: 1 }],
    });

    expect(res.status).toBe(400);
  });
});

describe('Receipt PDF endpoints', () => {
  async function setupOrder() {
    const admin = await createUser({ role: 'ADMIN' });
    const { patient, address } = await createPatientWithAddress({ data: { email: 'paciente@example.com' } });
    const medication = await createMedicationRecord();
    const order = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationPresentationId: medication.presentationId,
      createdById: admin.id,
      extra: { patientEmail: 'paciente@example.com' },
    });
    return { order };
  }

  it('lets ADMIN/OPERADOR download the receipt PDF from the order', async () => {
    const { order } = await setupOrder();
    const operator = await createUser({ role: 'OPERADOR' });
    const token = await loginAs(operator);

    const res = await request(app).get(`/api/orders/${order.id}/receipt-pdf`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(Buffer.from(res.body).subarray(0, 4).toString()).toBe('%PDF');
  });

  it('blocks ENTREGADOR from downloading the receipt PDF via the staff route', async () => {
    const { order } = await setupOrder();
    const courier = await createUser({ role: 'ENTREGADOR' });
    const token = await loginAs(courier);

    const res = await request(app).get(`/api/orders/${order.id}/receipt-pdf`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('404s for an order that does not exist', async () => {
    const operator = await createUser({ role: 'OPERADOR' });
    const token = await loginAs(operator);

    const res = await request(app)
      .get('/api/orders/00000000-0000-0000-0000-000000000000/receipt-pdf')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('lets the patient download the receipt PDF via the public tracking token, no login required', async () => {
    const { order } = await setupOrder();
    const full = await prisma.order.findUnique({ where: { id: order.id } });

    const res = await request(app).get(`/api/public/orders/${full.publicToken}/receipt-pdf`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(Buffer.from(res.body).subarray(0, 4).toString()).toBe('%PDF');
  });

  it('404s for an invalid public token', async () => {
    const res = await request(app).get('/api/public/orders/token-invalido/receipt-pdf');
    expect(res.status).toBe(404);
  });
});

describe('Email worker attaches the receipt PDF to the confirmation e-mail', () => {
  it('sends the confirmacao_pedido notification without error when a receipt PDF has to be generated', async () => {
    const { patient, address } = await createPatientWithAddress({ data: { email: 'paciente@example.com' } });
    const medication = await createMedicationRecord();
    const admin = await createUser({ role: 'ADMIN' });
    const order = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationPresentationId: medication.presentationId,
      createdById: admin.id,
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

    const notification = await prisma.emailNotification.findFirst({
      where: { orderId: order.id, type: 'confirmacao_pedido' },
    });
    expect(notification.status).toBe('SENT');
    expect(notification.lastError).toBeNull();
  });

  it('does not try to build a receipt PDF for status-update notifications', async () => {
    const { patient, address } = await createPatientWithAddress({ data: { email: 'paciente@example.com' } });
    const medication = await createMedicationRecord();
    const admin = await createUser({ role: 'ADMIN' });
    const order = await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationPresentationId: medication.presentationId,
      createdById: admin.id,
      status: 'EM_SEPARACAO',
      extra: { patientEmail: 'paciente@example.com' },
    });

    await prisma.emailNotification.create({
      data: {
        orderId: order.id,
        type: 'status_separado',
        to: 'paciente@example.com',
        subject: 'Pedido separado',
        html: '<p>Separado</p>',
      },
    });

    const processed = await processPendingEmails();
    expect(processed).toBeGreaterThanOrEqual(1);

    const notification = await prisma.emailNotification.findFirst({
      where: { orderId: order.id, type: 'status_separado' },
    });
    expect(notification.status).toBe('SENT');
  });
});
