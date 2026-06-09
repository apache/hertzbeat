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
  resourceFilter?: string;
  attributeFilter?: string;
  operationName?: string;
  minDurationMs?: string;
  maxDurationMs?: string;
  groupBy?: string;
  groupLimit?: string;
  groupOrder?: TraceGroupOrder;
  groupMinCount?: string;
  errorOnly: boolean;
  spanScope: TraceSpanScope;
  listPageSize?: string;
  listPageIndex?: string;
  columns?: TraceTableColumnKey[];
};

export type TraceExplorerView = 'list' | 'trace' | 'time-series' | 'table';
export type TraceSpanScope = 'root' | 'all' | 'entrypoint';
export type TraceTableColumnKey = 'start' | 'service' | 'root-span' | 'duration' | 'status' | 'trace-id';
export type TraceGroupOrder = 'trace-count-desc' | 'error-count-desc' | 'latency-p95-desc';

export type TraceManageSearchParams = SearchParamsRecord;

export type TraceManageRouteState = {
  initialQuery: TraceQueryState;
  currentView: TraceExplorerView;
  routeContext: SignalRouteContext;
  shouldCleanUrl: boolean;
};

export type SearchParamReader = {
  get(name: string): string | null;
};

function readSearchParam(searchParams: SearchParamReader, name: string) {
  return searchParams.get(name)?.trim() || '';
}

export const TRACE_EXPLORER_VIEW_PARAM = 'view';
export const TRACE_SPAN_SCOPE_PARAM = 'spanScope';
export const TRACE_TABLE_COLUMNS_PARAM = 'columns';
export const TRACE_LIST_PAGE_SIZE_PARAM = 'listPageSize';
export const TRACE_LIST_PAGE_INDEX_PARAM = 'listPageIndex';
export const DEFAULT_TRACE_SPAN_SCOPE: TraceSpanScope = 'root';
export const DEFAULT_TRACE_LIST_PAGE_SIZE = '8';
export const DEFAULT_TRACE_LIST_PAGE_INDEX = '0';
export const TRACE_LIST_PAGE_SIZE_OPTIONS = ['8', '20', '50', '100', '200'] as const;
export const DEFAULT_TRACE_TABLE_COLUMNS: TraceTableColumnKey[] = ['start', 'service', 'root-span', 'duration', 'status', 'trace-id'];
export const TRACE_TABLE_COLUMN_KEYS: TraceTableColumnKey[] = [...DEFAULT_TRACE_TABLE_COLUMNS];
export const DEFAULT_TRACE_GROUP_ORDER: TraceGroupOrder = 'trace-count-desc';
export const MAX_TRACE_GROUP_LIMIT = 100;
export const MAX_TRACE_GROUP_MIN_COUNT = 1000000;

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
  const groupBy = readSearchParam(searchParams, 'groupBy');
  const groupOrder = resolveTraceGroupOrder(searchParams);
  const groupMinCount = readPositiveGroupMinCountSearchParam(searchParams);
  return {
    traceId: readSearchParam(searchParams, 'traceId'),
    spanId: readSearchParam(searchParams, 'spanId'),
    serviceName: readSearchParam(searchParams, 'serviceName'),
    resourceFilter: readSearchParam(searchParams, 'resourceFilter'),
    attributeFilter: readSearchParam(searchParams, 'attributeFilter'),
    operationName: readSearchParam(searchParams, 'operationName'),
    minDurationMs: readNonNegativeIntegerSearchParam(searchParams, 'minDurationMs'),
    maxDurationMs: readNonNegativeIntegerSearchParam(searchParams, 'maxDurationMs'),
    groupBy,
    groupLimit: readPositiveGroupLimitSearchParam(searchParams, 'groupLimit'),
    ...(groupBy && groupOrder !== DEFAULT_TRACE_GROUP_ORDER ? { groupOrder } : {}),
    ...(groupBy && groupMinCount ? { groupMinCount } : {}),
    errorOnly: searchParams.get('errorOnly') === 'true',
    spanScope: resolveTraceSpanScope(searchParams),
    listPageSize: resolveTraceListPageSize(searchParams),
    listPageIndex: resolveTraceListPageIndex(searchParams),
    columns: resolveTraceTableColumns(searchParams)
  };
}

