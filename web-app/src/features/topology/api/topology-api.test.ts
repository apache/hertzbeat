/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ apiMessageGet: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  ...http
}));

import { ApiMessageError } from '@/core/http/api-message';
import { TopologyContractError } from '../model/topology-model';
import { classifyTopologyError, loadTopologyGraph } from './topology-api';

const graph = {
  apiBacked: true,
  focusEntityId: 10,
  depth: 2,
  partial: true,
  partialReasons: ['entity_seed_limit', 'edge_page'],
  edgePage: {
    pageIndex: 0,
    pageSize: 1,
    totalElements: 2,
    hasNext: true
  },
  sourceKinds: ['entity-relation', 'otlp-trace-call'],
  nodes: [
    {
      id: '10',
      entityId: 10,
      entityName: 'checkout-api',
      entityType: 'service',
      namespace: 'commerce',
      environment: 'prod',
      health: 'warning',
      focus: true,
      evidenceBadges: ['entity-relation'],
      redMetrics: {
        requestRatePerSecond: 1.5,
        requestCount: 30,
        errorRate: null,
        errorCount: null,
        latencyP95Ms: 42,
        latencyAvgMs: null
      }
    },
    {
      id: '20',
      entityId: 20,
      entityName: 'payments-api',
      entityType: 'service',
      namespace: 'commerce',
      environment: 'prod',
      health: 'healthy',
      focus: false,
      evidenceBadges: ['entity-relation'],
      redMetrics: {
        requestRatePerSecond: null,
        requestCount: null,
        errorRate: null,
        errorCount: null,
        latencyP95Ms: null,
        latencyAvgMs: null
      }
    }
  ],
  edges: [
    {
      id: 'trace:10:20',
      relationId: null,
      sourceNodeId: '10',
      targetNodeId: '20',
      sourceEntityId: 10,
      targetEntityId: 20,
      targetRef: 'trace:abc',
      sampleTraceId: 'abc',
      sampleSpanId: null,
      firstSeen: '2026-07-23T10:00:00Z',
      lastSeen: null,
      relationType: 'trace_call',
      relationSource: 'otlp-trace-call',
      status: 'confirmed',
      score: 92,
      evidenceBadges: ['otlp-trace-call'],
      redMetrics: {
        requestRatePerSecond: null,
        requestCount: null,
        errorRate: null,
        errorCount: null,
        latencyP95Ms: null,
        latencyAvgMs: null
      }
    }
  ],
  impactTimeline: [
    {
      id: 'activity:1',
      edgeId: null,
      entityId: 10,
      sourceKind: 'cmdb-manual-label',
      eventType: 'entity-definition',
      title: 'updated',
      detail: 'definition changed',
      actor: 'operator',
      occurredAt: '2026-07-23T10:00:00'
    }
  ]
};

