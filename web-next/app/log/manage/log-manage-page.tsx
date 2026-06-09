'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Ban,
  BellPlus,
  BellRing,
  Check,
  Copy,
  Download,
  Eye,
  Filter,
  ListChecks,
  PauseCircle,
  Pencil,
  Play,
  PlayCircle,
  Replace,
  RotateCcw,
  Save,
  Search,
  ScrollText,
  Server,
  Trash2,
  Wifi,
  WifiOff,
  Workflow,
  X
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HzActionGroup, HzAttributeDiagnostics, HzButton, HzButtonIcon, HzButtonLink, HzCheckbox, HzControlStack, HzDataCellText, HzDataTable, HzDetailAside, HzDetailBodyStack, HzDetailRows, HzEmptyState, HzInput, HzLogStreamLiveRow, HzPaginationBar, HzPanelHeader, HzPanelSurface, HzScrollViewport, HzSearchFieldFrame, HzSearchFieldIcon, HzSelect, HzSignalSummaryStrip, HzSignalTrendBars, HzSignalWorkbenchShell, HzStateNotice, HzStatusBadge, HzWorkbenchLayout, type HzStatusTone } from '@hertzbeat/ui';
import { LogRelatedTraceDialog } from '../../../components/log-manage/log-related-trace-dialog';
import { LogStreamDetailDialog } from '../../../components/log-manage/log-stream-detail-dialog';
import { buildTimeRangeControlLabels, TimeRangeControl } from '@/components/observability/time-range-control';
import { useI18n } from '@/components/providers/i18n-provider';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { apiMessageGet } from '@/lib/api-client';
import { copyTextToClipboard } from '@/lib/browser-clipboard';
import { bodyText, formatTime } from '@/lib/format';
import { buildLogCsv, buildLogExportFilename, buildLogJsonl, type LogExportExtraColumn, type LogExportFormat } from '@/lib/log-manage/export';
import { logSeverityTone, severityLabel, type LogSeverityTone } from '@/lib/log-manage/display-mapping';
import { saveSignalDashboardPanelEditContext } from '@/lib/signal-dashboards';
import {
  createSignalDashboardPanelDraft,
  applySignalDashboardPanelEditContext,
  saveSignalDashboardPanelDraft,
  type SignalDashboardPanelVisualization
} from '@/lib/signal-dashboard-panel-drafts';
import {
  buildSignalSavedViewKey,
  deleteSignalSavedQueryView,
  loadSignalSavedQueryViews,
  saveSignalSavedQueryView,
  type SignalSavedQueryView,
  type SignalSavedQueryViewPersistenceMode
} from '@/lib/signal-saved-views';
import {
  buildLogStreamUrl,
  buildLogUrls,
  DEFAULT_LOG_DISPLAY_FORMAT,
  DEFAULT_LOG_LIST_PAGE_INDEX,
  DEFAULT_LOG_LIST_PAGE_SIZE,
  DEFAULT_LOG_MAX_LINES,
  DEFAULT_LOG_TABLE_COLUMNS,
  LOG_DISPLAY_FORMAT_PARAM,
  MAX_LOG_FIELD_COLUMNS,
  LOG_LIST_PAGE_SIZE_OPTIONS,
  LOG_MAX_LINES_PARAM,
  LOG_TABLE_COLUMN_KEYS,
  resolveBrowserLogStreamUrl,
  resolveLogListPageIndex,
  resolveLogListPageSize,
  resolveLogMaxLines,
  type LogDisplayFormat,
  type LogFieldColumnKey,
  type LogGroupOrder,
  type LogTableColumnKey,
  type LogManageRouteState,
  type LogQueryState,
  type LogWorkbenchView
} from '@/lib/log-manage/query-state';
import { buildStreamItemKey, enqueuePendingStreamItem, mergeStreamBatch } from '../../../lib/log-manage/stream-buffer';
import { shouldShowStreamPauseOverlay } from '../../../lib/log-manage/stream-notices';
import { resolveStreamSelection } from '../../../lib/log-manage/stream-selection';
import {
  findSelectedStreamRowIndex,
  readStreamViewportState,
  resolveResetStreamViewportState,
  resolveStreamWindow,
  STREAM_VIEWPORT_ROW_HEIGHT
} from '../../../lib/log-manage/stream-viewport';
import {
  buildLogAttributeRows,
  buildLogAlertRuleDraft,
  buildLogCodeNavigationUrl,
  buildLogAttributionDiagnostics,
  buildLogExplorerRows,
  buildLogHandoffLinks,
  buildLogMetricsPreviewTargets,
  buildSelectedLogFacts,
  buildSelectedLogRows,
  type LogAttributionDiagnostic,
  type LogAttributeRow,
  type LogExplorerRow
} from '@/lib/log-manage/view-model';
import { buildSignalEntityContextRows, isDashboardReturnContext, readSignalPanelEditContext, type SignalPanelEditContext, type SignalRouteContext } from '@/lib/signal-route-context';
import { loadTraceDetailBundle } from '../../../lib/trace-manage/controller';
import { buildSelectedSpanFacts, buildTraceWaterfallRows } from '../../../lib/trace-manage/view-model';
import { resolveAppliedTimeContext, sanitizeTimeContext, type TimeContext } from '@/lib/time-context';
import type { LogEntry, LogOverview, LogTraceCoverage, LogTrendStats, OtlpMetricsConsole, OtlpRelatedMetrics, PageResult, TraceDetail } from '@/lib/types';
import { buildLogManageRoute, buildResetLogManageRoute } from './route-state';

type LogManageData = {
  overview: LogOverview;
  list: PageResult<LogEntry>;
  trend: LogTrendStats;
  coverage: LogTraceCoverage;
  group: LogGroupStats;
  query: LogQueryState;
  loadStatus?: {
    state: 'degraded';
    message: string;
  };
};

type LogGroupStats = {
  groupBy: string;
  groups: Array<{
    value: string;
    count: number;
  }>;
};

type BackendLogOverview = LogOverview & {
  totalCount?: number;
  errorCount?: number;
};

type LogSavedQueryView = SignalSavedQueryView;

type LogExportRowLimit = 'current' | '10000' | '30000' | '50000';
type LogDashboardPanelDraftState = 'idle' | 'saving' | 'saved' | 'failed';

type LogDetailContextPayload = {
  targetTimeUnixNano: number;
  limit: number;
  direction?: 'before' | 'after';
  cursorLogTimeUnixNano?: number | string;
  before?: LogEntry[];
  selected?: LogEntry | null;
  after?: LogEntry[];
  hasMoreBefore?: boolean;
  hasMoreAfter?: boolean;
};

type LogDetailContextState = {
  loading: boolean;
  error: string | null;
  data: LogDetailContextPayload | null;
};

type LogDetailMetricsPreviewState = {
  loading: boolean;
  error: string | null;
  data: OtlpMetricsConsole[] | null;
};

type LogDetailContextFilters = {
  resourceFilter?: string;
  attributeFilter?: string;
};

type LogDetailContextLoadRequest = {
  direction: 'before' | 'after';
  cursorLogTimeUnixNano: string;
};

type LogDetailContextRow = {
  key: string;
  relation: 'before' | 'selected' | 'after';
  relationLabel: string;
  time: string;
  severity: string;
  body: string;
  service: string;
};

type LogDetailMetricsPreviewRow = {
  title: string;
  copy: string;
  meta?: string;
  query?: string;
  family: 'cpu' | 'memory' | 'other';
  familyLabel: string;
  source: 'pod' | 'node' | 'resource';
  sourceValue?: string;
  href?: string;
  bars: Array<{
    key: string;
    heightPct: number;
    label: string;
    valueLabel: string;
  }>;
};

export type LogManagePageProps = {
  forcedView?: LogWorkbenchView;
  showViewToggle?: boolean;
};

const EMPTY_QUERY: LogQueryState = {
  search: '',
  logContent: '',
  traceId: '',
  spanId: '',
  resourceFilter: '',
  attributeFilter: '',
  severityNumber: '',
  severityText: ''
};

const EMPTY_LOG_MANAGE_ROUTE_STATE: LogManageRouteState = {
  initialQuery: EMPTY_QUERY,
  currentView: 'stream',
  routeContext: {},
  shouldCleanUrl: false
};

const quickSeverityFilters = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
const maxStreamEntries = 10000;
const maxPendingStreamEntries = 1000;
const LOG_MANAGE_SETTLED_CACHE_TTL_MS = 10_000;
const LOG_MANAGE_API_TIMEOUT_MS = 20_000;
const LOG_SAVED_QUERY_VIEW_STORAGE_KEY = 'hertzbeat.log-manage.saved-query-views';
const LOG_SAVED_QUERY_VIEW_LIMIT = 5;
const LOG_SAVED_QUERY_VIEW_PERSISTENCE_OWNER: Record<SignalSavedQueryViewPersistenceMode, string> = {
  'server-first': 'hertzbeat-api',
  'local-fallback': 'browser-local-storage'
};
const LOG_EXPORT_ROW_LIMITS: LogExportRowLimit[] = ['current', '10000', '30000', '50000'];
const LOG_EXPORT_FETCH_PAGE_SIZE = 1000;
const LOG_CONTEXT_WINDOW_MS = 5 * 60 * 1000;
const LOG_CONTEXT_LIST_PAGE_SIZE = '20';
const LOG_DETAIL_CONTEXT_DEFAULT_LIMIT = 10;
const LOG_DETAIL_CONTEXT_LIMIT_STEP = 10;

function isSafeLogAttributeFilterKey(key: string) {
  return /^[A-Za-z0-9_.:-]+$/.test(key.trim());
}

function isSafeLogAttributeFilterValue(value: string) {
  const trimmed = value.trim();
  return Boolean(trimmed && trimmed !== '-' && !trimmed.includes(',') && !/\s+and\s+/i.test(trimmed));
}

function resolveLogAttributeFilterKind(row: LogAttributeRow): 'resource' | 'attribute' | null {
  if (row.key.startsWith('resource-')) return 'resource';
  if (row.key.startsWith('attribute-')) return 'attribute';
  return null;
}

function buildLogAttributeFilterExpression(row: LogAttributeRow, objectValueLabel: string) {
  const kind = resolveLogAttributeFilterKind(row);
  const key = row.name.trim();
  const value = row.value.trim();
  if (!kind || value === objectValueLabel || !isSafeLogAttributeFilterKey(key) || !isSafeLogAttributeFilterValue(value)) {
    return null;
  }
  return { kind, expression: kind === 'attribute' ? `${key}:${value}` : `${key}=${value}` };
}

function buildLogAttributeExcludeExpression(row: LogAttributeRow, objectValueLabel: string) {
  const kind = resolveLogAttributeFilterKind(row);
  const key = row.name.trim();
  const value = row.value.trim();
  if (!kind || value === objectValueLabel || !isSafeLogAttributeFilterKey(key) || !isSafeLogAttributeFilterValue(value)) {
    return null;
  }
  return { kind, expression: `${key}!=${value}` };
}

function buildLogAttributeContainsExpression(row: LogAttributeRow, objectValueLabel: string) {
  const kind = resolveLogAttributeFilterKind(row);
  const key = row.name.trim();
  const value = row.value.trim();
  if (!kind || value === objectValueLabel || !isSafeLogAttributeFilterKey(key) || !isSafeLogAttributeFilterValue(value)) {
    return null;
  }
  return { kind, expression: `${key} CONTAINS ${value}` };
}

function buildLogAttributeNotContainsExpression(row: LogAttributeRow, objectValueLabel: string) {
  const kind = resolveLogAttributeFilterKind(row);
  const key = row.name.trim();
  const value = row.value.trim();
  if (!kind || value === objectValueLabel || !isSafeLogAttributeFilterKey(key) || !isSafeLogAttributeFilterValue(value)) {
    return null;
  }
  return { kind, expression: `${key} NOT CONTAINS ${value}` };
}

function buildLogAttributeExistsExpression(row: LogAttributeRow) {
  const kind = resolveLogAttributeFilterKind(row);
  const key = row.name.trim();
  if (!kind || !isSafeLogAttributeFilterKey(key)) {
    return null;
  }
  return { kind, expression: `${key} EXISTS` };
}

function buildLogAttributeNotExistsExpression(row: LogAttributeRow) {
  const kind = resolveLogAttributeFilterKind(row);
  const key = row.name.trim();
  if (!kind || !isSafeLogAttributeFilterKey(key)) {
    return null;
  }
  return { kind, expression: `${key} NOT EXISTS` };
}

function buildLogAttributeGroupBy(row: LogAttributeRow) {
  const kind = resolveLogAttributeFilterKind(row);
  const key = row.name.trim();
  if (!kind || !isSafeLogAttributeFilterKey(key)) {
    return null;
  }
  return { kind, groupBy: kind === 'attribute' ? `attribute:${key}` : `resource:${key}` };
}

function buildLogAttributeFieldColumn(row: LogAttributeRow): LogFieldColumnKey | null {
  const kind = resolveLogAttributeFilterKind(row);
  const key = row.name.trim();
  if (!kind || !isSafeLogAttributeFilterKey(key)) {
    return null;
  }
  return `${kind}:${key}` as LogFieldColumnKey;
}

function buildLogGroupResultFilter(groupBy: string, value: string) {
  const normalizedGroupBy = groupBy.trim();
  const normalizedValue = value.trim();
  if (!isSafeLogAttributeFilterValue(normalizedValue)) {
    return null;
  }
  if (normalizedGroupBy === 'severity' || normalizedGroupBy === 'severity_text') {
    return { kind: 'severity' as const, value: normalizedValue };
  }
  if (normalizedGroupBy === 'service.name' || normalizedGroupBy === 'service_name') {
    return { kind: 'service' as const, value: normalizedValue };
  }
  if (normalizedGroupBy.startsWith('resource:')) {
    const key = normalizedGroupBy.slice('resource:'.length);
    if (!isSafeLogAttributeFilterKey(key)) return null;
    return { kind: 'resource' as const, expression: `${key}=${normalizedValue}` };
  }
  if (normalizedGroupBy.startsWith('attribute:')) {
    const key = normalizedGroupBy.slice('attribute:'.length);
    if (!isSafeLogAttributeFilterKey(key)) return null;
    return { kind: 'attribute' as const, expression: `${key}:${normalizedValue}` };
  }
  if (!isSafeLogAttributeFilterKey(normalizedGroupBy)) {
    return null;
  }
  return { kind: 'resource' as const, expression: `${normalizedGroupBy}=${normalizedValue}` };
}

function mergeLogAttributeFilterExpression(currentFilter: string | undefined, expression: string) {
  const trimmedFilter = currentFilter?.trim() || '';
  if (!trimmedFilter) return expression;
  const compactFilter = trimmedFilter.replace(/\s+/g, '');
  const compactExpression = expression.replace(/\s+/g, '');
  if (compactFilter.includes(compactExpression)) {
    return trimmedFilter;
  }
  return `${trimmedFilter} and ${expression}`;
}

function resolveNextLogColumns(columns: LogTableColumnKey[] | undefined, column: LogTableColumnKey, checked: boolean) {
  const current = new Set(columns || DEFAULT_LOG_TABLE_COLUMNS);
  if (checked) {
    current.add(column);
  } else if (current.size > 1) {
    current.delete(column);
  }
  return LOG_TABLE_COLUMN_KEYS.filter(key => current.has(key));
}

function parseLogFieldColumn(column: LogFieldColumnKey) {
  const separatorIndex = column.indexOf(':');
  const source = column.slice(0, separatorIndex);
  const name = column.slice(separatorIndex + 1);
  if ((source !== 'resource' && source !== 'attribute') || !name) return null;
  return { source, name };
}

