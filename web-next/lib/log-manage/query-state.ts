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
  logTimeUnixNano?: string;
  severityNumber: string;
  severityText: string;
  resourceFilter?: string;
  attributeFilter?: string;
  groupBy?: string;
  groupLimit?: string;
  groupOrder?: LogGroupOrder;
  groupMinCount?: string;
  columns?: LogTableColumnKey[];
  fieldColumns?: LogFieldColumnKey[];
  displayFormat?: LogDisplayFormat;
  maxLines?: string;
  listPageSize?: string;
  listPageIndex?: string;
};

export type LogWorkbenchView = 'list' | 'stream' | 'time-series' | 'table';
export type LogTableColumnKey = 'time' | 'severity' | 'service' | 'body' | 'trace-id' | 'span-id';
export type LogFieldColumnKey = `resource:${string}` | `attribute:${string}`;
export type LogDisplayFormat = 'default' | 'raw' | 'column';
export type LogGroupOrder = 'count-desc' | 'count-asc';

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
export const LOG_TABLE_COLUMNS_PARAM = 'columns';
export const LOG_FIELD_COLUMNS_PARAM = 'fieldColumns';
export const LOG_DISPLAY_FORMAT_PARAM = 'format';
export const LOG_MAX_LINES_PARAM = 'maxLines';
export const LOG_LIST_PAGE_SIZE_PARAM = 'listPageSize';
export const LOG_LIST_PAGE_INDEX_PARAM = 'listPageIndex';
export const DEFAULT_LOG_TABLE_COLUMNS: LogTableColumnKey[] = ['time', 'severity', 'service', 'body', 'trace-id'];
export const LOG_TABLE_COLUMN_KEYS: LogTableColumnKey[] = ['time', 'severity', 'service', 'body', 'trace-id', 'span-id'];
export const MAX_LOG_FIELD_COLUMNS = 6;
export const DEFAULT_LOG_DISPLAY_FORMAT: LogDisplayFormat = 'default';
export const DEFAULT_LOG_MAX_LINES = '1';
export const DEFAULT_LOG_LIST_PAGE_SIZE = '8';
export const DEFAULT_LOG_LIST_PAGE_INDEX = '0';
export const LOG_LIST_PAGE_SIZE_OPTIONS = ['8', '20', '50', '100', '200'] as const;
export const DEFAULT_LOG_GROUP_ORDER: LogGroupOrder = 'count-desc';
export const MAX_LOG_GROUP_LIMIT = 100;
export const MAX_LOG_GROUP_MIN_COUNT = 1000000;
export const LOG_HISTORY_CONTEXT_PARAM_KEYS = [
  'start',
  'end',
  'search',
  'content',
  'traceId',
  'spanId',
  'logTimeUnixNano',
  'severityText',
  'severityNumber',
  'resourceFilter',
  'attributeFilter',
  'groupBy',
  'groupLimit',
  'groupOrder',
  'groupMinCount',
  LOG_FIELD_COLUMNS_PARAM,
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

function normalizeLogTimeUnixNanoParam(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return '';
  return trimmed;
}

function normalizeLogTableColumn(value: string): LogTableColumnKey | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'time' || normalized === 'timestamp' || normalized === 'start') return 'time';
  if (normalized === 'severity' || normalized === 'severity-text' || normalized === 'level') return 'severity';
  if (normalized === 'service' || normalized === 'service-name') return 'service';
  if (normalized === 'body' || normalized === 'message' || normalized === 'content') return 'body';
  if (normalized === 'trace-id' || normalized === 'traceid' || normalized === 'trace') return 'trace-id';
  if (normalized === 'span-id' || normalized === 'spanid' || normalized === 'span') return 'span-id';
  return null;
}

