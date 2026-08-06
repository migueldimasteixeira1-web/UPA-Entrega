import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '../src/lib/useOnlineStatus';

function setNavigatorOnline(value) {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
}

describe('useOnlineStatus', () => {
  afterEach(() => setNavigatorOnline(true));

  it('starts with navigator.onLine as the initial value', () => {
    setNavigatorOnline(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it('becomes false when the browser fires "offline"', () => {
    setNavigatorOnline(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => window.dispatchEvent(new Event('offline')));
    expect(result.current).toBe(false);
  });

  it('becomes true again when the browser fires "online"', () => {
    setNavigatorOnline(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);

    act(() => window.dispatchEvent(new Event('online')));
    expect(result.current).toBe(true);
  });
});
