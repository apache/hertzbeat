/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export type TopologyRedMetrics = {
  requestRatePerSecond: number | null;
  requestCount: number | null;
  errorRate: number | null;
  errorCount: number | null;
  latencyP95Ms: number | null;
  latencyAvgMs: number | null;
};

export type TopologyNode = {
  id: string;
  entityId: number;
  entityName: string;
  entityType: string;
  namespace: string;
  environment: string;
  health: string;
  focus: boolean;
  evidenceBadges: string[];
  redMetrics: TopologyRedMetrics;
};

export type TopologyEdge = {
  id: string;
  relationId: number | null;
  sourceNodeId: string;
  targetNodeId: string | null;
  sourceEntityId: number;
  targetEntityId: number | null;
  targetRef: string | null;
  sampleTraceId: string | null;
  sampleSpanId: string | null;
  firstSeen: string | null;
  lastSeen: string | null;
  relationType: string;
  relationSource: string;
  status: string;
  score: number | null;
  evidenceBadges: string[];
  redMetrics: TopologyRedMetrics;
};

export type TopologyTimelineEvent = {
  id: string;
  edgeId: string | null;
  entityId: number | null;
  sourceKind: string;
  eventType: string;
  title: string;
  detail: string;
  actor: string;
  occurredAt: string;
};

export type TopologyPartialReason = 'entity_seed_limit' | 'edge_page';

export type TopologyEdgePage = {
  pageIndex: number;
  pageSize: number;
  totalElements: number;
  hasNext: boolean;
};

export type TopologyGraph = {
  apiBacked: true;
  focusEntityId: number | null;
  depth: number;
  partial: boolean;
  partialReasons: TopologyPartialReason[];
  edgePage: TopologyEdgePage;
  sourceKinds: string[];
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  impactTimeline: TopologyTimelineEvent[];
};
