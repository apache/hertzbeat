import { afterEach, describe, expect, it, vi } from 'vitest';
import { consumeWorkbenchLoad, resetWorkbenchLoadCache } from './workbench-load-cache';

describe('workbench load cache', () => {
  afterEach(() => {
    resetWorkbenchLoadCache();
  });

  it('reuses the same in-flight promise for the same cache key', async () => {
    let resolveLoad: ((value: string) => void) | null = null;
    const load = vi.fn(() => new Promise<string>(resolve => {
      resolveLoad = resolve;
    }));

    const first = consumeWorkbenchLoad('trace:list?traceId=demo', load);
    const second = consumeWorkbenchLoad('trace:list?traceId=demo', load);

    expect(load).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);

    resolveLoad?.('ready');

    await expect(first).resolves.toBe('ready');
    await expect(second).resolves.toBe('ready');
  });

  it('clears the cache after the promise settles', async () => {
    const load = vi.fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');

    await expect(consumeWorkbenchLoad('trace:list?traceId=demo', load)).resolves.toBe('first');
    await expect(consumeWorkbenchLoad('trace:list?traceId=demo', load)).resolves.toBe('second');

    expect(load).toHaveBeenCalledTimes(2);
  });

  it('clears the cache after a rejection so the next attempt can retry', async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('recovered');

    await expect(consumeWorkbenchLoad('trace:list?traceId=demo', load)).rejects.toThrow('boom');
    await expect(consumeWorkbenchLoad('trace:list?traceId=demo', load)).resolves.toBe('recovered');

    expect(load).toHaveBeenCalledTimes(2);
  });
});
