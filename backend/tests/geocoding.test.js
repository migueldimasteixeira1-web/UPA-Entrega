import { describe, it, expect, vi, afterEach } from 'vitest';
import { geocodeAddress } from '../src/lib/geocoding.js';

const ADDRESS_WITH_ZIP = {
  street: 'Rua Teste',
  number: '100',
  city: 'Cabo Frio',
  state: 'RJ',
  zipCode: '28900-000',
};

const ADDRESS_WITHOUT_ZIP = {
  street: 'Rua Teste',
  number: '100',
  city: 'Cabo Frio',
  state: 'RJ',
  zipCode: null,
};

describe('geocodeAddress — por CEP (AwesomeAPI, sem chave)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns coordinates from the CEP lookup without needing ORS_API_KEY', async () => {
    vi.stubEnv('ORS_API_KEY', '');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ lat: '-22.9', lng: '-42.0' }),
      })
    );

    const result = await geocodeAddress(ADDRESS_WITH_ZIP);

    expect(result).toEqual({ latitude: -22.9, longitude: -42.0 });
  });

  it('does not call the CEP API with a zip code shorter than 8 digits', async () => {
    vi.stubEnv('ORS_API_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await geocodeAddress({ ...ADDRESS_WITHOUT_ZIP, zipCode: '123' });

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null when the CEP is not found (404), without throwing', async () => {
    vi.stubEnv('ORS_API_KEY', '');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    const result = await geocodeAddress(ADDRESS_WITH_ZIP);

    expect(result).toBeNull();
  });

  it('returns null instead of throwing when the CEP lookup rejects', async () => {
    vi.stubEnv('ORS_API_KEY', '');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const result = await geocodeAddress(ADDRESS_WITH_ZIP);

    expect(result).toBeNull();
  });
});

describe('geocodeAddress — respaldo por texto (ORS, exige chave)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('falls back to ORS text search when there is no zip code', async () => {
    vi.stubEnv('ORS_API_KEY', 'test-key');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ features: [{ geometry: { coordinates: [-42.0186, -22.8894] } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await geocodeAddress(ADDRESS_WITHOUT_ZIP);

    expect(result).toEqual({ latitude: -22.8894, longitude: -42.0186 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0].toString()).toContain('openrouteservice.org');
  });

  it('falls back to ORS text search when the CEP lookup fails', async () => {
    vi.stubEnv('ORS_API_KEY', 'test-key');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 }) // AwesomeAPI
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ features: [{ geometry: { coordinates: [-42.0186, -22.8894] } }] }),
      }); // ORS
    vi.stubGlobal('fetch', fetchMock);

    const result = await geocodeAddress(ADDRESS_WITH_ZIP);

    expect(result).toEqual({ latitude: -22.8894, longitude: -42.0186 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns null without ORS_API_KEY and without a usable CEP, without calling fetch', async () => {
    vi.stubEnv('ORS_API_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await geocodeAddress(ADDRESS_WITHOUT_ZIP);

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null when the API responds with no features', async () => {
    vi.stubEnv('ORS_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [] }) }));

    const result = await geocodeAddress(ADDRESS_WITHOUT_ZIP);

    expect(result).toBeNull();
  });

  it('returns null when the API responds with a non-ok status', async () => {
    vi.stubEnv('ORS_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    const result = await geocodeAddress(ADDRESS_WITHOUT_ZIP);

    expect(result).toBeNull();
  });

  it('returns null instead of throwing when fetch rejects', async () => {
    vi.stubEnv('ORS_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const result = await geocodeAddress(ADDRESS_WITHOUT_ZIP);

    expect(result).toBeNull();
  });
});
