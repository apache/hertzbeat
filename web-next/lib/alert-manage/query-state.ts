import { createCompatSearchParamReader, type SearchParamsRecord } from '../compat/search-params';
import { copySignalRouteContextParams, stripReturnLabelFromHref } from '../signal-route-context';

export type { SearchParamsRecord };

export type AlertQueryState = {
  search: string;
  status: string;
  severity: string;
  pageIndex?: number;
  pageSize?: number;
  entityId: string;
  entityName: string;
  returnTo: string;
  serviceName?: string;
  serviceNamespace?: string;
  environment?: string;
  timeRange?: string;
  start?: string;
  end?: string;
  refresh?: string;
  live?: string;
  tz?: string;
  source?: string;
  signal?: string;
  monitorId?: string;
  monitorName?: string;
  monitorApp?: string;
  monitorInstance?: string;
  traceId?: string;
  spanId?: string;
  collector?: string;
  template?: string;
  viewMode?: string;
  sourceKind?: string;
  edgeId?: string;
};

export type AlertCenterSearchParams = SearchParamsRecord;

export type AlertCenterRouteState = {
  initialQuery: AlertQueryState;
  cleanUrl: string;
  shouldCleanUrl: boolean;
};

export const ALERT_CENTER_PAGE_SIZE_OPTIONS = [8, 15, 25] as const;

type SearchParamReader = {
  get(name: string): string | null;
};

export function normalizeAlertSearch(search: string): string {
  return search.trim();
}

export function normalizeAlertFilterValue(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeAlertPageIndex(value: number | string | null | undefined): number {
  const numericValue = typeof value === 'string' ? Number.parseInt(value, 10) : value;
  return Number.isFinite(numericValue) && numericValue != null && numericValue >= 0 ? Math.floor(numericValue) : 0;
}

export function normalizeAlertPageSize(value: number | string | null | undefined): number {
  const numericValue = typeof value === 'string' ? Number.parseInt(value, 10) : value;
  if (ALERT_CENTER_PAGE_SIZE_OPTIONS.includes(numericValue as (typeof ALERT_CENTER_PAGE_SIZE_OPTIONS)[number])) {
    return numericValue as (typeof ALERT_CENTER_PAGE_SIZE_OPTIONS)[number];
  }
  return ALERT_CENTER_PAGE_SIZE_OPTIONS[0];
}

function readAlertParam(searchParams: SearchParamReader, key: string): string {
  return (searchParams.get(key) || '').trim();
}

function readFirstSearchParamValue(searchParams: AlertCenterSearchParams | undefined, key: string): string {
  const value = searchParams?.[key];
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return value || '';
}

function hasAlertCompatRouteDisplayLabels(searchParams?: AlertCenterSearchParams): boolean {
  return Boolean(
    readFirstSearchParamValue(searchParams, 'returnLabel') ||
      readFirstSearchParamValue(searchParams, 'returnTo').includes('returnLabel')
  );
}

export function hasAlertEntityContext(query: AlertQueryState): boolean {
  return Boolean(query.entityId || query.entityName || query.returnTo);
}

export function hasAlertTopologyContext(query: AlertQueryState): boolean {
  return query.source === 'topology' || Boolean(query.viewMode || query.sourceKind || query.edgeId);
}

export function resolveAlertInternalReturnHref(value?: string | null): string {
  const trimmed = stripReturnLabelFromHref(value);
  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return '';
  }
  return trimmed;
}

export function hasAlertTopologyReturnContext(
  returnContext?: Pick<AlertQueryState, 'returnTo' | 'source' | 'viewMode' | 'sourceKind' | 'edgeId'> | null
): boolean {
  return Boolean(
    resolveAlertInternalReturnHref(returnContext?.returnTo) &&
      (returnContext?.source === 'topology' || returnContext?.viewMode || returnContext?.sourceKind || returnContext?.edgeId)
  );
}

function appendOptionalAlertContext(query: AlertQueryState, searchParams: SearchParamReader) {
  (
    [
      'serviceName',
      'serviceNamespace',
      'environment',
      'timeRange',
      'start',
      'end',
      'refresh',
      'live',
      'tz',
      'source',
      'signal',
      'monitorId',
      'monitorName',
      'monitorApp',
      'monitorInstance',
      'traceId',
      'spanId',
      'collector',
      'template',
      'viewMode',
      'sourceKind',
      'edgeId'
    ] as const
  ).forEach(key => {
    const value = readAlertParam(searchParams, key);
    if (value) {
      query[key] = value;
    }
  });
}

