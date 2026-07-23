/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';
import type { ExactTimeWindow } from '@/shared/query-context';
import type { TopologyGraph } from '../api/topology-schema';
import { TopologyContractError } from '../model/topology-model';

const api = vi.hoisted(() => ({ loadTopologyGraph: vi.fn() }));
vi.mock('../api/topology-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/topology-api')>()),
  loadTopologyGraph: api.loadTopologyGraph
}));

import { useTopologyPageController } from './use-topology-page-controller';

describe('topology page controller evidence and time scope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadTopologyGraph.mockResolvedValue(topologyGraph(['1']));
  });
  afterEach(cleanup);

  it('prefers an exact URL window over the effective shared window and forwards AbortSignal', async () => {
    const view = renderController('/topology?depth=2&start=1000&end=2000', { from: 3000, to: 4000 }, 4);
    await waitFor(() => expect(view.current().state.evidence.kind).toBe('ready'));
    expect(api.loadTopologyGraph).toHaveBeenCalledWith(
      { depth: 2, window: { from: 1000, to: 2000 } },
      expect.any(AbortSignal)
    );
  });

  it('uses the effective shared window only when the URL has no exact window', async () => {
    const view = renderController('/topology?depth=1', { from: 3000, to: 4000 }, 2);
    await waitFor(() => expect(view.current().state.evidence.kind).toBe('ready'));
    expect(api.loadTopologyGraph).toHaveBeenCalledWith(
      { depth: 1, window: { from: 3000, to: 4000 } },
      expect.any(AbortSignal)
    );
  });

  it('fails an incomplete URL window closed as contract without a request', () => {
    const view = renderController('/topology?start=1000', { from: 3000, to: 4000 });
    expect(view.current().state.evidence.kind).toBe('contract');
    expect(api.loadTopologyGraph).not.toHaveBeenCalled();
  });

  it.each([
    [new ApiMessageError('private permission', { status: 403 }), 'permission'],
    [new ApiMessageError('private offline', { status: 503 }), 'unavailable'],
    [new TopologyContractError(), 'contract'],
    [new Error('private failure'), 'error']
  ] as const)('models a redacted %s failure', async (reason, kind) => {
    api.loadTopologyGraph.mockRejectedValue(reason);
    const view = renderController('/topology');
    await waitFor(() => expect(view.current().state.evidence.kind).toBe(kind));
    expect(view.current().state.evidence).toEqual({ kind });
  });

  it('distinguishes loading, honest empty, and ready graph evidence', async () => {
    const pending = deferred<TopologyGraph>();
    api.loadTopologyGraph.mockReturnValueOnce(pending.promise);
    const view = renderController('/topology');
    expect(view.current().state.evidence.kind).toBe('loading');
    act(() => pending.resolve(topologyGraph([])));
    await waitFor(() => expect(view.current().state.evidence.kind).toBe('empty'));
    view.unmount();

    api.loadTopologyGraph.mockResolvedValue(topologyGraph(['1']));
    const ready = renderController('/topology');
    await waitFor(() => expect(ready.current().state.evidence.kind).toBe('ready'));
  });
});

describe('topology page controller lifecycle', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it('aborts pending fetch work on unmount without settling local state', async () => {
    const pending = deferred<TopologyGraph>();
    let signal: AbortSignal | undefined;
    api.loadTopologyGraph.mockImplementation((_query, requestSignal) => {
      signal = requestSignal;
      return pending.promise;
    });
    const view = renderController('/topology');
    await waitFor(() => expect(signal).toBeDefined());

    view.unmount();
    await waitFor(() => expect(signal?.aborted).toBe(true));
    act(() => pending.resolve(topologyGraph(['1'])));
  });
});

function renderController(entry: string, effectiveWindow?: ExactTimeWindow, refreshRevision = 0) {
  let controller: ReturnType<typeof useTopologyPageController> | undefined;
  function Probe() {
    controller = useTopologyPageController({
      ...(effectiveWindow ? { effectiveWindow } : {}),
      refreshRevision
    });
    return null;
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const router = createMemoryRouter([{ path: '*', element: <Probe /> }], { initialEntries: [entry] });
  const rendered = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return {
    client,
    router,
    unmount: rendered.unmount,
    current: () => {
      if (!controller) throw new Error('controller not mounted');
      return controller;
    }
  };
}

function topologyGraph(nodeIds: string[]): TopologyGraph {
  return {
    apiBacked: true,
    focusEntityId: nodeIds[0] ? Number(nodeIds[0]) : null,
    depth: 1,
    sourceKinds: [],
    nodes: nodeIds.map(topologyNode),
    edges: [],
    impactTimeline: []
  };
}

function topologyNode(id: string): TopologyGraph['nodes'][number] {
  return {
    id,
    entityId: Number(id),
    entityName: `service-${id}`,
    entityType: 'service',
    namespace: 'default',
    environment: 'prod',
    health: 'healthy',
    focus: id === '1',
    evidenceBadges: [],
    redMetrics: {
      requestRatePerSecond: null,
      requestCount: null,
      errorRate: null,
      errorCount: null,
      latencyP95Ms: null,
      latencyAvgMs: null
    }
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(next => {
    resolve = next;
  });
  return { promise, resolve };
}