export function resolveTraceGroupOrder(searchParams: SearchParamReader): TraceGroupOrder {
  const value = readSearchParam(searchParams, 'groupOrder').toLowerCase();
  if (value === 'error-count-desc') return 'error-count-desc';
  if (value === 'latency-p95-desc') return 'latency-p95-desc';
  return DEFAULT_TRACE_GROUP_ORDER;
}

function readNonNegativeIntegerSearchParam(searchParams: SearchParamReader, name: string) {
  const value = readSearchParam(searchParams, name);
  if (!/^\d+$/.test(value)) return '';
  return value;
}

function readPositiveGroupLimitSearchParam(searchParams: SearchParamReader, name: string) {
  const value = readSearchParam(searchParams, name);
  if (!/^\d+$/.test(value)) return '';
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > MAX_TRACE_GROUP_LIMIT) return '';
  return String(numeric);
}

function readPositiveGroupMinCountSearchParam(searchParams: SearchParamReader) {
  const value = readSearchParam(searchParams, 'groupMinCount');
  if (!/^\d+$/.test(value)) return '';
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > MAX_TRACE_GROUP_MIN_COUNT) return '';
  return String(numeric);
}

export function resolveTraceSpanScope(searchParams: SearchParamReader): TraceSpanScope {
  const requestedScope = readSearchParam(searchParams, TRACE_SPAN_SCOPE_PARAM).toLowerCase();
  if (requestedScope === 'all' || requestedScope === 'all-spans') return 'all';
  if (requestedScope === 'entrypoint' || requestedScope === 'entrypoint-spans' || requestedScope === 'entry') return 'entrypoint';
  return DEFAULT_TRACE_SPAN_SCOPE;
}

export function resolveTraceListPageSize(searchParams: SearchParamReader) {
  const requestedSize = readSearchParam(searchParams, TRACE_LIST_PAGE_SIZE_PARAM) || readSearchParam(searchParams, 'spansPerPage');
  return TRACE_LIST_PAGE_SIZE_OPTIONS.find(option => option === requestedSize) || DEFAULT_TRACE_LIST_PAGE_SIZE;
}

export function resolveTraceListPageIndex(searchParams: SearchParamReader) {
  const requestedIndex = readSearchParam(searchParams, TRACE_LIST_PAGE_INDEX_PARAM);
  if (!/^\d+$/.test(requestedIndex)) return DEFAULT_TRACE_LIST_PAGE_INDEX;
  const numeric = Number(requestedIndex);
  if (!Number.isInteger(numeric) || numeric < 0) return DEFAULT_TRACE_LIST_PAGE_INDEX;
  return String(numeric);
}

export function resolveTraceExplorerView(searchParams: SearchParamReader): TraceExplorerView {
  const requestedView = readSearchParam(searchParams, TRACE_EXPLORER_VIEW_PARAM).toLowerCase();
  if (requestedView === 'trace' || requestedView === 'traces') return 'trace';
  if (requestedView === 'time-series' || requestedView === 'timeseries') return 'time-series';
  if (requestedView === 'table') return 'table';
  return 'list';
}

function normalizeTraceTableColumn(value: string): TraceTableColumnKey | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'start' || normalized === 'start-time' || normalized === 'time') return 'start';
  if (normalized === 'service' || normalized === 'service-name') return 'service';
  if (normalized === 'root-span' || normalized === 'rootspan' || normalized === 'span' || normalized === 'name') return 'root-span';
  if (normalized === 'duration' || normalized === 'latency') return 'duration';
  if (normalized === 'status' || normalized === 'error') return 'status';
  if (normalized === 'trace-id' || normalized === 'traceid' || normalized === 'trace') return 'trace-id';
  return null;
}

export function resolveTraceTableColumns(searchParams: SearchParamReader): TraceTableColumnKey[] {
  const requestedColumns = readSearchParam(searchParams, TRACE_TABLE_COLUMNS_PARAM);
  if (!requestedColumns) return [...DEFAULT_TRACE_TABLE_COLUMNS];
  const requestedSet = new Set(
    requestedColumns
      .split(',')
      .map(normalizeTraceTableColumn)
      .filter((column): column is TraceTableColumnKey => column != null)
  );
  if (requestedSet.size === 0) return [...DEFAULT_TRACE_TABLE_COLUMNS];
  requestedSet.add('start');
  return TRACE_TABLE_COLUMN_KEYS.filter(column => requestedSet.has(column));
}

