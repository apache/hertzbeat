'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BarChart3, BellPlus, BellRing, Check, Copy, Download, Filter, ListChecks, Pencil, Play, Replace, RotateCcw, Save, Search, ScrollText, Server, Timer, Trash2, Workflow, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { HzActionGroup, HzAttributeDiagnostics, HzButton, HzButtonIcon, HzButtonLink, HzCheckbox, HzChipGroup, HzControlStack, HzDataCellText, HzDataTable, HzDetailRows, HzDialogBodyLayout, HzDialogEventNotice, HzDialogEventText, HzDialogMetaItem, HzDisabledActionShell, HzEmptyState, HzInput, HzPanelHeader, HzPanelSurface, HzQueryActionGroup, HzQueryStatusSelect, HzQueryTokenField, HzSearchFieldFrame, HzSearchFieldIcon, HzSelect, HzSignalSummaryStrip, HzSignalTrendBars, HzSignalWorkbenchShell, HzStateNotice, HzStatusBadge, HzTableRowActionButton, HzWorkbenchHeaderCopy, HzWorkbenchLayout, type HzStatusTone } from '@hertzbeat/ui';
import { buildTimeRangeControlLabels, TimeRangeControl } from '@/components/observability/time-range-control';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { useI18n } from '@/components/providers/i18n-provider';
import { apiMessageGet } from '@/lib/api-client';
import { copyTextToClipboard } from '@/lib/browser-clipboard';
import { formatDurationNanos, formatTime } from '@/lib/format';
import { buildTraceCsv, buildTraceExportFilename, buildTraceJsonl, type TraceExportFormat } from '@/lib/trace-manage/export';
import { DEFAULT_TRACE_LIST_PAGE_INDEX, DEFAULT_TRACE_LIST_PAGE_SIZE, DEFAULT_TRACE_TABLE_COLUMNS, TRACE_LIST_PAGE_SIZE_OPTIONS, TRACE_TABLE_COLUMN_KEYS, buildTraceUrls, type TraceExplorerView, type TraceGroupOrder, type TraceManageRouteState, type TraceQueryState, type TraceSpanScope, type TraceTableColumnKey } from '@/lib/trace-manage/query-state';
import {
  buildSelectedSpanEventRows,
  buildSelectedSpanFacts,
  buildSelectedSpanLinkRows,
  buildTraceAttributeRows,
  buildTraceAlertRuleDraft,
  buildTraceAttributionDiagnostics,
  buildTraceExplorerRows,
  buildTraceHandoffLinks,
  buildTraceWaterfallRows,
  type TraceExplorerRow
} from '@/lib/trace-manage/view-model';
import { buildSignalEntityContextRows, type SignalRouteContext } from '@/lib/signal-route-context';
import { resolveAppliedTimeContext, sanitizeTimeContext, type TimeContext } from '@/lib/time-context';
import type { PageResult, TraceDetail, TraceListItem, TraceOverview } from '@/lib/types';
import { ObservabilityStatusState, ObservabilityWaterfall, type ObservabilityWaterfallTick } from '../../../components/observability';
import { OverlayDialog } from '../../../components/workbench/overlay-dialog';
import { loadTraceDetailBundle } from '../../../lib/trace-manage/controller';
import { buildResetTraceManageRoute, buildTraceManageRoute } from './route-state';

type TraceManageData = {
  overview: TraceOverview;
  list: PageResult<TraceListItem>;
  group?: TraceGroupStats;
  loadStatus?: {
    state: 'degraded';
    message: string;
  };
};

type TraceGroupStats = {
  groupBy?: string;
  groups: TraceGroupRow[];
};

type TraceGroupRow = {
  value: string;
  traceCount: number;
  errorTraceCount: number;
  latencyAvgMs: number;
  latencyP95Ms: number;
};

type TraceSavedQueryView = {
  id: string;
  label: string;
  description: string;
  route: string;
  createdAt: number;
};

type TraceExportRowLimit = 'current' | '10000' | '30000' | '50000';

const EMPTY_TRACE_OVERVIEW: TraceOverview = {
  totalTraceCount: 0,
  errorTraceCount: 0,
  latestObservedAt: null,
  hasActiveTrace: false
};

function normalizeTraceOverview(overview: TraceOverview | null | undefined): TraceOverview {
  return {
    ...EMPTY_TRACE_OVERVIEW,
    ...(overview || {})
  };
}

function normalizeTraceList(list: PageResult<TraceListItem> | null | undefined): PageResult<TraceListItem> {
  return {
    content: Array.isArray(list?.content) ? list.content : [],
    totalElements: Number.isFinite(list?.totalElements) ? list.totalElements : 0,
    pageIndex: Number.isFinite(list?.pageIndex) ? list.pageIndex : 0,
    pageSize: Number.isFinite(list?.pageSize) ? list.pageSize : 8
  };
}

function normalizeTraceGroup(group: TraceGroupStats | null | undefined): TraceGroupStats {
  return {
    groupBy: typeof group?.groupBy === 'string' ? group.groupBy : undefined,
    groups: Array.isArray(group?.groups)
      ? group.groups.map(row => ({
        value: String(row?.value ?? 'unknown'),
        traceCount: Number.isFinite(Number(row?.traceCount)) ? Number(row.traceCount) : 0,
        errorTraceCount: Number.isFinite(Number(row?.errorTraceCount)) ? Number(row.errorTraceCount) : 0,
        latencyAvgMs: Number.isFinite(Number(row?.latencyAvgMs)) ? Number(row.latencyAvgMs) : 0,
        latencyP95Ms: Number.isFinite(Number(row?.latencyP95Ms)) ? Number(row.latencyP95Ms) : 0
      }))
      : []
  };
}

function normalizeTraceManageData(data: {
  overview?: TraceOverview | null;
  list?: PageResult<TraceListItem> | null;
  group?: TraceGroupStats | null;
  loadStatus?: TraceManageData['loadStatus'];
}): TraceManageData {
  return {
    overview: normalizeTraceOverview(data.overview),
    list: normalizeTraceList(data.list),
    ...(data.group ? { group: normalizeTraceGroup(data.group) } : {}),
    ...(data.loadStatus ? { loadStatus: data.loadStatus } : {})
  };
}

function emptyTraceManageData(message: string): TraceManageData {
  return normalizeTraceManageData({
    overview: null,
    list: null,
    loadStatus: {
      state: 'degraded',
      message
    }
  });
}

const emptyTraceQuery: TraceQueryState = {
  traceId: '',
  spanId: '',
  serviceName: '',
  resourceFilter: '',
  operationName: '',
  minDurationMs: '',
  maxDurationMs: '',
  groupBy: '',
  errorOnly: false,
  spanScope: 'root',
  listPageSize: DEFAULT_TRACE_LIST_PAGE_SIZE,
  listPageIndex: DEFAULT_TRACE_LIST_PAGE_INDEX,
  columns: DEFAULT_TRACE_TABLE_COLUMNS
};

const EMPTY_TRACE_MANAGE_ROUTE_STATE: TraceManageRouteState = {
  initialQuery: emptyTraceQuery,
  currentView: 'list',
  routeContext: {},
  shouldCleanUrl: false
};

const TRACE_MANAGE_SETTLED_CACHE_TTL_MS = 10_000;
const TRACE_MANAGE_API_TIMEOUT_MS = 5_000;
const TRACE_SAVED_QUERY_VIEW_STORAGE_KEY = 'hertzbeat.trace-manage.saved-query-views';
const TRACE_SAVED_QUERY_VIEW_LIMIT = 5;
const TRACE_EXPORT_ROW_LIMITS: TraceExportRowLimit[] = ['current', '10000', '30000', '50000'];
const TRACE_EXPORT_FETCH_PAGE_SIZE = 1000;

function describeTraceManageLoadFailure(error: unknown) {
  return error instanceof Error && error.message ? error.message : 'Trace API request failed';
}

