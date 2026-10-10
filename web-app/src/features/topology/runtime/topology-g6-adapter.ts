/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { GraphOptions } from '@/platform/topology';

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
