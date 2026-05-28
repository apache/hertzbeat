import { buildCompatRedirectTarget, type SearchParamsRecord } from '../compat/search-params';
import { stripReturnLabelFromHref } from '../signal-route-context';

export type { SearchParamsRecord } from '../compat/search-params';

export const MONITOR_LIST_ROUTE = '/monitors';

export type MonitorNavigationContext = {
  app?: string | null;
  labels?: string | null;
  pageIndex?: string | null;
  pageSize?: string | null;
  entityId?: string | null;
  entityName?: string | null;
  timeRange?: string | null;
  start?: string | null;
  end?: string | null;
  refresh?: string | null;
  live?: string | null;
  tz?: string | null;
  returnTo?: string | null;
};

function isSafeInternalHref(value?: string | null) {
  const normalized = stripReturnLabelFromHref(value);
  return Boolean(normalized && normalized.startsWith('/') && !normalized.startsWith('//'));
}

function appendMonitorContext(basePath: string, context?: MonitorNavigationContext) {
  if (!context) return basePath;
  const params = new URLSearchParams();
  if (context.app?.trim()) params.set('app', context.app.trim());
  if (context.labels?.trim()) params.set('labels', context.labels.trim());
  if (context.pageIndex?.trim()) params.set('pageIndex', context.pageIndex.trim());
  if (context.pageSize?.trim()) params.set('pageSize', context.pageSize.trim());
  if (context.entityId?.trim()) params.set('entityId', context.entityId.trim());
  if (context.entityName?.trim()) params.set('entityName', context.entityName.trim());
  if (context.timeRange?.trim()) params.set('timeRange', context.timeRange.trim());
  if (context.start?.trim()) params.set('start', context.start.trim());
  if (context.end?.trim()) params.set('end', context.end.trim());
  if (context.refresh?.trim()) params.set('refresh', context.refresh.trim());
  if (context.live?.trim()) params.set('live', context.live.trim());
  if (context.tz?.trim()) params.set('tz', context.tz.trim());
  const returnTo = stripReturnLabelFromHref(context.returnTo);
  if (returnTo) params.set('returnTo', returnTo);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function buildMonitorDetailHref(monitorId: number | string, context?: MonitorNavigationContext) {
  return appendMonitorContext(`/monitors/${monitorId}`, context);
}

export function buildMonitorEditHref(monitorId: number | string, context?: MonitorNavigationContext) {
  return appendMonitorContext(`/monitors/${monitorId}/edit`, context);
}

export function buildMonitorNewHref(context?: MonitorNavigationContext) {
  return appendMonitorContext('/monitors/new', context);
}

export function buildMonitorListCompatRouteUrl(searchParams?: SearchParamsRecord) {
  return buildCompatRedirectTarget(MONITOR_LIST_ROUTE, searchParams);
}

export function buildMonitorListReturnHref(context?: MonitorNavigationContext) {
  if (isSafeInternalHref(context?.returnTo)) {
    return stripReturnLabelFromHref(context?.returnTo)!;
  }

  return appendMonitorContext(MONITOR_LIST_ROUTE, {
    app: context?.app,
    labels: context?.labels,
    pageIndex: context?.pageIndex,
    pageSize: context?.pageSize,
    entityId: context?.entityId,
    entityName: context?.entityName,
    timeRange: context?.timeRange,
    start: context?.start,
    end: context?.end,
    refresh: context?.refresh,
    live: context?.live,
    tz: context?.tz
  });
}

export function buildMonitorEntityReturnHref(context?: Pick<MonitorNavigationContext, 'returnTo' | 'entityId'>) {
  if (isSafeInternalHref(context?.returnTo)) {
    return stripReturnLabelFromHref(context?.returnTo)!;
  }

  if (context?.entityId?.trim()) {
    return `/entities/${context.entityId.trim()}`;
  }

  return '/entities';
}

export function resolveMonitorCheckboxSelection(
  checkedIds: number[],
  selectedId: number | null,
  monitorId: number,
  checked: boolean
) {
  const nextCheckedIds = checked ? Array.from(new Set([...checkedIds, monitorId])) : checkedIds.filter(id => id !== monitorId);

  return {
    checkedIds: nextCheckedIds,
    selectedId: monitorId
  };
}
