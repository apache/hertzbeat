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

export type TraceRow = {
  traceId?: string;
  rootSpanId?: string;
  serviceName?: string;
  serviceNamespace?: string;
  rootSpanName?: string;
  durationNanos?: number;
  status?: string;
  startTime?: number;
  errorSpanCount?: number;
  resourceAttributes?: Record<string, string>;
};

type TraceEvent = {
  timeUnixNano?: number;
  name?: string;
  attributes?: Record<string, unknown>;
};

export type TraceSpan = {
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  spanName?: string;
  serviceName?: string;
  status?: string;
  statusMessage?: string;
  spanKind?: string;
  scopeName?: string;
  scopeVersion?: string;
  durationNanos?: number;
  startTime?: number;
  highlighted?: boolean;
  resourceAttributes?: Record<string, string>;
  spanAttributes?: Record<string, string>;
  events?: TraceEvent[];
};

export type TraceDetail = TraceRow & { spans?: TraceSpan[] };

export type TraceSpanLayout = TraceSpan & { depth: number; offsetPercent: number; widthPercent: number };

export type LogRow = {
  timeUnixNano?: number;
  observedTimeUnixNano?: number;
  severityNumber?: number;
  severityText?: string;
  body?: unknown;
  attributes?: Record<string, unknown>;
  traceId?: string;
  spanId?: string;
  resource?: Record<string, unknown>;
};

type MetricField = { name?: string; type?: string; unit?: string };
type MetricFrame = {
  schema?: {
    fields?: MetricField[];
    labels?: Record<string, string>;
  };
  data?: unknown[][];
};

export type MetricConsole = {
  query?: string;
  datasource?: string;
  queryMode?: string;
  results?: {
    status?: number;
    msg?: string;
    frames?: MetricFrame[];
  };
  stats?: {
    totalSeries?: number;
    nonEmptySeries?: number;
    latestObservedAt?: number;
  };
  emptyStateReason?: string;
  errorMessage?: string;
};

export type MetricSeries = {
  key: string;
  name: string;
  unit?: string | undefined;
  labels: Record<string, string>;
  points: unknown[][];
};

export type MetricPoint = { timestamp: number; value: number };

export function metricSeries(console: MetricConsole): MetricSeries[] {
  return (console.results?.frames ?? []).map((frame, index) => {
    const labels = frame.schema?.labels ?? {};
    const valueField = frame.schema?.fields?.find(field => field.type === 'number');
    const name = labels.__name__ ?? valueField?.name ?? `series-${index + 1}`;
    return {
      key: `${name}-${index}`,
      name,
      unit: valueField?.unit,
      labels,
      points: frame.data ?? []
    };
  });
}

export function metricPoints(series: MetricSeries): MetricPoint[] {
  return series.points.flatMap(point => {
    const timestamp = Number(point[0]);
    const value = Number(point[1]);
    return Number.isFinite(timestamp) && Number.isFinite(value) ? [{ timestamp, value }] : [];
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
  return points.map((point, index) => {
    const x = ((point.timestamp - minTimestamp) / timestampRange) * width;
    const y = height - ((point.value - minValue) / valueRange) * height;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

export function traceDurationMs(row: TraceRow) {
  return row.durationNanos == null ? undefined : row.durationNanos / 1_000_000;
}

export function traceSpanLayout(detail: TraceDetail): TraceSpanLayout[] {
  const spans = [...(detail.spans ?? [])].sort((left, right) => (left.startTime ?? 0) - (right.startTime ?? 0));
  const rootStart = detail.startTime ?? spans[0]?.startTime ?? 0;
  const totalMs = Math.max(traceDurationMs(detail) ?? 0, 0.001);
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
    offsetPercent: clamp((((span.startTime ?? rootStart) - rootStart) / totalMs) * 100, 0, 100),
    widthPercent: clamp((((span.durationNanos ?? 0) / 1_000_000) / totalMs) * 100, 0.4, 100)
  }));
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
