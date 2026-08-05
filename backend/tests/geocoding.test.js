import { describe, it, expect, vi, afterEach } from 'vitest';
import { geocodeAddress } from '../src/lib/geocoding.js';

const ADDRESS = {
  street: 'Rua Teste',
  number: '100',
  neighborhood: 'Centro',
  city: 'Cabo Frio',
  state: 'RJ',
  zipCode: '28900-000',
};

describe('geocodeAddress', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns null without ORS_API_KEY, without calling fetch', async () => {
    vi.stubEnv('ORS_API_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await geocodeAddress(ADDRESS);

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns coordinates from the first matching feature', async () => {
    vi.stubEnv('ORS_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          features: [{ geometry: { coordinates: [-42.0186, -22.8894] } }],
        }),
      })
    );

    const result = await geocodeAddress(ADDRESS);

    expect(result).toEqual({ latitude: -22.8894, longitude: -42.0186 });
  });

  it('returns null when the API responds with no features', async () => {
    vi.stubEnv('ORS_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [] }) })
    );

    const result = await geocodeAddress(ADDRESS);

    expect(result).toBeNull();
  });

  it('returns null when the API responds with a non-ok status', async () => {
    vi.stubEnv('ORS_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    const result = await geocodeAddress(ADDRESS);

    expect(result).toBeNull();
  });

  it('returns null instead of throwing when fetch rejects', async () => {
    vi.stubEnv('ORS_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const result = await geocodeAddress(ADDRESS);

    expect(result).toBeNull();
  });
});
