import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, createUser, loginAs, createPatientWithAddress } from './helpers.js';

describe('Patients', () => {
  let token;

  beforeEach(async () => {
    const operator = await createUser({ role: 'OPERADOR' });
    token = await loginAs(operator);
  });

  it('returns 404 for a CPF with no matching patient', async () => {
    const res = await request(app)
      .get('/api/patients/by-cpf/99988877766')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('finds a patient by CPF with their addresses', async () => {
    const { patient } = await createPatientWithAddress({ cpf: '11122233344' });

    const res = await request(app)
      .get('/api/patients/by-cpf/11122233344')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(patient.id);
    expect(res.body.addresses).toHaveLength(1);
  });

  it('rejects creating a patient with a CPF already in use', async () => {
    await createPatientWithAddress({ cpf: '55566677788' });

    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Outro Nome', phone: '22999991111', cpf: '55566677788' });

    expect(res.status).toBe(409);
  });

  it('updates a patient and re-validates CPF uniqueness on change', async () => {
    const { patient } = await createPatientWithAddress({ cpf: '11122233344' });
    const { patient: other } = await createPatientWithAddress({ cpf: '99988877766' });

    const okRes = await request(app)
      .put(`/api/patients/${patient.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '22988887777' });
    expect(okRes.status).toBe(200);
    expect(okRes.body.phone).toBe('22988887777');

    const conflictRes = await request(app)
      .put(`/api/patients/${patient.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ cpf: other.cpf });
    expect(conflictRes.status).toBe(409);
  });

  it('updates an address', async () => {
    const { patient, address } = await createPatientWithAddress();

    const res = await request(app)
      .put(`/api/patients/${patient.id}/addresses/${address.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ complement: 'Apto 101' });

    expect(res.status).toBe(200);
    expect(res.body.complement).toBe('Apto 101');
  });
});
