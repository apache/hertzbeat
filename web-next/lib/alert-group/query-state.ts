import { createCompatSearchParamReader, type SearchParamsRecord } from '../compat/search-params';
import { readSignalRouteContext, type SignalRouteContext } from '../signal-route-context';

export type AlertGroupSearchParams = SearchParamsRecord;

export type AlertGroupRouteState = {
  signal: string | null;
  signalContext: SignalRouteContext;
};

export type AlertGroupListQuery = {
  search?: string;
  pageIndex?: number;
  pageSize?: number;
};

export const ALERT_GROUP_PAGE_SIZE_OPTIONS = [8, 15, 25] as const;

function normalizeSignal(value: string | null | undefined) {
  return value === 'metrics' || value === 'logs' || value === 'traces' ? value : null;
}

function normalizePageIndex(value: number | null | undefined) {
  return Number.isFinite(value) && value != null && value >= 0 ? Math.floor(value) : 0;
}

function normalizePageSize(value: number | null | undefined) {
  if (ALERT_GROUP_PAGE_SIZE_OPTIONS.includes(value as (typeof ALERT_GROUP_PAGE_SIZE_OPTIONS)[number])) {
    return value as (typeof ALERT_GROUP_PAGE_SIZE_OPTIONS)[number];
  }
  return ALERT_GROUP_PAGE_SIZE_OPTIONS[0];
}

export function readAlertGroupRouteState(searchParams: AlertGroupSearchParams = {}): AlertGroupRouteState {
  const reader = createCompatSearchParamReader(searchParams);
  const signal = normalizeSignal(reader.get('signal'));

  return {
    signal,
    signalContext: signal ? readSignalRouteContext(reader) : {}
  };
}

export function buildAlertGroupUrl(query: string | AlertGroupListQuery): string {
  const normalizedQuery = typeof query === 'string' ? { search: query } : query;
  const params = new URLSearchParams({
    pageIndex: String(normalizePageIndex(normalizedQuery.pageIndex)),
    pageSize: String(normalizePageSize(normalizedQuery.pageSize)),
    sort: 'id',
    order: 'desc'
  });
  if (normalizedQuery.search?.trim()) params.set('search', normalizedQuery.search.trim());
  return `/alert/groups?${params.toString()}`;
}
