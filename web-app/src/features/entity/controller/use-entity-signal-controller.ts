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

import { skipToken, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { queryHertzBeatData, type HertzBeatLogQueryOutcome, type HertzBeatTraceQueryOutcome } from '@/platform/perses';
import { normalizeInvestigationTimeZone } from '@/shared/query-context';
import { useSharedTimeOptional } from '@/shared/time';

import { loadEntityRedSignal } from '../api/entity-signal-api';
import type { EntityDetail, EntityRecord } from '../model/entity-contract';
import { redMetricOutcomes } from '../model/entity-red-metric-model';
import type { EntityRedSignal, EntityRedViewState } from '../model/entity-signal-contract';
import { resolveEntitySignalEvidence } from '../model/entity-signal-evidence-model';
import {
  createEntitySignalPlan,
  resolveSignalCapabilities,
  type EntitySignalPlan,
  type EntitySignalViewState
} from '../model/entity-signal-view-model';
import { entityQueryKeys } from './entity-query-keys';

type EntitySignalSource = EntityDetail | EntityRecord;

export function useEntitySignalController(source: EntitySignalSource | undefined) {
  const time = useSharedTimeOptional();
  const [params] = useSearchParams();
  const routedTimeZone = params.get('timeZone');
  const timeZone = useMemo(() => resolveInvestigationTimeZone(routedTimeZone), [routedTimeZone]);
  const plan = useMemo(
    () => safeSignalPlan(source, time?.window, timeZone, params.get('traceId'), params.get('spanId')),
    [source, params, time?.window, timeZone]
  );
  const queryKeys = signalQueryKeys(source, plan, time?.refreshRevision);
  const id = entityFromSignalSource(source)?.id;
  const redQuery = useQuery({
    queryKey: queryKeys.red,
    queryFn: redQueryFunction(id, plan),
    retry: false
  });
  const logsQuery = useQuery({
    queryKey: queryKeys.logs,
    queryFn: logQueryFunction(plan),
    retry: false
  });
  const tracesQuery = useQuery({
    queryKey: queryKeys.traces,
    queryFn: traceQueryFunction(plan),
    retry: false
  });
  const state = resolveEntitySignalViewState(source, plan, redQuery, logsQuery, tracesQuery);
  return {
    state,
    refresh: () => time?.requestRefresh()
  };
}

function redQueryFunction(id: number | undefined, plan: EntitySignalPlan | undefined) {
  if (!plan || id == null) return skipToken;
  return ({ signal }: { signal: AbortSignal }) => loadEntityRedSignal(id, plan.logsQuery.timeWindow, signal);
}

function logQueryFunction(plan: EntitySignalPlan | undefined) {
  if (!plan) return skipToken;
  return ({ signal }: { signal: AbortSignal }) => queryHertzBeatData(plan.logsQuery, { signal });
}

function traceQueryFunction(plan: EntitySignalPlan | undefined) {
  if (!plan) return skipToken;
  return ({ signal }: { signal: AbortSignal }) => queryTrace(plan, signal);
}

function resolveEntitySignalViewState(
  source: EntitySignalSource | undefined,
  plan: EntitySignalPlan | undefined,
  redQuery: QuerySnapshot<EntityRedSignal>,
  logsQuery: QuerySnapshot<HertzBeatLogQueryOutcome>,
  tracesQuery: QuerySnapshot<HertzBeatTraceQueryOutcome>
): EntitySignalViewState | undefined {
  if (!source) return undefined;
  if (!plan) return { kind: 'invalid_window' };
  const detail = detailFromSignalSource(source);
  const red = toRedViewState(redQuery.data, redQuery.error);
  const results = { red, logs: logsQuery.data, traces: tracesQuery.data };
  const capabilities = resolveSignalCapabilities(detail, results);
  return {
    kind: 'ready',
    plan,
    capabilities,
    ...resolvedSignalData(red, logsQuery.data, tracesQuery.data),
    evidence: resolveEntitySignalEvidence(plan, detail, capabilities),
    boundMonitors: boundMonitorState(detail),
    topology: topologyState(detail),
    alerts: alertState(detail),
    refreshing: [redQuery, logsQuery, tracesQuery].some(query => query.isFetching)
  };
}

function resolvedSignalData(
  red: EntityRedViewState | undefined,
  logs: HertzBeatLogQueryOutcome | undefined,
  traces: HertzBeatTraceQueryOutcome | undefined
) {
  return {
    ...(red ? { red } : {}),
    ...(red?.state === 'ready' ? { redMetrics: redMetricOutcomes(red) } : {}),
    ...(logs ? { logs } : {}),
    ...(traces ? { traces } : {})
  };
}

function boundMonitorState(
  detail: EntityDetail | undefined
): Extract<EntitySignalViewState, { kind: 'ready' }>['boundMonitors'] {
  if (!detail) return { state: 'unknown' };
  return {
    state: 'known',
    total: detail.monitorPreview.total,
    names: detail.monitorPreview.items.slice(0, 3).map(monitor => monitor.name)
  };
}

function topologyState(detail: EntityDetail | undefined) {
  if (!detail) return { names: [] };
  const names = detail.relations.slice(0, 3).flatMap(relation => {
    if (relation.entityName) return [relation.entityName];
    return relation.targetRef ? [relation.targetRef] : [];
  });
  const total = detail.opsSummary?.relationCount;
  return { ...(total == null ? {} : { total }), names };
}

function alertState(detail: EntityDetail | undefined) {
  if (!detail) return {};
  const currentActiveCount = detail.evidence?.activeAlertCount;
  return currentActiveCount == null ? {} : { currentActiveCount };
}

function toRedViewState(data: EntityRedSignal | undefined, error: Error | null): EntityRedViewState | undefined {
  if (!data) return error ? { state: 'unavailable' } : undefined;
  if (data.state !== 'ready') return { state: data.state };
  if (!data.summary || data.series.length === 0) return { state: 'unavailable' };
  return { ...data, state: 'ready', summary: data.summary, series: data.series };
}

type QuerySnapshot<Data> = { data?: Data | undefined; error: Error | null; isFetching: boolean };

function queryTrace(plan: EntitySignalPlan, signal: AbortSignal): Promise<HertzBeatTraceQueryOutcome> {
  return plan.tracesQuery.queryKind === 'gantt'
    ? queryHertzBeatData(plan.tracesQuery, { signal })
    : queryHertzBeatData(plan.tracesQuery, { signal });
}

function safeSignalPlan(
  source: EntitySignalSource | undefined,
  window: { from: number; to: number } | undefined,
  timeZone: string,
  traceId: string | null,
  spanId: string | null
) {
  if (!source || !window) return undefined;
  try {
    return createEntitySignalPlan(source, window, timeZone, traceId ?? undefined, spanId ?? undefined);
  } catch {
    return undefined;
  }
}

function resolveBrowserTimeZone() {
  const candidate = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return normalizeInvestigationTimeZone(candidate) ?? 'UTC';
}

function resolveInvestigationTimeZone(routedTimeZone: string | null) {
  return normalizeInvestigationTimeZone(routedTimeZone) ?? resolveBrowserTimeZone();
}

function exactSignalScope(scope: string, traceId?: string, spanId?: string) {
  if (!traceId) return `${scope}:table`;
  return `${scope}:trace:${traceId}:span:${spanId ?? ''}`;
}

function signalQueryKeys(
  source: EntitySignalSource | undefined,
  plan: EntitySignalPlan | undefined,
  revision: number | undefined
) {
  const id = entityFromSignalSource(source)?.id ?? 0;
  const refreshRevision = revision ?? 0;
  const scope = plan ? `${plan.anchor.window.from}:${plan.anchor.window.to}` : 'invalid';
  const logScope = exactSignalScope(scope, plan?.logsQuery.traceId, plan?.logsQuery.spanId);
  const traceScope = exactSignalScope(scope, plan?.anchor.traceId, plan?.anchor.spanId);
  return {
    red: entityQueryKeys.signal(id, 'red', scope, refreshRevision),
    logs: entityQueryKeys.signal(id, 'logs', logScope, refreshRevision),
    traces: entityQueryKeys.signal(id, 'traces', traceScope, refreshRevision)
  };
}

function entityFromSignalSource(source: EntitySignalSource | undefined) {
  if (!source) return undefined;
  return 'entity' in source ? source.entity : source;
}

function detailFromSignalSource(source: EntitySignalSource) {
  return 'entity' in source ? source : undefined;
}
