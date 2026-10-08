/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type {
  HertzBeatLogQueryOutcome,
  HertzBeatLogTableQuery,
  HertzBeatMetricQuery,
  HertzBeatMetricQueryOutcome,
  HertzBeatTraceGanttQuery,
  HertzBeatTraceGanttQueryOutcome
} from '@/platform/perses';
import type { RepresentativeSpan } from '@/shared/trace-evidence';

import type { ExploreInvestigationRoute } from './explore-investigation-model';

export type InvestigationEvidenceState = 'ready' | 'empty' | 'unavailable';
type InvestigationReason =
  | 'observed'
  | 'no_data'
  | 'not_found'
  | 'not_correlated'
  | 'storage_unavailable'
  | 'malformed_data'
  | 'limit_exceeded'
  | 'identity_unavailable'
  | 'upstream_unavailable'
  | 'query_strategy_unavailable';
type InvestigationSource = 'greptime_traces' | 'greptime_logs' | 'greptime_flow' | 'otlp_metrics';

export type InvestigationBlock = {
  state: InvestigationEvidenceState;
  reason: InvestigationReason;
  source: InvestigationSource;
};

export type InvestigationServiceIdentity = {
  workspaceId: string;
  entityId: string;
  entityType: string;
  serviceName: string;
  serviceNamespace: string | null;
  deploymentEnvironment: string | null;
};

export type InvestigationLogRecord = {
  logRecordUid: string;
  timeUnixNano: string;
  observedTimeUnixNano: string | null;
  severityNumber: number | null;
  severityText: string | null;
  body: string | null;
  traceId: string | null;
  spanId: string | null;
  identity: InvestigationServiceIdentity | null;
  attributes: Record<string, string>;
  resourceAttributes: Record<string, string>;
  truncatedFields?: { attributes?: string[]; resourceAttributes?: string[] } | undefined;
};

type InvestigationTraceSpan = {
  spanId: string;
  parentSpanId: string | null;
  spanName: string | null;
  serviceName: string | null;
  serviceNamespace: string | null;
  deploymentEnvironment: string | null;
  entityId: string | null;
  entityType: string | null;
  status: string;
  statusMessage: string | null;
  spanKind: string | null;
  traceState: string | null;
  scopeName: string | null;
  scopeVersion: string | null;
  durationNanos: string;
  startTime: number;
  startTimeUnixNano: string;
  highlighted: boolean;
  resourceAttributes: Record<string, string>;
  spanAttributes: Record<string, string>;
  events: Array<{
    timeUnixNano: string;
    name: string | null;
    attributes: Record<string, string>;
    droppedAttributesCount: number | null;
  }>;
  links: Array<{
    traceId: string;
    spanId: string;
    traceState: string | null;
    attributes: Record<string, string>;
    droppedAttributesCount: number | null;
  }>;
  codeNavigationHint: {
    repositoryUrl: string | null;
    provider: string | null;
    defaultPath: string | null;
    searchQuery: string | null;
    label: string | null;
  } | null;
};

export type InvestigationTraceDetail = {
  partial?: boolean | undefined;
  rootSpanId: string | null;
  serviceName: string | null;
  serviceNamespace: string | null;
  deploymentEnvironment: string | null;
  entityId: string | null;
  entityType: string | null;
  rootSpanName: string | null;
  durationNanos: string | null;
  status: string | null;
  startTime: number | null;
  errorSpanCount: number;
  resourceAttributes: Record<string, string> | null;
  spans: InvestigationTraceSpan[];
  rootState: 'unique' | 'missing' | 'ambiguous';
  rootSpanCount: number;
  representativeSpan: RepresentativeSpan;
  observedStartTime: number;
  observedEndTime: number;
  missingParentCount: number;
};

type RedValues = {
  requestCount: number;
  errorCount: number;
  requestRatePerSecond: number;
  errorRate: number;
  latencyAverageMs: number | null;
  latencyP95Ms: number | null;
};

type InvestigationRedPoint = RedValues & { timestamp: number };
export type InvestigationMetricSeries = {
  metricName: string;
  unit: string | null;
  labels: Record<string, string>;
  points: Array<{ timestamp: number; value: number }>;
};
type InvestigationDependencyEdge = {
  sourceServiceName: string;
  targetServiceName: string;
  sourceEntityId: string | null;
  targetEntityId: string | null;
  spanId: string;
  status: string;
  durationMillis: number;
};

export type TraceInvestigationSnapshot = {
  traceId: string;
  selectedSpanId: string | null;
  window: { start: number; end: number };
  gantt: InvestigationBlock & { detail: InvestigationTraceDetail | null };
  sameTraceLogs: InvestigationBlock & { truncated: boolean; logs: InvestigationLogRecord[] };
  red: InvestigationBlock & {
    resolutionSeconds: 60;
    identity: InvestigationServiceIdentity | null;
    summary: RedValues | null;
    series: InvestigationRedPoint[];
  };
  metrics: InvestigationBlock & { truncated: boolean; series: InvestigationMetricSeries[] };
  dependencies: InvestigationBlock & { truncated: boolean; edges: InvestigationDependencyEdge[] };
};

export type LogInvestigationSnapshot = {
  logRecordUid: string;
  window: { start: number; end: number };
  selectedLog: InvestigationBlock & { log: InvestigationLogRecord | null };
  trace: InvestigationBlock & { detail: InvestigationTraceDetail | null };
  metrics: InvestigationBlock & { truncated: boolean; series: InvestigationMetricSeries[] };
  nearbyLogs: InvestigationBlock & {
    hasMoreBefore: boolean;
    hasMoreAfter: boolean;
    before: InvestigationLogRecord[];
    after: InvestigationLogRecord[];
  };
};

export type InvestigationPersesResults = {
  gantt?: { query: HertzBeatTraceGanttQuery; outcome: HertzBeatTraceGanttQueryOutcome } | undefined;
  logs?: { query: HertzBeatLogTableQuery; outcome: HertzBeatLogQueryOutcome } | undefined;
  metrics: Array<{ query: HertzBeatMetricQuery; outcome: HertzBeatMetricQueryOutcome }>;
};

type InvestigationLoadingState<Route> =
  | { kind: 'inactive' }
  | { kind: 'invalid' }
  | { kind: 'loading'; route: Route }
  | { kind: 'unavailable' | 'contract_error'; route: Route };

export type TraceInvestigationViewState =
  | InvestigationLoadingState<Extract<ExploreInvestigationRoute, { kind: 'trace' }>>
  | {
      kind: 'ready';
      route: Extract<ExploreInvestigationRoute, { kind: 'trace' }>;
      snapshot: TraceInvestigationSnapshot;
      perses: InvestigationPersesResults;
    };

export type LogInvestigationViewState =
  | InvestigationLoadingState<Extract<ExploreInvestigationRoute, { kind: 'log' }>>
  | {
      kind: 'ready';
      route: Extract<ExploreInvestigationRoute, { kind: 'log' }>;
      snapshot: LogInvestigationSnapshot;
      perses: InvestigationPersesResults;
    };