function stringifyLogFieldColumnValue(value: unknown) {
  if (value == null || value === '') return '-';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function readLogFieldColumnValue(entry: LogEntry | null | undefined, column: LogFieldColumnKey) {
  const parsed = parseLogFieldColumn(column);
  if (!parsed) return '-';
  const source = parsed.source === 'resource' ? entry?.resource : entry?.attributes;
  return stringifyLogFieldColumnValue(source?.[parsed.name]);
}

function buildLogLineShareHref(currentLogReturnHref: string, row: LogExplorerRow, entry?: LogEntry | null) {
  const url = new URL(currentLogReturnHref || '/log/manage', 'http://localhost');
  const traceId = row.traceId !== '-' ? row.traceId.trim() : '';
  const spanId = row.spanId !== '-' ? row.spanId.trim() : '';
  if (traceId) url.searchParams.set('traceId', traceId);
  if (spanId) url.searchParams.set('spanId', spanId);
  if (Number.isFinite(entry?.timeUnixNano)) {
    url.searchParams.set('logTimeUnixNano', String(entry?.timeUnixNano));
  }
  const queryString = url.searchParams.toString();
  return queryString ? `${url.pathname}?${queryString}` : url.pathname;
}

function buildLogContextRoute(entry: LogEntry | null, routeContext: SignalRouteContext) {
  if (!Number.isFinite(entry?.timeUnixNano)) {
    return null;
  }
  const timestampMs = Math.floor(Number(entry?.timeUnixNano) / 1_000_000);
  const serviceName = readFirstLogAttribute(entry, ['service.name', 'service_name']) || routeContext.serviceName;
  const environment = readFirstLogAttribute(entry, [
    'deployment.environment.name',
    'deployment_environment_name',
    'environment'
  ]) || routeContext.environment;
  const nextContext: SignalRouteContext = {
    ...routeContext,
    start: String(Math.max(0, timestampMs - LOG_CONTEXT_WINDOW_MS)),
    end: String(timestampMs + LOG_CONTEXT_WINDOW_MS),
    timeRange: undefined,
    from: undefined,
    to: undefined,
    live: 'false',
    ...(serviceName ? { serviceName } : {}),
    ...(environment ? { environment } : {})
  };
  return buildLogManageRoute(
    nextContext,
    {
      ...EMPTY_QUERY,
      logTimeUnixNano: String(entry?.timeUnixNano),
      listPageSize: LOG_CONTEXT_LIST_PAGE_SIZE,
      listPageIndex: DEFAULT_LOG_LIST_PAGE_INDEX
    },
    'list'
  );
}

function buildLogContextApiUrl(
  entry: LogEntry | null,
  routeContext: SignalRouteContext,
  query: LogQueryState,
  limit: number,
  contextFilters: LogDetailContextFilters,
  loadRequest?: LogDetailContextLoadRequest | null
) {
  if (!Number.isFinite(entry?.timeUnixNano)) {
    return null;
  }
  const serviceName = readFirstLogAttribute(entry, ['service.name', 'service_name']) || routeContext.serviceName;
  const serviceNamespace = readFirstLogAttribute(entry, ['service.namespace', 'service_namespace']) || routeContext.serviceNamespace;
  const environment = readFirstLogAttribute(entry, [
    'deployment.environment.name',
    'deployment_environment_name',
    'environment'
  ]) || routeContext.environment;
  const params = new URLSearchParams({
    logTimeUnixNano: String(entry?.timeUnixNano),
    limit: String(limit)
  });
  if (loadRequest) {
    params.set('direction', loadRequest.direction);
    params.set('cursorLogTimeUnixNano', loadRequest.cursorLogTimeUnixNano);
  }
  if (routeContext.entityId && /^\d+$/.test(routeContext.entityId.trim())) {
    params.set('entityId', routeContext.entityId.trim());
  }
  if (serviceName) params.set('serviceName', serviceName);
  if (serviceNamespace) params.set('serviceNamespace', serviceNamespace);
  if (environment) params.set('environment', environment);
  const resourceFilter = contextFilters.resourceFilter
    ? mergeLogAttributeFilterExpression(query.resourceFilter, contextFilters.resourceFilter)
    : query.resourceFilter?.trim();
  const attributeFilter = contextFilters.attributeFilter
    ? mergeLogAttributeFilterExpression(query.attributeFilter, contextFilters.attributeFilter)
    : query.attributeFilter?.trim();
  if (resourceFilter) params.set('resourceFilter', resourceFilter);
  if (attributeFilter) params.set('attributeFilter', attributeFilter);
  return `/logs/context?${params.toString()}`;
}

function logContextEntryKey(entry: LogEntry, index: number) {
  return [
    entry.timeUnixNano == null ? `no-time-${index}` : String(entry.timeUnixNano),
    entry.traceId?.trim() || 'no-trace',
    entry.spanId?.trim() || 'no-span',
    bodyText(entry.body)
  ].join(':');
}

function mergeLogContextEntries(entries: LogEntry[], incoming: LogEntry[] = []) {
  const seen = new Set<string>();
  return [...entries, ...incoming]
    .filter((entry, index) => {
      const key = logContextEntryKey(entry, index);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => Number(left.timeUnixNano || 0) - Number(right.timeUnixNano || 0));
}

function mergeLogDetailContextPayload(
  current: LogDetailContextPayload | null,
  incoming: LogDetailContextPayload | null,
  loadRequest: LogDetailContextLoadRequest | null
): LogDetailContextPayload | null {
  if (!incoming) return current;
  if (!loadRequest || !current) return incoming;
  if (loadRequest.direction === 'before') {
    return {
      ...current,
      before: mergeLogContextEntries(incoming.before || [], current.before || []),
      hasMoreBefore: incoming.hasMoreBefore,
      hasMoreAfter: current.hasMoreAfter
    };
  }
  return {
    ...current,
    after: mergeLogContextEntries(current.after || [], incoming.after || []),
    hasMoreBefore: current.hasMoreBefore,
    hasMoreAfter: incoming.hasMoreAfter
  };
}

function readLogDetailContextCursor(
  payload: LogDetailContextPayload | null,
  direction: LogDetailContextLoadRequest['direction'],
  fallbackSelected: LogEntry | null
) {
  const rows = direction === 'before' ? payload?.before || [] : payload?.after || [];
  const cursorEntry = direction === 'before' ? rows[0] : rows[rows.length - 1];
  const cursor = cursorEntry?.timeUnixNano ?? payload?.selected?.timeUnixNano ?? fallbackSelected?.timeUnixNano ?? payload?.targetTimeUnixNano;
  return Number.isFinite(Number(cursor)) ? String(cursor) : '';
}

function logDetailContextRelationLabel(relation: LogDetailContextRow['relation'], t: LogManageTranslate) {
  if (relation === 'before') return t('log.manage.stream.detail.context.before');
  if (relation === 'selected') return t('log.manage.stream.detail.context.selected');
  return t('log.manage.stream.detail.context.after');
}

function buildLogDetailContextRows(
  payload: LogDetailContextPayload | null,
  fallbackSelected: LogEntry | null,
  t: LogManageTranslate
): LogDetailContextRow[] {
  if (!payload) return [];
  const before = payload.before || [];
  const selected = payload.selected || fallbackSelected;
  const after = payload.after || [];
  const rows = [
    ...before.map((entry, index) => ({ relation: 'before' as const, entry, index })),
    ...(selected ? [{ relation: 'selected' as const, entry: selected, index: 0 }] : []),
    ...after.map((entry, index) => ({ relation: 'after' as const, entry, index }))
  ];
  return rows.map(row => ({
    key: `${row.relation}-${row.entry.timeUnixNano ?? row.index}-${row.index}`,
    relation: row.relation,
    relationLabel: logDetailContextRelationLabel(row.relation, t),
    time: Number.isFinite(row.entry.timeUnixNano) ? formatTime(Number(row.entry.timeUnixNano) / 1_000_000) : '-',
    severity: severityLabel(row.entry),
    body: bodyText(row.entry.body),
    service: readFirstLogAttribute(row.entry, ['service.name', 'service_name']) || '-'
  }));
}

function buildLogMetricsCorrelationRows(entry: LogEntry | null, routeContext: SignalRouteContext, t: LogManageTranslate) {
  if (!entry) return [];
  const rows = [
    {
      title: t('log.manage.stream.detail.metrics.service'),
      copy: readFirstLogAttribute(entry, ['service.name', 'service_name']) || routeContext.serviceName,
      meta: 'resource.service.name'
    },
    {
      title: t('log.manage.stream.detail.metrics.service-namespace'),
      copy: readFirstLogAttribute(entry, ['service.namespace', 'service_namespace']) || routeContext.serviceNamespace,
      meta: 'resource.service.namespace'
    },
    {
      title: t('log.manage.stream.detail.metrics.environment'),
      copy: readFirstLogAttribute(entry, ['deployment.environment.name', 'deployment_environment_name', 'environment']) || routeContext.environment,
      meta: 'resource.deployment.environment.name'
    },
    {
      title: t('log.manage.stream.detail.metrics.k8s-namespace'),
      copy: readFirstLogAttribute(entry, ['k8s.namespace.name', 'k8s_namespace_name']),
      meta: 'resource.k8s.namespace.name'
    },
    {
      title: t('log.manage.stream.detail.metrics.pod'),
      copy: readFirstLogAttribute(entry, ['k8s.pod.name', 'k8s_pod_name']),
      meta: 'resource.k8s.pod.name'
    },
    {
      title: t('log.manage.stream.detail.metrics.node'),
      copy: readFirstLogAttribute(entry, ['k8s.node.name', 'k8s_node_name']),
      meta: 'resource.k8s.node.name'
    },
    {
      title: t('log.manage.stream.detail.metrics.container'),
      copy: readFirstLogAttribute(entry, ['k8s.container.name', 'container.name', 'k8s_container_name']),
      meta: 'resource.k8s.container.name'
    },
    {
      title: t('log.manage.stream.detail.metrics.host'),
      copy: readFirstLogAttribute(entry, ['host.name', 'host_name']),
      meta: 'resource.host.name'
    }
  ];
  return rows.filter((row): row is { title: string; copy: string; meta: string } => Boolean(row.copy));
}

function buildLogMetricsPreviewApiUrl(metricsHref: string | null | undefined, queryOverride?: string) {
  if (!metricsHref) return null;
  const href = new URL(metricsHref, 'http://localhost');
  const sourceParams = href.searchParams;
  const params = new URLSearchParams();
  [
    'query',
    'filter',
    'aggregation',
    'temporalAggregation',
    'groupBy',
    'step',
    'limit',
    'timeRange',
    'from',
    'to',
    'start',
    'end',
    'refresh',
    'live',
    'tz',
    'timezone',
    'entityId',
    'entityName',
    'serviceName',
    'serviceNamespace',
    'environment',
    'source',
    'collector',
    'template',
    'traceId',
    'spanId'
  ].forEach(key => {
    const value = sourceParams.get(key)?.trim();
    if (value) params.set(key, value);
  });
  if (!params.get('serviceName') && !params.get('entityId')) return null;
  if (queryOverride?.trim()) params.set('query', queryOverride.trim());
  if (!params.get('limit')) params.set('limit', '4');
  return `/ingestion/otlp/metrics/console?${params.toString()}`;
}

function buildLogMetricsRelatedApiUrl(metricsHref: string | null | undefined, operationName?: string | null) {
  if (!metricsHref) return null;
  const href = new URL(metricsHref, 'http://localhost');
  const sourceParams = href.searchParams;
  const params = new URLSearchParams();
  [
    'filter',
    'timeRange',
    'from',
    'to',
    'start',
    'end',
    'entityId',
    'entityName',
    'serviceName',
    'serviceNamespace',
    'environment',
    'operationName'
  ].forEach(key => {
    const value = sourceParams.get(key)?.trim();
    if (value) params.set(key, value);
  });
  const operationNameFallback = operationName?.trim();
  if (!params.get('operationName') && operationNameFallback) {
    params.set('operationName', operationNameFallback);
  }
  if (!params.get('serviceName') && !params.get('entityId')) return null;
  params.set('limit', '8');
  return `/ingestion/otlp/metrics/related?${params.toString()}`;
}

function logMetricPreviewTargetSource(target: ReturnType<typeof buildLogMetricsPreviewTargets>[number]) {
  return target.source === 'k8s' ? 'pod' : 'node';
}

function normalizeMetricPreviewLabelKey(key: string) {
  return key.trim().replace(/[^A-Za-z0-9_:]/g, '_').replace(/_+/g, '_');
}

function readLogMetricsPreviewFilterMatchers(metricsHref: string | null | undefined) {
  if (!metricsHref) return [];
  const filter = new URL(metricsHref, 'http://localhost').searchParams.get('filter') || '';
  const matchers: Array<{ key: string; normalizedKey: string; value: string }> = [];
  filter.split(/(?:\s+and\s+|,\s*)/i).forEach(part => {
    const match = part.trim().match(/^([A-Za-z_:][A-Za-z0-9_.:-]*)\s*=\s*"([^"]+)"$/);
    if (!match) return;
    matchers.push({
      key: match[1],
      normalizedKey: normalizeMetricPreviewLabelKey(match[1]),
      value: match[2]
    });
  });
  return matchers;
}

function scoreLogMetricsPreviewFrameForFilter(
  labels: Record<string, string>,
  matchers: ReturnType<typeof readLogMetricsPreviewFilterMatchers>
) {
  if (matchers.length === 0) return 0;
  const normalizedLabels = new Map<string, string>();
  Object.entries(labels).forEach(([key, value]) => {
    normalizedLabels.set(key, value);
    normalizedLabels.set(normalizeMetricPreviewLabelKey(key), value);
  });
  return matchers.reduce((score, matcher) => {
    const value = normalizedLabels.get(matcher.key) || normalizedLabels.get(matcher.normalizedKey);
    return value === matcher.value ? score + 1 : score;
  }, 0);
}

function buildLogMetricsPreviewDiscoveredFallbackQueries(
  metricsHref: string | null | undefined,
  seedPayload: OtlpMetricsConsole | null | undefined
) {
  const filterMatchers = readLogMetricsPreviewFilterMatchers(metricsHref);
  const queriesBySourceFamily = new Map<string, { query: string; score: number }>();
  (seedPayload?.results?.frames || []).forEach(frame => {
    const labels = frame.schema?.labels || {};
    const query = labels.__name__?.trim();
    if (!query) return;
    const family = resolveLogMetricPreviewFamily(frame);
    if (family === 'other') return;
    const source = resolveLogMetricPreviewSource(frame);
    const key = `${source}:${family}`;
    const score = scoreLogMetricsPreviewFrameForFilter(labels, filterMatchers);
    const existing = queriesBySourceFamily.get(key);
    if (!existing || score > existing.score) {
      queriesBySourceFamily.set(key, { query, score });
    }
  });
  return new Map(Array.from(queriesBySourceFamily.entries()).map(([key, value]) => [key, value.query]));
}

function normalizeRelatedMetricsCandidateSource(source: string | null | undefined): 'pod' | 'node' | 'resource' {
  const normalized = source?.trim().toLowerCase() || '';
  if (normalized === 'pod' || normalized === 'k8s' || normalized === 'container') return 'pod';
  if (normalized === 'node' || normalized === 'host') return 'node';
  return 'resource';
}

function buildLogMetricsPreviewRelatedFallbackQueries(relatedPayload: OtlpRelatedMetrics | null | undefined) {
  const queriesBySourceFamily = new Map<string, string>();
  (relatedPayload?.candidates || []).forEach(candidate => {
    const query = candidate.query?.trim();
    const family = candidate.family?.trim().toLowerCase();
    if (!query || (family !== 'cpu' && family !== 'memory')) return;
    const source = normalizeRelatedMetricsCandidateSource(candidate.source);
    if (source === 'resource') return;
    const key = `${source}:${family}`;
    if (!queriesBySourceFamily.has(key)) {
      queriesBySourceFamily.set(key, query);
    }
  });
  return queriesBySourceFamily;
}

function buildLogMetricsPreviewFallbackApiUrls(
  metricsHref: string | null | undefined,
  seedPayload: OtlpMetricsConsole | null | undefined,
  relatedPayload?: OtlpRelatedMetrics | null
) {
  const discoveredCoverage = new Set<string>();
  (seedPayload?.results?.frames || [])
    .filter(hasMetricPreviewSamples)
    .forEach(frame => {
      const labels = frame.schema?.labels || {};
      if (!labels.__name__) return;
      discoveredCoverage.add(`${resolveLogMetricPreviewSource(frame)}:${resolveLogMetricPreviewFamily(frame)}`);
    });
  const discoveredFallbackQueries = buildLogMetricsPreviewDiscoveredFallbackQueries(metricsHref, seedPayload);
  const relatedFallbackQueries = buildLogMetricsPreviewRelatedFallbackQueries(relatedPayload);
  const urls = buildLogMetricsPreviewTargets(metricsHref)
    .filter(target => !discoveredCoverage.has(`${logMetricPreviewTargetSource(target)}:${target.family}`))
    .map(target => {
      const sourceFamily = `${logMetricPreviewTargetSource(target)}:${target.family}`;
      return buildLogMetricsPreviewApiUrl(
        metricsHref,
        discoveredFallbackQueries.get(sourceFamily) || relatedFallbackQueries.get(sourceFamily) || target.query
      );
    });
  const seen = new Set<string>();
  return urls.filter((url): url is string => Boolean(url && !seen.has(url) && seen.add(url)));
}

function collectFulfilledMetricsPreviewPayloads(results: PromiseSettledResult<OtlpMetricsConsole>[]) {
  return results
    .filter((result): result is PromiseFulfilledResult<OtlpMetricsConsole> => result.status === 'fulfilled' && Boolean(result.value))
    .map(result => result.value);
}

function firstRejectedMetricsPreviewReason(results: PromiseSettledResult<OtlpMetricsConsole>[]) {
  return results.find((result): result is PromiseRejectedResult => result.status === 'rejected')?.reason;
}

function buildLogMetricsPreviewExplorerHref(metricsHref: string | null | undefined, query: string | null | undefined) {
  if (!metricsHref || !query?.trim()) return undefined;
  const href = new URL(metricsHref, 'http://localhost');
  href.searchParams.set('query', query.trim());
  const queryString = href.searchParams.toString();
  return queryString ? `${href.pathname}?${queryString}` : href.pathname;
}

function latestMetricFrameSample(frame: NonNullable<NonNullable<OtlpMetricsConsole['results']>['frames']>[number]) {
  const samples = frame.data || [];
  for (let index = samples.length - 1; index >= 0; index -= 1) {
    const sample = samples[index];
    const timestamp = Number(sample?.[0]);
    const value = sample?.[1] == null || sample?.[1] === '' ? null : Number(sample?.[1]);
    if (Number.isFinite(timestamp) && (value == null || Number.isFinite(value))) {
      return { timestamp, value };
    }
  }
  return null;
}

function hasMetricPreviewSamples(frame: NonNullable<NonNullable<OtlpMetricsConsole['results']>['frames']>[number]) {
  return (frame.data || []).some(sample => {
    const timestamp = Number(sample?.[0]);
    const value = sample?.[1] == null || sample?.[1] === '' ? null : Number(sample?.[1]);
    return Number.isFinite(timestamp) && value != null && Number.isFinite(value);
  });
}

function resolveLogMetricPreviewFamily(
  frame: NonNullable<NonNullable<OtlpMetricsConsole['results']>['frames']>[number],
): 'cpu' | 'memory' | 'other' {
  const labels = frame.schema?.labels || {};
  const meta = frame.schema?.meta || {};
  const searchable = [
    labels.__name__,
    labels.name,
    labels.metric,
    labels.metric_name,
    labels['otel.metric.description'],
    labels.description,
    typeof meta.description === 'string' ? meta.description : undefined,
    typeof meta.help === 'string' ? meta.help : undefined
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase();
  if (/\bcpu\b|cpu_|_cpu|cpu\.|\.cpu|processor/.test(searchable)) {
    return 'cpu';
  }
  if (/\bmemory\b|memory_|_memory|memory\.|\.memory|\bmem\b|working[_\s-]?set|\brss\b/.test(searchable)) {
    return 'memory';
  }
  return 'other';
}

function logMetricPreviewFamilyLabel(family: 'cpu' | 'memory' | 'other', t: LogManageTranslate) {
  if (family === 'cpu') return t('log.manage.stream.detail.metrics.preview-family.cpu');
  if (family === 'memory') return t('log.manage.stream.detail.metrics.preview-family.memory');
  return t('log.manage.stream.detail.metrics.preview-family.other');
}

function resolveLogMetricPreviewSource(
  frame: NonNullable<NonNullable<OtlpMetricsConsole['results']>['frames']>[number]
): 'pod' | 'node' | 'resource' {
  const labels = frame.schema?.labels || {};
  if (labels['k8s.pod.name'] || labels.k8s_pod_name || labels['k8s.container.name'] || labels.k8s_container_name) {
    return 'pod';
  }
  if (labels['host.name'] || labels.host_name || labels['k8s.node.name'] || labels.k8s_node_name) {
    return 'node';
  }
  return 'resource';
}

function logMetricPreviewSourceLabel(source: 'pod' | 'node' | 'resource', t: LogManageTranslate) {
  if (source === 'pod') return t('log.manage.stream.detail.metrics.preview-source.pod');
  if (source === 'node') return t('log.manage.stream.detail.metrics.preview-source.node');
  return t('log.manage.stream.detail.metrics.preview-source.resource');
}

function resolveLogMetricPreviewSourceValue(
  frame: NonNullable<NonNullable<OtlpMetricsConsole['results']>['frames']>[number],
  source: 'pod' | 'node' | 'resource'
) {
  const labels = frame.schema?.labels || {};
  if (source === 'pod') {
    return labels['k8s.pod.name'] || labels.k8s_pod_name || labels['k8s.container.name'] || labels.k8s_container_name;
  }
  if (source === 'node') {
    return labels['host.name'] || labels.host_name || labels['k8s.node.name'] || labels.k8s_node_name;
  }
  return labels['service.name'] || labels.service_name || labels.__name__;
}

function logMetricPreviewFamilyRank(family: 'cpu' | 'memory' | 'other') {
  if (family === 'cpu') return 0;
  if (family === 'memory') return 1;
  return 2;
}

function logMetricPreviewSourceRank(source: 'pod' | 'node' | 'resource') {
  if (source === 'pod') return 0;
  if (source === 'node') return 1;
  return 2;
}

function buildLogMetricPreviewBars(frame: NonNullable<NonNullable<OtlpMetricsConsole['results']>['frames']>[number]) {
  const points = (frame.data || [])
    .map((sample, index) => {
      const timestamp = Number(sample?.[0]);
      const value = sample?.[1] == null || sample?.[1] === '' ? null : Number(sample?.[1]);
      return {
        key: `${timestamp || index}-${index}`,
        timestamp,
        value: Number.isFinite(value) ? (value as number) : null
      };
    })
    .filter(point => Number.isFinite(point.timestamp) && point.value != null)
    .slice(-8);
  const max = Math.max(...points.map(point => Math.abs(point.value || 0)), 0);
  return points.map(point => ({
    key: point.key,
    heightPct: max > 0 ? Math.max(8, Math.min(100, Math.round((Math.abs(point.value || 0) / max) * 100))) : 8,
    label: formatTime(point.timestamp),
    valueLabel: String(point.value)
  }));
}

function buildLogMetricsPreviewRows(
  data: OtlpMetricsConsole[] | null,
  t: LogManageTranslate,
  metricsHref?: string | null
): LogDetailMetricsPreviewRow[] {
  const seenFrames = new Set<string>();
  const frames = (data || [])
    .flatMap(console => console.results?.frames || [])
    .filter(hasMetricPreviewSamples)
    .map((frame, index) => ({
      frame,
      index,
      family: resolveLogMetricPreviewFamily(frame),
      source: resolveLogMetricPreviewSource(frame)
    }))
    .filter(item => {
      const { frame } = item;
      const labels = frame.schema?.labels || {};
      const frameKey = JSON.stringify(Object.keys(labels).sort().map(key => [key, labels[key]]));
      if (seenFrames.has(frameKey)) return false;
      seenFrames.add(frameKey);
      return true;
    })
    .sort((left, right) => {
      const sourceDelta = logMetricPreviewSourceRank(left.source) - logMetricPreviewSourceRank(right.source);
      if (sourceDelta !== 0) return sourceDelta;
      const familyDelta = logMetricPreviewFamilyRank(left.family) - logMetricPreviewFamilyRank(right.family);
      if (familyDelta !== 0) return familyDelta;
      return left.index - right.index;
    })
    .map(item => item.frame)
    .slice(0, 6);
  return frames.map((frame, index) => {
    const labels = frame.schema?.labels || {};
    const sample = latestMetricFrameSample(frame);
    const sampleCount = frame.data?.length || 0;
    const family = resolveLogMetricPreviewFamily(frame);
    const familyLabel = logMetricPreviewFamilyLabel(family, t);
    const source = resolveLogMetricPreviewSource(frame);
    const sourceLabel = logMetricPreviewSourceLabel(source, t);
    const sourceValue = resolveLogMetricPreviewSourceValue(frame, source);
    const sampleMeta = t('log.manage.stream.detail.metrics.preview-samples', { count: sampleCount });
    const timeMeta = sample?.timestamp ? formatTime(sample.timestamp) : '';
    const metricMeta = `${sourceLabel} · ${familyLabel} · ${sampleMeta}`;
    return {
      title: labels.__name__ || t('log.manage.stream.detail.metrics.preview-series', { index: index + 1 }),
      query: labels.__name__,
      copy: sample?.value == null ? '-' : String(sample.value),
      meta: timeMeta ? `${metricMeta} · ${timeMeta}` : metricMeta,
      family,
      familyLabel,
      source,
      sourceValue,
      href: buildLogMetricsPreviewExplorerHref(metricsHref, labels.__name__),
      bars: buildLogMetricPreviewBars(frame)
    };
  });
}

function readLogEntryTimeUnixNano(entry?: LogEntry | null) {
  return Number.isFinite(entry?.timeUnixNano) ? String(entry?.timeUnixNano) : '';
}

function matchesRequestedLogLine(entry: LogEntry, requested: { traceId: string; spanId: string; logTimeUnixNano: string }) {
  if (requested.logTimeUnixNano && readLogEntryTimeUnixNano(entry) !== requested.logTimeUnixNano) return false;
  if (requested.traceId && entry.traceId?.trim() !== requested.traceId) return false;
  if (requested.spanId && entry.spanId?.trim() !== requested.spanId) return false;
  return Boolean(requested.traceId || requested.logTimeUnixNano);
}

function logColumnLabel(column: LogTableColumnKey, t: LogManageTranslate) {
  if (column === 'time') return t('log.manage.list.column.time');
  if (column === 'severity') return t('log.manage.list.column.severity');
  if (column === 'service') return t('log.manage.list.column.service');
  if (column === 'body') return t('log.manage.list.column.body');
  if (column === 'trace-id') return t('log.manage.detail.trace-id');
  return t('log.manage.detail.span-id');
}

function logDisplayFormatLabel(format: LogDisplayFormat, t: LogManageTranslate) {
  if (format === 'raw') return t('log.manage.display.format.raw');
  if (format === 'column') return t('log.manage.display.format.column');
  return t('log.manage.display.format.default');
}

function normalizeLogDisplayFormat(value: string): LogDisplayFormat {
  if (value === 'raw' || value === 'column') return value;
  return DEFAULT_LOG_DISPLAY_FORMAT;
}

function normalizeLogMaxLines(value: string | undefined) {
  return resolveLogMaxLines({ get: name => (name === LOG_MAX_LINES_PARAM ? value || '' : null) });
}

function logBodyTextClass(displayFormat: LogDisplayFormat) {
  if (displayFormat === 'raw') return 'block min-w-0 whitespace-pre-wrap break-words font-mono text-[12px] leading-5 text-[#e8edf5]';
  if (displayFormat === 'column') return 'block min-w-0 truncate font-mono text-[12px] text-[#e8edf5]';
  return 'block min-w-0 overflow-hidden font-mono text-[12px] leading-5 text-[#e8edf5]';
}

function logBodyTextStyle(displayFormat: LogDisplayFormat, maxLines: string): React.CSSProperties | undefined {
  if (displayFormat !== DEFAULT_LOG_DISPLAY_FORMAT) return undefined;
  return {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: Number(maxLines)
  };
}

function buildLogBodySearchTerm(message: string) {
  const normalizedMessage = message.replace(/\s+/g, ' ').trim();
  if (!normalizedMessage || normalizedMessage === '-') return null;
  return normalizedMessage.length > 96 ? normalizedMessage.slice(0, 96).trim() : normalizedMessage;
}

function logSeverityStatusTone(severityTone: LogSeverityTone): HzStatusTone {
  if (severityTone === 'danger') return 'critical';
  if (severityTone === 'warning') return 'warning';
  if (severityTone === 'success') return 'success';
  return 'neutral';
}

function logStreamStatusBadgeTone(status: 'connecting' | 'connected' | 'disconnected'): HzStatusTone {
  if (status === 'connected') return 'success';
  if (status === 'connecting') return 'warning';
  return 'critical';
}

function updateDraftField(field: keyof LogQueryState, value: string) {
  return (previous: LogQueryState): LogQueryState => ({
    ...previous,
    [field]: value
  });
}

function normalizeLogOverview(overview: BackendLogOverview): LogOverview {
  return {
    ...overview,
    totalLogs: overview.totalLogs ?? overview.totalCount ?? 0,
    errorLogs: overview.errorLogs ?? overview.errorCount ?? 0
  };
}

function emptyLogManageData(query: LogQueryState, message: string): LogManageData {
  return {
    overview: {
      totalLogs: 0,
      errorLogs: 0,
      distinctTraceCount: 0,
      latestObservedAt: null,
      hasActiveLog: false
    },
    list: {
      content: [],
      totalElements: 0,
      pageIndex: 0,
      pageSize: 8
    },
    trend: {
      hourlyStats: {}
    },
    coverage: {
      traceCoverage: {
        withBothTraceAndSpan: 0,
        withTrace: 0,
        withoutTrace: 0,
        withSpan: 0
      }
    },
    group: {
      groupBy: query.groupBy || '',
      groups: []
    },
    query,
    loadStatus: {
      state: 'degraded',
      message
    }
  };
}

function describeLogManageLoadFailure(error: unknown) {
  return error instanceof Error && error.message ? error.message : 'Log API request failed';
}

async function apiMessageGetWithTimeout<T>(path: string, timeoutMs = LOG_MANAGE_API_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Log API request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      apiMessageGet<T>(path, { signal: controller.signal }),
      timeout
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

type StreamLogItem = {
  key: string;
  entry: LogEntry;
};

type DetailSelection = {
  entry: LogEntry;
  source: 'history' | 'stream';
  selectionState: 'attached' | 'detached';
};

type RelatedTracePreviewState = {
  open: boolean;
  loading: boolean;
  error?: string | null;
  detail: TraceDetail | null;
  selectedSpanId?: string | null;
  selectedEventKey?: string | null;
  contextLog: LogEntry | null;
};

type LogManageTranslate = ReturnType<typeof useI18n>['t'];

function isLogSavedQueryView(value: unknown): value is LogSavedQueryView {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<LogSavedQueryView>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.route === 'string' &&
    candidate.route.startsWith('/log/manage') &&
    typeof candidate.createdAt === 'number'
  );
}

function readLogSavedQueryViews(): LogSavedQueryView[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOG_SAVED_QUERY_VIEW_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isLogSavedQueryView).slice(0, LOG_SAVED_QUERY_VIEW_LIMIT) : [];
  } catch {
    return [];
  }
}

function writeLogSavedQueryViews(views: LogSavedQueryView[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOG_SAVED_QUERY_VIEW_STORAGE_KEY, JSON.stringify(views.slice(0, LOG_SAVED_QUERY_VIEW_LIMIT)));
  } catch {
    // Ignore quota or privacy-mode failures; the current route remains shareable.
  }
}

function compactLogSavedViewValue(value: string | undefined, limit = 32) {
  const trimmed = value?.trim();
  if (!trimmed) return '';
  return trimmed.length > limit ? `${trimmed.slice(0, limit - 1)}...` : trimmed;
}

function isDefaultLogSavedViewColumns(columns: LogTableColumnKey[] | undefined) {
  const nextColumns = columns || DEFAULT_LOG_TABLE_COLUMNS;
  return (
    nextColumns.length === DEFAULT_LOG_TABLE_COLUMNS.length &&
    DEFAULT_LOG_TABLE_COLUMNS.every((column, index) => nextColumns[index] === column)
  );
}

