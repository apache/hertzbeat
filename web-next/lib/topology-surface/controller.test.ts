import { describe, expect, it, vi } from 'vitest';
import {
  CMDB_TOPOLOGY_API_TIMEOUT_MS,
  buildTopologyApiUrl,
  hasUnresolvableTopologyFocusEntity,
  loadTopologyGraph,
  shouldPreservePreviousTopologyGraphDuringLoad,
  resolveTopologyApiTimeoutMs
} from './controller';

describe('topology API controller', () => {
  it('resolves topology timeRange into concrete API start and end bounds', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T10:00:00.000Z'));
    try {
      expect(
        buildTopologyApiUrl({
          entityId: '501',
          environment: 'prod',
          sourceKind: 'otlp-trace-call',
          viewMode: 'service-call',
          timeRange: 'last-1h'
        })
      ).toBe(
        '/topology?focusEntityId=501&depth=2&environment=prod&relationType=trace-call&start=1780218000000&end=1780221600000'
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not apply timeRange bounds to CMDB manual-label topology reads', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T10:00:00.000Z'));
    try {
      expect(
        buildTopologyApiUrl({
          environment: 'prod',
          sourceKind: 'cmdb-manual-label',
          viewMode: 'application',
          timeRange: 'last-1h'
        })
      ).toBe('/topology?depth=2&environment=prod&sourceKind=cmdb-manual-label');
    } finally {
      vi.useRealTimers();
    }
  });

  it('applies timeRange bounds to all-source topology reads so mixed trace edges cannot leak from stale windows', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T10:00:00.000Z'));
    try {
      expect(
        buildTopologyApiUrl({
          environment: 'prod',
          viewMode: 'application',
          timeRange: 'last-1h'
        })
      ).toBe('/topology?depth=2&environment=prod&start=1780218000000&end=1780221600000');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps application OTLP source filters on the mixed topology read so edge endpoints stay available for G6 filtering', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T10:00:00.000Z'));
    try {
      expect(
        buildTopologyApiUrl({
          environment: 'prod',
          sourceKind: 'otlp-trace-call',
          viewMode: 'application',
          timeRange: 'last-1h'
        })
      ).toBe('/topology?depth=2&environment=prod&start=1780218000000&end=1780221600000');
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses the longer topology API timeout for CMDB manual-label reads so slow catalog queries are not aborted before retry', () => {
    expect(
      resolveTopologyApiTimeoutMs({
        environment: 'prod',
        sourceKind: 'cmdb-manual-label',
        viewMode: 'application',
        timeRange: 'last-1h'
      })
    ).toBe(CMDB_TOPOLOGY_API_TIMEOUT_MS);
  });

  it('retries a transient CMDB manual-label read once before degrading the topology surface', async () => {
    const graph = {
      apiBacked: true,
      focusEntityId: null,
      depth: 2,
      sourceKinds: ['cmdb-manual-label'],
      nodes: [
        { id: '642126742338816', entityId: 642126742338816, entityName: 'Payment API', entityType: 'service' }
      ],
      edges: []
    };
    const apiGet = vi
      .fn()
      .mockRejectedValueOnce(new Error('transient proxy stall'))
      .mockResolvedValueOnce(graph);

    await expect(
      loadTopologyGraph(apiGet, {
        environment: 'prod',
        sourceKind: 'cmdb-manual-label',
        viewMode: 'application',
        timeRange: 'last-1h'
      })
    ).resolves.toBe(graph);
    expect(apiGet).toHaveBeenCalledTimes(2);
    expect(apiGet).toHaveBeenNthCalledWith(1, '/topology?depth=2&environment=prod&sourceKind=cmdb-manual-label');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/topology?depth=2&environment=prod&sourceKind=cmdb-manual-label');
  });

  it('does not retry trace-call topology reads because they already use an explicit long timeout', async () => {
    const apiGet = vi.fn().mockRejectedValue(new Error('trace query unavailable'));

    await expect(
      loadTopologyGraph(apiGet, {
        environment: 'prod',
        sourceKind: 'otlp-trace-call',
        viewMode: 'service-call',
        timeRange: 'last-1h'
      })
    ).rejects.toThrow('trace query unavailable');
    expect(apiGet).toHaveBeenCalledTimes(1);
  });

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
      '/topology?focusEntityId=501&depth=1&environment=prod&relationType=trace-call&hideInternal=true&pageIndex=2&pageSize=50&start=1710000000000&end=1710003600000'
    );
    expect(buildTopologyApiUrl({ entityId: 'service:commerce/checkout', environment: 'prod' })).toBe(
      '/topology?depth=2&environment=prod'
    );
  });

  it('maps the local Greptime scale proof route to the seeded focused gateway API scope', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T10:00:00.000Z'));
    try {
      expect(
        buildTopologyApiUrl({
          environment: 'prod',
          timeRange: 'last-7d',
          sourceKind: 'otlp-trace-call',
          viewMode: 'service-call',
          depth: '2',
          scaleProof: 'greptime-real'
        })
      ).toBe(
        '/topology?focusEntityId=646562420231424&depth=2&environment=prod&relationType=trace-call&start=1780344000000&end=1780352700000'
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the Greptime scale proof route on the seeded proof window after relative time moves forward', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-02T04:30:00.000Z'));
    try {
      expect(
        buildTopologyApiUrl({
          environment: 'prod',
          timeRange: 'last-7d',
          sourceKind: 'otlp-trace-call',
          viewMode: 'service-call',
          depth: '2',
          scaleProof: 'greptime-real'
        })
      ).toBe(
        '/topology?focusEntityId=646562420231424&depth=2&environment=prod&relationType=trace-call&start=1780344000000&end=1780352700000'
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the mixed star/mesh scale proof on the global Greptime API scope', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T10:00:00.000Z'));
    try {
      expect(
        buildTopologyApiUrl({
          environment: 'prod',
          timeRange: 'last-7d',
          sourceKind: 'otlp-trace-call',
          viewMode: 'service-call',
          depth: '2',
          scaleProof: 'mixed-star-mesh'
        })
      ).toBe('/topology?depth=2&environment=prod&relationType=trace-call&start=1780344000000&end=1780352700000');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the mixed star/mesh scale proof on the seeded proof window after relative time moves forward', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-02T04:30:00.000Z'));
    try {
      expect(
        buildTopologyApiUrl({
          environment: 'prod',
          timeRange: 'last-7d',
          sourceKind: 'otlp-trace-call',
          viewMode: 'service-call',
          depth: '2',
          scaleProof: 'mixed-star-mesh'
        })
      ).toBe('/topology?depth=2&environment=prod&relationType=trace-call&start=1780344000000&end=1780352700000');
    } finally {
      vi.useRealTimers();
    }
  });

  it('marks non-numeric focused entity ids as unresolvable for the numeric topology API', () => {
    expect(hasUnresolvableTopologyFocusEntity({ entityId: 'service:commerce/checkout' })).toBe(true);
    expect(hasUnresolvableTopologyFocusEntity({ entityId: 'missing-topology-entity' })).toBe(true);
    expect(hasUnresolvableTopologyFocusEntity({ entityId: '501' })).toBe(false);
    expect(hasUnresolvableTopologyFocusEntity({})).toBe(false);
  });

  it('defaults service-call topology API reads to trace-call relation scope without hiding persisted OTLP relation evidence', async () => {
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
      '/topology?depth=2&environment=prod&relationType=trace-call'
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
        '/topology?depth=2&relationType=trace-call',
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
      '/topology?depth=2&relationType=trace-call',
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

  it('reuses a recently completed topology prefetch when the heavy page mounts after the route-client request resolved', async () => {
    const graph = {
      apiBacked: true,
      focusEntityId: null,
      depth: 2,
      sourceKinds: ['cmdb-manual-label'],
      nodes: [],
      edges: []
    };
    const apiGet = vi.fn(async () => graph);

    await expect(
      loadTopologyGraph(apiGet, { sourceKind: 'cmdb-manual-label', viewMode: 'application' }, { timeoutMs: 60000 })
    ).resolves.toBe(graph);
    await expect(
      loadTopologyGraph(apiGet, { sourceKind: 'cmdb-manual-label', viewMode: 'application' }, { timeoutMs: 60000 })
    ).resolves.toBe(graph);

    expect(apiGet).toHaveBeenCalledTimes(1);
  });

  it('does not reuse completed topology reads for scale proof routes because Greptime proof data can be reseeded in place', async () => {
    const staleGraph = {
      apiBacked: true,
      focusEntityId: null,
      depth: 2,
      sourceKinds: ['otlp-trace-call'],
      nodes: [{ id: 'stale-node' }],
      edges: [{ id: 'stale-edge' }]
    };
    const freshGraph = {
      apiBacked: true,
      focusEntityId: null,
      depth: 2,
      sourceKinds: ['otlp-trace-call'],
      nodes: [{ id: 'fresh-node-a' }, { id: 'fresh-node-b' }],
      edges: [{ id: 'fresh-edge-a' }, { id: 'fresh-edge-b' }]
    };
    const apiGet = vi.fn()
      .mockResolvedValueOnce(staleGraph)
      .mockResolvedValueOnce(freshGraph);
    const context = {
      environment: 'prod',
      sourceKind: 'otlp-trace-call',
      viewMode: 'service-call',
      depth: '2',
      scaleProof: 'mixed-star-mesh'
    };

    await expect(loadTopologyGraph(apiGet, context, { timeoutMs: 60000 })).resolves.toBe(staleGraph);
    await expect(loadTopologyGraph(apiGet, context, { timeoutMs: 60000 })).resolves.toBe(freshGraph);

    expect(apiGet).toHaveBeenCalledTimes(2);
  });

  it('cache-busts volatile scale proof fetches without changing the clean topology API request path', async () => {
    const graph = {
      apiBacked: true,
      focusEntityId: null,
      depth: 2,
      sourceKinds: ['otlp-trace-call'],
      nodes: [],
      edges: []
    };
    const apiGet = vi.fn().mockResolvedValue(graph);
    const context = {
      environment: 'prod',
      viewMode: 'service-call',
      sourceKind: 'otlp-trace-call',
      depth: '2',
      scaleProof: 'mixed-star-mesh'
    };

    expect(buildTopologyApiUrl(context)).toBe(
      '/topology?depth=2&environment=prod&relationType=trace-call&start=1780344000000&end=1780352700000'
    );

    await expect(loadTopologyGraph(apiGet, context, { cacheBust: () => 'proof-1' })).resolves.toBe(graph);

    expect(apiGet).toHaveBeenCalledWith(
      '/topology?depth=2&environment=prod&relationType=trace-call&start=1780344000000&end=1780352700000&_hbTopologyCacheBust=proof-1'
    );
  });

  it('bypasses completed topology cache when an explicit refresh cache-bust is provided', async () => {
    const staleGraph = {
      apiBacked: true,
      focusEntityId: null,
      depth: 2,
      sourceKinds: ['entity-relation'],
      nodes: [{ id: 'stale-node' }],
      edges: []
    };
    const freshGraph = {
      apiBacked: true,
      focusEntityId: null,
      depth: 2,
      sourceKinds: ['entity-relation'],
      nodes: [{ id: 'fresh-node' }],
      edges: []
    };
    const apiGet = vi.fn()
      .mockResolvedValueOnce(staleGraph)
      .mockResolvedValueOnce(freshGraph);
    const context = {
      environment: 'prod',
      viewMode: 'application',
      sourceKind: 'cmdb-manual-label'
    };

    await expect(loadTopologyGraph(apiGet, context, { timeoutMs: 60000 })).resolves.toBe(staleGraph);
    await expect(loadTopologyGraph(apiGet, context, { timeoutMs: 60000, cacheBust: () => 'manual-1' })).resolves.toBe(freshGraph);

    expect(apiGet).toHaveBeenNthCalledWith(1, '/topology?depth=2&environment=prod&sourceKind=cmdb-manual-label', expect.any(Object));
    expect(apiGet).toHaveBeenNthCalledWith(
      2,
      '/topology?depth=2&environment=prod&sourceKind=cmdb-manual-label&_hbTopologyCacheBust=manual-1',
      expect.any(Object)
    );
  });

  it('does not preserve the previous graph while volatile scale proof and refresh reads are loading', () => {
    expect(shouldPreservePreviousTopologyGraphDuringLoad({ sourceKind: 'cmdb-manual-label', viewMode: 'application' })).toBe(true);
    expect(shouldPreservePreviousTopologyGraphDuringLoad({ scaleProof: 'mixed-star-mesh' })).toBe(false);
    expect(shouldPreservePreviousTopologyGraphDuringLoad({ sourceKind: 'otlp-trace-call', refresh: '30' })).toBe(false);
    expect(shouldPreservePreviousTopologyGraphDuringLoad({ sourceKind: 'otlp-trace-call', live: 'true' })).toBe(false);
  });
});
