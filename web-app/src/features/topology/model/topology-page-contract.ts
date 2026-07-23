/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { TopologyFailure, TopologyQuery, TopologyScopePatch } from './topology-model';
import type { TopologyInteraction, TopologyMetricRow, TopologyPresentation } from './topology-view-model';

export type TopologyPageEvidence =
  | { kind: 'loading' | 'permission' | 'unavailable' | 'contract' | 'error' }
  | { kind: 'empty' | 'ready'; presentation: TopologyPresentation };

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
  drilldown: (row: TopologyMetricRow) => void;
  hoverEdge: (edgeId: string) => void;
  hoverNode: (nodeId: string) => void;
  refresh: () => void;
  selectEdge: (edgeId: string) => void;
  selectNode: (nodeId: string) => void;
};

export type TopologyPageController = {
  state: TopologyPageState;
  actions: TopologyPageActions;
};
