/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { externalPresentation, interaction, presentation } from '../components/topology-canvas-test-fixtures';
import { topologyG6Options } from './topology-g6-adapter';
import { topologyG6Data } from './topology-g6-data';
import { topologyG6ElementOptions } from './topology-g6-options';

describe('topology G6 graph language', () => {
  it('uses readable built-in hexagons and relation spacing without oversized graph chrome', () => {
    const value = externalPresentation();
    const data = topologyG6Data(value, interaction(), palette);

    expect(topologyG6Options(value, interaction(), palette).node).toMatchObject({
      type: 'hexagon',
      style: {
        fill: palette.nodeFill,
        halo: false,
        labelPlacement: 'bottom',
        lineWidth: 2.5,
        size: 76
      },
      state: {
        dimmed: { labelOpacity: 0.3, opacity: 0.2 },
        path: { halo: true, haloStroke: palette.selected, haloStrokeOpacity: 0.12 },
        selected: {
          halo: true,
          haloLineWidth: 12,
          haloStroke: palette.selected,
          haloStrokeOpacity: 0.22,
          lineWidth: 2.5,
          stroke: expect.any(Function)
        }
      }
    });
    expect(topologyG6Options(value, interaction(), palette).layout).toMatchObject({
      linkDistance: 150,
      nodeStrength: -180
    });
    expect(data.nodes?.[0]).toMatchObject({
      type: 'hexagon',
      data: {
        iconKind: 'service',
        iconLibrary: '@phosphor-icons/core',
        iconName: 'cube',
        iconSource: 'entity-type-catalog'
      },
      style: {
        iconHeight: 28,
        iconSrc: expect.stringContaining('data:image/svg+xml,'),
        iconWidth: 28,
        labelText: 'checkout\nservice',
        size: 76,
        stroke: palette.success
      }
    });
    expect(data.nodes?.find(node => node.data?.externalTarget === true)).toMatchObject({
      type: 'hexagon',
      data: {
        iconKind: 'unknown',
        iconLibrary: '@phosphor-icons/core',
        iconName: 'question',
        iconSource: 'external-fallback'
      },
      style: {
        iconSrc: expect.stringContaining('data:image/svg+xml,'),
        labelText: 'payments.example',
        lineDash: [4, 3],
        size: 70,
        stroke: palette.neutral
      }
    });
    expect(decodeURIComponent(iconSrc(data.nodes?.[0]?.style?.iconSrc))).toContain(`fill="${palette.selected}"`);
    expect(nodeStateStroke(topologyG6ElementOptions(palette), 'selected', data.nodes?.[0])).toBe(palette.success);
  });

  it('regenerates generic node assets from the active entity color without changing health semantics', () => {
    const value = presentation('theme-icons');
    const light = topologyG6Data(value, interaction(), palette).nodes?.[0]?.style?.iconSrc;
    const darkPalette = { ...palette, selected: '#8b5cf6', text: '#e8edf5' };
    const dark = topologyG6Data(value, interaction(), darkPalette).nodes?.[0]?.style?.iconSrc;

    expect(light).not.toBe(dark);
    expect(decodeURIComponent(iconSrc(dark))).toContain('fill="#8b5cf6"');
    expect(topologyG6Data(value, interaction(), darkPalette).nodes?.[0]?.style?.stroke).toBe(darkPalette.success);
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

    const unknown = topologyG6Data(
      {
        ...value,
        graph: {
          ...value.graph,
          nodes: [{ ...node, entityType: 'vendor-private-kind', health: 'vendor-private-state' }]
        }
      },
      interaction(),
      palette
    ).nodes?.[0];

    expect(unknown).toMatchObject({ data: { iconKind: 'unknown' }, style: { stroke: palette.neutral } });
    expect(decodeURIComponent(iconSrc(unknown?.style?.iconSrc))).toContain(`fill="${palette.neutral}"`);
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
    expect(topologyG6ElementOptions(palette).edge).toMatchObject({
      style: { endArrow: true, lineWidth: 2 }
    });
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

function iconSrc(value: unknown) {
  if (typeof value !== 'string') throw new Error('The topology node icon source is missing.');
  return value;
}

function nodeStateStroke(
  options: ReturnType<typeof topologyG6ElementOptions>,
  state: string,
  node: NonNullable<ReturnType<typeof topologyG6Data>['nodes']>[number] | undefined
) {
  const style = options.node.state?.[state];
  if (!style || typeof style === 'function') throw new Error('The topology node state style is missing.');
  const stroke = style.stroke;
  if (typeof stroke !== 'function' || !node) throw new Error('The topology node state stroke mapper is missing.');
  const value: unknown = Reflect.apply(stroke, {}, [node]);
  if (typeof value !== 'string') throw new Error('The topology node state stroke mapper returned an invalid value.');
  return value;
}