function isDefaultTraceTableColumns(columns: TraceTableColumnKey[]) {
  return (
    columns.length === DEFAULT_TRACE_TABLE_COLUMNS.length &&
    DEFAULT_TRACE_TABLE_COLUMNS.every((column, index) => columns[index] === column)
  );
}

function normalizeTraceRouteColumns(columns?: TraceTableColumnKey[]) {
  if (!columns?.length) return [...DEFAULT_TRACE_TABLE_COLUMNS];
  const columnSet = new Set(columns);
  columnSet.add('start');
  return TRACE_TABLE_COLUMN_KEYS.filter(column => columnSet.has(column));
}

export function readTraceManageRouteState(searchParams?: TraceManageSearchParams): TraceManageRouteState {
  const reader = createCompatSearchParamReader(searchParams);
  return {
    initialQuery: queryStateFromParams(reader),
    currentView: resolveTraceExplorerView(reader),
    routeContext: readSignalRouteContext(reader),
    shouldCleanUrl: hasTraceRouteDisplayLabels(searchParams) || hasUnsanitizedTraceTimeBounds(searchParams)
  };
}

export function buildTraceRouteUrl(query: TraceQueryState, options?: { view?: TraceExplorerView }): string {
  const params = new URLSearchParams();
  if (query.traceId.trim()) params.set('traceId', query.traceId.trim());
  if (query.spanId.trim()) params.set('spanId', query.spanId.trim());
  if (query.serviceName.trim()) params.set('serviceName', query.serviceName.trim());
  if (query.resourceFilter?.trim()) params.set('resourceFilter', query.resourceFilter.trim());
  if (query.attributeFilter?.trim()) params.set('attributeFilter', query.attributeFilter.trim());
  if (query.operationName?.trim()) params.set('operationName', query.operationName.trim());
  const minDurationMs = readNonNegativeDurationValue(query.minDurationMs);
  const maxDurationMs = readNonNegativeDurationValue(query.maxDurationMs);
  if (minDurationMs) params.set('minDurationMs', minDurationMs);
  if (maxDurationMs) params.set('maxDurationMs', maxDurationMs);
  if (query.groupBy?.trim()) params.set('groupBy', query.groupBy.trim());
  const groupLimit = readPositiveGroupLimitSearchParam({ get: name => (name === 'groupLimit' ? query.groupLimit || '' : null) }, 'groupLimit');
  if (groupLimit) params.set('groupLimit', groupLimit);
  const groupOrder = resolveTraceGroupOrder({ get: name => (name === 'groupOrder' ? query.groupOrder || '' : null) });
  if (query.groupBy?.trim() && groupOrder !== DEFAULT_TRACE_GROUP_ORDER) params.set('groupOrder', groupOrder);
  const groupMinCount = readPositiveGroupMinCountSearchParam({ get: name => (name === 'groupMinCount' ? query.groupMinCount || '' : null) });
  if (query.groupBy?.trim() && groupMinCount) params.set('groupMinCount', groupMinCount);
  if (query.errorOnly) params.set('errorOnly', 'true');
  if (query.spanScope !== DEFAULT_TRACE_SPAN_SCOPE) params.set(TRACE_SPAN_SCOPE_PARAM, query.spanScope);
  const listPageSize = resolveTraceListPageSize({ get: name => (name === TRACE_LIST_PAGE_SIZE_PARAM ? query.listPageSize || '' : null) });
  if (listPageSize !== DEFAULT_TRACE_LIST_PAGE_SIZE) params.set(TRACE_LIST_PAGE_SIZE_PARAM, listPageSize);
  const listPageIndex = resolveTraceListPageIndex({ get: name => (name === TRACE_LIST_PAGE_INDEX_PARAM ? query.listPageIndex || '' : null) });
  if (listPageIndex !== DEFAULT_TRACE_LIST_PAGE_INDEX) params.set(TRACE_LIST_PAGE_INDEX_PARAM, listPageIndex);
  const columns = normalizeTraceRouteColumns(query.columns);
  if (!isDefaultTraceTableColumns(columns)) params.set(TRACE_TABLE_COLUMNS_PARAM, columns.join(','));
  if (options?.view && options.view !== 'list') params.set(TRACE_EXPLORER_VIEW_PARAM, options.view);
  const queryString = params.toString();
  return queryString ? `/trace/manage?${queryString}` : '/trace/manage';
}

