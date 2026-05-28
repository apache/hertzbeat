import { createCompatSearchParamReader, type SearchParamsRecord } from '../compat/search-params';
import {
  copySignalRouteContextParams,
  readEpochMillisRouteParam,
  readSignalRouteContext,
  type SignalRouteContext
} from '../signal-route-context';

export type { SearchParamsRecord };

export type LogQueryState = {
  search: string;
  logContent: string;
  traceId: string;
  spanId: string;
  severityNumber: string;
  severityText: string;
};

export type LogWorkbenchView = 'list' | 'stream';

export type LogManageSearchParams = SearchParamsRecord;

export type LogManageRouteState = {
  initialQuery: LogQueryState;
  currentView: LogWorkbenchView;
  routeContext: SignalRouteContext;
  shouldCleanUrl: boolean;
};

export type SearchParamReader = {
  get(name: string): string | null;
};

export type BrowserLocationLike = {
  protocol: string;
  hostname: string;
  port: string;
};

export const LOG_WORKBENCH_VIEW_PARAM = 'view';
export const LOG_HISTORY_CONTEXT_PARAM_KEYS = [
  'start',
  'end',
  'search',
  'content',
  'traceId',
  'spanId',
  'severityText',
  'severityNumber',
  'serviceName',
  'serviceNamespace',
  'environment'
] as const;

function readSearchParam(searchParams: SearchParamReader, name: string) {
  const value = searchParams.get(name);
  if (value == null) return '';
  return value.trim();
}

function readFirstSearchParamValue(searchParams: LogManageSearchParams | undefined, key: string): string {
  const value = searchParams?.[key];
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return value || '';
}

function hasLogRouteDisplayLabels(searchParams?: LogManageSearchParams): boolean {
  return Boolean(
    readFirstSearchParamValue(searchParams, 'returnLabel') ||
      readFirstSearchParamValue(searchParams, 'returnTo').includes('returnLabel')
  );
}

function normalizeSeverityNumberParam(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return '';
  const numeric = Number(trimmed);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 24) return '';
  return String(numeric);
}

export function queryStateFromParams(searchParams: SearchParamReader): LogQueryState {
  return {
    search: readSearchParam(searchParams, 'search') || readSearchParam(searchParams, 'content'),
    logContent: readSearchParam(searchParams, 'logContent'),
    traceId: readSearchParam(searchParams, 'traceId'),
    spanId: readSearchParam(searchParams, 'spanId'),
    severityNumber: normalizeSeverityNumberParam(searchParams.get('severityNumber')),
    severityText: readSearchParam(searchParams, 'severityText')
  };
}

export function resolveLogWorkbenchView(searchParams: SearchParamReader): LogWorkbenchView {
  const requestedView = readSearchParam(searchParams, LOG_WORKBENCH_VIEW_PARAM).toLowerCase();
  if (requestedView === 'stream') return 'stream';
  if (requestedView === 'history' || requestedView === 'list') return 'list';
  return LOG_HISTORY_CONTEXT_PARAM_KEYS.some(key => readSearchParam(searchParams, key) !== '') ? 'list' : 'stream';
}

export function copyLogRouteContextParams(searchParams: SearchParamReader, nextParams: URLSearchParams) {
  copySignalRouteContextParams(searchParams, nextParams);
}

function setLogQueryParams(params: URLSearchParams, query: LogQueryState) {
  if (query.search.trim()) params.set('search', query.search.trim());
  if (query.logContent.trim()) params.set('logContent', query.logContent.trim());
  if (query.traceId.trim()) params.set('traceId', query.traceId.trim());
  if (query.spanId.trim()) params.set('spanId', query.spanId.trim());
  const severityNumber = normalizeSeverityNumberParam(query.severityNumber);
  if (severityNumber) params.set('severityNumber', severityNumber);
  if (query.severityText.trim()) params.set('severityText', query.severityText.trim());
}

function appendLogTimeContext(params: URLSearchParams, routeContext: SignalRouteContext = {}) {
  const start = readEpochMillisRouteParam(routeContext.start);
  const end = readEpochMillisRouteParam(routeContext.end);
  if (start) params.set('start', start);
  if (end) params.set('end', end);
}

export function buildLogRouteUrl(query: LogQueryState, options?: { view?: LogWorkbenchView }): string {
  const params = new URLSearchParams();
  setLogQueryParams(params, query);
  if (options?.view === 'list') params.set(LOG_WORKBENCH_VIEW_PARAM, 'list');
  if (options?.view === 'stream') params.set(LOG_WORKBENCH_VIEW_PARAM, 'stream');
  const queryString = params.toString();
  return queryString ? `/log/manage?${queryString}` : '/log/manage';
}