function normalizeLogFieldColumn(value: string): LogFieldColumnKey | null {
  const trimmed = value.trim();
  const separatorIndex = trimmed.indexOf(':');
  if (separatorIndex <= 0) return null;
  const source = trimmed.slice(0, separatorIndex).toLowerCase();
  const fieldName = trimmed.slice(separatorIndex + 1).trim();
  if (source !== 'resource' && source !== 'attribute') return null;
  if (!/^[A-Za-z0-9_.:-]+$/.test(fieldName)) return null;
  return `${source}:${fieldName}` as LogFieldColumnKey;
}

export function resolveLogTableColumns(searchParams: SearchParamReader): LogTableColumnKey[] {
  const requestedColumns = readSearchParam(searchParams, LOG_TABLE_COLUMNS_PARAM);
  if (!requestedColumns) return [...DEFAULT_LOG_TABLE_COLUMNS];
  const requestedSet = new Set(
    requestedColumns
      .split(',')
      .map(normalizeLogTableColumn)
      .filter((column): column is LogTableColumnKey => column != null)
  );
  if (requestedSet.size === 0) return [...DEFAULT_LOG_TABLE_COLUMNS];
  return LOG_TABLE_COLUMN_KEYS.filter(column => requestedSet.has(column));
}

export function resolveLogFieldColumns(searchParams: SearchParamReader): LogFieldColumnKey[] {
  const requestedColumns = readSearchParam(searchParams, LOG_FIELD_COLUMNS_PARAM);
  if (!requestedColumns) return [];
  const normalizedColumns: LogFieldColumnKey[] = [];
  for (const value of requestedColumns.split(',')) {
    const column = normalizeLogFieldColumn(value);
    if (!column || normalizedColumns.includes(column)) continue;
    normalizedColumns.push(column);
    if (normalizedColumns.length >= MAX_LOG_FIELD_COLUMNS) break;
  }
  return normalizedColumns;
}

export function resolveLogDisplayFormat(searchParams: SearchParamReader): LogDisplayFormat {
  const requestedFormat = readSearchParam(searchParams, LOG_DISPLAY_FORMAT_PARAM).toLowerCase();
  if (requestedFormat === 'raw') return 'raw';
  if (requestedFormat === 'column' || requestedFormat === 'columns') return 'column';
  return DEFAULT_LOG_DISPLAY_FORMAT;
}

export function resolveLogMaxLines(searchParams: SearchParamReader): string {
  const value = readSearchParam(searchParams, LOG_MAX_LINES_PARAM);
  if (!/^\d+$/.test(value)) return DEFAULT_LOG_MAX_LINES;
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 10) return DEFAULT_LOG_MAX_LINES;
  return String(numeric);
}

export function resolveLogListPageSize(searchParams: SearchParamReader): string {
  const value = readSearchParam(searchParams, LOG_LIST_PAGE_SIZE_PARAM) || readSearchParam(searchParams, 'logsPerPage');
  return LOG_LIST_PAGE_SIZE_OPTIONS.find(option => option === value) || DEFAULT_LOG_LIST_PAGE_SIZE;
}

export function resolveLogListPageIndex(searchParams: SearchParamReader): string {
  const value = readSearchParam(searchParams, LOG_LIST_PAGE_INDEX_PARAM);
  if (!/^\d+$/.test(value)) return DEFAULT_LOG_LIST_PAGE_INDEX;
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0) return DEFAULT_LOG_LIST_PAGE_INDEX;
  return String(numeric);
}

export function resolveLogGroupLimit(searchParams: SearchParamReader): string {
  const value = readSearchParam(searchParams, 'groupLimit');
  if (!/^\d+$/.test(value)) return '';
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > MAX_LOG_GROUP_LIMIT) return '';
  return String(numeric);
}

export function resolveLogGroupMinCount(searchParams: SearchParamReader): string {
  const value = readSearchParam(searchParams, 'groupMinCount');
  if (!/^\d+$/.test(value)) return '';
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > MAX_LOG_GROUP_MIN_COUNT) return '';
  return String(numeric);
}

