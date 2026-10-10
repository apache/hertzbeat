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

import type { MutableRefObject } from 'react';

import type { TopologyInteraction, TopologyPresentation } from '../model/topology-view-model';
import type { TopologyG6Palette } from './topology-g6-options';

export type TopologyG6Module = Pick<
  typeof import('@/platform/topology'),
  'Graph' | 'NodeEvent' | 'EdgeEvent' | 'CanvasEvent' | 'GraphEvent'
>;
export type TopologyG6Graph = InstanceType<TopologyG6Module['Graph']>;
export type TopologyG6GraphRef = MutableRefObject<TopologyG6Graph | undefined>;
export type TopologyG6InputRef = MutableRefObject<TopologyG6RuntimeInput>;
export type TopologyRuntimeState = { kind: 'loading' | 'ready' | 'failure' };

type RuntimeCallbacks = {
  onClearSelection: () => void;
  onEdgeHover: (edgeId: string | null) => void;
  onEdgeSelect: (edgeId: string) => void;
  onNodeHover: (nodeId: string | null) => void;
  onNodeSelect: (nodeId: string) => void;
  onRuntimeStateChange: (state: TopologyRuntimeState) => void;
  onScaleChange: (scale: number) => void;
};

export type TopologyG6RuntimeInput = {
  presentation: TopologyPresentation;
  interaction: TopologyInteraction;
  palette: TopologyG6Palette;
  callbacks: RuntimeCallbacks;
};
