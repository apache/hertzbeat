/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { GraphData, GraphOptions } from '@antv/g6';

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
      style: { increasedLineWidthForHitTesting: 8, lineWidth: 1.5, stroke: palette.border },
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
  return {
    nodes: presentation.graph.nodes.map(node => ({
      id: node.id,
      data: {
        entityId: node.entityId,
        health: node.health,
        metrics: node.redMetrics
      },
      states: elementStates(node.id, interaction, 'node'),
      style: { labelText: node.entityName, size: node.focus ? 32 : 28 }
    })),
    edges: presentation.graph.edges.flatMap(edge =>
      edge.targetNodeId
        ? [
            {
              id: edge.id,
              source: edge.sourceNodeId,
              target: edge.targetNodeId,
              data: { metrics: edge.redMetrics, relationType: edge.relationType, status: edge.status },
              states: elementStates(edge.id, interaction, 'edge')
            }
          ]
        : []
    )
  };
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
