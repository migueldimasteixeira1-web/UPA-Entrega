import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useObjectUrl } from '../src/lib/useObjectUrl';

describe('useObjectUrl', () => {
  let createObjectURL;
  let revokeObjectURL;

  beforeEach(() => {
    let counter = 0;
    createObjectURL = vi.fn(() => `blob:mock-${counter++}`);
    revokeObjectURL = vi.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when there is no file', () => {
    const { result } = renderHook(() => useObjectUrl(null));
    expect(result.current).toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('creates a blob URL for a file', () => {
    const file = new File(['conteudo'], 'foto.png', { type: 'image/png' });
    const { result } = renderHook(() => useObjectUrl(file));

    expect(createObjectURL).toHaveBeenCalledWith(file);
    expect(result.current).toBe('blob:mock-0');
  });

  it('revokes the previous URL when the file changes', () => {
    const fileA = new File(['a'], 'a.png', { type: 'image/png' });
    const fileB = new File(['b'], 'b.png', { type: 'image/png' });

    const { result, rerender } = renderHook(({ file }) => useObjectUrl(file), {
      initialProps: { file: fileA },
    });
    const firstUrl = result.current;

    rerender({ file: fileB });

    expect(revokeObjectURL).toHaveBeenCalledWith(firstUrl);
    expect(result.current).not.toBe(firstUrl);
  });

  it('revokes the URL and returns null when the file is cleared', () => {
    const file = new File(['a'], 'a.png', { type: 'image/png' });

    const { result, rerender } = renderHook(({ f }) => useObjectUrl(f), {
      initialProps: { f: file },
    });
    const url = result.current;

    rerender({ f: null });

    expect(revokeObjectURL).toHaveBeenCalledWith(url);
    expect(result.current).toBeNull();
  });

  it('revokes the URL on unmount', () => {
    const file = new File(['a'], 'a.png', { type: 'image/png' });
    const { result, unmount } = renderHook(() => useObjectUrl(file));
    const url = result.current;

    unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith(url);
  });
});
