import { createCompatSearchParamReader, type SearchParamsRecord } from '../compat/search-params';
import { stripReturnLabelFromHref } from '../signal-route-context';

export type MonitorManageSearchParams = SearchParamsRecord;

export const MONITOR_LIST_PAGE_SIZE_OPTIONS = [8, 20, 50] as const;

export type MonitorQueryState = {
  search: string;
  app: string;
  labels: string;
  status: string;
  pageIndex: string;
  pageSize: string;
  entityId: string;
  entityName: string;
  source?: string;
  timeRange?: string;
  start?: string;
  end?: string;
  refresh?: string;
  live?: string;
  tz?: string;
  probe?: string;
  returnTo: string;
};

export type SearchParamReader = {
  get(name: string): string | null;
};

export type MonitorManageRouteState = {
  query: MonitorQueryState;
  explicitStatus: string;
  canonicalRoute: string;
  shouldRedirect: boolean;
};

function isEntityReturnTarget(returnTo: string) {
  const target = stripReturnLabelFromHref(returnTo)?.trim();
  return Boolean(target && (target === '/entities' || target.startsWith('/entities/')));
}

export function hasMonitorEntityContext(query: Pick<MonitorQueryState, 'entityId' | 'entityName' | 'returnTo'>) {
  return Boolean(query.entityId.trim() || query.entityName.trim() || isEntityReturnTarget(query.returnTo));
}

export function queryStateFromParams(searchParams: SearchParamReader): MonitorQueryState {
  return {
    search: searchParams.get('content') || searchParams.get('search') || '',
    app: searchParams.get('app') || '',
    labels: searchParams.get('labels') || '',
    status: searchParams.get('status') || '',
    pageIndex: searchParams.get('pageIndex') || '',
    pageSize: searchParams.get('pageSize') || '',
    entityId: searchParams.get('entityId') || '',
    entityName: searchParams.get('entityName') || '',
    source: searchParams.get('source') || '',
    timeRange: searchParams.get('timeRange') || '',
    start: searchParams.get('start') || '',
    end: searchParams.get('end') || '',
    refresh: searchParams.get('refresh') || '',
    live: searchParams.get('live') || '',
    tz: searchParams.get('tz') || '',
    probe: searchParams.get('probe') || '',
    returnTo: stripReturnLabelFromHref(searchParams.get('returnTo')) || ''
  };
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function hasDisplayLabelParam(searchParams: MonitorManageSearchParams = {}) {
  return Boolean(firstParam(searchParams.returnLabel) || firstParam(searchParams.returnTo)?.includes('returnLabel'));
}

function hasLegacyContentParam(searchParams: MonitorManageSearchParams = {}) {
  return Boolean(firstParam(searchParams.content));
}

function hasUnsupportedPageSizeParam(searchParams: MonitorManageSearchParams = {}) {
  const pageSize = firstParam(searchParams.pageSize);
  return Boolean(pageSize?.trim() && !isSupportedMonitorListPageSize(pageSize));
}

export function readMonitorManageRouteState(searchParams: MonitorManageSearchParams = {}): MonitorManageRouteState {
  const query = applyMonitorWorkspaceDefaults(queryStateFromParams(createCompatSearchParamReader(searchParams)));

  return {
    query,
    explicitStatus: firstParam(searchParams.status) ?? '',
    canonicalRoute: buildMonitorRouteUrl(query),
    shouldRedirect: hasDisplayLabelParam(searchParams) || hasLegacyContentParam(searchParams) || hasUnsupportedPageSizeParam(searchParams)
  };
}

export function applyMonitorWorkspaceDefaults(query: MonitorQueryState): MonitorQueryState {
  if (!query.status.trim() && hasMonitorEntityContext(query)) {
    return {
      ...query,
      status: '2'
    };
  }

  return query;
}

function normalizePageIndex(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? String(parsed) : '0';
}

export function normalizeMonitorListPageSize(value?: string | number | null) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return MONITOR_LIST_PAGE_SIZE_OPTIONS.includes(parsed as typeof MONITOR_LIST_PAGE_SIZE_OPTIONS[number]) ? String(parsed) : '8';
}

