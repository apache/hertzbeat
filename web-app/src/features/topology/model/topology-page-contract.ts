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

import type { ExactTimeWindow } from '@/shared/query-context';

import type { TopologyNode } from './topology-contract';
import type { TopologyFailure, TopologyQuery, TopologyScopePatch } from './topology-model';
import type { TopologyInteraction, TopologyMetricRow, TopologyPresentation } from './topology-view-model';

export type TopologyPageEvidence =
  | { kind: 'loading' | 'permission' | 'unavailable' | 'contract' | 'error' }
  | { kind: 'empty'; scope: 'global' | 'filtered'; presentation: TopologyPresentation }
  | { kind: 'ready'; presentation: TopologyPresentation };

export type TopologyPageState = {
  query?: TopologyQuery;
  evidence: TopologyPageEvidence;
  interaction: TopologyInteraction;
  refreshing: boolean;
  refreshFailure?: TopologyFailure;
};

export type TopologyPageActions = {
  changeScope: (patch: TopologyScopePatch) => void;
  changePage: (pageIndex: number, pageSize: number) => void;
  clearHover: () => void;
  clearSelection: () => void;
  configureTelemetry: () => void;
  discoverResources: () => void;
  drilldown: (row: TopologyMetricRow) => void;
  hoverEdge: (edgeId: string) => void;
  hoverNode: (nodeId: string) => void;
  openEntity: (entityId: number) => void;
  querySignals: (node: TopologyNode, window: ExactTimeWindow) => void;
  refresh: () => void;
  selectEdge: (edgeId: string) => void;
  selectNode: (nodeId: string) => void;
};

export type TopologyPageController = {
  state: TopologyPageState;
  actions: TopologyPageActions;
};
