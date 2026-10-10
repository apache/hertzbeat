/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { logStatisticEvidence } from './log-statistic-evidence';
import { loadMetricComposition } from './explore-metric-composition-api';
import { apiMessageGet } from '@/core/http/api-message';
import type { LogExploreQuery, MetricExploreQuery, TraceExploreQuery } from '../model/explore-query';
import { ExploreSignalContractError } from '../model/explore-signal-contract';
import { METRIC_INVENTORY_LIMIT } from '../model/explore-metric-inventory';
import { parseLogOverview, parseLogPage, parseLogTrend } from './explore-log-schema';
import { parseMetricConsole, parseMetricInventory } from './explore-metric-schema';
import { parseTracePage } from './explore-trace-schema';
import {
  buildSignalApiPath,
  buildLogStatsApiPath,
  resolveSignalWindow,
  requireQueryableScope,
  sharedSignalParams,
  setValue
} from './explore-signal-paths';
export { buildSignalApiPath, buildLogStreamPath, buildTraceStructureAnalysisPath } from './explore-signal-paths';
export { openLogStream } from './explore-log-stream';
export { classifyExploreSignalError } from './explore-signal-api-model';

export async function loadMetricSignal(query: MetricExploreQuery, signal?: AbortSignal) {
  if (query.metricPlan) {
    const window = resolveSignalWindow(query, Date.now());
    return loadMetricComposition(query, { from: window.start, to: window.end }, loadScalarMetric, signal);
  }
  if (!query.query?.trim()) return { kind: 'selection_required' } as const;
  return loadScalarMetric(query, signal);
}

export async function loadLogSignal(query: LogExploreQuery, signal?: AbortSignal) {
  const pageIndex = query.pageIndex ?? 0;
  return parseLogPage(
    await apiMessageGet(buildSignalApiPath(query), { ...requestSignal(signal), preserveErrorEnvelope: true }),
    pageIndex,
    20
  );
}

export async function loadLogHistoryEvidence(query: LogExploreQuery, signal?: AbortSignal) {
  const observedAt = Date.now();
  const page = parseLogPage(
    await apiMessageGet(buildSignalApiPath(query, observedAt), {
      ...requestSignal(signal),
      preserveErrorEnvelope: true
    }),
    query.pageIndex ?? 0,
    20
  );
  const statistics = await loadLogStatistics(query, signal, observedAt);
  return { page, ...statistics };
}

export async function loadLogStatistics(query: LogExploreQuery, signal?: AbortSignal, observedAt = Date.now()) {
  const requestWindow = resolveSignalWindow(query, observedAt);
  const [overview, trend] = await Promise.allSettled([
    apiMessageGet(buildLogStatsApiPath(query, 'overview', observedAt), {
      ...requestSignal(signal),
      preserveErrorEnvelope: true
    }).then(parseLogOverview),
    apiMessageGet(buildLogStatsApiPath(query, 'trend', observedAt), {
      ...requestSignal(signal),
      preserveErrorEnvelope: true
    })
      .then(parseLogTrend)
      .then(trend => requireTrendWindow(trend, requestWindow))
  ]);
  if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  return {
    overview: logStatisticEvidence(overview),
    trend: logStatisticEvidence(trend)
  };
}

export async function loadTraceSignal(query: TraceExploreQuery, signal?: AbortSignal) {
  const pageIndex = query.pageIndex ?? 0;
  return parseTracePage(
    await apiMessageGet(buildSignalApiPath(query), requestSignal(signal)),
    pageIndex,
    20,
    query.sort ?? 'newest'
  );
}

function requireTrendWindow<T extends { start: number; end: number }>(
  trend: T,
  requestWindow: { start: number; end: number }
) {
  if (trend.start !== requestWindow.start || trend.end !== requestWindow.end) {
    throw new ExploreSignalContractError('Log trend does not match request window');
  }
  return trend;
}

export async function loadMetricInventory(query: MetricExploreQuery, search: string, signal?: AbortSignal) {
  requireQueryableScope(query);
  const params = sharedSignalParams(query, Date.now());
  params.set('limit', String(METRIC_INVENTORY_LIMIT));
  setValue(params, 'search', search.trim());
  return parseMetricInventory(
    await apiMessageGet(`/api/ingestion/otlp/metrics/inventory?${params.toString()}`, requestSignal(signal))
  );
}

function requestSignal(signal?: AbortSignal) {
  return { signal: signal ?? null };
}

async function loadScalarMetric(query: MetricExploreQuery, signal?: AbortSignal) {
  return parseMetricConsole(
    await apiMessageGet(buildSignalApiPath(query), { ...requestSignal(signal), preserveErrorEnvelope: true })
  );
}
