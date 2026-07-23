/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import type { TopologyGraph } from './topology-contract';
import { buildTopologyPresentation } from './topology-view-model';
import { resolveTopologyInspectorSelection } from './topology-inspector-model';

describe('topology inspector model', () => {
  const presentation = buildTopologyPresentation(topologyGraph());

  it('derives upstream and downstream relations from the selected node without copying graph state', () => {
    const selected = resolveTopologyInspectorSelection({ kind: 'node', nodeId: 'checkout' }, presentation);

    expect(selected).toMatchObject({
      kind: 'node',
      node: { id: 'checkout', entityId: 2 },
      upstream: [{ edge: { id: 'orders-checkout' }, counterpart: { id: 'orders' } }],
      downstream: [
        { edge: { id: 'checkout-database' }, counterpart: { id: 'database' } },
        { edge: { id: 'checkout-external' }, counterpart: undefined, externalTarget: 'payments.example' }
      ]
    });
  });

  it('resolves selected-edge endpoints and preserves honest external evidence', () => {
    const internal = resolveTopologyInspectorSelection({ kind: 'edge', edgeId: 'checkout-database' }, presentation);
    const external = resolveTopologyInspectorSelection({ kind: 'edge', edgeId: 'checkout-external' }, presentation);

    expect(internal).toMatchObject({
      kind: 'edge',
      edge: { id: 'checkout-database' },
      source: { id: 'checkout' },
      target: { id: 'database' }
    });
    expect(external).toMatchObject({
      kind: 'edge',
      edge: { id: 'checkout-external' },
      source: { id: 'checkout' },
      target: undefined,
      externalTarget: 'payments.example'
    });
  });
});

function topologyGraph(): TopologyGraph {
  const metrics = {
    requestRatePerSecond: null,
    requestCount: null,
    errorRate: null,
    errorCount: null,
    latencyP95Ms: null,
    latencyAvgMs: null
  };
  const node = (id: string, entityId: number) => ({
    id,
    entityId,
    entityName: id,
    entityType: 'service',
    namespace: 'store',
    environment: 'prod',
    health: 'unknown',
    focus: id === 'checkout',
    evidenceBadges: [],
    redMetrics: metrics
  });
  const edge = (id: string, sourceNodeId: string, targetNodeId: string | null, targetRef: string | null) => ({
    id,
    relationId: null,
    sourceNodeId,
    targetNodeId,
    sourceEntityId: sourceNodeId === 'orders' ? 1 : 2,
    targetEntityId: targetNodeId === 'checkout' ? 2 : targetNodeId === 'database' ? 3 : null,
    targetRef,
    sampleTraceId: null,
    sampleSpanId: null,
    firstSeen: null,
    lastSeen: null,
    relationType: 'calls',
    relationSource: 'otel',
    status: 'observed',
    score: null,
    evidenceBadges: [],
    redMetrics: metrics
  });
  return {
    apiBacked: true,
    focusEntityId: 2,
    depth: 1,
    sourceKinds: ['otel'],
    nodes: [node('orders', 1), node('checkout', 2), node('database', 3)],
    edges: [
      edge('orders-checkout', 'orders', 'checkout', null),
      edge('checkout-database', 'checkout', 'database', null),
      edge('checkout-external', 'checkout', null, 'payments.example')
    ],
    impactTimeline: []
  };
}
