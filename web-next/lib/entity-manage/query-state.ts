import {
  buildCompatRedirectTarget,
  createCompatSearchParamReader,
  type SearchParamsRecord
} from '../compat/search-params';
import { stripReturnLabelFromHref } from '../signal-route-context';

export type { SearchParamsRecord } from '../compat/search-params';

export const ENTITY_LIST_ROUTE = '/entities';
export const ENTITY_LIST_PAGE_SIZE_OPTIONS = [8, 20, 50] as const;

export type EntityListSearchParams = SearchParamsRecord;

export type EntityQueryState = {
  search: string;
  type: string;
  status: string;
  pageIndex?: string;
  source?: string;
  returnTo?: string;
  pageSize?: string;
  timeRange?: string;
  start?: string;
  end?: string;
  refresh?: string;
  live?: string;
  tz?: string;
  probe?: string;
  monitorId?: string;
  monitorName?: string;
  monitorApp?: string;
  monitorInstance?: string;
  deleteResult?: string;
  deletedEntity?: string;
};

export type SearchParamReader = {
  get: (key: string) => string | null;
};

export function queryStateFromParams(params: SearchParamReader): EntityQueryState {
  return {
    search: params.get('search') || '',
    type: params.get('type') || '',
    status: params.get('status') || '',
    pageIndex: params.get('pageIndex') || '',
    source: params.get('source') || '',
    returnTo: stripReturnLabelFromHref(params.get('returnTo')) || '',
    pageSize: params.get('pageSize') || '',
    timeRange: params.get('timeRange') || '',
    start: params.get('start') || '',
    end: params.get('end') || '',
    refresh: params.get('refresh') || '',
    live: params.get('live') || '',
    tz: params.get('tz') || '',
    probe: params.get('probe') || '',
    monitorId: params.get('monitorId') || '',
    monitorName: params.get('monitorName') || '',
    monitorApp: params.get('monitorApp') || '',
    monitorInstance: params.get('monitorInstance') || '',
    deleteResult: params.get('deleteResult') || '',
    deletedEntity: params.get('deletedEntity') || ''
  };
}

export function readEntityListQueryState(searchParams: EntityListSearchParams = {}): EntityQueryState {
  return queryStateFromParams(createCompatSearchParamReader(searchParams));
}

export function buildEntityUrl(query: EntityQueryState): string {
  const params = new URLSearchParams({
    pageIndex: normalizeEntityListPageIndex(query.pageIndex),
    pageSize: normalizeEntityListPageSize(query.pageSize),
    sort: 'gmtUpdate',
    order: 'desc'
  });
  if (query.search.trim()) params.set('search', query.search.trim());
  if (query.type.trim()) params.set('type', query.type.trim());
  if (query.status.trim()) params.set('status', query.status.trim());
  return `${ENTITY_LIST_ROUTE}?${params.toString()}`;
}

export function buildEntityListCompatRouteUrl(searchParams?: SearchParamsRecord): string {
  return buildCompatRedirectTarget(ENTITY_LIST_ROUTE, searchParams);
}

export function buildEntityListRouteUrl(query: EntityQueryState): string {
  const queryString = queryStateToQueryString(query);
  return queryString ? `${ENTITY_LIST_ROUTE}?${queryString}` : ENTITY_LIST_ROUTE;
}

export function queryStateToQueryString(query: EntityQueryState): string {
  const params = new URLSearchParams();
  if (query.search.trim()) params.set('search', query.search.trim());
  if (query.type.trim()) params.set('type', query.type.trim());
  if (query.status.trim()) params.set('status', query.status.trim());
  if (query.pageIndex?.trim()) params.set('pageIndex', normalizeEntityListPageIndex(query.pageIndex));
  if (query.source?.trim()) params.set('source', query.source.trim());
  if (query.returnTo?.trim()) params.set('returnTo', stripReturnLabelFromHref(query.returnTo.trim()) || query.returnTo.trim());
  if (query.pageSize?.trim()) params.set('pageSize', normalizeEntityListPageSize(query.pageSize));
  if (query.timeRange?.trim()) params.set('timeRange', query.timeRange.trim());
  if (query.start?.trim()) params.set('start', query.start.trim());
  if (query.end?.trim()) params.set('end', query.end.trim());
  if (query.refresh?.trim()) params.set('refresh', query.refresh.trim());
  if (query.live?.trim()) params.set('live', query.live.trim());
  if (query.tz?.trim()) params.set('tz', query.tz.trim());
  if (query.probe?.trim()) params.set('probe', query.probe.trim());
  if (query.monitorId?.trim()) params.set('monitorId', query.monitorId.trim());
  if (query.monitorName?.trim()) params.set('monitorName', query.monitorName.trim());
  if (query.monitorApp?.trim()) params.set('monitorApp', query.monitorApp.trim());
  if (query.monitorInstance?.trim()) params.set('monitorInstance', query.monitorInstance.trim());
  if (query.deleteResult?.trim()) params.set('deleteResult', query.deleteResult.trim());
  if (query.deletedEntity?.trim()) params.set('deletedEntity', query.deletedEntity.trim());
  return params.toString();
}

export function normalizeEntityListPageIndex(value?: string | number | null) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return String(Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
}

export function normalizeEntityListPageSize(value?: string | number | null) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return ENTITY_LIST_PAGE_SIZE_OPTIONS.includes(parsed as typeof ENTITY_LIST_PAGE_SIZE_OPTIONS[number]) ? String(parsed) : '8';
}

export function isSupportedEntityListPageSize(value?: string | number | null) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return ENTITY_LIST_PAGE_SIZE_OPTIONS.includes(parsed as typeof ENTITY_LIST_PAGE_SIZE_OPTIONS[number]);
}
