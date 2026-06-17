import { apiMessageGet } from '@/lib/api-client';
import { bodyText, formatDurationNanos, formatTime } from '@/lib/format';
import { severityLabel } from '@/lib/log-manage/display-mapping';
import { buildLogUrls, type LogQueryState } from '@/lib/log-manage/query-state';
import { buildOtlpMetricsConsoleUrl } from '@/lib/otlp-metrics/controller';
import { buildMetricSeriesViews, type OtlpMetricSeriesView } from '@/lib/otlp-metrics/view-model';
import { buildTraceUrls, type TraceQueryState } from '@/lib/trace-manage/query-state';
import type { LogEntry, OtlpMetricsConsole, PageResult, TraceListItem } from '@/lib/types';
import { explorerSignalTone, type ExplorerResultRow } from './view-model';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;
type ApiGetter = <T>(url: string) => Promise<T>;

export type ExplorerApiState = 'ready' | 'empty';
export type ExplorerSignalFilter = 'all' | 'trace' | 'log' | 'metric';

export type ExplorerQueryState = {
  q: string;
  signal: ExplorerSignalFilter;
};

export type ExplorerReadData = {
  rows: ExplorerResultRow[];
  apiState: ExplorerApiState;
  apiOwner: 'trace-log-bff-query-api';
  query: ExplorerQueryState;
  sourceUrls: {
    traces: string | null;
    logs: string | null;
    metrics: string | null;
  };
  traceTotal: number;
  logTotal: number;
  metricTotal: number;
};

const DEFAULT_EXPLORER_QUERY: ExplorerQueryState = {
  q: '',
  signal: 'all'
};

const EXPLORER_SIGNAL_FILTERS: ExplorerSignalFilter[] = ['all', 'trace', 'log', 'metric'];

