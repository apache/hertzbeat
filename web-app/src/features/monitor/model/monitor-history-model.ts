/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type {
  MonitorDetailMetric,
  MonitorHistoryMetric,
  MonitorMetricOption,
  MonitorMetricValue
} from './monitor-contract';

export type MonitorHistorySeries = { name: string; points: Array<[number, number]> };

/** History has a stricter contract than realtime: only visible, non-label numeric fields are queryable. */
export function monitorHistoryMetrics(metrics: MonitorDetailMetric[]): MonitorMetricOption[] {
  return metrics.flatMap(metric => {
    if (metric.visible === false) return [];
    return (metric.fields ?? []).flatMap(field => {
      if (field.type !== 0 || field.label === true || !field.field) return [];
      return [
        {
          key: `${metric.name}.${field.field}`,
          group: metric.name,
          field: field.field,
          ...(field.unit ? { unit: field.unit } : {})
        }
      ];
    });
  });
}

/** Mirrors the established interval chart semantics while dropping malformed points instead of drawing fake zeroes. */
export function monitorHistorySeries(history: MonitorHistoryMetric, interval: boolean): MonitorHistorySeries[] {
  const entries = Object.entries(history.values);
  if (interval && entries.length === 1) return aggregateSeries(entries[0]![1]);
  return entries
    .map(([name, values]) => ({ name, points: values.flatMap(value => metricPoint(value.time, value.origin)) }))
    .filter(series => series.points.length > 0);
}

function aggregateSeries(values: MonitorMetricValue[]) {
  return [
    { name: 'Max', field: 'max' },
    { name: 'Min', field: 'min' },
    { name: 'Mean', field: 'mean' }
  ]
    .map(series => ({
      name: series.name,
      points: values.flatMap(value => metricPoint(value.time, value[series.field as 'max' | 'min' | 'mean']))
    }))
    .filter(series => series.points.length > 0);
}

function metricPoint(time: number | null, value: string | null): Array<[number, number]> {
  if (time === null || value === null || value.trim() === '') return [];
  const number = Number(value);
  return Number.isFinite(number) ? [[time, number]] : [];
}
