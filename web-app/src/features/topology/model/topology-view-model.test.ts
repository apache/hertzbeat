/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import type { TopologyGraph } from './topology-contract';
import {
  buildTopologyPresentation,
  clearTopologyHover,
  drilldownTopologyRow,
  emptyTopologyInteraction,
  hoverTopologyEdge,
  hoverTopologyNode,
  reconcileTopologyInteraction,
  selectTopologyEdge,
  selectTopologyNode
} from './topology-view-model';

describe('topology presentation', () => {
  it('projects graph, metric rows, and summary without turning unavailable metrics into zero', () => {
    const presentation = buildTopologyPresentation(topologyGraph());
    expect(presentation.graph.nodes.map(node => node.id)).toEqual(['1', '2']);
    expect(presentation.graph.edges.map(edge => edge.id)).toEqual(['edge-1']);
    expect(presentation.metricRows).toHaveLength(3);
    expect(presentation.metricRows[0]).toMatchObject({
      kind: 'node',
      rowKey: 'node:1',
      id: '1',
      metrics: { requestRatePerSecond: null, requestCount: null, latencyP95Ms: null }
    });
    expect(presentation.metricRows[2]).toMatchObject({
      kind: 'edge',
      rowKey: 'edge:edge-1',
      sourceName: 'service-1',
      targetName: 'service-2'
    });
    expect(presentation.summary).toEqual({
      apiBacked: true,
      focusEntityId: 1,
      depth: 1,
      partial: false,
      partialReasons: [],
      edgePage: {
        pageIndex: 0,
        pageSize: 25,
        totalElements: 1,
        hasNext: false
      },
      sourceKinds: ['entity-relation'],
      nodeCount: 2,
      edgeCount: 1,
      impactEventCount: 0
    });
    const collidingIds = buildTopologyPresentation({
      ...topologyGraph(),
      edges: topologyGraph().edges.map(edge => ({ ...edge, id: '1' }))
    });
    expect(collidingIds.metricRows.map(row => row.rowKey)).toEqual(['node:1', 'node:2', 'edge:1']);
  });
});

describe('topology graph structure identity', () => {
  it('uses only sorted structural identity for graphStructureKey', () => {
    const graph = topologyGraph();
    const base = buildTopologyPresentation(graph).graphStructureKey;
    const evidenceOnly = {
      ...graph,
      nodes: [...graph.nodes].reverse().map(node => ({
        ...node,
        health: 'critical',
        redMetrics: { ...node.redMetrics, requestCount: 999 }
      })),
      edges: graph.edges.map(edge => ({
        ...edge,
        status: 'warning',
        score: 1,
        redMetrics: { ...edge.redMetrics, latencyP95Ms: 999 }
      }))
    };
    expect(buildTopologyPresentation(evidenceOnly).graphStructureKey).toBe(base);
    expect(selectTopologyNode(emptyTopologyInteraction(), '1')).toMatchObject({ selected: { kind: 'node' } });
    expect(buildTopologyPresentation(graph).graphStructureKey).toBe(base);
    const changedEndpoint = {
      ...graph,
      edges: graph.edges.map(edge => ({ ...edge, targetNodeId: null, targetRef: 'external:payments' }))
    };
    expect(buildTopologyPresentation(changedEndpoint).graphStructureKey).not.toBe(base);
  });
});

describe('topology interaction model', () => {
  it('keeps selection and hover distinct, switches node/edge exclusively, and drills down in memory', () => {
    const presentation = buildTopologyPresentation(topologyGraph());
    let interaction = emptyTopologyInteraction();
    interaction = hoverTopologyNode(interaction, '2');
    expect(interaction).toEqual({
      selected: { kind: 'none' },
      hover: { kind: 'node', nodeId: '2' }
    });
    interaction = selectTopologyNode(interaction, '1');
    interaction = hoverTopologyEdge(interaction, 'edge-1');
    expect(interaction).toEqual({
      selected: { kind: 'node', nodeId: '1' },
      hover: { kind: 'edge', edgeId: 'edge-1' }
    });
    interaction = selectTopologyEdge(interaction, 'edge-1');
    expect(interaction.selected).toEqual({ kind: 'edge', edgeId: 'edge-1' });
    expect(interaction.hover).toEqual({ kind: 'none' });
    interaction = clearTopologyHover(hoverTopologyNode(interaction, '1'));
    interaction = drilldownTopologyRow(interaction, presentation.metricRows[0]!);
    expect(interaction.selected).toEqual({ kind: 'node', nodeId: '1' });
  });

  it('clears selected and hovered evidence that disappeared after refresh', () => {
    const interaction = hoverTopologyEdge(selectTopologyNode(emptyTopologyInteraction(), '2'), 'edge-1');
    const refreshed = buildTopologyPresentation({
      ...topologyGraph(),
      nodes: [topologyGraph().nodes[0]!],
      edges: []
    });
    expect(reconcileTopologyInteraction(interaction, refreshed)).toEqual(emptyTopologyInteraction());
  });
});

function topologyGraph(): TopologyGraph {
  return {
    apiBacked: true,
    focusEntityId: 1,
    depth: 1,
    partial: false,
    partialReasons: [],
    edgePage: {
      pageIndex: 0,
      pageSize: 25,
      totalElements: 1,
      hasNext: false
    },
    sourceKinds: ['entity-relation'],
    nodes: [topologyNode(1, true), topologyNode(2, false)],
    edges: [
      {
        id: 'edge-1',
        relationId: 11,
        sourceNodeId: '1',
        targetNodeId: '2',
        sourceEntityId: 1,
        targetEntityId: 2,
        targetRef: null,
        sampleTraceId: null,
        sampleSpanId: null,
        firstSeen: null,
        lastSeen: null,
        relationType: 'depends_on',
        relationSource: 'manual',
        status: 'confirmed',
        score: 90,
        evidenceBadges: ['entity-relation'],
        redMetrics: emptyMetrics()
      }
    ],
    impactTimeline: []
  };
}

function topologyNode(id: number, focus: boolean): TopologyGraph['nodes'][number] {
  return {
    id: String(id),
    entityId: id,
    entityName: `service-${id}`,
    entityType: 'service',
    namespace: 'commerce',
    environment: 'prod',
    health: 'healthy',
    focus,
    evidenceBadges: ['entity-relation'],
    redMetrics: emptyMetrics()
  };
}

function emptyMetrics(): TopologyGraph['nodes'][number]['redMetrics'] {
  return {
    requestRatePerSecond: null,
    requestCount: null,
    errorRate: null,
    errorCount: null,
    latencyP95Ms: null,
    latencyAvgMs: null
  };
}