function readAttribute(record: Record<string, unknown> | undefined, key: string): string {
  const value = record?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function truncateOperation(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.length > 96 ? `${trimmed.slice(0, 93)}...` : trimmed;
}

function traceStatusLabel(item: TraceListItem, t: Translator) {
  const status = item.status?.trim();
  const hasError = Boolean(item.errorSpanCount && item.errorSpanCount > 0) || Boolean(status && status.toUpperCase().includes('ERROR'));
  if (hasError) return t('explorer.status.error');
  if (status && status.toUpperCase() !== 'UNSET') return status;
  return t('explorer.status.normal');
}

function buildTraceExplorerApiRow(item: TraceListItem, index: number, t: Translator): ExplorerResultRow {
  const traceId = item.traceId || `trace-${index + 1}`;
  const service = item.serviceName?.trim() || '-';
  const traceHref = item.traceId
    ? `/trace/manage?traceId=${encodeURIComponent(item.traceId)}`
    : service !== '-'
      ? `/trace/manage?serviceName=${encodeURIComponent(service)}`
      : '/trace/manage';

  return {
    key: `trace:${traceId}`,
    signalKey: 'trace',
    signalTone: explorerSignalTone('trace'),
    href: traceHref,
    signal: t('explorer.rows.trace.signal'),
    service,
    operation: item.rootSpanName?.trim() || traceId,
    status: traceStatusLabel(item, t),
    duration: formatDurationNanos(item.durationNanos),
    timestamp: formatTime(item.startTime)
  };
}

function buildLogExplorerApiRow(entry: LogEntry, index: number, t: Translator): ExplorerResultRow {
  const message = truncateOperation(bodyText(entry.body), `log-${index + 1}`);
  const service = readAttribute(entry.resource, 'service.name') || readAttribute(entry.attributes, 'service.name') || '-';
  const logHref = entry.traceId?.trim()
    ? `/log/manage?traceId=${encodeURIComponent(entry.traceId.trim())}`
    : `/log/manage?search=${encodeURIComponent(message)}`;

  return {
    key: `log:${entry.timeUnixNano ?? '0'}:${entry.traceId || 'none'}:${entry.spanId || 'none'}:${index}`,
    signalKey: 'log',
    signalTone: explorerSignalTone('log'),
    href: logHref,
    signal: t('explorer.rows.log.signal'),
    service,
    operation: message,
    status: severityLabel(entry),
    duration: '-',
    timestamp: formatTime(entry.timeUnixNano ? entry.timeUnixNano / 1_000_000 : null)
  };
}

function readMetricSeriesLabel(series: OtlpMetricSeriesView, ...keys: string[]) {
  for (const key of keys) {
    const value = series.labels[key]?.trim();
    if (value) return value;
  }
  return '';
}

function buildMetricExplorerApiRow(series: OtlpMetricSeriesView, index: number, t: Translator): ExplorerResultRow {
  const service = readMetricSeriesLabel(series, 'service.name', 'service_name', 'serviceName') || '-';
  const latestPoint = [...series.points].reverse().find(([, value]) => value != null);
  const params = new URLSearchParams({ query: series.name });
  if (service !== '-') params.set('serviceName', service);

  return {
    key: `metric:${series.key}:${index}`,
    signalKey: 'metric',
    signalTone: explorerSignalTone('metric'),
    href: `/ingestion/otlp/metrics?${params.toString()}`,
    signal: t('explorer.rows.metric.signal'),
    service,
    operation: series.name,
    status: t('explorer.status.normal'),
    duration: series.latestValue == null ? '-' : String(series.latestValue),
    timestamp: formatTime(latestPoint?.[0] ?? null)
  };
}

function normalizeSignalFilter(value: string | null | undefined): ExplorerSignalFilter {
  const normalized = value?.trim().toLowerCase();
  return EXPLORER_SIGNAL_FILTERS.includes(normalized as ExplorerSignalFilter) ? (normalized as ExplorerSignalFilter) : 'all';
}

export function readExplorerQueryState(searchParams: { get(name: string): string | null } | URLSearchParams | null | undefined): ExplorerQueryState {
  return {
    q: searchParams?.get('q')?.trim() || '',
    signal: normalizeSignalFilter(searchParams?.get('signal'))
  };
}

export function buildExplorerRouteUrl(query: ExplorerQueryState): string {
  const params = new URLSearchParams();
  if (query.q.trim()) params.set('q', query.q.trim());
  if (query.signal !== 'all') params.set('signal', query.signal);
  const queryString = params.toString();
  return queryString ? `/explorer?${queryString}` : '/explorer';
}

function buildTraceQuery(query: ExplorerQueryState): TraceQueryState {
  return {
    traceId: '',
    spanId: '',
    serviceName: query.q.trim(),
    errorOnly: false,
    spanScope: 'root'
  };
}

function buildLogQuery(query: ExplorerQueryState): LogQueryState {
  return {
    search: query.q.trim(),
    logContent: '',
    traceId: '',
    spanId: '',
    severityNumber: '',
    severityText: ''
  };
}

function buildMetricsQuery(query: ExplorerQueryState) {
  return {
    query: query.q.trim() || undefined,
    aggregation: 'avg',
    groupBy: 'service_name',
    timeRange: 'last-30m'
  };
}

export function buildExplorerReadUrls(query: ExplorerQueryState = DEFAULT_EXPLORER_QUERY) {
  return {
    traces: query.signal === 'log' || query.signal === 'metric' ? null : buildTraceUrls(buildTraceQuery(query)).listUrl,
    logs: query.signal === 'trace' || query.signal === 'metric' ? null : buildLogUrls(buildLogQuery(query)).listUrl,
    metrics: query.signal === 'trace' || query.signal === 'log' ? null : buildOtlpMetricsConsoleUrl(buildMetricsQuery(query))
  };
}

export function normalizeExplorerReadData(
  payload: {
    traces?: PageResult<TraceListItem>;
    logs?: PageResult<LogEntry>;
    metrics?: OtlpMetricsConsole;
  },
  t: Translator,
  query: ExplorerQueryState = DEFAULT_EXPLORER_QUERY
): ExplorerReadData {
  const traceRows = (payload.traces?.content || []).slice(0, 4).map((item, index) => buildTraceExplorerApiRow(item, index, t));
  const logRows = (payload.logs?.content || []).slice(0, 4).map((entry, index) => buildLogExplorerApiRow(entry, index, t));
  const metricSeries = payload.metrics ? buildMetricSeriesViews(payload.metrics, t) : [];
  const metricRows = metricSeries.slice(0, 4).map((series, index) => buildMetricExplorerApiRow(series, index, t));
  const rows = [...traceRows, ...logRows, ...metricRows];
  const sourceUrls = buildExplorerReadUrls(query);

  return {
    rows,
    apiState: rows.length > 0 ? 'ready' : 'empty',
    apiOwner: 'trace-log-bff-query-api',
    query,
    sourceUrls,
    traceTotal: payload.traces?.totalElements ?? traceRows.length,
    logTotal: payload.logs?.totalElements ?? logRows.length,
    metricTotal: payload.metrics?.stats?.totalSeries ?? metricSeries.length
  };
}

export async function loadExplorerReadData(
  t: Translator,
  apiGet: ApiGetter = apiMessageGet,
  query: ExplorerQueryState = DEFAULT_EXPLORER_QUERY
): Promise<ExplorerReadData> {
  const sourceUrls = buildExplorerReadUrls(query);
  const [traces, logs, metrics] = await Promise.all([
    sourceUrls.traces ? apiGet<PageResult<TraceListItem>>(sourceUrls.traces) : Promise.resolve(undefined),
    sourceUrls.logs ? apiGet<PageResult<LogEntry>>(sourceUrls.logs) : Promise.resolve(undefined),
    sourceUrls.metrics ? apiGet<OtlpMetricsConsole>(sourceUrls.metrics) : Promise.resolve(undefined)
  ]);
  return normalizeExplorerReadData({ traces, logs, metrics }, t, query);
}
