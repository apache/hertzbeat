/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { TopologyEdge, TopologyGraph, TopologyNode, TopologyRedMetrics } from './topology-contract';

export type TopologyMetricRow =
  | {
      kind: 'node';
      rowKey: string;
      id: string;
      nodeId: string;
      name: string;
      entityType: string;
      metrics: TopologyRedMetrics;
    }
  | {
      kind: 'edge';
      rowKey: string;
      id: string;
      edgeId: string;
      sourceNodeId: string;
      targetNodeId: string | null;
      sourceName: string;
      targetName: string | null;
      relationType: string;
      metrics: TopologyRedMetrics;
    };

export type TopologyPresentation = {
  graph: { nodes: TopologyNode[]; edges: TopologyEdge[] };
  metricRows: TopologyMetricRow[];
  summary: {
    apiBacked: true;
    focusEntityId: number | null;
    depth: number;
    sourceKinds: string[];
    nodeCount: number;
    edgeCount: number;
    impactEventCount: number;
  };
  graphStructureKey: string;
};

type SelectedTopology = { kind: 'none' } | { kind: 'node'; nodeId: string } | { kind: 'edge'; edgeId: string };
type HoveredTopology = { kind: 'none' } | { kind: 'node'; nodeId: string } | { kind: 'edge'; edgeId: string };
export type TopologyInteraction = { selected: SelectedTopology; hover: HoveredTopology };

export function buildTopologyPresentation(graph: TopologyGraph): TopologyPresentation {
  const nodeNames = new Map(graph.nodes.map(node => [node.id, node.entityName]));
  return {
    graph: { nodes: graph.nodes, edges: graph.edges },
    metricRows: [
      ...graph.nodes.map(node => ({
        kind: 'node' as const,
        rowKey: `node:${node.id}`,
        id: node.id,
        nodeId: node.id,
        name: node.entityName,
        entityType: node.entityType,
        metrics: node.redMetrics
      })),
      ...graph.edges.map(edge => ({
        kind: 'edge' as const,
        rowKey: `edge:${edge.id}`,
        id: edge.id,
        edgeId: edge.id,
        sourceNodeId: edge.sourceNodeId,
        targetNodeId: edge.targetNodeId,
        sourceName: nodeNames.get(edge.sourceNodeId) ?? edge.sourceNodeId,
        targetName: edge.targetNodeId ? (nodeNames.get(edge.targetNodeId) ?? edge.targetNodeId) : edge.targetRef,
        relationType: edge.relationType,
        metrics: edge.redMetrics
      }))
    ],
    summary: {
      apiBacked: graph.apiBacked,
      focusEntityId: graph.focusEntityId,
      depth: graph.depth,
      sourceKinds: graph.sourceKinds,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      impactEventCount: graph.impactTimeline.length
    },
    graphStructureKey: topologyGraphStructureKey(graph)
  };
}

function topologyGraphStructureKey(graph: TopologyGraph) {
  const nodes = graph.nodes.map(node => node.id).sort();
  const edges = graph.edges
    .map(edge => [
      edge.id,
      edge.sourceNodeId,
      edge.targetNodeId,
      edge.targetRef,
      edge.relationType,
      edge.relationSource
    ])
    .sort(compareStructure);
  return JSON.stringify({ nodes, edges });
}

export function emptyTopologyInteraction(): TopologyInteraction {
  return { selected: { kind: 'none' }, hover: { kind: 'none' } };
}

export function selectTopologyNode(interaction: TopologyInteraction, nodeId: string): TopologyInteraction {
  return { ...interaction, selected: { kind: 'node', nodeId }, hover: { kind: 'none' } };
}

export function selectTopologyEdge(interaction: TopologyInteraction, edgeId: string): TopologyInteraction {
  return { ...interaction, selected: { kind: 'edge', edgeId }, hover: { kind: 'none' } };
}

export function clearTopologySelection(interaction: TopologyInteraction): TopologyInteraction {
  return { ...interaction, selected: { kind: 'none' } };
}

export function hoverTopologyNode(interaction: TopologyInteraction, nodeId: string): TopologyInteraction {
  return { ...interaction, hover: { kind: 'node', nodeId } };
}

export function hoverTopologyEdge(interaction: TopologyInteraction, edgeId: string): TopologyInteraction {
  return { ...interaction, hover: { kind: 'edge', edgeId } };
}

export function clearTopologyHover(interaction: TopologyInteraction): TopologyInteraction {
  return { ...interaction, hover: { kind: 'none' } };
}

export function drilldownTopologyRow(interaction: TopologyInteraction, row: TopologyMetricRow) {
  return row.kind === 'node'
    ? selectTopologyNode(interaction, row.nodeId)
    : selectTopologyEdge(interaction, row.edgeId);
}

export function reconcileTopologyInteraction(
  interaction: TopologyInteraction,
  presentation: TopologyPresentation
): TopologyInteraction {
  const nodeIds = new Set(presentation.graph.nodes.map(node => node.id));
  const edgeIds = new Set(presentation.graph.edges.map(edge => edge.id));
  const selected = exists(interaction.selected, nodeIds, edgeIds) ? interaction.selected : { kind: 'none' as const };
  const hover = exists(interaction.hover, nodeIds, edgeIds) ? interaction.hover : { kind: 'none' as const };
  // Interaction identity is the G6 redraw boundary; preserve it to break runtime-ready feedback.
  if (selected === interaction.selected && hover === interaction.hover) return interaction;
  return { selected, hover };
}

function exists(
  target: SelectedTopology | HoveredTopology,
  nodeIds: ReadonlySet<string>,
  edgeIds: ReadonlySet<string>
) {
  if (target.kind === 'node') return nodeIds.has(target.nodeId);
  if (target.kind === 'edge') return edgeIds.has(target.edgeId);
  return true;
}

function compareStructure(left: (string | null)[], right: (string | null)[]) {
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}
