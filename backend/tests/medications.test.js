import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, createUser, loginAs, createMedicationRecord } from './helpers.js';

describe('Medications', () => {
  let token;

  beforeEach(async () => {
    const operator = await createUser({ role: 'OPERADOR' });
    token = await loginAs(operator);
  });

  describe('GET /api/medications', () => {
    it('lists all medications with their presentations', async () => {
      const dipirona = await createMedicationRecord({ name: 'Dipirona', dosage: '500mg' });
      await createMedicationRecord({ name: 'Paracetamol', dosage: '750mg' });

      const res = await request(app)
        .get('/api/medications')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      const found = res.body.find((m) => m.id === dipirona.id);
      expect(found.presentations).toHaveLength(1);
      expect(found.presentations[0]).toMatchObject({ dosage: '500mg', unit: 'comprimido' });
    });

    it('filters by active status', async () => {
      await createMedicationRecord({ name: 'Ativo Teste', active: true });
      await createMedicationRecord({ name: 'Inativo Teste', active: false });

      const activeRes = await request(app)
        .get('/api/medications?active=true')
        .set('Authorization', `Bearer ${token}`);
      expect(activeRes.body.every((m) => m.active)).toBe(true);
      expect(activeRes.body.some((m) => m.name === 'Ativo Teste')).toBe(true);
      expect(activeRes.body.some((m) => m.name === 'Inativo Teste')).toBe(false);

      const inactiveRes = await request(app)
        .get('/api/medications?active=false')
        .set('Authorization', `Bearer ${token}`);
      expect(inactiveRes.body.every((m) => !m.active)).toBe(true);
      expect(inactiveRes.body.some((m) => m.name === 'Inativo Teste')).toBe(true);
    });

    it('rejects an ENTREGADOR', async () => {
      const courier = await createUser({ role: 'ENTREGADOR' });
      const courierToken = await loginAs(courier);

      const res = await request(app)
        .get('/api/medications')
        .set('Authorization', `Bearer ${courierToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/medications/:id', () => {
    it('returns a medication by id, with its presentations', async () => {
      const medication = await createMedicationRecord();

      const res = await request(app)
        .get(`/api/medications/${medication.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(medication.id);
      expect(res.body.presentations).toHaveLength(1);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request(app)
        .get('/api/medications/does-not-exist')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/medications', () => {
    it('creates a medication (name only, no dosage/unit)', async () => {
      const res = await request(app)
        .post('/api/medications')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Amoxicilina' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Amoxicilina');
      expect(res.body.active).toBe(true);
      expect(res.body.presentations).toEqual([]);
    });

    it('rejects a missing name', async () => {
      const res = await request(app)
        .post('/api/medications')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('rejects an ENTREGADOR', async () => {
      const courier = await createUser({ role: 'ENTREGADOR' });
      const courierToken = await loginAs(courier);

      const res = await request(app)
        .post('/api/medications')
        .set('Authorization', `Bearer ${courierToken}`)
        .send({ name: 'Teste' });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/medications/:id', () => {
    it('updates name and active', async () => {
      const medication = await createMedicationRecord({ name: 'Original', active: true });

      const res = await request(app)
        .put(`/api/medications/${medication.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Atualizado', active: false });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Atualizado');
      expect(res.body.active).toBe(false);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request(app)
        .put('/api/medications/does-not-exist')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Novo Nome' });

      expect(res.status).toBe(404);
    });

    it('rejects an ENTREGADOR', async () => {
      const medication = await createMedicationRecord();
      const courier = await createUser({ role: 'ENTREGADOR' });
      const courierToken = await loginAs(courier);

      const res = await request(app)
        .put(`/api/medications/${medication.id}`)
        .set('Authorization', `Bearer ${courierToken}`)
        .send({ name: 'Tentativa' });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/medications/:id/presentations', () => {
    it('adds a new presentation (dosage) to an existing medication', async () => {
      const medication = await createMedicationRecord({ name: 'Amoxicilina', dosage: '500mg' });

      const res = await request(app)
        .post(`/api/medications/${medication.id}/presentations`)
        .set('Authorization', `Bearer ${token}`)
        .send({ dosage: '875mg', unit: 'comprimido' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ dosage: '875mg', unit: 'comprimido', active: true, medicationId: medication.id });

      const listRes = await request(app)
        .get(`/api/medications/${medication.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(listRes.body.presentations).toHaveLength(2);
    });

    it('rejects a missing dosage', async () => {
      const medication = await createMedicationRecord();

      const res = await request(app)
        .post(`/api/medications/${medication.id}/presentations`)
        .set('Authorization', `Bearer ${token}`)
        .send({ unit: 'comprimido' });

      expect(res.status).toBe(400);
    });

    it('rejects an invalid unit', async () => {
      const medication = await createMedicationRecord();

      const res = await request(app)
        .post(`/api/medications/${medication.id}/presentations`)
        .set('Authorization', `Bearer ${token}`)
        .send({ dosage: '10mg', unit: 'litro' });

      expect(res.status).toBe(400);
    });

    it('returns 404 for an unknown medication', async () => {
      const res = await request(app)
        .post('/api/medications/does-not-exist/presentations')
        .set('Authorization', `Bearer ${token}`)
        .send({ dosage: '10mg' });

      expect(res.status).toBe(404);
    });

    it('rejects an ENTREGADOR', async () => {
      const medication = await createMedicationRecord();
      const courier = await createUser({ role: 'ENTREGADOR' });
      const courierToken = await loginAs(courier);

      const res = await request(app)
        .post(`/api/medications/${medication.id}/presentations`)
        .set('Authorization', `Bearer ${courierToken}`)
        .send({ dosage: '10mg' });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/medications/:id/presentations/:presentationId', () => {
    it('updates dosage, unit and active', async () => {
      const medication = await createMedicationRecord({ dosage: '500mg', unit: 'comprimido' });

      const res = await request(app)
        .put(`/api/medications/${medication.id}/presentations/${medication.presentationId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ dosage: '875mg', unit: 'cápsula', active: false });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ dosage: '875mg', unit: 'cápsula', active: false });
    });

    it('rejects an invalid unit', async () => {
      const medication = await createMedicationRecord();

      const res = await request(app)
        .put(`/api/medications/${medication.id}/presentations/${medication.presentationId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ unit: 'litro' });

      expect(res.status).toBe(400);
    });

    it('returns 404 for a presentation that does not belong to the medication', async () => {
      const medication = await createMedicationRecord();
      const otherMedication = await createMedicationRecord({ name: 'Outro' });

      const res = await request(app)
        .put(`/api/medications/${otherMedication.id}/presentations/${medication.presentationId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ dosage: '10mg' });

      expect(res.status).toBe(404);
    });

    it('rejects an ENTREGADOR', async () => {
      const medication = await createMedicationRecord();
      const courier = await createUser({ role: 'ENTREGADOR' });
      const courierToken = await loginAs(courier);

      const res = await request(app)
        .put(`/api/medications/${medication.id}/presentations/${medication.presentationId}`)
        .set('Authorization', `Bearer ${courierToken}`)
        .send({ dosage: '10mg' });

      expect(res.status).toBe(403);
    });
  });
});