export function buildLogCompatRouteUrl(
  searchParams: SearchParamReader,
  options?: {
    view?: LogWorkbenchView;
    fallbackSearch?: string;
  }
) {
  const query = queryStateFromParams(searchParams);
  const nextQuery: LogQueryState = {
    ...query,
    search: query.search.trim() || options?.fallbackSearch?.trim() || ''
  };
  const nextParams = new URLSearchParams(buildLogRouteUrl(nextQuery, { view: options?.view }).split('?')[1] || '');
  copyLogRouteContextParams(searchParams, nextParams);
  const queryString = nextParams.toString();
  return queryString ? `/log/manage?${queryString}` : '/log/manage';
}

export function buildLogCompatRouteUrlFromSearchParams(
  searchParams?: SearchParamsRecord,
  options?: {
    view?: LogWorkbenchView;
    fallbackSearch?: string;
  }
) {
  return buildLogCompatRouteUrl(createCompatSearchParamReader(searchParams), options);
}

export function readLogManageRouteState(searchParams?: LogManageSearchParams): LogManageRouteState {
  const reader = createCompatSearchParamReader(searchParams);
  return {
    initialQuery: queryStateFromParams(reader),
    currentView: resolveLogWorkbenchView(reader),
    routeContext: readSignalRouteContext(reader),
    shouldCleanUrl: hasLogRouteDisplayLabels(searchParams)
  };
}

export function buildLogUrls(query: LogQueryState, routeContext: SignalRouteContext = {}) {
  const listParams = new URLSearchParams({ pageIndex: '0', pageSize: '8' });
  if (query.search.trim()) listParams.set('search', query.search.trim());
  if (query.traceId.trim()) listParams.set('traceId', query.traceId.trim());
  if (query.spanId.trim()) listParams.set('spanId', query.spanId.trim());
  const severityNumber = normalizeSeverityNumberParam(query.severityNumber);
  if (severityNumber) listParams.set('severityNumber', severityNumber);
  if (query.severityText.trim()) listParams.set('severityText', query.severityText.trim());
  appendLogTimeContext(listParams, routeContext);

  const statsParams = new URLSearchParams();
  if (query.search.trim()) statsParams.set('search', query.search.trim());
  if (query.traceId.trim()) statsParams.set('traceId', query.traceId.trim());
  if (query.spanId.trim()) statsParams.set('spanId', query.spanId.trim());
  if (severityNumber) statsParams.set('severityNumber', severityNumber);
  if (query.severityText.trim()) statsParams.set('severityText', query.severityText.trim());
  appendLogTimeContext(statsParams, routeContext);
  const qs = statsParams.toString();

  return {
    listUrl: `/logs/list?${listParams.toString()}`,
    overviewUrl: qs ? `/logs/stats/overview?${qs}` : '/logs/stats/overview',
    trendUrl: qs ? `/logs/stats/trend?${qs}` : '/logs/stats/trend',
    coverageUrl: qs ? `/logs/stats/trace-coverage?${qs}` : '/logs/stats/trace-coverage'
  };
}

export function buildLogStreamUrl(query: LogQueryState, _routeContext: SignalRouteContext = {}): string {
  const params = new URLSearchParams();
  if (query.logContent.trim()) {
    params.set('logContent', query.logContent.trim());
  } else if (query.search.trim()) {
    params.set('logContent', query.search.trim());
  }
  if (query.traceId.trim()) params.set('traceId', query.traceId.trim());
  if (query.spanId.trim()) params.set('spanId', query.spanId.trim());
  const severityNumber = normalizeSeverityNumberParam(query.severityNumber);
  if (severityNumber) params.set('severityNumber', severityNumber);
  if (query.severityText.trim()) params.set('severityText', query.severityText.trim());
  const qs = params.toString();
  return qs ? `/api/logs/sse/subscribe?${qs}` : '/api/logs/sse/subscribe';
}

function joinOriginPath(origin: string, path: string) {
  return `${origin.replace(/\/+$/, '')}${path}`;
}

function resolveCurrentBrowserLocation(): BrowserLocationLike | null {
  if (typeof window === 'undefined') return null;
  return window.location;
}

export function resolveBrowserLogStreamUrl(streamPath: string, locationLike: BrowserLocationLike | null = resolveCurrentBrowserLocation()) {
  if (!streamPath.startsWith('/api/logs/sse/')) {
    return streamPath;
  }

  const configuredBackendOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN?.trim();
  if (configuredBackendOrigin) {
    return joinOriginPath(configuredBackendOrigin, streamPath);
  }

  if (!locationLike) {
    return streamPath;
  }

  const isDevFrontendPort = locationLike.port === '4200';
  if (!isDevFrontendPort) {
    return streamPath;
  }

  return `${locationLike.protocol}//${locationLike.hostname}:1157${streamPath}`;
}
