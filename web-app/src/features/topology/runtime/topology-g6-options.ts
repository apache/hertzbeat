/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { GraphOptions, NodeData } from '@antv/g6';

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

export const topologyG6VisualGeometry = {
  externalNodeSize: 60,
  iconSize: 24,
  linkDistance: 180,
  nodeSize: 64
} as const;

type ElementOptions = {
  edge: NonNullable<GraphOptions['edge']>;
  node: NonNullable<GraphOptions['node']>;
};

export function topologyG6ElementOptions(palette: TopologyG6Palette): ElementOptions {
  return {
    edge: topologyG6EdgeOptions(palette),
    node: topologyG6NodeOptions(palette)
  };
}

function topologyG6EdgeOptions(palette: TopologyG6Palette): ElementOptions['edge'] {
  return {
    style: {
      endArrow: true,
      increasedLineWidthForHitTesting: 8,
      labelBackground: true,
      labelBackgroundFill: palette.nodeFill,
      labelFill: palette.text,
      labelFontSize: 10,
      labelPadding: [2, 4],
      lineWidth: 2,
      stroke: palette.border
    },
    state: {
      hover: { lineWidth: 2.5, stroke: palette.hover },
      selected: { lineWidth: 3, stroke: palette.selected },
      path: { lineWidth: 2.5, stroke: palette.selected },
      dimmed: { labelOpacity: 0.32, opacity: 0.24 }
    }
  };
}

function topologyG6NodeOptions(palette: TopologyG6Palette): ElementOptions['node'] {
  const preserveHealthStroke = (node: NodeData) => {
    const stroke = node.style?.stroke;
    return typeof stroke === 'string' ? stroke : palette.border;
  };
  return {
    type: 'hexagon',
    style: {
      cursor: 'pointer',
      fill: palette.nodeFill,
      labelFill: palette.text,
      labelFontSize: 10,
      labelLineHeight: 13,
      labelMaxWidth: 112,
      labelPlacement: 'bottom',
      halo: false,
      lineWidth: 2.5,
      size: topologyG6VisualGeometry.nodeSize,
      stroke: palette.border
    },
    state: {
      hover: {
        halo: true,
        haloLineWidth: 8,
        haloStroke: palette.hover,
        haloStrokeOpacity: 0.16,
        labelBackground: true,
        labelBackgroundFill: palette.nodeFill,
        labelOpacity: 1,
        labelPadding: [2, 4],
        lineWidth: 2.5,
        stroke: preserveHealthStroke
      },
      selected: {
        halo: true,
        haloLineWidth: 12,
        haloStroke: palette.selected,
        haloStrokeOpacity: 0.22,
        labelBackground: true,
        labelBackgroundFill: palette.nodeFill,
        labelOpacity: 1,
        labelPadding: [2, 4],
        lineWidth: 2.5,
        stroke: preserveHealthStroke
      },
      path: {
        halo: true,
        haloLineWidth: 8,
        haloStroke: palette.selected,
        haloStrokeOpacity: 0.12,
        lineWidth: 2.5,
        stroke: preserveHealthStroke
      },
      dimmed: { labelOpacity: 0.3, opacity: 0.2 }
    }
  };
}
