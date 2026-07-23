/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';
import type { TopologyGraph } from '../api/topology-schema';
import { topologyQueryKeys } from './topology-query-keys';

const api = vi.hoisted(() => ({ loadTopologyGraph: vi.fn() }));
vi.mock('../api/topology-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/topology-api')>()),
  loadTopologyGraph: api.loadTopologyGraph
}));

import { useTopologyPageController } from './use-topology-page-controller';

describe('topology page controller refresh and interaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadTopologyGraph.mockResolvedValue(topologyGraph(['1', '2']));
  });
  afterEach(cleanup);

  it('keeps the same-key canvas during refetch and clears selection missing from refreshed evidence', async () => {
    const view = renderController('/topology');
    await waitFor(() => expect(view.current().state.evidence.kind).toBe('ready'));
    act(() => view.current().actions.selectNode('2'));
    expect(view.current().state.interaction.selected).toEqual({ kind: 'node', nodeId: '2' });

    const pending = deferred<TopologyGraph>();
    api.loadTopologyGraph.mockReturnValueOnce(pending.promise);
    act(() => view.current().actions.refresh());
    await waitFor(() => expect(view.current().state.refreshing).toBe(true));
    expect(view.current().state.evidence.kind).toBe('ready');
    act(() => pending.resolve(topologyGraph(['1'])));
    await waitFor(() => expect(view.current().state.refreshing).toBe(false));
    await waitFor(() => expect(view.current().state.interaction.selected).toEqual({ kind: 'none' }));
  });

  it('clears old graph and interaction before a changed query scope resolves', async () => {
    const second = deferred<TopologyGraph>();
    api.loadTopologyGraph.mockImplementation(query =>
      query.depth === 2 ? second.promise : Promise.resolve(topologyGraph(['1']))
    );
    const view = renderController('/topology?depth=1');
    await waitFor(() => expect(view.current().state.evidence.kind).toBe('ready'));
    act(() => view.current().actions.selectNode('1'));
    view.client.setQueryData(topologyQueryKeys.graph({ depth: 2 }), topologyGraph(['3']));

    await act(async () => view.router.navigate('/topology?depth=2'));
    expect(view.current().state.evidence.kind).toBe('loading');
    expect(view.current().state.interaction.selected).toEqual({ kind: 'none' });
    act(() => second.resolve(topologyGraph(['2'])));
    await waitFor(() => expect(view.current().state.evidence.kind).toBe('ready'));
  });
});

describe('topology page refresh revision and failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadTopologyGraph.mockResolvedValue(topologyGraph(['1', '2']));
  });
  afterEach(cleanup);

  it('keeps canvas and selection when only refreshRevision changes', async () => {
    const view = renderController('/topology');
    await waitFor(() => expect(view.current().state.evidence.kind).toBe('ready'));
    act(() => view.current().actions.selectNode('2'));
    const pending = deferred<TopologyGraph>();
    api.loadTopologyGraph.mockReturnValueOnce(pending.promise);

    act(() => view.setRevision(1));
    await waitFor(() => expect(view.current().state.refreshing).toBe(true));
    expect(view.current().state.evidence.kind).toBe('ready');
    expect(view.current().state.interaction.selected).toEqual({ kind: 'node', nodeId: '2' });
    act(() => pending.resolve(topologyGraph(['1', '2'])));
    await waitFor(() => expect(view.current().state.refreshing).toBe(false));
  });

  it('keeps the ready graph and exposes only a safe failure kind when same-scope refresh fails', async () => {
    const view = renderController('/topology');
    await waitFor(() => expect(view.current().state.evidence.kind).toBe('ready'));
    act(() => view.current().actions.selectNode('1'));
    api.loadTopologyGraph.mockRejectedValueOnce(new ApiMessageError('private backend message', { status: 503 }));

    act(() => view.current().actions.refresh());
    await waitFor(() => expect(view.current().state.refreshFailure).toEqual({ kind: 'unavailable' }));
    expect(view.current().state.evidence.kind).toBe('ready');
    expect(view.current().state.interaction.selected).toEqual({ kind: 'node', nodeId: '1' });
    expect(view.current().state).not.toHaveProperty('error');
  });
});

describe('topology page in-memory drilldown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadTopologyGraph.mockResolvedValue(topologyGraph(['1', '2']));
  });
  afterEach(cleanup);

  it('keeps row drilldown and node-edge-hover transitions in memory without changing URL', async () => {
    const view = renderController('/topology?depth=1');
    await waitFor(() => expect(view.current().state.evidence.kind).toBe('ready'));
    const before = view.router.state.location.search;
    const evidence = view.current().state.evidence;
    if (evidence.kind !== 'ready') throw new Error('expected ready evidence');
    const nodeRow = evidence.presentation.metricRows.find(row => row.kind === 'node' && row.id === '1');
    if (!nodeRow) throw new Error('expected node row');
    act(() => view.current().actions.drilldown(nodeRow));
    act(() => view.current().actions.hoverEdge('edge-missing'));
    expect(view.current().state.interaction.selected).toEqual({ kind: 'node', nodeId: '1' });
    expect(view.current().state.interaction.hover).toEqual({ kind: 'none' });
    expect(view.router.state.location.search).toBe(before);
  });
});

function renderController(entry: string) {
  let controller: ReturnType<typeof useTopologyPageController> | undefined;
  let setRevision: (revision: number) => void = () => undefined;
  function Probe() {
    const [revision, updateRevision] = useState(0);
    setRevision = updateRevision;
    controller = useTopologyPageController({ refreshRevision: revision });
    return null;
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const router = createMemoryRouter([{ path: '*', element: <Probe /> }], { initialEntries: [entry] });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return {
    client,
    router,
    setRevision,
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
    nodes: nodeIds.map(id => ({
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
    })),
    edges: [],
    impactTimeline: []
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(next => {
    resolve = next;
  });
  return { promise, resolve };
}
