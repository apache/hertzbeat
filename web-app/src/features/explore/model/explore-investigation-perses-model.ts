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
  HertzBeatMetricQueryOutcome,
  HertzBeatTraceGanttQuery,
  HertzBeatTraceGanttQueryOutcome
} from '@/platform/perses';
import type { ExactTimeWindow } from '@/shared/query-context';

import type {
  InvestigationLogRecord,
  InvestigationMetricSeries,
  InvestigationPersesResults,
  InvestigationTraceDetail,
  LogInvestigationSnapshot,
  TraceInvestigationSnapshot
} from './explore-investigation-contract';
import { logInvestigationIdentity, traceInvestigationIdentity } from './explore-investigation-handoff-model';
import type { LogExploreQuery, TraceExploreQuery } from './explore-query';

type PersesInvestigationContext = ReturnType<typeof authoritativeContext>;

export function createTraceInvestigationPersesResults(
  query: TraceExploreQuery,
  snapshot: TraceInvestigationSnapshot
): InvestigationPersesResults {
  const timeWindow = snapshotWindow(snapshot.window);
  const context = authoritativeContext(traceInvestigationIdentity(snapshot));
  return {
    gantt:
      snapshot.gantt.state === 'ready' && snapshot.gantt.detail
        ? traceResult(
            query.traceId ?? snapshot.traceId,
            snapshot.selectedSpanId,
            snapshot.gantt.detail,
            timeWindow,
            context
          )
        : undefined,
    logs:
      snapshot.sameTraceLogs.state === 'ready'
        ? createInvestigationLogResult(
            snapshot.sameTraceLogs.logs,
            snapshot.sameTraceLogs.truncated,
            timeWindow,
            context,
            snapshot.traceId
          )
        : undefined,
    metrics: createInvestigationMetricResults(
      snapshot.metrics.series,
      snapshot.metrics.state,
      snapshot.metrics.truncated,
      timeWindow,
      context
    )
  };
}

export function createLogInvestigationPersesResults(
  _query: LogExploreQuery,
  snapshot: LogInvestigationSnapshot
): InvestigationPersesResults {
  const timeWindow = snapshotWindow(snapshot.window);
  const context = authoritativeContext(logInvestigationIdentity(snapshot));
  const selected = snapshot.selectedLog.log;
  const nearby = [...snapshot.nearbyLogs.before, ...snapshot.nearbyLogs.after];
  return {
    gantt:
      snapshot.trace.state === 'ready' && snapshot.trace.detail && selected?.traceId
        ? traceResult(selected.traceId, selected.spanId, snapshot.trace.detail, timeWindow, context)
        : undefined,
    logs:
      snapshot.nearbyLogs.state === 'ready'
        ? createInvestigationLogResult(
            nearby,
            snapshot.nearbyLogs.hasMoreBefore || snapshot.nearbyLogs.hasMoreAfter,
            timeWindow,
            context
          )
        : undefined,
    metrics: createInvestigationMetricResults(
      snapshot.metrics.series,
      snapshot.metrics.state,
      snapshot.metrics.truncated,
      timeWindow,
      context
    )
  };
}

function traceResult(
  traceId: string,
  spanId: string | null,
  detail: InvestigationTraceDetail,
  timeWindow: ExactTimeWindow,
  context: PersesInvestigationContext
): { query: HertzBeatTraceGanttQuery; outcome: HertzBeatTraceGanttQueryOutcome } {
  return {
    query: {
      signal: 'traces',
      queryKind: 'gantt',
      timeWindow,
      context,
      traceId,
      ...(spanId ? { spanId } : {})
    },
    outcome: {
      state: 'ready',
      truncated: detail.partial ?? false,
      data: {
        traceId,
        rootState: detail.rootState,
        rootSpanCount: detail.rootSpanCount,
        representativeSpan: detail.representativeSpan,
        observedStartTime: detail.observedStartTime,
        observedEndTime: detail.observedEndTime,
        missingParentCount: detail.missingParentCount,
        rootSpanId: detail.rootSpanId,
        serviceName: detail.serviceName,
        serviceNamespace: detail.serviceNamespace,
        rootSpanName: detail.rootSpanName,
        durationNanos: detail.durationNanos,
        status: detail.status,
        startTime: detail.startTime,
        errorSpanCount: detail.errorSpanCount,
        resourceAttributes: detail.resourceAttributes,
        spans: detail.spans.map(span => ({ ...span, traceId }))
      }
    }
  };
}

export function createInvestigationLogResult(
  records: InvestigationLogRecord[],
  truncated: boolean,
  timeWindow: ExactTimeWindow,
  context: PersesInvestigationContext,
  traceId?: string
): { query: HertzBeatLogTableQuery; outcome: HertzBeatLogQueryOutcome } {
  return {
    query: {
      signal: 'logs',
      queryKind: 'table',
      timeWindow,
      context,
      ...(traceId ? { traceId } : {}),
      limit: records.length
    },
    outcome: {
      state: 'ready',
      truncated,
      data: { rows: records.map(persesLogRow), total: records.length + (truncated ? 1 : 0) }
    }
  };
}

function persesLogRow(record: InvestigationLogRecord) {
  return {
    logRecordUid: record.logRecordUid,
    timeUnixNano: record.timeUnixNano,
    observedTimeUnixNano: record.observedTimeUnixNano,
    severityNumber: record.severityNumber,
    severityText: record.severityText,
    body: record.body,
    attributes: record.attributes,
    droppedAttributesCount: null,
    traceId: record.traceId,
    spanId: record.spanId,
    traceFlags: null,
    resource: record.resourceAttributes,
    resourceSchemaUrl: null,
    instrumentationScope: null,
    scopeSchemaUrl: null
  };
}

export function createInvestigationMetricResults(
  series: InvestigationMetricSeries[],
  state: string,
  truncated: boolean,
  timeWindow: ExactTimeWindow,
  context: PersesInvestigationContext
): Array<{ query: HertzBeatMetricQuery; outcome: HertzBeatMetricQueryOutcome }> {
  if (state !== 'ready') return [];
  return series.map((item, index) => ({
    query: {
      signal: 'metrics',
      queryKind: 'time-series',
      timeWindow,
      context,
      metric: { name: item.metricName },
      limit: 1
    },
    outcome: {
      state: 'ready',
      truncated,
      data: {
        timeWindow,
        source: 'otlp_metrics',
        series: [
          {
            key: `${item.metricName}-${index}`,
            name: item.metricName,
            ...(item.unit ? { unit: item.unit } : {}),
            labels: item.labels,
            points: item.points
          }
        ]
      }
    }
  }));
}

function snapshotWindow(window: { start: number; end: number }) {
  return { from: window.start, to: window.end };
}

function authoritativeContext(
  identity:
    | { entityId: string; serviceName: string; serviceNamespace: string | null; deploymentEnvironment: string | null }
    | undefined
) {
  if (!identity) return {};
  return {
    entityId: identity.entityId || undefined,
    serviceName: identity.serviceName,
    serviceNamespace: identity.serviceNamespace ?? undefined,
    environment: identity.deploymentEnvironment ?? undefined
  };
}
