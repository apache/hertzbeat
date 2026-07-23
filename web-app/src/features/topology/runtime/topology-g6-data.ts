/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { GraphData } from '@antv/g6';

import type { TopologyEdge, TopologyNode } from '../model/topology-contract';
import type { TopologyInteraction, TopologyPresentation } from '../model/topology-view-model';
import { topologyG6VisualGeometry, type TopologyG6Palette } from './topology-g6-options';
import { resolveTopologyExternalIcon, resolveTopologyNodeIcon } from './topology-node-icon';

type ExternalTarget = { edgeId: string; label: string; nodeId: string };
type ExternalTargets = { edgeByNodeId: ReadonlyMap<string, string>; targets: ExternalTarget[] };
type Emphasis = {
  active: boolean;
  edgeIds: ReadonlySet<string>;
  nodeIds: ReadonlySet<string>;
};
const externalTargetsCache = new WeakMap<TopologyPresentation, ExternalTargets>();

export function topologyG6Data(
  presentation: TopologyPresentation,
  interaction: TopologyInteraction,
  palette: Pick<TopologyG6Palette, 'critical' | 'neutral' | 'selected' | 'success' | 'warning'>
): GraphData {
  const externalTargets = topologyG6ExternalTargets(presentation).targets;
  const externalTargetByEdge = new Map(externalTargets.map(target => [target.edgeId, target]));
  const emphasis = topologyEmphasis(presentation, interaction, externalTargetByEdge);
  return {
    nodes: [
      ...presentation.graph.nodes.map(node => topologyG6Node(node, interaction, emphasis, palette)),
      ...externalTargets.map(target => topologyG6ExternalNode(target, interaction, emphasis, palette))
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

function topologyG6Node(
  node: TopologyNode,
  interaction: TopologyInteraction,
  emphasis: Emphasis,
  palette: Pick<TopologyG6Palette, 'critical' | 'neutral' | 'selected' | 'success' | 'warning'>
) {
  const candidateIcon = resolveTopologyNodeIcon(node.entityType, palette.selected);
  const icon =
    candidateIcon.iconKind === 'unknown' ? resolveTopologyNodeIcon(node.entityType, palette.neutral) : candidateIcon;
  return {
    id: node.id,
    type: 'hexagon',
    data: {
      entityId: node.entityId,
      health: node.health,
      iconKind: icon.iconKind,
      iconLibrary: icon.iconLibrary,
      iconName: icon.iconName,
      iconSource: icon.iconSource,
      metrics: node.redMetrics
    },
    states: elementStates(node.id, interaction, 'node', emphasis),
    style: {
      iconHeight: topologyG6VisualGeometry.iconSize,
      iconSrc: icon.iconSrc,
      iconWidth: topologyG6VisualGeometry.iconSize,
      labelText: `${node.entityName}\n${node.entityType}`,
      size: topologyG6VisualGeometry.nodeSize,
      stroke: healthStroke(node.health, palette)
    }
  };
}

function topologyG6ExternalNode(
  target: ExternalTarget,
  interaction: TopologyInteraction,
  emphasis: Emphasis,
  palette: Pick<TopologyG6Palette, 'neutral'>
) {
  const icon = resolveTopologyExternalIcon(palette.neutral);
  return {
    id: target.nodeId,
    type: 'hexagon',
    data: {
      edgeId: target.edgeId,
      externalTarget: true,
      iconKind: icon.iconKind,
      iconLibrary: icon.iconLibrary,
      iconName: icon.iconName,
      iconSource: icon.iconSource
    },
    states: externalTargetStates(target, interaction, emphasis),
    style: {
      iconHeight: topologyG6VisualGeometry.iconSize,
      iconSrc: icon.iconSrc,
      iconWidth: topologyG6VisualGeometry.iconSize,
      labelText: target.label,
      lineDash: [4, 3],
      size: topologyG6VisualGeometry.externalNodeSize,
      stroke: palette.neutral
    }
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
