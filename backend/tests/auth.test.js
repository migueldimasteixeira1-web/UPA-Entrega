import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { app, createUser, loginAs } from './helpers.js';

describe('POST /api/auth/login', () => {
  it('returns a token for valid credentials', async () => {
    const user = await createUser({ role: 'ADMIN' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.plainPassword });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('ADMIN');
  });

  it('rejects wrong password with 401', async () => {
    const user = await createUser();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Credenciais inválidas');
  });

  it('rejects a missing password with a friendly 400, not a generic zod message', async () => {
    const user = await createUser();

    const res = await request(app).post('/api/auth/login').send({ email: user.email });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('E-mail e senha são obrigatórios');
  });

  it('rate-limits repeated login attempts from the same client', async () => {
    // App próprio, com limite baixo, para não depender/afetar o contador em
    // memória do rate limiter compartilhado pelos demais testes.
    const isolatedApp = createApp({ loginRateLimit: { windowMs: 15 * 60 * 1000, limit: 3 } });
    const user = await createUser();

    let lastStatus;
    for (let i = 0; i < 4; i += 1) {
      const res = await request(isolatedApp)
        .post('/api/auth/login')
        .send({ email: user.email, password: 'wrong-password' });
      lastStatus = res.status;
    }

    expect(lastStatus).toBe(429);
  });
});

describe('POST /api/auth/change-password', () => {
  it('changes the password with the correct current password', async () => {
    const user = await createUser();
    const token = await loginAs(user);

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: user.plainPassword, newPassword: 'NovaSenha@456' });

    expect(res.status).toBe(200);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'NovaSenha@456' });
    expect(loginRes.status).toBe(200);
  });

  it('rejects the wrong current password with 400', async () => {
    const user = await createUser();
    const token = await loginAs(user);

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'senha-errada', newPassword: 'NovaSenha@456' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Senha atual incorreta');
  });

  // Regressão (issue #51): antes desta rota validar com zod, um corpo malformado
  // (tipo errado em vez de ausente) chegava até bcrypt.compare e podia lançar,
  // caindo no catch genérico → 500 em vez de um 400 limpo como o resto da API.
  it('rejects a malformed body (wrong type) with 400, not 500', async () => {
    const user = await createUser();
    const token = await loginAs(user);

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: { not: 'a string' }, newPassword: 'NovaSenha@456' });

    expect(res.status).toBe(400);
  });

  it('rejects a new password shorter than 6 characters with 400', async () => {
    const user = await createUser();
    const token = await loginAs(user);

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: user.plainPassword, newPassword: '123' });

    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ currentPassword: 'x', newPassword: 'NovaSenha@456' });

    expect(res.status).toBe(401);
  });
});
