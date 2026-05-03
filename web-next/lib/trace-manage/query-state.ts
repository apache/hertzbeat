import { readEntityIdRouteParam, readEpochMillisRouteParam, type SignalRouteContext } from '../signal-route-context';

export type TraceQueryState = {
  traceId: string;
  spanId: string;
  serviceName: string;
  errorOnly: boolean;
};

export type SearchParamReader = {
  get(name: string): string | null;
};

export function queryStateFromParams(searchParams: SearchParamReader): TraceQueryState {
  return {
    traceId: searchParams.get('traceId') || '',
    spanId: searchParams.get('spanId') || '',
    serviceName: searchParams.get('serviceName') || '',
    errorOnly: searchParams.get('errorOnly') === 'true'
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
