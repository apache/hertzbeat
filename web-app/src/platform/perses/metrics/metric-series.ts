/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
export type MetricSeries = {
  refId?: string;
  allowsGaps?: boolean;
  key: string;
  name: string;
  unit?: string | undefined;
  labels: Record<string, string>;
  points: unknown[][];
};

export type MetricPoint = { timestamp: number; value: number };

export type MetricResultState =
  | { kind: 'selection_required' }
  | { kind: 'error'; message?: string }
  | { kind: 'contract_error' }
  | { kind: 'invalid_query' }
  | { kind: 'storage_unavailable' }
  | { kind: 'missing_context' }
  | { kind: 'unsupported_query' }
  | { kind: 'empty' }
  | { kind: 'ready'; series: MetricSeries[] };

export function metricPoints(series: MetricSeries): MetricPoint[] {
  return series.points.flatMap(point => {
    if (!Array.isArray(point)) return [];
    const timestamp = metricNumber(point[0]);
    const value = metricNumber(point[1]);
    return timestamp != null && value != null ? [{ timestamp, value }] : [];
  });
}

export function metricNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
