import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { app, createUser } from './helpers.js';

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
