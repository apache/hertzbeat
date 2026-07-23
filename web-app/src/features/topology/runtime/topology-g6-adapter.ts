/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { GraphData, GraphOptions } from '@antv/g6';

import type { TopologyEdge } from '../model/topology-contract';
import type { TopologyInteraction, TopologyPresentation } from '../model/topology-view-model';

export type TopologyG6Palette = {
  border: string;
  critical: string;
  dimmed: string;
  hover: string;
  neutral: string;
  nodeFill: string;
  selected: string;
  success: string;
  text: string;
  warning: string;
};

type ElementOptions = {
  edge: NonNullable<GraphOptions['edge']>;
  node: NonNullable<GraphOptions['node']>;
};
type ExternalTarget = { edgeId: string; label: string; nodeId: string };
type ExternalTargets = { edgeByNodeId: ReadonlyMap<string, string>; targets: ExternalTarget[] };
type Emphasis = {
  active: boolean;
  edgeIds: ReadonlySet<string>;
  nodeIds: ReadonlySet<string>;
};
const externalTargetsCache = new WeakMap<TopologyPresentation, ExternalTargets>();

export function topologyG6Options(
  presentation: TopologyPresentation,
  interaction: TopologyInteraction,
  palette: TopologyG6Palette
): Omit<GraphOptions, 'container'> {
  return {
    animation: false,
    behaviors: ['drag-canvas', 'zoom-canvas'],
    data: topologyG6Data(presentation, interaction, palette),
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
      style: {
        endArrow: true,
        increasedLineWidthForHitTesting: 8,
        labelBackground: true,
        labelBackgroundFill: palette.nodeFill,
        labelFill: palette.text,
        labelFontSize: 10,
        labelPadding: [2, 4],
        lineWidth: 1.5,
        stroke: palette.border
      },
      state: {
        hover: { lineWidth: 2.5, stroke: palette.hover },
        selected: { lineWidth: 3, stroke: palette.selected },
        path: { lineWidth: 2.5, stroke: palette.selected },
        dimmed: { labelOpacity: 0.32, opacity: 0.24 }
      }
    },
    node: {
      type: 'hexagon',
      style: {
        cursor: 'pointer',
        fill: palette.nodeFill,
        labelFill: palette.text,
        labelFontSize: 11,
        labelLineHeight: 14,
        labelMaxWidth: 132,
        labelPlacement: 'bottom',
        lineWidth: 1.5,
        size: 52,
        stroke: palette.border
      },
      state: {
        hover: { lineWidth: 2.5, stroke: palette.hover },
        selected: { lineWidth: 3, stroke: palette.selected },
        path: { lineWidth: 2.5, stroke: palette.selected },
        dimmed: { labelOpacity: 0.32, opacity: 0.24, stroke: palette.dimmed }
      }
    }
  };
}

