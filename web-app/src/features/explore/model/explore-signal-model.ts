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

import { compositionSeries } from '@/platform/perses';
import { logSummary } from '@/shared/log-summary';
import type { LiveLogRow, LogRow, MetricConsole } from './explore-signal-contract';

export type LiveLogStatus =
  | 'waiting'
  | 'connected'
  | 'degraded'
  | 'paused'
  | 'unavailable'
  | 'error'
  | 'contract'
  | 'invalid_filter'
  | 'permission';
export type { MetricSeries, MetricResultState } from '@/platform/perses';
import { metricNumber } from '@/platform/perses';
import type { MetricSeries, MetricResultState } from '@/platform/perses';

export function metricResultState(console: MetricConsole): MetricResultState {
  if (console.composition) return { kind: 'ready', series: compositionSeries(console.composition) };
  const unavailable = metricUnavailableState(console);
  if (unavailable) return unavailable;
  if (console.errorMessage != null) return metricErrorState(console.errorMessage);
  const results = console.results;
  if (results?.status == null) return { kind: 'storage_unavailable' };
  if (results.status !== 200) return metricErrorState(results.msg ?? undefined);
  if (!Array.isArray(results.frames)) return { kind: 'storage_unavailable' };
  if (results.frames.length === 0) return { kind: 'empty' };
  if (results.frames.some(frame => !hasMetricFrameData(frame))) return { kind: 'storage_unavailable' };
  return metricReadyState(metricSeries(console));
}

function metricReadyState(series: MetricSeries[]): MetricResultState {
  if (series.some(item => item.points.some(point => !validMetricPoint(point)))) return { kind: 'contract_error' };
  return series.some(item => item.points.length > 0) ? { kind: 'ready', series } : { kind: 'empty' };
}

function metricUnavailableState(console: MetricConsole): MetricResultState | undefined {
  if (console.emptyStateReason === 'no_context') return { kind: 'missing_context' };
  if (console.emptyStateReason === 'unsupported_query') return { kind: 'unsupported_query' };
  if (console.emptyStateReason === 'load_failed' && console.results == null) return { kind: 'storage_unavailable' };
  return undefined;
}

export function metricSeries(console: MetricConsole): MetricSeries[] {
  return (console.results?.frames ?? []).map((frame, index) => {
    const labels = frame.schema?.labels ?? {};
    const valueField = frame.schema?.fields?.find(field => field.type === 'number');
    const name = labels.__name__ ?? valueField?.name ?? `series-${index + 1}`;
    return {
      key: `${name}-${index}`,
      name,
      unit: valueField?.unit ?? undefined,
      labels,
      points: frame.data ?? []
    };
  });
}

export function logServiceName(row: LogRow | LiveLogRow) {
  const value = row.resource?.['service.name'] ?? row.resource?.service_name;
  return typeof value === 'string' ? value : undefined;
}

export function logBody(row: LogRow | LiveLogRow) {
  return logSummary(row.body);
}

export function logTimestampMs(row: LogRow | LiveLogRow) {
  const timestamp = row.timeUnixNano ?? row.observedTimeUnixNano;
  if (timestamp == null) return undefined;
  if (typeof timestamp === 'number') return Math.floor(timestamp / 1_000_000);
  if (!/^[1-9]\d{0,18}$/u.test(timestamp)) return undefined;
  const milliseconds = BigInt(timestamp) / 1_000_000n;
  return milliseconds <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(milliseconds) : undefined;
}

function metricErrorState(message?: string): MetricResultState {
  const normalized = message?.trim();
  return normalized ? { kind: 'error', message: normalized } : { kind: 'error' };
}

function validMetricPoint(point: unknown[]) {
  const timestamp = metricNumber(point[0]);
  return (
    point.length >= 2 &&
    timestamp != null &&
    Number.isSafeInteger(timestamp) &&
    timestamp > 0 &&
    metricNumber(point[1]) != null
  );
}

function hasMetricFrameData(frame: unknown) {
  return typeof frame === 'object' && frame !== null && Array.isArray((frame as { data?: unknown }).data);
}

export { metricPoints } from '@/platform/perses';
