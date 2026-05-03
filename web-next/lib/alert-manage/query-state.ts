import { copySignalRouteContextParams, stripReturnLabelFromHref } from '../signal-route-context';

export type AlertQueryState = {
  search: string;
  status: string;
  severity: string;
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

type SearchParamReader = {
  get(name: string): string | null;
};

export function normalizeAlertSearch(search: string): string {
  return search.trim();
}

export function normalizeAlertFilterValue(value: string): string {
  return value.trim().toLowerCase();
}

function readAlertParam(searchParams: SearchParamReader, key: string): string {
  return (searchParams.get(key) || '').trim();
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
  const params = new URLSearchParams({ pageIndex: '0', pageSize: '8', sort: 'gmtUpdate', order: 'desc' });
  const normalizedSearch = normalizeAlertSearch(query.search);
  const normalizedStatus = normalizeAlertFilterValue(query.status);
  const normalizedSeverity = normalizeAlertFilterValue(query.severity);
  if (normalizedSearch) params.set('search', normalizedSearch);
  if (normalizedStatus) params.set('status', normalizedStatus);
  if (normalizedSeverity) params.set('severity', normalizedSeverity);
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
