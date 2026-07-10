import { afterEach, describe, expect, it, vi } from 'vitest';
import { consumeWorkbenchLoad, forgetWorkbenchLoad, resetWorkbenchLoadCache } from './workbench-load-cache';

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

  it('can keep a settled result for a short ttl when shared chrome needs the same state', async () => {
    let now = 1_000;
    const load = vi.fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');

    await expect(
      consumeWorkbenchLoad('app-frame:header-state:zh-CN', load, {
        settledTtlMs: 500,
        now: () => now,
      })
    ).resolves.toBe('first');
    await expect(
      consumeWorkbenchLoad('app-frame:header-state:zh-CN', load, {
        settledTtlMs: 500,
        now: () => now,
      })
    ).resolves.toBe('first');

    now = 1_501;

    await expect(
      consumeWorkbenchLoad('app-frame:header-state:zh-CN', load, {
        settledTtlMs: 500,
        now: () => now,
      })
    ).resolves.toBe('second');

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

  it('can forget a single pending cache key so a timeout retry starts a fresh load', async () => {
    const load = vi.fn(() => new Promise<string>(() => {}));

    const first = consumeWorkbenchLoad('entity-detail:/entities/42/detail', load);
    forgetWorkbenchLoad('entity-detail:/entities/42/detail');
    const second = consumeWorkbenchLoad('entity-detail:/entities/42/detail', load);

    expect(load).toHaveBeenCalledTimes(2);
    expect(second).not.toBe(first);
  });
});
