/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { externalPresentation, interaction, presentation } from '../components/topology-canvas-test-fixtures';
import { topologyG6Data, topologyG6ElementOptions, topologyG6Options } from './topology-g6-adapter';

describe('topology G6 graph language', () => {
  it('uses compact built-in hexagons with readable entity labels and neutral external targets', () => {
    const value = externalPresentation();
    const data = topologyG6Data(value, interaction(), palette);

    expect(topologyG6Options(value, interaction(), palette).node).toMatchObject({
      type: 'hexagon',
      style: { labelPlacement: 'bottom', size: 52 }
    });
    expect(data.nodes?.[0]).toMatchObject({
      type: 'hexagon',
      style: { labelText: 'checkout\nservice', size: 52, stroke: palette.success }
    });
    expect(data.nodes?.find(node => node.data?.externalTarget === true)).toMatchObject({
      type: 'hexagon',
      style: { labelText: 'payments.example', lineDash: [4, 3], size: 48, stroke: palette.neutral }
    });
  });

  it('labels directed edges from available RED evidence and omits unavailable values', () => {
    const value = externalPresentation();
    const edge = value.graph.edges[0];
    if (!edge) throw new Error('The external topology fixture is incomplete.');
    const labeled = {
      ...value,
      graph: {
        ...value.graph,
        edges: [
          {
            ...edge,
            redMetrics: { ...edge.redMetrics, requestRatePerSecond: 1.25, latencyP95Ms: 42 }
          }
        ]
      }
    };

    expect(topologyG6Data(labeled, interaction(), palette).edges?.[0]).toMatchObject({
      data: { relationType: 'calls' },
      style: { labelText: '1.25 rps · P95 42 ms' }
    });
    expect(topologyG6Data(value, interaction(), palette).edges?.[0]?.style).not.toHaveProperty('labelText');
  });

  it('emphasizes the actual selected one-hop path and dims unrelated elements without hiding them', () => {
    const value = pathPresentation();
    const selectedNode = topologyG6Data(value, interaction({ kind: 'node', nodeId: 'node-a' }), palette);
    const selectedEdge = topologyG6Data(value, interaction({ kind: 'edge', edgeId: 'edge-ab' }), palette);

    expect(selectedNode.nodes).toEqual([
      expect.objectContaining({ id: 'node-a', states: ['selected'] }),
      expect.objectContaining({ id: 'node-b', states: ['path'] }),
      expect.objectContaining({ id: 'node-c', states: ['dimmed'] })
    ]);
    expect(selectedNode.edges).toEqual([
      expect.objectContaining({ id: 'edge-ab', states: ['path'] }),
      expect.objectContaining({ id: 'edge-bc', states: ['dimmed'] })
    ]);
    expect(selectedEdge.nodes).toEqual([
      expect.objectContaining({ id: 'node-a', states: ['path'] }),
      expect.objectContaining({ id: 'node-b', states: ['path'] }),
      expect.objectContaining({ id: 'node-c', states: ['dimmed'] })
    ]);
    expect(selectedEdge.edges).toEqual([
      expect.objectContaining({ id: 'edge-ab', states: ['selected'] }),
      expect.objectContaining({ id: 'edge-bc', states: ['dimmed'] })
    ]);
  });

  it('keeps unrecognized health neutral instead of inventing status semantics', () => {
    const value = presentation('unknown-health');
    const node = value.graph.nodes[0];
    if (!node) throw new Error('The topology fixture requires a node.');

    expect(
      topologyG6Data(
        { ...value, graph: { ...value.graph, nodes: [{ ...node, health: 'vendor-private-state' }] } },
        interaction(),
        palette
      ).nodes?.[0]
    ).toMatchObject({ style: { stroke: palette.neutral } });
  });
});

describe('topology G6 external targets', () => {
  it('renders a stable collision-safe target and directed edge for external topology evidence', () => {
    const presentation = externalPresentation();
    const first = topologyG6Data(presentation, interaction({ kind: 'edge', edgeId: 'edge-external' }), palette);
    const second = topologyG6Data(presentation, interaction({ kind: 'edge', edgeId: 'edge-external' }), palette);
    const realIds = new Set(presentation.graph.nodes.map(node => node.id));
    const external = first.nodes?.find(node => node.data?.externalTarget === true);

    expect(external).toMatchObject({
      data: { edgeId: 'edge-external', externalTarget: true },
      states: ['selected'],
      style: { labelText: 'payments.example' }
    });
    expect(realIds.has(String(external?.id))).toBe(false);
    expect(second.nodes?.find(node => node.data?.externalTarget === true)?.id).toBe(external?.id);
    expect(first.edges).toEqual([
      expect.objectContaining({
        id: 'edge-external',
        source: 'node-a',
        target: external?.id,
        states: ['selected']
      })
    ]);
  });

  it('avoids edge IDs when allocating external targets and keeps every canvas edge directed', () => {
    const presentation = externalPresentation();
    const source = presentation.graph.nodes[0];
    const collision = presentation.graph.nodes[1];
    const externalEdge = presentation.graph.edges[0];
    if (!source || !collision || !externalEdge) throw new Error('The external topology fixture is incomplete.');
    const edgeCollision = {
      ...presentation,
      graph: {
        nodes: [source, { ...collision, id: 'node-b' }],
        edges: [
          {
            ...externalEdge,
            id: 'external-target:edge-external',
            targetNodeId: 'node-b',
            targetEntityId: collision.entityId,
            targetRef: null
          },
          externalEdge
        ]
      }
    };
    const data = topologyG6Data(edgeCollision, interaction(), palette);
    const external = data.nodes?.find(node => node.data?.externalTarget === true);

    expect(external?.id).not.toBe('external-target:edge-external');
    expect(topologyG6ElementOptions(palette).edge).toMatchObject({ style: { endArrow: true } });
  });
});

const palette = {
  border: '#d9d9d9',
  critical: '#ff4d4f',
  dimmed: '#bfbfbf',
  hover: '#1677ff',
  nodeFill: '#ffffff',
  neutral: '#8c8c8c',
  selected: '#1677ff',
  success: '#52c41a',
  warning: '#faad14',
  text: '#000000'
};

function pathPresentation() {
  const base = presentation('path');
  const node = base.graph.nodes[0];
  if (!node) throw new Error('The topology fixture requires a node.');
  const metrics = node.redMetrics;
  return {
    ...base,
    graph: {
      nodes: [
        node,
        { ...node, id: 'node-b', entityId: 2, entityName: 'payments', focus: false },
        { ...node, id: 'node-c', entityId: 3, entityName: 'database', focus: false }
      ],
      edges: [
        topologyEdge('edge-ab', 'node-a', 'node-b', metrics),
        topologyEdge('edge-bc', 'node-b', 'node-c', metrics)
      ]
    }
  };
}

function topologyEdge(
  id: string,
  sourceNodeId: string,
  targetNodeId: string,
  redMetrics: ReturnType<typeof presentation>['graph']['nodes'][number]['redMetrics']
) {
  return {
    id,
    relationId: null,
    sourceNodeId,
    targetNodeId,
    sourceEntityId: sourceNodeId === 'node-a' ? 1 : 2,
    targetEntityId: targetNodeId === 'node-b' ? 2 : 3,
    targetRef: null,
    sampleTraceId: null,
    sampleSpanId: null,
    firstSeen: null,
    lastSeen: null,
    relationType: 'calls',
    relationSource: 'trace',
    status: 'active',
    score: null,
    evidenceBadges: [],
    redMetrics
  };
}