export function topologyG6Data(
  presentation: TopologyPresentation,
  interaction: TopologyInteraction,
  palette: Pick<TopologyG6Palette, 'critical' | 'neutral' | 'success' | 'warning'>
): GraphData {
  const externalTargets = topologyG6ExternalTargets(presentation).targets;
  const externalTargetByEdge = new Map(externalTargets.map(target => [target.edgeId, target]));
  const emphasis = topologyEmphasis(presentation, interaction, externalTargetByEdge);
  return {
    nodes: [
      ...presentation.graph.nodes.map(node => ({
        id: node.id,
        type: 'hexagon',
        data: {
          entityId: node.entityId,
          health: node.health,
          metrics: node.redMetrics
        },
        states: elementStates(node.id, interaction, 'node', emphasis),
        style: {
          labelText: `${node.entityName}\n${node.entityType}`,
          size: 52,
          stroke: healthStroke(node.health, palette)
        }
      })),
      ...externalTargets.map(target => ({
        id: target.nodeId,
        type: 'hexagon',
        data: { edgeId: target.edgeId, externalTarget: true },
        states: externalTargetStates(target, interaction, emphasis),
        style: {
          labelText: target.label,
          lineDash: [4, 3],
          size: 48,
          stroke: palette.neutral
        }
      }))
    ],
    edges: presentation.graph.edges.flatMap(edge => {
      const target = edge.targetNodeId ?? externalTargetByEdge.get(edge.id)?.nodeId;
      const labelText = edgeLabel(edge);
      return target
        ? [
            {
              id: edge.id,
              source: edge.sourceNodeId,
              target,
              data: { metrics: edge.redMetrics, relationType: edge.relationType, status: edge.status },
              states: elementStates(edge.id, interaction, 'edge', emphasis),
              style: labelText ? { labelText } : {}
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

function elementStates(id: string, interaction: TopologyInteraction, kind: 'node' | 'edge', emphasis: Emphasis) {
  const states: string[] = [];
  if (matches(interaction.hover, kind, id)) states.push('hover');
  if (matches(interaction.selected, kind, id)) states.push('selected');
  else if (emphasis.active && (kind === 'node' ? emphasis.nodeIds : emphasis.edgeIds).has(id)) states.push('path');
  else if (emphasis.active) states.push('dimmed');
  return states;
}

function externalTargetStates(target: ExternalTarget, interaction: TopologyInteraction, emphasis: Emphasis) {
  const states: string[] = [];
  if (matches(interaction.hover, 'edge', target.edgeId)) states.push('hover');
  if (matches(interaction.selected, 'edge', target.edgeId)) states.push('selected');
  else if (emphasis.active && emphasis.nodeIds.has(target.nodeId)) states.push('path');
  else if (emphasis.active) states.push('dimmed');
  return states;
}

function topologyEmphasis(
  presentation: TopologyPresentation,
  interaction: TopologyInteraction,
  externalTargets: ReadonlyMap<string, ExternalTarget>
): Emphasis {
  if (interaction.selected.kind === 'node') {
    return nodeEmphasis(presentation, interaction.selected.nodeId, externalTargets);
  }
  if (interaction.selected.kind === 'edge') {
    return edgeEmphasis(presentation, interaction.selected.edgeId, externalTargets);
  }
  return { active: false, edgeIds: new Set(), nodeIds: new Set() };
}

function nodeEmphasis(
  presentation: TopologyPresentation,
  selectedNodeId: string,
  externalTargets: ReadonlyMap<string, ExternalTarget>
): Emphasis {
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  if (!presentation.graph.nodes.some(node => node.id === selectedNodeId)) {
    return { active: false, edgeIds, nodeIds };
  }
  nodeIds.add(selectedNodeId);
  for (const edge of presentation.graph.edges) {
    if (edge.sourceNodeId !== selectedNodeId && edge.targetNodeId !== selectedNodeId) continue;
    edgeIds.add(edge.id);
    addEdgeNodes(edge, nodeIds, externalTargets);
  }
  return { active: nodeIds.size > 0 || edgeIds.size > 0, edgeIds, nodeIds };
}

function edgeEmphasis(
  presentation: TopologyPresentation,
  selectedEdgeId: string,
  externalTargets: ReadonlyMap<string, ExternalTarget>
): Emphasis {
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  const edge = presentation.graph.edges.find(candidate => candidate.id === selectedEdgeId);
  if (!edge) return { active: false, edgeIds, nodeIds };
  edgeIds.add(edge.id);
  addEdgeNodes(edge, nodeIds, externalTargets);
  return { active: true, edgeIds, nodeIds };
}

function addEdgeNodes(edge: TopologyEdge, nodeIds: Set<string>, externalTargets: ReadonlyMap<string, ExternalTarget>) {
  nodeIds.add(edge.sourceNodeId);
  if (edge.targetNodeId) nodeIds.add(edge.targetNodeId);
  else {
    const externalTarget = externalTargets.get(edge.id);
    if (externalTarget) nodeIds.add(externalTarget.nodeId);
  }
}

function edgeLabel(edge: TopologyEdge) {
  const parts: string[] = [];
  if (edge.redMetrics.requestRatePerSecond !== null) {
    parts.push(`${compactNumber(edge.redMetrics.requestRatePerSecond)} rps`);
  }
  if (edge.redMetrics.latencyP95Ms !== null) {
    parts.push(`P95 ${compactNumber(edge.redMetrics.latencyP95Ms)} ms`);
  }
  return parts.join(' · ');
}

function compactNumber(value: number) {
  return Number(value.toFixed(2)).toString();
}

function healthStroke(
  health: string,
  palette: Pick<TopologyG6Palette, 'critical' | 'neutral' | 'success' | 'warning'>
) {
  const normalized = health.trim().toLowerCase();
  if (normalized === 'healthy') return palette.success;
  if (normalized === 'warning') return palette.warning;
  if (normalized === 'critical') return palette.critical;
  return palette.neutral;
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
