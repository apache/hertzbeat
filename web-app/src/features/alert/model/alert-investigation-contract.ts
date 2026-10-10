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

import type {
  HertzBeatLogQueryOutcome,
  HertzBeatLogTableQuery,
  HertzBeatMetricQuery,
  HertzBeatMetricQueryOutcome
} from '@/platform/perses';

import type { AlertInvestigationRoute } from './alert-investigation-route';

type AlertEvidenceState = 'ready' | 'empty' | 'unavailable';
type AlertEvidenceReason =
  | 'observed'
  | 'no_data'
  | 'storage_unavailable'
  | 'malformed_data'
  | 'limit_exceeded'
  | 'identity_unavailable'
  | 'upstream_unavailable'
  | 'query_strategy_unavailable';

type EvidenceBlock<Source extends string> = {
  state: AlertEvidenceState;
  reason: AlertEvidenceReason;
  source: Source;
};

export type AlertInvestigationIdentity = {
  serviceName: string | null;
  serviceNamespace: string | null;
  deploymentEnvironment: string | null;
  entityId: number | null;
  entityType: string | null;
  monitorId: number | null;
  metricName: string | null;
  metricQuery: string | null;
};

export type AlertInvestigationLogRecord = {
  logRecordUid: string;
  timeUnixNano: string;
  observedTimeUnixNano: string | null;
  severityNumber: number | null;
  severityText: string | null;
  body: string | null;
  traceId: string | null;
  spanId: string | null;
  identity: {
    workspaceId: string;
    entityId: string;
    entityType: string;
    serviceName: string;
    serviceNamespace: string | null;
    deploymentEnvironment: string | null;
  } | null;
  attributes: Record<string, string>;
  resourceAttributes: Record<string, string>;
};

type AlertInvestigationMetricSeries = {
  name: string;
  labels: Record<string, string>;
  points: Array<{ timestamp: number; value: number }>;
};

export type AlertInvestigationTraceSummary = {
  traceId: string;
  startTimeUnixNano: string;
  durationNanos: string;
  status: 'error' | 'ok' | 'unset' | 'unknown';
  spanCount: number;
  serviceName: string;
};

type AlertInvestigationTopologyEdge = {
  observedAt: number;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  relationType: string;
  provenance: string;
  confidence: number;
  requestCount: number;
  errorCount: number;
};

type AlertInvestigationCollectionEvent = {
  observedAt: number;
  durationMillis: number;
  outcome: string;
  collectorId: string | null;
  target: string | null;
  metricSet: string | null;
  failureClass: string | null;
  phase: string | null;
  fieldCount: number;
  rowCount: number;
};

export type AlertInvestigationSnapshot = {
  alertId: number;
  window: { start: number; end: number; anchor: number };
  alert: {
    name: string | null;
    status: string | null;
    severity: string | null;
    summary: string | null;
    content: string | null;
    labels: Record<string, string>;
    annotations: Record<string, string>;
  };
  identity:
    | (EvidenceBlock<'persisted_alert'> & { state: 'ready'; reason: 'observed'; identity: AlertInvestigationIdentity })
    | (EvidenceBlock<'persisted_alert'> & {
        state: 'unavailable';
        reason: 'identity_unavailable' | 'malformed_data';
        identity: null;
      });
  metrics: EvidenceBlock<'otlp_metrics'> & { series: AlertInvestigationMetricSeries[]; truncated: boolean };
  logs: EvidenceBlock<'greptime_logs'> & { records: AlertInvestigationLogRecord[]; truncated: boolean };
  traces: EvidenceBlock<'greptime_traces'> & { traces: AlertInvestigationTraceSummary[]; truncated: boolean };
  topology: EvidenceBlock<'greptime_semantic_graph'> & {
    edges: AlertInvestigationTopologyEdge[];
    truncated: boolean;
  };
  collection: EvidenceBlock<'greptime_collection_events'> & { event: AlertInvestigationCollectionEvent | null };
};

export type AlertInvestigationPersesResults = {
  metrics: Array<{ query: HertzBeatMetricQuery; outcome: HertzBeatMetricQueryOutcome }>;
  logs?: { query: HertzBeatLogTableQuery; outcome: HertzBeatLogQueryOutcome } | undefined;
};

type ReadyRoute = Extract<AlertInvestigationRoute, { kind: 'ready' }>;
export type AlertInvestigationViewState =
  | { kind: 'invalid' }
  | { kind: 'loading' | 'unavailable' | 'contract_error'; route: ReadyRoute }
  | {
      kind: 'ready';
      route: ReadyRoute;
      snapshot: AlertInvestigationSnapshot;
      perses: AlertInvestigationPersesResults;
    };
