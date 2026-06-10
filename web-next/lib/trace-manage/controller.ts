import type { LogEntry, PageResult, TraceDetail, TraceSpanNode } from '@/lib/types';

type ApiGetter = <T>(url: string) => Promise<T>;

export type TraceRelatedLogsQuery = {
  traceId?: string | null;
  spanId?: string | null;
  serviceName?: string | null;
  serviceNamespace?: string | null;
  environment?: string | null;
  entityId?: string | number | null;
  entityName?: string | null;
  collector?: string | null;
  template?: string | null;
  source?: string | null;
  resourceFilter?: string | null;
  attributeFilter?: string | null;
  start?: string | number | null;
  end?: string | number | null;
  timeRange?: string | null;
  tz?: string | null;
  pageIndex?: string | number | null;
  pageSize?: string | number | null;
};

const RELATED_LOG_CONTEXT_KEYS: Array<keyof TraceRelatedLogsQuery> = [
  'traceId',
  'spanId',
  'serviceName',
  'serviceNamespace',
  'environment',
  'entityId',
  'entityName',
  'collector',
  'template',
  'source',
  'resourceFilter',
  'attributeFilter',
  'start',
  'end',
  'timeRange',
  'tz'
];

function appendRelatedLogParam(params: URLSearchParams, key: string, value: string | number | null | undefined) {
  const normalized = String(value ?? '').trim();
  if (normalized) params.set(key, normalized);
}

export function buildTraceRelatedLogsUrl(query: TraceRelatedLogsQuery = {}) {
  const params = new URLSearchParams();
  RELATED_LOG_CONTEXT_KEYS.forEach(key => {
    appendRelatedLogParam(params, key, query[key]);
  });
  if (!params.get('traceId') && !params.get('serviceName') && !params.get('entityId')) {
    return null;
  }
  appendRelatedLogParam(params, 'pageIndex', query.pageIndex ?? '0');
  appendRelatedLogParam(params, 'pageSize', query.pageSize ?? '5');
  return `/logs/list?${params.toString()}`;
}

export function buildTraceRelatedLogsUrlFromHref(
  logsHref: string | null | undefined,
  options: Pick<TraceRelatedLogsQuery, 'pageIndex' | 'pageSize'> = {}
) {
  if (!logsHref) return null;
  const href = new URL(logsHref, 'http://localhost');
  const query = RELATED_LOG_CONTEXT_KEYS.reduce<TraceRelatedLogsQuery>((context, key) => {
    const value = href.searchParams.get(key);
    if (value?.trim()) {
      return { ...context, [key]: value };
    }
    return context;
  }, {});
  return buildTraceRelatedLogsUrl({
    ...query,
    pageIndex: options.pageIndex,
    pageSize: options.pageSize
  });
}

export async function loadTraceDetailBundle(apiGet: ApiGetter, traceId: string): Promise<{
  detail: TraceDetail;
  spans: TraceSpanNode[];
}> {
  const [detail, spans] = await Promise.all([
    apiGet<TraceDetail>(`/traces/${encodeURIComponent(traceId)}`),
    apiGet<TraceSpanNode[]>(`/traces/${encodeURIComponent(traceId)}/spans`)
  ]);

  return { detail, spans };
}

export async function loadRelatedLogs(apiGet: ApiGetter, query: string | TraceRelatedLogsQuery): Promise<LogEntry[]> {
  const url = typeof query === 'string'
    ? buildTraceRelatedLogsUrl({ traceId: query })
    : buildTraceRelatedLogsUrl(query);
  if (!url) return [];
  const result = await apiGet<PageResult<LogEntry>>(url);
  return result.content || [];
}