function buildLogSavedViewDescription(query: LogQueryState, routeContext: SignalRouteContext, currentView: LogWorkbenchView, t: LogManageTranslate) {
  const displayFormat = query.displayFormat || DEFAULT_LOG_DISPLAY_FORMAT;
  const maxLines = query.maxLines || DEFAULT_LOG_MAX_LINES;
  const parts = [
    `${t('log.manage.saved-view.field.view')}: ${currentView}`,
    query.search.trim() ? `${t('log.manage.saved-view.field.search')}: ${compactLogSavedViewValue(query.search)}` : '',
    query.severityText.trim() ? `${t('log.manage.saved-view.field.severity')}: ${compactLogSavedViewValue(query.severityText)}` : '',
    routeContext.serviceName?.trim() ? `${t('log.manage.saved-view.field.service')}: ${compactLogSavedViewValue(routeContext.serviceName)}` : '',
    routeContext.environment?.trim() ? `${t('log.manage.saved-view.field.environment')}: ${compactLogSavedViewValue(routeContext.environment)}` : '',
    query.resourceFilter?.trim() ? `${t('log.manage.saved-view.field.resource-filter')}: ${compactLogSavedViewValue(query.resourceFilter)}` : '',
    query.attributeFilter?.trim() ? `${t('log.manage.saved-view.field.attribute-filter')}: ${compactLogSavedViewValue(query.attributeFilter)}` : '',
    query.groupBy?.trim() ? `${t('log.manage.saved-view.field.group-by')}: ${compactLogSavedViewValue(query.groupBy)}` : '',
    query.groupLimit?.trim() ? `${t('log.manage.saved-view.field.group-limit')}: ${compactLogSavedViewValue(query.groupLimit)}` : '',
    query.groupOrder?.trim() ? `${t('log.manage.saved-view.field.group-order')}: ${compactLogSavedViewValue(query.groupOrder)}` : '',
    query.groupMinCount?.trim() ? `${t('log.manage.saved-view.field.group-min-count')}: ${compactLogSavedViewValue(query.groupMinCount)}` : '',
    !isDefaultLogSavedViewColumns(query.columns) ? `${t('log.manage.saved-view.field.columns')}: ${query.columns?.join(',')}` : '',
    displayFormat !== DEFAULT_LOG_DISPLAY_FORMAT ? `${t('log.manage.saved-view.field.format')}: ${displayFormat}` : '',
    maxLines !== DEFAULT_LOG_MAX_LINES ? `${t('log.manage.saved-view.field.max-lines')}: ${maxLines}` : '',
    query.listPageSize && query.listPageSize !== DEFAULT_LOG_LIST_PAGE_SIZE ? `${t('log.manage.saved-view.field.list-page-size')}: ${query.listPageSize}` : '',
    query.listPageIndex && query.listPageIndex !== DEFAULT_LOG_LIST_PAGE_INDEX ? `${t('log.manage.saved-view.field.list-page-index')}: ${query.listPageIndex}` : ''
  ].filter(Boolean);
  return parts.join(' | ') || t('log.manage.saved-view.description.empty');
}

function buildLogSavedViewLabel(query: LogQueryState, routeContext: SignalRouteContext, t: LogManageTranslate) {
  return (
    compactLogSavedViewValue(query.search, 42)
    || compactLogSavedViewValue(routeContext.serviceName, 42)
    || compactLogSavedViewValue(query.severityText, 42)
    || compactLogSavedViewValue(query.groupBy, 42)
    || t('log.manage.saved-view.current-label')
  );
}

function createLogSavedQueryView(
  query: LogQueryState,
  routeContext: SignalRouteContext,
  currentView: LogWorkbenchView,
  route: string,
  t: LogManageTranslate
): LogSavedQueryView {
  const now = Date.now();
  return {
    id: buildSignalSavedViewKey('logs', route),
    label: buildLogSavedViewLabel(query, routeContext, t),
    description: buildLogSavedViewDescription(query, routeContext, currentView, t),
    route,
    createdAt: now
  };
}

function resolveLogDashboardPanelVisualization(view: LogWorkbenchView): SignalDashboardPanelVisualization {
  return view === 'time-series' || view === 'table' ? view : 'list';
}

function appendLogPanelEditContext(route: string, panelEditContext: SignalPanelEditContext | null) {
  if (!panelEditContext) return route;
  const url = new URL(route || '/log/manage', 'http://localhost');
  url.searchParams.set('intent', panelEditContext.intent);
  if (panelEditContext.dashboardKey) url.searchParams.set('dashboardKey', panelEditContext.dashboardKey);
  if (panelEditContext.panelId) url.searchParams.set('panelId', panelEditContext.panelId);
  if (panelEditContext.draftKey) url.searchParams.set('draftKey', panelEditContext.draftKey);
  if (panelEditContext.returnTo) url.searchParams.set('returnTo', panelEditContext.returnTo);
  if (panelEditContext.returnLabel) url.searchParams.set('returnLabel', panelEditContext.returnLabel);
  return `${url.pathname}${url.search}${url.hash}`;
}

function readLogAttribute(source: Record<string, unknown> | undefined, key: string) {
  const value = source?.[key];
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

function readFirstLogAttribute(entry: LogEntry | null | undefined, keys: string[]) {
  for (const key of keys) {
    const value = readLogAttribute(entry?.resource, key) || readLogAttribute(entry?.attributes, key);
    if (value) return value;
  }
  return undefined;
}

function uniqueCompactValues(values: Array<string | undefined>, limit = 3) {
  const seen = new Set<string>();
  return values
    .map(value => value?.trim())
    .filter((value): value is string => Boolean(value && !seen.has(value) && seen.add(value)))
    .slice(0, limit);
}

function hasExactLogEntity(entry: LogEntry | null, routeContext: SignalRouteContext) {
  return Boolean(
    routeContext.entityId ||
      readLogAttribute(entry?.resource, 'hertzbeat.entity_id') ||
      readLogAttribute(entry?.attributes, 'hertzbeat.entity_id') ||
      readLogAttribute(entry?.resource, 'hertzbeat_entity_id') ||
      readLogAttribute(entry?.attributes, 'hertzbeat_entity_id') ||
      readLogAttribute(entry?.resource, 'entity.id') ||
      readLogAttribute(entry?.attributes, 'entity.id')
  );
}

function LogEntityDetailAction({
  href,
  canOpen,
  missingEntityHandoffTitle,
  label,
  actionScope = 'detail',
  showIcon = false
}: {
  href: string;
  canOpen: boolean;
  missingEntityHandoffTitle: string;
  label: string;
  actionScope?: 'header' | 'stream-detail' | 'detail';
  showIcon?: boolean;
}) {
  const icon = showIcon ? (
    <HzButtonIcon
      icon={Workflow}
      data-log-manage-header-action-icon={actionScope === 'header' ? 'entity' : undefined}
      data-log-manage-header-action-icon-owner={actionScope === 'header' ? 'hertzbeat-ui-button-icon' : undefined}
    />
  ) : null;
  const actionScopeProps =
    actionScope === 'header'
      ? { 'data-log-manage-header-action': 'entity' }
      : actionScope === 'stream-detail'
        ? { 'data-log-manage-stream-detail-action': 'entity' }
        : { 'data-log-manage-detail-action': 'entity' };

  if (canOpen) {
    return (
      <HzButtonLink component={Link} data-log-manage-entity-action="true" href={href} size="md" {...actionScopeProps}>
        {icon}
        {label}
      </HzButtonLink>
    );
  }

  return (
    <span className="inline-flex" title={missingEntityHandoffTitle}>
      <HzButton
        data-log-manage-entity-action="true"
        data-log-manage-entity-action-disabled="missing-entity-id"
        size="md"
        disabled
        title={missingEntityHandoffTitle}
        aria-label={missingEntityHandoffTitle}
        {...actionScopeProps}
      >
        {icon}
        {label}
      </HzButton>
    </span>
  );
}

function LogAttributionDiagnosticsPanel({ rows, t }: { rows: LogAttributionDiagnostic[]; t: LogManageTranslate }) {
  if (rows.length === 0) return null;

  return (
    <HzAttributeDiagnostics
      data-log-manage-selected-attribution-diagnostics="hertzbeat-attribute-diagnostics"
      data-log-manage-selected-attribution-diagnostics-owner="hertzbeat-ui-attribute-diagnostics"
      aria-label={t('log.manage.selected.attribution.aria')}
      className="mt-4 rounded-[4px] border border-[#252b35] bg-[#10141b] px-3 py-3"
      title={t('log.manage.selected.attribution.title')}
      namespaceLabel="hertzbeat.*"
      rows={rows.map(row => ({
        key: row.key,
        label: row.label,
        value: row.value,
        meta: row.meta,
        state: row.state,
        stateLabel: row.state === 'present'
          ? t('log.manage.selected.attribution.state.present')
          : t('log.manage.selected.attribution.state.missing'),
        tone: row.state === 'present' ? 'success' : 'critical',
        rowProps: { 'data-log-manage-selected-attribution-diagnostic-state': row.state },
        badgeProps: {
          'data-log-manage-attribution-diagnostic-badge-owner': 'hertzbeat-ui-status-badge',
          'data-log-manage-attribution-diagnostic-badge-state': row.state
        }
      }))}
    />
  );
}

function buildSeedStreamItemKey(entry: LogEntry, index: number) {
  return [
    entry.timeUnixNano == null ? `seed-time-${index}` : String(entry.timeUnixNano),
    entry.traceId?.trim() || 'no-trace',
    entry.spanId?.trim() || 'no-span',
    `seed-${index}`
  ].join(':');
}

function buildInitialStreamItems(entries: LogEntry[] = []) {
  return entries.slice(0, maxStreamEntries).map((entry, index) => ({
    key: buildSeedStreamItemKey(entry, index),
    entry
  }));
}

function buildAutoTraceLogDetailKey(entry: LogEntry, source: 'history' | 'stream', seed: string | number) {
  return [
    source,
    seed,
    entry.timeUnixNano == null ? 'no-time' : String(entry.timeUnixNano),
    entry.traceId?.trim() || 'no-trace',
    entry.spanId?.trim() || 'no-span'
  ].join(':');
}

function stringifyLogEntry(entry: LogEntry | null) {
  if (!entry) return '';
  try {
    return JSON.stringify(entry, null, 2);
  } catch {
    return String(entry.body ?? '');
  }
}

function resolveLogDetailTitle(entry: LogEntry | null, t: LogManageTranslate) {
  if (!entry) return t('log.manage.stream.detail.title');
  const text = bodyText(entry.body);
  return text.length > 96 ? `${text.slice(0, 96)}...` : text || t('log.manage.stream.detail.title');
}

function resolveLogDetailSubtitle(entry: LogEntry | null, t: LogManageTranslate) {
  if (!entry) return t('log.manage.stream.selected.none');
  return (
    readLogAttribute(entry.resource, 'service.name') ||
    readLogAttribute(entry.attributes, 'service.name') ||
    entry.severityText ||
    'HertzBeat Logs'
  );
}

function streamStatusCopy(status: 'connecting' | 'connected' | 'disconnected', t: LogManageTranslate) {
  if (status === 'connected') return t('log.manage.stream.status.connected');
  if (status === 'connecting') return t('log.manage.stream.status.connecting');
  return t('log.manage.stream.status.disconnected');
}

function formatTraceDurationNanos(value?: number | null) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return '-';
  const millis = numeric / 1_000_000;
  if (millis >= 1000) return `${(millis / 1000).toFixed(2)} s`;
  if (millis >= 1) return `${millis.toFixed(2)} ms`;
  return `${numeric} ns`;
}

function buildTraceTimelineTicks(durationNanos?: number | null) {
  const totalNanos = Math.max(Number(durationNanos || 0), 1_000_000);
  return [0, 25, 50, 75, 100].map(percent => ({
    percent,
    label: percent === 0 ? '0 ms' : formatTraceDurationNanos((totalNanos * percent) / 100)
  }));
}

function mergeTraceDetailSpans(detail: TraceDetail, spans: TraceDetail['spans']): TraceDetail {
  return {
    ...detail,
    spans: spans.length > 0 ? spans : detail.spans || []
  };
}

