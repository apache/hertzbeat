import { stripReturnLabelFromHref } from '../signal-route-context';

export type MonitorQueryState = {
  search: string;
  app: string;
  labels: string;
  status: string;
  pageIndex: string;
  pageSize: string;
  entityId: string;
  entityName: string;
  returnTo: string;
};

export type SearchParamReader = {
  get(name: string): string | null;
};

export function hasMonitorEntityContext(query: Pick<MonitorQueryState, 'entityId' | 'entityName' | 'returnTo'>) {
  return Boolean(query.entityId.trim() || query.entityName.trim() || query.returnTo.trim());
}

export function queryStateFromParams(searchParams: SearchParamReader): MonitorQueryState {
  return {
    search: searchParams.get('search') || '',
    app: searchParams.get('app') || '',
    labels: searchParams.get('labels') || '',
    status: searchParams.get('status') || '',
    pageIndex: searchParams.get('pageIndex') || '',
    pageSize: searchParams.get('pageSize') || '',
    entityId: searchParams.get('entityId') || '',
    entityName: searchParams.get('entityName') || '',
    returnTo: stripReturnLabelFromHref(searchParams.get('returnTo')) || ''
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

function normalizePageSize(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : '8';
}

export function buildMonitorUrl(query: MonitorQueryState): string {
  const params = new URLSearchParams({
    pageIndex: normalizePageIndex(query.pageIndex),
    pageSize: normalizePageSize(query.pageSize)
  });
  if (query.search.trim()) params.set('search', query.search.trim());
  if (query.app.trim()) params.set('app', query.app.trim());
  if (query.labels.trim()) params.set('labels', query.labels.trim());
  if (query.status.trim()) params.set('status', query.status.trim());
  if (query.entityId.trim()) params.set('entityId', query.entityId.trim());
  if (query.entityName.trim()) params.set('entityName', query.entityName.trim());
  const returnTo = stripReturnLabelFromHref(query.returnTo);
  if (returnTo) params.set('returnTo', returnTo);
  return `/monitors?${params.toString()}`;
}

export function buildMonitorRouteUrl(query: MonitorQueryState): string {
  const params = new URLSearchParams();
  if (query.search.trim()) params.set('search', query.search.trim());
  if (query.app.trim()) params.set('app', query.app.trim());
  if (query.labels.trim()) params.set('labels', query.labels.trim());
  if (query.status.trim()) params.set('status', query.status.trim());
  if (query.pageIndex.trim()) params.set('pageIndex', normalizePageIndex(query.pageIndex));
  if (query.pageSize.trim()) params.set('pageSize', normalizePageSize(query.pageSize));
  if (query.entityId.trim()) params.set('entityId', query.entityId.trim());
  if (query.entityName.trim()) params.set('entityName', query.entityName.trim());
  const returnTo = stripReturnLabelFromHref(query.returnTo);
  if (returnTo) params.set('returnTo', returnTo);
  const queryString = params.toString();
  return queryString ? `/monitors?${queryString}` : '/monitors';
}
