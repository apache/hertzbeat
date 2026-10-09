/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { metricPoints, type MetricSeries, type MetricView } from '@/platform/perses';
import { metricSampleTotal } from './metric-sample-total';
export type MetricNumberCalculation = NonNullable<MetricView['numberCalculation']>;
export type MetricNumberSummary = {
  count: number;
  unit?: string | undefined;
  timestamp?: number | undefined;
} & ({ kind: 'ready'; value: number } | { kind: 'empty' | 'unavailable'; value?: undefined });
export function reduceMetricNumber(series: MetricSeries, calculation: MetricNumberCalculation): MetricNumberSummary {
  const points = metricPoints(series);
  const first = points[0];
  if (!first) return { kind: 'empty', count: 0 };
  if (calculation === 'count') return { kind: 'ready', value: points.length, count: points.length };
  let latest = first,
    min = first.value,
    max = first.value;
  for (const point of points) {
    if (point.timestamp > latest.timestamp) latest = point;
    min = Math.min(min, point.value);
    max = Math.max(max, point.value);
  }
  const values = points.map(point => point.value);
  const value =
    calculation === 'latest'
      ? latest.value
      : calculation === 'min'
        ? min
        : calculation === 'max'
          ? max
          : metricSampleTotal(values, calculation === 'avg');
  const scope = {
    count: points.length,
    unit: series.unit,
    ...(calculation === 'latest' ? { timestamp: latest.timestamp } : {})
  };
  return Number.isFinite(value) ? { ...scope, kind: 'ready', value } : { ...scope, kind: 'unavailable' };
}