export function resolveLogGroupOrder(searchParams: SearchParamReader): LogGroupOrder {
  const value = readSearchParam(searchParams, 'groupOrder').toLowerCase();
  if (value === 'count-asc') return 'count-asc';
  return DEFAULT_LOG_GROUP_ORDER;
}

function isDefaultLogTableColumns(columns: LogTableColumnKey[]) {
  return (
    columns.length === DEFAULT_LOG_TABLE_COLUMNS.length &&
    DEFAULT_LOG_TABLE_COLUMNS.every((column, index) => columns[index] === column)
  );
}

export function queryStateFromParams(searchParams: SearchParamReader): LogQueryState {
  const resourceFilter = readSearchParam(searchParams, 'resourceFilter');
  const attributeFilter = readSearchParam(searchParams, 'attributeFilter');
  const groupBy = readSearchParam(searchParams, 'groupBy');
  const groupLimit = resolveLogGroupLimit(searchParams);
  const groupOrder = resolveLogGroupOrder(searchParams);
  const groupMinCount = resolveLogGroupMinCount(searchParams);
  const fieldColumns = resolveLogFieldColumns(searchParams);
  return {
    search: readSearchParam(searchParams, 'search') || readSearchParam(searchParams, 'content'),
    logContent: readSearchParam(searchParams, 'logContent'),
    traceId: readSearchParam(searchParams, 'traceId'),
    spanId: readSearchParam(searchParams, 'spanId'),
    ...(normalizeLogTimeUnixNanoParam(searchParams.get('logTimeUnixNano')) ? { logTimeUnixNano: normalizeLogTimeUnixNanoParam(searchParams.get('logTimeUnixNano')) } : {}),
    severityNumber: normalizeSeverityNumberParam(searchParams.get('severityNumber')),
    severityText: readSearchParam(searchParams, 'severityText'),
    ...(resourceFilter ? { resourceFilter } : {}),
    ...(attributeFilter ? { attributeFilter } : {}),
    ...(groupBy ? { groupBy } : {}),
    ...(groupLimit ? { groupLimit } : {}),
    ...(groupBy && groupOrder !== DEFAULT_LOG_GROUP_ORDER ? { groupOrder } : {}),
    ...(groupBy && groupMinCount ? { groupMinCount } : {}),
    columns: resolveLogTableColumns(searchParams),
    ...(fieldColumns.length ? { fieldColumns } : {}),
    displayFormat: resolveLogDisplayFormat(searchParams),
    maxLines: resolveLogMaxLines(searchParams),
    listPageSize: resolveLogListPageSize(searchParams),
    listPageIndex: resolveLogListPageIndex(searchParams)
  };
}

