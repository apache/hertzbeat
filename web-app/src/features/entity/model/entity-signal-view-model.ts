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

import {
  createInvestigationAnchor,
  createSignalCapabilities,
  type InvestigationAnchor,
  type InvestigationCapabilityState,
  type InvestigationEvidenceSummary,
  type SignalCapabilities
} from '@/features/investigation';
import {
  HERTZBEAT_QUERY_LIMITS,
  type HertzBeatLogQueryOutcome,
  type HertzBeatLogTableQuery,
  type HertzBeatMetricQueryOutcome,
  type HertzBeatTraceGanttQuery,
  type HertzBeatTraceQueryOutcome,
  type HertzBeatTraceTableQuery
} from '@/platform/perses';
import {
  buildInvestigationSignalHandoffPath,
  normalizeInvestigationTimeZone,
  type ExactTimeWindow,
  type SignalKind
} from '@/shared/query-context';

import type { EntityDetail, EntityRecord } from './entity-contract';
import type { EntityRedSignal, EntityRedViewState } from './entity-signal-contract';

const SIGNAL_TABLE_LIMIT = 25;
const MAX_WINDOW_MS = HERTZBEAT_QUERY_LIMITS.maximumWindowMs;

export type EntitySignalPlan = {
  anchor: InvestigationAnchor;
  logsQuery: HertzBeatLogTableQuery;
  tracesQuery: HertzBeatTraceTableQuery | HertzBeatTraceGanttQuery;
};

export type EntitySignalResults = {
  red?: Pick<EntityRedSignal, 'state'> | undefined;
  logs?: HertzBeatLogQueryOutcome | undefined;
  traces?: HertzBeatTraceQueryOutcome | undefined;
};

export type EntitySignalEvidence = InvestigationEvidenceSummary & {
  key: 'metrics' | 'logs' | 'traces' | 'collection' | 'topology';
};

export type EntitySignalViewState =
  | { kind: 'invalid_window' }
  | {
      kind: 'ready';
      plan: EntitySignalPlan;
      capabilities: SignalCapabilities;
      red?: EntityRedViewState | undefined;
      redMetrics?:
        | {
            requestRate: HertzBeatMetricQueryOutcome;
            errorRate: HertzBeatMetricQueryOutcome;
            latencyP95: HertzBeatMetricQueryOutcome;
          }
        | undefined;
      logs?: HertzBeatLogQueryOutcome | undefined;
      traces?: HertzBeatTraceQueryOutcome | undefined;
      evidence: EntitySignalEvidence[];
      boundMonitors: { state: 'unknown' } | { state: 'known'; total: number; names: string[] };
      topology: { total?: number | undefined; names: string[] };
      alerts: { currentActiveCount?: number | undefined };
      refreshing?: boolean | undefined;
    };

export function createEntitySignalPlan(
  source: EntityDetail | EntityRecord,
  window: ExactTimeWindow,
  timeZone: string,
  traceId?: string,
  spanId?: string
): EntitySignalPlan {
  requireWindow(window);
  const normalizedTimeZone = normalizeInvestigationTimeZone(timeZone);
  if (!normalizedTimeZone) throw new Error('Entity signal time zone is invalid');
  const entity = entityFromSignalSource(source);
  const normalizedTraceId = normalizeOpaqueId(traceId);
  const normalizedSpanId = normalizedTraceId ? normalizeOpaqueId(spanId) : undefined;
  const anchorContext = { entityId: String(entity.id) };
  const queryContext = { ...anchorContext, entityType: entity.type };
  const anchor = createInvestigationAnchor({
    source: 'entity',
    context: anchorContext,
    window: { ...window, timeZone: normalizedTimeZone },
    ...(normalizedTraceId ? { traceId: normalizedTraceId } : {}),
    ...(normalizedSpanId ? { spanId: normalizedSpanId } : {})
  });
  const logsQuery: HertzBeatLogTableQuery = {
    signal: 'logs',
    queryKind: 'table',
    timeWindow: window,
    context: queryContext,
    hideInternal: true,
    hideNoise: true,
    limit: SIGNAL_TABLE_LIMIT,
    ...(normalizedTraceId ? { traceId: normalizedTraceId } : {}),
    ...(normalizedSpanId ? { spanId: normalizedSpanId } : {})
  };
  const tracesQuery: HertzBeatTraceTableQuery | HertzBeatTraceGanttQuery = normalizedTraceId
    ? {
        signal: 'traces',
        queryKind: 'gantt',
        timeWindow: window,
        context: queryContext,
        traceId: normalizedTraceId,
        ...(normalizedSpanId ? { spanId: normalizedSpanId } : {})
      }
    : {
        signal: 'traces',
        queryKind: 'table',
        timeWindow: window,
        context: queryContext,
        spanScope: 'entrypoint',
        hideInternal: true,
        limit: SIGNAL_TABLE_LIMIT
      };
  return { anchor, logsQuery, tracesQuery };
}

