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
    it('lists all medications', async () => {
      await createMedicationRecord({ name: 'Dipirona 500mg' });
      await createMedicationRecord({ name: 'Paracetamol 750mg' });

      const res = await request(app)
        .get('/api/medications')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
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
    it('returns a medication by id', async () => {
      const medication = await createMedicationRecord();

      const res = await request(app)
        .get(`/api/medications/${medication.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(medication.id);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request(app)
        .get('/api/medications/does-not-exist')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/medications', () => {
    it('creates a medication with a valid unit', async () => {
      const res = await request(app)
        .post('/api/medications')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Amoxicilina 500mg', unit: 'cápsula' });

      expect(res.status).toBe(201);
      expect(res.body.unit).toBe('cápsula');
      expect(res.body.active).toBe(true);
    });

    it('rejects an invalid unit', async () => {
      const res = await request(app)
        .post('/api/medications')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Xarope Teste', unit: 'litro' });

      expect(res.status).toBe(400);
    });

    it('rejects a missing name', async () => {
      const res = await request(app)
        .post('/api/medications')
        .set('Authorization', `Bearer ${token}`)
        .send({ unit: 'unidade' });

      expect(res.status).toBe(400);
    });

    it('rejects an ENTREGADOR', async () => {
      const courier = await createUser({ role: 'ENTREGADOR' });
      const courierToken = await loginAs(courier);

      const res = await request(app)
        .post('/api/medications')
        .set('Authorization', `Bearer ${courierToken}`)
        .send({ name: 'Teste', unit: 'unidade' });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/medications/:id', () => {
    it('updates name, unit and active', async () => {
      const medication = await createMedicationRecord({ name: 'Original', unit: 'unidade', active: true });

      const res = await request(app)
        .put(`/api/medications/${medication.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Atualizado', unit: 'frasco', active: false });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Atualizado');
      expect(res.body.unit).toBe('frasco');
      expect(res.body.active).toBe(false);
    });

    it('rejects an invalid unit', async () => {
      const medication = await createMedicationRecord();

      const res = await request(app)
        .put(`/api/medications/${medication.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ unit: 'litro' });

      expect(res.status).toBe(400);
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
});