export function isSupportedMonitorListPageSize(value?: string | number | null) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return MONITOR_LIST_PAGE_SIZE_OPTIONS.includes(parsed as typeof MONITOR_LIST_PAGE_SIZE_OPTIONS[number]);
}

function appendMonitorQueryFilters(params: URLSearchParams, query: MonitorQueryState) {
  if (query.search.trim()) params.set('search', query.search.trim());
  if (query.app.trim()) params.set('app', query.app.trim());
  if (query.labels.trim()) params.set('labels', query.labels.trim());
  if (query.status.trim()) params.set('status', query.status.trim());
  if (query.entityId.trim()) params.set('entityId', query.entityId.trim());
  if (query.entityName.trim()) params.set('entityName', query.entityName.trim());
  if (query.timeRange?.trim()) params.set('timeRange', query.timeRange.trim());
  if (query.start?.trim()) params.set('start', query.start.trim());
  if (query.end?.trim()) params.set('end', query.end.trim());
  if (query.refresh?.trim()) params.set('refresh', query.refresh.trim());
  if (query.live?.trim()) params.set('live', query.live.trim());
  if (query.tz?.trim()) params.set('tz', query.tz.trim());
  if (query.probe?.trim()) params.set('probe', query.probe.trim());
  const returnTo = stripReturnLabelFromHref(query.returnTo);
  if (returnTo) params.set('returnTo', returnTo);
}

function normalizeMonitorSelectionPageSize(value?: string | number | null) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : '8';
}

export function buildMonitorUrl(query: MonitorQueryState): string {
  const params = new URLSearchParams({
    pageIndex: normalizePageIndex(query.pageIndex),
    pageSize: normalizeMonitorListPageSize(query.pageSize)
  });
  appendMonitorQueryFilters(params, query);
  return `/monitors?${params.toString()}`;
}

export function buildMonitorSelectionUrl(query: MonitorQueryState): string {
  const params = new URLSearchParams({
    pageIndex: normalizePageIndex(query.pageIndex),
    pageSize: normalizeMonitorSelectionPageSize(query.pageSize)
  });
  appendMonitorQueryFilters(params, query);
  return `/monitors?${params.toString()}`;
}

export function buildMonitorRouteUrl(query: MonitorQueryState): string {
  const params = new URLSearchParams();
  if (query.search.trim()) params.set('search', query.search.trim());
  if (query.app.trim()) params.set('app', query.app.trim());
  if (query.labels.trim()) params.set('labels', query.labels.trim());
  if (query.status.trim()) params.set('status', query.status.trim());
  if (query.pageIndex.trim()) params.set('pageIndex', normalizePageIndex(query.pageIndex));
  if (query.pageSize.trim()) params.set('pageSize', normalizeMonitorListPageSize(query.pageSize));
  if (query.entityId.trim()) params.set('entityId', query.entityId.trim());
  if (query.entityName.trim()) params.set('entityName', query.entityName.trim());
  if (query.source?.trim()) params.set('source', query.source.trim());
  if (query.timeRange?.trim()) params.set('timeRange', query.timeRange.trim());
  if (query.start?.trim()) params.set('start', query.start.trim());
  if (query.end?.trim()) params.set('end', query.end.trim());
  if (query.refresh?.trim()) params.set('refresh', query.refresh.trim());
  if (query.live?.trim()) params.set('live', query.live.trim());
  if (query.tz?.trim()) params.set('tz', query.tz.trim());
  if (query.probe?.trim()) params.set('probe', query.probe.trim());
  const returnTo = stripReturnLabelFromHref(query.returnTo);
  if (returnTo) params.set('returnTo', returnTo);
  const queryString = params.toString();
  return queryString ? `/monitors?${queryString}` : '/monitors';
}