export function buildEntitySignalHandoffPath(plan: EntitySignalPlan, signal: SignalKind) {
  const path = buildInvestigationSignalHandoffPath(signal, plan.anchor.context, plan.anchor.window);
  if ((signal !== 'logs' && signal !== 'traces') || !plan.anchor.traceId) return path;
  const url = new URL(path, 'https://hertzbeat.local');
  url.searchParams.set('traceId', plan.anchor.traceId);
  if (plan.anchor.spanId) url.searchParams.set('spanId', plan.anchor.spanId);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export function resolveSignalCapabilities(
  detail: EntityDetail | undefined,
  results: EntitySignalResults
): SignalCapabilities {
  const redState = redCapability(results.red?.state);
  return createSignalCapabilities({
    // A RED-only result cannot characterize native or OTLP metric sources.
    metrics: redState === 'available' ? 'available' : 'unknown',
    redMetrics: redState,
    logs: queryCapability(results.logs),
    traces: queryCapability(results.traces),
    topology: countCapability(detail?.opsSummary?.relationCount),
    // Bound monitors prove catalog binding, not collection execution in this exact window.
    collection: 'unknown',
    // Existing detail evidence is current-state only and does not prove this exact window.
    alerts: 'unknown',
    nativeMetrics: 'unknown',
    otelMetrics: 'unknown',
    traceCorrelation: results.traces?.state === 'ready' ? 'available' : queryCapability(results.traces),
    logTraceCorrelation: 'unknown',
    semanticGraph: countCapability(detail?.opsSummary?.relationCount)
  });
}

function entityFromSignalSource(source: EntityDetail | EntityRecord) {
  return 'entity' in source ? source.entity : source;
}

function redCapability(state: EntityRedSignal['state'] | undefined): InvestigationCapabilityState {
  if (state === 'ready') return 'available';
  return state ?? 'unknown';
}

function countCapability(count: number | undefined): InvestigationCapabilityState {
  if (count == null) return 'unknown';
  return count > 0 ? 'available' : 'empty';
}

function queryCapability(
  outcome: HertzBeatLogQueryOutcome | HertzBeatTraceQueryOutcome | undefined
): InvestigationCapabilityState {
  if (!outcome) return 'unknown';
  if (outcome.state === 'ready') return 'available';
  if (outcome.state === 'empty') return 'empty';
  return 'unavailable';
}

function requireWindow(window: ExactTimeWindow) {
  if (
    !Number.isSafeInteger(window.from) ||
    !Number.isSafeInteger(window.to) ||
    window.from <= 0 ||
    window.from >= window.to ||
    window.to - window.from > MAX_WINDOW_MS
  ) {
    throw new Error('Entity signal window is invalid');
  }
}

function normalizeOpaqueId(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized || normalized.length > 256 || [...normalized].some(hasControlCharacter)) return undefined;
  return normalized;
}

function hasControlCharacter(value: string) {
  const code = value.charCodeAt(0);
  return code <= 31 || code === 127;
}
