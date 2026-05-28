import { createCompatSearchParamReader, type SearchParamsRecord } from '../compat/search-params';
import {
  readEntityIdRouteParam,
  readEpochMillisRouteParam,
  readSignalRouteContext,
  type SignalRouteContext
} from '../signal-route-context';

export type { SearchParamsRecord };

export type TraceQueryState = {
  traceId: string;
  spanId: string;
  serviceName: string;
  errorOnly: boolean;
};

export type TraceManageSearchParams = SearchParamsRecord;

export type TraceManageRouteState = {
  initialQuery: TraceQueryState;
  routeContext: SignalRouteContext;
  shouldCleanUrl: boolean;
};

export type SearchParamReader = {
  get(name: string): string | null;
};

function readSearchParam(searchParams: SearchParamReader, name: string) {
  return searchParams.get(name)?.trim() || '';
}

function readFirstSearchParamValue(searchParams: TraceManageSearchParams | undefined, key: string) {
  const value = searchParams?.[key];
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return value || '';
}

function hasTraceRouteDisplayLabels(searchParams?: TraceManageSearchParams) {
  return Boolean(
    readFirstSearchParamValue(searchParams, 'returnLabel') ||
      readFirstSearchParamValue(searchParams, 'returnTo').includes('returnLabel')
  );
}

function hasUnsanitizedTraceTimeBounds(searchParams?: TraceManageSearchParams) {
  const hasDirtyBound = (key: 'start' | 'end') => {
    const value = readFirstSearchParamValue(searchParams, key);
    const trimmed = value.trim();
    return Boolean(trimmed && readEpochMillisRouteParam(trimmed) !== trimmed);
  };
  return hasDirtyBound('start') || hasDirtyBound('end');
}

export function queryStateFromParams(searchParams: SearchParamReader): TraceQueryState {
  return {
    traceId: readSearchParam(searchParams, 'traceId'),
    spanId: readSearchParam(searchParams, 'spanId'),
    serviceName: readSearchParam(searchParams, 'serviceName'),
    errorOnly: searchParams.get('errorOnly') === 'true'
  };
}

export function readTraceManageRouteState(searchParams?: TraceManageSearchParams): TraceManageRouteState {
  const reader = createCompatSearchParamReader(searchParams);
  return {
    initialQuery: queryStateFromParams(reader),
    routeContext: readSignalRouteContext(reader),
    shouldCleanUrl: hasTraceRouteDisplayLabels(searchParams) || hasUnsanitizedTraceTimeBounds(searchParams)
  };
}

export function buildTraceRouteUrl(query: TraceQueryState): string {
  const params = new URLSearchParams();
  if (query.traceId.trim()) params.set('traceId', query.traceId.trim());
  if (query.spanId.trim()) params.set('spanId', query.spanId.trim());
  if (query.serviceName.trim()) params.set('serviceName', query.serviceName.trim());
  if (query.errorOnly) params.set('errorOnly', 'true');
  const queryString = params.toString();
  return queryString ? `/trace/manage?${queryString}` : '/trace/manage';
}

function appendTraceQueryContext(params: URLSearchParams, routeContext: SignalRouteContext = {}) {
  const entityId = readEntityIdRouteParam(routeContext.entityId);
  if (entityId) {
    params.set('entityId', entityId);
  }

  const contextKeys = ['serviceNamespace', 'environment', 'start', 'end'] as const;

  for (const key of contextKeys) {
    const value = key === 'start' || key === 'end' ? readEpochMillisRouteParam(routeContext[key]) : routeContext[key]?.trim();
    if (value) {
      params.set(key, value);
    }
  }
}

export function buildTraceUrls(
  query: TraceQueryState,
  routeContext: SignalRouteContext = {}
): { listUrl: string; overviewUrl: string } {
  const listParams = new URLSearchParams({ pageIndex: '0', pageSize: '8' });
  if (query.traceId.trim()) listParams.set('traceId', query.traceId.trim());
  if (query.serviceName.trim()) listParams.set('serviceName', query.serviceName.trim());
  if (query.errorOnly) listParams.set('errorOnly', 'true');
  appendTraceQueryContext(listParams, routeContext);

  const overviewParams = new URLSearchParams();
  if (query.traceId.trim()) overviewParams.set('traceId', query.traceId.trim());
  if (query.serviceName.trim()) overviewParams.set('serviceName', query.serviceName.trim());
  if (query.errorOnly) overviewParams.set('errorOnly', 'true');
  appendTraceQueryContext(overviewParams, routeContext);

  return {
    listUrl: `/traces/list?${listParams.toString()}`,
    overviewUrl: overviewParams.toString() ? `/traces/stats/overview?${overviewParams.toString()}` : '/traces/stats/overview'
  };
}
