import { describe, it, expect, vi, afterEach } from 'vitest';
import { optimizeDeliverySequence } from '../src/lib/routing/optimize.js';

const STOPS = [
  { id: 'a', latitude: -22.88, longitude: -42.02 },
  { id: 'b', latitude: -22.89, longitude: -42.03 },
  { id: 'c', latitude: -22.9, longitude: -42.04 },
];

describe('optimizeDeliverySequence', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns null without ORS_API_KEY, without calling fetch', async () => {
    vi.stubEnv('ORS_API_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await optimizeDeliverySequence(STOPS);

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null with fewer than 2 geocoded stops, without calling fetch', async () => {
    vi.stubEnv('ORS_API_KEY', 'test-key');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await optimizeDeliverySequence([{ id: 'a', latitude: -22.88, longitude: -42.02 }]);

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reorders ids according to the optimized route steps', async () => {
    vi.stubEnv('ORS_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          routes: [
            {
              steps: [
                { type: 'start' },
                { type: 'job', job: 2 },
                { type: 'job', job: 0 },
                { type: 'job', job: 1 },
                { type: 'end' },
              ],
            },
          ],
        }),
      })
    );

    const result = await optimizeDeliverySequence(STOPS);

    expect(result).toEqual(['c', 'a', 'b']);
  });

  it('appends ungeocoded stops at the end, in their original order', async () => {
    vi.stubEnv('ORS_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          routes: [
            {
              steps: [
                { type: 'job', job: 1 },
                { type: 'job', job: 0 },
              ],
            },
          ],
        }),
      })
    );

    const stopsWithMissing = [
      { id: 'a', latitude: -22.88, longitude: -42.02 },
      { id: 'b', latitude: -22.89, longitude: -42.03 },
      { id: 'no-coords', latitude: null, longitude: null },
    ];

    const result = await optimizeDeliverySequence(stopsWithMissing);

    expect(result).toEqual(['b', 'a', 'no-coords']);
  });

  it('returns null when the API responds with a non-ok status', async () => {
    vi.stubEnv('ORS_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const result = await optimizeDeliverySequence(STOPS);

    expect(result).toBeNull();
  });

  it('returns null instead of throwing when fetch rejects', async () => {
    vi.stubEnv('ORS_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const result = await optimizeDeliverySequence(STOPS);

    expect(result).toBeNull();
  });
});
