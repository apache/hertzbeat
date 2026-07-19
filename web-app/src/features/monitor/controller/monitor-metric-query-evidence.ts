/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { classifyMonitorMetricReadError } from '../api/monitor-api';
import type { MonitorDetailMetric } from '../model/monitor-contract';
import {
  monitorMetricOptions,
  type MonitorMetricCatalogEvidence,
  type MonitorMetricFavoriteEvidence,
  type MonitorMetricRowsEvidence
} from '../model/monitor-detail-model';

type QueryEvidence<T> = {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  data: T | undefined;
};

export function catalogEvidence(
  query: QueryEvidence<{ metrics: MonitorDetailMetric[] }>,
  embedded: MonitorDetailMetric[]
): MonitorMetricCatalogEvidence {
  if (query.isPending) return { kind: 'loading', options: [] };
  if (query.isError) {
    const references = embedded.map(item => item.name);
    return references.length > 0
      ? { kind: 'fallback', options: [], references }
      : { kind: classifyMonitorMetricReadError(query.error), options: [] };
  }
  if (!query.data) return { kind: 'error', options: [] };
  const options = monitorMetricOptions(query.data.metrics);
  return options.length > 0 ? { kind: 'ready', options } : { kind: 'empty', options: [] };
}

export function favoriteEvidence(query: QueryEvidence<string[]>, metricKey: string): MonitorMetricFavoriteEvidence {
  if (query.isPending) return { kind: 'loading' };
  if (query.isError) return { kind: classifyMonitorMetricReadError(query.error) };
  if (!query.data) return { kind: 'error' };
  return { kind: 'ready', value: Boolean(metricKey && query.data.includes(metricKey)) };
}

export function metricEvidence<T, Row>(
  query: QueryEvidence<T>,
  rows: (data: T) => Row[]
): MonitorMetricRowsEvidence<Row> {
  if (query.isPending) return { kind: 'loading', rows: [] };
  if (query.isError) return { kind: classifyMonitorMetricReadError(query.error), rows: [] };
  if (query.data === undefined) return { kind: 'error', rows: [] };
  const result = rows(query.data);
  return result.length > 0 ? { kind: 'ready', rows: result } : { kind: 'empty', rows: [] };
}