export function resolveLogWorkbenchView(searchParams: SearchParamReader): LogWorkbenchView {
  const requestedView = readSearchParam(searchParams, LOG_WORKBENCH_VIEW_PARAM).toLowerCase();
  if (requestedView === 'stream') return 'stream';
  if (requestedView === 'history' || requestedView === 'list') return 'list';
  if (requestedView === 'time-series' || requestedView === 'timeseries') return 'time-series';
  if (requestedView === 'table') return 'table';
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
  const logTimeUnixNano = normalizeLogTimeUnixNanoParam(query.logTimeUnixNano);
  if (logTimeUnixNano) params.set('logTimeUnixNano', logTimeUnixNano);
  const severityNumber = normalizeSeverityNumberParam(query.severityNumber);
  if (severityNumber) params.set('severityNumber', severityNumber);
  if (query.severityText.trim()) params.set('severityText', query.severityText.trim());
  if (query.resourceFilter?.trim()) params.set('resourceFilter', query.resourceFilter.trim());
  if (query.attributeFilter?.trim()) params.set('attributeFilter', query.attributeFilter.trim());
  if (query.groupBy?.trim()) params.set('groupBy', query.groupBy.trim());
  const groupLimit = resolveLogGroupLimit({ get: name => (name === 'groupLimit' ? query.groupLimit || '' : null) });
  if (groupLimit) params.set('groupLimit', groupLimit);
  const groupOrder = resolveLogGroupOrder({ get: name => (name === 'groupOrder' ? query.groupOrder || '' : null) });
  if (query.groupBy?.trim() && groupOrder !== DEFAULT_LOG_GROUP_ORDER) params.set('groupOrder', groupOrder);
  const groupMinCount = resolveLogGroupMinCount({ get: name => (name === 'groupMinCount' ? query.groupMinCount || '' : null) });
  if (query.groupBy?.trim() && groupMinCount) params.set('groupMinCount', groupMinCount);
  const columns = query.columns || DEFAULT_LOG_TABLE_COLUMNS;
  if (!isDefaultLogTableColumns(columns)) params.set(LOG_TABLE_COLUMNS_PARAM, columns.join(','));
  const fieldColumns = resolveLogFieldColumns({
    get: name => (name === LOG_FIELD_COLUMNS_PARAM ? query.fieldColumns?.join(',') || '' : null)
  });
  if (fieldColumns.length) params.set(LOG_FIELD_COLUMNS_PARAM, fieldColumns.join(','));
  const displayFormat = query.displayFormat || DEFAULT_LOG_DISPLAY_FORMAT;
  if (displayFormat !== DEFAULT_LOG_DISPLAY_FORMAT) params.set(LOG_DISPLAY_FORMAT_PARAM, displayFormat);
  const maxLines = resolveLogMaxLines({ get: name => (name === LOG_MAX_LINES_PARAM ? query.maxLines || '' : null) });
  if (maxLines !== DEFAULT_LOG_MAX_LINES) params.set(LOG_MAX_LINES_PARAM, maxLines);
  const listPageSize = resolveLogListPageSize({ get: name => (name === LOG_LIST_PAGE_SIZE_PARAM ? query.listPageSize || '' : null) });
  if (listPageSize !== DEFAULT_LOG_LIST_PAGE_SIZE) params.set(LOG_LIST_PAGE_SIZE_PARAM, listPageSize);
  const listPageIndex = resolveLogListPageIndex({ get: name => (name === LOG_LIST_PAGE_INDEX_PARAM ? query.listPageIndex || '' : null) });
  if (listPageIndex !== DEFAULT_LOG_LIST_PAGE_INDEX) params.set(LOG_LIST_PAGE_INDEX_PARAM, listPageIndex);
}

function appendLogTimeContext(params: URLSearchParams, routeContext: SignalRouteContext = {}) {
  const start = readEpochMillisRouteParam(routeContext.start);
  const end = readEpochMillisRouteParam(routeContext.end);
  if (start) params.set('start', start);
  if (end) params.set('end', end);
}

function appendLogQuickFilterContext(params: URLSearchParams, routeContext: SignalRouteContext = {}) {
  const serviceName = routeContext.serviceName?.trim();
  const serviceNamespace = routeContext.serviceNamespace?.trim();
  const environment = routeContext.environment?.trim();
  if (serviceName) params.set('serviceName', serviceName);
  if (serviceNamespace) params.set('serviceNamespace', serviceNamespace);
  if (environment) params.set('environment', environment);
}

function appendLogEntityContextParams(params: URLSearchParams, routeContext: SignalRouteContext = {}) {
  const entityId = routeContext.entityId?.trim();
  const entityType = routeContext.entityType?.trim();
  if (entityId && /^\d+$/.test(entityId)) params.set('entityId', entityId);
  if (entityType && /^[A-Za-z0-9_.:-]+$/.test(entityType)) params.set('entityType', entityType);
}

