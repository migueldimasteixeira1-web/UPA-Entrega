import { describe, it, expect } from 'vitest';
import request from 'supertest';
import prisma from '../src/lib/prisma.js';
import {
  app,
  createUser,
  loginAs,
  createPatientWithAddress,
  createMedicationRecord,
  createOrderRecord,
} from './helpers.js';

describe('GET /api/couriers', () => {
  it('is reachable by OPERADOR, not just ADMIN (montar rota é tarefa do operador)', async () => {
    const operator = await createUser({ role: 'OPERADOR' });
    const token = await loginAs(operator);

    const res = await request(app).get('/api/couriers').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('lists only active ENTREGADOR users, without email/role/other fields', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const token = await loginAs(admin);

    const activeCourier = await createUser({ role: 'ENTREGADOR', name: 'Entregador Ativo' });
    await createUser({ role: 'ENTREGADOR', name: 'Entregador Inativo', active: false });
    await createUser({ role: 'OPERADOR', name: 'Outro Operador' });

    const res = await request(app).get('/api/couriers').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const names = res.body.map((c) => c.name);
    expect(names).toContain('Entregador Ativo');
    expect(names).not.toContain('Entregador Inativo');
    expect(names).not.toContain('Outro Operador');

    const found = res.body.find((c) => c.id === activeCourier.id);
    expect(Object.keys(found).sort()).toEqual(['activeDeliveries', 'id', 'name']);
    expect(found.activeDeliveries).toBe(0);
  });

  it('counts only EM_ROTA orders as active deliveries, per courier (issue #102)', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const token = await loginAs(admin);

    const busyCourier = await createUser({ role: 'ENTREGADOR', name: 'Entregador Ocupado' });
    const idleCourier = await createUser({ role: 'ENTREGADOR', name: 'Entregador Livre' });
    const { patient, address } = await createPatientWithAddress();
    const medication = await createMedicationRecord();

    const route = await prisma.route.create({
      data: {
        routeNumber: `ROTA-TESTE-${Date.now()}`,
        courierId: busyCourier.id,
        createdById: admin.id,
        status: 'EM_ANDAMENTO',
      },
    });

    await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationPresentationId: medication.presentationId,
      createdById: admin.id,
      extra: { status: 'EM_ROTA', routeId: route.id, routeSequence: 0 },
    });
    await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationPresentationId: medication.presentationId,
      createdById: admin.id,
      extra: { status: 'EM_ROTA', routeId: route.id, routeSequence: 1 },
    });
    // Já entregue — não deve contar como carga ativa.
    await createOrderRecord({
      patientId: patient.id,
      addressId: address.id,
      medicationPresentationId: medication.presentationId,
      createdById: admin.id,
      extra: { status: 'ENTREGUE', routeId: route.id, routeSequence: 2 },
    });

    const res = await request(app).get('/api/couriers').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.find((c) => c.id === busyCourier.id).activeDeliveries).toBe(2);
    expect(res.body.find((c) => c.id === idleCourier.id).activeDeliveries).toBe(0);
  });
});
