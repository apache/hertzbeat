/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { GraphOptions } from '@antv/g6';

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
  externalNodeSize: 58,
  iconSize: 18,
  linkDistance: 150,
  nodeSize: 64
} as const;

type ElementOptions = {
  edge: NonNullable<GraphOptions['edge']>;
  node: NonNullable<GraphOptions['node']>;
};

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
        lineWidth: 2,
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
        lineWidth: 2,
        size: topologyG6VisualGeometry.nodeSize,
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
