import { describe, expect, it, vi } from 'vitest';
import { buildTopologyApiUrl, loadTopologyGraph } from './controller';

describe('topology API controller', () => {
  it('builds the focused topology API URL from numeric entity route context', async () => {
    const apiGet = vi.fn(async () => ({
      apiBacked: true,
      focusEntityId: 501,
      depth: 2,
      sourceKinds: ['otlp-trace-call'],
      nodes: [],
      edges: []
    }));

    await loadTopologyGraph(apiGet, {
      entityId: '501',
      environment: 'prod',
      sourceKind: 'otlp-trace-call',
      depth: '1',
      relationType: 'trace-call',
      hideInternal: 'true',
      pageIndex: '2',
      pageSize: '50',
      start: '1710000000000',
      end: '1710003600000'
    });

    expect(apiGet).toHaveBeenCalledWith(
      '/topology?focusEntityId=501&depth=1&environment=prod&sourceKind=otlp-trace-call&relationType=trace-call&hideInternal=true&pageIndex=2&pageSize=50&start=1710000000000&end=1710003600000'
    );
    expect(buildTopologyApiUrl({ entityId: 'service:commerce/checkout', environment: 'prod' })).toBe(
      '/topology?depth=2&environment=prod'
    );
  });

  it('defaults service-call topology API reads to trace-call relation scope', async () => {
    const apiGet = vi.fn(async () => ({
      apiBacked: true,
      focusEntityId: null,
      depth: 2,
      sourceKinds: ['otlp-trace-call'],
      nodes: [],
      edges: []
    }));

    await loadTopologyGraph(apiGet, {
      environment: 'prod',
      sourceKind: 'otlp-trace-call',
      viewMode: 'service-call'
    });

    expect(apiGet).toHaveBeenCalledWith(
      '/topology?depth=2&environment=prod&sourceKind=otlp-trace-call&relationType=trace-call'
    );
    expect(buildTopologyApiUrl({ environment: 'prod', viewMode: 'service-call' })).toBe(
      '/topology?depth=2&environment=prod&relationType=trace-call'
    );
    expect(buildTopologyApiUrl({ environment: 'prod', sourceKind: 'entity-relation' })).toBe(
      '/topology?depth=2&environment=prod&sourceKind=entity-relation'
    );
  });

  it('rejects stalled topology API reads after the configured timeout so the page can degrade', async () => {
    vi.useFakeTimers();
    try {
      const apiGet = vi.fn(() => new Promise<never>(() => {}));
      const load = loadTopologyGraph(apiGet, { sourceKind: 'otlp-trace-call', relationType: 'trace-call' }, { timeoutMs: 25 });
      const rejection = expect(load).rejects.toThrow('Topology API request timed out after 25ms');

      await vi.advanceTimersByTimeAsync(25);

      await rejection;
      expect(apiGet).toHaveBeenCalledWith(
        '/topology?depth=2&sourceKind=otlp-trace-call&relationType=trace-call',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('aborts stalled topology API reads after timeout so slow backend work is not left dangling', async () => {
    vi.useFakeTimers();
    try {
      let capturedSignal: AbortSignal | undefined;
      const apiGet = vi.fn((_path: string, init?: RequestInit) => {
        capturedSignal = init?.signal ?? undefined;
        return new Promise<never>(() => {});
      });
      const load = loadTopologyGraph(apiGet, { sourceKind: 'otlp-trace-call', relationType: 'trace-call' }, { timeoutMs: 25 });
      const rejection = expect(load).rejects.toThrow('Topology API request timed out after 25ms');

      expect(capturedSignal).toBeDefined();
      expect(capturedSignal?.aborted).toBe(false);

      await vi.advanceTimersByTimeAsync(25);

      expect(capturedSignal?.aborted).toBe(true);
      await rejection;
    } finally {
      vi.useRealTimers();
    }
  });

  it('deduplicates identical in-flight topology API reads so slow trace-call routes do not double query Greptime', async () => {
    let resolveGraph: ((graph: { apiBacked: boolean; focusEntityId: null; depth: number; sourceKinds: string[]; nodes: never[]; edges: never[] }) => void) | undefined;
    const apiGet = vi.fn(
      () =>
        new Promise<{ apiBacked: boolean; focusEntityId: null; depth: number; sourceKinds: string[]; nodes: never[]; edges: never[] }>(resolve => {
          resolveGraph = resolve;
        })
    );

    const first = loadTopologyGraph(apiGet, { sourceKind: 'otlp-trace-call', viewMode: 'service-call' }, { timeoutMs: 30000 });
    const second = loadTopologyGraph(apiGet, { sourceKind: 'otlp-trace-call', viewMode: 'service-call' }, { timeoutMs: 30000 });

    expect(apiGet).toHaveBeenCalledTimes(1);
    expect(apiGet).toHaveBeenCalledWith(
      '/topology?depth=2&sourceKind=otlp-trace-call&relationType=trace-call',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );

    resolveGraph?.({
      apiBacked: true,
      focusEntityId: null,
      depth: 2,
      sourceKinds: ['otlp-trace-call'],
      nodes: [],
      edges: []
    });

    await expect(first).resolves.toMatchObject({ apiBacked: true, sourceKinds: ['otlp-trace-call'] });
    await expect(second).resolves.toMatchObject({ apiBacked: true, sourceKinds: ['otlp-trace-call'] });
  });
});