export function queryStateFromParams(searchParams: SearchParamReader): AlertQueryState {
  const explicitSearch = normalizeAlertSearch(searchParams.get('search') || searchParams.get('content') || '');
  const source = readAlertParam(searchParams, 'source');
  const serviceName = readAlertParam(searchParams, 'serviceName');
  const entityName = readAlertParam(searchParams, 'entityName');
  const query = {
    search: explicitSearch || (source === 'topology' ? serviceName || entityName : ''),
    status: normalizeAlertFilterValue(searchParams.get('status') || ''),
    severity: normalizeAlertFilterValue(searchParams.get('severity') || ''),
    pageIndex: normalizeAlertPageIndex(searchParams.get('pageIndex')),
    pageSize: normalizeAlertPageSize(searchParams.get('pageSize')),
    entityId: readAlertParam(searchParams, 'entityId'),
    entityName,
    returnTo: stripReturnLabelFromHref(readAlertParam(searchParams, 'returnTo')) || ''
  };
  appendOptionalAlertContext(query, searchParams);

  if (!query.status && hasAlertEntityContext(query)) {
    query.status = 'firing';
  }

  return query;
}

export function hasActiveAlertFilters(query: AlertQueryState): boolean {
  return Boolean(normalizeAlertSearch(query.search) || normalizeAlertFilterValue(query.status) || normalizeAlertFilterValue(query.severity));
}

export function buildAlertListUrl(query: AlertQueryState): string {
  const params = new URLSearchParams({
    pageIndex: String(normalizeAlertPageIndex(query.pageIndex)),
    pageSize: String(normalizeAlertPageSize(query.pageSize)),
    sort: 'gmtUpdate',
    order: 'desc'
  });
  const normalizedSearch = normalizeAlertSearch(query.search);
  const normalizedStatus = normalizeAlertFilterValue(query.status);
  const normalizedSeverity = normalizeAlertFilterValue(query.severity);
  if (normalizedSearch) params.set('search', normalizedSearch);
  if (normalizedStatus) params.set('status', normalizedStatus);
  if (normalizedSeverity) params.set('severity', normalizedSeverity);
  if (query.serviceName?.trim()) params.set('serviceName', query.serviceName.trim());
  if (query.serviceNamespace?.trim()) params.set('serviceNamespace', query.serviceNamespace.trim());
  if (query.environment?.trim()) params.set('environment', query.environment.trim());
  return `/alerts/group?${params.toString()}`;
}

export function buildAlertCompatRouteUrl(searchParams: SearchParamReader): string {
  const query = queryStateFromParams(searchParams);
  const params = new URLSearchParams();
  const normalizedSearch = normalizeAlertSearch(query.search);
  const normalizedStatus = normalizeAlertFilterValue(query.status);
  const normalizedSeverity = normalizeAlertFilterValue(query.severity);
  if (normalizedSearch) params.set('search', normalizedSearch);
  if (normalizedStatus) params.set('status', normalizedStatus);
  if (normalizedSeverity) params.set('severity', normalizedSeverity);
  if (searchParams.get('pageIndex') != null) {
    params.set('pageIndex', String(normalizeAlertPageIndex(query.pageIndex)));
  }
  if (searchParams.get('pageSize') != null) {
    params.set('pageSize', String(normalizeAlertPageSize(query.pageSize)));
  }
  copySignalRouteContextParams(searchParams, params);
  const signal = readAlertParam(searchParams, 'signal');
  const edgeId = readAlertParam(searchParams, 'edgeId');
  const viewMode = readAlertParam(searchParams, 'viewMode');
  const sourceKind = readAlertParam(searchParams, 'sourceKind');
  if (signal) params.set('signal', signal);
  if (viewMode) params.set('viewMode', viewMode);
  if (sourceKind) params.set('sourceKind', sourceKind);
  if (edgeId) params.set('edgeId', edgeId);
  const queryString = params.toString();
  return queryString ? `/alert?${queryString}` : '/alert';
}

export function buildAlertCompatRouteUrlFromSearchParams(searchParams?: SearchParamsRecord): string {
  return buildAlertCompatRouteUrl(createCompatSearchParamReader(searchParams));
}

export function readAlertCenterRouteState(searchParams?: AlertCenterSearchParams): AlertCenterRouteState {
  const reader = createCompatSearchParamReader(searchParams);
  return {
    initialQuery: queryStateFromParams(reader),
    cleanUrl: buildAlertCompatRouteUrl(reader),
    shouldCleanUrl: hasAlertCompatRouteDisplayLabels(searchParams)
  };
}
