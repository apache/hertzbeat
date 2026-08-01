/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { GraphOptions } from '@antv/g6';

import type { TopologyInteraction, TopologyPresentation } from '../model/topology-view-model';
import { topologyG6Data } from './topology-g6-data';
import { topologyG6ElementOptions, topologyG6VisualGeometry, type TopologyG6Palette } from './topology-g6-options';

export type { TopologyG6Palette } from './topology-g6-options';

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
      linkDistance: topologyG6VisualGeometry.linkDistance,
      nodeStrength: -260
    },
    zoomRange: [0.35, 2]
  };
}