function appendTraceQueryContext(params: URLSearchParams, routeContext: SignalRouteContext = {}) {
  const entityId = readEntityIdRouteParam(routeContext.entityId);
  if (entityId) {
    params.set('entityId', entityId);
  }
  const entityType = routeContext.entityType?.trim();
  if (entityType && /^[A-Za-z0-9_.:-]+$/.test(entityType)) {
    params.set('entityType', entityType);
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
): { listUrl: string; overviewUrl: string; groupByUrl?: string } {
  const listPageSize = resolveTraceListPageSize({ get: name => (name === TRACE_LIST_PAGE_SIZE_PARAM ? query.listPageSize || '' : null) });
  const listPageIndex = resolveTraceListPageIndex({ get: name => (name === TRACE_LIST_PAGE_INDEX_PARAM ? query.listPageIndex || '' : null) });
  const listParams = new URLSearchParams({ pageIndex: listPageIndex, pageSize: listPageSize });
  if (query.traceId.trim()) listParams.set('traceId', query.traceId.trim());
  if (query.serviceName.trim()) listParams.set('serviceName', query.serviceName.trim());
  appendTraceFilterParams(listParams, query);
  if (query.operationName?.trim()) listParams.set('operationName', query.operationName.trim());
  appendTraceDurationParams(listParams, query);
  if (query.errorOnly) listParams.set('errorOnly', 'true');
  listParams.set(TRACE_SPAN_SCOPE_PARAM, query.spanScope);
  appendTraceQueryContext(listParams, routeContext);

  const overviewParams = new URLSearchParams();
  if (query.traceId.trim()) overviewParams.set('traceId', query.traceId.trim());
  if (query.serviceName.trim()) overviewParams.set('serviceName', query.serviceName.trim());
  appendTraceFilterParams(overviewParams, query);
  if (query.operationName?.trim()) overviewParams.set('operationName', query.operationName.trim());
  appendTraceDurationParams(overviewParams, query);
  if (query.errorOnly) overviewParams.set('errorOnly', 'true');
  overviewParams.set(TRACE_SPAN_SCOPE_PARAM, query.spanScope);
  appendTraceQueryContext(overviewParams, routeContext);

  const groupByParams = new URLSearchParams(overviewParams);
  const groupBy = query.groupBy?.trim();
  if (groupBy) {
    groupByParams.set('groupBy', groupBy);
    const groupLimit = readPositiveGroupLimitSearchParam({ get: name => (name === 'groupLimit' ? query.groupLimit || '' : null) }, 'groupLimit');
    if (groupLimit) groupByParams.set('limit', groupLimit);
    const groupOrder = resolveTraceGroupOrder({ get: name => (name === 'groupOrder' ? query.groupOrder || '' : null) });
    if (groupOrder !== DEFAULT_TRACE_GROUP_ORDER) groupByParams.set('orderBy', groupOrder);
    const groupMinCount = readPositiveGroupMinCountSearchParam({ get: name => (name === 'groupMinCount' ? query.groupMinCount || '' : null) });
    if (groupMinCount) groupByParams.set('minCount', groupMinCount);
  }

  return {
    listUrl: `/traces/list?${listParams.toString()}`,
    overviewUrl: overviewParams.toString() ? `/traces/stats/overview?${overviewParams.toString()}` : '/traces/stats/overview',
    ...(groupBy ? { groupByUrl: `/traces/stats/group-by?${groupByParams.toString()}` } : {})
  };
}

function readNonNegativeDurationValue(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return '';
  return trimmed;
}

function appendTraceDurationParams(params: URLSearchParams, query: TraceQueryState) {
  const minDurationMs = readNonNegativeDurationValue(query.minDurationMs);
  const maxDurationMs = readNonNegativeDurationValue(query.maxDurationMs);
  if (minDurationMs) params.set('minDurationMs', minDurationMs);
  if (maxDurationMs) params.set('maxDurationMs', maxDurationMs);
}

function appendTraceFilterParams(params: URLSearchParams, query: TraceQueryState) {
  const resourceFilter = query.resourceFilter?.trim() || '';
  if (resourceFilter) {
    params.set('resourceFilter', resourceFilter);
  }
  const attributeFilter = query.attributeFilter?.trim() || '';
  if (attributeFilter) {
    params.set('attributeFilter', attributeFilter);
  }
}