describe('topology API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('forwards exact explicit filters and AbortSignal through apiMessageGet', async () => {
    http.apiMessageGet.mockResolvedValue(graph);
    const controller = new AbortController();
    await expect(
      loadTopologyGraph(
        {
          focusEntityId: 10,
          depth: 2,
          environment: 'prod',
          sourceKind: 'entity-relation',
          window: { from: 1000, to: 2000 },
          relationType: 'depends_on',
          hideInternal: true,
          pageIndex: 1,
          pageSize: 25
        },
        controller.signal
      )
    ).resolves.toEqual(graph);
    expect(http.apiMessageGet).toHaveBeenCalledWith(
      '/api/topology?focusEntityId=10&depth=2&environment=prod&sourceKind=entity-relation&start=1000&end=2000' +
        '&relationType=depends_on&hideInternal=true&pageIndex=1&pageSize=25',
      { signal: controller.signal }
    );
  });

  it('strictly rejects malformed graph and nested metric contracts without substituting an empty graph', async () => {
    const { partial: _partial, ...missingCompleteness } = graph;
    http.apiMessageGet.mockResolvedValue(missingCompleteness);
    await expect(loadTopologyGraph({ depth: 1 })).rejects.toBeInstanceOf(TopologyContractError);
    http.apiMessageGet.mockResolvedValue({ ...graph, partialReasons: ['edge_page', 'edge_page'] });
    await expect(loadTopologyGraph({ depth: 1 })).rejects.toBeInstanceOf(TopologyContractError);
    http.apiMessageGet.mockResolvedValue({ ...graph, edgePage: { ...graph.edgePage, hasNext: false } });
    await expect(loadTopologyGraph({ depth: 1 })).rejects.toBeInstanceOf(TopologyContractError);
    http.apiMessageGet.mockResolvedValue({ ...graph, edgePage: { ...graph.edgePage, pageIndex: 2_147_483_648 } });
    await expect(loadTopologyGraph({ depth: 1 })).rejects.toBeInstanceOf(TopologyContractError);
    http.apiMessageGet.mockResolvedValue({ ...graph, edgePage: { ...graph.edgePage, pageSize: 201 } });
    await expect(loadTopologyGraph({ depth: 1 })).rejects.toBeInstanceOf(TopologyContractError);
    http.apiMessageGet.mockResolvedValue({ ...graph, edgePage: { ...graph.edgePage, totalElements: 0 } });
    await expect(loadTopologyGraph({ depth: 1 })).rejects.toBeInstanceOf(TopologyContractError);
    http.apiMessageGet.mockResolvedValue({
      ...graph,
      edges: [],
      edgePage: { pageIndex: 0, pageSize: 2, totalElements: 10, hasNext: true }
    });
    await expect(loadTopologyGraph({ depth: 1 })).rejects.toBeInstanceOf(TopologyContractError);
    http.apiMessageGet.mockResolvedValue({ ...graph, unexpected: true });
    await expect(loadTopologyGraph({ depth: 1 })).rejects.toBeInstanceOf(TopologyContractError);
    http.apiMessageGet.mockResolvedValue({ ...graph, apiBacked: false });
    await expect(loadTopologyGraph({ depth: 1 })).rejects.toBeInstanceOf(TopologyContractError);
    http.apiMessageGet.mockResolvedValue({
      ...graph,
      nodes: [{ ...graph.nodes[0], redMetrics: { ...graph.nodes[0]!.redMetrics, requestCount: -1 } }]
    });
    await expect(loadTopologyGraph({ depth: 1 })).rejects.toBeInstanceOf(TopologyContractError);
    http.apiMessageGet.mockResolvedValue({ ...graph, edges: [{ ...graph.edges[0], targetRef: ' ' }] });
    await expect(loadTopologyGraph({ depth: 1 })).rejects.toBeInstanceOf(TopologyContractError);
    http.apiMessageGet.mockResolvedValue({
      ...graph,
      edges: [{ ...graph.edges[0], score: Number.MAX_SAFE_INTEGER + 1 }]
    });
    await expect(loadTopologyGraph({ depth: 1 })).rejects.toBeInstanceOf(TopologyContractError);
  });

  it('classifies failures without retaining raw server messages', () => {
    expect(classifyTopologyError(new ApiMessageError('private', { status: 403 }))).toEqual({ kind: 'permission' });
    expect(classifyTopologyError(new ApiMessageError('secret', { code: 15 }))).toEqual({ kind: 'unavailable' });
    expect(classifyTopologyError(new ApiMessageError('offline', { cause: new Error('socket') }))).toEqual({
      kind: 'unavailable'
    });
    expect(classifyTopologyError(new TopologyContractError())).toEqual({ kind: 'contract' });
    expect(classifyTopologyError(new Error('bad'))).toEqual({ kind: 'error' });
  });
});

describe('topology graph invariants', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['duplicate node IDs', { ...graph, nodes: [...graph.nodes, { ...graph.nodes[0] }] }],
    ['duplicate edge IDs', { ...graph, edges: [...graph.edges, { ...graph.edges[0] }] }],
    ['missing source node', { ...graph, edges: [{ ...graph.edges[0], sourceNodeId: 'missing' }] }],
    ['missing target node', { ...graph, edges: [{ ...graph.edges[0], targetNodeId: 'missing' }] }]
  ])('rejects graph invariant violation: %s', async (_name, invalidGraph) => {
    http.apiMessageGet.mockResolvedValue(invalidGraph);
    await expect(loadTopologyGraph({ depth: 1 })).rejects.toBeInstanceOf(TopologyContractError);
  });

  it('allows an honest graph whose focus entity is not present', async () => {
    http.apiMessageGet.mockResolvedValue({ ...graph, focusEntityId: 999 });
    await expect(loadTopologyGraph({ depth: 1 })).resolves.toMatchObject({ focusEntityId: 999 });
  });
});
