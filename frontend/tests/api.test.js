import { describe, it, expect, vi, afterEach } from 'vitest';
import { api, ApiError, getErrorMessage } from '../src/lib/api';

describe('getErrorMessage', () => {
  it('returns the message from an ApiError', () => {
    expect(getErrorMessage(new ApiError('CPF já cadastrado', 409))).toBe('CPF já cadastrado');
  });

  it('returns a generic fallback for anything that is not an ApiError', () => {
    expect(getErrorMessage(new TypeError('Failed to fetch'))).toBe('Algo deu errado. Tente novamente.');
    expect(getErrorMessage('a plain string')).toBe('Algo deu errado. Tente novamente.');
  });
});

describe('request() network vs. server error handling', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('wraps a fetch rejection (offline/DNS/etc.) in an ApiError with a connectivity message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(api.getStats()).rejects.toMatchObject({
      message: 'Verifique sua conexão com a internet e tente novamente.',
      status: 0,
    });
  });

  it('propagates the server-provided message when the API responds with an error status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Acesso negado' }),
      })
    );

    await expect(api.getStats()).rejects.toMatchObject({ message: 'Acesso negado', status: 403 });
  });

  it('resolves normally when the request succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ total: 3 }),
      })
    );

    await expect(api.getStats()).resolves.toEqual({ total: 3 });
  });
});
