/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { OptionalRemoteValueState } from '@/shared/remote-state';

const bulletinPageSizes = [8, 15, 25] as const;

export type BulletinQuery = { search: string; pageIndex: number; pageSize: number };
export type BulletinFields = Record<string, string[]>;
export type BulletinDraft = { id?: number; name: string; app: string; monitorIds: number[]; fields: BulletinFields };
export type Bulletin = BulletinDraft & {
  id: number; creator: string | null; modifier: string | null; gmtCreate: string | null; gmtUpdate: string | null;
};
export type BulletinMonitor = { id: number; name: string; app: string; labels: Record<string, string> };
export type BulletinMetricDefinition = { name: string; fields: string[] };
export type BulletinMetricField = { key: string; unit: string; value: string | null; status: 'value' | 'no-data' };
type BulletinMetric = { name: string; fields: BulletinMetricField[][] };
type BulletinMetricsRow = { monitorName: string; monitorId: number; host: string; metrics: BulletinMetric[] };
export type BulletinMetrics = { name: string; content: BulletinMetricsRow[] };
export type BulletinMetricsState = OptionalRemoteValueState<
  BulletinMetrics,
  'missing' | 'invalid' | 'unavailable' | 'error'
>;

export function readBulletinQuery(params: URLSearchParams): BulletinQuery {
  const pageIndex = Number.parseInt(params.get('pageIndex') ?? '', 10);
  const pageSize = Number.parseInt(params.get('pageSize') ?? '', 10);
  return {
    search: params.get('search')?.trim() ?? '',
    pageIndex: Number.isFinite(pageIndex) && pageIndex >= 0 ? pageIndex : 0,
    pageSize: bulletinPageSizes.includes(pageSize as typeof bulletinPageSizes[number]) ? pageSize : 8
  };
}

export function writeBulletinQuery(query: BulletinQuery) {
  const params = new URLSearchParams({ pageIndex: String(query.pageIndex), pageSize: String(query.pageSize) });
  if (query.search) params.set('search', query.search);
  return params;
}

export function buildBulletinListPath(query: BulletinQuery) {
  return `/api/bulletin?${writeBulletinQuery(query).toString()}`;
}

export function createBulletinDraft(): BulletinDraft {
  return { name: '', app: '', monitorIds: [], fields: {} };
}

export function formatBulletinTime(value: string | null | undefined, locale?: string) {
  if (!value) return '—';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '—';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'medium' }).format(timestamp);
}

export function buildBulletinPayload(draft: BulletinDraft): BulletinDraft {
  const fields: BulletinFields = {};
  for (const [rawMetric, names] of Object.entries(draft.fields).sort(([a], [b]) => a.localeCompare(b))) {
    const metric = rawMetric.trim();
    const normalizedNames = [...new Set(names.map(name => name.trim()).filter(Boolean))].sort();
    if (metric && normalizedNames.length) fields[metric] = normalizedNames;
  }
  return {
    ...(draft.id == null ? {} : { id: draft.id }), name: draft.name.trim(), app: draft.app.trim(),
    monitorIds: [...new Set(draft.monitorIds)].sort((a, b) => a - b), fields
  };
}

export function bulletinMonitorMatchesSearch(monitor: BulletinMonitor, query: string) {
  const term = query.trim().toLocaleLowerCase();
  if (!term) return true;
  return [monitor.name, ...Object.entries(monitor.labels).flatMap(([key, value]) => [key, value])]
    .some(value => value.toLocaleLowerCase().includes(term));
}

export function validateBulletinDraft(draft: BulletinDraft, monitors: BulletinMonitor[], metrics: BulletinMetricDefinition[]) {
  const errors: string[] = [];
  if (!draft.name.trim()) errors.push('name');
  if (!draft.app.trim()) errors.push('app');
  const monitorMap = new Map(monitors.map(item => [item.id, item]));
  if (!draft.monitorIds.length || draft.monitorIds.some(id => monitorMap.get(id)?.app !== draft.app)) errors.push('monitorIds');
  const metricMap = new Map(metrics.map(metric => [metric.name, new Set(metric.fields)]));
  const selectedMetrics = Object.entries(draft.fields);
  if (!selectedMetrics.length || selectedMetrics.some(([metric, fields]) => {
    const availableFields = metricMap.get(metric);
    return !availableFields || !fields.length || fields.some(field => !availableFields.has(field));
  })) errors.push('fields');
  return errors;
}

export function sameBulletin(left: Bulletin, draft: BulletinDraft) {
  const payload = buildBulletinPayload(draft);
  return left.name === payload.name && left.app === payload.app
    && JSON.stringify([...left.monitorIds].sort((a, b) => a - b)) === JSON.stringify(payload.monitorIds)
    && JSON.stringify(buildBulletinPayload(left).fields) === JSON.stringify(payload.fields);
}