async function apiMessageGetWithTimeout<T>(path: string, timeoutMs = TRACE_MANAGE_API_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Trace API request timed out after ${timeoutMs}ms`));
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

type TraceDetailDrawerState = {
  open: boolean;
  loading: boolean;
  error?: string | null;
  detail: TraceDetail | null;
  selectedSpanId?: string | null;
  selectedEventKey?: string | null;
};
type TraceTranslator = ReturnType<typeof useI18n>['t'];

function isTraceSavedQueryView(value: unknown): value is TraceSavedQueryView {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<TraceSavedQueryView>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.route === 'string' &&
    candidate.route.startsWith('/trace/manage') &&
    typeof candidate.createdAt === 'number'
  );
}

function readTraceSavedQueryViews(): TraceSavedQueryView[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(TRACE_SAVED_QUERY_VIEW_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isTraceSavedQueryView).slice(0, TRACE_SAVED_QUERY_VIEW_LIMIT) : [];
  } catch {
    return [];
  }
}

function writeTraceSavedQueryViews(views: TraceSavedQueryView[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TRACE_SAVED_QUERY_VIEW_STORAGE_KEY, JSON.stringify(views.slice(0, TRACE_SAVED_QUERY_VIEW_LIMIT)));
  } catch {
    // Ignore quota or privacy-mode failures; the current route remains shareable.
  }
}

function compactTraceSavedViewValue(value: string | undefined, limit = 32) {
  const trimmed = value?.trim();
  if (!trimmed) return '';
  return trimmed.length > limit ? `${trimmed.slice(0, limit - 1)}...` : trimmed;
}

function isDefaultTraceSavedViewColumns(columns: TraceTableColumnKey[] | undefined) {
  const nextColumns = columns || DEFAULT_TRACE_TABLE_COLUMNS;
  return (
    nextColumns.length === DEFAULT_TRACE_TABLE_COLUMNS.length &&
    DEFAULT_TRACE_TABLE_COLUMNS.every((column, index) => nextColumns[index] === column)
  );
}

function buildTraceSavedViewDescription(query: TraceQueryState, routeContext: SignalRouteContext, currentView: TraceExplorerView, t: TraceTranslator) {
  const parts = [
    `${t('trace.manage.saved-view.field.view')}: ${currentView}`,
    query.serviceName.trim() ? `${t('trace.manage.saved-view.field.service')}: ${compactTraceSavedViewValue(query.serviceName)}` : '',
    query.operationName?.trim() ? `${t('trace.manage.saved-view.field.operation')}: ${compactTraceSavedViewValue(query.operationName)}` : '',
    query.resourceFilter?.trim() ? `${t('trace.manage.saved-view.field.resource-filter')}: ${compactTraceSavedViewValue(query.resourceFilter)}` : '',
    query.minDurationMs?.trim() ? `${t('trace.manage.saved-view.field.min-duration')}: ${compactTraceSavedViewValue(query.minDurationMs)}ms` : '',
    query.maxDurationMs?.trim() ? `${t('trace.manage.saved-view.field.max-duration')}: ${compactTraceSavedViewValue(query.maxDurationMs)}ms` : '',
    query.errorOnly ? t('trace.manage.saved-view.field.errors-only') : '',
    routeContext.environment?.trim() ? `${t('trace.manage.saved-view.field.environment')}: ${compactTraceSavedViewValue(routeContext.environment)}` : '',
    query.groupBy?.trim() ? `${t('trace.manage.saved-view.field.group-by')}: ${compactTraceSavedViewValue(query.groupBy)}` : '',
    query.groupLimit?.trim() ? `${t('trace.manage.saved-view.field.group-limit')}: ${compactTraceSavedViewValue(query.groupLimit)}` : '',
    query.groupOrder?.trim() ? `${t('trace.manage.saved-view.field.group-order')}: ${compactTraceSavedViewValue(query.groupOrder)}` : '',
    query.groupMinCount?.trim() ? `${t('trace.manage.saved-view.field.group-min-count')}: ${compactTraceSavedViewValue(query.groupMinCount)}` : '',
    query.spanScope !== 'root' ? `${t('trace.manage.saved-view.field.span-scope')}: ${query.spanScope}` : '',
    query.listPageSize && query.listPageSize !== DEFAULT_TRACE_LIST_PAGE_SIZE ? `${t('trace.manage.saved-view.field.list-page-size')}: ${query.listPageSize}` : '',
    query.listPageIndex && query.listPageIndex !== DEFAULT_TRACE_LIST_PAGE_INDEX ? `${t('trace.manage.saved-view.field.list-page-index')}: ${query.listPageIndex}` : '',
    !isDefaultTraceSavedViewColumns(query.columns) ? `${t('trace.manage.saved-view.field.columns')}: ${query.columns?.join(',')}` : ''
  ].filter(Boolean);
  return parts.join(' | ') || t('trace.manage.saved-view.description.empty');
}

function buildTraceSavedViewLabel(query: TraceQueryState, routeContext: SignalRouteContext, t: TraceTranslator) {
  return (
    compactTraceSavedViewValue(query.operationName, 42)
    || compactTraceSavedViewValue(query.serviceName, 42)
    || compactTraceSavedViewValue(routeContext.serviceName, 42)
    || compactTraceSavedViewValue(query.traceId, 42)
    || t('trace.manage.saved-view.current-label')
  );
}

function createTraceSavedQueryView(
  query: TraceQueryState,
  routeContext: SignalRouteContext,
  currentView: TraceExplorerView,
  route: string,
  t: TraceTranslator
): TraceSavedQueryView {
  const now = Date.now();
  return {
    id: `trace-query-${now}`,
    label: buildTraceSavedViewLabel(query, routeContext, t),
    description: buildTraceSavedViewDescription(query, routeContext, currentView, t),
    route,
    createdAt: now
  };
}

function hasNavigationId(value?: string | null) {
  const trimmed = value?.trim();
  return Boolean(trimmed && trimmed !== '-');
}

function firstNavigationId(...values: Array<string | null | undefined>) {
  return values.find(hasNavigationId);
}

function uniqueTraceQuickFilterValues(values: Array<string | null | undefined>, limit = 3) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || trimmed === '-' || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
    if (result.length >= limit) break;
  }
  return result;
}

function uniqueTraceDurationQuickFilterValues(values: Array<number | string | null | undefined>, limit = 2) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const durationMs = normalizeTraceDurationQuickFilterValue(value);
    if (!durationMs || seen.has(durationMs)) continue;
    seen.add(durationMs);
    result.push(durationMs);
    if (result.length >= limit) break;
  }
  return result;
}

function normalizeTraceDurationQuickFilterValue(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return '';
    return String(Math.ceil(value / 1_000_000));
  }
  const trimmed = value?.trim();
  return trimmed && /^\d+$/.test(trimmed) ? trimmed : '';
}

function formatTraceGroupLatency(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0ms';
  if (value >= 100) return `${Math.round(value)}ms`;
  return `${Math.round(value * 10) / 10}ms`;
}

function isSafeTraceResourceFilterKey(key: string) {
  return /^[A-Za-z0-9_.:-]+$/.test(key.trim());
}

function isSafeTraceResourceFilterValue(value: string) {
  const trimmed = value.trim();
  return Boolean(trimmed && trimmed !== '-' && !trimmed.includes(',') && !/\s+and\s+/i.test(trimmed));
}

function buildTraceResourceFilterExpression(name: React.ReactNode, value: React.ReactNode) {
  const key = String(name ?? '').trim();
  const filterValue = String(value ?? '').trim();
  if (!isSafeTraceResourceFilterKey(key) || !isSafeTraceResourceFilterValue(filterValue)) {
    return null;
  }
  return `${key}=${filterValue}`;
}

function buildTraceResourceGroupBy(name: React.ReactNode) {
  const key = String(name ?? '').trim();
  if (!isSafeTraceResourceFilterKey(key)) {
    return null;
  }
  return `resource:${key}`;
}

function buildTraceGroupResultFilter(groupBy: string, value: string) {
  const normalizedGroupBy = groupBy.trim();
  const normalizedValue = value.trim();
  if (!isSafeTraceResourceFilterValue(normalizedValue)) {
    return null;
  }
  if (normalizedGroupBy === 'service.name' || normalizedGroupBy === 'service_name') {
    return { kind: 'service' as const, value: normalizedValue };
  }
  if (normalizedGroupBy === 'operation.name' || normalizedGroupBy === 'span.name') {
    return { kind: 'operation' as const, value: normalizedValue };
  }
  if (normalizedGroupBy === 'status') {
    return { kind: 'status' as const, errorOnly: normalizedValue.toUpperCase().includes('ERROR') };
  }
  if (normalizedGroupBy.startsWith('resource:')) {
    const key = normalizedGroupBy.slice('resource:'.length);
    if (!isSafeTraceResourceFilterKey(key)) return null;
    return { kind: 'resource' as const, expression: `${key}=${normalizedValue}` };
  }
  if (!isSafeTraceResourceFilterKey(normalizedGroupBy)) {
    return null;
  }
  return { kind: 'resource' as const, expression: `${normalizedGroupBy}=${normalizedValue}` };
}

function mergeTraceResourceFilterExpression(currentFilter: string | undefined, expression: string) {
  const trimmedFilter = currentFilter?.trim() || '';
  if (!trimmedFilter) return expression;
  const compactFilter = trimmedFilter.replace(/\s+/g, '');
  const compactExpression = expression.replace(/\s+/g, '');
  if (compactFilter.includes(compactExpression)) {
    return trimmedFilter;
  }
  return `${trimmedFilter} and ${expression}`;
}

function readTraceAttribute(source: Record<string, string> | undefined, key: string) {
  return firstNavigationId(source?.[key]);
}

function updateDraftField(field: keyof TraceQueryState, value: string | boolean | TraceTableColumnKey[]) {
  return (previous: TraceQueryState): TraceQueryState => ({
    ...previous,
    [field]: value
  });
}

function updateTraceSpanScope(value: string) {
  const spanScope: TraceSpanScope = value === 'all' || value === 'entrypoint' ? value : 'root';
  return updateDraftField('spanScope', spanScope);
}

function updateTraceListPageSize(value: string) {
  const listPageSize = TRACE_LIST_PAGE_SIZE_OPTIONS.find(option => option === value) || DEFAULT_TRACE_LIST_PAGE_SIZE;
  return (previous: TraceQueryState): TraceQueryState => ({
    ...previous,
    listPageSize,
    listPageIndex: DEFAULT_TRACE_LIST_PAGE_INDEX
  });
}

function normalizeVisibleTraceColumns(columns?: TraceTableColumnKey[]) {
  const current = new Set(columns || DEFAULT_TRACE_TABLE_COLUMNS);
  current.add('start');
  return TRACE_TABLE_COLUMN_KEYS.filter(item => current.has(item));
}

function resolveNextTraceColumns(columns: TraceTableColumnKey[] | undefined, column: TraceTableColumnKey, checked: boolean) {
  const current = new Set(normalizeVisibleTraceColumns(columns));
  if (checked) {
    current.add(column);
  } else if (column !== 'start' && current.size > 1) {
    current.delete(column);
  }
  current.add('start');
  return TRACE_TABLE_COLUMN_KEYS.filter(item => current.has(item));
}

function buildTraceReturnHref(routeContext: SignalRouteContext, query: TraceQueryState, view: TraceExplorerView) {
  return buildTraceManageRoute(routeContext, query, { view });
}

function buildSelectedTraceReturnHref(
  currentTraceReturnHref: string,
  detail: TraceDetail | null | undefined,
  selectedSpan: TraceSpanNode | null,
  routeContext: SignalRouteContext
) {
  const url = new URL(currentTraceReturnHref || '/trace/manage', 'http://localhost');
  const selectedTraceId = firstNavigationId(detail?.traceId, routeContext.traceId);
  const selectedSpanId = firstNavigationId(selectedSpan?.spanId, routeContext.spanId);
  const selectedServiceName = firstNavigationId(selectedSpan?.serviceName, detail?.serviceName, routeContext.serviceName);
  const selectedNamespace = firstNavigationId(
    selectedSpan?.resourceAttributes?.['service.namespace'],
    detail?.serviceNamespace,
    routeContext.serviceNamespace
  );
  const selectedEnvironment = firstNavigationId(
    selectedSpan?.resourceAttributes?.['deployment.environment.name'],
    routeContext.environment
  );

  if (selectedTraceId) url.searchParams.set('traceId', selectedTraceId);
  if (selectedSpanId) url.searchParams.set('spanId', selectedSpanId);
  if (selectedServiceName) url.searchParams.set('serviceName', selectedServiceName);
  if (selectedNamespace) url.searchParams.set('serviceNamespace', selectedNamespace);
  if (selectedEnvironment) url.searchParams.set('environment', selectedEnvironment);

  return `${url.pathname}${url.search}`;
}

function mergeTraceDetailSpans(detail: TraceDetail, spans: TraceDetail['spans']): TraceDetail {
  return {
    ...detail,
    spans: spans.length > 0 ? spans : detail.spans || []
  };
}

function buildTraceTimelineTicks(durationNanos?: number | null): ObservabilityWaterfallTick[] {
  const totalNanos = Math.max(Number(durationNanos || 0), 1_000_000);
  return [0, 25, 50, 75, 100].map(percent => ({
    percent,
    label: percent === 0 ? '0 ms' : formatDurationNanos((totalNanos * percent) / 100)
  }));
}

function traceStatusBadgeTone(statusTone: TraceExplorerRow['statusTone']): HzStatusTone {
  if (statusTone === 'danger') return 'critical';
  if (statusTone === 'success') return 'success';
  if (statusTone === 'warning') return 'warning';
  return 'neutral';
}

type TraceAttributionDiagnosticRow = ReturnType<typeof buildTraceAttributionDiagnostics>[number];

function TraceAttributionDiagnostics({ rows }: { rows: TraceAttributionDiagnosticRow[] }) {
  const { t } = useI18n();

  if (rows.length === 0) return null;

  return (
    <HzAttributeDiagnostics
      data-trace-manage-attribution-diagnostics="hertzbeat-attribute-diagnostics"
      data-trace-manage-attribution-diagnostics-owner="hertzbeat-ui-attribute-diagnostics"
      aria-label={t('trace.manage.attribution-diagnostics.aria')}
      title={t('trace.manage.attribution-diagnostics.title')}
      namespaceLabel="hertzbeat.*"
      rows={rows.map(row => ({
        key: row.key,
        label: row.label,
        value: row.value,
        meta: row.meta,
        state: row.state,
        stateLabel: row.state === 'present'
          ? t('trace.manage.attribution-diagnostics.present')
          : t('trace.manage.attribution-diagnostics.missing'),
        tone: row.state === 'present' ? 'success' : 'critical',
        rowProps: { 'data-trace-manage-attribution-diagnostic-state': row.state },
        badgeProps: {
          'data-trace-manage-attribution-diagnostic-badge-owner': 'hertzbeat-ui-status-badge',
          'data-trace-manage-attribution-diagnostic-badge-state': row.state
        }
      }))}
    />
  );
}

type TraceWaterfallRow = ReturnType<typeof buildTraceWaterfallRows>[number];
type TraceWaterfallEventSelection = {
  row: TraceWaterfallRow;
  event: NonNullable<TraceWaterfallRow['events']>[number];
};

function findTraceWaterfallEvent(rows: TraceWaterfallRow[], eventKey?: string | null): TraceWaterfallEventSelection | null {
  if (!eventKey) return null;
  for (const row of rows) {
    const event = row.events?.find(item => item.key === eventKey);
    if (event) return { row, event };
  }
  return null;
}

function buildTraceWaterfallEventFacts(selection: TraceWaterfallEventSelection, t: TraceTranslator) {
  const { row, event } = selection;
  return [
    {
      title: t('trace.manage.drawer.event-fact.title'),
      copy: event.label || t('trace.manage.drawer.event-fact.fallback'),
      meta: t('trace.manage.drawer.event-fact.meta')
    },
    {
      title: t('trace.manage.drawer.event-fact.span'),
      copy: row.title || row.key,
      meta: row.detailLabel || row.copy
    },
    {
      title: t('trace.manage.drawer.event-fact.position'),
      copy: event.offsetLabel || `${Math.round(event.leftPct)}%`,
      meta: t('trace.manage.drawer.event-fact.timeline')
    },
    {
      title: t('trace.manage.drawer.event-fact.attributes'),
      copy: event.attributesLabel || t('trace.manage.drawer.event-fact.no-attributes'),
      meta: 'attributes'
    }
  ];
}

function TraceWaterfallDrawer({
  state,
  query,
  routeContext,
  currentTraceReturnHref,
  onClose,
  onSelectSpan,
  onSelectEvent,
  onApplyOperationFilter,
  onApplyResourceFilter,
  onReplaceResourceFilter,
  onApplyResourceGroupBy
}: {
  state: TraceDetailDrawerState;
  query: TraceQueryState;
  routeContext: SignalRouteContext;
  currentTraceReturnHref: string;
  onClose: () => void;
  onSelectSpan: (spanId: string) => void;
  onSelectEvent: (eventKey: string | null, spanId?: string) => void;
  onApplyOperationFilter: (operationName: string) => void;
  onApplyResourceFilter: (name: string, value: string) => void;
  onReplaceResourceFilter: (name: string, value: string) => void;
  onApplyResourceGroupBy: (name: string) => void;
}) {
  const { t } = useI18n();
  const detail = state.detail;
  const selectedSpan = detail?.spans.find(span => span.spanId === state.selectedSpanId) || detail?.spans[0] || null;
  const detailEntityId = firstNavigationId(
    routeContext.entityId,
    readTraceAttribute(detail?.resourceAttributes, 'hertzbeat.entity_id'),
    readTraceAttribute(selectedSpan?.resourceAttributes, 'hertzbeat.entity_id')
  );
  const handoffRouteContext = detailEntityId && !routeContext.entityId ? { ...routeContext, entityId: detailEntityId } : routeContext;
  const selectedTraceReturnHref = buildSelectedTraceReturnHref(currentTraceReturnHref, detail, selectedSpan, handoffRouteContext);
  const attributionDiagnostics = buildTraceAttributionDiagnostics(detail, selectedSpan, handoffRouteContext, t);
  const waterfallRows = buildTraceWaterfallRows(detail, selectedSpan?.spanId || state.selectedSpanId, formatDurationNanos, t);
  const selectedSpanFacts = buildSelectedSpanFacts(selectedSpan, detail, t, formatDurationNanos);
  const selectedSpanEvents = buildSelectedSpanEventRows(selectedSpan, formatTime, t);
  const selectedSpanLinks = buildSelectedSpanLinkRows(selectedSpan, t);
  const selectedSpanAttributeRows = buildTraceAttributeRows(
    selectedSpan?.spanAttributes,
    t('trace.manage.drawer.attributes.span.meta'),
    t
  );
  const selectedResourceAttributeRows = buildTraceAttributeRows(
    selectedSpan?.resourceAttributes,
    t('trace.manage.drawer.attributes.resource.meta'),
    t
  );
  const selectedTraceEvent = findTraceWaterfallEvent(waterfallRows, state.selectedEventKey);
  const handoffLinks = buildTraceHandoffLinks(detail, selectedSpan, handoffRouteContext, {
    intakeReturnTo: currentTraceReturnHref,
    logsReturnTo: selectedTraceReturnHref,
    metricsReturnTo: selectedTraceReturnHref,
    alertDraft: buildTraceAlertRuleDraft(query, handoffRouteContext)
  });
  const traceEventCount = waterfallRows.reduce((count, row) => count + (row.events?.length || 0), 0);
  const missingTraceHandoffTitle = t('trace.manage.handoff.logs-disabled');
  const missingEntityHandoffTitle = t('trace.manage.handoff.entity-disabled');
  const canOpenLogs = hasNavigationId(detail?.traceId);
  const canOpenEntity = handoffLinks.entityHref.startsWith('/entities/');
  const selectedSpanOperationName = selectedSpan?.spanName?.trim() || '';
  const selectedFacts = selectedTraceEvent ? buildTraceWaterfallEventFacts(selectedTraceEvent, t) : [
    ...selectedSpanFacts,
    ...selectedSpanEvents.map(row => ({ ...row, title: `${t('trace.manage.drawer.event-prefix')} · ${row.title}` })),
    ...selectedSpanLinks.map(row => ({ ...row, title: `${t('trace.manage.drawer.link-prefix')} · ${row.title}` }))
  ];
  const showSelectedSpan = () => onSelectEvent(null, selectedTraceEvent?.row.key);

  return (
    <OverlayDialog
      open={state.open}
      onClose={onClose}
      placement="right"
      maxWidthClassName="max-w-[1120px]"
      kicker={t('trace.manage.drawer.kicker')}
      title={selectedSpan?.spanName || detail?.rootSpanName || detail?.traceId || t('trace.manage.drawer.title-fallback')}
      footer={
        <HzActionGroup
          data-trace-manage-drawer-action-group="handoff-actions"
          data-trace-manage-drawer-action-group-owner="hertzbeat-ui-action-group"
          data-trace-manage-drawer-action-group-layout-owner="hertzbeat-ui-action-group"
          layout="full-end"
        >
          {selectedSpanOperationName ? (
            <HzButton
              type="button"
              data-trace-manage-drawer-operation-filter-action="true"
              data-trace-manage-drawer-operation-filter-action-owner="hertzbeat-ui-button"
              data-trace-manage-drawer-operation-filter-value={selectedSpanOperationName}
              size="md"
              intent="secondary"
              onClick={() => onApplyOperationFilter(selectedSpanOperationName)}
              aria-label={t('trace.manage.drawer.operation-filter-action.aria', { operation: selectedSpanOperationName })}
            >
              <HzButtonIcon
                icon={Filter}
                data-trace-manage-drawer-operation-filter-action-icon="filter"
                data-trace-manage-drawer-operation-filter-action-icon-owner="hertzbeat-ui-button-icon"
              />
              {t('trace.manage.drawer.operation-filter-action')}
            </HzButton>
          ) : null}
          {canOpenLogs ? (
            <HzButtonLink
              component={Link}
              data-trace-manage-open-logs-action="true"
              data-trace-manage-drawer-detail-action="logs"
              href={handoffLinks.logsHref}
              size="md"
            >
              {t('trace.manage.drawer.action.logs')}
            </HzButtonLink>
          ) : (
            <HzDisabledActionShell
              title={missingTraceHandoffTitle}
              data-trace-manage-disabled-action-owner="hertzbeat-ui-disabled-action-shell"
              data-trace-manage-disabled-action="logs"
              data-trace-manage-disabled-action-scope="drawer-footer"
            >
              <HzButton
                data-trace-manage-open-logs-action="true"
                data-trace-manage-open-logs-action-disabled="missing-trace-id"
                data-trace-manage-drawer-detail-action="logs"
                size="md"
                disabled
                title={missingTraceHandoffTitle}
                aria-label={missingTraceHandoffTitle}
              >
                {t('trace.manage.drawer.action.logs')}
              </HzButton>
            </HzDisabledActionShell>
          )}
          <HzButtonLink component={Link} data-trace-manage-drawer-detail-action="metrics" href={handoffLinks.metricsHref} size="md">
            {t('trace.manage.drawer.action.metrics')}
          </HzButtonLink>
          {canOpenEntity ? (
            <HzButtonLink component={Link} data-trace-manage-drawer-detail-action="entity" href={handoffLinks.entityHref} size="md">
              {t('trace.manage.drawer.action.entity')}
            </HzButtonLink>
          ) : (
            <HzDisabledActionShell
              title={missingEntityHandoffTitle}
              data-trace-manage-disabled-action-owner="hertzbeat-ui-disabled-action-shell"
              data-trace-manage-disabled-action="entity"
              data-trace-manage-disabled-action-scope="drawer-footer"
            >
              <HzButton
                data-trace-manage-entity-action-disabled="missing-entity-id"
                data-trace-manage-drawer-detail-action="entity"
                size="md"
                disabled
                title={missingEntityHandoffTitle}
                aria-label={missingEntityHandoffTitle}
              >
                {t('trace.manage.drawer.action.entity')}
              </HzButton>
            </HzDisabledActionShell>
          )}
        </HzActionGroup>
      }
    >
      <HzDialogBodyLayout
        data-trace-manage-detail-drawer="waterfall-side-modal"
        data-trace-manage-detail-drawer-owner="hertzbeat-ui-dialog-body-layout"
      >
        {state.loading ? (
          <ObservabilityStatusState title={t('trace.manage.drawer.loading.title')} copy={t('trace.manage.drawer.loading.copy')} />
        ) : state.error ? (
          <ObservabilityStatusState title={t('trace.manage.drawer.error.title')} copy={state.error} tone="danger" />
        ) : detail ? (
          <>
            <HzChipGroup
              data-trace-manage-drawer-meta="shared-chip-group"
              data-trace-manage-drawer-meta-owner="hertzbeat-ui-toolbar-chips"
            >
              <HzDialogMetaItem
                data-trace-manage-drawer-meta-item="trace-id"
                data-trace-manage-drawer-meta-item-owner="hertzbeat-ui-dialog-meta-item"
                width="trace-id"
              >
                {detail.traceId}
              </HzDialogMetaItem>
              <HzDialogMetaItem
                data-trace-manage-drawer-meta-item="span-count"
                data-trace-manage-drawer-meta-item-owner="hertzbeat-ui-dialog-meta-item"
                width="span-count"
              >
                {t('trace.manage.drawer.span-count', { count: waterfallRows.length })}
              </HzDialogMetaItem>
              <HzDialogMetaItem
                data-trace-manage-drawer-meta-item="duration"
                data-trace-manage-drawer-meta-item-owner="hertzbeat-ui-dialog-meta-item"
                width="duration"
              >
                {formatDurationNanos(detail.durationNanos)}
              </HzDialogMetaItem>
            </HzChipGroup>
            <HzSignalSummaryStrip
              data-trace-manage-drawer-stage-stats="inline-signal-summary"
              data-trace-manage-drawer-stage-stats-owner="hertzbeat-ui-signal-summary-strip"
              layout="detail"
              density="compact"
              items={[
                {
                  id: 'current-span',
                  label: t('trace.manage.drawer.stat.current-span'),
                  value: selectedSpan?.spanName || selectedSpan?.spanId || detail.rootSpanName || '-',
                  tone: 'info' as HzStatusTone
                },
                {
                  id: 'error-spans',
                  label: t('trace.manage.drawer.stat.error-spans'),
                  value: String(detail.errorSpanCount || waterfallRows.filter(row => row.tone === 'danger').length),
                  tone: (detail.errorSpanCount || waterfallRows.some(row => row.tone === 'danger') ? 'critical' : 'neutral') as HzStatusTone
                },
                {
                  id: 'events',
                  label: t('trace.manage.drawer.stat.events'),
                  value: String(traceEventCount),
                  tone: 'neutral' as HzStatusTone
                },
                {
                  id: 'links',
                  label: t('trace.manage.drawer.stat.links'),
                  value: String((selectedSpan?.links || []).length),
                  tone: 'neutral' as HzStatusTone
                }
              ]}
            />
            <HzDialogBodyLayout
              variant="waterfall-detail"
              data-trace-manage-drawer-body-layout="shared-waterfall-detail"
              data-trace-manage-drawer-body-layout-owner="hertzbeat-ui-dialog-body-layout"
            >
              <ObservabilityWaterfall
                rows={waterfallRows}
                spanLabel={t('trace.manage.drawer.waterfall.span')}
                durationLabel={t('trace.manage.drawer.waterfall.duration')}
                timelineLabel={t('trace.manage.drawer.waterfall.timeline')}
                timelineTicks={buildTraceTimelineTicks(detail.durationNanos)}
                selectedEventKey={state.selectedEventKey}
                onSelect={onSelectSpan}
                onSelectEvent={onSelectEvent}
              />
              <HzDialogBodyLayout
                variant="side-stack"
                data-trace-manage-drawer-side-stack="selected-facts"
                data-trace-manage-drawer-side-stack-owner="hertzbeat-ui-dialog-body-layout"
              >
                <TraceAttributionDiagnostics rows={attributionDiagnostics} />
                <HzDetailRows
                  data-trace-manage-drawer-span-attributes="span-attributes"
                  data-trace-manage-drawer-span-attributes-owner="hertzbeat-ui-detail-rows"
                  aria-label={t('trace.manage.drawer.attributes.span.aria')}
                  heading={t('trace.manage.drawer.attributes.span.title')}
                  rows={selectedSpanAttributeRows.map(row => ({
                    key: `span-attribute-${row.title}`,
                    title: row.title,
                    copy: row.copy,
                    meta: row.meta
                  }))}
                />
                <HzDetailRows
                  data-trace-manage-drawer-resource-attributes="resource-attributes"
                  data-trace-manage-drawer-resource-attributes-owner="hertzbeat-ui-detail-rows"
                  aria-label={t('trace.manage.drawer.attributes.resource.aria')}
                  heading={t('trace.manage.drawer.attributes.resource.title')}
                  rows={selectedResourceAttributeRows.map(row => ({
                    key: `resource-attribute-${row.title}`,
                    title: row.title,
                    copy: row.copy,
                    meta: row.meta,
                    action: buildTraceResourceFilterExpression(row.title, row.copy) || buildTraceResourceGroupBy(row.title) ? (
                      <HzActionGroup
                        data-trace-manage-drawer-resource-action-group="filter-group"
                        data-trace-manage-drawer-resource-action-group-owner="hertzbeat-ui-action-group"
                        layout="end-wrap"
                      >
                        {buildTraceResourceFilterExpression(row.title, row.copy) ? (
                          <>
                          <HzButton
                            data-trace-manage-drawer-resource-filter-action="true"
                            data-trace-manage-drawer-resource-filter-action-owner="hertzbeat-ui-button"
                            data-trace-manage-drawer-resource-filter-name={row.title}
                            data-trace-manage-drawer-resource-filter-value={row.copy}
                            size="sm"
                            intent="secondary"
                            onClick={() => onApplyResourceFilter(row.title, row.copy)}
                            aria-label={t('trace.manage.drawer.attributes.filter-action.aria', { name: row.title, value: row.copy })}
                          >
                            <HzButtonIcon icon={Filter} data-trace-manage-drawer-resource-filter-action-icon="filter" data-trace-manage-drawer-resource-filter-action-icon-owner="hertzbeat-ui-button-icon" />
                            {t('trace.manage.drawer.attributes.filter-action')}
                          </HzButton>
                          <HzButton
                            data-trace-manage-drawer-resource-replace-action="true"
                            data-trace-manage-drawer-resource-replace-action-owner="hertzbeat-ui-button"
                            data-trace-manage-drawer-resource-filter-name={row.title}
                            data-trace-manage-drawer-resource-filter-value={row.copy}
                            size="sm"
                            intent="secondary"
                            onClick={() => onReplaceResourceFilter(row.title, row.copy)}
                            aria-label={t('trace.manage.drawer.attributes.replace-action.aria', { name: row.title, value: row.copy })}
                          >
                            <HzButtonIcon icon={Replace} data-trace-manage-drawer-resource-replace-action-icon="replace" data-trace-manage-drawer-resource-replace-action-icon-owner="hertzbeat-ui-button-icon" />
                            {t('trace.manage.drawer.attributes.replace-action')}
                          </HzButton>
                          </>
                        ) : null}
                        {buildTraceResourceGroupBy(row.title) ? (
                          <HzButton
                            data-trace-manage-drawer-resource-group-action="true"
                            data-trace-manage-drawer-resource-group-action-owner="hertzbeat-ui-button"
                            data-trace-manage-drawer-resource-group-name={row.title}
                            size="sm"
                            intent="secondary"
                            onClick={() => onApplyResourceGroupBy(row.title)}
                            aria-label={t('trace.manage.drawer.attributes.group-action.aria', { name: row.title })}
                          >
                            <HzButtonIcon icon={BarChart3} data-trace-manage-drawer-resource-group-action-icon="group" data-trace-manage-drawer-resource-group-action-icon-owner="hertzbeat-ui-button-icon" />
                            {t('trace.manage.drawer.attributes.group-action')}
                          </HzButton>
                        ) : null}
                      </HzActionGroup>
                    ) : null
                  }))}
                />
                {selectedTraceEvent ? (
                  <HzDialogEventNotice
                    data-trace-manage-event-detail="span-event-detail"
                    data-trace-manage-event-detail-type="span-event"
                    data-trace-manage-event-detail-owner="hertzbeat-ui-dialog-event-notice"
                    title={selectedTraceEvent.event.label}
                    description={(
                      <HzDialogEventText
                        data-trace-manage-event-detail-copy="span-event-not-span"
                        data-trace-manage-event-detail-text-owner="hertzbeat-ui-dialog-event-text"
                      >
                        {t('trace.manage.drawer.event-detail.copy')}
                      </HzDialogEventText>
                    )}
                    meta={(
                      <HzDialogEventText
                        variant="meta"
                        data-trace-manage-event-detail-meta="span-event-label"
                        data-trace-manage-event-detail-text-owner="hertzbeat-ui-dialog-event-text"
                      >
                        {t('trace.manage.drawer.event-detail.title')}
                      </HzDialogEventText>
                    )}
                    actions={(
                      <HzButton
                        data-trace-manage-event-detail-action="view-span"
                        data-trace-manage-event-detail-control="shared-hz-button"
                        intent="ghost"
                        size="xs"
                        onClick={showSelectedSpan}
                      >
                        {t('trace.manage.drawer.event-detail.action.span')}
                      </HzButton>
                    )}
                    tone="info"
                    variant="hint"
                  />
                ) : null}
                <HzDetailRows
                  data-trace-manage-drawer-selected-facts="shared-detail-rows"
                  data-trace-manage-drawer-selected-facts-owner="hertzbeat-ui-detail-rows"
                  rows={selectedFacts.map(row => ({
                    key: `${row.title}-${row.meta ?? ''}`,
                    title: row.title,
                    copy: row.copy,
                    meta: row.meta
                  }))}
                />
              </HzDialogBodyLayout>
            </HzDialogBodyLayout>
          </>
        ) : (
          <ObservabilityStatusState title={t('trace.manage.drawer.empty.title')} copy={t('trace.manage.drawer.empty.copy')} />
        )}
      </HzDialogBodyLayout>
    </OverlayDialog>
  );
}

function TraceExplorer({
  data,
  draft,
  setDraft,
  applyQuery,
  resetQuery,
  switchView,
  currentView,
  routeContext,
  timeContext,
  applyTimeContext,
  restoreSavedViewRoute,
  currentTraceReturnHref
}: {
  data: TraceManageData;
  draft: TraceQueryState;
  setDraft: React.Dispatch<React.SetStateAction<TraceQueryState>>;
  applyQuery: (nextQuery?: TraceQueryState) => void;
  resetQuery: () => void;
  switchView: (view: TraceExplorerView) => void;
  currentView: TraceExplorerView;
  routeContext: SignalRouteContext;
  timeContext: TimeContext;
  applyTimeContext: (timeContext: TimeContext) => void;
  restoreSavedViewRoute: (route: string) => void;
  currentTraceReturnHref: string;
}) {
  const { t } = useI18n();
  const [savedQueryViews, setSavedQueryViews] = useState<TraceSavedQueryView[]>(readTraceSavedQueryViews);
  const [editingSavedQueryViewId, setEditingSavedQueryViewId] = useState<string | null>(null);
  const [savedQueryViewLabelDraft, setSavedQueryViewLabelDraft] = useState('');
  const [traceExportFormat, setTraceExportFormat] = useState<TraceExportFormat>('csv');
  const [traceExportRowLimit, setTraceExportRowLimit] = useState<TraceExportRowLimit>('current');
  const rows = useMemo(() => buildTraceExplorerRows(data.list.content || [], formatDurationNanos, formatTime), [data.list.content]);
  const listPageIndex = Math.max(0, Number.isFinite(data.list.pageIndex) ? Number(data.list.pageIndex) : Number(draft.listPageIndex || 0) || 0);
  const listPageSize = Math.max(1, Number.isFinite(data.list.pageSize) ? Number(data.list.pageSize) : Number(draft.listPageSize || DEFAULT_TRACE_LIST_PAGE_SIZE) || Number(DEFAULT_TRACE_LIST_PAGE_SIZE));
  const listTotalElements = Math.max(0, Number.isFinite(data.list.totalElements) ? Number(data.list.totalElements) : 0);
  const listPageStart = listTotalElements === 0 ? 0 : listPageIndex * listPageSize + 1;
  const listPageEnd = listTotalElements === 0 ? 0 : Math.min(listTotalElements, (listPageIndex + 1) * listPageSize);
  const hasPreviousListPage = listPageIndex > 0;
  const hasNextListPage = (listPageIndex + 1) * listPageSize < listTotalElements;
  const selectedTrace = useMemo(
    () =>
      rows[0] ?? {
        key: draft.traceId || 'trace-empty',
        traceId: draft.traceId || '-',
        rootSpanId: draft.spanId || '-',
        name: draft.traceId ? t('trace.manage.route.fallback.filtered-trace') : t('trace.manage.route.fallback.waiting-query'),
        service: draft.serviceName || routeContext.serviceName || '-',
        namespace: routeContext.serviceNamespace || '-',
        duration: '-',
        durationMs: '',
        status: draft.errorOnly ? 'ERROR' : 'UNSET',
        startTime: '-'
      },
    [
      draft.errorOnly,
      draft.serviceName,
      draft.spanId,
      draft.traceId,
      routeContext.serviceName,
      routeContext.serviceNamespace,
      rows,
      t
    ]
  );
  const handoffLinks = buildTraceHandoffLinks(null, null, routeContext, {
    traceId: selectedTrace.traceId !== '-' ? selectedTrace.traceId : draft.traceId || undefined,
    spanId: selectedTrace.rootSpanId !== '-' ? selectedTrace.rootSpanId : draft.spanId || undefined,
    serviceName: selectedTrace.service !== '-' ? selectedTrace.service : draft.serviceName || routeContext.serviceName || undefined,
    serviceNamespace: selectedTrace.namespace !== '-' ? selectedTrace.namespace : routeContext.serviceNamespace || undefined,
    environment: routeContext.environment,
    intakeReturnTo: currentTraceReturnHref,
    logsReturnTo: currentTraceReturnHref,
    metricsReturnTo: currentTraceReturnHref,
    alertDraft: buildTraceAlertRuleDraft(draft, routeContext)
  });
  const missingTraceHandoffTitle = t('trace.manage.handoff.logs-disabled');
  const missingEntityHandoffTitle = t('trace.manage.handoff.entity-disabled');
  const canOpenLogs = hasNavigationId(selectedTrace.traceId) || hasNavigationId(draft.traceId) || hasNavigationId(routeContext.traceId);
  const canOpenEntity = hasNavigationId(routeContext.entityId);
  const entityContextRows = buildSignalEntityContextRows(routeContext, {
    serviceName: selectedTrace.service !== '-' ? selectedTrace.service : draft.serviceName,
    serviceNamespace: selectedTrace.namespace !== '-' ? selectedTrace.namespace : routeContext.serviceNamespace,
    environment: routeContext.environment,
    traceId: selectedTrace.traceId !== '-' ? selectedTrace.traceId : draft.traceId,
    spanId: selectedTrace.rootSpanId !== '-' ? selectedTrace.rootSpanId : draft.spanId,
    source: routeContext.source || 'OTLP'
  });
  const routeAttributionDiagnostics = buildTraceAttributionDiagnostics(null, null, routeContext, t);
  const latestObservedAt = data.overview.latestObservedAt ? formatTime(data.overview.latestObservedAt) : '-';
  const chartRows = rows.length ? rows.slice(0, 10) : [selectedTrace];
  const showsTraceTimeSeries = currentView === 'list' || currentView === 'time-series';
  const showsTraceTable = currentView === 'list' || currentView === 'trace' || currentView === 'table';
  const activeGroupBy = draft.groupBy?.trim() || '';
  const traceGroupRows = activeGroupBy ? data.group?.groups || [] : [];
  const visibleTraceColumns = normalizeVisibleTraceColumns(draft.columns);
  const visibleTraceColumnSet = useMemo(() => new Set(visibleTraceColumns), [visibleTraceColumns]);
  const serviceQuickFilterValues = uniqueTraceQuickFilterValues([
    draft.serviceName,
    routeContext.serviceName,
    ...rows.map(row => row.service)
  ]);
  const operationQuickFilterValues = uniqueTraceQuickFilterValues([
    draft.operationName,
    ...data.list.content.map(item => item.rootSpanName)
  ]);
  const minDurationQuickFilterValues = uniqueTraceDurationQuickFilterValues([
    draft.minDurationMs,
    ...data.list.content.map(item => item.durationNanos)
  ]);
  const traceIdQuickFilterValues = uniqueTraceQuickFilterValues([
    draft.traceId,
    routeContext.traceId,
    ...rows.map(row => row.traceId)
  ], 2);
  const traceColumnOptions = useMemo(
    () =>
      TRACE_TABLE_COLUMN_KEYS.map(column => ({
        key: column,
        label: t(`trace.manage.route.table.column.${column}`)
      })),
    [t]
  );
  const activeTraceId = selectedTrace.traceId !== '-' ? selectedTrace.traceId : t('trace.manage.route.fallback.unselected');
  const selectedTraceEvidenceRows = [
    [t('trace.manage.route.evidence.trace-id'), activeTraceId, 'traceId'],
    [t('trace.manage.route.evidence.trace-status'), selectedTrace.status, draft.errorOnly ? t('trace.manage.route.evidence.error-only') : t('trace.manage.route.evidence.current-filter')],
    [t('trace.manage.route.evidence.start-time'), selectedTrace.startTime, t('trace.manage.route.evidence.root-span-start')],
    [t('trace.manage.route.evidence.latest-observed'), latestObservedAt, t('trace.manage.route.evidence.latest-workbench-trace')]
  ];
  const [traceDetailDrawer, setTraceDetailDrawer] = useState<TraceDetailDrawerState>({
    open: false,
    loading: false,
    error: null,
    detail: null,
    selectedSpanId: null,
    selectedEventKey: null
  });
  const autoOpenedTraceDetailKeyRef = useRef<string | null>(null);
  const requestedTraceId = firstNavigationId(draft.traceId, routeContext.traceId);
  const requestedSpanId = firstNavigationId(draft.spanId, routeContext.spanId);

  const closeTraceDetailDrawer = () => {
    setTraceDetailDrawer({
      open: false,
      loading: false,
      error: null,
      detail: null,
      selectedSpanId: null,
      selectedEventKey: null
    });
  };

  const openTraceDetailDrawer = useCallback(async (row: typeof rows[number], preferredSpanId?: string | null) => {
    const traceId = row.traceId?.trim();
    if (!traceId || traceId === '-') return;
    const initialSelectedSpanId = firstNavigationId(preferredSpanId, row.rootSpanId) || null;
    setTraceDetailDrawer({
      open: true,
      loading: true,
      error: null,
      detail: null,
      selectedSpanId: initialSelectedSpanId,
      selectedEventKey: null
    });
    try {
      const bundle = await loadTraceDetailBundle(apiMessageGet, traceId);
      const detail = mergeTraceDetailSpans(bundle.detail, bundle.spans);
      const selectedSpanId = firstNavigationId(
        detail.spans.find(span => span.spanId === preferredSpanId)?.spanId,
        detail.spans.find(span => span.spanId === row.rootSpanId)?.spanId,
        detail.spans[0]?.spanId,
        row.rootSpanId
      ) || null;
      setTraceDetailDrawer({
        open: true,
        loading: false,
        error: null,
        detail,
        selectedSpanId,
        selectedEventKey: null
      });
    } catch {
      setTraceDetailDrawer({
        open: true,
        loading: false,
        error: t('trace.manage.drawer.error.copy'),
        detail: null,
        selectedSpanId: initialSelectedSpanId,
        selectedEventKey: null
      });
    }
  }, [t]);

  const updateTraceColumns = useCallback((column: TraceTableColumnKey, checked: boolean) => {
    const nextColumns = resolveNextTraceColumns(draft.columns, column, checked);
    const nextQuery = { ...draft, columns: nextColumns };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft]);

  const applyTraceQuickFilter = useCallback((kind: 'serviceName' | 'errorOnly' | 'traceId' | 'operationName' | 'minDurationMs', value?: string) => {
    const nextQuery: TraceQueryState = { ...draft };
    if (kind === 'serviceName') {
      nextQuery.serviceName = draft.serviceName.trim() === value ? '' : value || '';
    } else if (kind === 'traceId') {
      nextQuery.traceId = draft.traceId.trim() === value ? '' : value || '';
    } else if (kind === 'operationName') {
      nextQuery.operationName = draft.operationName?.trim() === value ? '' : value || '';
    } else if (kind === 'minDurationMs') {
      nextQuery.minDurationMs = draft.minDurationMs?.trim() === value ? '' : value || '';
    } else {
      nextQuery.errorOnly = !draft.errorOnly;
    }
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft]);

  const applyTraceRowErrorFilter = useCallback(() => {
    const nextQuery: TraceQueryState = {
      ...draft,
      errorOnly: true
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft]);

  const applyTraceRowDurationFilter = useCallback((durationMs: string) => {
    const normalizedDurationMs = normalizeTraceDurationQuickFilterValue(durationMs);
    if (!normalizedDurationMs) return;
    const nextQuery: TraceQueryState = {
      ...draft,
      minDurationMs: normalizedDurationMs
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft]);

  const applyTraceListPageIndex = useCallback((nextPageIndex: number) => {
    const nextQuery: TraceQueryState = {
      ...draft,
      listPageIndex: String(Math.max(0, nextPageIndex))
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft]);

  const saveCurrentTraceQueryView = useCallback(() => {
    const nextView = createTraceSavedQueryView(draft, routeContext, currentView, currentTraceReturnHref, t);
    setSavedQueryViews(previous => {
      const nextViews = [nextView, ...previous.filter(view => view.route !== nextView.route)].slice(0, TRACE_SAVED_QUERY_VIEW_LIMIT);
      writeTraceSavedQueryViews(nextViews);
      return nextViews;
    });
  }, [currentTraceReturnHref, currentView, draft, routeContext, t]);

  const copyCurrentTraceQueryView = useCallback(() => {
    void copyTextToClipboard(currentTraceReturnHref);
  }, [currentTraceReturnHref]);

  const deleteTraceSavedQueryView = useCallback((viewId: string) => {
    setSavedQueryViews(previous => {
      const nextViews = previous.filter(view => view.id !== viewId);
      writeTraceSavedQueryViews(nextViews);
      return nextViews;
    });
  }, []);

  const updateTraceSavedQueryView = useCallback((viewId: string) => {
    const nextSnapshot = createTraceSavedQueryView(draft, routeContext, currentView, currentTraceReturnHref, t);
    setSavedQueryViews(previous => {
      const nextViews = previous.map(view => (
        view.id === viewId
          ? { ...nextSnapshot, id: view.id, label: view.label, createdAt: view.createdAt }
          : view
      ));
      writeTraceSavedQueryViews(nextViews);
      return nextViews;
    });
  }, [currentTraceReturnHref, currentView, draft, routeContext, t]);

  const startRenameTraceSavedQueryView = useCallback((view: TraceSavedQueryView) => {
    setEditingSavedQueryViewId(view.id);
    setSavedQueryViewLabelDraft(view.label);
  }, []);

  const cancelRenameTraceSavedQueryView = useCallback(() => {
    setEditingSavedQueryViewId(null);
    setSavedQueryViewLabelDraft('');
  }, []);

  const saveRenameTraceSavedQueryView = useCallback((viewId: string) => {
    const nextLabel = savedQueryViewLabelDraft.trim();
    if (!nextLabel) {
      cancelRenameTraceSavedQueryView();
      return;
    }
    setSavedQueryViews(previous => {
      const nextViews = previous.map(view => (view.id === viewId ? { ...view, label: nextLabel } : view));
      writeTraceSavedQueryViews(nextViews);
      return nextViews;
    });
    cancelRenameTraceSavedQueryView();
  }, [cancelRenameTraceSavedQueryView, savedQueryViewLabelDraft]);

  const applyTraceRowTraceIdFilter = useCallback((traceId: string) => {
    const normalizedTraceId = traceId.trim();
    if (!normalizedTraceId || normalizedTraceId === '-') return;
    const nextQuery: TraceQueryState = {
      ...draft,
      traceId: normalizedTraceId
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft]);

  const applyTraceResourceFilter = useCallback((name: string, value: string) => {
    const expression = buildTraceResourceFilterExpression(name, value);
    if (!expression) return;
    const nextQuery: TraceQueryState = {
      ...draft,
      resourceFilter: mergeTraceResourceFilterExpression(draft.resourceFilter, expression)
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft]);

  const replaceTraceResourceFilter = useCallback((name: string, value: string) => {
    const expression = buildTraceResourceFilterExpression(name, value);
    if (!expression) return;
    const nextQuery: TraceQueryState = {
      ...draft,
      resourceFilter: expression
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft]);

  const applyTraceResourceGroupBy = useCallback((name: string) => {
    const groupBy = buildTraceResourceGroupBy(name);
    if (!groupBy) return;
    const nextQuery: TraceQueryState = {
      ...draft,
      groupBy
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft]);

  const applyTraceGroupLimit = useCallback((value: string) => {
    const nextQuery: TraceQueryState = {
      ...draft,
      groupLimit: value.trim() || undefined
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft]);

  const applyTraceGroupOrder = useCallback((value: string) => {
    const nextQuery: TraceQueryState = {
      ...draft,
      groupOrder:
        value === 'error-count-desc' || value === 'latency-p95-desc'
          ? value
          : undefined
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft]);

  const applyTraceGroupMinCount = useCallback((value: string) => {
    const nextQuery: TraceQueryState = {
      ...draft,
      groupMinCount: value.trim() || undefined
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [applyQuery, draft, setDraft]);

  const applyTraceGroupResultFilter = useCallback((value: string) => {
    const filter = buildTraceGroupResultFilter(activeGroupBy, value);
    if (!filter) return;
    const nextQuery: TraceQueryState = {
      ...draft,
      ...(filter.kind === 'service'
        ? { serviceName: filter.value }
        : filter.kind === 'operation'
          ? { operationName: filter.value }
          : filter.kind === 'status'
            ? { errorOnly: filter.errorOnly }
            : { resourceFilter: mergeTraceResourceFilterExpression(draft.resourceFilter, filter.expression) })
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  }, [activeGroupBy, applyQuery, draft, setDraft]);

  const triggerTraceExportDownload = (exportRows: TraceExplorerRow[]) => {
    if (typeof window === 'undefined' || exportRows.length === 0) return;
    const content = traceExportFormat === 'jsonl'
      ? buildTraceJsonl(exportRows, visibleTraceColumns)
      : buildTraceCsv(exportRows, visibleTraceColumns);
    const type = traceExportFormat === 'jsonl' ? 'application/x-ndjson;charset=utf-8' : 'text/csv;charset=utf-8';
    const blob = new Blob([content], { type });
    const href = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = buildTraceExportFilename(traceExportFormat);
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(href);
  };

  const downloadTraceRows = async () => {
    if (typeof window === 'undefined' || rows.length === 0) return;
    if (traceExportRowLimit === 'current') {
      triggerTraceExportDownload(rows);
      return;
    }
    const baseExportListUrl = buildTraceUrls({
      ...draft,
      listPageIndex: DEFAULT_TRACE_LIST_PAGE_INDEX
    }, routeContext).listUrl;
    const exportRowLimit = Number(traceExportRowLimit);
    const exportItems: TraceListItem[] = [];
    for (let pageIndex = 0; exportItems.length < exportRowLimit; pageIndex += 1) {
      const remainingRows = exportRowLimit - exportItems.length;
      const pageSize = Math.min(TRACE_EXPORT_FETCH_PAGE_SIZE, remainingRows);
      const exportListUrl = new URL(baseExportListUrl, 'http://localhost');
      exportListUrl.searchParams.set('pageIndex', String(pageIndex));
      exportListUrl.searchParams.set('pageSize', String(pageSize));
      const exportListPath = `${exportListUrl.pathname}?${exportListUrl.searchParams.toString()}`;
      const exportList = await apiMessageGetWithTimeout<PageResult<TraceListItem>>(exportListPath);
      const pageItems = (exportList.content || []).slice(0, remainingRows);
      exportItems.push(...pageItems);
      const totalElements = Number(exportList.totalElements);
      if (pageItems.length < pageSize || (Number.isFinite(totalElements) && exportItems.length >= totalElements)) {
        break;
      }
    }
    triggerTraceExportDownload(buildTraceExplorerRows(exportItems, formatDurationNanos, formatTime));
  };

  const traceTableColumns = [
    {
      key: 'start',
      header: t('trace.manage.route.table.header.start'),
      render: (row: TraceExplorerRow) => (
        <HzDataCellText
          data-trace-manage-start-cell-owner="hertzbeat-ui-data-cell-text"
          variant="timestamp"
        >
          {row.startTime}
        </HzDataCellText>
      )
    },
    {
      key: 'service',
      header: t('trace.manage.route.table.header.service'),
      render: (row: TraceExplorerRow) => row.service !== '-' ? (
        <HzButton
          type="button"
          size="xs"
          intent="ghost"
          data-trace-manage-table-service-filter-action={row.service}
          data-trace-manage-service-cell-owner="hertzbeat-ui-button"
          aria-label={t('trace.manage.route.table.service-filter-action.aria', { service: row.service })}
          onClick={() => applyTraceQuickFilter('serviceName', row.service)}
          className="min-w-0 justify-start truncate font-mono"
        >
          {row.service}
        </HzButton>
      ) : (
        <HzDataCellText
          data-trace-manage-service-cell-owner="hertzbeat-ui-data-cell-text"
          variant="title"
        >
          {row.service}
        </HzDataCellText>
      )
    },
    {
      key: 'root-span',
      header: t('trace.manage.route.table.header.root-span'),
      render: (row: TraceExplorerRow) => (
        <HzActionGroup
          layout="inline-wrap"
          data-trace-manage-table-operation-actions="detail-filter"
          data-trace-manage-table-operation-actions-owner="hertzbeat-ui-action-group"
        >
          <HzTableRowActionButton
            data-trace-manage-open-detail-action="side-waterfall-modal"
            data-trace-manage-row-control="shared-hz-button"
            data-trace-manage-row-action-owner="hertzbeat-ui-table-row-action-button"
            intent="ghost"
            size="xs"
            width="root-span"
            onClick={() => openTraceDetailDrawer(row)}
          >
            {row.name}
          </HzTableRowActionButton>
          {row.name !== '-' ? (
            <HzButton
              type="button"
              size="xs"
              intent="ghost"
              data-trace-manage-table-operation-filter-action={row.name}
              data-trace-manage-table-operation-filter-owner="hertzbeat-ui-button"
              aria-label={t('trace.manage.route.table.operation-filter-action.aria', { operation: row.name })}
              onClick={() => applyTraceQuickFilter('operationName', row.name)}
              className="min-w-0 justify-start truncate font-mono"
            >
              <HzButtonIcon icon={Filter} data-trace-manage-table-operation-filter-action-icon="filter" data-trace-manage-table-operation-filter-action-icon-owner="hertzbeat-ui-button-icon" />
              {t('trace.manage.route.query.operation')}
            </HzButton>
          ) : null}
        </HzActionGroup>
      )
    },
    {
      key: 'duration',
      header: t('trace.manage.route.table.header.duration'),
      render: (row: TraceExplorerRow) => row.durationMs ? (
        <HzButton
          type="button"
          size="xs"
          intent="ghost"
          data-trace-manage-table-duration-filter-action={row.durationMs}
          data-trace-manage-table-duration-filter-owner="hertzbeat-ui-button"
          aria-label={t('trace.manage.route.table.duration-filter-action.aria', { duration: row.durationMs })}
          onClick={() => applyTraceRowDurationFilter(row.durationMs)}
          className="min-w-0 justify-start"
        >
          <HzDataCellText
            data-trace-manage-duration-cell-owner="hertzbeat-ui-data-cell-text"
            variant="value"
          >
            {row.duration}
          </HzDataCellText>
        </HzButton>
      ) : (
        <HzDataCellText
          data-trace-manage-duration-cell-owner="hertzbeat-ui-data-cell-text"
          variant="value"
        >
          {row.duration}
        </HzDataCellText>
      )
    },
    {
      key: 'status',
      header: t('trace.manage.route.table.header.status'),
      render: (row: TraceExplorerRow) => row.status.toUpperCase().includes('ERROR') ? (
        <HzButton
          type="button"
          size="xs"
          intent="ghost"
          data-trace-manage-table-status-filter-action={row.status}
          data-trace-manage-table-status-filter-owner="hertzbeat-ui-button"
          aria-label={t('trace.manage.route.table.status-filter-action.aria', { status: row.status })}
          onClick={applyTraceRowErrorFilter}
          className="min-w-0 justify-start"
        >
          <HzStatusBadge
            data-trace-manage-status-tone={row.statusTone ?? 'neutral'}
            data-trace-manage-status-badge-owner="hertzbeat-ui-status-badge"
            tone={traceStatusBadgeTone(row.statusTone)}
          >
            {row.status}
          </HzStatusBadge>
        </HzButton>
      ) : (
        <HzStatusBadge
          data-trace-manage-status-tone={row.statusTone ?? 'neutral'}
          data-trace-manage-status-badge-owner="hertzbeat-ui-status-badge"
          tone={traceStatusBadgeTone(row.statusTone)}
        >
          {row.status}
        </HzStatusBadge>
      )
    },
    {
      key: 'trace-id',
      header: t('trace.manage.route.table.header.trace-id'),
      render: (row: TraceExplorerRow) => hasNavigationId(row.traceId) ? (
        <HzButton
          type="button"
          size="xs"
          intent="ghost"
          data-trace-manage-table-trace-id-filter-action={row.traceId}
          data-trace-manage-table-trace-id-filter-owner="hertzbeat-ui-button"
          aria-label={t('trace.manage.route.table.trace-id-filter-action.aria', { traceId: row.traceId })}
          onClick={() => applyTraceRowTraceIdFilter(row.traceId)}
          className="min-w-0 justify-start"
        >
          <HzDataCellText
            data-trace-manage-trace-id-cell-owner="hertzbeat-ui-data-cell-text"
            variant="identifier"
            display="block"
            width="trace-id"
          >
            {row.traceId}
          </HzDataCellText>
        </HzButton>
      ) : (
        <HzDataCellText
          data-trace-manage-trace-id-cell-owner="hertzbeat-ui-data-cell-text"
          variant="identifier"
          display="block"
          width="trace-id"
        >
          {row.traceId}
        </HzDataCellText>
      )
    }
  ].filter(column => visibleTraceColumnSet.has(column.key as TraceTableColumnKey));

  useEffect(() => {
    if (!requestedTraceId || traceDetailDrawer.open) return;
    const traceRow = rows.find(row => row.traceId === requestedTraceId) || (selectedTrace.traceId === requestedTraceId ? selectedTrace : null);
    if (!traceRow || !hasNavigationId(traceRow.traceId)) return;

    const autoOpenKey = `${traceRow.traceId}:${requestedSpanId || traceRow.rootSpanId || ''}`;
    if (autoOpenedTraceDetailKeyRef.current === autoOpenKey) return;

    autoOpenedTraceDetailKeyRef.current = autoOpenKey;
    void openTraceDetailDrawer(traceRow, requestedSpanId);
  }, [openTraceDetailDrawer, requestedSpanId, requestedTraceId, rows, selectedTrace, traceDetailDrawer.open]);

  return (
    <HzSignalWorkbenchShell
      data-trace-manage-route="otlp-hertzbeat-ui-trace-workbench"
      data-trace-manage-style-baseline="hertzbeat-ui-matte"
      data-trace-manage-shell-owner="hertzbeat-ui-signal-workbench-shell"
      data-trace-manage-shell-chrome="topology-workbench"
      layout="topology-workbench"
    >
        <HzPanelSurface
          data-trace-manage-header="hertzbeat-ui-compact-header"
          data-trace-manage-panel-surface="header"
          data-trace-manage-header-padding-owner="hertzbeat-ui-panel-surface"
          padding="header"
        >
          <HzWorkbenchLayout
            as="div"
            variant="header-actions"
            data-trace-manage-header-layout="shared-header-actions"
            data-trace-manage-header-layout-owner="hertzbeat-ui-workbench-layout"
          >
            <HzWorkbenchHeaderCopy
              data-trace-manage-header-copy="shared-workbench-header-copy"
              data-trace-manage-header-copy-owner="hertzbeat-ui-workbench-header-copy"
              eyebrow={t('trace.manage.route.kicker')}
              title={t('trace.manage.route.title')}
              copy={t('trace.manage.route.subtitle')}
            />
            <HzWorkbenchLayout
              as="div"
              variant="time-toolbar"
              data-trace-manage-time-toolbar="top-right-corner"
              data-trace-manage-time-toolbar-owner="hertzbeat-ui-workbench-layout"
            >
              <HzControlStack
                layout="end-inline"
                data-trace-manage-time-control="shared-time-context-control"
                data-trace-manage-time-control-owner="hertzbeat-ui-control-stack"
                data-trace-manage-time-control-placement="top-right"
                data-trace-manage-time-control-visual="narrow-top-right-rail"
                data-trace-manage-time-control-fit="no-clipping"
              >
                <TimeRangeControl
                  value={timeContext}
                  labels={buildTimeRangeControlLabels(t)}
                  onApply={applyTimeContext}
                  onRefresh={() => applyTimeContext(timeContext)}
                  onReset={() => applyTimeContext({ timeRange: 'last-30m', refresh: timeContext.refresh, live: 'false', tz: timeContext.tz })}
                  showAbsoluteFields
                  variant="narrow-rail"
                  data-trace-manage-time-range-control-owner="hertzbeat-shared-time-range-control"
                  presetSelectProps={{ 'data-trace-manage-time-range-select': 'true' }}
                  presetOptionDataAttribute="data-trace-manage-time-range-preset"
                  refreshActionProps={{ 'data-trace-manage-time-refresh-action': 'true' }}
                />
              </HzControlStack>
              <HzActionGroup
                data-trace-manage-action-row="hertzbeat-ui-workbench-actions"
                data-trace-manage-action-row-owner="hertzbeat-ui-action-group"
                data-trace-manage-action-row-layout-owner="hertzbeat-ui-action-group"
                layout="full-end"
              >
                {routeContext.returnTo ? (
                  <HzButtonLink component={Link} data-trace-manage-return-action="true" href={routeContext.returnTo} size="md" data-trace-manage-header-action="return-source">
                    <HzButtonIcon
                      icon={Workflow}
                      data-trace-manage-header-action-icon="return-source"
                      data-trace-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                    />
                    {t('trace.manage.route.action.return-source')}
                  </HzButtonLink>
                ) : null}
                <HzButtonLink component={Link} href={handoffLinks.intakeHref} size="md" data-trace-manage-header-action="intake">
                  <HzButtonIcon
                    icon={Workflow}
                    data-trace-manage-header-action-icon="intake"
                    data-trace-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('trace.manage.route.action.intake')}
                </HzButtonLink>
                <HzButtonLink component={Link} href="/setting/collector" size="md" data-trace-manage-header-action="collector">
                  <HzButtonIcon
                    icon={Server}
                    data-trace-manage-header-action-icon="collector"
                    data-trace-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('trace.manage.route.action.collectors')}
                </HzButtonLink>
                {canOpenEntity ? (
                  <HzButtonLink component={Link} href={handoffLinks.entityHref} size="md" data-trace-manage-header-action="entity">
                    <HzButtonIcon
                      icon={Workflow}
                      data-trace-manage-header-action-icon="entity"
                      data-trace-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                    />
                    {t('trace.manage.route.action.entity')}
                  </HzButtonLink>
                ) : (
                  <HzDisabledActionShell
                    title={missingEntityHandoffTitle}
                    data-trace-manage-disabled-action-owner="hertzbeat-ui-disabled-action-shell"
                    data-trace-manage-disabled-action="entity"
                    data-trace-manage-disabled-action-scope="header"
                  >
                    <HzButton
                      data-trace-manage-entity-action-disabled="missing-entity-id"
                      size="md"
                      disabled
                      title={missingEntityHandoffTitle}
                      aria-label={missingEntityHandoffTitle}
                    >
                      <HzButtonIcon
                        icon={Workflow}
                        data-trace-manage-header-action-icon="entity"
                        data-trace-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                      />
                      {t('trace.manage.route.action.entity')}
                    </HzButton>
                  </HzDisabledActionShell>
                )}
                <HzButtonLink component={Link} href={handoffLinks.alertHandlingHref} size="md" data-trace-manage-header-action="alerts">
                  <HzButtonIcon
                    icon={BellRing}
                    data-trace-manage-header-action-icon="alerts"
                    data-trace-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('trace.manage.route.action.alerts')}
                </HzButtonLink>
                <HzButtonLink component={Link} href={handoffLinks.alertRulesHref} size="md" data-trace-manage-header-action="create-alert">
                  <HzButtonIcon
                    icon={BellPlus}
                    data-trace-manage-header-action-icon="create-alert"
                    data-trace-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('explorer.actions.create-alert')}
                </HzButtonLink>
                <HzButtonLink component={Link} href={handoffLinks.dashboardHref} size="md" data-trace-manage-header-action="add-dashboard">
                  <HzButtonIcon
                    icon={BarChart3}
                    data-trace-manage-header-action-icon="add-dashboard"
                    data-trace-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('explorer.actions.add-dashboard')}
                </HzButtonLink>
                <HzButtonLink component={Link} href="/setting/define" size="md" data-trace-manage-header-action="templates">
                  <HzButtonIcon
                    icon={ListChecks}
                    data-trace-manage-header-action-icon="templates"
                    data-trace-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('trace.manage.route.action.templates')}
                </HzButtonLink>
              </HzActionGroup>
            </HzWorkbenchLayout>
          </HzWorkbenchLayout>
        </HzPanelSurface>

        <HzPanelSurface
          data-trace-manage-query-bar="hertzbeat-ui-query-row"
          data-trace-manage-panel-surface="query"
          data-trace-manage-panel-surface-padding-owner="hertzbeat-ui-panel-surface"
          padding="query"
        >
          <HzControlStack
            layout="inline-wrap"
            data-trace-manage-query-control-stack="shared-inline-controls"
            data-trace-manage-query-control-stack-owner="hertzbeat-ui-control-stack"
          >
            <HzSearchFieldFrame
              data-trace-manage-query-search-frame="shared-search-field-frame"
              data-trace-manage-query-search-frame-owner="hertzbeat-ui-search-field-frame"
              icon={(
                <HzSearchFieldIcon
                  icon={Search}
                  data-trace-manage-query-search-icon="service"
                  data-trace-manage-query-search-icon-owner="hertzbeat-ui-search-field-icon"
                />
              )}
            >
              <HzInput
                aria-label={t('trace.manage.route.query.service')}
                placeholder={t('trace.manage.route.query.service')}
                value={draft.serviceName}
                onChange={event => setDraft(updateDraftField('serviceName', event.target.value))}
                inset="search-icon"
                data-trace-manage-service-input="true"
                data-trace-manage-query-search-input-owner="hertzbeat-ui-input"
              />
            </HzSearchFieldFrame>
            <HzQueryTokenField
              width="trace-id"
              aria-label={t('trace.manage.route.query.resource-filter')}
              value={draft.resourceFilter || ''}
              onChange={event => setDraft(updateDraftField('resourceFilter', event.target.value))}
              placeholder={t('trace.manage.route.query.resource-filter')}
              data-trace-manage-resource-filter-input="true"
              fieldProps={{
                'data-trace-manage-query-token-field': 'resource-filter',
                'data-trace-manage-query-token-field-owner': 'hertzbeat-ui-query-token-field',
                'data-trace-manage-resource-filter-input-owner': 'hertzbeat-ui-query-token-field'
              }}
            />
            <HzQueryTokenField
              width="root-span"
              aria-label={t('trace.manage.route.query.operation')}
              value={draft.operationName || ''}
              onChange={event => setDraft(updateDraftField('operationName', event.target.value))}
              placeholder={t('trace.manage.route.query.operation')}
              data-trace-manage-operation-input="true"
              fieldProps={{
                'data-trace-manage-query-token-field': 'operation',
                'data-trace-manage-query-token-field-owner': 'hertzbeat-ui-query-token-field'
              }}
            />
            <HzInput
              aria-label={t('trace.manage.route.query.min-duration')}
              placeholder={t('trace.manage.route.query.min-duration.placeholder')}
              value={draft.minDurationMs || ''}
              onChange={event => setDraft(updateDraftField('minDurationMs', event.target.value))}
              inputMode="numeric"
              width="metrics-query-step"
              data-trace-manage-min-duration-input="true"
              data-trace-manage-duration-input-owner="hertzbeat-ui-input"
            />
            <HzInput
              aria-label={t('trace.manage.route.query.max-duration')}
              placeholder={t('trace.manage.route.query.max-duration.placeholder')}
              value={draft.maxDurationMs || ''}
              onChange={event => setDraft(updateDraftField('maxDurationMs', event.target.value))}
              inputMode="numeric"
              width="metrics-query-step"
              data-trace-manage-max-duration-input="true"
              data-trace-manage-duration-input-owner="hertzbeat-ui-input"
            />
            <HzQueryTokenField
              width="trace-id"
              aria-label={t('trace.manage.route.query.trace-id')}
              value={draft.traceId}
              onChange={event => setDraft(updateDraftField('traceId', event.target.value))}
              placeholder={t('trace.manage.route.query.trace-id')}
              data-trace-manage-trace-id-input="true"
              fieldProps={{
                'data-trace-manage-query-token-field': 'trace-id',
                'data-trace-manage-query-token-field-owner': 'hertzbeat-ui-query-token-field'
              }}
            />
            <HzQueryTokenField
              width="span-id"
              aria-label={t('trace.manage.route.query.span-id')}
              value={draft.spanId}
              onChange={event => setDraft(updateDraftField('spanId', event.target.value))}
              placeholder={t('trace.manage.route.query.span-id')}
              fieldProps={{
                'data-trace-manage-query-token-field': 'span-id',
                'data-trace-manage-query-token-field-owner': 'hertzbeat-ui-query-token-field'
              }}
            />
            <HzQueryStatusSelect
              aria-label={t('trace.manage.route.query.status')}
              value={draft.errorOnly ? 'error' : 'all'}
              onChange={event => setDraft(updateDraftField('errorOnly', event.target.value === 'error'))}
              data-trace-manage-status-filter="true"
              data-trace-manage-query-status-select="shared-query-status-select"
              data-trace-manage-query-status-select-owner="hertzbeat-ui-query-status-select"
              options={[
                { value: 'all', label: t('trace.manage.route.query.status.all') },
                { value: 'error', label: t('trace.manage.route.query.status.error') }
              ]}
            />
            <HzSelect
              aria-label={t('trace.manage.route.query.span-scope')}
              value={draft.spanScope}
              onChange={event => setDraft(updateTraceSpanScope(event.target.value))}
              width="trace-span-scope"
              triggerTone="signal-query"
              data-trace-manage-span-scope-select="shared-span-scope-select"
              data-trace-manage-span-scope-select-owner="hertzbeat-ui-select"
              data-trace-manage-span-scope={draft.spanScope}
              optionDataAttributes={option => ({ 'data-trace-manage-span-scope-option': option.value })}
              options={[
                { value: 'root', label: t('trace.manage.route.query.span-scope.root') },
                { value: 'all', label: t('trace.manage.route.query.span-scope.all') },
                { value: 'entrypoint', label: t('trace.manage.route.query.span-scope.entrypoint') }
              ]}
            />
            <HzSelect
              aria-label={t('trace.manage.route.query.list-page-size')}
              value={draft.listPageSize || DEFAULT_TRACE_LIST_PAGE_SIZE}
              onChange={event => setDraft(updateTraceListPageSize(event.target.value))}
              width="trace-span-scope"
              triggerTone="signal-query"
              data-trace-manage-list-page-size-select="shared-list-page-size-select"
              data-trace-manage-list-page-size-select-owner="hertzbeat-ui-select"
              data-trace-manage-list-page-size={draft.listPageSize || DEFAULT_TRACE_LIST_PAGE_SIZE}
              optionDataAttributes={option => ({ 'data-trace-manage-list-page-size-option': option.value })}
              options={TRACE_LIST_PAGE_SIZE_OPTIONS.map(size => ({
                value: size,
                label: t('trace.manage.route.query.list-page-size.option', { count: Number(size) })
              }))}
            />
            <HzQueryActionGroup
              data-trace-manage-query-action-group="shared-query-action-group"
              data-trace-manage-query-action-group-owner="hertzbeat-ui-query-action-group"
            >
              <HzButton data-trace-manage-search-action="true" intent="primary" size="md" onClick={() => applyQuery()}>
                <HzButtonIcon icon={Play} data-trace-manage-query-action-icon="run" data-trace-manage-query-action-icon-owner="hertzbeat-ui-button-icon" />
                {t('trace.manage.route.query.run')}
              </HzButton>
              <HzButton data-trace-manage-reset-action="true" intent="secondary" size="md" onClick={resetQuery}>
                <HzButtonIcon icon={RotateCcw} data-trace-manage-query-action-icon="reset" data-trace-manage-query-action-icon-owner="hertzbeat-ui-button-icon" />
                {t('trace.manage.route.query.reset')}
              </HzButton>
            </HzQueryActionGroup>
          </HzControlStack>
          <HzControlStack
            layout="inline-wrap"
            spacing="top-2"
            data-trace-manage-quick-filter-controls="traces-quick-filters"
            data-trace-manage-quick-filter-controls-owner="hertzbeat-ui-control-stack"
          >
            <HzButton
              data-trace-manage-quick-filter="status"
              data-trace-manage-quick-filter-owner="hertzbeat-ui-button"
              data-trace-manage-quick-filter-value="error"
              data-trace-manage-quick-filter-active={draft.errorOnly}
              intent={draft.errorOnly ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => applyTraceQuickFilter('errorOnly')}
            >
              {t('trace.manage.route.query.status')}: {t('trace.manage.route.query.status.error')}
            </HzButton>
            {serviceQuickFilterValues.map(serviceName => (
              <HzButton
                key={`service-${serviceName}`}
                data-trace-manage-quick-filter="serviceName"
                data-trace-manage-quick-filter-owner="hertzbeat-ui-button"
                data-trace-manage-quick-filter-value={serviceName}
                data-trace-manage-quick-filter-active={draft.serviceName === serviceName}
                intent={draft.serviceName === serviceName ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => applyTraceQuickFilter('serviceName', serviceName)}
              >
                {t('trace.manage.route.query.service')}: {serviceName}
              </HzButton>
            ))}
            {operationQuickFilterValues.map(operationName => (
              <HzButton
                key={`operation-${operationName}`}
                data-trace-manage-quick-filter="operationName"
                data-trace-manage-quick-filter-owner="hertzbeat-ui-button"
                data-trace-manage-quick-filter-value={operationName}
                data-trace-manage-quick-filter-active={draft.operationName === operationName}
                intent={draft.operationName === operationName ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => applyTraceQuickFilter('operationName', operationName)}
              >
                {t('trace.manage.route.query.operation')}: {operationName}
              </HzButton>
            ))}
            {minDurationQuickFilterValues.map(durationMs => (
              <HzButton
                key={`min-duration-${durationMs}`}
                data-trace-manage-quick-filter="minDurationMs"
                data-trace-manage-quick-filter-owner="hertzbeat-ui-button"
                data-trace-manage-quick-filter-value={durationMs}
                data-trace-manage-quick-filter-active={draft.minDurationMs === durationMs}
                intent={draft.minDurationMs === durationMs ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => applyTraceQuickFilter('minDurationMs', durationMs)}
              >
                {t('trace.manage.route.query.min-duration')}: {durationMs}ms
              </HzButton>
            ))}
            {traceIdQuickFilterValues.map(traceId => (
              <HzButton
                key={`trace-${traceId}`}
                data-trace-manage-quick-filter="traceId"
                data-trace-manage-quick-filter-owner="hertzbeat-ui-button"
                data-trace-manage-quick-filter-value={traceId}
                data-trace-manage-quick-filter-active={draft.traceId === traceId}
                intent={draft.traceId === traceId ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => applyTraceQuickFilter('traceId', traceId)}
              >
                {t('trace.manage.route.query.trace-id')}: {traceId}
              </HzButton>
            ))}
          </HzControlStack>
        </HzPanelSurface>

        <HzPanelSurface
          data-trace-manage-view-switch="explorer-views"
          data-trace-manage-panel-surface="view-switch"
          data-trace-manage-view-switch-panel-surface-owner="hertzbeat-ui-panel-surface"
          padding="view-switch"
        >
          <HzWorkbenchLayout
            as="div"
            variant="view-switch"
            data-trace-manage-view-switch-layout="shared-view-switch"
            data-trace-manage-view-switch-layout-owner="hertzbeat-ui-workbench-layout"
          >
            <div className="text-[12px] font-semibold text-[#8792a5]">{t('trace.manage.view-switch.title')}</div>
            <HzActionGroup
              layout="end-wrap"
              data-trace-manage-view-toggle-group="shared-action-group"
              data-trace-manage-view-toggle-group-owner="hertzbeat-ui-action-group"
            >
              <HzButton
                data-trace-manage-view-toggle-control="shared-hz-button"
                data-trace-manage-view-option="list"
                data-trace-manage-view-active={currentView === 'list'}
                aria-pressed={currentView === 'list'}
                intent={currentView === 'list' ? 'primary' : 'secondary'}
                size="md"
                onClick={() => switchView('list')}
              >
                <ScrollText className="h-4 w-4" aria-hidden="true" />
                {t('trace.manage.view.list')}
              </HzButton>
              <HzButton
                data-trace-manage-view-toggle-control="shared-hz-button"
                data-trace-manage-view-option="trace"
                data-trace-manage-view-active={currentView === 'trace'}
                aria-pressed={currentView === 'trace'}
                intent={currentView === 'trace' ? 'primary' : 'secondary'}
                size="md"
                onClick={() => switchView('trace')}
              >
                <Timer className="h-4 w-4" aria-hidden="true" />
                {t('trace.manage.view.trace')}
              </HzButton>
              <HzButton
                data-trace-manage-view-toggle-control="shared-hz-button"
                data-trace-manage-view-option="time-series"
                data-trace-manage-view-active={currentView === 'time-series'}
                aria-pressed={currentView === 'time-series'}
                intent={currentView === 'time-series' ? 'primary' : 'secondary'}
                size="md"
                onClick={() => switchView('time-series')}
              >
                <BarChart3 className="h-4 w-4" aria-hidden="true" />
                {t('trace.manage.view.time-series')}
              </HzButton>
              <HzButton
                data-trace-manage-view-toggle-control="shared-hz-button"
                data-trace-manage-view-option="table"
                data-trace-manage-view-active={currentView === 'table'}
                aria-pressed={currentView === 'table'}
                intent={currentView === 'table' ? 'primary' : 'secondary'}
                size="md"
                onClick={() => switchView('table')}
              >
                <ListChecks className="h-4 w-4" aria-hidden="true" />
                {t('trace.manage.view.table')}
              </HzButton>
            </HzActionGroup>
          </HzWorkbenchLayout>
        </HzPanelSurface>

        <HzPanelSurface
          data-trace-manage-saved-views="route-query-views"
          data-trace-manage-saved-views-owner="hertzbeat-ui-panel-surface"
          padding="view-switch"
          variant="view-switch"
        >
          <HzWorkbenchLayout
            as="div"
            variant="view-switch"
            data-trace-manage-saved-view-layout="shared-view-switch"
            data-trace-manage-saved-view-layout-owner="hertzbeat-ui-workbench-layout"
          >
            <div className="min-w-[128px] text-[12px] font-semibold text-[#8792a5]">{t('trace.manage.saved-view.title')}</div>
            <HzActionGroup
              layout="end-wrap"
              data-trace-manage-saved-view-action-group="shared-action-group"
              data-trace-manage-saved-view-action-group-owner="hertzbeat-ui-action-group"
            >
              <HzButton
                type="button"
                intent="secondary"
                size="md"
                onClick={saveCurrentTraceQueryView}
                data-trace-manage-saved-view-action="save-current"
                data-trace-manage-saved-view-action-owner="hertzbeat-ui-button"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {t('trace.manage.saved-view.save-current')}
              </HzButton>
              <HzButton
                type="button"
                intent="secondary"
                size="md"
                title={t('trace.manage.saved-view.copy-current')}
                aria-label={t('trace.manage.saved-view.copy-current')}
                onClick={copyCurrentTraceQueryView}
                data-trace-manage-saved-view-copy-action="current"
                data-trace-manage-saved-view-copy-owner="hertzbeat-ui-button"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
              </HzButton>
              {savedQueryViews.length ? (
                savedQueryViews.map(view => {
                  const active = view.route === currentTraceReturnHref;
                  const editing = editingSavedQueryViewId === view.id;
                  return (
                    <React.Fragment key={view.id}>
                      {editing ? (
                        <>
                          <HzInput
                            value={savedQueryViewLabelDraft}
                            onChange={event => setSavedQueryViewLabelDraft(event.target.value)}
                            onInput={event => setSavedQueryViewLabelDraft(event.currentTarget.value)}
                            aria-label={t('trace.manage.saved-view.rename-label')}
                            data-trace-manage-saved-view-rename-input={view.id}
                            data-trace-manage-saved-view-rename-input-owner="hertzbeat-ui-input"
                          />
                          <HzButton
                            type="button"
                            intent="primary"
                            size="md"
                            title={t('trace.manage.saved-view.rename-save')}
                            aria-label={t('trace.manage.saved-view.rename-save')}
                            data-trace-manage-saved-view-rename-save-action={view.id}
                            data-trace-manage-saved-view-rename-save-owner="hertzbeat-ui-button"
                            onClick={() => saveRenameTraceSavedQueryView(view.id)}
                          >
                            <Check className="h-4 w-4" aria-hidden="true" />
                          </HzButton>
                          <HzButton
                            type="button"
                            intent="secondary"
                            size="md"
                            title={t('trace.manage.saved-view.rename-cancel')}
                            aria-label={t('trace.manage.saved-view.rename-cancel')}
                            data-trace-manage-saved-view-rename-cancel-action={view.id}
                            data-trace-manage-saved-view-rename-cancel-owner="hertzbeat-ui-button"
                            onClick={cancelRenameTraceSavedQueryView}
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
                            data-trace-manage-saved-view-select-action={view.id}
                            data-trace-manage-saved-view-select-owner="hertzbeat-ui-button"
                            data-trace-manage-saved-view-active={active ? 'true' : 'false'}
                            onClick={() => restoreSavedViewRoute(view.route)}
                          >
                            <ListChecks className="h-4 w-4" aria-hidden="true" />
                            <span className="min-w-0 truncate">{view.label}</span>
                          </HzButton>
                          <HzButton
                            type="button"
                            intent="secondary"
                            size="md"
                            title={t('trace.manage.saved-view.rename')}
                            aria-label={t('trace.manage.saved-view.rename')}
                            data-trace-manage-saved-view-rename-action={view.id}
                            data-trace-manage-saved-view-rename-owner="hertzbeat-ui-button"
                            onClick={() => startRenameTraceSavedQueryView(view)}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </HzButton>
                          <HzButton
                            type="button"
                            intent="secondary"
                            size="md"
                            title={t('trace.manage.saved-view.update')}
                            aria-label={t('trace.manage.saved-view.update')}
                            data-trace-manage-saved-view-update-action={view.id}
                            data-trace-manage-saved-view-update-owner="hertzbeat-ui-button"
                            onClick={() => updateTraceSavedQueryView(view.id)}
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
                        data-trace-manage-saved-view-delete-action={view.id}
                        data-trace-manage-saved-view-delete-owner="hertzbeat-ui-button"
                        onClick={() => deleteTraceSavedQueryView(view.id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </HzButton>
                    </React.Fragment>
                  );
                })
              ) : (
                <span
                  className="min-w-0 truncate text-[12px] text-[#727b8c]"
                  data-trace-manage-saved-view-empty="local-route-snapshots"
                >
                  {t('trace.manage.saved-view.empty')}
                </span>
              )}
            </HzActionGroup>
          </HzWorkbenchLayout>
        </HzPanelSurface>

        {data.loadStatus?.state === 'degraded' ? (
          <HzStateNotice
            data-trace-manage-api-degraded="true"
            data-trace-manage-api-degraded-owner="hertzbeat-ui-state-notice"
            tone="warning"
            title={t('trace.manage.api.degraded.title')}
            description={t('trace.manage.api.degraded.copy')}
            meta={data.loadStatus.message}
          />
        ) : null}

        {showsTraceTimeSeries ? (
        <HzPanelSurface
          data-trace-manage-chart-band="hertzbeat-ui-chart-band"
          data-trace-manage-panel-surface="chart"
          data-trace-manage-explorer-view="time-series"
          data-trace-manage-explorer-view-owner="hertzbeat-ui-signal-time-series"
          data-trace-manage-chart-padding-owner="hertzbeat-ui-panel-surface"
          padding="chart"
        >
          <HzWorkbenchLayout
            as="div"
            variant="chart-stack"
            data-trace-manage-chart-layout="shared-summary-trend"
            data-trace-manage-chart-layout-owner="hertzbeat-ui-workbench-layout"
          >
            <HzSignalSummaryStrip
              data-trace-manage-summary-strip="inline-signal-summary"
              data-trace-manage-summary-strip-owner="hertzbeat-ui-signal-summary-strip"
              items={[
                { id: 'total', label: t('trace.manage.route.stat.total'), value: data.overview.totalTraceCount ?? 0 },
                {
                  id: 'errors',
                  label: t('trace.manage.route.stat.errors'),
                  value: data.overview.errorTraceCount ?? 0,
                  tone: (data.overview.errorTraceCount ?? 0) > 0 ? 'critical' : 'neutral'
                },
                { id: 'list-count', label: t('trace.manage.route.stat.list-count'), value: rows.length },
                { id: 'latest', label: t('trace.manage.route.stat.latest'), value: latestObservedAt }
              ]}
            />
            <HzSignalTrendBars
              data-trace-manage-signal-trend-owner="hertzbeat-ui-signal-trend-bars"
              title={t('trace.manage.route.chart.title')}
              meta={t('trace.manage.route.chart.latest-window')}
              bars={chartRows.map((row, index) => {
                const isError = row.status.toUpperCase().includes('ERROR');
                return {
                  id: `${row.key}-${index}`,
                  label: row.service,
                  value: Math.max(1, chartRows.length - index),
                  tone: isError ? ('critical' as const) : ('info' as const),
                  title: `${row.service} ${row.duration}`
                };
              })}
            />
          </HzWorkbenchLayout>
        </HzPanelSurface>
        ) : null}

        {showsTraceTable && activeGroupBy ? (
          <HzPanelSurface
            data-trace-manage-group-panel="hertzbeat-ui-trace-group-results"
            data-trace-manage-group-panel-owner="hertzbeat-ui-panel-surface"
            data-trace-manage-group-by={activeGroupBy}
            padding="query"
          >
            <HzPanelHeader
              data-trace-manage-group-header-owner="hertzbeat-ui-panel-header"
              title={t('trace.manage.group.title')}
              subtitle={t('trace.manage.group.meta', { groupBy: activeGroupBy })}
              meta={(
                <HzStatusBadge
                  data-trace-manage-group-count-badge-owner="hertzbeat-ui-status-badge"
                  data-trace-manage-group-count={traceGroupRows.length}
                  tone="neutral"
                  size="xs"
                >
                  {t('trace.manage.group.count', { count: traceGroupRows.length })}
                </HzStatusBadge>
              )}
            />
            <div className="grid gap-2 px-4 pb-3 sm:grid-cols-[160px_220px_160px]">
              <HzInput
                inputMode="numeric"
                value={draft.groupLimit || ''}
                onChange={event => applyTraceGroupLimit(event.target.value)}
                onInput={event => applyTraceGroupLimit(event.currentTarget.value)}
                placeholder={t('trace.manage.group.limit.placeholder')}
                aria-label={t('trace.manage.group.limit.aria')}
                data-trace-manage-group-limit-input="true"
                data-trace-manage-group-limit-input-owner="hertzbeat-ui-input"
              />
              <HzSelect
                value={draft.groupOrder || 'trace-count-desc'}
                onChange={event => applyTraceGroupOrder(event.target.value)}
                aria-label={t('trace.manage.group.order.aria')}
                data-trace-manage-group-order-select="true"
                data-trace-manage-group-order-select-owner="hertzbeat-ui-select"
                options={[
                  { value: 'trace-count-desc' satisfies TraceGroupOrder, label: t('trace.manage.group.order.trace-count-desc') },
                  { value: 'error-count-desc' satisfies TraceGroupOrder, label: t('trace.manage.group.order.error-count-desc') },
                  { value: 'latency-p95-desc' satisfies TraceGroupOrder, label: t('trace.manage.group.order.latency-p95-desc') }
                ]}
                optionDataAttributes={option => ({
                  'data-trace-manage-group-order-option': option.value
                })}
              />
              <HzInput
                inputMode="numeric"
                value={draft.groupMinCount || ''}
                onChange={event => applyTraceGroupMinCount(event.target.value)}
                onInput={event => applyTraceGroupMinCount(event.currentTarget.value)}
                placeholder={t('trace.manage.group.min-count.placeholder')}
                aria-label={t('trace.manage.group.min-count.aria')}
                data-trace-manage-group-min-count-input="true"
                data-trace-manage-group-min-count-input-owner="hertzbeat-ui-input"
              />
            </div>
            <HzDataTable
              data-trace-manage-group-table="hertzbeat-ui-trace-group-table"
              data-trace-manage-group-table-owner="hertzbeat-ui-data-table"
              variant="embedded"
              rows={traceGroupRows}
              getRowKey={row => `${activeGroupBy}:${row.value}`}
              emptyLabel={(
                <HzEmptyState
                  data-trace-manage-group-empty="true"
                  data-trace-manage-group-empty-owner="hertzbeat-ui-empty-state"
                  title={t('trace.manage.group.empty')}
                  layout="table-panel"
                />
              )}
              columns={[
                {
                  key: 'value',
                  header: t('trace.manage.group.column.value'),
                  render: row => (
                    <HzButton
                      data-trace-manage-group-filter-action={activeGroupBy}
                      data-trace-manage-group-filter-value={row.value}
                      data-trace-manage-group-filter-owner="hertzbeat-ui-button"
                      intent="ghost"
                      size="xs"
                      onClick={() => applyTraceGroupResultFilter(row.value)}
                      className="min-w-0 justify-start truncate font-mono"
                      aria-label={t('trace.manage.group.filter-action.aria', { groupBy: activeGroupBy, value: row.value })}
                    >
                      {row.value}
                    </HzButton>
                  )
                },
                {
                  key: 'traceCount',
                  header: t('trace.manage.group.column.traces'),
                  render: row => (
                    <HzDataCellText data-trace-manage-group-trace-count-owner="hertzbeat-ui-data-cell-text" variant="value">
                      {row.traceCount}
                    </HzDataCellText>
                  )
                },
                {
                  key: 'errorTraceCount',
                  header: t('trace.manage.group.column.errors'),
                  render: row => (
                    <HzDataCellText data-trace-manage-group-error-count-owner="hertzbeat-ui-data-cell-text" variant="value">
                      {row.errorTraceCount}
                    </HzDataCellText>
                  )
                },
                {
                  key: 'latencyAvgMs',
                  header: t('trace.manage.group.column.avg'),
                  render: row => (
                    <HzDataCellText data-trace-manage-group-latency-avg-owner="hertzbeat-ui-data-cell-text" variant="value">
                      {formatTraceGroupLatency(row.latencyAvgMs)}
                    </HzDataCellText>
                  )
                },
                {
                  key: 'latencyP95Ms',
                  header: t('trace.manage.group.column.p95'),
                  render: row => (
                    <HzDataCellText data-trace-manage-group-latency-p95-owner="hertzbeat-ui-data-cell-text" variant="value">
                      {formatTraceGroupLatency(row.latencyP95Ms)}
                    </HzDataCellText>
                  )
                }
              ]}
            />
          </HzPanelSurface>
        ) : null}

        {showsTraceTable ? (
        <HzWorkbenchLayout
          variant="table-detail"
          data-trace-manage-table-detail-layout="shared-table-detail"
          data-trace-manage-table-detail-layout-owner="hertzbeat-ui-workbench-layout"
        >
          <HzPanelSurface
            data-trace-manage-trace-table="hertzbeat-ui-dense-trace-list"
            data-trace-manage-span-scope={draft.spanScope}
            data-trace-manage-span-scope-contract="trace-list-api-span-scope"
            data-trace-manage-panel-surface="table"
            data-trace-manage-panel-surface-clip-owner="hertzbeat-ui-panel-surface"
            data-trace-manage-row-control-owner="shared-hz-button"
            clip
          >
            <HzPanelHeader
              data-trace-manage-table-header-owner="hertzbeat-ui-panel-header"
              title={t('trace.manage.route.table.title')}
              subtitle={t('trace.manage.route.table.subtitle')}
              meta={(
                <HzStatusBadge
                  data-trace-manage-table-count-badge-owner="hertzbeat-ui-status-badge"
                  data-trace-manage-table-count={rows.length}
                  tone="neutral"
                  size="xs"
                >
                  {t('trace.manage.route.table.count', { count: rows.length })}
                </HzStatusBadge>
              )}
            />
            <HzControlStack
              layout="inline-wrap"
              spacing="top-2"
              data-trace-manage-list-pagination="shared-list-pagination"
              data-trace-manage-list-pagination-owner="hertzbeat-ui-control-stack"
              data-trace-manage-list-page-index={listPageIndex}
              data-trace-manage-list-page-size={listPageSize}
              data-trace-manage-list-total-elements={listTotalElements}
            >
              <HzDataCellText data-trace-manage-list-page-range-owner="hertzbeat-ui-data-cell-text" tone="muted">
                {t('trace.manage.route.table.pagination.range', {
                  start: listPageStart,
                  end: listPageEnd,
                  total: listTotalElements
                })}
              </HzDataCellText>
              <HzButton
                intent="secondary"
                size="sm"
                disabled={!hasPreviousListPage}
                onClick={() => applyTraceListPageIndex(listPageIndex - 1)}
                data-trace-manage-list-prev-page="true"
                data-trace-manage-list-prev-page-owner="hertzbeat-ui-button"
              >
                {t('trace.manage.route.table.pagination.previous')}
              </HzButton>
              <HzButton
                intent="secondary"
                size="sm"
                disabled={!hasNextListPage}
                onClick={() => applyTraceListPageIndex(listPageIndex + 1)}
                data-trace-manage-list-next-page="true"
                data-trace-manage-list-next-page-owner="hertzbeat-ui-button"
              >
                {t('trace.manage.route.table.pagination.next')}
              </HzButton>
            </HzControlStack>
            <HzControlStack
              layout="inline-wrap"
              spacing="top-2"
              data-trace-manage-table-column-controls="customize-columns"
              data-trace-manage-table-column-controls-owner="hertzbeat-ui-control-stack"
              data-trace-manage-table-visible-columns={visibleTraceColumns.join(',')}
            >
              <HzSelect
                aria-label={t('trace.manage.list.export-format.aria')}
                value={traceExportFormat}
                onChange={event => setTraceExportFormat(event.target.value === 'jsonl' ? 'jsonl' : 'csv')}
                options={[
                  { value: 'csv' satisfies TraceExportFormat, label: t('trace.manage.list.export-format.csv') },
                  { value: 'jsonl' satisfies TraceExportFormat, label: t('trace.manage.list.export-format.jsonl') }
                ]}
                size="sm"
                data-trace-manage-export-format-select="true"
                data-trace-manage-export-format-owner="hertzbeat-ui-select"
                data-trace-manage-export-format-value={traceExportFormat}
                optionDataAttributes={option => ({
                  'data-trace-manage-export-format-option': option.value
                })}
              />
              <HzSelect
                aria-label={t('trace.manage.list.export-row-limit.aria')}
                value={traceExportRowLimit}
                onChange={event => setTraceExportRowLimit(TRACE_EXPORT_ROW_LIMITS.includes(event.target.value as TraceExportRowLimit) ? event.target.value as TraceExportRowLimit : 'current')}
                options={TRACE_EXPORT_ROW_LIMITS.map(value => ({
                  value,
                  label: value === 'current' ? t('trace.manage.list.export-row-limit.current') : t('trace.manage.list.export-row-limit.option', { count: value })
                }))}
                size="sm"
                data-trace-manage-export-row-limit-select="true"
                data-trace-manage-export-row-limit-owner="hertzbeat-ui-select"
                data-trace-manage-export-row-limit-value={traceExportRowLimit}
                optionDataAttributes={option => ({
                  'data-trace-manage-export-row-limit-option': option.value
                })}
              />
              <HzButton
                type="button"
                intent="secondary"
                size="sm"
                disabled={rows.length === 0}
                onClick={downloadTraceRows}
                data-trace-manage-download-csv-action="current-query"
                data-trace-manage-download-csv-owner="hertzbeat-ui-button"
                data-trace-manage-download-csv-row-count={rows.length}
                data-trace-manage-download-row-limit={traceExportRowLimit}
                data-trace-manage-download-format={traceExportFormat}
                aria-label={t('trace.manage.list.download-csv.aria', { format: traceExportFormat.toUpperCase() })}
              >
                <Download
                  className="h-4 w-4"
                  aria-hidden="true"
                  data-trace-manage-download-csv-icon="download"
                  data-trace-manage-download-csv-icon-owner="hertzbeat-ui-button-icon"
                />
                {t('trace.manage.list.download-csv')}
              </HzButton>
              {traceColumnOptions.map(option => {
                const checked = visibleTraceColumnSet.has(option.key);
                return (
                  <HzCheckbox
                    key={option.key}
                    label={option.label}
                    checked={checked}
                    disabled={option.key === 'start' || (checked && visibleTraceColumns.length === 1)}
                    onChange={event => updateTraceColumns(option.key, event.target.checked)}
                    data-trace-manage-table-column-control="true"
                    data-trace-manage-table-column-control-owner="hertzbeat-ui-checkbox"
                    data-trace-manage-table-column={option.key}
                    data-trace-manage-table-column-required={option.key === 'start' ? 'start' : undefined}
                  />
                );
              })}
            </HzControlStack>
            <HzDataTable
              data-trace-manage-table-chrome-owner="hertzbeat-ui-data-table"
              variant="embedded"
              rows={rows}
              getRowKey={row => row.key}
              selectedRowKey={selectedTrace.key}
              getRowProps={() => ({ 'data-trace-manage-row-detail-action': 'true' })}
              emptyLabel={(
                <HzEmptyState
                  data-trace-manage-empty-guidance="operator-no-data-guidance"
                  data-trace-manage-empty-state-owner="hertzbeat-ui-empty-state"
                  title={t('trace.manage.route.empty.title')}
                  description={t('trace.manage.route.empty.copy')}
                  layout="table-panel"
                />
              )}
              columns={traceTableColumns}
            />
          </HzPanelSurface>

          <HzPanelSurface
            data-trace-manage-detail-panel="hertzbeat-ui-detail-panel"
            data-trace-manage-panel-surface="detail"
            data-trace-manage-panel-surface-clip-owner="hertzbeat-ui-panel-surface"
            clip
          >
            <HzPanelHeader
              data-trace-manage-detail-header-owner="hertzbeat-ui-panel-header"
              eyebrow={t('trace.manage.route.detail.title')}
              title={selectedTrace.name}
              subtitle={activeTraceId}
            />
            <HzWorkbenchLayout
              as="div"
              variant="detail-stack"
              data-trace-manage-detail-body-layout="shared-detail-stack"
              data-trace-manage-detail-body-layout-owner="hertzbeat-ui-workbench-layout"
            >
              <HzDetailRows
                data-trace-manage-detail-facts-owner="hertzbeat-ui-detail-rows"
                rows={[
                  [t('trace.manage.route.detail.service'), selectedTrace.service],
                  [t('trace.manage.route.detail.namespace'), selectedTrace.namespace],
                  [t('trace.manage.route.detail.root-span'), selectedTrace.rootSpanId],
                  [t('trace.manage.route.detail.duration'), selectedTrace.duration]
                ].map(([label, value]) => ({
                  key: String(label),
                  title: label,
                  copy: value
                }))}
              />
              <HzDetailRows
                data-trace-manage-selected-evidence="selected-trace-evidence"
                data-trace-manage-selected-evidence-owner="hertzbeat-ui-detail-rows"
                aria-label={t('trace.manage.route.evidence.aria')}
                heading={t('trace.manage.route.evidence.title')}
                rows={selectedTraceEvidenceRows.map(([label, value, meta]) => ({
                  key: String(label),
                  title: label,
                  copy: value,
                  meta
                }))}
              />
              <HzDetailRows
                data-trace-manage-entity-context="hertzbeat-signal-entity-context"
                data-trace-manage-entity-context-owner="hertzbeat-ui-detail-rows"
                aria-label={t('trace.manage.route.entity-context.aria')}
                heading={t('trace.manage.route.entity-context.title')}
                rows={entityContextRows.map(row => ({
                  key: row.label,
                  title: row.label,
                  copy: row.value,
                  meta: row.meta
                }))}
              />
              <TraceAttributionDiagnostics rows={routeAttributionDiagnostics} />
            </HzWorkbenchLayout>
            <HzWorkbenchLayout
              as="div"
              variant="detail-footer"
              data-trace-manage-detail-footer-layout="shared-detail-footer"
              data-trace-manage-detail-footer-layout-owner="hertzbeat-ui-workbench-layout"
            >
              <HzStateNotice
                data-trace-manage-alert-context-hint="entity-trace-alert-handoff"
                data-trace-manage-handoff-hint-owner="hertzbeat-ui-state-notice"
                title={t('trace.manage.route.handoff.alert-hint')}
                variant="hint"
              />
              <HzStateNotice
                data-trace-manage-signal-handoff-hint="trace-log-metric-context"
                data-trace-manage-handoff-hint-owner="hertzbeat-ui-state-notice"
                title={t('trace.manage.route.handoff.signal-hint')}
                variant="hint"
              />
              {canOpenEntity ? (
                <HzButtonLink component={Link} data-trace-manage-history-detail-action="entity" href={handoffLinks.entityHref} size="md">
                  <HzButtonIcon
                    icon={Workflow}
                    data-trace-manage-detail-footer-action-icon="entity"
                    data-trace-manage-detail-footer-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('trace.manage.route.action.entity')}
                </HzButtonLink>
              ) : (
                <HzDisabledActionShell
                  title={missingEntityHandoffTitle}
                  data-trace-manage-disabled-action-owner="hertzbeat-ui-disabled-action-shell"
                  data-trace-manage-disabled-action="entity"
                  data-trace-manage-disabled-action-scope="detail-footer"
                >
                  <HzButton
                    data-trace-manage-entity-action-disabled="missing-entity-id"
                    data-trace-manage-history-detail-action="entity"
                    size="md"
                    disabled
                    title={missingEntityHandoffTitle}
                    aria-label={missingEntityHandoffTitle}
                  >
                    <HzButtonIcon
                      icon={Workflow}
                      data-trace-manage-detail-footer-action-icon="entity"
                      data-trace-manage-detail-footer-action-icon-owner="hertzbeat-ui-button-icon"
                    />
                    {t('trace.manage.route.action.entity')}
                  </HzButton>
                </HzDisabledActionShell>
              )}
              <HzButtonLink component={Link} data-trace-manage-history-detail-action="alerts" href={handoffLinks.alertHandlingHref} size="md">
                <HzButtonIcon
                  icon={BellRing}
                  data-trace-manage-detail-footer-action-icon="alerts"
                  data-trace-manage-detail-footer-action-icon-owner="hertzbeat-ui-button-icon"
                />
                {t('trace.manage.route.action.alerts')}
              </HzButtonLink>
              {canOpenLogs ? (
                <HzButtonLink
                  component={Link}
                  data-trace-manage-open-logs-action="true"
                  data-trace-manage-history-detail-action="logs"
                  href={handoffLinks.logsHref}
                  size="md"
                >
                  <HzButtonIcon
                    icon={Timer}
                    data-trace-manage-detail-footer-action-icon="logs"
                    data-trace-manage-detail-footer-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('trace.manage.drawer.action.logs')}
                </HzButtonLink>
              ) : (
                <HzDisabledActionShell
                  title={missingTraceHandoffTitle}
                  data-trace-manage-disabled-action-owner="hertzbeat-ui-disabled-action-shell"
                  data-trace-manage-disabled-action="logs"
                  data-trace-manage-disabled-action-scope="detail-footer"
                >
                  <HzButton
                    data-trace-manage-open-logs-action="true"
                    data-trace-manage-open-logs-action-disabled="missing-trace-id"
                    data-trace-manage-history-detail-action="logs"
                    size="md"
                    disabled
                    title={missingTraceHandoffTitle}
                    aria-label={missingTraceHandoffTitle}
                  >
                    <HzButtonIcon
                      icon={Timer}
                      data-trace-manage-detail-footer-action-icon="logs"
                      data-trace-manage-detail-footer-action-icon-owner="hertzbeat-ui-button-icon"
                    />
                    {t('trace.manage.drawer.action.logs')}
                  </HzButton>
                </HzDisabledActionShell>
              )}
              <HzButtonLink component={Link} data-trace-manage-history-detail-action="metrics" href={handoffLinks.metricsHref} size="md">
                <HzButtonIcon
                  icon={BarChart3}
                  data-trace-manage-detail-footer-action-icon="metrics"
                  data-trace-manage-detail-footer-action-icon-owner="hertzbeat-ui-button-icon"
                />
                {t('trace.manage.drawer.action.metrics')}
              </HzButtonLink>
              <HzButtonLink component={Link} data-trace-manage-history-detail-action="entities" href={handoffLinks.entitiesHref} size="md">
                <HzButtonIcon
                  icon={Workflow}
                  data-trace-manage-detail-footer-action-icon="entities"
                  data-trace-manage-detail-footer-action-icon-owner="hertzbeat-ui-button-icon"
                />
                {t('trace.manage.route.action.catalog')}
              </HzButtonLink>
            </HzWorkbenchLayout>
          </HzPanelSurface>
        </HzWorkbenchLayout>
        ) : null}
        <TraceWaterfallDrawer
          state={traceDetailDrawer}
          query={draft}
          routeContext={routeContext}
          currentTraceReturnHref={currentTraceReturnHref}
          onClose={closeTraceDetailDrawer}
          onSelectSpan={spanId => setTraceDetailDrawer(previous => ({ ...previous, selectedSpanId: spanId, selectedEventKey: null }))}
          onSelectEvent={(eventKey, spanId) => setTraceDetailDrawer(previous => ({ ...previous, selectedSpanId: spanId || previous.selectedSpanId, selectedEventKey: eventKey }))}
          onApplyOperationFilter={operationName => applyTraceQuickFilter('operationName', operationName)}
          onApplyResourceFilter={applyTraceResourceFilter}
          onReplaceResourceFilter={replaceTraceResourceFilter}
          onApplyResourceGroupBy={applyTraceResourceGroupBy}
        />
    </HzSignalWorkbenchShell>
  );
}

export default function TraceManagePage({
  initialRouteState
}: {
  initialRouteState?: TraceManageRouteState;
} = {}) {
  const traceManageRouteState = initialRouteState ?? EMPTY_TRACE_MANAGE_ROUTE_STATE;
  const { t } = useI18n();
  const router = useRouter();
  const [draft, setDraft] = useState<TraceQueryState>(() => traceManageRouteState.initialQuery);
  const [query, setQuery] = useState<TraceQueryState>(() => traceManageRouteState.initialQuery);
  const currentView = traceManageRouteState.currentView;
  const routeContext = traceManageRouteState.routeContext;
  const traceTimeContext = useMemo(() => sanitizeTimeContext({
    timeRange: routeContext.timeRange || 'last-30m',
    start: routeContext.start,
    end: routeContext.end,
    refresh: routeContext.refresh,
    live: routeContext.live || 'false',
    tz: routeContext.tz
  }), [routeContext]);
  const traceUrls = useMemo(() => buildTraceUrls(query, routeContext), [query, routeContext]);
  const traceTimeRefreshKey = useMemo(
    () =>
      [
        traceTimeContext.timeRange || '',
        traceTimeContext.start || '',
        traceTimeContext.end || '',
        traceTimeContext.refresh || '',
        traceTimeContext.live || '',
        traceTimeContext.tz || ''
      ].join('|'),
    [traceTimeContext.end, traceTimeContext.live, traceTimeContext.refresh, traceTimeContext.start, traceTimeContext.timeRange, traceTimeContext.tz]
  );
  const loadCacheKey = useMemo(
    () => `trace-manage:${currentView}:${traceUrls.listUrl}|${traceUrls.overviewUrl}|${traceUrls.groupByUrl || 'no-group'}|${traceTimeRefreshKey}`,
    [currentView, traceTimeRefreshKey, traceUrls]
  );

  const load = useCallback(async (): Promise<TraceManageData> => {
    try {
      const [overview, list, group] = await Promise.all([
        apiMessageGetWithTimeout<TraceOverview>(traceUrls.overviewUrl),
        apiMessageGetWithTimeout<PageResult<TraceListItem>>(traceUrls.listUrl),
        traceUrls.groupByUrl ? apiMessageGetWithTimeout<TraceGroupStats>(traceUrls.groupByUrl) : Promise.resolve(null)
      ]);
      return normalizeTraceManageData({ overview, list, group });
    } catch (error) {
      return emptyTraceManageData(describeTraceManageLoadFailure(error));
    }
  }, [traceUrls]);

  const applyQuery = useCallback((nextQuery: TraceQueryState = draft) => {
    setQuery(nextQuery);
    router.replace(buildTraceManageRoute(routeContext, nextQuery, { view: currentView }));
  }, [currentView, draft, routeContext, router]);

  const applyTraceTimeContext = useCallback((timeContext: TimeContext) => {
    const appliedContext = resolveAppliedTimeContext(timeContext, traceTimeContext);
    router.replace(buildTraceManageRoute(routeContext, query, { view: currentView, timeContext: appliedContext }));
  }, [currentView, query, routeContext, router, traceTimeContext]);

  const resetQuery = useCallback(() => {
    setDraft(emptyTraceQuery);
    setQuery(emptyTraceQuery);
    router.replace(buildResetTraceManageRoute(routeContext, currentView));
  }, [currentView, routeContext, router]);

  const switchView = useCallback((view: TraceExplorerView) => {
    router.replace(buildTraceManageRoute(routeContext, query, { view }));
  }, [query, routeContext, router]);

  useEffect(() => {
    if (traceManageRouteState.shouldCleanUrl) {
      router.replace(buildTraceManageRoute(routeContext, query, { view: currentView }));
    }
  }, [currentView, query, routeContext, router, traceManageRouteState.shouldCleanUrl]);

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('trace.manage.loading')}
      cacheKey={loadCacheKey}
      cacheSettledTtlMs={TRACE_MANAGE_SETTLED_CACHE_TTL_MS}
    >
      {data => (
        <TraceExplorer
          data={data}
          draft={draft}
          setDraft={setDraft}
          applyQuery={applyQuery}
          resetQuery={resetQuery}
          switchView={switchView}
          currentView={currentView}
          routeContext={routeContext}
          timeContext={traceTimeContext}
          applyTimeContext={applyTraceTimeContext}
          restoreSavedViewRoute={route => router.replace(route)}
          currentTraceReturnHref={buildTraceReturnHref(routeContext, query, currentView)}
        />
      )}
    </ClientWorkbench>
  );
}