export function buildLogRouteUrl(query: LogQueryState, options?: { view?: LogWorkbenchView }): string {
  const params = new URLSearchParams();
  setLogQueryParams(params, query);
  if (options?.view) params.set(LOG_WORKBENCH_VIEW_PARAM, options.view);
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
  const listPageSize = resolveLogListPageSize({ get: name => (name === LOG_LIST_PAGE_SIZE_PARAM ? query.listPageSize || '' : null) });
  const listPageIndex = resolveLogListPageIndex({ get: name => (name === LOG_LIST_PAGE_INDEX_PARAM ? query.listPageIndex || '' : null) });
  const listParams = new URLSearchParams({ pageIndex: listPageIndex, pageSize: listPageSize });
  if (query.search.trim()) listParams.set('search', query.search.trim());
  if (query.traceId.trim()) listParams.set('traceId', query.traceId.trim());
  if (query.spanId.trim()) listParams.set('spanId', query.spanId.trim());
  const severityNumber = normalizeSeverityNumberParam(query.severityNumber);
  if (severityNumber) listParams.set('severityNumber', severityNumber);
  if (query.severityText.trim()) listParams.set('severityText', query.severityText.trim());
  const resourceFilter = query.resourceFilter?.trim() || '';
  if (resourceFilter) listParams.set('resourceFilter', resourceFilter);
  if (query.attributeFilter?.trim()) listParams.set('attributeFilter', query.attributeFilter.trim());
  appendLogEntityContextParams(listParams, routeContext);
  appendLogQuickFilterContext(listParams, routeContext);
  appendLogTimeContext(listParams, routeContext);

  const statsParams = new URLSearchParams();
  if (query.search.trim()) statsParams.set('search', query.search.trim());
  if (query.traceId.trim()) statsParams.set('traceId', query.traceId.trim());
  if (query.spanId.trim()) statsParams.set('spanId', query.spanId.trim());
  if (severityNumber) statsParams.set('severityNumber', severityNumber);
  if (query.severityText.trim()) statsParams.set('severityText', query.severityText.trim());
  if (resourceFilter) statsParams.set('resourceFilter', resourceFilter);
  if (query.attributeFilter?.trim()) statsParams.set('attributeFilter', query.attributeFilter.trim());
  appendLogEntityContextParams(statsParams, routeContext);
  appendLogQuickFilterContext(statsParams, routeContext);
  appendLogTimeContext(statsParams, routeContext);
  const qs = statsParams.toString();
  const groupParams = new URLSearchParams(statsParams);
  if (query.groupBy?.trim()) groupParams.set('groupBy', query.groupBy.trim());
  const groupLimit = resolveLogGroupLimit({ get: name => (name === 'groupLimit' ? query.groupLimit || '' : null) });
  if (groupLimit) groupParams.set('limit', groupLimit);
  const groupOrder = resolveLogGroupOrder({ get: name => (name === 'groupOrder' ? query.groupOrder || '' : null) });
  if (query.groupBy?.trim() && groupOrder !== DEFAULT_LOG_GROUP_ORDER) groupParams.set('orderBy', groupOrder);
  const groupMinCount = resolveLogGroupMinCount({ get: name => (name === 'groupMinCount' ? query.groupMinCount || '' : null) });
  if (query.groupBy?.trim() && groupMinCount) groupParams.set('minCount', groupMinCount);
  const groupQs = groupParams.toString();

  return {
    listUrl: `/logs/list?${listParams.toString()}`,
    overviewUrl: qs ? `/logs/stats/overview?${qs}` : '/logs/stats/overview',
    trendUrl: qs ? `/logs/stats/trend?${qs}` : '/logs/stats/trend',
    coverageUrl: qs ? `/logs/stats/trace-coverage?${qs}` : '/logs/stats/trace-coverage',
    groupByUrl: groupQs ? `/logs/stats/group-by?${groupQs}` : '/logs/stats/group-by'
  };
}

export function buildLogStreamUrl(query: LogQueryState, routeContext: SignalRouteContext = {}): string {
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
  appendLogQuickFilterContext(params, routeContext);
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
