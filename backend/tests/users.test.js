import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, createUser, loginAs } from './helpers.js';

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
    expect(Object.keys(found).sort()).toEqual(['id', 'name']);
  });
});
