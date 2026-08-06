import { describe, it, expect, vi, afterEach } from 'vitest';

async function importJwtModule() {
  vi.resetModules();
  return import('../src/lib/jwt.js');
}

describe('jwt secret guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws on import when NODE_ENV=production and JWT_SECRET is missing', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JWT_SECRET', '');

    await expect(importJwtModule()).rejects.toThrow('JWT_SECRET precisa ser definido');
  });

  it('throws on import when NODE_ENV=production and JWT_SECRET is the dev fallback value', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JWT_SECRET', 'dev_secret');

    await expect(importJwtModule()).rejects.toThrow('JWT_SECRET precisa ser definido');
  });

  it('imports fine when NODE_ENV=production and a real JWT_SECRET is set', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JWT_SECRET', 'a-real-production-secret');

    await expect(importJwtModule()).resolves.toBeDefined();
  });

  it('imports fine outside production even without JWT_SECRET (falls back to dev secret)', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('JWT_SECRET', '');

    const { signToken, verifyToken } = await importJwtModule();
    const token = signToken({ userId: '1' });
    expect(verifyToken(token).userId).toBe('1');
  });
});
