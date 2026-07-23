/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { GraphData, GraphOptions } from '@antv/g6';

import type { TopologyEdge } from '../model/topology-contract';
import type { TopologyInteraction, TopologyPresentation } from '../model/topology-view-model';

export type TopologyG6Palette = {
  border: string;
  hover: string;
  nodeFill: string;
  selected: string;
  text: string;
};

type ElementOptions = {
  edge: NonNullable<GraphOptions['edge']>;
  node: NonNullable<GraphOptions['node']>;
};
type ExternalTarget = { edgeId: string; label: string; nodeId: string };
type ExternalTargets = { edgeByNodeId: ReadonlyMap<string, string>; targets: ExternalTarget[] };
const externalTargetsCache = new WeakMap<TopologyPresentation, ExternalTargets>();

export function topologyG6Options(
  presentation: TopologyPresentation,
  interaction: TopologyInteraction,
  palette: TopologyG6Palette
): Omit<GraphOptions, 'container'> {
  return {
    animation: false,
    behaviors: ['drag-canvas', 'zoom-canvas'],
    data: topologyG6Data(presentation, interaction),
    ...topologyG6ElementOptions(palette),
    layout: {
      type: 'd3-force',
      animation: false,
      linkDistance: 96,
      nodeStrength: -180
    },
    zoomRange: [0.35, 2]
  };
}

export function topologyG6ElementOptions(palette: TopologyG6Palette): ElementOptions {
  return {
    edge: {
      style: { endArrow: true, increasedLineWidthForHitTesting: 8, lineWidth: 1.5, stroke: palette.border },
      state: {
        hover: { lineWidth: 2.5, stroke: palette.hover },
        selected: { lineWidth: 3, stroke: palette.selected }
      }
    },
    node: {
      style: {
        cursor: 'pointer',
        fill: palette.nodeFill,
        labelFill: palette.text,
        labelFontSize: 11,
        labelMaxWidth: 132,
        labelPlacement: 'bottom',
        lineWidth: 1.5,
        size: 28,
        stroke: palette.border
      },
      state: {
        hover: { lineWidth: 2.5, stroke: palette.hover },
        selected: { lineWidth: 3, stroke: palette.selected }
      }
    }
  };
}

export function topologyG6Data(presentation: TopologyPresentation, interaction: TopologyInteraction): GraphData {
  const externalTargets = topologyG6ExternalTargets(presentation).targets;
  const externalTargetByEdge = new Map(externalTargets.map(target => [target.edgeId, target]));
  return {
    nodes: [
      ...presentation.graph.nodes.map(node => ({
        id: node.id,
        data: {
          entityId: node.entityId,
          health: node.health,
          metrics: node.redMetrics
        },
        states: elementStates(node.id, interaction, 'node'),
        style: { labelText: node.entityName, size: node.focus ? 32 : 28 }
      })),
      ...externalTargets.map(target => ({
        id: target.nodeId,
        data: { edgeId: target.edgeId, externalTarget: true },
        states: elementStates(target.edgeId, interaction, 'edge'),
        style: { labelText: target.label, size: 22 }
      }))
    ],
    edges: presentation.graph.edges.flatMap(edge => {
      const target = edge.targetNodeId ?? externalTargetByEdge.get(edge.id)?.nodeId;
      return target
        ? [
            {
              id: edge.id,
              source: edge.sourceNodeId,
              target,
              data: { metrics: edge.redMetrics, relationType: edge.relationType, status: edge.status },
              states: elementStates(edge.id, interaction, 'edge')
            }
          ]
        : [];
    })
  };
}

export function topologyG6ExternalEdgeId(presentation: TopologyPresentation, nodeId: string) {
  return topologyG6ExternalTargets(presentation).edgeByNodeId.get(nodeId);
}

function topologyG6ExternalTargets(presentation: TopologyPresentation) {
  const cached = externalTargetsCache.get(presentation);
  if (cached) return cached;
  // G6 resolves graph elements by ID, so synthetic nodes must avoid both node and edge namespaces.
  const usedIds = new Set([
    ...presentation.graph.nodes.map(node => node.id),
    ...presentation.graph.edges.map(edge => edge.id)
  ]);
  const targets = presentation.graph.edges
    .filter(isExternalEdge)
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(edge => {
      const base = `external-target:${encodeURIComponent(edge.id)}`;
      let nodeId = base;
      let suffix = 1;
      while (usedIds.has(nodeId)) nodeId = `${base}:${suffix++}`;
      usedIds.add(nodeId);
      return { edgeId: edge.id, label: edge.targetRef.trim(), nodeId };
    });
  const result = { edgeByNodeId: new Map(targets.map(target => [target.nodeId, target.edgeId])), targets };
  externalTargetsCache.set(presentation, result);
  return result;
}

function isExternalEdge(edge: TopologyEdge): edge is TopologyEdge & { targetNodeId: null; targetRef: string } {
  return edge.targetNodeId === null && Boolean(edge.targetRef?.trim());
}

function elementStates(id: string, interaction: TopologyInteraction, kind: 'node' | 'edge') {
  const states: string[] = [];
  if (matches(interaction.hover, kind, id)) states.push('hover');
  if (matches(interaction.selected, kind, id)) states.push('selected');
  return states;
}

function matches(
  target: TopologyInteraction['hover'] | TopologyInteraction['selected'],
  kind: 'node' | 'edge',
  id: string
) {
  if (target.kind !== kind) return false;
  return kind === 'node' && target.kind === 'node'
    ? target.nodeId === id
    : target.kind === 'edge' && target.edgeId === id;
}
