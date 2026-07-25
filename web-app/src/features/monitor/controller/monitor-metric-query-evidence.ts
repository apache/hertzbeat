/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { classifyMonitorMetricReadError } from '../api/monitor-api';
import type { MonitorDetailMetric, MonitorMetricOption } from '../model/monitor-contract';
import {
  monitorMetricOptions,
  type MonitorMetricCatalogEvidence,
  type MonitorMetricFavoriteCollectionEvidence,
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

export function favoriteEvidence(
  query: QueryEvidence<string[]>,
  metric: MonitorMetricOption | undefined
): MonitorMetricFavoriteEvidence {
  if (query.isPending) return { kind: 'loading' };
  if (query.isError) return { kind: classifyMonitorMetricReadError(query.error) };
  if (!query.data) return { kind: 'error' };
  if (!metric) return { kind: 'ready', value: false };
  const token = [metric.key, metric.group, metric.field].find(candidate => query.data?.includes(candidate));
  return token ? { kind: 'ready', value: true, token } : { kind: 'ready', value: false };
}

export function favoriteCollectionEvidence(
  query: QueryEvidence<string[]>,
  options: MonitorMetricOption[]
): MonitorMetricFavoriteCollectionEvidence {
  if (query.isPending) return { kind: 'loading' };
  if (query.isError) return { kind: classifyMonitorMetricReadError(query.error) };
  if (!query.data) return { kind: 'error' };
  const items = resolveFavoriteItems(query.data, options);
  return items.length > 0 ? { kind: 'ready', items } : { kind: 'empty', items: [] };
}

function resolveFavoriteItems(tokens: string[], options: MonitorMetricOption[]) {
  // Older monitor definitions persisted a group, a field, or a full metric key.
  // Resolve every supported form while retaining orphaned tokens as honest evidence.
  const items: Array<{ key: string; available: boolean }> = [];
  const emitted = new Set<string>();
  for (const token of new Set(tokens)) {
    const matches = options.filter(option => option.key === token || option.group === token || option.field === token);
    if (matches.length === 0) {
      items.push({ key: token, available: false });
      continue;
    }
    for (const option of matches) {
      if (emitted.has(option.key)) continue;
      emitted.add(option.key);
      items.push({ key: option.key, available: true });
    }
  }
  return items;
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
