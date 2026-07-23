/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { entityPageSizes, entitySortFields, entitySortOrders, type EntityQuery } from './entity-contract';
import { entityRoutePaths } from '@/shared/navigation/app-paths';

const filterKeys = [
  'search',
  'type',
  'status',
  'owner',
  'source',
  'environment',
  'lifecycle',
  'tier',
  'system'
] as const;

export function readEntityQuery(params: URLSearchParams): EntityQuery {
  const filters = Object.fromEntries(filterKeys.map(key => [key, params.get(key)?.trim() ?? ''])) as Record<
    (typeof filterKeys)[number],
    string
  >;
  return {
    ...filters,
    sort: member(entitySortFields, params.get('sort')) ?? 'gmtUpdate',
    order: member(entitySortOrders, params.get('order')) ?? 'desc',
    pageIndex: pageIndex(params.get('pageIndex')),
    pageSize: pageSize(params.get('pageSize'))
  };
}

export function writeEntityQuery(query: EntityQuery, patch: Partial<EntityQuery> = {}) {
  const changedFilter = filterKeys.some(key => patch[key] !== undefined && patch[key] !== query[key]);
  const next = { ...query, ...patch, pageIndex: changedFilter ? 0 : (patch.pageIndex ?? query.pageIndex) };
  const params = new URLSearchParams({
    sort: next.sort,
    order: next.order,
    pageIndex: String(next.pageIndex),
    pageSize: String(next.pageSize)
  });
  filterKeys.forEach(key => {
    if (next[key]) params.set(key, next[key]);
  });
  return params;
}

export function safeEntityListPath(value?: string | null) {
  if (!value?.startsWith('/')) return entityRoutePaths.list;
  const url = new URL(value, 'https://hertzbeat.local');
  if (url.pathname !== entityRoutePaths.list) return entityRoutePaths.list;
  if (!url.search) return entityRoutePaths.list;
  return `${entityRoutePaths.list}?${writeEntityQuery(readEntityQuery(url.searchParams)).toString()}`;
}

function pageIndex(value: string | null) {
  if (!value || !/^(?:0|[1-9]\d*)$/.test(value)) return 0;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : 0;
}

function pageSize(value: string | null): (typeof entityPageSizes)[number] {
  const parsed = Number(value);
  return entityPageSizes.includes(parsed as (typeof entityPageSizes)[number])
    ? (parsed as (typeof entityPageSizes)[number])
    : 10;
}

function member<const Values extends readonly string[]>(values: Values, value: string | null) {
  return values.includes(value as Values[number]) ? (value as Values[number]) : undefined;
}
