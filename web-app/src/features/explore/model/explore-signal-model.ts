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

import type { LogRow, MetricConsole, TraceDetail, TraceRow, TraceSpan } from './explore-signal-contract';

export type LiveLogStatus = 'waiting' | 'connected' | 'degraded' | 'paused' | 'unavailable' | 'error' | 'contract';
export type TraceSpanTiming =
  | { kind: 'unavailable' }
  | { kind: 'instant'; offsetPercent: number }
  | { kind: 'duration'; offsetPercent: number; widthPercent: number };
export type TraceSpanLayout = TraceSpan & { depth: number; timing: TraceSpanTiming };
export type TraceDetailState =
  | { kind: 'closed' }
  | { kind: 'loading' | 'missing' | 'permission' | 'unavailable' | 'error'; traceId: string }
  | {
      kind: 'ready';
      traceId: string;
      detail: TraceDetail;
      spans: TraceSpanLayout[];
      selected: TraceSpanLayout | undefined;
    };

export type MetricSeries = {
  key: string;
  name: string;
  unit?: string | undefined;
  labels: Record<string, string>;
  points: unknown[][];
};

export type MetricPoint = { timestamp: number; value: number };

export type MetricResultState =
  | { kind: 'error'; message?: string }
  | { kind: 'storage_unavailable' }
  | { kind: 'missing_context' }
  | { kind: 'unsupported_query' }
  | { kind: 'empty' }
  | { kind: 'ready'; series: MetricSeries[] };

export function metricResultState(console: MetricConsole): MetricResultState {
  const unavailable = metricUnavailableState(console);
  if (unavailable) return unavailable;
  if (console.errorMessage != null) return metricErrorState(console.errorMessage);
  const results = console.results;
  if (!results || results.status == null) return { kind: 'storage_unavailable' };
  if (results.status !== 200) return metricErrorState(results.msg ?? undefined);
  if (!Array.isArray(results.frames)) return { kind: 'storage_unavailable' };
  if (results.frames.length === 0) return { kind: 'empty' };
  if (results.frames.some(frame => !hasMetricFrameData(frame))) return { kind: 'storage_unavailable' };
  const series = metricSeries(console);
  return series.some(item => metricPoints(item).length > 0) ? { kind: 'ready', series } : { kind: 'empty' };
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

export function metricPoints(series: MetricSeries): MetricPoint[] {
  return series.points.flatMap(point => {
    if (!Array.isArray(point)) return [];
    const timestamp = metricNumber(point[0]);
    const value = metricNumber(point[1]);
    return timestamp != null && value != null ? [{ timestamp, value }] : [];
  });
}

export function metricPath(points: MetricPoint[], width: number, height: number) {
  if (points.length === 0) return '';
  const timestamps = points.map(point => point.timestamp);
  const values = points.map(point => point.value);
  const minTimestamp = Math.min(...timestamps);
  const maxTimestamp = Math.max(...timestamps);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const timestampRange = maxTimestamp - minTimestamp || 1;
  const valueRange = maxValue - minValue || 1;
  return points
    .map((point, index) => {
      const x = ((point.timestamp - minTimestamp) / timestampRange) * width;
      const y = height - ((point.value - minValue) / valueRange) * height;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

export function traceDurationMs(row: Pick<TraceRow, 'durationNanos'>) {
  return row.durationNanos == null ? undefined : row.durationNanos / 1_000_000;
}

export function traceHealthState(row: Pick<TraceRow, 'status' | 'errorSpanCount'>): 'ok' | 'error' | 'unknown' {
  const status = row.status?.trim().toUpperCase();
  if (status === 'ERROR' || (row.errorSpanCount != null && row.errorSpanCount > 0)) return 'error';
  if (status === 'OK') return 'ok';
  return 'unknown';
}

export function traceSpanLayout(detail: TraceDetail): TraceSpanLayout[] {
  const spans = [...(detail.spans ?? [])].sort(compareTraceSpanStart);
  const timeline = traceTimeline(detail, spans);
  const byId = new Map(spans.map(span => [span.spanId, span]));
  const depthOf = (span: TraceSpan, visited = new Set<string>()): number => {
    if (!span.parentSpanId || visited.has(span.parentSpanId)) return 0;
    const parent = byId.get(span.parentSpanId);
    if (!parent) return 0;
    visited.add(span.parentSpanId);
    return Math.min(depthOf(parent, visited) + 1, 8);
  };
  return spans.map(span => ({
    ...span,
    depth: depthOf(span),
    timing: traceSpanTiming(span, timeline)
  }));
}

type TraceTimeline = { startTime: number; durationMs: number };

function traceTimeline(detail: TraceDetail, spans: TraceSpan[]): TraceTimeline | undefined {
  // Only complete timing pairs define the extent. Nullable fields must not
  // participate as synthetic epoch or zero-duration evidence.
  const timedSpans = spans.filter(hasCompleteSpanTiming);
  const startTime = detail.startTime ?? timedSpans[0]?.startTime;
  if (startTime == null) return undefined;

  const declaredEnd = startTime + (traceDurationMs(detail) ?? 0);
  const endTime = timedSpans.reduce(
    (latest, span) => Math.max(latest, span.startTime + span.durationNanos / 1_000_000),
    Math.max(startTime, declaredEnd)
  );
  return { startTime, durationMs: endTime - startTime };
}

function traceSpanTiming(span: TraceSpan, timeline: TraceTimeline | undefined): TraceSpanTiming {
  if (!timeline || !hasCompleteSpanTiming(span)) return { kind: 'unavailable' };
  const offsetPercent =
    timeline.durationMs > 0 ? clamp(((span.startTime - timeline.startTime) / timeline.durationMs) * 100, 0, 100) : 0;
  if (span.durationNanos === 0) return { kind: 'instant', offsetPercent };
  if (timeline.durationMs === 0) return { kind: 'unavailable' };
  return {
    kind: 'duration',
    offsetPercent,
    widthPercent: clamp((span.durationNanos / 1_000_000 / timeline.durationMs) * 100, 0.4, 100)
  };
}

function hasCompleteSpanTiming(span: TraceSpan): span is TraceSpan & { startTime: number; durationNanos: number } {
  return span.startTime != null && span.durationNanos != null;
}

function compareTraceSpanStart(left: TraceSpan, right: TraceSpan) {
  if (left.startTime == null) return right.startTime == null ? 0 : 1;
  if (right.startTime == null) return -1;
  return left.startTime - right.startTime;
}

export function logServiceName(row: LogRow) {
  const value = row.resource?.['service.name'] ?? row.resource?.service_name;
  return typeof value === 'string' ? value : undefined;
}

export function logBody(row: LogRow) {
  if (typeof row.body === 'string') return row.body;
  if (row.body == null) return undefined;
  try {
    return JSON.stringify(row.body);
  } catch {
    return undefined;
  }
}

export function logTimestampMs(row: LogRow) {
  const timestamp = row.timeUnixNano ?? row.observedTimeUnixNano;
  return timestamp == null ? undefined : Math.floor(timestamp / 1_000_000);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function metricErrorState(message?: string): MetricResultState {
  const normalized = message?.trim();
  return normalized ? { kind: 'error', message: normalized } : { kind: 'error' };
}

function metricNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function hasMetricFrameData(frame: unknown) {
  return typeof frame === 'object' && frame !== null && Array.isArray((frame as { data?: unknown }).data);
}