function LogManageExplorer({
  data,
  query,
  draft,
  setDraft,
  applyQuery,
  applyRouteContext,
  resetQuery,
  switchView,
  currentView,
  showViewToggle,
  routeContext,
  timeContext,
  applyTimeContext,
  restoreSavedViewRoute,
  currentLogReturnHref,
  panelEditContext
}: {
  data: LogManageData;
  query: LogQueryState;
  draft: LogQueryState;
  setDraft: React.Dispatch<React.SetStateAction<LogQueryState>>;
  applyQuery: (nextQuery?: LogQueryState) => void;
  applyRouteContext: (nextContext: SignalRouteContext) => void;
  resetQuery: () => void;
  switchView: (view: LogWorkbenchView) => void;
  currentView: LogWorkbenchView;
  showViewToggle: boolean;
  routeContext: SignalRouteContext;
  timeContext: TimeContext;
  applyTimeContext: (timeContext: TimeContext) => void;
  restoreSavedViewRoute: (route: string) => void;
  currentLogReturnHref: string;
  panelEditContext: SignalPanelEditContext | null;
}) {
  const { t } = useI18n();
  const [savedQueryViews, setSavedQueryViews] = useState<LogSavedQueryView[]>(readLogSavedQueryViews);
  const [savedQueryViewPersistenceMode, setSavedQueryViewPersistenceMode] = useState<SignalSavedQueryViewPersistenceMode>('local-fallback');
  const [editingSavedQueryViewId, setEditingSavedQueryViewId] = useState<string | null>(null);
  const [savedQueryViewLabelDraft, setSavedQueryViewLabelDraft] = useState('');
  const [logExportFormat, setLogExportFormat] = useState<LogExportFormat>('csv');
  const [logExportRowLimit, setLogExportRowLimit] = useState<LogExportRowLimit>('current');
  const [dashboardPanelDraftState, setDashboardPanelDraftState] = useState<LogDashboardPanelDraftState>('idle');

  useEffect(() => {
    let cancelled = false;
    void loadSignalSavedQueryViews('logs')
      .then(views => {
        if (cancelled) return;
        const nextViews = views.filter(isLogSavedQueryView).slice(0, LOG_SAVED_QUERY_VIEW_LIMIT);
        setSavedQueryViews(nextViews);
        writeLogSavedQueryViews(nextViews);
        setSavedQueryViewPersistenceMode('server-first');
      })
      .catch(() => {
        if (!cancelled) {
          setSavedQueryViewPersistenceMode('local-fallback');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = buildLogExplorerRows(data.list.content || [], {
    bodyText,
    formatTime,
    severityLabel
  });
  const logEntryByRowKey = useMemo(
    () => new Map(rows.map((row, index) => [row.key, data.list.content?.[index] ?? null])),
    [data.list.content, rows]
  );
  const selectedSeverity = draft.severityText.trim().toUpperCase();
  const latestObservedAt = data.overview.latestObservedAt ? formatTime(data.overview.latestObservedAt) : '-';
  const traceCoverage = data.coverage.traceCoverage?.withBothTraceAndSpan ?? 0;
  const trendBars = Object.entries(data.trend.hourlyStats || {}).slice(-12);
  const groupRows = data.group?.groups || [];
  const activeGroupBy = query.groupBy?.trim() || data.group?.groupBy || '';
  const listPageIndex = Math.max(0, Number.isFinite(data.list.pageIndex) ? Number(data.list.pageIndex) : Number(draft.listPageIndex || DEFAULT_LOG_LIST_PAGE_INDEX) || 0);
  const listPageSize = Math.max(1, Number.isFinite(data.list.pageSize) ? Number(data.list.pageSize) : Number(draft.listPageSize || DEFAULT_LOG_LIST_PAGE_SIZE) || Number(DEFAULT_LOG_LIST_PAGE_SIZE));
  const listTotalElements = Math.max(0, Number.isFinite(data.list.totalElements) ? Number(data.list.totalElements) : rows.length);
  const listTotalPages = Math.max(1, Math.ceil(listTotalElements / listPageSize));
  const listPageStart = listTotalElements === 0 ? 0 : listPageIndex * listPageSize + 1;
  const listPageEnd = listTotalElements === 0 ? 0 : Math.min(listTotalElements, (listPageIndex + 1) * listPageSize);
  const isStreamView = currentView === 'stream';
  const showsLogTimeSeries = currentView === 'list' || currentView === 'time-series';
  const showsLogTable = currentView === 'list' || currentView === 'table';
  const visibleLogColumns = draft.columns || DEFAULT_LOG_TABLE_COLUMNS;
  const visibleLogFieldColumns = useMemo(() => draft.fieldColumns || [], [draft.fieldColumns]);
  const visibleLogColumnSet = useMemo(() => new Set(visibleLogColumns), [visibleLogColumns]);
  const displayFormat = normalizeLogDisplayFormat(draft.displayFormat || DEFAULT_LOG_DISPLAY_FORMAT);
  const maxLines = normalizeLogMaxLines(draft.maxLines || DEFAULT_LOG_MAX_LINES);
  const activeRow = rows[0];
  const activeEntry = data.list.content?.[0] ?? null;
  const alertDraft = buildLogAlertRuleDraft(query, routeContext);
  const handoffLinks = buildLogHandoffLinks(activeEntry, routeContext, {
    intakeReturnTo: currentLogReturnHref,
    traceReturnTo: currentLogReturnHref,
    metricsReturnTo: currentLogReturnHref,
    alertDraft
  });
  const activeServiceName = activeEntry?.resource?.['service.name']?.toString() || activeRow?.service;
  const activeServiceNamespace = activeEntry?.resource?.['service.namespace']?.toString();
  const activeEnvironment = activeEntry?.resource?.['deployment.environment.name']?.toString();
  const activeAttributionDiagnostics = buildLogAttributionDiagnostics(activeEntry, t);
  const activeLogAttributeRows = buildLogAttributeRows(activeEntry, t);
  const activeLogEvidenceRows = [
    [t('log.manage.evidence.time.title'), activeRow?.timestamp || '-', t('log.manage.evidence.time.meta')],
    [t('log.manage.evidence.severity.title'), activeRow?.severity || '-', selectedSeverity || t('log.manage.evidence.severity.current-filter')],
    [t('log.manage.evidence.body.title'), activeRow?.message || '-', t('log.manage.evidence.body.meta')],
    [t('log.manage.evidence.latest.title'), latestObservedAt, t('log.manage.evidence.latest.meta')]
  ];
  const entityContextRows = buildSignalEntityContextRows(routeContext, {
    serviceName: activeServiceName,
    serviceNamespace: activeServiceNamespace,
    environment: activeEnvironment,
    source: routeContext.source || 'OTLP'
  });
  const initialStreamItems = useMemo(() => buildInitialStreamItems(data.list.content || []), [data.list.content]);
  const [streamItems, setStreamItems] = useState<StreamLogItem[]>(() => (currentView === 'stream' ? initialStreamItems : []));
  const [streamStatus, setStreamStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [streamReconnectNonce, setStreamReconnectNonce] = useState(0);
  const [isStreamPaused, setIsStreamPaused] = useState(() => routeContext.live === 'false');
  const [selectedStreamKey, setSelectedStreamKey] = useState<string | null>(null);
  const [persistedStreamItem, setPersistedStreamItem] = useState<StreamLogItem | null>(null);
  const [detailSelection, setDetailSelection] = useState<DetailSelection | null>(null);
  const [detailContextState, setDetailContextState] = useState<LogDetailContextState>({
    loading: false,
    error: null,
    data: null
  });
  const [detailMetricsPreviewState, setDetailMetricsPreviewState] = useState<LogDetailMetricsPreviewState>({
    loading: false,
    error: null,
    data: null
  });
  const [detailContextFilters, setDetailContextFilters] = useState<LogDetailContextFilters>({});
  const [detailContextLimit, setDetailContextLimit] = useState(LOG_DETAIL_CONTEXT_DEFAULT_LIMIT);
  const [detailContextLoadRequest, setDetailContextLoadRequest] = useState<LogDetailContextLoadRequest | null>(null);
  const [relatedTracePreview, setRelatedTracePreview] = useState<RelatedTracePreviewState>({
    open: false,
    loading: false,
    error: null,
    detail: null,
    selectedSpanId: null,
    selectedEventKey: null,
    contextLog: null
  });
  const isStreamPausedRef = useRef(isStreamPaused);
  const streamSequenceRef = useRef(0);
  const streamViewportRef = useRef<HTMLDivElement | null>(null);
  const pendingStreamItemsRef = useRef<StreamLogItem[]>([]);
  const streamFlushFrameRef = useRef<number | null>(null);
  const autoOpenedTraceDetailKeyRef = useRef<string | null>(null);
  const [streamViewport, setStreamViewport] = useState(() =>
    resolveResetStreamViewportState({ viewportHeight: STREAM_VIEWPORT_ROW_HEIGHT * 7 })
  );
  const streamUrl = useMemo(() => resolveBrowserLogStreamUrl(buildLogStreamUrl(query, routeContext)), [query, routeContext]);
  const streamSelection = resolveStreamSelection({
    items: streamItems,
    selectedKey: selectedStreamKey,
    persisted: persistedStreamItem
  });
  const streamItemKeys = useMemo(() => streamItems.map(streamItem => streamItem.key), [streamItems]);
  const selectedStreamIndex = findSelectedStreamRowIndex({
    itemKeys: streamItemKeys,
    selectedKey: selectedStreamKey,
    detached: streamSelection.detached
  });
  const streamWindow = resolveStreamWindow({
    itemCount: streamItems.length,
    scrollTop: streamViewport.scrollTop,
    viewportHeight: streamViewport.viewportHeight,
    anchorIndex: streamViewport.isPinnedToLatest ? null : selectedStreamIndex
  });
  const visibleStreamItems = useMemo(
    () => (streamWindow.endIndex >= streamWindow.startIndex ? streamItems.slice(streamWindow.startIndex, streamWindow.endIndex + 1) : []),
    [streamItems, streamWindow.endIndex, streamWindow.startIndex]
  );
  const selectedStreamEntry = streamSelection.selected?.entry ?? null;
  const selectedStreamAttributionDiagnostics = buildLogAttributionDiagnostics(selectedStreamEntry, t);
  const streamHandoffLinks = buildLogHandoffLinks(selectedStreamEntry, routeContext, {
    intakeReturnTo: currentLogReturnHref,
    traceReturnTo: currentLogReturnHref,
    metricsReturnTo: currentLogReturnHref,
    alertDraft
  });
  const detailLog = detailSelection?.entry ?? null;
  const detailHandoffLinks = buildLogHandoffLinks(detailLog, routeContext, {
    intakeReturnTo: currentLogReturnHref,
    traceReturnTo: currentLogReturnHref,
    metricsReturnTo: currentLogReturnHref,
    alertDraft
  });
  const detailRows = buildSelectedLogRows(detailLog, t, bodyText, formatTime, severityLabel);
  const detailFacts = buildSelectedLogFacts(detailLog, t, formatTime, severityLabel);
  const detailAttributeRows = buildLogAttributeRows(detailLog, t);
  const detailAttributionDiagnostics = buildLogAttributionDiagnostics(detailLog, t);
  const detailMetricsRows = buildLogMetricsCorrelationRows(detailLog, routeContext, t);
  const detailJson = stringifyLogEntry(detailLog);
  const detailRaw = detailLog ? bodyText(detailLog.body) : '';
  const detailCodeHref = buildLogCodeNavigationUrl(detailLog);
  const detailContextRoute = buildLogContextRoute(detailLog, routeContext);
  const detailContextUrl = useMemo(
    () => buildLogContextApiUrl(
      detailLog,
      routeContext,
      query,
      detailContextLoadRequest ? LOG_DETAIL_CONTEXT_LIMIT_STEP : detailContextLimit,
      detailContextFilters,
      detailContextLoadRequest
    ),
    [detailContextFilters, detailContextLimit, detailContextLoadRequest, detailLog, query, routeContext]
  );
  const detailMetricsPreviewBaseUrl = useMemo(
    () => buildLogMetricsPreviewApiUrl(detailLog ? detailHandoffLinks.metricsHref : null),
    [detailHandoffLinks.metricsHref, detailLog]
  );
  const detailMetricsRelatedUrl = useMemo(
    () => buildLogMetricsRelatedApiUrl(detailLog ? detailHandoffLinks.metricsHref : null, routeContext.operationName),
    [detailHandoffLinks.metricsHref, detailLog, routeContext.operationName]
  );
  const detailContextRows = useMemo(
    () => buildLogDetailContextRows(detailContextState.data, detailLog, t),
    [detailContextState.data, detailLog, t]
  );
  const detailMetricsPreviewRows = useMemo(
    () => buildLogMetricsPreviewRows(detailMetricsPreviewState.data, t, detailHandoffLinks.metricsHref),
    [detailHandoffLinks.metricsHref, detailMetricsPreviewState.data, t]
  );
  const detailMetricsPreviewEmpty =
    detailMetricsPreviewState.data && detailMetricsPreviewRows.length === 0
      ? detailMetricsPreviewState.data
          .map(payload => payload.errorMessage || payload.emptyStateReason)
          .find((message): message is string => Boolean(message))
        || t('log.manage.stream.detail.metrics.preview-empty')
      : null;
  const relatedTraceDetail = relatedTracePreview.detail;
  const relatedTraceSelectedSpan =
    relatedTraceDetail?.spans.find(span => span.spanId === relatedTracePreview.selectedSpanId) || relatedTraceDetail?.spans[0] || null;
  const relatedTraceContextLog = relatedTracePreview.contextLog;
  const relatedTraceWorkspaceEntry: LogEntry | null =
    relatedTraceContextLog || relatedTraceDetail
      ? {
          ...(relatedTraceContextLog || {}),
          traceId: relatedTraceDetail?.traceId || relatedTraceContextLog?.traceId,
          spanId: relatedTraceSelectedSpan?.spanId || relatedTraceContextLog?.spanId
        }
      : null;
  const relatedTraceWorkspaceHref = buildLogHandoffLinks(relatedTraceWorkspaceEntry, routeContext, {
    intakeReturnTo: currentLogReturnHref,
    traceReturnTo: currentLogReturnHref,
    metricsReturnTo: currentLogReturnHref,
    alertDraft
  }).traceHref;
  const relatedTraceRows = buildTraceWaterfallRows(
    relatedTraceDetail,
    relatedTraceSelectedSpan?.spanId || relatedTracePreview.selectedSpanId,
    formatTraceDurationNanos,
    t
  );
  const relatedTraceEventCount = relatedTraceRows.reduce((count, row) => count + (row.events?.length || 0), 0);
  const relatedTraceSelectedFacts = buildSelectedSpanFacts(
    relatedTraceSelectedSpan,
    relatedTraceDetail,
    t,
    formatTraceDurationNanos
  );
  const relatedTraceStageFacts = relatedTraceDetail
    ? [
        {
          label: t('log.manage.related-trace.fact.current-span'),
          value: relatedTraceSelectedSpan?.spanName || relatedTraceSelectedSpan?.spanId || relatedTraceDetail.rootSpanName || relatedTraceDetail.traceId,
          tone: 'accent' as const
        },
        {
          label: t('log.manage.related-trace.fact.error-spans'),
          value: String(relatedTraceDetail.errorSpanCount || relatedTraceRows.filter(row => row.tone === 'danger').length),
          tone: (relatedTraceDetail.errorSpanCount || relatedTraceRows.filter(row => row.tone === 'danger').length) > 0 ? ('error' as const) : ('default' as const)
        },
        {
          label: t('log.manage.related-trace.fact.events'),
          value: String(relatedTraceEventCount),
          tone: 'default' as const
        },
        {
          label: t('log.manage.related-trace.fact.links'),
          value: String((relatedTraceSelectedSpan?.links || []).length),
          tone: 'default' as const
        }
      ]
    : [];
  const missingTraceHandoffTitle = t('log.manage.handoff.trace-disabled');
  const missingFullTraceHandoffTitle = t('log.manage.handoff.full-trace-disabled');
  const missingEntityHandoffTitle = t('log.manage.handoff.entity-disabled');
  const canOpenActiveEntity = hasExactLogEntity(activeEntry, routeContext);
  const canOpenStreamEntity = hasExactLogEntity(selectedStreamEntry, routeContext);
  const canOpenDetailEntity = hasExactLogEntity(detailLog, routeContext);
  const requestedTraceId = query.traceId.trim() || routeContext.traceId?.trim() || '';
  const requestedSpanId = query.spanId.trim() || routeContext.spanId?.trim() || '';
  const requestedLogTimeUnixNano = query.logTimeUnixNano?.trim() || '';
  const sourceContextKind = panelEditContext
    ? 'dashboard-panel-edit'
    : isDashboardReturnContext(routeContext.returnTo)
    ? 'dashboard-evidence'
    : routeContext.returnTo
      ? 'return-source'
      : 'direct';
  const serviceQuickFilterValues = uniqueCompactValues([
    routeContext.serviceName,
    ...data.list.content.map(entry => readFirstLogAttribute(entry, ['service.name', 'service_name']))
  ]);
  const environmentQuickFilterValues = uniqueCompactValues([
    routeContext.environment,
    ...data.list.content.map(entry => readFirstLogAttribute(entry, ['deployment.environment.name', 'deployment_environment_name', 'environment']))
  ]);

  useEffect(() => {
    setIsStreamPaused(routeContext.live === 'false');
  }, [routeContext.live]);

  useEffect(() => {
    setDetailContextLimit(LOG_DETAIL_CONTEXT_DEFAULT_LIMIT);
    setDetailContextFilters({});
    setDetailContextLoadRequest(null);
  }, [detailLog?.timeUnixNano]);

  useEffect(() => {
    if (!detailContextUrl) {
      setDetailContextState({ loading: false, error: null, data: null });
      return undefined;
    }

    let cancelled = false;
    const activeLoadRequest = detailContextLoadRequest;
    setDetailContextState(previous => ({
      loading: true,
      error: null,
      data: activeLoadRequest ? previous.data : null
    }));
    apiMessageGetWithTimeout<LogDetailContextPayload>(detailContextUrl)
      .then(payload => {
        if (cancelled) return;
        setDetailContextState(previous => ({
          loading: false,
          error: null,
          data: mergeLogDetailContextPayload(previous.data, payload || null, activeLoadRequest)
        }));
      })
      .catch(error => {
        if (cancelled) return;
        setDetailContextState({
          loading: false,
          error: describeLogManageLoadFailure(error),
          data: null
        });
      });

    return () => {
      cancelled = true;
    };
  }, [detailContextLoadRequest, detailContextUrl]);

  useEffect(() => {
    if (!detailMetricsPreviewBaseUrl) {
      setDetailMetricsPreviewState({ loading: false, error: null, data: null });
      return undefined;
    }

    let cancelled = false;
    const loadRelatedMetrics = () =>
      detailMetricsRelatedUrl
        ? apiMessageGetWithTimeout<OtlpRelatedMetrics>(detailMetricsRelatedUrl).catch(() => null)
        : Promise.resolve(null);
    setDetailMetricsPreviewState({ loading: true, error: null, data: null });
    apiMessageGetWithTimeout<OtlpMetricsConsole>(detailMetricsPreviewBaseUrl)
      .then(basePayload => {
        if (cancelled) return;
        loadRelatedMetrics().then(relatedPayload => {
          if (cancelled) return;
          const fallbackUrls = buildLogMetricsPreviewFallbackApiUrls(
            detailLog ? detailHandoffLinks.metricsHref : null,
            basePayload,
            relatedPayload
          );
          if (fallbackUrls.length === 0) {
            setDetailMetricsPreviewState({ loading: false, error: null, data: basePayload ? [basePayload] : [] });
            return;
          }
          Promise.allSettled(fallbackUrls.map(url => apiMessageGetWithTimeout<OtlpMetricsConsole>(url))).then(results => {
            if (cancelled) return;
            const payloads = collectFulfilledMetricsPreviewPayloads(results);
            setDetailMetricsPreviewState({
              loading: false,
              error: null,
              data: [basePayload, ...payloads].filter(Boolean)
            });
          });
        });
      })
      .catch(error => {
        if (cancelled) return;
        loadRelatedMetrics().then(relatedPayload => {
          if (cancelled) return;
          const fallbackUrls = buildLogMetricsPreviewFallbackApiUrls(
            detailLog ? detailHandoffLinks.metricsHref : null,
            null,
            relatedPayload
          );
          if (fallbackUrls.length === 0) {
            setDetailMetricsPreviewState({ loading: false, error: describeLogManageLoadFailure(error), data: null });
            return;
          }
          Promise.allSettled(fallbackUrls.map(url => apiMessageGetWithTimeout<OtlpMetricsConsole>(url))).then(results => {
            if (cancelled) return;
            const payloads = collectFulfilledMetricsPreviewPayloads(results);
            if (payloads.length > 0) {
              setDetailMetricsPreviewState({ loading: false, error: null, data: payloads });
              return;
            }
            setDetailMetricsPreviewState({
              loading: false,
              error: describeLogManageLoadFailure(firstRejectedMetricsPreviewReason(results) || error),
              data: null
            });
          });
        });
      });

    return () => {
      cancelled = true;
    };
  }, [detailHandoffLinks.metricsHref, detailLog, detailMetricsPreviewBaseUrl, detailMetricsRelatedUrl]);

  useEffect(() => {
    isStreamPausedRef.current = isStreamPaused;
  }, [isStreamPaused]);

  const flushPendingStreamItems = useCallback(() => {
    streamFlushFrameRef.current = null;
    const incoming = pendingStreamItemsRef.current;
    pendingStreamItemsRef.current = [];
    if (incoming.length === 0) {
      return;
    }

    const container = streamViewportRef.current;
    const shouldHoldCurrentRows = container ? !readStreamViewportState(container).isPinnedToLatest : false;
    const nextScrollTop = shouldHoldCurrentRows && container ? container.scrollTop + incoming.length * STREAM_VIEWPORT_ROW_HEIGHT : 0;

    setStreamItems(previous => mergeStreamBatch(previous, incoming, maxStreamEntries).items);

    if (shouldHoldCurrentRows && container) {
      requestAnimationFrame(() => {
        const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
        container.scrollTop = Math.min(nextScrollTop, maxScrollTop);
        setStreamViewport(readStreamViewportState(container));
      });
    }
  }, []);

  const schedulePendingStreamFlush = useCallback(() => {
    if (streamFlushFrameRef.current != null) {
      return;
    }

    streamFlushFrameRef.current = requestAnimationFrame(flushPendingStreamItems);
  }, [flushPendingStreamItems]);

  useEffect(() => {
    const container = streamViewportRef.current;
    if (!container || !streamViewport.isPinnedToLatest) {
      return;
    }

    if (container.scrollTop !== 0) {
      container.scrollTop = 0;
    }

    const nextViewportHeight = container.clientHeight || streamViewport.viewportHeight;
    if (streamViewport.scrollTop !== 0 || streamViewport.viewportHeight !== nextViewportHeight) {
      setStreamViewport({
        scrollTop: 0,
        viewportHeight: nextViewportHeight,
        isPinnedToLatest: true
      });
    }
  }, [streamItems.length, streamViewport.isPinnedToLatest, streamViewport.scrollTop, streamViewport.viewportHeight]);

  useEffect(() => {
    if (currentView !== 'stream') {
      setStreamStatus('disconnected');
      return undefined;
    }
    if (typeof EventSource === 'undefined') {
      setStreamStatus('disconnected');
      return undefined;
    }
    if (isStreamPaused) {
      setStreamStatus('disconnected');
      return undefined;
    }

    setStreamStatus('connecting');
    const eventSource = new EventSource(streamUrl);
    eventSource.onopen = () => {
      setStreamStatus('connected');
    };
    eventSource.onerror = () => {
      setStreamStatus('disconnected');
    };
    const handleLogEvent = (event: MessageEvent<string>) => {
      if (isStreamPausedRef.current) return;
      try {
        const entry = JSON.parse(event.data) as LogEntry;
        const sequence = streamSequenceRef.current + 1;
        streamSequenceRef.current = sequence;
        const item = {
          key: buildStreamItemKey(entry, sequence),
          entry
        };
        const result = enqueuePendingStreamItem(pendingStreamItemsRef.current, item, maxPendingStreamEntries);
        pendingStreamItemsRef.current = result.pending;
        schedulePendingStreamFlush();
      } catch {
        // Ignore malformed stream payloads; the SSE connection should keep flowing.
      }
    };

    eventSource.addEventListener('LOG_EVENT', handleLogEvent);
    return () => {
      eventSource.removeEventListener('LOG_EVENT', handleLogEvent);
      eventSource.close();
      pendingStreamItemsRef.current = [];
      if (streamFlushFrameRef.current != null) {
        cancelAnimationFrame(streamFlushFrameRef.current);
        streamFlushFrameRef.current = null;
      }
    };
  }, [currentView, isStreamPaused, schedulePendingStreamFlush, streamReconnectNonce, streamUrl]);
  const applySeverity = (severity: string) => {
    const nextSeverity = selectedSeverity === severity ? '' : severity;
    const nextQuery = {
      ...draft,
      severityText: nextSeverity
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  };

  const applyLogTableColumn = (column: LogTableColumnKey, checked: boolean) => {
    const nextColumns = resolveNextLogColumns(draft.columns, column, checked);
    const nextQuery = { ...draft, columns: nextColumns };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  };

  const applyLogDisplayFormat = (value: string) => {
    const nextQuery = { ...draft, displayFormat: normalizeLogDisplayFormat(value) };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  };

  const applyLogMaxLines = (value: string) => {
    const nextQuery = { ...draft, maxLines: normalizeLogMaxLines(value) };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  };

  const applyLogListPageSize = (value: string) => {
    const listPageSize = resolveLogListPageSize({ get: name => (name === 'listPageSize' ? value : null) });
    const nextQuery = {
      ...draft,
      listPageSize,
      listPageIndex: DEFAULT_LOG_LIST_PAGE_INDEX
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  };

  const applyLogListPageIndex = (nextPageIndex: number) => {
    const nextQuery = {
      ...draft,
      listPageIndex: resolveLogListPageIndex({ get: name => (name === 'listPageIndex' ? String(Math.max(0, nextPageIndex)) : null) })
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  };

  const applyLogQuickRouteContext = (key: 'serviceName' | 'environment', value: string) => {
    const currentValue = routeContext[key]?.trim();
    const nextContext = { ...routeContext };
    if (currentValue === value) {
      delete nextContext[key];
    } else {
      nextContext[key] = value;
    }
    applyRouteContext(nextContext);
  };

  const applyLogRowServiceFilter = (serviceName: string) => {
    const normalizedServiceName = serviceName.trim();
    if (!normalizedServiceName || normalizedServiceName === '-') return;
    applyRouteContext({ ...routeContext, serviceName: normalizedServiceName });
  };

  const applyLogRowSeverityFilter = (severity: string) => {
    const normalizedSeverity = severity.trim().toUpperCase();
    if (!normalizedSeverity || normalizedSeverity === '-' || normalizedSeverity === 'LOG') return;
    const nextQuery = {
      ...draft,
      severityText: normalizedSeverity
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  };

  const applyLogRowBodyFilter = (message: string) => {
    const searchTerm = buildLogBodySearchTerm(message);
    if (!searchTerm) return;
    const nextQuery = {
      ...draft,
      search: searchTerm
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  };

  const applyLogRowTraceIdFilter = (traceId: string) => {
    const normalizedTraceId = traceId.trim();
    if (!normalizedTraceId || normalizedTraceId === '-') return;
    const nextQuery = {
      ...draft,
      traceId: normalizedTraceId
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  };

  const applyLogRowSpanIdFilter = (spanId: string) => {
    const normalizedSpanId = spanId.trim();
    if (!normalizedSpanId || normalizedSpanId === '-') return;
    const nextQuery = {
      ...draft,
      spanId: normalizedSpanId
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  };

  const buildLogExportFieldColumns = (exportRows: LogExplorerRow[], exportEntries: Array<LogEntry | null | undefined>): LogExportExtraColumn[] => {
    return visibleLogFieldColumns.map(fieldColumn => ({
      key: fieldColumn,
      valuesByRowKey: Object.fromEntries(exportRows.map((row, index) => [
        row.key,
        readLogFieldColumnValue(exportEntries[index], fieldColumn)
      ]))
    }));
  };

  const triggerLogExportDownload = (exportRows: LogExplorerRow[], exportEntries: Array<LogEntry | null | undefined>) => {
    if (typeof window === 'undefined' || exportRows.length === 0) return;
    const keyedExportRows = exportRows.map((row, index) => ({
      ...row,
      key: `export-${index}-${row.key}`
    }));
    const exportFieldColumns = buildLogExportFieldColumns(keyedExportRows, exportEntries);
    const content = logExportFormat === 'jsonl'
      ? buildLogJsonl(keyedExportRows, visibleLogColumns, exportFieldColumns)
      : buildLogCsv(keyedExportRows, visibleLogColumns, exportFieldColumns);
    const type = logExportFormat === 'jsonl' ? 'application/x-ndjson;charset=utf-8' : 'text/csv;charset=utf-8';
    const blob = new Blob([content], { type });
    const href = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = buildLogExportFilename(logExportFormat);
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(href);
  };

  const downloadCurrentLogRows = async () => {
    if (typeof window === 'undefined' || rows.length === 0) return;
    if (logExportRowLimit === 'current') {
      triggerLogExportDownload(rows, rows.map(row => logEntryByRowKey.get(row.key)));
      return;
    }
    const baseExportListUrl = buildLogUrls({
      ...query,
      listPageIndex: DEFAULT_LOG_LIST_PAGE_INDEX
    }, routeContext).listUrl;
    const exportRowLimit = Number(logExportRowLimit);
    const exportEntries: LogEntry[] = [];
    for (let pageIndex = 0; exportEntries.length < exportRowLimit; pageIndex += 1) {
      const remainingRows = exportRowLimit - exportEntries.length;
      const pageSize = Math.min(LOG_EXPORT_FETCH_PAGE_SIZE, remainingRows);
      const exportListUrl = new URL(baseExportListUrl, 'http://localhost');
      exportListUrl.searchParams.set('pageIndex', String(pageIndex));
      exportListUrl.searchParams.set('pageSize', String(pageSize));
      const exportListPath = `${exportListUrl.pathname}?${exportListUrl.searchParams.toString()}`;
      const exportList = await apiMessageGetWithTimeout<PageResult<LogEntry>>(exportListPath);
      const pageEntries = (exportList.content || []).slice(0, remainingRows);
      exportEntries.push(...pageEntries);
      const totalElements = Number(exportList.totalElements);
      if (pageEntries.length < pageSize || (Number.isFinite(totalElements) && exportEntries.length >= totalElements)) {
        break;
      }
    }
    const exportRows = buildLogExplorerRows(exportEntries, {
      bodyText,
      formatTime,
      severityLabel
    });
    triggerLogExportDownload(exportRows, exportEntries);
  };

  const applyLogAttributeFilter = useCallback((row: LogAttributeRow) => {
    const filter = buildLogAttributeFilterExpression(row, t('log.manage.attributes.value.object'));
    if (!filter) return;
    const nextQuery: LogQueryState = {
      ...draft,
      ...(filter.kind === 'resource'
        ? { resourceFilter: mergeLogAttributeFilterExpression(draft.resourceFilter, filter.expression) }
        : { attributeFilter: mergeLogAttributeFilterExpression(draft.attributeFilter, filter.expression) })
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft, t]);

  const applyLogContextAttributeFilter = useCallback((row: LogAttributeRow) => {
    const filter = buildLogAttributeFilterExpression(row, t('log.manage.attributes.value.object'));
    if (!filter) return;
    setDetailContextLimit(LOG_DETAIL_CONTEXT_DEFAULT_LIMIT);
    setDetailContextLoadRequest(null);
    setDetailContextFilters(previous => ({
      ...previous,
      ...(filter.kind === 'resource'
        ? { resourceFilter: mergeLogAttributeFilterExpression(previous.resourceFilter, filter.expression) }
        : { attributeFilter: mergeLogAttributeFilterExpression(previous.attributeFilter, filter.expression) })
    }));
  }, [t]);

  const excludeLogAttributeFilter = useCallback((row: LogAttributeRow) => {
    const filter = buildLogAttributeExcludeExpression(row, t('log.manage.attributes.value.object'));
    if (!filter) return;
    const nextQuery: LogQueryState = {
      ...draft,
      ...(filter.kind === 'resource'
        ? { resourceFilter: mergeLogAttributeFilterExpression(draft.resourceFilter, filter.expression) }
        : { attributeFilter: mergeLogAttributeFilterExpression(draft.attributeFilter, filter.expression) })
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft, t]);

  const applyLogAttributeContainsFilter = useCallback((row: LogAttributeRow) => {
    const filter = buildLogAttributeContainsExpression(row, t('log.manage.attributes.value.object'));
    if (!filter) return;
    const nextQuery: LogQueryState = {
      ...draft,
      ...(filter.kind === 'resource'
        ? { resourceFilter: mergeLogAttributeFilterExpression(draft.resourceFilter, filter.expression) }
        : { attributeFilter: mergeLogAttributeFilterExpression(draft.attributeFilter, filter.expression) })
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft, t]);

  const applyLogAttributeNotContainsFilter = useCallback((row: LogAttributeRow) => {
    const filter = buildLogAttributeNotContainsExpression(row, t('log.manage.attributes.value.object'));
    if (!filter) return;
    const nextQuery: LogQueryState = {
      ...draft,
      ...(filter.kind === 'resource'
        ? { resourceFilter: mergeLogAttributeFilterExpression(draft.resourceFilter, filter.expression) }
        : { attributeFilter: mergeLogAttributeFilterExpression(draft.attributeFilter, filter.expression) })
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft, t]);

  const applyLogAttributeExistsFilter = useCallback((row: LogAttributeRow) => {
    const filter = buildLogAttributeExistsExpression(row);
    if (!filter) return;
    const nextQuery: LogQueryState = {
      ...draft,
      ...(filter.kind === 'resource'
        ? { resourceFilter: mergeLogAttributeFilterExpression(draft.resourceFilter, filter.expression) }
        : { attributeFilter: mergeLogAttributeFilterExpression(draft.attributeFilter, filter.expression) })
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft]);

  const applyLogAttributeNotExistsFilter = useCallback((row: LogAttributeRow) => {
    const filter = buildLogAttributeNotExistsExpression(row);
    if (!filter) return;
    const nextQuery: LogQueryState = {
      ...draft,
      ...(filter.kind === 'resource'
        ? { resourceFilter: mergeLogAttributeFilterExpression(draft.resourceFilter, filter.expression) }
        : { attributeFilter: mergeLogAttributeFilterExpression(draft.attributeFilter, filter.expression) })
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft]);

  const replaceLogAttributeFilter = useCallback((row: LogAttributeRow) => {
    const filter = buildLogAttributeFilterExpression(row, t('log.manage.attributes.value.object'));
    if (!filter) return;
    const nextQuery: LogQueryState = {
      ...draft,
      ...(filter.kind === 'resource'
        ? { resourceFilter: filter.expression }
        : { attributeFilter: filter.expression })
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft, t]);

  const groupLogAttribute = useCallback((row: LogAttributeRow) => {
    const group = buildLogAttributeGroupBy(row);
    if (!group) return;
    const nextQuery: LogQueryState = {
      ...draft,
      groupBy: group.groupBy
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft]);

  const applyLogAttributeFieldColumn = useCallback((row: LogAttributeRow) => {
    const fieldColumn = buildLogAttributeFieldColumn(row);
    if (!fieldColumn) return;
    const currentColumns = draft.fieldColumns || [];
    const alreadyVisible = currentColumns.includes(fieldColumn);
    const nextFieldColumns = alreadyVisible
      ? currentColumns.filter(column => column !== fieldColumn)
      : [...currentColumns.filter(column => column !== fieldColumn), fieldColumn].slice(0, MAX_LOG_FIELD_COLUMNS);
    const nextQuery: LogQueryState = {
      ...draft,
      ...(nextFieldColumns.length ? { fieldColumns: nextFieldColumns } : { fieldColumns: undefined })
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft]);

  const applyLogGroupLimit = useCallback((value: string) => {
    const nextQuery: LogQueryState = {
      ...draft,
      groupLimit: value.trim() || undefined
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft]);

  const applyLogGroupOrder = useCallback((value: string) => {
    const nextQuery: LogQueryState = {
      ...draft,
      groupOrder: value === 'count-asc' ? 'count-asc' : undefined
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft]);

  const applyLogGroupMinCount = useCallback((value: string) => {
    const nextQuery: LogQueryState = {
      ...draft,
      groupMinCount: value.trim() || undefined
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft]);

  const applyLogGroupResultFilter = useCallback((value: string) => {
    const filter = buildLogGroupResultFilter(activeGroupBy, value);
    if (!filter) return;
    if (filter.kind === 'service') {
      applyRouteContext({ ...routeContext, serviceName: filter.value });
      return;
    }
    const nextQuery: LogQueryState = {
      ...draft,
      ...(filter.kind === 'severity'
        ? { severityText: filter.value }
        : filter.kind === 'resource'
          ? { resourceFilter: mergeLogAttributeFilterExpression(draft.resourceFilter, filter.expression) }
          : { attributeFilter: mergeLogAttributeFilterExpression(draft.attributeFilter, filter.expression) })
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [activeGroupBy, applyQuery, applyRouteContext, draft, routeContext, setDraft]);

  const renderLogAttributeFilterAction = useCallback((row: LogAttributeRow) => {
    const filter = buildLogAttributeFilterExpression(row, t('log.manage.attributes.value.object'));
    const excludeFilter = buildLogAttributeExcludeExpression(row, t('log.manage.attributes.value.object'));
    const containsFilter = buildLogAttributeContainsExpression(row, t('log.manage.attributes.value.object'));
    const notContainsFilter = buildLogAttributeNotContainsExpression(row, t('log.manage.attributes.value.object'));
    const existsFilter = buildLogAttributeExistsExpression(row);
    const notExistsFilter = buildLogAttributeNotExistsExpression(row);
    const group = buildLogAttributeGroupBy(row);
    const fieldColumn = buildLogAttributeFieldColumn(row);
    const fieldColumnVisible = Boolean(fieldColumn && visibleLogFieldColumns.includes(fieldColumn));
    if (!filter && !excludeFilter && !containsFilter && !notContainsFilter && !existsFilter && !notExistsFilter && !group && !fieldColumn) return null;
    return (
      <span className="inline-flex flex-wrap gap-1">
        {fieldColumn ? (
          <HzButton
            data-log-manage-attribute-field-column-action={fieldColumnVisible ? 'remove' : 'add'}
            data-log-manage-attribute-field-column-owner="hertzbeat-ui-button"
            data-log-manage-attribute-field-column={fieldColumn}
            data-log-manage-attribute-filter-name={row.name}
            data-log-manage-attribute-filter-value={row.value}
            size="sm"
            intent="secondary"
            onClick={() => applyLogAttributeFieldColumn(row)}
            aria-label={fieldColumnVisible
              ? t('log.manage.attributes.remove-column-action.aria', { name: row.name })
              : t('log.manage.attributes.add-column-action.aria', { name: row.name })}
          >
            <HzButtonIcon
              icon={fieldColumnVisible ? X : ListChecks}
              data-log-manage-attribute-field-column-icon={fieldColumnVisible ? 'remove' : 'add'}
              data-log-manage-attribute-field-column-icon-owner="hertzbeat-ui-button-icon"
            />
            {fieldColumnVisible ? t('log.manage.attributes.remove-column-action') : t('log.manage.attributes.add-column-action')}
          </HzButton>
        ) : null}
        {filter ? (
          <>
            <HzButton
              data-log-stream-detail-context-filter-action={filter.kind}
              data-log-stream-detail-context-filter-owner="hertzbeat-ui-button"
              data-log-manage-attribute-filter-name={row.name}
              data-log-manage-attribute-filter-value={row.value}
              size="sm"
              intent="secondary"
              onClick={() => applyLogContextAttributeFilter(row)}
              aria-label={t('log.manage.attributes.context-filter-action.aria', { name: row.name, value: row.value })}
            >
              <HzButtonIcon
                icon={ScrollText}
                data-log-stream-detail-context-filter-icon="context-filter"
                data-log-stream-detail-context-filter-icon-owner="hertzbeat-ui-button-icon"
              />
              {t('log.manage.attributes.context-filter-action')}
            </HzButton>
            <HzButton
              data-log-manage-attribute-filter-action={filter.kind}
              data-log-manage-attribute-filter-owner="hertzbeat-ui-button"
              data-log-manage-attribute-filter-name={row.name}
              data-log-manage-attribute-filter-value={row.value}
              size="sm"
              intent="secondary"
              onClick={() => applyLogAttributeFilter(row)}
              aria-label={t('log.manage.attributes.filter-action.aria', { name: row.name, value: row.value })}
            >
              <HzButtonIcon
                icon={Filter}
                data-log-manage-attribute-filter-action-icon="filter"
                data-log-manage-attribute-filter-action-icon-owner="hertzbeat-ui-button-icon"
              />
              {t('log.manage.attributes.filter-action')}
            </HzButton>
            <HzButton
              data-log-manage-attribute-filter-replace-action={filter.kind}
              data-log-manage-attribute-filter-replace-owner="hertzbeat-ui-button"
              data-log-manage-attribute-filter-name={row.name}
              data-log-manage-attribute-filter-value={row.value}
              size="sm"
              intent="secondary"
              onClick={() => replaceLogAttributeFilter(row)}
              aria-label={t('log.manage.attributes.replace-action.aria', { name: row.name, value: row.value })}
            >
              <HzButtonIcon
                icon={Replace}
                data-log-manage-attribute-filter-replace-icon="replace"
                data-log-manage-attribute-filter-replace-icon-owner="hertzbeat-ui-button-icon"
              />
              {t('log.manage.attributes.replace-action')}
            </HzButton>
          </>
        ) : null}
        {excludeFilter ? (
          <HzButton
            data-log-manage-attribute-filter-out-action={excludeFilter.kind}
            data-log-manage-attribute-filter-out-owner="hertzbeat-ui-button"
            data-log-manage-attribute-filter-name={row.name}
            data-log-manage-attribute-filter-value={row.value}
            size="sm"
            intent="secondary"
            onClick={() => excludeLogAttributeFilter(row)}
            aria-label={t('log.manage.attributes.filter-out-action.aria', { name: row.name, value: row.value })}
          >
            <HzButtonIcon
              icon={X}
              data-log-manage-attribute-filter-out-icon="exclude"
              data-log-manage-attribute-filter-out-icon-owner="hertzbeat-ui-button-icon"
            />
            {t('log.manage.attributes.filter-out-action')}
          </HzButton>
        ) : null}
        {containsFilter ? (
          <HzButton
            data-log-manage-attribute-contains-action={containsFilter.kind}
            data-log-manage-attribute-contains-owner="hertzbeat-ui-button"
            data-log-manage-attribute-filter-name={row.name}
            data-log-manage-attribute-filter-value={row.value}
            size="sm"
            intent="secondary"
            onClick={() => applyLogAttributeContainsFilter(row)}
            aria-label={t('log.manage.attributes.contains-action.aria', { name: row.name, value: row.value })}
          >
            <HzButtonIcon
              icon={Search}
              data-log-manage-attribute-contains-icon="contains"
              data-log-manage-attribute-contains-icon-owner="hertzbeat-ui-button-icon"
            />
            {t('log.manage.attributes.contains-action')}
          </HzButton>
        ) : null}
        {notContainsFilter ? (
          <HzButton
            data-log-manage-attribute-not-contains-action={notContainsFilter.kind}
            data-log-manage-attribute-not-contains-owner="hertzbeat-ui-button"
            data-log-manage-attribute-filter-name={row.name}
            data-log-manage-attribute-filter-value={row.value}
            size="sm"
            intent="secondary"
            onClick={() => applyLogAttributeNotContainsFilter(row)}
            aria-label={t('log.manage.attributes.not-contains-action.aria', { name: row.name, value: row.value })}
          >
            <HzButtonIcon
              icon={Ban}
              data-log-manage-attribute-not-contains-icon="not-contains"
              data-log-manage-attribute-not-contains-icon-owner="hertzbeat-ui-button-icon"
            />
            {t('log.manage.attributes.not-contains-action')}
          </HzButton>
        ) : null}
        {existsFilter ? (
          <HzButton
            data-log-manage-attribute-exists-action={existsFilter.kind}
            data-log-manage-attribute-exists-owner="hertzbeat-ui-button"
            data-log-manage-attribute-filter-name={row.name}
            data-log-manage-attribute-filter-value={row.value}
            size="sm"
            intent="secondary"
            onClick={() => applyLogAttributeExistsFilter(row)}
            aria-label={t('log.manage.attributes.exists-action.aria', { name: row.name })}
          >
            <HzButtonIcon
              icon={Check}
              data-log-manage-attribute-exists-icon="exists"
              data-log-manage-attribute-exists-icon-owner="hertzbeat-ui-button-icon"
            />
            {t('log.manage.attributes.exists-action')}
          </HzButton>
        ) : null}
        {notExistsFilter ? (
          <HzButton
            data-log-manage-attribute-not-exists-action={notExistsFilter.kind}
            data-log-manage-attribute-not-exists-owner="hertzbeat-ui-button"
            data-log-manage-attribute-filter-name={row.name}
            data-log-manage-attribute-filter-value={row.value}
            size="sm"
            intent="secondary"
            onClick={() => applyLogAttributeNotExistsFilter(row)}
            aria-label={t('log.manage.attributes.not-exists-action.aria', { name: row.name })}
          >
            <HzButtonIcon
              icon={Ban}
              data-log-manage-attribute-not-exists-icon="not-exists"
              data-log-manage-attribute-not-exists-icon-owner="hertzbeat-ui-button-icon"
            />
            {t('log.manage.attributes.not-exists-action')}
          </HzButton>
        ) : null}
        {group ? (
          <HzButton
            data-log-manage-attribute-group-action={group.kind}
            data-log-manage-attribute-group-owner="hertzbeat-ui-button"
            data-log-manage-attribute-filter-name={row.name}
            data-log-manage-attribute-filter-value={row.value}
            size="sm"
            intent="secondary"
            onClick={() => groupLogAttribute(row)}
            aria-label={t('log.manage.attributes.group-action.aria', { name: row.name })}
          >
            <HzButtonIcon
              icon={BarChart3}
              data-log-manage-attribute-group-icon="group"
              data-log-manage-attribute-group-icon-owner="hertzbeat-ui-button-icon"
            />
            {t('log.manage.attributes.group-action')}
          </HzButton>
        ) : null}
      </span>
    );
  }, [applyLogAttributeContainsFilter, applyLogAttributeExistsFilter, applyLogAttributeFieldColumn, applyLogAttributeFilter, applyLogAttributeNotContainsFilter, applyLogAttributeNotExistsFilter, applyLogContextAttributeFilter, excludeLogAttributeFilter, groupLogAttribute, replaceLogAttributeFilter, t, visibleLogFieldColumns]);

  const openLogDetails = (entry: LogEntry | null, source: 'history' | 'stream', selectionState: 'attached' | 'detached' = 'attached') => {
    if (!entry) return;
    setDetailSelection({ entry, source, selectionState });
  };

  useEffect(() => {
    const requestedLogLine = {
      traceId: requestedTraceId,
      spanId: requestedSpanId,
      logTimeUnixNano: requestedLogTimeUnixNano
    };
    if ((!requestedLogLine.traceId && !requestedLogLine.logTimeUnixNano) || detailSelection) {
      return;
    }

    if (showsLogTable) {
      const matchIndex = (data.list.content || []).findIndex(entry => matchesRequestedLogLine(entry, requestedLogLine));
      if (matchIndex < 0) {
        return;
      }
      const entry = data.list.content[matchIndex];
      const key = buildAutoTraceLogDetailKey(entry, 'history', matchIndex);
      if (autoOpenedTraceDetailKeyRef.current === key) {
        return;
      }
      autoOpenedTraceDetailKeyRef.current = key;
      setDetailSelection({ entry, source: 'history', selectionState: 'attached' });
      return;
    }

    if (isStreamView) {
      const item = visibleStreamItems.find(streamItem => matchesRequestedLogLine(streamItem.entry, requestedLogLine));
      if (!item) {
        return;
      }
      const key = buildAutoTraceLogDetailKey(item.entry, 'stream', item.key);
      if (autoOpenedTraceDetailKeyRef.current === key) {
        return;
      }
      autoOpenedTraceDetailKeyRef.current = key;
      setSelectedStreamKey(item.key);
      setPersistedStreamItem(item);
      setDetailSelection({ entry: item.entry, source: 'stream', selectionState: 'attached' });
    }
  }, [data.list.content, detailSelection, isStreamView, requestedLogTimeUnixNano, requestedSpanId, requestedTraceId, showsLogTable, visibleStreamItems]);

  const openTraceDrilldownFromLog = (
    entry: LogEntry | null,
    source: 'history' | 'stream',
    selectionState: 'attached' | 'detached' = 'attached'
  ) => {
    if (!entry?.traceId?.trim()) return;
    openLogDetails(entry, source, selectionState);
  };

  const closeRelatedTracePreview = () => {
    setRelatedTracePreview({
      open: false,
      loading: false,
      error: null,
      detail: null,
      selectedSpanId: null,
      selectedEventKey: null,
      contextLog: null
    });
  };

  const openRelatedTracePreview = async (entry: LogEntry | null) => {
    if (!entry) return;
    const traceId = entry.traceId?.trim();
    if (!traceId) return;
    setRelatedTracePreview({
      open: true,
      loading: true,
      error: null,
      detail: null,
      selectedSpanId: entry.spanId || null,
      selectedEventKey: null,
      contextLog: entry
    });
    try {
      const bundle = await loadTraceDetailBundle(apiMessageGet, traceId);
      const detail = mergeTraceDetailSpans(bundle.detail, bundle.spans);
      const selectedSpanId = detail.spans.find(span => span.spanId === entry.spanId)?.spanId || detail.spans[0]?.spanId || entry.spanId || null;
      setRelatedTracePreview({
        open: true,
        loading: false,
        error: null,
        detail,
        selectedSpanId,
        selectedEventKey: null,
        contextLog: entry
      });
    } catch {
      setRelatedTracePreview({
        open: true,
        loading: false,
        error: t('log.manage.related-trace.error'),
        detail: null,
        selectedSpanId: entry.spanId || null,
        selectedEventKey: null,
        contextLog: entry
      });
    }
  };

  const selectStreamItem = (item: StreamLogItem, detached = false) => {
    setSelectedStreamKey(item.key);
    setPersistedStreamItem(item);
    openLogDetails(item.entry, 'stream', detached ? 'detached' : 'attached');
  };

  const clearStream = () => {
    setStreamItems([]);
    setSelectedStreamKey(null);
    setPersistedStreamItem(null);
    pendingStreamItemsRef.current = [];
    if (streamFlushFrameRef.current != null) {
      cancelAnimationFrame(streamFlushFrameRef.current);
      streamFlushFrameRef.current = null;
    }
    streamSequenceRef.current = 0;
    const resetViewport = resolveResetStreamViewportState({
      viewportHeight: streamViewportRef.current?.clientHeight || streamViewport.viewportHeight
    });
    setStreamViewport(resetViewport);
    if (streamViewportRef.current) {
      streamViewportRef.current.scrollTop = 0;
    }
  };

  const saveCurrentLogQueryView = () => {
    const nextView = createLogSavedQueryView(query, routeContext, currentView, currentLogReturnHref, t);
    setSavedQueryViews(previous => {
      const nextViews = [nextView, ...previous.filter(view => view.route !== nextView.route)].slice(0, LOG_SAVED_QUERY_VIEW_LIMIT);
      writeLogSavedQueryViews(nextViews);
      return nextViews;
    });
    void saveSignalSavedQueryView('logs', nextView)
      .then(savedView => {
        setSavedQueryViewPersistenceMode('server-first');
        setSavedQueryViews(previous => {
          const nextViews = [savedView, ...previous.filter(view => view.id !== nextView.id && view.route !== savedView.route)].slice(0, LOG_SAVED_QUERY_VIEW_LIMIT);
          writeLogSavedQueryViews(nextViews);
          return nextViews;
        });
      })
      .catch(() => {
        setSavedQueryViewPersistenceMode('local-fallback');
      });
  };

  const copyCurrentLogQueryView = () => {
    void copyTextToClipboard(currentLogReturnHref);
  };

  const addCurrentLogQueryToDashboard = () => {
    const snapshot = createLogSavedQueryView(query, routeContext, currentView, currentLogReturnHref, t);
    const draft = applySignalDashboardPanelEditContext(createSignalDashboardPanelDraft({
      signal: 'logs',
      title: snapshot.label,
      description: snapshot.description,
      visualization: resolveLogDashboardPanelVisualization(currentView),
      route: currentLogReturnHref,
      payload: {
        source: 'logs-explorer',
        view: currentView
      }
    }), panelEditContext);
    setDashboardPanelDraftState('saving');
    void saveSignalDashboardPanelDraft(draft)
      .then(() => saveSignalDashboardPanelEditContext(panelEditContext, draft))
      .then(() => setDashboardPanelDraftState('saved'))
      .catch(() => setDashboardPanelDraftState('failed'));
  };

  const copyLogLineLink = (row: LogExplorerRow) => {
    void copyTextToClipboard(buildLogLineShareHref(currentLogReturnHref, row, logEntryByRowKey.get(row.key)));
  };

  const deleteLogSavedQueryView = (viewId: string) => {
    setSavedQueryViews(previous => {
      const nextViews = previous.filter(view => view.id !== viewId);
      writeLogSavedQueryViews(nextViews);
      return nextViews;
    });
    void deleteSignalSavedQueryView('logs', viewId)
      .then(() => setSavedQueryViewPersistenceMode('server-first'))
      .catch(() => {
        setSavedQueryViewPersistenceMode('local-fallback');
      });
  };

  const updateLogSavedQueryView = (viewId: string) => {
    const nextSnapshot = createLogSavedQueryView(query, routeContext, currentView, currentLogReturnHref, t);
    setSavedQueryViews(previous => {
      const nextViews = previous.map(view => (
        view.id === viewId
          ? { ...nextSnapshot, id: view.id, label: view.label, createdAt: view.createdAt }
          : view
      ));
      writeLogSavedQueryViews(nextViews);
      const updatedView = nextViews.find(view => view.id === viewId);
      if (updatedView) {
        void saveSignalSavedQueryView('logs', updatedView)
          .then(savedView => {
            setSavedQueryViewPersistenceMode('server-first');
            setSavedQueryViews(currentViews => {
              const syncedViews = currentViews.map(view => (view.id === viewId ? savedView : view));
              writeLogSavedQueryViews(syncedViews);
              return syncedViews;
            });
          })
          .catch(() => {
            setSavedQueryViewPersistenceMode('local-fallback');
          });
      }
      return nextViews;
    });
  };

  const startRenameLogSavedQueryView = (view: LogSavedQueryView) => {
    setEditingSavedQueryViewId(view.id);
    setSavedQueryViewLabelDraft(view.label);
  };

  const cancelRenameLogSavedQueryView = () => {
    setEditingSavedQueryViewId(null);
    setSavedQueryViewLabelDraft('');
  };

  const saveRenameLogSavedQueryView = (viewId: string) => {
    const nextLabel = savedQueryViewLabelDraft.trim();
    if (!nextLabel) {
      cancelRenameLogSavedQueryView();
      return;
    }
    setSavedQueryViews(previous => {
      const nextViews = previous.map(view => (view.id === viewId ? { ...view, label: nextLabel } : view));
      writeLogSavedQueryViews(nextViews);
      const renamedView = nextViews.find(view => view.id === viewId);
      if (renamedView) {
        void saveSignalSavedQueryView('logs', renamedView)
          .then(savedView => {
            setSavedQueryViewPersistenceMode('server-first');
            setSavedQueryViews(currentViews => {
              const syncedViews = currentViews.map(view => (view.id === viewId ? savedView : view));
              writeLogSavedQueryViews(syncedViews);
              return syncedViews;
            });
          })
          .catch(() => {
            setSavedQueryViewPersistenceMode('local-fallback');
          });
      }
      return nextViews;
    });
    cancelRenameLogSavedQueryView();
  };

  const renderViewSwitch = () =>
    showViewToggle ? (
      <>
        <HzPanelSurface
          data-log-manage-view-switch="explorer-views"
          data-log-manage-panel-surface="view-switch"
          data-log-manage-view-switch-panel-surface-owner="hertzbeat-ui-panel-surface"
          padding="view-switch"
        >
          <HzWorkbenchLayout
            as="div"
            variant="view-switch"
            data-log-manage-view-switch-layout="shared-view-switch"
            data-log-manage-view-switch-layout-owner="hertzbeat-ui-workbench-layout"
          >
            <div className="text-[12px] font-semibold text-[#8792a5]">{t('log.manage.stream.view-switch.title')}</div>
            <HzActionGroup
              layout="end-wrap"
              data-log-manage-view-toggle-group="shared-action-group"
              data-log-manage-view-toggle-group-owner="hertzbeat-ui-action-group"
            >
              <HzButton
                data-log-manage-view-toggle-control="shared-hz-button"
                data-log-manage-view-option="stream"
                data-log-manage-view-active={isStreamView}
                aria-pressed={isStreamView}
                intent={isStreamView ? 'primary' : 'secondary'}
                size="md"
                onClick={() => switchView('stream')}
              >
                <Wifi className="h-4 w-4" aria-hidden="true" />
                {t('log.manage.stream.view.stream')}
              </HzButton>
              <HzButton
                data-log-manage-view-toggle-control="shared-hz-button"
                data-log-manage-view-option="list"
                data-log-manage-view-active={currentView === 'list'}
                aria-pressed={currentView === 'list'}
                intent={currentView === 'list' ? 'primary' : 'secondary'}
                size="md"
                onClick={() => switchView('list')}
              >
                <ScrollText className="h-4 w-4" aria-hidden="true" />
                {t('log.manage.stream.view.list')}
              </HzButton>
              <HzButton
                data-log-manage-view-toggle-control="shared-hz-button"
                data-log-manage-view-option="time-series"
                data-log-manage-view-active={currentView === 'time-series'}
                aria-pressed={currentView === 'time-series'}
                intent={currentView === 'time-series' ? 'primary' : 'secondary'}
                size="md"
                onClick={() => switchView('time-series')}
              >
                <BarChart3 className="h-4 w-4" aria-hidden="true" />
                {t('log.manage.stream.view.time-series')}
              </HzButton>
              <HzButton
                data-log-manage-view-toggle-control="shared-hz-button"
                data-log-manage-view-option="table"
                data-log-manage-view-active={currentView === 'table'}
                aria-pressed={currentView === 'table'}
                intent={currentView === 'table' ? 'primary' : 'secondary'}
                size="md"
                onClick={() => switchView('table')}
              >
                <ListChecks className="h-4 w-4" aria-hidden="true" />
                {t('log.manage.stream.view.table')}
              </HzButton>
            </HzActionGroup>
          </HzWorkbenchLayout>
        </HzPanelSurface>
        <HzPanelSurface
          data-log-manage-saved-views="route-query-views"
          data-log-manage-saved-views-owner="hertzbeat-ui-panel-surface"
          data-log-manage-saved-view-persistence={savedQueryViewPersistenceMode}
          data-log-manage-saved-view-persistence-owner={LOG_SAVED_QUERY_VIEW_PERSISTENCE_OWNER[savedQueryViewPersistenceMode]}
          data-log-manage-saved-view-storage-key={LOG_SAVED_QUERY_VIEW_STORAGE_KEY}
          padding="view-switch"
          variant="view-switch"
        >
          <HzWorkbenchLayout
            as="div"
            variant="view-switch"
            data-log-manage-saved-view-layout="shared-view-switch"
            data-log-manage-saved-view-layout-owner="hertzbeat-ui-workbench-layout"
          >
            <div className="min-w-[176px]">
              <div className="text-[12px] font-semibold text-[#8792a5]">{t('log.manage.saved-view.title')}</div>
              <div
                className="mt-1 text-[11px] text-[#626b7c]"
                data-log-manage-saved-view-persistence-copy={savedQueryViewPersistenceMode}
              >
                {t(savedQueryViewPersistenceMode === 'server-first'
                  ? 'log.manage.saved-view.persistence.server'
                  : 'log.manage.saved-view.persistence.local')}
              </div>
              {dashboardPanelDraftState !== 'idle' ? (
                <div
                  className="mt-1 text-[11px] text-[#8792a5]"
                  data-log-manage-dashboard-panel-draft-status={dashboardPanelDraftState}
                  data-log-manage-dashboard-panel-draft-status-mode={panelEditContext ? 'edit-panel' : 'new-panel'}
                  data-log-manage-dashboard-panel-draft-status-dashboard={panelEditContext?.dashboardKey || ''}
                  data-log-manage-dashboard-panel-draft-status-panel={panelEditContext?.panelId || ''}
                >
                  {t(panelEditContext
                    ? `log.manage.dashboard-panel-draft.update-${dashboardPanelDraftState}`
                    : `log.manage.dashboard-panel-draft.${dashboardPanelDraftState}`)}
                </div>
              ) : null}
            </div>
            <HzActionGroup
              layout="end-wrap"
              data-log-manage-saved-view-action-group="shared-action-group"
              data-log-manage-saved-view-action-group-owner="hertzbeat-ui-action-group"
            >
              <HzButton
                type="button"
                intent="secondary"
                size="md"
                onClick={saveCurrentLogQueryView}
                data-log-manage-saved-view-action="save-current"
                data-log-manage-saved-view-action-owner="hertzbeat-ui-button"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {t('log.manage.saved-view.save-current')}
              </HzButton>
              <HzButton
                type="button"
                intent="secondary"
                size="md"
                title={t('log.manage.saved-view.copy-current')}
                aria-label={t('log.manage.saved-view.copy-current')}
                onClick={copyCurrentLogQueryView}
                data-log-manage-saved-view-copy-action="current"
                data-log-manage-saved-view-copy-owner="hertzbeat-ui-button"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
              </HzButton>
              <HzButton
                type="button"
                intent="secondary"
                size="md"
                title={t(panelEditContext ? 'log.manage.dashboard-panel-draft.update-current' : 'log.manage.dashboard-panel-draft.add-current')}
                aria-label={t(panelEditContext ? 'log.manage.dashboard-panel-draft.update-current' : 'log.manage.dashboard-panel-draft.add-current')}
                onClick={addCurrentLogQueryToDashboard}
                data-log-manage-dashboard-panel-draft-action={panelEditContext ? 'update-current' : 'add-current'}
                data-log-manage-dashboard-panel-draft-action-owner="hertzbeat-ui-button"
                data-log-manage-dashboard-panel-draft-action-mode={panelEditContext ? 'edit-panel' : 'new-panel'}
                data-log-manage-dashboard-panel-draft-action-dashboard={panelEditContext?.dashboardKey || ''}
                data-log-manage-dashboard-panel-draft-action-panel={panelEditContext?.panelId || ''}
                data-log-manage-dashboard-panel-draft-action-draft={panelEditContext?.draftKey || ''}
              >
                <HzButtonIcon
                  icon={BarChart3}
                  data-log-manage-dashboard-panel-draft-action-icon="add-current"
                  data-log-manage-dashboard-panel-draft-action-icon-owner="hertzbeat-ui-button-icon"
                />
              </HzButton>
              {panelEditContext?.returnTo ? (
                <HzButtonLink
                  component={Link}
                  href={panelEditContext.returnTo}
                  intent="secondary"
                  size="md"
                  data-log-manage-dashboard-panel-draft-return-action="dashboard"
                  data-log-manage-dashboard-panel-draft-return-action-owner="hertzbeat-ui-button-link"
                  data-log-manage-dashboard-panel-draft-return-action-dashboard={panelEditContext.dashboardKey || ''}
                  data-log-manage-dashboard-panel-draft-return-action-panel={panelEditContext.panelId || ''}
                >
                  <HzButtonIcon
                    icon={BarChart3}
                    data-log-manage-dashboard-panel-draft-return-action-icon="dashboard"
                    data-log-manage-dashboard-panel-draft-return-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('log.manage.dashboard-panel-draft.return-dashboard')}
                </HzButtonLink>
              ) : null}
              {savedQueryViews.length ? (
                savedQueryViews.map(view => {
                  const active = view.route === currentLogReturnHref;
                  const editing = editingSavedQueryViewId === view.id;
                  return (
                    <React.Fragment key={view.id}>
                      {editing ? (
                        <>
                          <HzInput
                            value={savedQueryViewLabelDraft}
                            onChange={event => setSavedQueryViewLabelDraft(event.target.value)}
                            onInput={event => setSavedQueryViewLabelDraft(event.currentTarget.value)}
                            aria-label={t('log.manage.saved-view.rename-label')}
                            data-log-manage-saved-view-rename-input={view.id}
                            data-log-manage-saved-view-rename-input-owner="hertzbeat-ui-input"
                          />
                          <HzButton
                            type="button"
                            intent="primary"
                            size="md"
                            title={t('log.manage.saved-view.rename-save')}
                            aria-label={t('log.manage.saved-view.rename-save')}
                            data-log-manage-saved-view-rename-save-action={view.id}
                            data-log-manage-saved-view-rename-save-owner="hertzbeat-ui-button"
                            onClick={() => saveRenameLogSavedQueryView(view.id)}
                          >
                            <Check className="h-4 w-4" aria-hidden="true" />
                          </HzButton>
                          <HzButton
                            type="button"
                            intent="secondary"
                            size="md"
                            title={t('log.manage.saved-view.rename-cancel')}
                            aria-label={t('log.manage.saved-view.rename-cancel')}
                            data-log-manage-saved-view-rename-cancel-action={view.id}
                            data-log-manage-saved-view-rename-cancel-owner="hertzbeat-ui-button"
                            onClick={cancelRenameLogSavedQueryView}
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </HzButton>
                        </>
                      ) : (
                        <>
                          <HzButton
                            type="button"
                            intent={active ? 'primary' : 'secondary'}
                            size="md"
                            title={view.description}
                            data-log-manage-saved-view-select-action={view.id}
                            data-log-manage-saved-view-select-owner="hertzbeat-ui-button"
                            data-log-manage-saved-view-active={active ? 'true' : 'false'}
                            onClick={() => restoreSavedViewRoute(view.route)}
                          >
                            <ListChecks className="h-4 w-4" aria-hidden="true" />
                            <span className="min-w-0 truncate">{view.label}</span>
                          </HzButton>
                          <HzButton
                            type="button"
                            intent="secondary"
                            size="md"
                            title={t('log.manage.saved-view.rename')}
                            aria-label={t('log.manage.saved-view.rename')}
                            data-log-manage-saved-view-rename-action={view.id}
                            data-log-manage-saved-view-rename-owner="hertzbeat-ui-button"
                            onClick={() => startRenameLogSavedQueryView(view)}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </HzButton>
                          <HzButton
                            type="button"
                            intent="secondary"
                            size="md"
                            title={t('log.manage.saved-view.update')}
                            aria-label={t('log.manage.saved-view.update')}
                            data-log-manage-saved-view-update-action={view.id}
                            data-log-manage-saved-view-update-owner="hertzbeat-ui-button"
                            onClick={() => updateLogSavedQueryView(view.id)}
                          >
                            <Replace className="h-4 w-4" aria-hidden="true" />
                          </HzButton>
                        </>
                      )}
                      <HzButton
                        type="button"
                        intent="secondary"
                        size="md"
                        title={t('common.button.delete')}
                        aria-label={t('common.button.delete')}
                        data-log-manage-saved-view-delete-action={view.id}
                        data-log-manage-saved-view-delete-owner="hertzbeat-ui-button"
                        onClick={() => deleteLogSavedQueryView(view.id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </HzButton>
                    </React.Fragment>
                  );
                })
              ) : (
                <span
                  className="min-w-0 truncate text-[12px] text-[#727b8c]"
                  data-log-manage-saved-view-empty="local-route-snapshots"
                >
                  {t('log.manage.saved-view.empty')}
                </span>
              )}
            </HzActionGroup>
          </HzWorkbenchLayout>
        </HzPanelSurface>
      </>
    ) : null;

  const renderDetailDialog = () => (
    <LogStreamDetailDialog
      open={detailLog != null}
      onClose={() => setDetailSelection(null)}
      title={detailSelection?.source === 'stream' ? t('log.manage.stream.detail.stream-title') : t('log.manage.stream.detail.title')}
      subtitle={resolveLogDetailTitle(detailLog, t)}
      traceId={detailLog?.traceId}
      selectionState={detailSelection?.selectionState}
      overlayProps={{
        'data-log-manage-detail-source-context': sourceContextKind,
        'data-log-manage-detail-auto-open-key': autoOpenedTraceDetailKeyRef.current || '',
        'data-log-manage-detail-requested-trace': requestedTraceId,
        'data-log-manage-detail-requested-span': requestedSpanId,
        'data-log-manage-detail-selected-trace': detailLog?.traceId || '',
        'data-log-manage-detail-selected-span': detailLog?.spanId || ''
      }}
      warning={detailSelection?.selectionState === 'detached' ? t('log.manage.stream.detail.detached-warning') : undefined}
      facts={detailFacts}
      attributionDiagnostics={detailAttributionDiagnostics}
      badges={['JSON']}
      metaItems={[
        resolveLogDetailSubtitle(detailLog, t),
        ...(detailLog?.traceId ? [`traceId · ${detailLog.traceId}`] : [])
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          {detailLog?.traceId ? (
            <HzButton
              data-log-manage-detail-dialog-action="trace"
              data-log-manage-results-open-trace-action="true"
              size="md"
              onClick={() => openRelatedTracePreview(detailLog)}
            >
              {t('log.manage.stream.action.view-trace')}
            </HzButton>
          ) : (
            <span className="inline-flex" title={missingTraceHandoffTitle}>
              <HzButton
                data-log-manage-detail-dialog-action="trace"
                data-log-manage-results-open-trace-action="true"
                data-log-manage-results-open-trace-action-disabled="missing-trace-id"
                size="md"
                disabled
                title={missingTraceHandoffTitle}
                aria-label={missingTraceHandoffTitle}
              >
                {t('log.manage.stream.action.view-trace')}
              </HzButton>
            </span>
          )}
          <HzButtonLink component={Link} data-log-manage-detail-dialog-action="metrics" href={detailHandoffLinks.metricsHref} size="md">
            {t('log.manage.stream.action.view-metrics')}
          </HzButtonLink>
          <LogEntityDetailAction
            href={detailHandoffLinks.entityHref}
            canOpen={canOpenDetailEntity}
            missingEntityHandoffTitle={missingEntityHandoffTitle}
            label={t('log.manage.route.action.entity')}
          />
          {detailCodeHref ? (
            <HzButtonLink data-log-manage-detail-dialog-action="code" href={detailCodeHref} target="_blank" rel="noreferrer" size="md">
              {t('log.manage.stream.action.view-code')}
            </HzButtonLink>
          ) : null}
          {detailContextRoute ? (
            <HzButton
              data-log-stream-detail-context-action="show-context"
              data-log-stream-detail-context-owner="hertzbeat-ui-button"
              size="md"
              intent="secondary"
              onClick={() => {
                restoreSavedViewRoute(detailContextRoute);
                setDetailSelection(null);
              }}
              aria-label={t('log.manage.stream.action.show-context.aria')}
            >
              <HzButtonIcon
                icon={ScrollText}
                data-log-stream-detail-context-icon="context"
                data-log-stream-detail-context-icon-owner="hertzbeat-ui-button-icon"
              />
              {t('log.manage.stream.action.show-context')}
            </HzButton>
          ) : null}
        </div>
      }
      rows={detailRows}
      metricsRows={detailMetricsRows}
      metricsHref={detailHandoffLinks.metricsHref}
      metricsPreviewRows={detailMetricsPreviewRows}
      metricsPreviewLoading={detailMetricsPreviewState.loading}
      metricsPreviewError={detailMetricsPreviewState.error}
      metricsPreviewEmpty={detailMetricsPreviewEmpty}
      contextRows={detailContextRows}
      contextLoading={detailContextState.loading}
      contextError={detailContextState.error}
      contextHasMoreBefore={Boolean(detailContextState.data?.hasMoreBefore)}
      contextHasMoreAfter={Boolean(detailContextState.data?.hasMoreAfter)}
      onLoadMoreContext={direction => {
        const cursorLogTimeUnixNano = readLogDetailContextCursor(detailContextState.data, direction, detailLog);
        if (!cursorLogTimeUnixNano) return;
        setDetailContextLoadRequest({ direction, cursorLogTimeUnixNano });
      }}
      attributeRows={detailAttributeRows}
      renderAttributeAction={renderLogAttributeFilterAction}
      json={detailJson}
      raw={detailRaw}
      onCopyJson={value => void copyTextToClipboard(value)}
      onCopyRaw={value => void copyTextToClipboard(value)}
      onCopyMetricQuery={value => void copyTextToClipboard(value)}
    />
  );

  const renderRelatedTraceDialog = () => (
    <LogRelatedTraceDialog
      open={relatedTracePreview.open}
      onClose={closeRelatedTracePreview}
      title={relatedTraceSelectedSpan?.spanName || relatedTraceDetail?.rootSpanName || relatedTraceDetail?.traceId || t('log.manage.related-trace.fallback-title')}
      subtitle={relatedTraceDetail?.serviceName || resolveLogDetailSubtitle(relatedTraceContextLog, t)}
      loading={relatedTracePreview.loading}
      error={relatedTracePreview.error}
      rows={relatedTraceRows}
      selectedKey={relatedTraceSelectedSpan?.spanId || null}
      selectedEventKey={relatedTracePreview.selectedEventKey}
      onSelect={key => setRelatedTracePreview(previous => ({ ...previous, selectedSpanId: key, selectedEventKey: null }))}
      onSelectEvent={(eventKey, rowKey) => setRelatedTracePreview(previous => ({ ...previous, selectedSpanId: rowKey || previous.selectedSpanId, selectedEventKey: eventKey }))}
      stageMeta={[
        ...(relatedTraceDetail?.traceId ? [relatedTraceDetail.traceId] : []),
        relatedTraceRows.length > 0 ? t('log.manage.related-trace.spans-count', { count: relatedTraceRows.length }) : '',
        ...(relatedTraceDetail?.durationNanos ? [formatTraceDurationNanos(relatedTraceDetail.durationNanos)] : [])
      ].filter(Boolean)}
      badges={relatedTraceDetail ? [t('log.manage.related-trace.badge')] : []}
      metaItems={relatedTraceDetail ? [`traceId · ${relatedTraceDetail.traceId}`] : []}
      stageFacts={relatedTraceStageFacts}
      timelineTicks={buildTraceTimelineTicks(relatedTraceDetail?.durationNanos)}
      selectedFacts={relatedTraceSelectedFacts}
      headerAction={
        relatedTraceWorkspaceEntry?.traceId ? (
          <HzButtonLink
            component={Link}
            data-log-related-trace-open-workspace-action="true"
            data-log-related-trace-detail-action="workspace"
            href={relatedTraceWorkspaceHref}
            size="md"
          >
            {t('log.manage.related-trace.open-workspace')}
          </HzButtonLink>
        ) : (
          <span className="inline-flex" title={missingFullTraceHandoffTitle}>
            <HzButton
              data-log-related-trace-open-workspace-action-disabled="missing-trace-id"
              data-log-related-trace-detail-action="workspace"
              size="md"
              disabled
              title={missingFullTraceHandoffTitle}
              aria-label={missingFullTraceHandoffTitle}
            >
              {t('log.manage.related-trace.open-workspace')}
            </HzButton>
          </span>
        )
      }
      emptyTitle={t('log.manage.related-trace.empty-title')}
      emptyCopy={t('log.manage.related-trace.empty-copy')}
      loadingTitle={t('log.manage.related-trace.loading-title')}
      loadingCopy={t('log.manage.related-trace.loading-copy')}
      spanLabel={t('log.manage.related-trace.span-label')}
      durationLabel={t('log.manage.related-trace.duration-label')}
      timelineLabel={t('log.manage.related-trace.timeline-label')}
    />
  );

  const renderStreamStage = () => {
    const selectedStreamRows = selectedStreamEntry
      ? buildSelectedLogRows(selectedStreamEntry, t, bodyText, formatTime, severityLabel)
      : [];
    const pauseVisible = shouldShowStreamPauseOverlay({ isPaused: isStreamPaused, itemCount: streamItems.length });
    const streamStageHeaderActions = (
      <>
        <HzStatusBadge
          data-log-manage-stream-status={streamStatus}
          data-log-manage-stream-status-badge-owner="hertzbeat-ui-status-badge"
          tone={logStreamStatusBadgeTone(streamStatus)}
          size="md"
        >
          {streamStatus === 'connected' ? <Wifi className="h-4 w-4" aria-hidden="true" /> : <WifiOff className="h-4 w-4" aria-hidden="true" />}
          {streamStatusCopy(streamStatus, t)}
        </HzStatusBadge>
        <HzStatusBadge data-log-manage-stream-count-badge-owner="hertzbeat-ui-status-badge" tone="neutral" size="md">
          {t('log.manage.stream.count', { count: streamItems.length })}
        </HzStatusBadge>
        <HzStatusBadge
          data-log-manage-stream-live-chip={isStreamPaused ? 'paused' : 'live'}
          data-log-manage-stream-live-badge-owner="hertzbeat-ui-status-badge"
          tone={isStreamPaused ? 'warning' : 'success'}
          size="md"
        >
          {isStreamPaused ? t('log.manage.stream.state.paused') : t('log.manage.stream.state.live')}
        </HzStatusBadge>
        <HzButton
          data-log-manage-reconnect-action="true"
          data-log-manage-stream-control="reconnect"
          size="md"
          onClick={() => setStreamReconnectNonce(value => value + 1)}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t('log.manage.stream.action.reconnect')}
        </HzButton>
        <HzButton data-log-manage-stream-control="pause-toggle" size="md" onClick={() => setIsStreamPaused(value => !value)}>
          {isStreamPaused ? <PlayCircle className="h-4 w-4" aria-hidden="true" /> : <PauseCircle className="h-4 w-4" aria-hidden="true" />}
          {isStreamPaused ? t('log.manage.stream.action.resume') : t('log.manage.stream.action.pause')}
        </HzButton>
        <HzButton data-log-manage-stream-control="clear" size="md" onClick={clearStream}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {t('log.manage.stream.action.clear')}
        </HzButton>
      </>
    );

    return (
      <HzPanelSurface
        data-log-manage-stream-stage="hertzbeat-live-log-stream"
        data-log-manage-panel-surface="stream-stage"
        data-log-manage-stream-live-state={isStreamPaused ? 'paused' : 'live'}
        data-log-manage-stream-stage-panel-surface-owner="hertzbeat-ui-panel-surface"
        clip
      >
        <HzPanelHeader
          data-log-manage-stream-stage-header-owner="hertzbeat-ui-panel-header"
          eyebrow={t('log.manage.stream.stage.kicker')}
          title={t('log.manage.stream.stage.title')}
          actions={streamStageHeaderActions}
        />
        {pauseVisible ? (
          <HzStateNotice
            data-log-manage-stream-pause-notice-owner="hertzbeat-ui-state-notice"
            data-log-manage-stream-pause-notice="paused-buffer-visible"
            tone="warning"
            title={t('log.manage.stream.paused-copy')}
            variant="embedded"
            className="border-b border-t-0 border-[#2b3039] bg-[#17140b]"
          />
        ) : null}
        <HzWorkbenchLayout
          as="div"
          variant="stream-stage"
          data-log-manage-stream-stage-layout="shared-stream-stage"
          data-log-manage-stream-stage-layout-owner="hertzbeat-ui-workbench-layout"
        >
          <HzScrollViewport
            ref={streamViewportRef}
            variant="log-stream"
            data-log-manage-stream-viewport="virtualized-log-stream"
            data-log-manage-stream-viewport-owner="hertzbeat-ui-scroll-viewport"
            data-log-manage-stream-window={`${streamWindow.startIndex}:${streamWindow.endIndex}`}
            data-log-manage-stream-row-height={STREAM_VIEWPORT_ROW_HEIGHT}
            data-log-manage-stream-retention={`${streamItems.length}/${maxStreamEntries}`}
            onScroll={event => setStreamViewport(readStreamViewportState(event.currentTarget))}
          >
            {streamItems.length > 0 ? (
              <div className="divide-y divide-[#252b35]">
                {streamWindow.topSpacerHeight > 0 ? <div aria-hidden="true" style={{ height: streamWindow.topSpacerHeight }} /> : null}
                {visibleStreamItems.map((item, offset) => {
                  const entry = item.entry;
                  const entryTraceId = entry.traceId || '-';
                  const selected = item.key === selectedStreamKey;
                  const rowIndex = streamWindow.startIndex + offset;
                  const streamSeverity = severityLabel(entry);
                  return (
                    <HzLogStreamLiveRow
                      key={item.key}
                      selected={selected}
                      data-log-manage-stream-row="true"
                      data-log-manage-stream-row-owner="hertzbeat-ui-log-stream-row"
                      data-log-manage-stream-row-index={rowIndex}
                      data-log-manage-stream-row-style="compact-live-row"
                      data-log-manage-stream-trace-id={entryTraceId}
                      data-log-manage-stream-selected={selected}
                      onClick={() => selectStreamItem(item)}
                      style={{ height: STREAM_VIEWPORT_ROW_HEIGHT }}
                    >
                      <HzStatusBadge
                        data-log-manage-stream-severity-tone={logSeverityTone(streamSeverity)}
                        data-log-manage-stream-severity-badge-owner="hertzbeat-ui-status-badge"
                        tone={logSeverityStatusTone(logSeverityTone(streamSeverity))}
                        className="min-w-[50px] justify-center self-center"
                      >
                        {streamSeverity}
                      </HzStatusBadge>
                      <span className="truncate font-mono text-[11px] text-[#7f8a9d]">
                        {formatTime(entry.timeUnixNano ? entry.timeUnixNano / 1_000_000 : null)}
                      </span>
                      <span className="min-w-0 truncate font-mono text-[12px] text-[#e8edf5]">{bodyText(entry.body)}</span>
                      <span className="hidden min-w-0 items-center gap-2 text-[11px] text-[#7f8a9d] sm:flex">
                        <span className="truncate">{readLogAttribute(entry.resource, 'service.name') || 'unknown-service'}</span>
                        <span className="min-w-[72px] truncate font-mono">traceId · {entryTraceId}</span>
                      </span>
                    </HzLogStreamLiveRow>
                  );
                })}
                {streamWindow.bottomSpacerHeight > 0 ? <div aria-hidden="true" style={{ height: streamWindow.bottomSpacerHeight }} /> : null}
              </div>
            ) : (
              <HzEmptyState
                data-log-manage-stream-empty-state="true"
                data-log-manage-stream-empty-owner="hertzbeat-ui-empty-state"
                title={t('log.manage.stream.empty.title')}
                description={t('log.manage.stream.empty.copy')}
                className="h-[520px] border-y-0 text-left"
              />
            )}
          </HzScrollViewport>
          <HzDetailAside
            data-log-manage-stream-selected-aside="shared-detail-aside"
            data-log-manage-stream-selected-aside-owner="hertzbeat-ui-detail-aside"
          >
            <HzPanelHeader
              data-log-manage-stream-selected-header-owner="hertzbeat-ui-panel-header"
              eyebrow={t('log.manage.stream.selected.title')}
              title={selectedStreamEntry ? resolveLogDetailTitle(selectedStreamEntry, t) : t('log.manage.stream.selected.none')}
              meta={streamSelection.detached ? (
                <HzStatusBadge
                  data-log-manage-stream-selected-detached-badge-owner="hertzbeat-ui-status-badge"
                  tone="warning"
                  size="xs"
                >
                  {t('log.manage.stream.selected.detached')}
                </HzStatusBadge>
              ) : null}
              className="-mx-4 -mt-4 border-x-0 border-t-0 bg-transparent"
            />
            <HzDetailBodyStack
              data-log-manage-stream-selected-body="shared-detail-body-stack"
              data-log-manage-stream-selected-body-owner="hertzbeat-ui-detail-body-stack"
            >
              {selectedStreamRows.length > 0 ? (
                <HzDetailRows
                  data-log-manage-stream-selected-detail-owner="hertzbeat-ui-detail-rows"
                  rows={selectedStreamRows}
                />
              ) : (
                <HzStateNotice
                  data-log-manage-stream-selected-helper-owner="hertzbeat-ui-state-notice"
                  data-log-manage-stream-selected-helper="selected-empty"
                  tone="info"
                  title={t('log.manage.stream.selected.helper')}
                  variant="hint"
                />
              )}
            </HzDetailBodyStack>
            <LogAttributionDiagnosticsPanel rows={selectedStreamAttributionDiagnostics} t={t} />
            <HzControlStack
              data-log-manage-stream-detail-action-stack="shared-control-stack"
              data-log-manage-stream-detail-action-stack-owner="hertzbeat-ui-control-stack"
              className="mt-4"
            >
              <HzButton
                data-log-manage-stream-detail-action="view-log"
                size="md"
                disabled={!selectedStreamEntry}
                onClick={() => openLogDetails(selectedStreamEntry, 'stream', streamSelection.detached ? 'detached' : 'attached')}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                {t('log.manage.stream.action.view-log')}
              </HzButton>
              <HzButton
                data-log-manage-results-open-trace-action="true"
                data-log-manage-open-log-detail-before-trace="true"
                data-log-manage-stream-detail-action="view-trace"
                size="md"
                disabled={!selectedStreamEntry?.traceId}
                title={!selectedStreamEntry?.traceId ? missingTraceHandoffTitle : undefined}
                aria-label={!selectedStreamEntry?.traceId ? missingTraceHandoffTitle : undefined}
                data-log-manage-results-open-trace-action-disabled={!selectedStreamEntry?.traceId ? 'missing-trace-id' : undefined}
                onClick={() => openTraceDrilldownFromLog(selectedStreamEntry, 'stream', streamSelection.detached ? 'detached' : 'attached')}
              >
                {t('log.manage.stream.action.view-trace')}
              </HzButton>
              <LogEntityDetailAction
                href={streamHandoffLinks.entityHref}
                canOpen={canOpenStreamEntity}
                missingEntityHandoffTitle={missingEntityHandoffTitle}
                label={t('log.manage.route.action.entity')}
                actionScope="stream-detail"
              />
            </HzControlStack>
          </HzDetailAside>
        </HzWorkbenchLayout>
      </HzPanelSurface>
    );
  };

  return (
    <HzSignalWorkbenchShell
      data-log-manage-route="otlp-hertzbeat-ui-log-workbench"
      data-log-manage-style-baseline="hertzbeat-ui-matte"
      data-log-manage-shell-owner="hertzbeat-ui-signal-workbench-shell"
      data-log-manage-shell-chrome="topology-workbench"
      data-log-manage-source-context={sourceContextKind}
      data-log-manage-source-context-return={routeContext.returnTo || ''}
      data-log-manage-source-context-trace={requestedTraceId}
      data-log-manage-source-context-span={requestedSpanId}
      data-log-manage-source-context-service={routeContext.serviceName || ''}
      data-log-manage-panel-edit-context={panelEditContext?.intent || 'none'}
      data-log-manage-panel-edit-dashboard={panelEditContext?.dashboardKey || ''}
      data-log-manage-panel-edit-panel={panelEditContext?.panelId || ''}
      data-log-manage-panel-edit-draft={panelEditContext?.draftKey || ''}
      data-log-manage-panel-edit-return={panelEditContext?.returnTo || ''}
      layout="topology-workbench"
    >
        <HzPanelSurface
          data-log-manage-header="hertzbeat-ui-compact-header"
          data-log-manage-panel-surface="header"
          data-log-manage-header-padding-owner="hertzbeat-ui-panel-surface"
          padding="header"
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <div className="min-w-0">
              <p className="mb-2 text-[12px] font-semibold tracking-[0.08em] text-[#8792a5]">{t('log.manage.route.kicker')}</p>
              <h1 className="text-[30px] font-semibold tracking-normal text-[#f4f7fb]">{t('log.manage.route.title')}</h1>
              <p className="mt-3 max-w-[780px] text-[13px] leading-6 text-[#9ca7ba]">
                {t('log.manage.route.subtitle')}
              </p>
            </div>
            <div
              data-log-manage-time-toolbar="top-right-corner"
              className="ml-auto grid w-full min-w-0 max-w-[1120px] gap-2 xl:w-auto"
            >
              <div
                data-log-manage-time-control="shared-time-context-control"
                data-log-manage-time-control-placement="top-right"
                data-log-manage-time-control-visual="narrow-top-right-rail"
                data-log-manage-time-control-fit="no-clipping"
                className="flex max-w-full justify-end"
              >
                <TimeRangeControl
                  value={timeContext}
                  labels={buildTimeRangeControlLabels(t)}
                  onApply={applyTimeContext}
                  onRefresh={() => applyTimeContext(timeContext)}
                  onReset={() => applyTimeContext({ timeRange: 'last-30m', refresh: timeContext.refresh, live: 'true', tz: timeContext.tz })}
                  showAbsoluteFields
                  variant="narrow-rail"
                  className="justify-end"
                  presetSelectProps={{ 'data-log-manage-time-range-select': 'true' }}
                  presetOptionDataAttribute="data-log-manage-time-range-preset"
                  refreshActionProps={{ 'data-log-manage-time-refresh-action': 'true' }}
                />
              </div>
              <HzActionGroup
                data-log-manage-action-row="hertzbeat-ui-workbench-actions"
                data-log-manage-action-row-owner="hertzbeat-ui-action-group"
                data-log-manage-action-row-layout-owner="hertzbeat-ui-action-group"
                layout="full-end"
              >
                {routeContext.returnTo ? (
                  <HzButtonLink
                    component={Link}
                    data-log-manage-return-action="true"
                    data-log-manage-header-action="return-source"
                    href={routeContext.returnTo}
                    size="md"
                  >
                    <HzButtonIcon
                      icon={Workflow}
                      data-log-manage-header-action-icon="return-source"
                      data-log-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                    />
                    {t('log.manage.route.action.return-source')}
                  </HzButtonLink>
                ) : null}
                <HzButtonLink component={Link} href={handoffLinks.intakeHref} size="md" data-log-manage-header-action="intake">
                  <HzButtonIcon
                    icon={Workflow}
                    data-log-manage-header-action-icon="intake"
                    data-log-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('log.manage.route.action.intake')}
                </HzButtonLink>
                <HzButtonLink component={Link} href="/setting/collector" size="md" data-log-manage-header-action="collector">
                  <HzButtonIcon
                    icon={Server}
                    data-log-manage-header-action-icon="collector"
                    data-log-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('log.manage.route.action.collector')}
                </HzButtonLink>
                <LogEntityDetailAction
                  href={handoffLinks.entityHref}
                  canOpen={canOpenActiveEntity}
                  missingEntityHandoffTitle={missingEntityHandoffTitle}
                  label={t('log.manage.route.action.entity')}
                  actionScope="header"
                  showIcon
                />
                <HzButtonLink component={Link} href={handoffLinks.alertHandlingHref} size="md" data-log-manage-header-action="alerts">
                  <HzButtonIcon
                    icon={BellRing}
                    data-log-manage-header-action-icon="alerts"
                    data-log-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('log.manage.route.action.alerts')}
                </HzButtonLink>
                <HzButtonLink component={Link} href={handoffLinks.alertRulesHref} size="md" data-log-manage-header-action="create-alert">
                  <HzButtonIcon
                    icon={BellPlus}
                    data-log-manage-header-action-icon="create-alert"
                    data-log-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('explorer.actions.create-alert')}
                </HzButtonLink>
                <HzButtonLink component={Link} href={handoffLinks.dashboardHref} size="md" data-log-manage-header-action="add-dashboard">
                  <HzButtonIcon
                    icon={BarChart3}
                    data-log-manage-header-action-icon="add-dashboard"
                    data-log-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('explorer.actions.add-dashboard')}
                </HzButtonLink>
                <HzButtonLink component={Link} href="/setting/define" size="md" data-log-manage-header-action="templates">
                  <HzButtonIcon
                    icon={ListChecks}
                    data-log-manage-header-action-icon="templates"
                    data-log-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('log.manage.route.action.templates')}
                </HzButtonLink>
              </HzActionGroup>
            </div>
          </div>
        </HzPanelSurface>

        {renderViewSwitch()}

        <HzPanelSurface
          data-log-manage-query-bar="hertzbeat-ui-query-row"
          data-log-manage-panel-surface="query"
          data-log-manage-panel-surface-padding-owner="hertzbeat-ui-panel-surface"
          padding="query"
        >
          <div className="flex flex-wrap items-center gap-2">
            <HzSearchFieldFrame
              width="log-query"
              data-log-manage-query-search-frame="shared-search-field-frame"
              data-log-manage-query-search-frame-owner="hertzbeat-ui-search-field-frame"
              icon={(
                <HzSearchFieldIcon
                  icon={Search}
                  data-log-manage-query-search-icon="service"
                  data-log-manage-query-search-icon-owner="hertzbeat-ui-search-field-icon"
                />
              )}
            >
              <HzInput
                aria-label={t('log.manage.query.search.aria')}
                value={draft.search}
                onChange={event => setDraft(updateDraftField('search', event.target.value))}
                placeholder={t('log.manage.query.search.placeholder')}
                inset="search-icon"
                width="log-query-expression"
                data-log-manage-query-search-input="true"
                data-log-manage-query-search-input-owner="hertzbeat-ui-input"
              />
            </HzSearchFieldFrame>
            <HzSelect
              aria-label={t('log.manage.query.severity.aria')}
              value={draft.severityText || 'all'}
              onChange={event => applySeverity(event.target.value === 'all' ? '' : event.target.value)}
              width="log-severity"
              triggerTone="signal-query"
              data-log-manage-query-severity-select="shared-log-severity-select"
              data-log-manage-query-severity-select-owner="hertzbeat-ui-select"
              options={[
                { value: 'all', label: t('log.manage.query.severity.all') },
                ...quickSeverityFilters.map(severity => ({ value: severity, label: severity }))
              ]}
            />
            <HzButton data-log-manage-run-query-action="true" intent="primary" size="md" onClick={() => applyQuery()}>
              <Play className="h-4 w-4" aria-hidden="true" />
              {isStreamView ? t('log.manage.query.run.stream') : t('log.manage.query.run.history')}
            </HzButton>
            <HzButton data-log-manage-reset-action="true" intent="secondary" size="md" onClick={resetQuery}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t('log.manage.query.reset')}
            </HzButton>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <HzInput
              aria-label={t('log.manage.query.trace-id')}
              value={draft.traceId}
              onChange={event => setDraft(updateDraftField('traceId', event.target.value))}
              placeholder={t('log.manage.query.trace-id')}
              width="log-query-token"
              data-log-manage-query-token-input="trace-id"
              data-log-manage-query-token-input-owner="hertzbeat-ui-input"
            />
            <HzInput
              aria-label={t('log.manage.query.span-id')}
              value={draft.spanId}
              onChange={event => setDraft(updateDraftField('spanId', event.target.value))}
              placeholder={t('log.manage.query.span-id')}
              width="log-query-token"
              data-log-manage-query-token-input="span-id"
              data-log-manage-query-token-input-owner="hertzbeat-ui-input"
            />
            <HzInput
              aria-label={t('log.manage.query.body.aria')}
              value={draft.logContent}
              onChange={event => setDraft(updateDraftField('logContent', event.target.value))}
              placeholder={t('log.manage.query.body.placeholder')}
              width="log-query-body"
              data-log-manage-query-body-input="shared-log-body-input"
              data-log-manage-query-body-input-owner="hertzbeat-ui-input"
            />
            <HzInput
              aria-label={t('log.manage.query.resource-filter.aria')}
              value={draft.resourceFilter || ''}
              onChange={event => setDraft(updateDraftField('resourceFilter', event.target.value))}
              placeholder={t('log.manage.query.resource-filter.placeholder')}
              width="log-query-filter"
              data-log-manage-query-resource-filter-input="true"
              data-log-manage-query-resource-filter-input-owner="hertzbeat-ui-input"
            />
            <HzInput
              aria-label={t('log.manage.query.attribute-filter.aria')}
              value={draft.attributeFilter || ''}
              onChange={event => setDraft(updateDraftField('attributeFilter', event.target.value))}
              placeholder={t('log.manage.query.attribute-filter.placeholder')}
              width="log-query-filter"
              data-log-manage-query-attribute-filter-input="true"
              data-log-manage-query-attribute-filter-input-owner="hertzbeat-ui-input"
            />
          </div>
          <HzControlStack
            layout="inline-wrap"
            spacing="top-2"
            data-log-manage-quick-filter-controls="logs-quick-filters"
            data-log-manage-quick-filter-controls-owner="hertzbeat-ui-control-stack"
          >
            {quickSeverityFilters.map(severity => (
              <HzButton
                key={severity}
                data-log-manage-quick-filter="severity"
                data-log-manage-quick-filter-owner="hertzbeat-ui-button"
                data-log-manage-quick-filter-value={severity}
                data-log-manage-quick-filter-active={selectedSeverity === severity}
                intent={selectedSeverity === severity ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => applySeverity(severity)}
              >
                {t('log.manage.quick-filter.severity')}: {severity}
              </HzButton>
            ))}
            {serviceQuickFilterValues.map(serviceName => (
              <HzButton
                key={`service-${serviceName}`}
                data-log-manage-quick-filter="serviceName"
                data-log-manage-quick-filter-owner="hertzbeat-ui-button"
                data-log-manage-quick-filter-value={serviceName}
                data-log-manage-quick-filter-active={routeContext.serviceName === serviceName}
                intent={routeContext.serviceName === serviceName ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => applyLogQuickRouteContext('serviceName', serviceName)}
              >
                {t('log.manage.quick-filter.service')}: {serviceName}
              </HzButton>
            ))}
            {environmentQuickFilterValues.map(environment => (
              <HzButton
                key={`environment-${environment}`}
                data-log-manage-quick-filter="environment"
                data-log-manage-quick-filter-owner="hertzbeat-ui-button"
                data-log-manage-quick-filter-value={environment}
                data-log-manage-quick-filter-active={routeContext.environment === environment}
                intent={routeContext.environment === environment ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => applyLogQuickRouteContext('environment', environment)}
              >
                {t('log.manage.quick-filter.environment')}: {environment}
              </HzButton>
            ))}
          </HzControlStack>
        </HzPanelSurface>

        {data.loadStatus?.state === 'degraded' ? (
          <HzStateNotice
            data-log-manage-api-degraded="true"
            data-log-manage-api-degraded-owner="hertzbeat-ui-state-notice"
            tone="warning"
            title={t('log.manage.api.degraded.title')}
            description={t('log.manage.api.degraded.copy')}
            meta={data.loadStatus.message}
          />
        ) : null}

        {isStreamView ? renderStreamStage() : null}

        {showsLogTimeSeries ? (
        <HzPanelSurface
          data-log-manage-chart-band="hertzbeat-ui-chart-band"
          data-log-manage-panel-surface="chart"
          data-log-manage-explorer-view="time-series"
          data-log-manage-explorer-view-owner="hertzbeat-ui-signal-time-series"
          data-log-manage-chart-padding-owner="hertzbeat-ui-panel-surface"
          padding="chart"
        >
          <div className="grid gap-3">
            <HzSignalSummaryStrip
              data-log-manage-summary-strip="inline-signal-summary"
              data-log-manage-summary-strip-owner="hertzbeat-ui-signal-summary-strip"
              items={[
                { id: 'total', label: t('log.manage.summary.total'), value: data.overview.totalLogs },
                { id: 'errors', label: t('log.manage.summary.errors'), value: data.overview.errorLogs, tone: data.overview.errorLogs > 0 ? 'critical' : 'neutral' },
                { id: 'trace-coverage', label: t('log.manage.summary.trace-coverage'), value: traceCoverage },
                { id: 'latest', label: t('log.manage.summary.latest'), value: latestObservedAt }
              ]}
            />
            <HzSignalTrendBars
              data-log-manage-signal-trend-owner="hertzbeat-ui-signal-trend-bars"
              title={t('log.manage.trend.title')}
              meta={(
                <>
                  <BarChart3 className="h-4 w-4" aria-hidden="true" />
                  {t('log.manage.trend.points', { count: trendBars.length || 0 })}
                </>
              )}
              bars={trendBars.map(([hour, count]) => ({
                id: hour,
                label: hour,
                value: Number(count) || 0,
                tone: 'info' as const,
                title: `${hour}: ${count}`
              }))}
            />
          </div>
        </HzPanelSurface>
        ) : null}

        {showsLogTable && activeGroupBy ? (
          <HzPanelSurface
            data-log-manage-group-panel="hertzbeat-ui-log-group-panel"
            data-log-manage-group-panel-owner="hertzbeat-ui-panel-surface"
            data-log-manage-group-by={activeGroupBy}
          >
            <HzPanelHeader
              data-log-manage-group-header-owner="hertzbeat-ui-panel-header"
              title={(
                <>
                  <BarChart3 className="h-4 w-4" aria-hidden="true" />
                  {t('log.manage.group.title')}
                </>
              )}
              meta={<HzStatusBadge data-log-manage-group-count-owner="hertzbeat-ui-status-badge" tone="neutral" size="xs">{t('log.manage.group.count', { count: groupRows.length })}</HzStatusBadge>}
            />
            <div className="px-4 pb-4">
              <div className="mb-2 text-[12px] text-[var(--color-text-subtle)]">
                {t('log.manage.group.meta', { groupBy: activeGroupBy })}
              </div>
              <div className="mb-3 grid gap-2 sm:grid-cols-[160px_190px_160px]">
                <HzInput
                  inputMode="numeric"
                  value={draft.groupLimit || ''}
                  onChange={event => applyLogGroupLimit(event.target.value)}
                  onInput={event => applyLogGroupLimit(event.currentTarget.value)}
                  placeholder={t('log.manage.group.limit.placeholder')}
                  aria-label={t('log.manage.group.limit.aria')}
                  data-log-manage-group-limit-input="true"
                  data-log-manage-group-limit-input-owner="hertzbeat-ui-input"
                />
                <HzSelect
                  value={draft.groupOrder || 'count-desc'}
                  onChange={event => applyLogGroupOrder(event.target.value)}
                  aria-label={t('log.manage.group.order.aria')}
                  data-log-manage-group-order-select="true"
                  data-log-manage-group-order-select-owner="hertzbeat-ui-select"
                  options={[
                    { value: 'count-desc' satisfies LogGroupOrder, label: t('log.manage.group.order.count-desc') },
                    { value: 'count-asc' satisfies LogGroupOrder, label: t('log.manage.group.order.count-asc') }
                  ]}
                  optionDataAttributes={option => ({
                    'data-log-manage-group-order-option': option.value
                  })}
                />
                <HzInput
                  inputMode="numeric"
                  value={draft.groupMinCount || ''}
                  onChange={event => applyLogGroupMinCount(event.target.value)}
                  onInput={event => applyLogGroupMinCount(event.currentTarget.value)}
                  placeholder={t('log.manage.group.min-count.placeholder')}
                  aria-label={t('log.manage.group.min-count.aria')}
                  data-log-manage-group-min-count-input="true"
                  data-log-manage-group-min-count-input-owner="hertzbeat-ui-input"
                />
              </div>
              {groupRows.length > 0 ? (
                <div className="grid gap-2" data-log-manage-group-results="true">
                  {groupRows.map(row => (
                    <div
                      key={`${activeGroupBy}-${row.value}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[6px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-3 py-2 text-[12px]"
                      data-log-manage-group-result={row.value}
                    >
                      <HzButton
                        data-log-manage-group-filter-action={activeGroupBy}
                        data-log-manage-group-filter-value={row.value}
                        data-log-manage-group-filter-owner="hertzbeat-ui-button"
                        intent="ghost"
                        size="xs"
                        onClick={() => applyLogGroupResultFilter(row.value)}
                        className="min-w-0 justify-start truncate font-mono"
                        aria-label={t('log.manage.group.filter-action.aria', { groupBy: activeGroupBy, value: row.value })}
                      >
                        {row.value}
                      </HzButton>
                      <span className="font-semibold text-[var(--color-text-primary)]">{row.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[12px] text-[var(--color-text-subtle)]" data-log-manage-group-empty="true">
                  {t('log.manage.group.empty')}
                </div>
              )}
            </div>
          </HzPanelSurface>
        ) : null}

        {showsLogTable ? (
        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <HzPanelSurface
            data-log-manage-log-list="hertzbeat-ui-dense-log-list"
            data-log-manage-panel-surface="table"
            data-log-manage-row-control-owner="shared-hz-button"
            className="overflow-hidden"
          >
            <HzPanelHeader
              data-log-manage-table-header-owner="hertzbeat-ui-panel-header"
              title={(
                <>
                  <ScrollText className="h-4 w-4" aria-hidden="true" />
                  {t('log.manage.list.title')}
                </>
              )}
              meta={<HzStatusBadge data-log-manage-table-count-badge-owner="hertzbeat-ui-status-badge" tone="neutral" size="xs">{t('log.manage.list.count', { count: rows.length })}</HzStatusBadge>}
              actions={(
                <HzActionGroup
                  layout="inline-wrap"
                  data-log-manage-export-actions="current-page"
                  data-log-manage-export-actions-owner="hertzbeat-ui-action-group"
                >
                  <HzSelect
                    aria-label={t('log.manage.list.export-format.aria')}
                    value={logExportFormat}
                    onChange={event => setLogExportFormat(event.target.value === 'jsonl' ? 'jsonl' : 'csv')}
                    width="log-severity"
                    triggerTone="signal-query"
                    data-log-manage-export-format-select="true"
                    data-log-manage-export-format-owner="hertzbeat-ui-select"
                    data-log-manage-export-format-value={logExportFormat}
                    options={[
                      { value: 'csv' satisfies LogExportFormat, label: t('log.manage.list.export-format.csv') },
                      { value: 'jsonl' satisfies LogExportFormat, label: t('log.manage.list.export-format.jsonl') }
                    ]}
                    optionDataAttributes={option => ({
                      'data-log-manage-export-format-option': option.value
                    })}
                  />
                  <HzSelect
                    aria-label={t('log.manage.list.export-row-limit.aria')}
                    value={logExportRowLimit}
                    onChange={event => setLogExportRowLimit(LOG_EXPORT_ROW_LIMITS.includes(event.target.value as LogExportRowLimit) ? event.target.value as LogExportRowLimit : 'current')}
                    width="log-severity"
                    triggerTone="signal-query"
                    data-log-manage-export-row-limit-select="true"
                    data-log-manage-export-row-limit-owner="hertzbeat-ui-select"
                    data-log-manage-export-row-limit-value={logExportRowLimit}
                    options={LOG_EXPORT_ROW_LIMITS.map(value => ({
                      value,
                      label: value === 'current' ? t('log.manage.list.export-row-limit.current') : t('log.manage.list.export-row-limit.option', { count: value })
                    }))}
                    optionDataAttributes={option => ({
                      'data-log-manage-export-row-limit-option': option.value
                    })}
                  />
                  <HzButton
                    type="button"
                    size="sm"
                    intent="ghost"
                    disabled={rows.length === 0}
                    onClick={downloadCurrentLogRows}
                    data-log-manage-download-csv-action="current-page"
                    data-log-manage-download-csv-owner="hertzbeat-ui-button"
                    data-log-manage-download-csv-row-count={rows.length}
                    data-log-manage-download-row-limit={logExportRowLimit}
                    data-log-manage-download-format={logExportFormat}
                    aria-label={t('log.manage.list.download-csv.aria', { format: logExportFormat.toUpperCase() })}
                  >
                    <HzButtonIcon
                      icon={Download}
                      data-log-manage-download-csv-icon="download"
                      data-log-manage-download-csv-icon-owner="hertzbeat-ui-button-icon"
                    />
                    {t('log.manage.list.download-csv')}
                  </HzButton>
                </HzActionGroup>
              )}
            />
            <HzControlStack
              layout="inline-wrap"
              spacing="top-2"
              className="px-4 pb-2"
              data-log-manage-table-column-controls="customize-columns"
              data-log-manage-table-column-controls-owner="hertzbeat-ui-control-stack"
              data-log-manage-table-visible-columns={visibleLogColumns.join(',')}
              data-log-manage-table-visible-field-columns={visibleLogFieldColumns.join(',')}
              data-log-manage-display-format={displayFormat}
              data-log-manage-display-max-lines={maxLines}
            >
              <HzSelect
                aria-label={t('log.manage.display.format.aria')}
                value={displayFormat}
                onChange={event => applyLogDisplayFormat(event.target.value)}
                width="log-severity"
                triggerTone="signal-query"
                data-log-manage-display-control="format"
                data-log-manage-display-control-owner="hertzbeat-ui-select"
                data-log-manage-display-format-param={LOG_DISPLAY_FORMAT_PARAM}
                options={[
                  { value: 'default', label: logDisplayFormatLabel('default', t) },
                  { value: 'raw', label: logDisplayFormatLabel('raw', t) },
                  { value: 'column', label: logDisplayFormatLabel('column', t) }
                ]}
              />
              <HzInput
                aria-label={t('log.manage.display.max-lines.aria')}
                value={maxLines}
                onChange={event => applyLogMaxLines(event.target.value)}
                inputMode="numeric"
                width="metrics-query-step"
                data-log-manage-display-control="max-lines"
                data-log-manage-display-control-owner="hertzbeat-ui-input"
                data-log-manage-display-max-lines-param={LOG_MAX_LINES_PARAM}
              />
              {LOG_TABLE_COLUMN_KEYS.map(column => {
                const checked = visibleLogColumnSet.has(column);
                return (
                  <HzCheckbox
                    key={column}
                    checked={checked}
                    disabled={checked && visibleLogColumns.length === 1}
                    label={logColumnLabel(column, t)}
                    data-log-manage-table-column-option={column}
                    data-log-manage-table-column-option-owner="hertzbeat-ui-checkbox"
                    data-log-manage-table-column-option-checked={checked}
                    onChange={event => applyLogTableColumn(column, event.currentTarget.checked)}
                  />
                );
              })}
            </HzControlStack>
            <HzDataTable
              data-log-manage-table-chrome-owner="hertzbeat-ui-data-table"
              variant="embedded"
              rows={rows}
              getRowKey={row => row.key}
              selectedRowKey={activeRow?.key}
              onRowClick={row => openLogDetails(logEntryByRowKey.get(row.key) ?? null, 'history')}
              getRowProps={() => ({ 'data-log-manage-row-detail-action': 'true' })}
              emptyLabel={(
              <HzEmptyState
                data-log-manage-empty-guidance="operator-no-data-guidance"
                data-log-manage-empty-state-owner="hertzbeat-ui-empty-state"
                title={t('log.manage.empty.title')}
                description={t('log.manage.empty.copy')}
                className="h-[360px] border-y-0 text-left"
              />
              )}
              columns={[
                {
                  key: 'time',
                  header: t('log.manage.list.column.time'),
                  width: '176px',
                  render: (row: LogExplorerRow) => <span className="font-mono text-[12px] text-[#cbd5e1]">{row.timestamp}</span>
                },
                {
                  key: 'severity',
                  header: t('log.manage.list.column.severity'),
                  width: '116px',
                  render: (row: LogExplorerRow) => row.severity !== '-' && row.severity !== 'LOG' ? (
                    <HzButton
                      type="button"
                      size="xs"
                      intent="ghost"
                      data-log-manage-table-severity-filter-action={row.severity}
                      data-log-manage-table-severity-filter-owner="hertzbeat-ui-button"
                      aria-label={t('log.manage.table.severity-filter-action.aria', { severity: row.severity })}
                      onClick={event => {
                        event.stopPropagation();
                        applyLogRowSeverityFilter(row.severity);
                      }}
                      className="min-w-0 justify-start"
                    >
                      <HzStatusBadge
                        data-log-manage-severity-tone={row.severityTone}
                        data-log-manage-severity-badge-owner="hertzbeat-ui-status-badge"
                        tone={logSeverityStatusTone(row.severityTone)}
                      >
                        {row.severity}
                      </HzStatusBadge>
                    </HzButton>
                  ) : (
                    <HzStatusBadge
                      data-log-manage-severity-tone={row.severityTone}
                      data-log-manage-severity-badge-owner="hertzbeat-ui-status-badge"
                      tone={logSeverityStatusTone(row.severityTone)}
                    >
                      {row.severity}
                    </HzStatusBadge>
                  )
                },
                {
                  key: 'service',
                  header: t('log.manage.list.column.service'),
                  width: '180px',
                  render: (row: LogExplorerRow) => row.service !== '-' ? (
                    <HzButton
                      type="button"
                      size="xs"
                      intent="ghost"
                      data-log-manage-table-service-filter-action={row.service}
                      data-log-manage-table-service-filter-owner="hertzbeat-ui-button"
                      aria-label={t('log.manage.table.service-filter-action.aria', { service: row.service })}
                      onClick={event => {
                        event.stopPropagation();
                        applyLogRowServiceFilter(row.service);
                      }}
                      className="min-w-0 justify-start truncate font-semibold"
                    >
                      {row.service}
                    </HzButton>
                  ) : (
                    <HzDataCellText
                      data-log-manage-table-service-cell-owner="hertzbeat-ui-data-cell-text"
                      variant="title"
                    >
                      {row.service}
                    </HzDataCellText>
                  )
                },
                {
                  key: 'body',
                  header: t('log.manage.list.column.body'),
                  render: (row: LogExplorerRow) => {
                    const bodySearchTerm = buildLogBodySearchTerm(row.message);
                    return (
                    <span
                      className="min-w-0"
                      data-log-manage-table-body-format={displayFormat}
                      data-log-manage-table-body-max-lines={maxLines}
                      data-log-manage-table-body-owner="hertzbeat-ui-log-display"
                    >
                      <span
                        className={logBodyTextClass(displayFormat)}
                        style={logBodyTextStyle(displayFormat, maxLines)}
                        data-log-manage-table-body-text="true"
                      >
                        {row.message}
                      </span>
                      <HzActionGroup
                        layout="inline-wrap"
                        className="mt-1"
                        data-log-manage-table-body-actions="view-filter"
                        data-log-manage-table-body-actions-owner="hertzbeat-ui-action-group"
                      >
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7f8a9d]">
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          {t('log.manage.stream.action.view-log')}
                        </span>
                        {bodySearchTerm ? (
                          <HzButton
                            type="button"
                            size="xs"
                            intent="ghost"
                            data-log-manage-table-body-filter-action="true"
                            data-log-manage-table-body-filter-owner="hertzbeat-ui-button"
                            data-log-manage-table-body-filter-value={bodySearchTerm}
                            aria-label={t('log.manage.table.body-filter-action.aria', { value: bodySearchTerm })}
                            onClick={event => {
                              event.stopPropagation();
                              applyLogRowBodyFilter(row.message);
                            }}
                            className="min-w-0 justify-start"
                          >
                            <HzButtonIcon
                              icon={Filter}
                              data-log-manage-table-body-filter-action-icon="filter"
                              data-log-manage-table-body-filter-action-icon-owner="hertzbeat-ui-button-icon"
                            />
                            {t('log.manage.table.body-filter-action')}
                          </HzButton>
                        ) : null}
                        <HzButton
                          type="button"
                          size="xs"
                          intent="ghost"
                          data-log-manage-row-copy-link-action="true"
                          data-log-manage-row-copy-link-owner="hertzbeat-ui-button"
                          data-log-manage-row-copy-link-trace-id={row.traceId}
                          data-log-manage-row-copy-link-span-id={row.spanId}
                          aria-label={t('log.manage.table.copy-link-action.aria', { traceId: row.traceId })}
                          onClick={event => {
                            event.stopPropagation();
                            copyLogLineLink(row);
                          }}
                          className="min-w-0 justify-start"
                        >
                          <HzButtonIcon
                            icon={Copy}
                            data-log-manage-row-copy-link-action-icon="copy"
                            data-log-manage-row-copy-link-action-icon-owner="hertzbeat-ui-button-icon"
                          />
                          {t('log.manage.table.copy-link-action')}
                        </HzButton>
                      </HzActionGroup>
                    </span>
                    );
                  }
                },
                {
                  key: 'trace-id',
                  header: t('log.manage.list.column.trace'),
                  width: '220px',
                  render: (row: LogExplorerRow) => (
                    <HzActionGroup
                      layout="inline-wrap"
                      data-log-manage-table-trace-id-actions="detail-filter"
                      data-log-manage-table-trace-id-actions-owner="hertzbeat-ui-action-group"
                    >
                      <HzButton
                        data-log-manage-row-trace-detail-action="true"
                        data-log-manage-row-control="shared-hz-button"
                        intent="ghost"
                        size="xs"
                        disabled={row.traceId === '-'}
                        title={row.traceId === '-' ? missingTraceHandoffTitle : undefined}
                        aria-label={row.traceId === '-' ? missingTraceHandoffTitle : undefined}
                        data-log-manage-row-trace-detail-action-disabled={row.traceId === '-' ? 'missing-trace-id' : undefined}
                        onClick={() => openLogDetails(logEntryByRowKey.get(row.key) ?? null, 'history')}
                        className="max-w-[180px] justify-start truncate font-mono"
                      >
                        {row.traceId}
                      </HzButton>
                      {row.traceId !== '-' ? (
                        <HzButton
                          type="button"
                          size="xs"
                          intent="ghost"
                          data-log-manage-table-trace-id-filter-action={row.traceId}
                          data-log-manage-table-trace-id-filter-owner="hertzbeat-ui-button"
                          aria-label={t('log.manage.table.trace-id-filter-action.aria', { traceId: row.traceId })}
                          onClick={event => {
                            event.stopPropagation();
                            applyLogRowTraceIdFilter(row.traceId);
                          }}
                          className="min-w-0 justify-start"
                        >
                          <HzButtonIcon
                            icon={Filter}
                            data-log-manage-table-trace-id-filter-action-icon="filter"
                            data-log-manage-table-trace-id-filter-action-icon-owner="hertzbeat-ui-button-icon"
                          />
                          {t('log.manage.table.body-filter-action')}
                        </HzButton>
                      ) : null}
                    </HzActionGroup>
                  )
                },
                {
                  key: 'span-id',
                  header: t('log.manage.detail.span-id'),
                  width: '180px',
                  render: (row: LogExplorerRow) => row.spanId !== '-' ? (
                    <HzButton
                      type="button"
                      size="xs"
                      intent="ghost"
                      data-log-manage-table-span-id-filter-action={row.spanId}
                      data-log-manage-table-span-id-filter-owner="hertzbeat-ui-button"
                      aria-label={t('log.manage.table.span-id-filter-action.aria', { spanId: row.spanId })}
                      onClick={() => applyLogRowSpanIdFilter(row.spanId)}
                      className="max-w-[160px] justify-start truncate font-mono"
                    >
                      <span className="truncate" data-log-manage-span-id-cell-owner="hertzbeat-ui-data-table-cell">{row.spanId}</span>
                    </HzButton>
                  ) : (
                    <span className="font-mono text-[12px] text-[#cbd5e1]" data-log-manage-span-id-cell-owner="hertzbeat-ui-data-table-cell">{row.spanId}</span>
                  )
                }
              ]
                .filter(column => visibleLogColumnSet.has(column.key as LogTableColumnKey))
                .concat(
                  visibleLogFieldColumns.map(fieldColumn => ({
                    key: `field:${fieldColumn}`,
                    header: fieldColumn,
                    width: '190px',
                    render: (row: LogExplorerRow) => {
                      const value = readLogFieldColumnValue(logEntryByRowKey.get(row.key), fieldColumn);
                      return (
                        <HzDataCellText
                          data-log-manage-table-field-column={fieldColumn}
                          data-log-manage-table-field-column-owner="hertzbeat-ui-data-cell-text"
                          data-log-manage-table-field-column-value={value}
                          variant="mono"
                        >
                          {value}
                        </HzDataCellText>
                      );
                    }
                  }))
                )}
            />
            <HzPaginationBar
              data-log-manage-list-pagination="shared-pagination-bar"
              data-log-manage-list-pagination-owner="hertzbeat-ui-pagination-bar"
              data-log-manage-list-page-size={listPageSize}
              data-log-manage-list-page-index={listPageIndex}
              data-log-manage-list-total-elements={listTotalElements}
              summary={t('common.pagination.summary', {
                page: listPageIndex + 1,
                totalPages: listTotalPages,
                from: listPageStart,
                to: listPageEnd,
                total: listTotalElements
              })}
              pageSizeLabel={t('common.page-size')}
              pageSizeValue={String(listPageSize)}
              pageSizeOptions={LOG_LIST_PAGE_SIZE_OPTIONS.map(value => ({
                value,
                label: t('log.manage.list.page-size.option', { count: value })
              }))}
              onPageSizeChange={applyLogListPageSize}
              pageJumpLabel={t('common.page')}
              pageJumpValue={String(listPageIndex + 1)}
              pageJumpMax={listTotalPages}
              onPageJumpChange={value => {
                const page = Number(value);
                if (!Number.isInteger(page)) return;
                applyLogListPageIndex(page - 1);
              }}
              previousLabel={t('common.previous-page')}
              nextLabel={t('common.next-page')}
              previousDisabled={listPageIndex <= 0}
              nextDisabled={listPageIndex >= listTotalPages - 1}
              onPrevious={() => applyLogListPageIndex(listPageIndex - 1)}
              onNext={() => applyLogListPageIndex(listPageIndex + 1)}
              pageSizeSelectProps={{
                'data-log-manage-list-page-size-select': 'true',
                optionDataAttributes: option => ({
                  'data-log-manage-list-page-size-option': option.value
                })
              }}
              pageJumpInputProps={{
                'data-log-manage-list-page-jump': 'true'
              }}
              previousButtonProps={{
                'data-log-manage-list-pagination-previous': 'true'
              }}
              nextButtonProps={{
                'data-log-manage-list-pagination-next': 'true'
              }}
            />
          </HzPanelSurface>

          <HzPanelSurface data-log-manage-detail-panel="hertzbeat-ui-detail-panel" data-log-manage-panel-surface="detail" className="h-fit overflow-hidden">
            <HzPanelHeader
              data-log-manage-detail-header-owner="hertzbeat-ui-panel-header"
              eyebrow={t('log.manage.detail.title')}
              title={(
                <>
                  <Server className="h-4 w-4" aria-hidden="true" />
                  {activeRow?.service || t('log.manage.stream.selected.none')}
                </>
              )}
            />
            <div className="px-4 py-4">
              <HzDetailRows
                data-log-manage-detail-facts-owner="hertzbeat-ui-detail-rows"
                rows={[
                  { key: 'severity', title: t('log.manage.detail.severity'), copy: activeRow?.severity || '-' },
                  { key: 'trace-id', title: t('log.manage.detail.trace-id'), copy: activeRow?.traceId || '-' },
                  { key: 'span-id', title: t('log.manage.detail.span-id'), copy: activeRow?.spanId || '-' }
                ]}
              />
              <HzDetailRows
                data-log-manage-selected-evidence="selected-log-evidence"
                data-log-manage-selected-evidence-owner="hertzbeat-ui-detail-rows"
                aria-label={t('log.manage.evidence.aria')}
                className="mt-4"
                heading={t('log.manage.evidence.title')}
                rows={activeLogEvidenceRows.map(([label, value, meta]) => ({
                  key: String(label),
                  title: label,
                  copy: value,
                  meta
                }))}
              />
              <HzDetailRows
                data-log-manage-entity-context="hertzbeat-signal-entity-context"
                data-log-manage-entity-context-owner="hertzbeat-ui-detail-rows"
                aria-label={t('log.manage.context.entity.aria')}
                className="mt-4"
                heading={t('log.manage.context.entity.title')}
                rows={entityContextRows.map(row => ({
                  key: row.label,
                  title: row.label,
                  copy: row.value,
                  meta: row.meta
                }))}
              />
              <LogAttributionDiagnosticsPanel rows={activeAttributionDiagnostics} t={t} />
              <HzDataTable
                data-log-manage-selected-attributes="log-attributes"
                data-log-manage-selected-attributes-owner="hertzbeat-ui-data-table"
                variant="embedded"
                rows={activeLogAttributeRows}
                getRowKey={row => row.key}
                columns={[
                  {
                    key: 'source',
                    header: t('log.manage.attributes.column.source'),
                    width: '112px',
                    render: (row: LogAttributeRow) => row.source
                  },
                  {
                    key: 'name',
                    header: t('log.manage.attributes.column.name'),
                    width: '180px',
                    render: (row: LogAttributeRow) => <span className="font-mono text-[12px]">{row.name}</span>
                  },
                  {
                    key: 'value',
                    header: t('log.manage.attributes.column.value'),
                    render: (row: LogAttributeRow) => <span className="font-mono text-[12px]">{row.value}</span>
                  },
                  {
                    key: 'filter',
                    header: t('log.manage.attributes.column.actions'),
                    width: '252px',
                    render: (row: LogAttributeRow) => renderLogAttributeFilterAction(row)
                  }
                ]}
                className="mt-4"
              />
              <HzControlStack
                data-log-manage-history-detail-action-stack="shared-control-stack"
                data-log-manage-history-detail-action-stack-owner="hertzbeat-ui-control-stack"
                className="mt-4"
              >
                <HzStateNotice
                  data-log-manage-alert-context-hint="entity-trace-alert-handoff"
                  data-log-manage-handoff-hint-owner="hertzbeat-ui-state-notice"
                  title={t('log.manage.handoff.alert-hint')}
                  variant="hint"
                />
                <HzStateNotice
                  data-log-manage-signal-handoff-hint="log-trace-metric-context"
                  data-log-manage-handoff-hint-owner="hertzbeat-ui-state-notice"
                  title={t('log.manage.handoff.signal-hint')}
                  variant="hint"
                />
                <LogEntityDetailAction
                  href={handoffLinks.entityHref}
                  canOpen={canOpenActiveEntity}
                  missingEntityHandoffTitle={missingEntityHandoffTitle}
                  label={t('log.manage.route.action.entity')}
                />
                <HzButtonLink component={Link} data-log-manage-history-detail-action="alerts" href={handoffLinks.alertHandlingHref} size="md">
                  {t('log.manage.handoff.alerts')}
                </HzButtonLink>
                <HzButton
                  data-log-manage-history-detail-action="traces"
                  data-log-manage-results-open-trace-action="true"
                  data-log-manage-open-log-detail-before-trace="true"
                  size="md"
                  disabled={!activeEntry?.traceId}
                  title={!activeEntry?.traceId ? missingTraceHandoffTitle : undefined}
                  aria-label={!activeEntry?.traceId ? missingTraceHandoffTitle : undefined}
                  data-log-manage-results-open-trace-action-disabled={!activeEntry?.traceId ? 'missing-trace-id' : undefined}
                  onClick={() => openTraceDrilldownFromLog(activeEntry, 'history')}
                >
                  {t('log.manage.handoff.traces')}
                </HzButton>
                <HzButtonLink component={Link} data-log-manage-history-detail-action="metrics" href={handoffLinks.metricsHref} size="md">
                  {t('log.manage.handoff.metrics')}
                </HzButtonLink>
                <HzButtonLink component={Link} data-log-manage-history-detail-action="entities" href={handoffLinks.entitiesHref} size="md">
                  {t('log.manage.handoff.entities')}
                </HzButtonLink>
              </HzControlStack>
            </div>
          </HzPanelSurface>
        </div>
        ) : null}
        {renderDetailDialog()}
        {renderRelatedTraceDialog()}
    </HzSignalWorkbenchShell>
  );
}

export default function LogManagePage({
  initialRouteState,
  forcedView,
  showViewToggle = true
}: LogManagePageProps & { initialRouteState?: LogManageRouteState } = {}) {
  const logManageRouteState = initialRouteState ?? EMPTY_LOG_MANAGE_ROUTE_STATE;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<LogQueryState>(() => logManageRouteState.initialQuery);
  const [query, setQuery] = useState<LogQueryState>(() => logManageRouteState.initialQuery);
  const { t } = useI18n();
  const currentView = forcedView ?? logManageRouteState.currentView;
  const routeContext = logManageRouteState.routeContext;
  const panelEditContext = useMemo(() => readSignalPanelEditContext(searchParams), [searchParams]);
  const replaceLogHref = useCallback((route: string) => {
    router.replace(appendLogPanelEditContext(route, panelEditContext));
  }, [panelEditContext, router]);
  const logTimeContext = useMemo(() => sanitizeTimeContext({
    timeRange: routeContext.timeRange || 'last-30m',
    start: routeContext.start,
    end: routeContext.end,
    refresh: routeContext.refresh,
    live: routeContext.live || 'true',
    tz: routeContext.tz
  }), [routeContext]);
  const logUrls = useMemo(() => buildLogUrls(query, routeContext), [query, routeContext]);
  const logManageCacheKey = useMemo(
    () => [
      'log-manage',
      currentView,
      logUrls.overviewUrl,
      logUrls.listUrl,
      logUrls.trendUrl,
      logUrls.coverageUrl,
      logUrls.groupByUrl
    ].join('|'),
    [currentView, logUrls]
  );

  const buildRouteWithContext = useCallback(
    (nextQuery: LogQueryState, view: LogWorkbenchView) => buildLogManageRoute(routeContext, nextQuery, view),
    [routeContext]
  );

  useEffect(() => {
    if (!panelEditContext && logManageRouteState.shouldCleanUrl) {
      router.replace(buildLogManageRoute(routeContext, query, currentView));
    }
  }, [currentView, logManageRouteState.shouldCleanUrl, panelEditContext, query, routeContext, router]);

  const applyLogTimeContext = useCallback((timeContext: TimeContext) => {
    const appliedContext = resolveAppliedTimeContext(timeContext, logTimeContext);
    replaceLogHref(buildLogManageRoute(routeContext, query, currentView, appliedContext));
  }, [currentView, logTimeContext, query, replaceLogHref, routeContext]);

  const load = useCallback(async (): Promise<LogManageData> => {
    const { listUrl, overviewUrl, trendUrl, coverageUrl, groupByUrl } = logUrls;
    const shouldLoadGroupBy = Boolean(query.groupBy?.trim());
    const fallback = emptyLogManageData(query, '');
    const [overviewResult, listResult, trendResult, coverageResult, groupResult] = await Promise.allSettled([
      apiMessageGetWithTimeout<BackendLogOverview>(overviewUrl),
      apiMessageGetWithTimeout<PageResult<LogEntry>>(listUrl),
      apiMessageGetWithTimeout<LogTrendStats>(trendUrl),
      apiMessageGetWithTimeout<LogTraceCoverage>(coverageUrl),
      shouldLoadGroupBy
        ? apiMessageGetWithTimeout<LogGroupStats>(groupByUrl)
        : Promise.resolve({ groupBy: '', groups: [] })
    ]);
    const rejectedMessages = [overviewResult, listResult, trendResult, coverageResult, groupResult]
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => describeLogManageLoadFailure(result.reason));

    if (listResult.status === 'rejected') {
      return emptyLogManageData(query, describeLogManageLoadFailure(listResult.reason));
    }

    return {
      overview: overviewResult.status === 'fulfilled' ? normalizeLogOverview(overviewResult.value) : fallback.overview,
      list: listResult.value,
      trend: trendResult.status === 'fulfilled' ? trendResult.value : fallback.trend,
      coverage: coverageResult.status === 'fulfilled' ? coverageResult.value : fallback.coverage,
      group: groupResult.status === 'fulfilled' ? groupResult.value : fallback.group,
      query,
      ...(rejectedMessages.length > 0
        ? { loadStatus: { state: 'degraded' as const, message: rejectedMessages.join('; ') } }
        : {})
    };
  }, [logUrls, query]);

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('log.manage.loading')}
      cacheKey={logManageCacheKey}
      cacheSettledTtlMs={LOG_MANAGE_SETTLED_CACHE_TTL_MS}
    >
      {data => {
        const resetQuery = () => {
          setDraft(EMPTY_QUERY);
          setQuery(EMPTY_QUERY);
          replaceLogHref(buildResetLogManageRoute(routeContext, currentView));
        };

        const applyQuery = (override?: LogQueryState) => {
          const nextQuery = override ? { ...override } : { ...draft };
          setQuery(nextQuery);
          replaceLogHref(buildRouteWithContext(nextQuery, currentView));
        };

        const applyRouteContext = (nextContext: SignalRouteContext) => {
          replaceLogHref(buildLogManageRoute(nextContext, query, currentView));
        };

        const switchView = (view: LogWorkbenchView) => {
          replaceLogHref(buildRouteWithContext(query, view));
        };

        return (
          <LogManageExplorer
            data={data}
            query={query}
            draft={draft}
            setDraft={setDraft}
            applyQuery={applyQuery}
            applyRouteContext={applyRouteContext}
            resetQuery={resetQuery}
            switchView={switchView}
            currentView={currentView}
            showViewToggle={showViewToggle}
            routeContext={routeContext}
            timeContext={logTimeContext}
            applyTimeContext={applyLogTimeContext}
            restoreSavedViewRoute={replaceLogHref}
            currentLogReturnHref={buildLogManageRoute(routeContext, query, currentView)}
            panelEditContext={panelEditContext}
          />
        );
      }}
    </ClientWorkbench>
  );
}
