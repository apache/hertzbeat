'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Ban, BarChart3, Check, Copy, Download, Filter, Pencil, Play, Replace, RotateCcw, Save, Search, Table2, Trash2, Workflow, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HzActionGroup, HzAssistiveMarker, HzAttributeDiagnostics, HzButton, HzButtonIcon, HzButtonLink, HzChipGroup, HzCollapsibleSection, HzContextHandoff, HzControlStack, HzDataCellStack, HzDataCellText, HzDataMetaText, HzDataTable, HzDetailRows, HzDisabledActionShell, HzEmptyState, HzInput, HzPaginationBar, HzPanelHeader, HzPanelSection, HzPanelSurface, HzPanelTitleLabel, HzQueryActionGroup, HzSearchFieldFrame, HzSearchFieldIcon, HzSelect, HzSignalSummaryStrip, HzSignalWorkbenchShell, HzStateNotice, HzStatusBadge, HzTrendBar, HzTrendFrame, HzWorkbenchHeaderCopy, HzWorkbenchLayout } from '@hertzbeat/ui';
import { EChartsPanel, type EChartsDataZoomRange } from '@/components/observability/echarts-panel';
import { buildTimeRangeControlLabels, buildTimeRangePresetLabels, formatEpochMillisDraft, TimeRangeControl } from '@/components/observability/time-range-control';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { useI18n } from '@/components/providers/i18n-provider';
import { apiMessageGet } from '@/lib/api-client';
import { copyTextToClipboard } from '@/lib/browser-clipboard';
import { formatTime } from '@/lib/format';
import { buildOtlpMetricsConsoleUrl, loadOtlpMetricsConsole, queryStateFromParams, type OtlpMetricsQueryState } from '@/lib/otlp-metrics/controller';
import { buildOtlpMetricsCsv, buildOtlpMetricsExportFilename, buildOtlpMetricsJsonl, type OtlpMetricsExportFormat, type OtlpMetricsExportScope } from '@/lib/otlp-metrics/export';
import {
  createSignalDashboardPanelDraft,
  applySignalDashboardPanelEditContext,
  saveSignalDashboardPanelDraft,
  type SignalDashboardPanelVisualization
} from '@/lib/signal-dashboard-panel-drafts';
import { saveSignalDashboardPanelEditContext } from '@/lib/signal-dashboards';
import {
  buildSignalSavedViewKey,
  deleteSignalSavedQueryView,
  loadSignalSavedQueryViews,
  saveSignalSavedQueryView,
  type SignalSavedQueryView,
  type SignalSavedQueryViewPersistenceMode
} from '@/lib/signal-saved-views';
import { buildSignalEntityContextRows, isDashboardReturnContext, readEntityIdRouteParam, readEpochMillisRouteParam, readSignalPanelEditContext, readSignalRouteContext, type SignalPanelEditContext, type SignalRouteContext } from '@/lib/signal-route-context';
import { resolveTimeContextBounds, sanitizeTimeContext, TIME_CONTEXT_PRESETS, type TimeContext } from '@/lib/time-context';
import {
  buildConsoleFacts,
  buildConsoleMetrics,
  buildContextRows,
  buildMetricSeriesAttributionDiagnostics,
  buildMetricSeriesContextRows,
  buildMetricSeriesEvidenceRows,
  buildMetricSeriesAttributeRows,
  buildMetricSeriesLinkedRecordRows,
  buildMetricSeriesRows,
  buildMetricSeriesSampleRows,
  buildMetricSeriesViews,
  buildMetricInventoryRows,
  applyMetricsFormula,
  buildMetricsChartOption,
  buildMetricsDataZoomTimeContext,
  buildMetricExpectedRangeConfig,
  buildMetricTrendBars,
  buildMetricThresholdConfig,
  buildMetricsExplorerState,
  buildMetricsHandoffLinks,
  type OtlpMetricInventorySort,
  type OtlpMetricSeriesView
} from '@/lib/otlp-metrics/view-model';
import type { OtlpMetricsConsole } from '@/lib/types';
import { buildOtlpMetricsRoute, hasMetricsDisplayReturnLabel } from './route-state';

type OtlpMetricsTranslate = ReturnType<typeof useI18n>['t'];

type MetricsSavedQueryView = SignalSavedQueryView;
type MetricsDashboardPanelDraftState = 'idle' | 'saving' | 'saved' | 'failed';

const METRICS_SAVED_QUERY_VIEW_STORAGE_KEY = 'hertzbeat.otlp-metrics.saved-query-views';
const METRICS_SAVED_QUERY_VIEW_LIMIT = 5;
const METRICS_SAVED_QUERY_VIEW_PERSISTENCE_OWNER: Record<SignalSavedQueryViewPersistenceMode, string> = {
  'server-first': 'hertzbeat-api',
  'local-fallback': 'browser-local-storage'
};
const DEFAULT_METRIC_INVENTORY_PAGE_SIZE = '10';
const DEFAULT_METRIC_INVENTORY_PAGE_INDEX = '0';
const METRIC_INVENTORY_PAGE_SIZE_OPTIONS = ['5', '10', '20', '50'] as const;
const METRICS_EXPORT_SCOPES: OtlpMetricsExportScope[] = ['all', 'selected'];

function resolveMetricInventoryPageSize(value?: string) {
  return METRIC_INVENTORY_PAGE_SIZE_OPTIONS.find(option => option === value) || DEFAULT_METRIC_INVENTORY_PAGE_SIZE;
}

function resolveMetricInventoryPageIndex(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return DEFAULT_METRIC_INVENTORY_PAGE_INDEX;
  return String(Math.max(0, Number(trimmed)));
}

function latestSeriesTimestamp(data: OtlpMetricsConsole) {
  const timestamps = (data.results?.frames || [])
    .flatMap(frame => frame.data || [])
    .map(row => Number(row?.[0]))
    .filter(Number.isFinite);
  return timestamps.length ? Math.max(...timestamps) : data.stats?.latestObservedAt ?? null;
}

function routeEpochMillisValue(value?: string) {
  const epochMillis = readEpochMillisRouteParam(value);
  return epochMillis ? Number(epochMillis) : undefined;
}

function routeEntityIdValue(value?: string) {
  const entityId = readEntityIdRouteParam(value);
  return entityId ? Number(entityId) : undefined;
}

function firstRouteText(...values: Array<string | null | undefined>) {
  return values.find((value): value is string => value != null && value.trim() !== '')?.trim();
}

function escapeMetricFilterValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildMetricAttributeFilterExpression(name: string, value: string) {
  const trimmedName = name.trim();
  const trimmedValue = value.trim();
  if (!trimmedName || !trimmedValue) return null;
  return `${trimmedName}="${escapeMetricFilterValue(trimmedValue)}"`;
}

function buildMetricAttributeExcludeFilterExpression(name: string, value: string) {
  const trimmedName = name.trim();
  const trimmedValue = value.trim();
  if (!trimmedName || !trimmedValue) return null;
  return `${trimmedName}!="${escapeMetricFilterValue(trimmedValue)}"`;
}

function buildMetricAttributeExistsFilterExpression(name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) return null;
  return `${trimmedName} EXISTS`;
}

function buildMetricAttributeNotExistsFilterExpression(name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) return null;
  return `${trimmedName} NOT EXISTS`;
}

function mergeMetricFilterExpression(currentFilter: string, expression: string) {
  const trimmedFilter = currentFilter.trim();
  if (!trimmedFilter) return expression;
  const compactFilter = trimmedFilter.replace(/\s+/g, '');
  const compactExpression = expression.replace(/\s+/g, '');
  if (compactFilter.includes(compactExpression)) {
    return trimmedFilter;
  }
  return `${trimmedFilter} and ${expression}`;
}

function normalizeMetricGroupByLabel(label: string) {
  const normalized = label
    .trim()
    .replace(/[^A-Za-z0-9_:]/g, '_')
    .replace(/_+/g, '_');
  if (!normalized) return null;
  return /^\d/.test(normalized) ? `_${normalized}` : normalized;
}

function metricGroupByLabelCandidates(groupBy: string) {
  const normalized = groupBy.trim();
  if (!normalized) return [];
  const candidates = [normalized];
  if (normalized === 'service_name') {
    candidates.push('service.name');
  } else if (normalized === 'service_namespace') {
    candidates.push('service.namespace');
  } else if (normalized === 'deployment_environment_name') {
    candidates.push('deployment.environment.name');
  }
  return candidates;
}

function buildMetricGroupValueFilter(groupBy: string, series?: OtlpMetricSeriesView | null) {
  const normalizedGroupBy = groupBy.trim();
  if (!normalizedGroupBy || !series) return null;
  const value = firstRouteText(...metricGroupByLabelCandidates(normalizedGroupBy).map(candidate => series.labels[candidate]));
  if (!value) return null;
  const expression = buildMetricAttributeFilterExpression(normalizedGroupBy, value);
  if (!expression) return null;
  return { groupBy: normalizedGroupBy, value, expression };
}

function buildMetricSeriesServiceFilter(series?: OtlpMetricSeriesView | null) {
  if (!series) return null;
  const value = firstRouteText(series.labels['service.name'], series.labels.service_name, series.labels.serviceName);
  return value ? { value } : null;
}

function readMetricSeriesLabel(series: OtlpMetricSeriesView, ...keys: string[]) {
  return firstRouteText(...keys.map(key => series.labels[key]));
}

function findMetricSeriesForRouteTrace(
  seriesList: OtlpMetricSeriesView[],
  query: OtlpMetricsQueryState,
  routeContext: SignalRouteContext
) {
  const traceId = firstRouteText(query.traceId, routeContext.traceId);
  const spanId = firstRouteText(query.spanId, routeContext.spanId);
  if (!traceId) return null;
  return seriesList.find(series => {
    const seriesTraceId = readMetricSeriesLabel(series, 'traceId', 'trace_id', 'trace.id', 'trace_id_hex');
    const seriesSpanId = readMetricSeriesLabel(series, 'spanId', 'span_id', 'span.id', 'span_id_hex');
    if (seriesTraceId !== traceId) return false;
    return spanId ? seriesSpanId === spanId : true;
  }) || null;
}

function buildMetricSeriesRouteContext(series: OtlpMetricSeriesView): Partial<OtlpMetricsQueryState> {
  return {
    entityId: readEntityIdRouteParam(readMetricSeriesLabel(series, 'hertzbeat.entity_id', 'hertzbeat_entity_id', 'entity.id', 'entity_id')),
    entityName: readMetricSeriesLabel(series, 'hertzbeat.entity_name', 'hertzbeat_entity_name', 'entity.name', 'entity_name'),
    serviceName: readMetricSeriesLabel(series, 'service.name', 'service_name', 'serviceName'),
    serviceNamespace: readMetricSeriesLabel(series, 'service.namespace', 'service_namespace', 'serviceNamespace'),
    environment: readMetricSeriesLabel(series, 'deployment.environment.name', 'deployment_environment_name', 'deployment_environment', 'environment'),
    traceId: readMetricSeriesLabel(series, 'traceId', 'trace_id', 'trace.id', 'trace_id_hex'),
    spanId: readMetricSeriesLabel(series, 'spanId', 'span_id', 'span.id', 'span_id_hex'),
    collector: readMetricSeriesLabel(series, 'hertzbeat.collector', 'hertzbeat_collector', 'collector'),
    template: readMetricSeriesLabel(series, 'hertzbeat.template', 'hertzbeat_template', 'hertzbeat.monitor_template', 'hertzbeat_monitor_template', 'template')
  };
}

function isMetricsSavedQueryView(value: unknown): value is MetricsSavedQueryView {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<MetricsSavedQueryView>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.route === 'string' &&
    candidate.route.startsWith('/ingestion/otlp/metrics') &&
    typeof candidate.createdAt === 'number'
  );
}

function readMetricsSavedQueryViews(): MetricsSavedQueryView[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(METRICS_SAVED_QUERY_VIEW_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isMetricsSavedQueryView).slice(0, METRICS_SAVED_QUERY_VIEW_LIMIT) : [];
  } catch {
    return [];
  }
}

function writeMetricsSavedQueryViews(views: MetricsSavedQueryView[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(METRICS_SAVED_QUERY_VIEW_STORAGE_KEY, JSON.stringify(views.slice(0, METRICS_SAVED_QUERY_VIEW_LIMIT)));
  } catch {
    // Ignore quota or privacy-mode failures; the current route remains shareable.
  }
}

function compactMetricsSavedViewValue(value: string | undefined, limit = 32) {
  const trimmed = value?.trim();
  if (!trimmed) return '';
  return trimmed.length > limit ? `${trimmed.slice(0, limit - 1)}...` : trimmed;
}

function buildMetricsSavedViewDescription(query: OtlpMetricsQueryState, routeContext: SignalRouteContext, t: OtlpMetricsTranslate) {
  const serviceName = firstRouteText(query.serviceName, routeContext.serviceName);
  const environment = firstRouteText(query.environment, routeContext.environment);
  const parts = [
    query.query?.trim() ? `${t('otlp.metrics.saved-view.field.query')}: ${compactMetricsSavedViewValue(query.query)}` : '',
    query.filter?.trim() ? `${t('otlp.metrics.saved-view.field.filter')}: ${compactMetricsSavedViewValue(query.filter)}` : '',
    query.aggregation?.trim() ? `${t('otlp.metrics.saved-view.field.aggregation')}: ${compactMetricsSavedViewValue(query.aggregation)}` : '',
    query.temporalAggregation?.trim() ? `${t('otlp.metrics.saved-view.field.temporal')}: ${compactMetricsSavedViewValue(query.temporalAggregation)}` : '',
    query.groupBy?.trim() ? `${t('otlp.metrics.saved-view.field.group-by')}: ${compactMetricsSavedViewValue(query.groupBy)}` : '',
    query.legendFormat?.trim() ? `${t('otlp.metrics.saved-view.field.legend')}: ${compactMetricsSavedViewValue(query.legendFormat)}` : '',
    query.formula?.trim() ? `${t('otlp.metrics.saved-view.field.formula')}: ${compactMetricsSavedViewValue(query.formula)}` : '',
    query.step?.trim() ? `${t('otlp.metrics.saved-view.field.step')}: ${compactMetricsSavedViewValue(query.step)}` : '',
    query.limit?.trim() ? `${t('otlp.metrics.saved-view.field.limit')}: ${compactMetricsSavedViewValue(query.limit)}` : '',
    query.series?.trim() ? `${t('otlp.metrics.saved-view.field.series')}: ${compactMetricsSavedViewValue(query.series)}` : '',
    query.inspector === 'table' ? `${t('otlp.metrics.saved-view.field.inspector')}: ${query.inspector}` : '',
    serviceName ? `${t('otlp.metrics.saved-view.field.service')}: ${compactMetricsSavedViewValue(serviceName)}` : '',
    query.entityId?.trim() ? `${t('otlp.metrics.saved-view.field.entity')}: ${compactMetricsSavedViewValue(query.entityId)}` : '',
    environment ? `${t('otlp.metrics.saved-view.field.environment')}: ${compactMetricsSavedViewValue(environment)}` : '',
    query.warningThreshold?.trim() ? `${t('otlp.metrics.saved-view.field.warning')}: ${compactMetricsSavedViewValue(query.warningThreshold)}` : '',
    query.criticalThreshold?.trim() ? `${t('otlp.metrics.saved-view.field.critical')}: ${compactMetricsSavedViewValue(query.criticalThreshold)}` : '',
    query.expectedRange === 'on' ? `${t('otlp.metrics.saved-view.field.expected-range')}: on` : '',
    query.inventorySearch?.trim() ? `${t('otlp.metrics.saved-view.field.inventory-search')}: ${compactMetricsSavedViewValue(query.inventorySearch)}` : '',
    query.inventorySort?.trim() ? `${t('otlp.metrics.saved-view.field.inventory-sort')}: ${compactMetricsSavedViewValue(query.inventorySort)}` : '',
    query.inventoryPageSize?.trim() ? `${t('otlp.metrics.saved-view.field.inventory-page-size')}: ${compactMetricsSavedViewValue(query.inventoryPageSize)}` : '',
    query.inventoryPageIndex?.trim() ? `${t('otlp.metrics.saved-view.field.inventory-page-index')}: ${compactMetricsSavedViewValue(query.inventoryPageIndex)}` : '',
    query.seriesAttributeSearch?.trim() ? `${t('otlp.metrics.saved-view.field.series-attribute-search')}: ${compactMetricsSavedViewValue(query.seriesAttributeSearch)}` : ''
  ].filter(Boolean);
  return parts.join(' | ') || t('otlp.metrics.saved-view.description.empty');
}

function buildMetricsSavedViewLabel(query: OtlpMetricsQueryState, routeContext: SignalRouteContext, t: OtlpMetricsTranslate) {
  return (
    compactMetricsSavedViewValue(query.query, 42)
    || compactMetricsSavedViewValue(query.series, 42)
    || compactMetricsSavedViewValue(query.serviceName || routeContext.serviceName, 42)
    || compactMetricsSavedViewValue(query.groupBy, 42)
    || t('otlp.metrics.saved-view.current-label')
  );
}

function createMetricsSavedQueryView(
  query: OtlpMetricsQueryState,
  routeContext: SignalRouteContext,
  route: string,
  t: OtlpMetricsTranslate
): MetricsSavedQueryView {
  const now = Date.now();
  return {
    id: buildSignalSavedViewKey('metrics', route),
    label: buildMetricsSavedViewLabel(query, routeContext, t),
    description: buildMetricsSavedViewDescription(query, routeContext, t),
    route,
    createdAt: now
  };
}

function parseRelatedMetricResourceMatch(value: string | undefined) {
  if (!value?.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
    return Object.entries(parsed as Record<string, unknown>)
      .map(([name, rawValue]) => ({ name: name.trim(), value: typeof rawValue === 'string' ? rawValue.trim() : '' }))
      .filter(row => row.name && row.value)
      .sort((left, right) => left.name.localeCompare(right.name));
  } catch {
    return [];
  }
}

function buildRelatedMetricCandidateRows(query: OtlpMetricsQueryState, t: OtlpMetricsTranslate) {
  const matchedLabels = (query.relatedMetricMatchedLabels || '')
    .split(',')
    .map(label => label.trim())
    .filter(Boolean);
  const resourceMatchRows = parseRelatedMetricResourceMatch(query.relatedMetricResourceMatch);
  const rows = [
    query.relatedMetricSource || query.relatedMetricFamily
      ? {
        key: 'candidate-source',
        title: t('otlp.metrics.related-candidate.source'),
        copy: [query.relatedMetricSource, query.relatedMetricFamily].filter(Boolean).join(' / ') || '-',
        meta: query.relatedMetricReason || t('otlp.metrics.related-candidate.meta')
      }
      : null,
    matchedLabels.length
      ? {
        key: 'candidate-labels',
        title: t('otlp.metrics.related-candidate.matched-labels'),
        copy: matchedLabels.join(', '),
        meta: t('otlp.metrics.related-candidate.labels-meta')
      }
      : null,
    ...resourceMatchRows.map(row => ({
      key: `candidate-resource-${row.name}`,
      title: row.name,
      copy: row.value,
      meta: t('otlp.metrics.related-candidate.resource-meta')
    }))
  ].filter((row): row is { key: string; title: string; copy: string; meta: string } => row !== null);
  return rows;
}

function resolveMetricsDashboardPanelVisualization(
  inspector: NonNullable<OtlpMetricsQueryState['inspector']>
): SignalDashboardPanelVisualization {
  return inspector === 'table' ? 'table' : 'graph';
}

function appendMetricsPanelEditContext(route: string, panelEditContext: SignalPanelEditContext | null) {
  if (!panelEditContext) return route;
  const url = new URL(route || '/ingestion/otlp/metrics', 'http://localhost');
  url.searchParams.set('intent', panelEditContext.intent);
  if (panelEditContext.dashboardKey) url.searchParams.set('dashboardKey', panelEditContext.dashboardKey);
  if (panelEditContext.panelId) url.searchParams.set('panelId', panelEditContext.panelId);
  if (panelEditContext.draftKey) url.searchParams.set('draftKey', panelEditContext.draftKey);
  if (panelEditContext.returnTo) url.searchParams.set('returnTo', panelEditContext.returnTo);
  if (panelEditContext.returnLabel) url.searchParams.set('returnLabel', panelEditContext.returnLabel);
  return `${url.pathname}${url.search}${url.hash}`;
}

export default function OtlpMetricsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const metricsTimeRangeLabels = useMemo(() => buildTimeRangePresetLabels(t), [t]);
  const metricsTimeRangePresets = useMemo(
    () => TIME_CONTEXT_PRESETS.map(preset => ({ value: preset.value, label: metricsTimeRangeLabels[preset.value] || preset.value })),
    [metricsTimeRangeLabels]
  );
  const query = useMemo(() => queryStateFromParams(searchParams), [searchParams]);
  const metricsInspectorView = query.inspector || 'graph';
  const routeContext = useMemo(() => readSignalRouteContext(searchParams), [searchParams]);
  const panelEditContext = useMemo(() => readSignalPanelEditContext(searchParams), [searchParams]);
  const replaceMetricsHref = useCallback((route: string) => {
    router.replace(appendMetricsPanelEditContext(route, panelEditContext));
  }, [panelEditContext, router]);
  const currentMetricsRoute = useMemo(() => buildOtlpMetricsRoute(query), [query]);
  const workbenchCacheKey = useMemo(() => buildOtlpMetricsConsoleUrl(query), [query]);
  const load = useCallback(async (): Promise<OtlpMetricsConsole> => loadOtlpMetricsConsole(apiMessageGet, query), [query]);
  const initialDraft = useMemo(() => ({
    query: query.query || '',
    filter: query.filter || '',
    aggregation: query.aggregation || 'avg',
    temporalAggregation: query.temporalAggregation || 'raw',
    groupBy: query.groupBy || '',
    legendFormat: query.legendFormat || '',
    formula: query.formula || '',
    step: query.step || '',
    limit: query.limit || '',
    warningThreshold: query.warningThreshold || '',
    criticalThreshold: query.criticalThreshold || '',
    timeRange: query.timeRange || 'last-30m',
    from: query.from || '',
    to: query.to || '',
    start: query.start || '',
    end: query.end || '',
    refresh: query.refresh || '',
    live: query.live || '',
    tz: query.tz || '',
    timezone: query.timezone || '',
    serviceName: query.serviceName || '',
    serviceNamespace: query.serviceNamespace || '',
    environment: query.environment || '',
    traceId: query.traceId || '',
    spanId: query.spanId || ''
  }), [
    query.aggregation,
    query.environment,
    query.filter,
    query.groupBy,
    query.legendFormat,
    query.formula,
    query.limit,
    query.query,
    query.end,
    query.from,
    query.live,
    query.refresh,
    query.serviceName,
    query.serviceNamespace,
    query.spanId,
    query.start,
    query.timeRange,
    query.temporalAggregation,
    query.timezone,
    query.to,
    query.traceId,
    query.tz,
    query.step,
    query.warningThreshold,
    query.criticalThreshold
  ]);
  const [draft, setDraft] = useState(initialDraft);
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);
  const metricInventorySearch = query.inventorySearch || '';
  const metricInventorySort: OtlpMetricInventorySort = query.inventorySort || 'name';
  const metricInventoryPageSize = resolveMetricInventoryPageSize(query.inventoryPageSize);
  const metricInventoryPageIndex = resolveMetricInventoryPageIndex(query.inventoryPageIndex);
  const metricAttributeSearch = query.seriesAttributeSearch || '';
  const [savedQueryViews, setSavedQueryViews] = useState<MetricsSavedQueryView[]>(readMetricsSavedQueryViews);
  const [savedQueryViewPersistenceMode, setSavedQueryViewPersistenceMode] = useState<SignalSavedQueryViewPersistenceMode>('local-fallback');
  const [editingSavedQueryViewId, setEditingSavedQueryViewId] = useState<string | null>(null);
  const [savedQueryViewLabelDraft, setSavedQueryViewLabelDraft] = useState('');
  const [metricsChartZoomRange, setMetricsChartZoomRange] = useState<EChartsDataZoomRange | null>(null);
  const [metricsExportFormat, setMetricsExportFormat] = useState<OtlpMetricsExportFormat>('csv');
  const [metricsExportScope, setMetricsExportScope] = useState<OtlpMetricsExportScope>('all');
  const [dashboardPanelDraftState, setDashboardPanelDraftState] = useState<MetricsDashboardPanelDraftState>('idle');

  useEffect(() => {
    let cancelled = false;
    void loadSignalSavedQueryViews('metrics')
      .then(views => {
        if (cancelled) return;
        const nextViews = views.filter(isMetricsSavedQueryView).slice(0, METRICS_SAVED_QUERY_VIEW_LIMIT);
        setSavedQueryViews(nextViews);
        writeMetricsSavedQueryViews(nextViews);
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

  useEffect(() => {
    if (!panelEditContext && hasMetricsDisplayReturnLabel(searchParams)) {
      router.replace(buildOtlpMetricsRoute(query));
    }
  }, [panelEditContext, query, router, searchParams]);

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  const updateDraftField = useCallback((field: keyof typeof draft, value: string) => {
    setDraft(previous => ({ ...previous, [field]: value }));
  }, []);

  const replaceMetricsInventoryRoute = useCallback((nextSearch: string, nextSort: OtlpMetricInventorySort) => {
    replaceMetricsHref(buildOtlpMetricsRoute({
      ...query,
      inventorySearch: nextSearch.trim() || undefined,
      inventorySort: nextSort === 'name' ? undefined : nextSort,
      inventoryPageIndex: undefined
    }));
  }, [query, replaceMetricsHref]);

  const replaceMetricsInventoryPageRoute = useCallback((nextPageSize: string, nextPageIndex: string) => {
    const pageSize = resolveMetricInventoryPageSize(nextPageSize);
    const pageIndex = resolveMetricInventoryPageIndex(nextPageIndex);
    replaceMetricsHref(buildOtlpMetricsRoute({
      ...query,
      inventoryPageSize: pageSize === DEFAULT_METRIC_INVENTORY_PAGE_SIZE ? undefined : pageSize,
      inventoryPageIndex: pageIndex === DEFAULT_METRIC_INVENTORY_PAGE_INDEX ? undefined : pageIndex
    }));
  }, [query, replaceMetricsHref]);

  const replaceMetricsAttributeSearchRoute = useCallback((nextSearch: string) => {
    replaceMetricsHref(buildOtlpMetricsRoute({
      ...query,
      seriesAttributeSearch: nextSearch.trim() || undefined
    }));
  }, [query, replaceMetricsHref]);

  const applyMetricsInspectorView = useCallback((inspector: NonNullable<OtlpMetricsQueryState['inspector']>) => {
    replaceMetricsHref(buildOtlpMetricsRoute({
      ...query,
      inspector
    }));
  }, [query, replaceMetricsHref]);

  const applySelectedMetricSeries = useCallback((series: OtlpMetricSeriesView) => {
    setSelectedSeriesKey(series.key);
    replaceMetricsHref(buildOtlpMetricsRoute({
      ...query,
      ...buildMetricSeriesRouteContext(series),
      series: series.key
    }));
  }, [query, replaceMetricsHref]);

  const toggleMetricsExpectedRange = useCallback(() => {
    replaceMetricsHref(buildOtlpMetricsRoute({
      ...query,
      expectedRange: query.expectedRange === 'on' ? undefined : 'on'
    }));
  }, [query, replaceMetricsHref]);

  const saveCurrentMetricsQueryView = useCallback(() => {
    const nextView = createMetricsSavedQueryView(query, routeContext, currentMetricsRoute, t);
    setSavedQueryViews(previous => {
      const nextViews = [nextView, ...previous.filter(view => view.route !== nextView.route)].slice(0, METRICS_SAVED_QUERY_VIEW_LIMIT);
      writeMetricsSavedQueryViews(nextViews);
      return nextViews;
    });
    void saveSignalSavedQueryView('metrics', nextView)
      .then(savedView => {
        setSavedQueryViewPersistenceMode('server-first');
        setSavedQueryViews(previous => {
          const nextViews = [savedView, ...previous.filter(view => view.id !== nextView.id && view.route !== savedView.route)].slice(0, METRICS_SAVED_QUERY_VIEW_LIMIT);
          writeMetricsSavedQueryViews(nextViews);
          return nextViews;
        });
      })
      .catch(() => {
        setSavedQueryViewPersistenceMode('local-fallback');
      });
  }, [currentMetricsRoute, query, routeContext, t]);

  const copyCurrentMetricsQueryView = useCallback(() => {
    void copyTextToClipboard(currentMetricsRoute);
  }, [currentMetricsRoute]);

  const addCurrentMetricsQueryToDashboard = useCallback(() => {
    const snapshot = createMetricsSavedQueryView(query, routeContext, currentMetricsRoute, t);
    const panelDraft = applySignalDashboardPanelEditContext(createSignalDashboardPanelDraft({
      signal: 'metrics',
      title: snapshot.label,
      description: snapshot.description,
      visualization: resolveMetricsDashboardPanelVisualization(metricsInspectorView),
      route: currentMetricsRoute,
      payload: {
        source: 'metrics-explorer',
        view: metricsInspectorView
      }
    }), panelEditContext);
    setDashboardPanelDraftState('saving');
    void saveSignalDashboardPanelDraft(panelDraft)
      .then(() => saveSignalDashboardPanelEditContext(panelEditContext, panelDraft))
      .then(() => setDashboardPanelDraftState('saved'))
      .catch(() => setDashboardPanelDraftState('failed'));
  }, [currentMetricsRoute, metricsInspectorView, panelEditContext, query, routeContext, t]);

  const downloadMetricsSeries = useCallback((
    seriesList: OtlpMetricSeriesView[],
    selectedSeries: OtlpMetricSeriesView | null | undefined
  ) => {
    if (typeof window === 'undefined') return;
    const exportSeries = metricsExportScope === 'selected' && selectedSeries ? [selectedSeries] : seriesList;
    if (exportSeries.length === 0) return;
    const content = metricsExportFormat === 'jsonl'
      ? buildOtlpMetricsJsonl(exportSeries)
      : buildOtlpMetricsCsv(exportSeries);
    const type = metricsExportFormat === 'jsonl' ? 'application/x-ndjson;charset=utf-8' : 'text/csv;charset=utf-8';
    const blob = new Blob([content], { type });
    const href = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = buildOtlpMetricsExportFilename(metricsExportFormat);
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(href);
  }, [metricsExportFormat, metricsExportScope]);

  const deleteMetricsSavedQueryView = useCallback((viewId: string) => {
    setSavedQueryViews(previous => {
      const nextViews = previous.filter(view => view.id !== viewId);
      writeMetricsSavedQueryViews(nextViews);
      return nextViews;
    });
    void deleteSignalSavedQueryView('metrics', viewId)
      .then(() => setSavedQueryViewPersistenceMode('server-first'))
      .catch(() => {
        setSavedQueryViewPersistenceMode('local-fallback');
      });
  }, []);

  const updateMetricsSavedQueryView = useCallback((viewId: string) => {
    const nextSnapshot = createMetricsSavedQueryView(query, routeContext, currentMetricsRoute, t);
    setSavedQueryViews(previous => {
      const nextViews = previous.map(view => (
        view.id === viewId
          ? { ...nextSnapshot, id: view.id, label: view.label, createdAt: view.createdAt }
          : view
      ));
      writeMetricsSavedQueryViews(nextViews);
      const updatedView = nextViews.find(view => view.id === viewId);
      if (updatedView) {
        void saveSignalSavedQueryView('metrics', updatedView)
          .then(savedView => {
            setSavedQueryViewPersistenceMode('server-first');
            setSavedQueryViews(currentViews => {
              const syncedViews = currentViews.map(view => (view.id === viewId ? savedView : view));
              writeMetricsSavedQueryViews(syncedViews);
              return syncedViews;
            });
          })
          .catch(() => {
            setSavedQueryViewPersistenceMode('local-fallback');
          });
      }
      return nextViews;
    });
  }, [currentMetricsRoute, query, routeContext, t]);

  const startRenameMetricsSavedQueryView = useCallback((view: MetricsSavedQueryView) => {
    setEditingSavedQueryViewId(view.id);
    setSavedQueryViewLabelDraft(view.label);
  }, []);

  const cancelRenameMetricsSavedQueryView = useCallback(() => {
    setEditingSavedQueryViewId(null);
    setSavedQueryViewLabelDraft('');
  }, []);

  const saveRenameMetricsSavedQueryView = useCallback((viewId: string) => {
    const nextLabel = savedQueryViewLabelDraft.trim();
    if (!nextLabel) {
      cancelRenameMetricsSavedQueryView();
      return;
    }
    setSavedQueryViews(previous => {
      const nextViews = previous.map(view => (view.id === viewId ? { ...view, label: nextLabel } : view));
      writeMetricsSavedQueryViews(nextViews);
      const renamedView = nextViews.find(view => view.id === viewId);
      if (renamedView) {
        void saveSignalSavedQueryView('metrics', renamedView)
          .then(savedView => {
            setSavedQueryViewPersistenceMode('server-first');
            setSavedQueryViews(currentViews => {
              const syncedViews = currentViews.map(view => (view.id === viewId ? savedView : view));
              writeMetricsSavedQueryViews(syncedViews);
              return syncedViews;
            });
          })
          .catch(() => {
            setSavedQueryViewPersistenceMode('local-fallback');
          });
      }
      return nextViews;
    });
    cancelRenameMetricsSavedQueryView();
  }, [cancelRenameMetricsSavedQueryView, savedQueryViewLabelDraft]);

  const handleMetricsChartZoomChange = useCallback((nextZoom: EChartsDataZoomRange) => {
    setMetricsChartZoomRange(previous => {
      if (
        previous?.start === nextZoom.start &&
        previous?.end === nextZoom.end &&
        previous?.startValue === nextZoom.startValue &&
        previous?.endValue === nextZoom.endValue
      ) {
        return previous;
      }
      return nextZoom;
    });
  }, []);

  const draftTimeContext = useMemo(() => sanitizeTimeContext({
    timeRange: draft.timeRange || query.timeRange || 'last-30m',
    from: draft.from || query.from,
    to: draft.to || query.to,
    start: draft.start || query.start,
    end: draft.end || query.end,
    refresh: draft.refresh || query.refresh,
    live: draft.live || query.live,
    tz: draft.tz || query.tz,
    timezone: draft.timezone || query.timezone
  }), [
    draft.end,
    draft.from,
    draft.live,
    draft.refresh,
    draft.start,
    draft.timeRange,
    draft.timezone,
    draft.to,
    draft.tz,
    query.end,
    query.from,
    query.live,
    query.refresh,
    query.start,
    query.timeRange,
    query.timezone,
    query.to,
    query.tz
  ]);

  const replaceMetricsRoute = useCallback((nextDraft: typeof draft, nextTimeContext?: TimeContext, nextSeriesKey?: string, nextSeriesContext: Partial<OtlpMetricsQueryState> = {}) => {
    const timeContext = sanitizeTimeContext({
      timeRange: nextTimeContext?.timeRange || nextDraft.timeRange || query.timeRange || 'last-30m',
      from: nextTimeContext?.from || nextDraft.from || query.from,
      to: nextTimeContext?.to || nextDraft.to || query.to,
      start: nextTimeContext?.start || nextDraft.start || query.start,
      end: nextTimeContext?.end || nextDraft.end || query.end,
      refresh: nextTimeContext?.refresh || nextDraft.refresh || query.refresh,
      live: nextTimeContext?.live || nextDraft.live || query.live,
      tz: nextTimeContext?.tz || nextDraft.tz || query.tz,
      timezone: nextTimeContext?.timezone || nextDraft.timezone || query.timezone
    });
    const bounds = resolveTimeContextBounds(timeContext);
    const hasExpressionDraft = Boolean(timeContext.from && timeContext.to);
    const hasAbsoluteDraft = Boolean(timeContext.start && timeContext.end);
    replaceMetricsHref(buildOtlpMetricsRoute({
      ...query,
      query: nextDraft.query.trim() || undefined,
      series: nextSeriesKey ?? query.series,
      filter: nextDraft.filter.trim() || undefined,
      aggregation: nextDraft.aggregation,
      temporalAggregation: nextDraft.temporalAggregation === 'raw' ? undefined : nextDraft.temporalAggregation,
      groupBy: nextDraft.groupBy,
      legendFormat: nextDraft.legendFormat.trim() || undefined,
      formula: nextDraft.formula.trim() || undefined,
      step: nextDraft.step.trim() || undefined,
      limit: nextDraft.limit.trim() || undefined,
      warningThreshold: nextDraft.warningThreshold.trim() || undefined,
      criticalThreshold: nextDraft.criticalThreshold.trim() || undefined,
      timeRange: timeContext.timeRange || 'last-30m',
      from: hasExpressionDraft ? timeContext.from : undefined,
      to: hasExpressionDraft ? timeContext.to : undefined,
      serviceName: nextDraft.serviceName.trim() || undefined,
      serviceNamespace: nextDraft.serviceNamespace.trim() || undefined,
      environment: nextDraft.environment.trim() || undefined,
      traceId: nextDraft.traceId.trim() || undefined,
      spanId: nextDraft.spanId.trim() || undefined,
      ...nextSeriesContext,
      start: hasExpressionDraft ? undefined : bounds?.start || (!hasAbsoluteDraft ? query.start : undefined),
      end: hasExpressionDraft ? undefined : bounds?.end || (!hasAbsoluteDraft ? query.end : undefined),
      refresh: timeContext.refresh,
      live: timeContext.live,
      tz: hasExpressionDraft ? undefined : timeContext.tz,
      timezone: hasExpressionDraft ? timeContext.timezone || timeContext.tz : timeContext.timezone
    }));
  }, [query, replaceMetricsHref]);

  const applyMetricsQuery = useCallback((nextTimeContext?: TimeContext) => {
    replaceMetricsRoute(draft, nextTimeContext);
  }, [draft, replaceMetricsRoute]);

  const applyMetricInventoryQuery = useCallback((metricName: string, series?: OtlpMetricSeriesView | null) => {
    const nextMetricName = metricName.trim();
    if (!nextMetricName) return;
    const nextDraft = {
      ...draft,
      query: nextMetricName
    };
    setDraft(nextDraft);
    if (series) setSelectedSeriesKey(series.key);
    replaceMetricsRoute(nextDraft, undefined, series?.key || query.series, series ? buildMetricSeriesRouteContext(series) : {});
  }, [draft, query.series, replaceMetricsRoute]);

  const applyMetricAttributeFilter = useCallback((name: string, value: string, series?: OtlpMetricSeriesView | null) => {
    const expression = buildMetricAttributeFilterExpression(name, value);
    if (!expression) return;
    const nextDraft = {
      ...draft,
      filter: mergeMetricFilterExpression(draft.filter, expression)
    };
    setDraft(nextDraft);
    replaceMetricsRoute(nextDraft, undefined, series?.key || query.series, series ? buildMetricSeriesRouteContext(series) : {});
  }, [draft, query.series, replaceMetricsRoute]);

  const applyMetricAttributeExcludeFilter = useCallback((name: string, value: string, series?: OtlpMetricSeriesView | null) => {
    const expression = buildMetricAttributeExcludeFilterExpression(name, value);
    if (!expression) return;
    const nextDraft = {
      ...draft,
      filter: mergeMetricFilterExpression(draft.filter, expression)
    };
    setDraft(nextDraft);
    replaceMetricsRoute(nextDraft, undefined, series?.key || query.series, series ? buildMetricSeriesRouteContext(series) : {});
  }, [draft, query.series, replaceMetricsRoute]);

  const applyMetricAttributeExistsFilter = useCallback((name: string, series?: OtlpMetricSeriesView | null) => {
    const expression = buildMetricAttributeExistsFilterExpression(name);
    if (!expression) return;
    const nextDraft = {
      ...draft,
      filter: mergeMetricFilterExpression(draft.filter, expression)
    };
    setDraft(nextDraft);
    replaceMetricsRoute(nextDraft, undefined, series?.key || query.series, series ? buildMetricSeriesRouteContext(series) : {});
  }, [draft, query.series, replaceMetricsRoute]);

  const applyMetricAttributeNotExistsFilter = useCallback((name: string, series?: OtlpMetricSeriesView | null) => {
    const expression = buildMetricAttributeNotExistsFilterExpression(name);
    if (!expression) return;
    const nextDraft = {
      ...draft,
      filter: mergeMetricFilterExpression(draft.filter, expression)
    };
    setDraft(nextDraft);
    replaceMetricsRoute(nextDraft, undefined, series?.key || query.series, series ? buildMetricSeriesRouteContext(series) : {});
  }, [draft, query.series, replaceMetricsRoute]);

  const applyMetricAttributeReplaceFilter = useCallback((name: string, value: string, series?: OtlpMetricSeriesView | null) => {
    const expression = buildMetricAttributeFilterExpression(name, value);
    if (!expression) return;
    const nextDraft = {
      ...draft,
      filter: expression
    };
    setDraft(nextDraft);
    replaceMetricsRoute(nextDraft, undefined, series?.key || query.series, series ? buildMetricSeriesRouteContext(series) : {});
  }, [draft, query.series, replaceMetricsRoute]);

  const applyMetricGroupValueFilter = useCallback((groupBy: string, value: string) => {
    const expression = buildMetricAttributeFilterExpression(groupBy, value);
    if (!expression) return;
    const nextDraft = {
      ...draft,
      filter: mergeMetricFilterExpression(draft.filter, expression),
      groupBy
    };
    setDraft(nextDraft);
    replaceMetricsRoute(nextDraft);
  }, [draft, replaceMetricsRoute]);

  const applyMetricSeriesServiceFilter = useCallback((value: string, series?: OtlpMetricSeriesView | null) => {
    const serviceName = value.trim();
    if (!serviceName) return;
    const nextDraft = {
      ...draft,
      serviceName
    };
    setDraft(nextDraft);
    if (series) setSelectedSeriesKey(series.key);
    replaceMetricsRoute(nextDraft, undefined, series?.key || query.series);
  }, [draft, query.series, replaceMetricsRoute]);

  const applyMetricAttributeGroupBy = useCallback((name: string, series?: OtlpMetricSeriesView | null) => {
    const groupBy = normalizeMetricGroupByLabel(name);
    if (!groupBy) return;
    const nextDraft = {
      ...draft,
      groupBy
    };
    setDraft(nextDraft);
    replaceMetricsRoute(nextDraft, undefined, series?.key || query.series, series ? buildMetricSeriesRouteContext(series) : {});
  }, [draft, query.series, replaceMetricsRoute]);

  const applyMetricsTimeContext = useCallback((timeContext: TimeContext) => {
    const sanitized = sanitizeTimeContext(timeContext);
    setDraft(previous => ({
      ...previous,
      timeRange: sanitized.timeRange || previous.timeRange || 'last-30m',
      from: sanitized.from || '',
      to: sanitized.to || '',
      start: sanitized.start || '',
      end: sanitized.end || '',
      refresh: sanitized.refresh || '',
      live: sanitized.live || '',
      tz: sanitized.tz || '',
      timezone: sanitized.timezone || ''
    }));
    applyMetricsQuery(sanitized);
  }, [applyMetricsQuery]);

  return (
    <ClientWorkbench load={load} loadingCopy={t('otlp.metrics.loading')} cacheKey={workbenchCacheKey}>
      {data => {
        const queryEntityId = routeEntityIdValue(query.entityId);
        const queryEntityIdText = readEntityIdRouteParam(query.entityId);
        const queryStart = routeEpochMillisValue(query.start);
        const queryEnd = routeEpochMillisValue(query.end);
        const queryStartText = readEpochMillisRouteParam(query.start);
        const queryEndText = readEpochMillisRouteParam(query.end);
        const mergedData: OtlpMetricsConsole = {
          ...data,
          context: {
            ...data.context,
            entityId: data.context?.entityId ?? queryEntityId,
            entityType: data.context?.entityType || query.entityType,
            entityName: data.context?.entityName || query.entityName,
            serviceName: data.context?.serviceName || query.serviceName,
            serviceNamespace: data.context?.serviceNamespace || query.serviceNamespace,
            environment: data.context?.environment || query.environment,
            start: data.context?.start ?? queryStart,
            end: data.context?.end ?? queryEnd
          }
        };
        const workbenchState = buildMetricsExplorerState(mergedData, t);
        const metricSeries = applyMetricsFormula(buildMetricSeriesViews(mergedData, t), query.formula);
        const hasMetricSeries = metricSeries.length > 0;
        const seriesRows = buildMetricSeriesRows(metricSeries, t);
        const selectedMetricSeries =
          metricSeries.find(series => series.key === query.series) ||
          metricSeries.find(series => series.key === selectedSeriesKey) ||
          findMetricSeriesForRouteTrace(metricSeries, query, routeContext) ||
          metricSeries[0] ||
          null;
        const selectedMetricSeriesIndex = selectedMetricSeries ? metricSeries.findIndex(series => series.key === selectedMetricSeries.key) : -1;
        const selectedMetricSeriesRouteContext: Partial<SignalRouteContext> = selectedMetricSeries
          ? buildMetricSeriesRouteContext(selectedMetricSeries)
          : {};
        const requestedMetricTraceId = firstRouteText(query.traceId, routeContext.traceId) || '';
        const requestedMetricSpanId = firstRouteText(query.spanId, routeContext.spanId) || '';
        const requestedMetricServiceName = firstRouteText(query.serviceName, routeContext.serviceName) || '';
        const selectedMetricTraceId = selectedMetricSeriesRouteContext.traceId || '';
        const selectedMetricSpanId = selectedMetricSeriesRouteContext.spanId || '';
        const selectedMetricServiceName = selectedMetricSeriesRouteContext.serviceName || '';
        const selectedMetricSourceMatch =
          requestedMetricTraceId && selectedMetricTraceId === requestedMetricTraceId && (!requestedMetricSpanId || selectedMetricSpanId === requestedMetricSpanId)
            ? 'trace-span'
            : requestedMetricServiceName && selectedMetricServiceName === requestedMetricServiceName
              ? 'service'
              : 'fallback';
        const selectedSeriesContextRows = buildMetricSeriesContextRows(selectedMetricSeries, t);
        const selectedSeriesEvidenceRows = buildMetricSeriesEvidenceRows(selectedMetricSeries, formatTime, t);
        const selectedSeriesSampleRows = buildMetricSeriesSampleRows(selectedMetricSeries, formatTime, t);
        const selectedSeriesAttributeRows = buildMetricSeriesAttributeRows(selectedMetricSeries, metricAttributeSearch);
        const selectedSeriesContextDetailRows = selectedSeriesContextRows.map(row => ({
          key: row.label,
          title: row.label,
          copy: row.value,
          meta: row.meta
        }));
        const selectedSeriesEvidenceDetailRows = selectedSeriesEvidenceRows.map(row => ({
          key: row.label,
          title: row.label,
          copy: row.value,
          meta: row.meta
        }));
        const attributionDiagnostics = buildMetricSeriesAttributionDiagnostics(selectedMetricSeries, t);
        const attributionDiagnosticRows = attributionDiagnostics.map(row => ({
          key: row.key,
          label: row.label,
          value: row.value,
          meta: row.meta,
          state: row.state,
          stateLabel: row.state === 'present' ? t('otlp.metrics.attribution.state.present') : t('otlp.metrics.attribution.state.missing'),
          tone: row.state === 'present' ? 'success' as const : 'critical' as const,
          rowProps: {
            'data-otlp-metrics-attribution-diagnostic-state': row.state
          } as React.HTMLAttributes<HTMLDivElement>
        }));
        const trendSourceSeries = selectedMetricSeries
          ? [selectedMetricSeries, ...metricSeries.filter(series => series.key !== selectedMetricSeries.key)]
          : metricSeries;
        const trendBars = buildMetricTrendBars(trendSourceSeries, formatTime);
        const metricThresholdConfig = buildMetricThresholdConfig(query.warningThreshold, query.criticalThreshold, t);
        const metricExpectedRangeConfig = query.expectedRange === 'on'
          ? buildMetricExpectedRangeConfig(selectedMetricSeries || metricSeries[0] || null, t)
          : null;
        const metricsChartOption = buildMetricsChartOption(metricSeries, metricThresholdConfig, metricExpectedRangeConfig, query.legendFormat);
        const metricsChartZoomContext = buildMetricsDataZoomTimeContext(
          metricSeries,
          metricsChartZoomRange,
          draftTimeContext.timeRange || query.timeRange || 'last-30m'
        );
        const metricsChartZoomBounds = metricsChartZoomContext ? resolveTimeContextBounds(metricsChartZoomContext) : null;
        const metricsChartZoomDraftLabel = metricsChartZoomBounds?.start && metricsChartZoomBounds?.end
          ? `${formatEpochMillisDraft(metricsChartZoomBounds.start)} → ${formatEpochMillisDraft(metricsChartZoomBounds.end)}`
          : '';
        const canApplyMetricsChartZoom = Boolean(metricsChartZoomContext && metricsChartZoomBounds && metricsChartZoomDraftLabel);
        const facts = buildConsoleFacts(mergedData, t, formatTime);
        const metrics = buildConsoleMetrics(mergedData, t);
        const contextRows = buildContextRows(mergedData, t, formatTime);
        const metricsDetailContextRows = contextRows.map(row => ({
          key: row.title,
          title: row.title,
          copy: row.copy,
          meta: row.meta
        }));
        const relatedMetricCandidateRows = buildRelatedMetricCandidateRows(query, t);
        const handoffLinks = buildMetricsHandoffLinks(mergedData, query, routeContext, selectedMetricSeries);
        const linkedRecordRows = buildMetricSeriesLinkedRecordRows(selectedMetricSeries, handoffLinks, t);
        const linkedRecordHandoffTargets = linkedRecordRows.map(row => ({
          id: row.key,
          label: <span data-otlp-metrics-linked-record-action={row.key}>{row.label}</span>,
          description: row.meta,
          meta: row.value,
          href: row.href,
          tone: row.key === 'alerts' ? ('critical' as const) : row.key === 'traces' ? ('info' as const) : ('neutral' as const)
        }));
        const missingEntityHandoffTitle = t('otlp.metrics.handoff.entity-disabled');
        const canOpenEntity = handoffLinks.entityHref.startsWith('/entities/');
        const entityContextRows = buildSignalEntityContextRows(routeContext, {
          entityId: queryEntityIdText || (mergedData.context?.entityId != null ? String(mergedData.context.entityId) : undefined),
          entityType: query.entityType || mergedData.context?.entityType || undefined,
          entityName: query.entityName || mergedData.context?.entityName || undefined,
          serviceName: mergedData.context?.serviceName || query.serviceName || undefined,
          serviceNamespace: mergedData.context?.serviceNamespace || query.serviceNamespace || undefined,
          environment: mergedData.context?.environment || query.environment || undefined,
          start: queryStartText || (mergedData.context?.start != null ? String(mergedData.context.start) : undefined),
          end: queryEndText || (mergedData.context?.end != null ? String(mergedData.context.end) : undefined),
          source: routeContext.source || 'OTLP'
        });
        const entityContextDetailRows = entityContextRows.map(row => ({
          key: row.label,
          title: row.label,
          copy: row.value,
          meta: row.meta
        }));
        const serviceGroupLabel = t('otlp.metrics.group.service');
        const namespaceGroupLabel = t('otlp.metrics.group.namespace');
        const environmentGroupLabel = t('otlp.metrics.group.environment');
        const noGroupLabel = t('otlp.metrics.group.none');
        const metricsGroupOptions = [
          { value: '', label: noGroupLabel },
          { value: 'service_name', label: serviceGroupLabel },
          { value: 'service_namespace', label: namespaceGroupLabel },
          { value: 'deployment_environment_name', label: environmentGroupLabel }
        ];
        const hasCustomGroupBy = Boolean(draft.groupBy && !metricsGroupOptions.some(option => option.value === draft.groupBy));
        const visibleMetricsGroupOptions = hasCustomGroupBy
          ? [...metricsGroupOptions, { value: draft.groupBy, label: draft.groupBy }]
          : metricsGroupOptions;
        const currentGroupLabel = visibleMetricsGroupOptions.find(option => option.value === draft.groupBy)?.label || noGroupLabel;
        const currentTemporalAggregationLabel = draft.temporalAggregation === 'rate'
          ? t('otlp.metrics.temporal.rate')
          : draft.temporalAggregation === 'increase'
            ? t('otlp.metrics.temporal.increase')
            : draft.temporalAggregation === 'delta'
              ? t('otlp.metrics.temporal.delta')
              : t('otlp.metrics.temporal.raw');
        const headerContextPills = [
          { label: t('otlp.metrics.field.service'), value: firstRouteText(mergedData.context?.serviceName, query.serviceName, draft.serviceName) },
          { label: t('otlp.metrics.field.namespace'), value: firstRouteText(mergedData.context?.serviceNamespace, query.serviceNamespace, draft.serviceNamespace) },
          { label: t('otlp.metrics.field.environment'), value: firstRouteText(mergedData.context?.environment, query.environment, draft.environment) },
          { label: t('otlp.metrics.filter.short'), value: firstRouteText(query.filter, draft.filter) },
          {
            label: t('otlp.metrics.temporal.aria'),
            value: currentTemporalAggregationLabel
          },
          {
            label: t('otlp.metrics.field.group-by'),
            value: currentGroupLabel
          }
        ].filter((pill): pill is { label: string; value: string } => Boolean(pill.value));
        const seriesSetScopeRows = [
          { label: t('otlp.metrics.scope.service'), value: firstRouteText(mergedData.context?.serviceName, query.serviceName, draft.serviceName) || t('otlp.metrics.scope.all-services') },
          { label: t('otlp.metrics.field.namespace'), value: firstRouteText(mergedData.context?.serviceNamespace, query.serviceNamespace, draft.serviceNamespace) || t('otlp.metrics.scope.all-namespaces') },
          { label: t('otlp.metrics.field.environment'), value: firstRouteText(mergedData.context?.environment, query.environment, draft.environment) || t('otlp.metrics.scope.all-environments') },
          {
            label: t('otlp.metrics.field.group-by'),
            value: currentGroupLabel
          },
          { label: t('otlp.metrics.scope.series'), value: t('otlp.metrics.scope.series-count', { count: seriesRows.length }) }
        ];
        const latestObservedAt = latestSeriesTimestamp(mergedData);
        const metricSeriesTableRows = seriesRows.map((row, index) => ({
          ...row,
          rowKey: metricSeries[index]?.key || `${row.title}-${index}`,
          pointCount: metricSeries[index]?.points.length ?? 0,
          series: metricSeries[index]
        }));
        const metricInventoryRows = buildMetricInventoryRows(metricSeriesTableRows, metricInventorySearch, metricInventorySort);
        const metricInventoryPageSizeNumber = Number(metricInventoryPageSize);
        const metricInventoryTotalPages = Math.max(1, Math.ceil(metricInventoryRows.length / metricInventoryPageSizeNumber));
        const clampedMetricInventoryPageIndex = Math.min(Number(metricInventoryPageIndex), metricInventoryTotalPages - 1);
        const metricInventoryPageStartIndex = clampedMetricInventoryPageIndex * metricInventoryPageSizeNumber;
        const metricInventoryPageRows = metricInventoryRows.slice(metricInventoryPageStartIndex, metricInventoryPageStartIndex + metricInventoryPageSizeNumber);
        const metricInventoryPageFrom = metricInventoryRows.length === 0 ? 0 : metricInventoryPageStartIndex + 1;
        const metricInventoryPageTo = metricInventoryRows.length === 0 ? 0 : Math.min(metricInventoryRows.length, metricInventoryPageStartIndex + metricInventoryPageRows.length);
        const metricInventoryPaginationSummary = t('common.pagination.summary', {
          page: clampedMetricInventoryPageIndex + 1,
          totalPages: metricInventoryTotalPages,
          from: metricInventoryPageFrom,
          to: metricInventoryPageTo,
          total: metricInventoryRows.length
        });
        const metricInventorySummary = metricInventorySearch.trim()
          ? t('otlp.metrics.inventory.filtered-count', { filtered: metricInventoryRows.length, total: metricSeriesTableRows.length })
          : t('otlp.metrics.scope.series-count', { count: metricSeriesTableRows.length });
        const firstSeries = (selectedMetricSeriesIndex >= 0 ? seriesRows[selectedMetricSeriesIndex] : undefined) ?? seriesRows[0] ?? {
          title: mergedData.query || t('otlp.metrics.query.unselected'),
          copy: mergedData.context?.serviceName || routeContext.serviceName || '-',
          meta: '-'
        };
        const sourceContextKind = panelEditContext
          ? 'dashboard-panel-edit'
          : isDashboardReturnContext(query.returnTo || routeContext.returnTo)
          ? 'dashboard-evidence'
          : query.returnTo || routeContext.returnTo
            ? 'return-source'
            : 'direct';

        return (
          <HzSignalWorkbenchShell
            data-otlp-metrics-route="otlp-hertzbeat-ui-metrics-workbench"
            data-otlp-metrics-shell-owner="hertzbeat-ui-signal-workbench-shell"
            data-otlp-metrics-style-baseline="hertzbeat-ui-matte"
            data-otlp-metrics-page-shell="flat-direct-stack"
            data-otlp-metrics-page-shell-layer="removed"
            data-otlp-metrics-page-stack="direct-panels"
            data-otlp-metrics-shell-chrome="topology-workbench"
            data-otlp-metrics-source-context={sourceContextKind}
            data-otlp-metrics-source-context-return={query.returnTo || routeContext.returnTo || ''}
            data-otlp-metrics-source-context-trace={query.traceId || routeContext.traceId || ''}
            data-otlp-metrics-source-context-span={query.spanId || routeContext.spanId || ''}
            data-otlp-metrics-source-context-service={query.serviceName || routeContext.serviceName || ''}
            data-otlp-metrics-panel-edit-context={panelEditContext?.intent || 'none'}
            data-otlp-metrics-panel-edit-dashboard={panelEditContext?.dashboardKey || ''}
            data-otlp-metrics-panel-edit-panel={panelEditContext?.panelId || ''}
            data-otlp-metrics-panel-edit-draft={panelEditContext?.draftKey || ''}
            data-otlp-metrics-panel-edit-return={panelEditContext?.returnTo || ''}
            layout="topology-workbench"
          >
              <HzPanelSurface
                data-otlp-metrics-header="hertzbeat-ui-compact-header"
                data-otlp-metrics-header-owner="hertzbeat-ui-panel-surface"
                data-otlp-metrics-header-layout="compact-title-with-aligned-toolbar"
                data-otlp-metrics-header-actions="removed"
                padding="query"
              >
                <HzWorkbenchLayout
                  as="div"
                  variant="metrics-header"
                  data-otlp-metrics-header-layout-frame="compact-title-with-aligned-toolbar"
                  data-otlp-metrics-header-layout-frame-owner="hertzbeat-ui-workbench-layout"
                >
                  <HzWorkbenchHeaderCopy
                    density="compact"
                    eyebrow={t('otlp.metrics.header.kicker')}
                    title={t('otlp.metrics.title')}
                    data-otlp-metrics-title-block="operator-context"
                    data-otlp-metrics-title-block-owner="hertzbeat-ui-workbench-header-copy"
                  >
                    {headerContextPills.length ? (
                      <HzChipGroup
                        density="compact"
                        spacing="top-3"
                        data-otlp-metrics-header-context-strip="applied-query-facts"
                        data-otlp-metrics-header-context-strip-owner="hertzbeat-ui-toolbar-chips"
                      >
                        {headerContextPills.map(pill => (
                          <HzStatusBadge
                            key={pill.label}
                            tone="neutral"
                            size="sm"
                            layout="context-pill"
                            label={pill.label}
                            value={pill.value}
                            data-otlp-metrics-header-context-pill="applied-query-fact"
                            data-otlp-metrics-header-context-pill-owner="hertzbeat-ui-status-badge"
                          />
                        ))}
                      </HzChipGroup>
                    ) : null}
                  </HzWorkbenchHeaderCopy>
                  <HzWorkbenchLayout
                    as="div"
                    variant="header-toolbar-slot"
                    data-otlp-metrics-header-topbar="time-context"
                    data-otlp-metrics-header-topbar-owner="hertzbeat-ui-workbench-layout"
                  >
                    <HzWorkbenchLayout
                      as="div"
                      variant="time-toolbar"
                      data-otlp-metrics-time-toolbar="top-right-corner"
                      data-otlp-metrics-time-toolbar-owner="hertzbeat-ui-workbench-layout"
                      data-otlp-metrics-toolbar-stack="same-width-time-actions"
                    >
                      {routeContext.returnTo ? (
                        <HzActionGroup
                          data-otlp-metrics-return-action-group="header"
                          data-otlp-metrics-return-action-group-owner="hertzbeat-ui-action-group"
                          layout="full-end"
                        >
                          <HzButtonLink
                            component={Link}
                            data-otlp-metrics-return-action="true"
                            data-otlp-metrics-header-action="return-source"
                            href={routeContext.returnTo}
                            size="md"
                          >
                            <HzButtonIcon
                              icon={Workflow}
                              data-otlp-metrics-header-action-icon="return-source"
                              data-otlp-metrics-header-action-icon-owner="hertzbeat-ui-button-icon"
                            />
                            {t('otlp.metrics.route.action.return-source')}
                          </HzButtonLink>
                        </HzActionGroup>
                      ) : null}
                      <HzControlStack
                        layout="end-inline"
                        data-otlp-metrics-time-control="shared-time-context-control"
                        data-otlp-metrics-time-control-owner="hertzbeat-ui-control-stack"
                        data-otlp-metrics-time-control-placement="top-right"
                        data-otlp-metrics-time-control-visual="narrow-top-right-rail"
                        data-otlp-metrics-time-control-fit="no-clipping"
                      >
                        <TimeRangeControl
                          value={draftTimeContext}
                          labels={buildTimeRangeControlLabels(t)}
                          onApply={applyMetricsTimeContext}
                          onRefresh={() => applyMetricsQuery(draftTimeContext)}
                          onReset={() => applyMetricsTimeContext({ timeRange: 'last-30m' })}
                          presets={metricsTimeRangePresets}
                          showAbsoluteFields
                          variant="narrow-rail"
                          data-otlp-metrics-time-range-control-owner="hertzbeat-shared-time-range-control"
                          presetSelectProps={{ 'data-otlp-metrics-time-range-select': 'true' }}
                          presetOptionDataAttribute="data-otlp-metrics-time-range-preset"
                          refreshActionProps={{ 'data-otlp-metrics-time-refresh-action': 'true' }}
                        />
                      </HzControlStack>
                    </HzWorkbenchLayout>
                  </HzWorkbenchLayout>
                </HzWorkbenchLayout>
              </HzPanelSurface>

              <HzPanelSurface
                data-otlp-metrics-query-bar="hertzbeat-ui-query-row"
                data-otlp-metrics-query-bar-owner="hertzbeat-ui-panel-surface"
                padding="query"
              >
                <HzControlStack
                  layout="inline-wrap"
                  data-otlp-metrics-query-control-stack="shared-inline-controls"
                  data-otlp-metrics-query-control-stack-owner="hertzbeat-ui-control-stack"
                >
                  <HzSearchFieldFrame
                    data-otlp-metrics-query-search-frame="shared-search-field-frame"
                    data-otlp-metrics-query-search-frame-owner="hertzbeat-ui-search-field-frame"
                    width="metrics-query"
                    icon={(
                      <HzSearchFieldIcon
                        icon={Search}
                        data-otlp-metrics-query-search-icon="metric-query"
                        data-otlp-metrics-query-search-icon-owner="hertzbeat-ui-search-field-icon"
                      />
                    )}
                  >
                    <HzInput
                      data-otlp-metrics-query-input="true"
                      data-otlp-metrics-query-input-owner="hertzbeat-ui-input"
                      aria-label={t('otlp.metrics.query.aria')}
                      value={draft.query || mergedData.query || ''}
                      onChange={event => updateDraftField('query', event.target.value)}
                      onInput={event => updateDraftField('query', event.currentTarget.value)}
                      placeholder="http.server.duration"
                      inset="search-icon"
                      width="metrics-query-expression"
                    />
                  </HzSearchFieldFrame>
                  <HzSelect
                    data-otlp-metrics-aggregation-select="true"
                    data-otlp-metrics-aggregation-select-owner="hertzbeat-ui-select"
                    aria-label={t('otlp.metrics.aggregation.aria')}
                    value={draft.aggregation}
                    onChange={event => updateDraftField('aggregation', event.target.value)}
                    width="metrics-aggregation"
                    triggerClassName="text-[#d5dce8]"
                    options={[
                      { value: 'avg', label: t('otlp.metrics.aggregation.avg') },
                      { value: 'sum', label: t('otlp.metrics.aggregation.sum') },
                      { value: 'max', label: t('otlp.metrics.aggregation.max') },
                      { value: 'min', label: t('otlp.metrics.aggregation.min') }
                    ]}
                    optionDataAttributes={option => ({
                      'data-otlp-metrics-aggregation-option': option.value
                    })}
                  />
                  <HzSelect
                    data-otlp-metrics-group-by-select="true"
                    data-otlp-metrics-group-by-select-owner="hertzbeat-ui-select"
                    aria-label={t('otlp.metrics.field.group-by')}
                    value={draft.groupBy}
                    onChange={event => updateDraftField('groupBy', event.target.value)}
                    width="metrics-group-by"
                    triggerClassName="text-[#d5dce8]"
                    options={visibleMetricsGroupOptions}
                    optionDataAttributes={option => ({
                      'data-otlp-metrics-group-by-option': option.value
                    })}
                  />
                  <HzQueryActionGroup
                    data-otlp-metrics-query-action-group="shared-query-action-group"
                    data-otlp-metrics-query-action-group-owner="hertzbeat-ui-query-action-group"
                  >
                    <HzButton data-otlp-metrics-run-query-action="true" intent="primary" size="md" onClick={() => applyMetricsQuery()}>
                      <HzButtonIcon
                        icon={Play}
                        data-otlp-metrics-query-action-icon="run"
                        data-otlp-metrics-query-action-icon-owner="hertzbeat-ui-button-icon"
                      />
                      {t('otlp.metrics.query.run')}
                    </HzButton>
                    <HzButtonLink component={Link} href="/ingestion/otlp/metrics" size="md" data-otlp-metrics-reset-action="true">
                      <HzButtonIcon
                        icon={RotateCcw}
                        data-otlp-metrics-query-action-icon="reset"
                        data-otlp-metrics-query-action-icon-owner="hertzbeat-ui-button-icon"
                      />
                      {t('common.reset')}
                    </HzButtonLink>
                  </HzQueryActionGroup>
                </HzControlStack>
                <HzControlStack
                  layout="inline-wrap"
                  spacing="top-2"
                  data-otlp-metrics-builder-control-stack="shared-query-builder-controls"
                  data-otlp-metrics-builder-control-stack-owner="hertzbeat-ui-control-stack"
                >
                  <HzSearchFieldFrame
                    data-otlp-metrics-filter-search-frame="shared-search-field-frame"
                    data-otlp-metrics-filter-search-frame-owner="hertzbeat-ui-search-field-frame"
                    width="metrics-query"
                    icon={(
                      <HzSearchFieldIcon
                        icon={Search}
                        data-otlp-metrics-filter-search-icon="metric-filter"
                        data-otlp-metrics-filter-search-icon-owner="hertzbeat-ui-search-field-icon"
                      />
                    )}
                  >
                    <HzInput
                      data-otlp-metrics-filter-input="true"
                      data-otlp-metrics-filter-input-owner="hertzbeat-ui-input"
                      aria-label={t('otlp.metrics.filter.aria')}
                      value={draft.filter}
                      onChange={event => updateDraftField('filter', event.target.value)}
                      onInput={event => updateDraftField('filter', event.currentTarget.value)}
                      placeholder={t('otlp.metrics.filter.placeholder')}
                      inset="search-icon"
                      width="metrics-filter-expression"
                    />
                  </HzSearchFieldFrame>
                  <HzSelect
                    data-otlp-metrics-temporal-aggregation-select="true"
                    data-otlp-metrics-temporal-aggregation-select-owner="hertzbeat-ui-select"
                    aria-label={t('otlp.metrics.temporal.aria')}
                    value={draft.temporalAggregation}
                    onChange={event => updateDraftField('temporalAggregation', event.target.value)}
                    width="metrics-temporal-aggregation"
                    triggerClassName="text-[#d5dce8]"
                    options={[
                      { value: 'raw', label: t('otlp.metrics.temporal.raw') },
                      { value: 'rate', label: t('otlp.metrics.temporal.rate') },
                      { value: 'increase', label: t('otlp.metrics.temporal.increase') },
                      { value: 'delta', label: t('otlp.metrics.temporal.delta') }
                    ]}
                    optionDataAttributes={option => ({
                      'data-otlp-metrics-temporal-aggregation-option': option.value
                    })}
                  />
                  <HzInput
                    data-otlp-metrics-step-input="true"
                    data-otlp-metrics-step-input-owner="hertzbeat-ui-input"
                    aria-label={t('otlp.metrics.step.aria')}
                    value={draft.step}
                    onChange={event => updateDraftField('step', event.target.value)}
                    onInput={event => updateDraftField('step', event.currentTarget.value)}
                    placeholder={t('otlp.metrics.step.placeholder')}
                    inputMode="numeric"
                    width="metrics-query-step"
                  />
                  <HzInput
                    data-otlp-metrics-limit-input="true"
                    data-otlp-metrics-limit-input-owner="hertzbeat-ui-input"
                    aria-label={t('otlp.metrics.limit.aria')}
                    value={draft.limit}
                    onChange={event => updateDraftField('limit', event.target.value)}
                    onInput={event => updateDraftField('limit', event.currentTarget.value)}
                    placeholder={t('otlp.metrics.limit.placeholder')}
                    inputMode="numeric"
                    width="metrics-query-limit"
                  />
                  <HzInput
                    data-otlp-metrics-legend-format-input="true"
                    data-otlp-metrics-legend-format-input-owner="hertzbeat-ui-input"
                    aria-label={t('otlp.metrics.legend-format.aria')}
                    value={draft.legendFormat}
                    onChange={event => updateDraftField('legendFormat', event.target.value)}
                    onInput={event => updateDraftField('legendFormat', event.currentTarget.value)}
                    placeholder={t('otlp.metrics.legend-format.placeholder')}
                    width="metrics-filter-expression"
                  />
                  <HzInput
                    data-otlp-metrics-formula-input="true"
                    data-otlp-metrics-formula-input-owner="hertzbeat-ui-input"
                    aria-label={t('otlp.metrics.formula.aria')}
                    value={draft.formula}
                    onChange={event => updateDraftField('formula', event.target.value)}
                    onInput={event => updateDraftField('formula', event.currentTarget.value)}
                    placeholder={t('otlp.metrics.formula.placeholder')}
                    width="metrics-filter-expression"
                  />
                  <HzInput
                    data-otlp-metrics-warning-threshold-input="true"
                    data-otlp-metrics-warning-threshold-input-owner="hertzbeat-ui-input"
                    aria-label={t('otlp.metrics.threshold.warning.aria')}
                    value={draft.warningThreshold}
                    onChange={event => updateDraftField('warningThreshold', event.target.value)}
                    onInput={event => updateDraftField('warningThreshold', event.currentTarget.value)}
                    placeholder={t('otlp.metrics.threshold.warning.placeholder')}
                    inputMode="decimal"
                    width="metrics-query-step"
                  />
                  <HzInput
                    data-otlp-metrics-critical-threshold-input="true"
                    data-otlp-metrics-critical-threshold-input-owner="hertzbeat-ui-input"
                    aria-label={t('otlp.metrics.threshold.critical.aria')}
                    value={draft.criticalThreshold}
                    onChange={event => updateDraftField('criticalThreshold', event.target.value)}
                    onInput={event => updateDraftField('criticalThreshold', event.currentTarget.value)}
                    placeholder={t('otlp.metrics.threshold.critical.placeholder')}
                    inputMode="decimal"
                    width="metrics-query-step"
                  />
                  <HzButton
                    data-otlp-metrics-expected-range-toggle="true"
                    data-otlp-metrics-expected-range-toggle-owner="hertzbeat-ui-button"
                    aria-label={t('otlp.metrics.expected-range.aria')}
                    aria-pressed={query.expectedRange === 'on'}
                    intent={query.expectedRange === 'on' ? 'primary' : 'secondary'}
                    size="md"
                    onClick={toggleMetricsExpectedRange}
                  >
                    <HzButtonIcon
                      icon={BarChart3}
                      data-otlp-metrics-expected-range-icon="true"
                      data-otlp-metrics-expected-range-icon-owner="hertzbeat-ui-button-icon"
                    />
                    {t('otlp.metrics.expected-range.label')}
                  </HzButton>
                </HzControlStack>
                <HzControlStack
                  layout="inline-wrap"
                  spacing="top-2"
                  data-otlp-metrics-context-control-stack="shared-inline-controls"
                  data-otlp-metrics-context-control-stack-owner="hertzbeat-ui-control-stack"
                >
                  <HzInput
                    data-otlp-metrics-service-input="true"
                    data-otlp-metrics-context-input="service-name"
                    data-otlp-metrics-context-input-owner="hertzbeat-ui-input"
                    aria-label={t('otlp.metrics.field.service-name')}
                    value={draft.serviceName || mergedData.context?.serviceName || ''}
                    onChange={event => updateDraftField('serviceName', event.target.value)}
                    onInput={event => updateDraftField('serviceName', event.currentTarget.value)}
                    placeholder={t('otlp.metrics.field.service-name')}
                    width="metrics-context"
                  />
                  <HzInput
                    data-otlp-metrics-namespace-input="true"
                    data-otlp-metrics-context-input="namespace"
                    data-otlp-metrics-context-input-owner="hertzbeat-ui-input"
                    aria-label={t('otlp.metrics.field.namespace')}
                    value={draft.serviceNamespace || mergedData.context?.serviceNamespace || ''}
                    onChange={event => updateDraftField('serviceNamespace', event.target.value)}
                    onInput={event => updateDraftField('serviceNamespace', event.currentTarget.value)}
                    placeholder={t('otlp.metrics.field.namespace')}
                    width="metrics-context"
                  />
                  <HzInput
                    data-otlp-metrics-environment-input="true"
                    data-otlp-metrics-context-input="environment"
                    data-otlp-metrics-context-input-owner="hertzbeat-ui-input"
                    aria-label={t('otlp.metrics.field.environment')}
                    value={draft.environment || mergedData.context?.environment || ''}
                    onChange={event => updateDraftField('environment', event.target.value)}
                    onInput={event => updateDraftField('environment', event.currentTarget.value)}
                    placeholder={t('otlp.metrics.field.environment')}
                    width="metrics-context-compact"
                  />
                  <HzInput
                    data-otlp-metrics-trace-id-input="true"
                    data-otlp-metrics-context-input="trace-id"
                    data-otlp-metrics-context-input-owner="hertzbeat-ui-input"
                    aria-label={t('otlp.metrics.field.trace-id')}
                    value={draft.traceId}
                    onChange={event => updateDraftField('traceId', event.target.value)}
                    onInput={event => updateDraftField('traceId', event.currentTarget.value)}
                    placeholder={t('otlp.metrics.field.trace-id')}
                    width="metrics-trace-id"
                  />
                  <HzInput
                    data-otlp-metrics-span-id-input="true"
                    data-otlp-metrics-context-input="span-id"
                    data-otlp-metrics-context-input-owner="hertzbeat-ui-input"
                    aria-label={t('otlp.metrics.field.span-id')}
                    value={draft.spanId}
                    onChange={event => updateDraftField('spanId', event.target.value)}
                    onInput={event => updateDraftField('spanId', event.currentTarget.value)}
                    placeholder={t('otlp.metrics.field.span-id')}
                    width="metrics-trace-id"
                  />
                </HzControlStack>
                <HzPanelSurface
                  data-otlp-metrics-saved-views="route-query-views"
                  data-otlp-metrics-saved-views-owner="hertzbeat-ui-panel-surface"
                  data-otlp-metrics-saved-view-persistence={savedQueryViewPersistenceMode}
                  data-otlp-metrics-saved-view-persistence-owner={METRICS_SAVED_QUERY_VIEW_PERSISTENCE_OWNER[savedQueryViewPersistenceMode]}
                  data-otlp-metrics-saved-view-storage-key={METRICS_SAVED_QUERY_VIEW_STORAGE_KEY}
                  padding="view-switch"
                  variant="view-switch"
                >
                  <HzWorkbenchLayout
                    as="div"
                    variant="view-switch"
                    data-otlp-metrics-saved-view-layout="shared-view-switch"
                    data-otlp-metrics-saved-view-layout-owner="hertzbeat-ui-workbench-layout"
                  >
                    <div className="min-w-[176px]">
                      <div className="text-[12px] font-semibold text-[#8792a5]">{t('otlp.metrics.saved-view.title')}</div>
                      <div
                        className="mt-1 text-[11px] text-[#626b7c]"
                        data-otlp-metrics-saved-view-persistence-copy={savedQueryViewPersistenceMode}
                      >
                        {t(savedQueryViewPersistenceMode === 'server-first'
                          ? 'otlp.metrics.saved-view.persistence.server'
                          : 'otlp.metrics.saved-view.persistence.local')}
                      </div>
                      {dashboardPanelDraftState !== 'idle' ? (
                        <div
                          className="mt-1 text-[11px] text-[#8792a5]"
                          data-otlp-metrics-dashboard-panel-draft-status={dashboardPanelDraftState}
                          data-otlp-metrics-dashboard-panel-draft-status-mode={panelEditContext ? 'edit-panel' : 'new-panel'}
                          data-otlp-metrics-dashboard-panel-draft-status-dashboard={panelEditContext?.dashboardKey || ''}
                          data-otlp-metrics-dashboard-panel-draft-status-panel={panelEditContext?.panelId || ''}
                        >
                          {t(panelEditContext
                            ? `otlp.metrics.dashboard-panel-draft.update-${dashboardPanelDraftState}`
                            : `otlp.metrics.dashboard-panel-draft.${dashboardPanelDraftState}`)}
                        </div>
                      ) : null}
                    </div>
                    <HzActionGroup
                      layout="end-wrap"
                      data-otlp-metrics-saved-view-action-group="shared-action-group"
                      data-otlp-metrics-saved-view-action-group-owner="hertzbeat-ui-action-group"
                    >
                      <HzButton
                        type="button"
                        intent="secondary"
                        size="md"
                        onClick={saveCurrentMetricsQueryView}
                        data-otlp-metrics-saved-view-action="save-current"
                        data-otlp-metrics-saved-view-action-owner="hertzbeat-ui-button"
                      >
                        <Save className="h-4 w-4" aria-hidden="true" />
                        {t('otlp.metrics.saved-view.save-current')}
                      </HzButton>
                      <HzButton
                        type="button"
                        intent="secondary"
                        size="md"
                        title={t('otlp.metrics.saved-view.copy-current')}
                        aria-label={t('otlp.metrics.saved-view.copy-current')}
                        onClick={copyCurrentMetricsQueryView}
                        data-otlp-metrics-saved-view-copy-action="current"
                        data-otlp-metrics-saved-view-copy-owner="hertzbeat-ui-button"
                      >
                        <Copy className="h-4 w-4" aria-hidden="true" />
                      </HzButton>
                      <HzButton
                        type="button"
                        intent="secondary"
                        size="md"
                        title={t(panelEditContext ? 'otlp.metrics.dashboard-panel-draft.update-current' : 'otlp.metrics.dashboard-panel-draft.add-current')}
                        aria-label={t(panelEditContext ? 'otlp.metrics.dashboard-panel-draft.update-current' : 'otlp.metrics.dashboard-panel-draft.add-current')}
                        onClick={addCurrentMetricsQueryToDashboard}
                        data-otlp-metrics-dashboard-panel-draft-action={panelEditContext ? 'update-current' : 'add-current'}
                        data-otlp-metrics-dashboard-panel-draft-action-owner="hertzbeat-ui-button"
                        data-otlp-metrics-dashboard-panel-draft-action-mode={panelEditContext ? 'edit-panel' : 'new-panel'}
                        data-otlp-metrics-dashboard-panel-draft-action-dashboard={panelEditContext?.dashboardKey || ''}
                        data-otlp-metrics-dashboard-panel-draft-action-panel={panelEditContext?.panelId || ''}
                        data-otlp-metrics-dashboard-panel-draft-action-draft={panelEditContext?.draftKey || ''}
                      >
                        <HzButtonIcon
                          icon={BarChart3}
                          data-otlp-metrics-dashboard-panel-draft-action-icon="add-current"
                          data-otlp-metrics-dashboard-panel-draft-action-icon-owner="hertzbeat-ui-button-icon"
                          />
                        </HzButton>
                      {panelEditContext?.returnTo ? (
                        <HzButtonLink
                          component={Link}
                          href={panelEditContext.returnTo}
                          intent="secondary"
                          size="md"
                          data-otlp-metrics-dashboard-panel-draft-return-action="dashboard"
                          data-otlp-metrics-dashboard-panel-draft-return-action-owner="hertzbeat-ui-button-link"
                          data-otlp-metrics-dashboard-panel-draft-return-action-dashboard={panelEditContext.dashboardKey || ''}
                          data-otlp-metrics-dashboard-panel-draft-return-action-panel={panelEditContext.panelId || ''}
                        >
                          <HzButtonIcon
                            icon={BarChart3}
                            data-otlp-metrics-dashboard-panel-draft-return-action-icon="dashboard"
                            data-otlp-metrics-dashboard-panel-draft-return-action-icon-owner="hertzbeat-ui-button-icon"
                          />
                          {t('otlp.metrics.dashboard-panel-draft.return-dashboard')}
                        </HzButtonLink>
                      ) : null}
                      {savedQueryViews.length ? (
                        savedQueryViews.map(view => {
                          const active = view.route === currentMetricsRoute;
                          const editing = editingSavedQueryViewId === view.id;
                          return (
                            <React.Fragment key={view.id}>
                              {editing ? (
                                <>
                                  <HzInput
                                    value={savedQueryViewLabelDraft}
                                    onChange={event => setSavedQueryViewLabelDraft(event.target.value)}
                                    onInput={event => setSavedQueryViewLabelDraft(event.currentTarget.value)}
                                    aria-label={t('otlp.metrics.saved-view.rename-label')}
                                    data-otlp-metrics-saved-view-rename-input={view.id}
                                    data-otlp-metrics-saved-view-rename-input-owner="hertzbeat-ui-input"
                                  />
                                  <HzButton
                                    type="button"
                                    intent="primary"
                                    size="md"
                                    title={t('otlp.metrics.saved-view.rename-save')}
                                    aria-label={t('otlp.metrics.saved-view.rename-save')}
                                    data-otlp-metrics-saved-view-rename-save-action={view.id}
                                    data-otlp-metrics-saved-view-rename-save-owner="hertzbeat-ui-button"
                                    onClick={() => saveRenameMetricsSavedQueryView(view.id)}
                                  >
                                    <Check className="h-4 w-4" aria-hidden="true" />
                                  </HzButton>
                                  <HzButton
                                    type="button"
                                    intent="secondary"
                                    size="md"
                                    title={t('otlp.metrics.saved-view.rename-cancel')}
                                    aria-label={t('otlp.metrics.saved-view.rename-cancel')}
                                    data-otlp-metrics-saved-view-rename-cancel-action={view.id}
                                    data-otlp-metrics-saved-view-rename-cancel-owner="hertzbeat-ui-button"
                                    onClick={cancelRenameMetricsSavedQueryView}
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
                                    data-otlp-metrics-saved-view-select-action={view.id}
                                    data-otlp-metrics-saved-view-select-owner="hertzbeat-ui-button"
                                    data-otlp-metrics-saved-view-active={active ? 'true' : 'false'}
                                    onClick={() => replaceMetricsHref(view.route)}
                                  >
                                    <Table2 className="h-4 w-4" aria-hidden="true" />
                                    <span className="min-w-0 truncate">{view.label}</span>
                                  </HzButton>
                                  <HzButton
                                    type="button"
                                    intent="secondary"
                                    size="md"
                                    title={t('otlp.metrics.saved-view.rename')}
                                    aria-label={t('otlp.metrics.saved-view.rename')}
                                    data-otlp-metrics-saved-view-rename-action={view.id}
                                    data-otlp-metrics-saved-view-rename-owner="hertzbeat-ui-button"
                                    onClick={() => startRenameMetricsSavedQueryView(view)}
                                  >
                                    <Pencil className="h-4 w-4" aria-hidden="true" />
                                  </HzButton>
                                  <HzButton
                                    type="button"
                                    intent="secondary"
                                    size="md"
                                    title={t('otlp.metrics.saved-view.update')}
                                    aria-label={t('otlp.metrics.saved-view.update')}
                                    data-otlp-metrics-saved-view-update-action={view.id}
                                    data-otlp-metrics-saved-view-update-owner="hertzbeat-ui-button"
                                    onClick={() => updateMetricsSavedQueryView(view.id)}
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
                                data-otlp-metrics-saved-view-delete-action={view.id}
                                data-otlp-metrics-saved-view-delete-owner="hertzbeat-ui-button"
                                onClick={() => deleteMetricsSavedQueryView(view.id)}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </HzButton>
                            </React.Fragment>
                          );
                        })
                      ) : (
                        <span
                          className="min-w-0 truncate text-[12px] text-[#727b8c]"
                          data-otlp-metrics-saved-view-empty="local-route-snapshots"
                        >
                          {t('otlp.metrics.saved-view.empty')}
                        </span>
                      )}
                    </HzActionGroup>
                  </HzWorkbenchLayout>
                </HzPanelSurface>
              </HzPanelSurface>

              {relatedMetricCandidateRows.length ? (
                <HzPanelSurface
                  data-otlp-metrics-related-candidate-panel="backend-related-metric-candidate"
                  data-otlp-metrics-related-candidate-panel-owner="hertzbeat-ui-panel-surface"
                  padding="query"
                >
                  <HzDetailRows
                    data-otlp-metrics-related-candidate-context="backend-related-metric-candidate"
                    data-otlp-metrics-related-candidate-context-owner="hertzbeat-ui-detail-rows"
                    data-otlp-metrics-related-candidate-source={query.relatedMetricSource || ''}
                    data-otlp-metrics-related-candidate-family={query.relatedMetricFamily || ''}
                    data-otlp-metrics-related-candidate-reason={query.relatedMetricReason || ''}
                    data-otlp-metrics-related-candidate-labels={query.relatedMetricMatchedLabels || ''}
                    heading={t('otlp.metrics.related-candidate.title')}
                    rows={relatedMetricCandidateRows}
                  />
                </HzPanelSurface>
              ) : null}

              <HzPanelSurface
                data-otlp-metrics-chart-band="hertzbeat-ui-chart-band"
                data-otlp-metrics-chart-band-owner="hertzbeat-ui-panel-surface"
                padding="chart"
              >
                <HzWorkbenchLayout
                  as="div"
                  variant="chart-stack"
                  data-otlp-metrics-chart-layout="wide-series-chart-with-compact-meta"
                  data-otlp-metrics-chart-layout-owner="hertzbeat-ui-workbench-layout"
                  data-otlp-metrics-series-mode="entity-series-set"
                >
                  <HzPanelSurface
                    data-otlp-metrics-chart-panel="series-set-trend"
                    data-otlp-metrics-chart-panel-owner="hertzbeat-ui-panel-surface"
                    data-otlp-metrics-explorer-view="time-series"
                    data-otlp-metrics-explorer-view-owner="hertzbeat-ui-signal-time-series"
                    data-otlp-metrics-chart-panel-variant-owner="hertzbeat-ui-panel-surface"
                    padding="chart-inner"
                    variant="chart-inner"
                    data-otlp-metrics-chart-datazoom-state="local-observation"
                    data-otlp-metrics-chart-datazoom-preserve="preserved"
                  >
                    <HzWorkbenchLayout
                      as="div"
                      variant="metrics-chart-toolbar"
                      data-otlp-metrics-chart-header-layout="trend-toolbar"
                      data-otlp-metrics-chart-header-layout-owner="hertzbeat-ui-workbench-layout"
                    >
                      <HzPanelTitleLabel
                        icon={BarChart3}
                        data-otlp-metrics-chart-title-label="shared-panel-title-label"
                        data-otlp-metrics-chart-title-label-owner="hertzbeat-ui-panel-title-label"
                      >
                        {t('otlp.metrics.trend.title')}
                      </HzPanelTitleLabel>
                      <HzActionGroup
                        layout="end-wrap"
                        data-otlp-metrics-chart-toolbar-actions="shared-toolbar-actions"
                        data-otlp-metrics-chart-toolbar-actions-owner="hertzbeat-ui-action-group"
                      >
                        {hasMetricSeries ? (
                          <HzSignalSummaryStrip
                            data-otlp-metrics-chart-meta-row="compact-real-facts"
                            data-otlp-metrics-chart-meta-row-owner="hertzbeat-ui-signal-summary-strip"
                            layout="toolbar"
                            density="compact"
                            items={facts.map(fact => ({
                              id: fact.label,
                              label: fact.label,
                              value: fact.value
                            }))}
                          />
                        ) : null}
                        {metricsChartZoomDraftLabel ? (
                          <HzStatusBadge
                            data-otlp-metrics-chart-zoom-draft="pending-query-time"
                            data-otlp-metrics-chart-zoom-draft-owner="hertzbeat-ui-status-badge"
                            data-otlp-metrics-chart-zoom-draft-state="pending"
                            tone="info"
                            size="sm"
                            layout="zoom-draft"
                            label={t('time.context.zoom.draft')}
                            value={metricsChartZoomDraftLabel}
                            valueFont="mono"
                          />
                        ) : null}
                        {hasMetricSeries ? (
                          <HzButton
                            type="button"
                            intent="ghost"
                            size="sm"
                            data-otlp-metrics-chart-zoom-apply="local-to-query-time"
                            data-otlp-metrics-chart-zoom-apply-owner="hertzbeat-ui-button"
                            data-otlp-metrics-chart-zoom-apply-state={canApplyMetricsChartZoom ? 'ready' : 'idle'}
                            disabled={!canApplyMetricsChartZoom}
                            onClick={() => {
                              if (!metricsChartZoomContext) return;
                              setMetricsChartZoomRange(null);
                              applyMetricsTimeContext(metricsChartZoomContext);
                            }}
                          >
                            {t('time.context.zoom.apply')}
                          </HzButton>
                        ) : null}
                        <HzStatusBadge
                          data-otlp-metrics-chart-series-count="toolbar-count"
                          data-otlp-metrics-chart-series-count-owner="hertzbeat-ui-status-badge"
                          tone="neutral"
                          size="xs"
                        >
                            {workbenchState.seriesCountLabel}
                          </HzStatusBadge>
                      </HzActionGroup>
                    </HzWorkbenchLayout>
                    {hasMetricSeries ? (
                      <EChartsPanel
                        option={metricsChartOption}
                        height={300}
                        edge="metrics-chart"
                        data-otlp-metrics-echarts-edge="shared-metrics-chart"
                        data-otlp-metrics-echarts-edge-owner="hertzbeat-ui-echarts-panel"
                        tone="operator"
                        preserveDataZoom
                        onDataZoomChange={nextZoom => {
                          handleMetricsChartZoomChange(nextZoom);
                          const nextZoomContext = buildMetricsDataZoomTimeContext(
                            metricSeries,
                            nextZoom,
                            draftTimeContext.timeRange || query.timeRange || 'last-30m'
                          );
                          if (!nextZoomContext) return;
                          setDraft(previous => ({
                            ...previous,
                            timeRange: nextZoomContext.timeRange || previous.timeRange || 'last-30m',
                            from: nextZoomContext.from || '',
                            to: nextZoomContext.to || '',
                            start: nextZoomContext.start || '',
                            end: nextZoomContext.end || '',
                            refresh: nextZoomContext.refresh || previous.refresh || draftTimeContext.refresh || '',
                            live: nextZoomContext.live || previous.live || draftTimeContext.live || '',
                            tz: nextZoomContext.tz || previous.tz || draftTimeContext.tz || '',
                            timezone: nextZoomContext.timezone || previous.timezone || draftTimeContext.timezone || ''
                          }));
                        }}
                      />
                    ) : (
                      <HzTrendFrame
                        data-otlp-metrics-trend-frame="shared-compact-bars"
                        data-otlp-metrics-trend-frame-owner="hertzbeat-ui-trend-frame"
                      >
                        {trendBars.length ? (
                          trendBars.map(series => (
                            <HzTrendBar
                              key={series.key}
                              data-otlp-metrics-trend-bar={'real-series-point'}
                              data-otlp-metrics-trend-bar-owner="hertzbeat-ui-trend-bar"
                              heightPct={series.heightPct}
                              title={`${series.seriesName} · ${series.label} · ${series.valueLabel}`}
                            />
                          ))
                        ) : (
                          <HzStateNotice
                            data-otlp-metrics-trend-empty="no-real-series"
                            data-otlp-metrics-trend-empty-owner="hertzbeat-ui-state-notice"
                            data-otlp-metrics-empty-state="honest-no-series"
                            data-otlp-metrics-empty-state-context="applied-query-visible"
                            tone="info"
                            variant="hint"
                            frame="trend-empty"
                            title={t('otlp.metrics.trend.empty.title')}
                            description={t('otlp.metrics.trend.empty.copy')}
                          />
                        )}
                      </HzTrendFrame>
                    )}
                    {!hasMetricSeries ? null : (
                      <HzDataMetaText
                        data-otlp-metrics-trend-sample-helper="real-sample-count"
                        data-otlp-metrics-trend-sample-helper-owner="hertzbeat-ui-data-meta-text"
                        display="block"
                        casing="plain"
                        spacing="trend-helper"
                      >
                        {trendBars.length ? t('otlp.metrics.trend.sample-count', { count: trendBars.length }) : '-'}
                      </HzDataMetaText>
                    )}
                  </HzPanelSurface>
                </HzWorkbenchLayout>
              </HzPanelSurface>

              <HzWorkbenchLayout
                data-otlp-metrics-workbench-grid="series-detail-split"
                data-otlp-metrics-workbench-grid-owner="hertzbeat-ui-workbench-layout"
                variant={hasMetricSeries ? 'metrics-series-detail' : 'metrics-series-only'}
              >
                <HzPanelSurface
                  data-otlp-metrics-series-table="hertzbeat-ui-dense-metric-list"
                  data-otlp-metrics-series-table-mode="service-entity-series-set"
                  data-otlp-metrics-series-table-density="primary-scan"
                  data-otlp-metrics-series-table-owner="hertzbeat-ui-data-table"
                  data-otlp-metrics-series-table-panel-owner="hertzbeat-ui-panel-surface"
                  clip
                >
                  <HzPanelHeader
                    data-otlp-metrics-series-table-header="shared-panel-header"
                    data-otlp-metrics-series-table-header-owner="hertzbeat-ui-panel-header"
                    chrome="transparent-topless"
                    title={t('otlp.metrics.inventory.title')}
                    meta={
                      <HzStatusBadge
                        data-otlp-metrics-series-table-summary="result-count"
                        data-otlp-metrics-series-table-summary-owner="hertzbeat-ui-status-badge"
                        data-otlp-metrics-inventory-count="filtered-series"
                        tone="neutral"
                        size="xs"
                      >
                        {metricInventorySummary}
                      </HzStatusBadge>
                    }
                  />
                  <HzPanelSection
                    data-otlp-metrics-inventory-controls="search-sort"
                    data-otlp-metrics-inventory-controls-owner="hertzbeat-ui-panel-section"
                    spacing="stack-2"
                  >
                    <HzControlStack
                      layout="inline-wrap"
                      data-otlp-metrics-inventory-control-stack="shared-inline-controls"
                      data-otlp-metrics-inventory-control-stack-owner="hertzbeat-ui-control-stack"
                    >
                      <HzSearchFieldFrame
                        data-otlp-metrics-inventory-search-frame="shared-search-field-frame"
                        data-otlp-metrics-inventory-search-frame-owner="hertzbeat-ui-search-field-frame"
                        width="metrics-inventory"
                        icon={(
                          <HzSearchFieldIcon
                            icon={Search}
                            data-otlp-metrics-inventory-search-icon="metric-inventory"
                            data-otlp-metrics-inventory-search-icon-owner="hertzbeat-ui-search-field-icon"
                          />
                        )}
                      >
                        <HzInput
                          data-otlp-metrics-inventory-search-input="true"
                          data-otlp-metrics-inventory-search-input-owner="hertzbeat-ui-input"
                          aria-label={t('otlp.metrics.inventory.search.aria')}
                          value={metricInventorySearch}
                          onChange={event => replaceMetricsInventoryRoute(event.target.value, metricInventorySort)}
                          onInput={event => replaceMetricsInventoryRoute(event.currentTarget.value, metricInventorySort)}
                          placeholder={t('otlp.metrics.inventory.search.placeholder')}
                          inset="search-icon"
                          width="metrics-inventory-search"
                        />
                      </HzSearchFieldFrame>
                      <HzSelect
                        data-otlp-metrics-inventory-sort-select="true"
                        data-otlp-metrics-inventory-sort-select-owner="hertzbeat-ui-select"
                        aria-label={t('otlp.metrics.inventory.sort.aria')}
                        value={metricInventorySort}
                        onChange={event => replaceMetricsInventoryRoute(metricInventorySearch, event.target.value as OtlpMetricInventorySort)}
                        width="metrics-inventory-sort"
                        triggerClassName="text-[#d5dce8]"
                        options={[
                          { value: 'name', label: t('otlp.metrics.inventory.sort.name') },
                          { value: 'latest', label: t('otlp.metrics.inventory.sort.latest') },
                          { value: 'samples', label: t('otlp.metrics.inventory.sort.samples') },
                          { value: 'time-series', label: t('otlp.metrics.inventory.sort.time-series') }
                        ]}
                        optionDataAttributes={option => ({
                          'data-otlp-metrics-inventory-sort-option': option.value
                        })}
                      />
                      <HzSelect
                        data-otlp-metrics-export-format-select="true"
                        data-otlp-metrics-export-format-owner="hertzbeat-ui-select"
                        data-otlp-metrics-export-format-value={metricsExportFormat}
                        aria-label={t('otlp.metrics.export.format.aria')}
                        value={metricsExportFormat}
                        onChange={event => setMetricsExportFormat(event.target.value === 'jsonl' ? 'jsonl' : 'csv')}
                        width="metrics-inventory-sort"
                        triggerClassName="text-[#d5dce8]"
                        options={[
                          { value: 'csv' satisfies OtlpMetricsExportFormat, label: t('otlp.metrics.export.format.csv') },
                          { value: 'jsonl' satisfies OtlpMetricsExportFormat, label: t('otlp.metrics.export.format.jsonl') }
                        ]}
                        optionDataAttributes={option => ({
                          'data-otlp-metrics-export-format-option': option.value
                        })}
                      />
                      <HzSelect
                        data-otlp-metrics-export-scope-select="true"
                        data-otlp-metrics-export-scope-owner="hertzbeat-ui-select"
                        data-otlp-metrics-export-scope-value={metricsExportScope}
                        aria-label={t('otlp.metrics.export.scope.aria')}
                        value={metricsExportScope}
                        onChange={event => setMetricsExportScope(METRICS_EXPORT_SCOPES.includes(event.target.value as OtlpMetricsExportScope) ? event.target.value as OtlpMetricsExportScope : 'all')}
                        width="metrics-inventory-sort"
                        triggerClassName="text-[#d5dce8]"
                        options={[
                          { value: 'all' satisfies OtlpMetricsExportScope, label: t('otlp.metrics.export.scope.all') },
                          { value: 'selected' satisfies OtlpMetricsExportScope, label: t('otlp.metrics.export.scope.selected') }
                        ]}
                        optionDataAttributes={option => ({
                          'data-otlp-metrics-export-scope-option': option.value
                        })}
                      />
                      <HzButton
                        type="button"
                        intent="secondary"
                        size="md"
                        disabled={!hasMetricSeries}
                        onClick={() => downloadMetricsSeries(metricSeries, selectedMetricSeries)}
                        data-otlp-metrics-download-action="current-query"
                        data-otlp-metrics-download-owner="hertzbeat-ui-button"
                        data-otlp-metrics-download-format={metricsExportFormat}
                        data-otlp-metrics-download-scope={metricsExportScope}
                        data-otlp-metrics-download-series-count={metricSeries.length}
                        aria-label={t('otlp.metrics.export.download.aria', { format: metricsExportFormat.toUpperCase() })}
                      >
                        <HzButtonIcon
                          icon={Download}
                          data-otlp-metrics-download-icon="download"
                          data-otlp-metrics-download-icon-owner="hertzbeat-ui-button-icon"
                        />
                        {t('otlp.metrics.export.download')}
                      </HzButton>
                    </HzControlStack>
                  </HzPanelSection>
                  <HzPanelSection
                    data-otlp-metrics-series-set-summary-section="shared-panel-section"
                    data-otlp-metrics-series-set-summary-section-owner="hertzbeat-ui-panel-section"
                  >
                    <HzSignalSummaryStrip
                      data-otlp-metrics-series-set-summary="service-entity-scope"
                      data-otlp-metrics-series-set-summary-owner="hertzbeat-ui-signal-summary-strip"
                      data-otlp-metrics-series-set-summary-strip="inline-signal-summary"
                      data-otlp-metrics-series-set-summary-strip-owner="hertzbeat-ui-signal-summary-strip"
                      density="compact"
                      items={seriesSetScopeRows.map(row => ({
                        id: row.label,
                        label: row.label,
                        value: row.value
                      }))}
                    />
                  </HzPanelSection>
                  <HzDataTable
                    data-otlp-metrics-series-data-table="shared-data-table"
                    data-otlp-metrics-series-data-table-owner="hertzbeat-ui-data-table"
                    data-otlp-metrics-inventory="metric-inventory"
                    data-otlp-metrics-inventory-owner="hertzbeat-ui-data-table"
                    data-otlp-metrics-inventory-filtered-count={metricInventoryRows.length}
                    data-otlp-metrics-inventory-total-count={metricSeriesTableRows.length}
                    data-otlp-metrics-inventory-page-size={metricInventoryPageSize}
                    data-otlp-metrics-inventory-page-index={clampedMetricInventoryPageIndex}
                    variant="embedded"
                    rows={metricInventoryPageRows}
                    getRowKey={row => row.rowKey}
                    selectedRowKey={selectedMetricSeries?.key}
                    onRowClick={row => {
                      if (row.series) applySelectedMetricSeries(row.series);
                    }}
                    getRowProps={row => ({
                      'data-otlp-metrics-series-row': 'selectable-series',
                      'data-otlp-metrics-series-row-selected': selectedMetricSeries?.key === row.series?.key ? 'true' : 'false'
                    })}
                    emptyLabel={
                      <HzEmptyState
                        data-otlp-metrics-series-table-empty-state="shared-empty-state"
                        data-otlp-metrics-series-table-empty-state-owner="hertzbeat-ui-empty-state"
                        data-otlp-metrics-empty-guidance="operator-no-data-guidance"
                        title={workbenchState.emptyTitle}
                        description={workbenchState.noMetricsTitle}
                        layout="table-panel"
                      />
                    }
                    columns={[
                      {
                        key: 'name',
                        header: t('otlp.metrics.series.context.metric-name'),
                        render: row => row.series ? (
                          <HzButton
                            type="button"
                            size="xs"
                            intent="ghost"
                            data-otlp-metrics-inventory-query-action={row.series.key}
                            data-otlp-metrics-inventory-query-action-owner="hertzbeat-ui-button"
                            aria-label={t('otlp.metrics.inventory.query-action.aria', { metric: row.title })}
                            onClick={event => {
                              event.stopPropagation();
                              applyMetricInventoryQuery(row.title, row.series);
                            }}
                            className="min-w-0 justify-start truncate font-mono"
                          >
                            {row.title}
                          </HzButton>
                        ) : (
                          <HzDataCellText variant="title" display="block">{row.title}</HzDataCellText>
                        )
                      },
                      {
                        key: 'description',
                        header: t('otlp.metrics.inventory.column.description'),
                        render: row => (
                          <HzDataCellText
                            variant="meta"
                            display="block"
                            casing="plain"
                            data-otlp-metrics-inventory-description-owner="hertzbeat-ui-data-cell-text"
                          >
                            {row.description}
                          </HzDataCellText>
                        )
                      },
                      {
                        key: 'type',
                        header: t('otlp.metrics.inventory.column.type'),
                        render: row => (
                          <HzDataCellText
                            variant="value"
                            data-otlp-metrics-inventory-type-owner="hertzbeat-ui-data-cell-text"
                          >
                            {row.metricType}
                          </HzDataCellText>
                        )
                      },
                      {
                        key: 'unit',
                        header: t('otlp.metrics.inventory.column.unit'),
                        render: row => (
                          <HzDataCellText
                            variant="value"
                            font="mono"
                            data-otlp-metrics-inventory-unit-owner="hertzbeat-ui-data-cell-text"
                          >
                            {row.unit}
                          </HzDataCellText>
                        )
                      },
                      {
                        key: 'service',
                        header: t('otlp.metrics.field.service'),
                        render: row => {
                          const groupFilter = buildMetricGroupValueFilter(draft.groupBy, row.series);
                          const serviceFilter = buildMetricSeriesServiceFilter(row.series);
                          return groupFilter ? (
                            <HzButton
                              type="button"
                              size="xs"
                              intent="ghost"
                              data-otlp-metrics-series-group-filter-action={groupFilter.groupBy}
                              data-otlp-metrics-series-group-filter-value={groupFilter.value}
                              data-otlp-metrics-series-group-filter-owner="hertzbeat-ui-button"
                              aria-label={t('otlp.metrics.group.filter-action.aria', { groupBy: groupFilter.groupBy, value: groupFilter.value })}
                              onClick={event => {
                                event.stopPropagation();
                                applyMetricGroupValueFilter(groupFilter.groupBy, groupFilter.value);
                              }}
                              className="min-w-0 justify-start truncate font-mono"
                            >
                              {groupFilter.value}
                            </HzButton>
                          ) : serviceFilter ? (
                            <HzButton
                              type="button"
                              size="xs"
                              intent="ghost"
                              data-otlp-metrics-series-service-filter-action={serviceFilter.value}
                              data-otlp-metrics-series-service-filter-owner="hertzbeat-ui-button"
                              aria-label={t('otlp.metrics.service.filter-action.aria', { service: serviceFilter.value })}
                              onClick={event => {
                                event.stopPropagation();
                                applyMetricSeriesServiceFilter(serviceFilter.value, row.series);
                              }}
                              className="min-w-0 justify-start truncate font-mono"
                            >
                              {serviceFilter.value}
                            </HzButton>
                          ) : (
                            <HzDataCellText variant="value">{row.copy}</HzDataCellText>
                          );
                        }
                      },
                      {
                        key: 'entity',
                        header: t('otlp.metrics.series.context.entity'),
                        render: row => (
                          <HzDataCellStack
                            display="block"
                            width="metrics-entity"
                            data-otlp-metrics-series-entity="true"
                            data-otlp-metrics-series-entity-owner="hertzbeat-ui-data-cell-stack"
                          >
                            <HzDataCellText
                              variant="value"
                              display="block"
                              tone="strong"
                              weight="semibold"
                              data-otlp-metrics-series-entity-label-owner="hertzbeat-ui-data-cell-text"
                            >
                              {row.entityLabel}
                            </HzDataCellText>
                            <HzDataCellText
                              variant="meta"
                              display="block"
                              spacing="stack-tight"
                              casing="plain"
                              tone={row.entityState === 'present' ? 'success' : 'muted'}
                              data-otlp-metrics-series-entity-meta-owner="hertzbeat-ui-data-cell-text"
                              data-otlp-metrics-series-entity-state={row.entityState}
                            >
                              {row.entityMeta}
                            </HzDataCellText>
                          </HzDataCellStack>
                        )
                      },
                      {
                        key: 'latest',
                        header: t('otlp.metrics.evidence.latest-value'),
                        render: row => <HzDataCellText variant="value" font="mono" tone="bright" data-otlp-metrics-series-latest-owner="hertzbeat-ui-data-cell-text">{row.meta}</HzDataCellText>
                      },
                      {
                        key: 'points',
                        header: t('otlp.metrics.evidence.samples'),
                        render: row => <HzDataCellText variant="value">{row.sampleCount ?? row.pointCount}</HzDataCellText>
                      },
                      {
                        key: 'time-series',
                        header: t('otlp.metrics.inventory.column.time-series'),
                        render: row => (
                          <HzDataCellText
                            variant="value"
                            data-otlp-metrics-inventory-time-series-owner="hertzbeat-ui-data-cell-text"
                          >
                            {row.timeSeriesCount}
                          </HzDataCellText>
                        )
                      },
                      {
                        key: 'time',
                        header: t('otlp.metrics.table.recent-time'),
                        render: () => <HzDataCellText variant="timestamp">{formatTime(latestObservedAt)}</HzDataCellText>
                      }
                    ]}
                  />
                  <HzPaginationBar
                    data-otlp-metrics-inventory-pagination="shared-pagination-bar"
                    data-otlp-metrics-inventory-pagination-owner="hertzbeat-ui-pagination-bar"
                    summary={metricInventoryPaginationSummary}
                    pageSizeLabel={t('common.page-size')}
                    pageSizeValue={metricInventoryPageSize}
                    pageSizeOptions={METRIC_INVENTORY_PAGE_SIZE_OPTIONS.map(value => ({
                      value,
                      label: value
                    }))}
                    onPageSizeChange={value => replaceMetricsInventoryPageRoute(value, DEFAULT_METRIC_INVENTORY_PAGE_INDEX)}
                    pageJumpLabel={t('common.page')}
                    pageJumpValue={String(clampedMetricInventoryPageIndex + 1)}
                    pageJumpMax={metricInventoryTotalPages}
                    onPageJumpChange={value => {
                      const nextPage = Number(value);
                      if (!Number.isInteger(nextPage)) return;
                      replaceMetricsInventoryPageRoute(metricInventoryPageSize, String(Math.max(0, nextPage - 1)));
                    }}
                    previousLabel={t('common.previous-page')}
                    nextLabel={t('common.next-page')}
                    previousDisabled={clampedMetricInventoryPageIndex <= 0}
                    nextDisabled={clampedMetricInventoryPageIndex >= metricInventoryTotalPages - 1}
                    onPrevious={() => replaceMetricsInventoryPageRoute(metricInventoryPageSize, String(Math.max(0, clampedMetricInventoryPageIndex - 1)))}
                    onNext={() => replaceMetricsInventoryPageRoute(metricInventoryPageSize, String(clampedMetricInventoryPageIndex + 1))}
                    pageSizeSelectProps={{
                      'data-otlp-metrics-inventory-pagination-page-size': 'true',
                      optionDataAttributes: option => ({
                        'data-otlp-metrics-inventory-page-size-option': option.value
                      })
                    }}
                    pageJumpInputProps={{
                      'data-otlp-metrics-inventory-pagination-page-jump': 'true'
                    }}
                    previousButtonProps={{
                      'data-otlp-metrics-inventory-pagination-previous': 'true'
                    }}
                    nextButtonProps={{
                      'data-otlp-metrics-inventory-pagination-next': 'true'
                    }}
                  />
                </HzPanelSurface>

                {hasMetricSeries && selectedMetricSeries ? (
                <HzPanelSurface
                  data-otlp-metrics-detail-panel="hertzbeat-ui-detail-panel"
                  data-otlp-metrics-detail-panel-owner="hertzbeat-ui-panel-surface"
                  data-otlp-metrics-detail-panel-priority="secondary-inspector"
                  data-otlp-metrics-detail-panel-stickiness-owner="hertzbeat-ui-panel-surface"
                  data-otlp-metrics-detail-source-context={sourceContextKind}
                  data-otlp-metrics-detail-source-match={selectedMetricSourceMatch}
                  data-otlp-metrics-detail-selected-series={selectedMetricSeries.key}
                  data-otlp-metrics-detail-selected-series-index={selectedMetricSeriesIndex}
                  data-otlp-metrics-detail-requested-trace={requestedMetricTraceId}
                  data-otlp-metrics-detail-requested-span={requestedMetricSpanId}
                  data-otlp-metrics-detail-requested-service={requestedMetricServiceName}
                  data-otlp-metrics-detail-selected-trace={selectedMetricTraceId}
                  data-otlp-metrics-detail-selected-span={selectedMetricSpanId}
                  data-otlp-metrics-detail-selected-service={selectedMetricServiceName}
                  clip
                  stickiness="top-4"
                >
                  <HzPanelHeader
                    data-otlp-metrics-detail-panel-header="shared-panel-header"
                    data-otlp-metrics-detail-panel-header-owner="hertzbeat-ui-panel-header"
                    chrome="transparent"
                    eyebrow={t('otlp.metrics.detail.eyebrow')}
                    title={firstSeries.title}
                    subtitle={workbenchState.chartLabel}
                  />
                  <HzPanelSection
                    divider="none"
                    data-otlp-metrics-detail-panel-body="compact-evidence-stack"
                    data-otlp-metrics-detail-panel-body-owner="hertzbeat-ui-panel-section"
                  >
                    <HzSignalSummaryStrip
                      data-otlp-metrics-detail-summary-stats="shared-stat-strip"
                      data-otlp-metrics-detail-summary-stats-owner="hertzbeat-ui-signal-summary-strip"
                      layout="detail"
                      density="compact"
                      items={metrics.map(metric => ({
                        id: metric.label,
                        label: metric.label,
                        value: metric.value
                      }))}
                    />
                    <HzActionGroup
                      layout="inline-wrap"
                      data-otlp-metrics-inspector-toggle="graph-table"
                      data-otlp-metrics-inspector-toggle-owner="hertzbeat-ui-action-group"
                      data-otlp-metrics-inspector-view={metricsInspectorView}
                      aria-label={t('otlp.metrics.inspector.aria')}
                    >
                      <HzButton
                        type="button"
                        size="sm"
                        intent={metricsInspectorView === 'graph' ? 'secondary' : 'ghost'}
                        aria-pressed={metricsInspectorView === 'graph'}
                        data-otlp-metrics-inspector-action="graph"
                        data-otlp-metrics-inspector-action-owner="hertzbeat-ui-button"
                        data-otlp-metrics-inspector-action-active={metricsInspectorView === 'graph' ? 'true' : 'false'}
                        onClick={() => applyMetricsInspectorView('graph')}
                      >
                        <HzButtonIcon
                          icon={BarChart3}
                          data-otlp-metrics-inspector-action-icon="graph"
                          data-otlp-metrics-inspector-action-icon-owner="hertzbeat-ui-button-icon"
                        />
                        {t('otlp.metrics.inspector.graph')}
                      </HzButton>
                      <HzButton
                        type="button"
                        size="sm"
                        intent={metricsInspectorView === 'table' ? 'secondary' : 'ghost'}
                        aria-pressed={metricsInspectorView === 'table'}
                        data-otlp-metrics-inspector-action="table"
                        data-otlp-metrics-inspector-action-owner="hertzbeat-ui-button"
                        data-otlp-metrics-inspector-action-active={metricsInspectorView === 'table' ? 'true' : 'false'}
                        onClick={() => applyMetricsInspectorView('table')}
                      >
                        <HzButtonIcon
                          icon={Table2}
                          data-otlp-metrics-inspector-action-icon="table"
                          data-otlp-metrics-inspector-action-icon-owner="hertzbeat-ui-button-icon"
                        />
                        {t('otlp.metrics.inspector.table')}
                      </HzButton>
                    </HzActionGroup>
                    <HzDetailRows
                      data-otlp-metrics-detail-context-rows="shared-detail-rows"
                      data-otlp-metrics-detail-context-rows-owner="hertzbeat-ui-detail-rows"
                      offset="top"
                      heading={t('otlp.metrics.detail.query-context')}
                      rows={metricsDetailContextRows}
                    />
                    {selectedSeriesContextRows.length > 0 ? (
                      <HzDetailRows
                        data-otlp-metrics-selected-series-context="selected-series-attribution"
                        data-otlp-metrics-selected-series-context-owner="hertzbeat-ui-detail-rows"
                        aria-label={t('otlp.metrics.detail.selected-series.aria')}
                        boundary="top"
                        heading={t('otlp.metrics.series.context.selected-series')}
                        rows={selectedSeriesContextDetailRows}
                      />
                    ) : null}
                    {metricsInspectorView === 'table' ? (
                      <HzDataTable
                        data-otlp-metrics-inspector-sample-table="selected-series-samples"
                        data-otlp-metrics-inspector-sample-table-owner="hertzbeat-ui-data-table"
                        data-otlp-metrics-inspector-sample-table-view={metricsInspectorView}
                        data-otlp-metrics-inspector-sample-table-series={selectedMetricSeries.key}
                        data-otlp-metrics-inspector-sample-table-samples={selectedSeriesSampleRows.length}
                        data-otlp-metrics-inspector-sample-table-trace={selectedMetricTraceId}
                        data-otlp-metrics-inspector-sample-table-span={selectedMetricSpanId}
                        variant="embedded"
                        rows={selectedSeriesSampleRows}
                        getRowKey={row => row.key}
                        emptyLabel={t('otlp.metrics.inspector.empty')}
                        columns={[
                          {
                            key: 'index',
                            header: t('otlp.metrics.inspector.column.index'),
                            render: row => <HzDataCellText variant="meta">{row.index}</HzDataCellText>
                          },
                          {
                            key: 'timestamp',
                            header: t('otlp.metrics.inspector.column.timestamp'),
                            render: row => <HzDataCellText variant="timestamp">{row.timestamp}</HzDataCellText>
                          },
                          {
                            key: 'rawTimestamp',
                            header: t('otlp.metrics.inspector.column.raw-timestamp'),
                            render: row => <HzDataCellText variant="value" font="mono">{row.rawTimestamp}</HzDataCellText>
                          },
                          {
                            key: 'value',
                            header: t('otlp.metrics.inspector.column.value'),
                            render: row => <HzDataCellText variant="value" font="mono" tone={row.value === '-' ? 'muted' : 'bright'}>{row.value}</HzDataCellText>
                          },
                          {
                            key: 'state',
                            header: t('otlp.metrics.inspector.column.state'),
                            render: row => <HzDataCellText variant="meta">{row.state}</HzDataCellText>
                          }
                        ]}
                      />
                    ) : selectedSeriesEvidenceRows.length > 0 ? (
                      <HzDetailRows
                        data-otlp-metrics-selected-series-evidence="real-sample-evidence"
                        data-otlp-metrics-selected-series-evidence-owner="hertzbeat-ui-detail-rows"
                        data-otlp-metrics-selected-series-evidence-series={selectedMetricSeries.key}
                        data-otlp-metrics-selected-series-evidence-trace={selectedMetricTraceId}
                        data-otlp-metrics-selected-series-evidence-span={selectedMetricSpanId}
                        data-otlp-metrics-selected-series-evidence-samples={selectedSeriesEvidenceRows.length}
                        aria-label={t('otlp.metrics.detail.evidence.aria')}
                        boundary="top"
                        heading={t('otlp.metrics.detail.evidence.heading')}
                        rows={selectedSeriesEvidenceDetailRows}
                      />
                    ) : null}
                  </HzPanelSection>
                  <HzPanelSection
                    divider="top"
                    data-otlp-metrics-handoff-action-section="shared-panel-section"
                    data-otlp-metrics-handoff-action-section-owner="hertzbeat-ui-panel-section"
                  >
                    <HzActionGroup
                      layout="grid-2"
                      data-otlp-metrics-handoff-actions="compact-context-actions"
                      data-otlp-metrics-handoff-actions-owner="hertzbeat-ui-action-group"
                    >
                      {canOpenEntity ? (
                        <HzButtonLink component={Link} href={handoffLinks.entityHref} size="md" layout="full" data-otlp-metrics-entity-action="true">
                          {t('topology.context-link.entity')}
                        </HzButtonLink>
                      ) : (
                        <HzDisabledActionShell
                          title={missingEntityHandoffTitle}
                          data-otlp-metrics-entity-action-disabled-shell-owner="hertzbeat-ui-disabled-action-shell"
                          layout="full"
                        >
                          <HzButton
                            data-otlp-metrics-entity-action-disabled="missing-entity-id"
                            size="md"
                            layout="full"
                            disabled
                            title={missingEntityHandoffTitle}
                            aria-label={missingEntityHandoffTitle}
                          >
                            {t('topology.context-link.entity')}
                          </HzButton>
                        </HzDisabledActionShell>
                      )}
                      <HzButtonLink component={Link} href={handoffLinks.alertHandlingHref} size="md" layout="full" data-otlp-metrics-alert-handling-action="true">
                        {t('otlp.metrics.handoff.alerts')}
                      </HzButtonLink>
                      <HzButtonLink component={Link} href={handoffLinks.alertRulesHref} size="md" layout="full" data-otlp-metrics-alert-rule-action="true">
                        {t('explorer.actions.create-alert')}
                      </HzButtonLink>
                      <HzButtonLink component={Link} href={handoffLinks.dashboardHref} size="md" layout="full" data-otlp-metrics-dashboard-action="true">
                        {t('explorer.actions.add-dashboard')}
                      </HzButtonLink>
                      <HzButtonLink component={Link} href={handoffLinks.logsHref} size="md" layout="full" data-otlp-metrics-logs-action="true">
                        {t('otlp.metrics.handoff.logs.action')}
                      </HzButtonLink>
                      <HzButtonLink component={Link} href={handoffLinks.tracesHref} size="md" layout="full" data-otlp-metrics-traces-action="true">
                        {t('otlp.metrics.handoff.traces.action')}
                      </HzButtonLink>
                      <HzButtonLink component={Link} href={handoffLinks.entitiesHref} size="md" layout="full" data-otlp-metrics-entities-action="true">
                        {t('overview.lane.entities.title')}
                      </HzButtonLink>
                    </HzActionGroup>
                  </HzPanelSection>
                  <HzPanelSection
                    divider="top"
                    spacing="stack-2"
                    data-otlp-metrics-secondary-context="collapsible-evidence-diagnostics"
                    data-otlp-metrics-secondary-context-owner="hertzbeat-ui-panel-section"
                  >
                    <HzCollapsibleSection
                      data-otlp-metrics-attribute-summary="selected-series-labels"
                      data-otlp-metrics-attribute-summary-panel="collapsible"
                      data-otlp-metrics-attribute-summary-owner="hertzbeat-ui-collapsible-section"
                      aria-label={t('otlp.metrics.attributes.aria')}
                      title={t('otlp.metrics.attributes.title')}
                      meta={t('otlp.metrics.attributes.meta')}
                      surface="inset"
                    >
                      <HzControlStack
                        layout="inline-wrap"
                        data-otlp-metrics-attribute-controls="search"
                        data-otlp-metrics-attribute-controls-owner="hertzbeat-ui-control-stack"
                      >
                        <HzSearchFieldFrame
                          data-otlp-metrics-attribute-search-frame="shared-search-field-frame"
                          data-otlp-metrics-attribute-search-frame-owner="hertzbeat-ui-search-field-frame"
                          width="metrics-inventory"
                          icon={(
                            <HzSearchFieldIcon
                              icon={Search}
                              data-otlp-metrics-attribute-search-icon="metric-attribute"
                              data-otlp-metrics-attribute-search-icon-owner="hertzbeat-ui-search-field-icon"
                            />
                          )}
                        >
                          <HzInput
                            data-otlp-metrics-attribute-search-input="true"
                            data-otlp-metrics-attribute-search-input-owner="hertzbeat-ui-input"
                            aria-label={t('otlp.metrics.attributes.search.aria')}
                            value={metricAttributeSearch}
                            onChange={event => replaceMetricsAttributeSearchRoute(event.target.value)}
                            onInput={event => replaceMetricsAttributeSearchRoute(event.currentTarget.value)}
                            placeholder={t('otlp.metrics.attributes.search.placeholder')}
                            inset="search-icon"
                            width="metrics-inventory-search"
                          />
                        </HzSearchFieldFrame>
                      </HzControlStack>
                      <HzDataTable
                        data-otlp-metrics-attribute-table="selected-series-labels"
                        data-otlp-metrics-attribute-table-owner="hertzbeat-ui-data-table"
                        data-otlp-metrics-attribute-table-count={selectedSeriesAttributeRows.length}
                        variant="embedded"
                        rows={selectedSeriesAttributeRows}
                        getRowKey={row => row.key}
                        emptyLabel={t('otlp.metrics.attributes.empty')}
                        columns={[
                          {
                            key: 'name',
                            header: t('otlp.metrics.attributes.column.name'),
                            render: row => <HzDataCellText variant="value" font="mono">{row.name}</HzDataCellText>
                          },
                          {
                            key: 'value',
                            header: t('otlp.metrics.attributes.column.value'),
                            render: row => <HzDataCellText variant="meta" display="block" casing="plain">{row.value}</HzDataCellText>
                          },
                          {
                            key: 'filter',
                            header: t('otlp.metrics.attributes.column.filter'),
                            render: row => (
                              <HzButton
                                type="button"
                                size="xs"
                                intent="ghost"
                                data-otlp-metrics-attribute-filter-action={row.name}
                                data-otlp-metrics-attribute-filter-action-owner="hertzbeat-ui-button"
                                aria-label={t('otlp.metrics.attributes.filter-action.aria', { name: row.name, value: row.value })}
                                onClick={() => applyMetricAttributeFilter(row.name, row.value, selectedMetricSeries)}
                              >
                                <HzButtonIcon
                                  icon={Filter}
                                  data-otlp-metrics-attribute-filter-action-icon={row.name}
                                  data-otlp-metrics-attribute-filter-action-icon-owner="hertzbeat-ui-button-icon"
                                />
                                {t('otlp.metrics.attributes.filter-action')}
                              </HzButton>
                            )
                          },
                          {
                            key: 'exclude',
                            header: t('otlp.metrics.attributes.column.exclude'),
                            render: row => (
                              <HzButton
                                type="button"
                                size="xs"
                                intent="ghost"
                                data-otlp-metrics-attribute-filter-out-action={row.name}
                                data-otlp-metrics-attribute-filter-out-action-owner="hertzbeat-ui-button"
                                aria-label={t('otlp.metrics.attributes.filter-out-action.aria', { name: row.name, value: row.value })}
                                onClick={() => applyMetricAttributeExcludeFilter(row.name, row.value, selectedMetricSeries)}
                              >
                                <HzButtonIcon
                                  icon={X}
                                  data-otlp-metrics-attribute-filter-out-action-icon={row.name}
                                  data-otlp-metrics-attribute-filter-out-action-icon-owner="hertzbeat-ui-button-icon"
                                />
                                {t('otlp.metrics.attributes.filter-out-action')}
                              </HzButton>
                            )
                          },
                          {
                            key: 'exists',
                            header: t('otlp.metrics.attributes.column.exists'),
                            render: row => (
                              <HzButton
                                type="button"
                                size="xs"
                                intent="ghost"
                                data-otlp-metrics-attribute-exists-action={row.name}
                                data-otlp-metrics-attribute-exists-action-owner="hertzbeat-ui-button"
                                aria-label={t('otlp.metrics.attributes.exists-action.aria', { name: row.name })}
                                onClick={() => applyMetricAttributeExistsFilter(row.name, selectedMetricSeries)}
                              >
                                <HzButtonIcon
                                  icon={Check}
                                  data-otlp-metrics-attribute-exists-action-icon={row.name}
                                  data-otlp-metrics-attribute-exists-action-icon-owner="hertzbeat-ui-button-icon"
                                />
                                {t('otlp.metrics.attributes.exists-action')}
                              </HzButton>
                            )
                          },
                          {
                            key: 'not-exists',
                            header: t('otlp.metrics.attributes.column.not-exists'),
                            render: row => (
                              <HzButton
                                type="button"
                                size="xs"
                                intent="ghost"
                                data-otlp-metrics-attribute-not-exists-action={row.name}
                                data-otlp-metrics-attribute-not-exists-action-owner="hertzbeat-ui-button"
                                aria-label={t('otlp.metrics.attributes.not-exists-action.aria', { name: row.name })}
                                onClick={() => applyMetricAttributeNotExistsFilter(row.name, selectedMetricSeries)}
                              >
                                <HzButtonIcon
                                  icon={Ban}
                                  data-otlp-metrics-attribute-not-exists-action-icon={row.name}
                                  data-otlp-metrics-attribute-not-exists-action-icon-owner="hertzbeat-ui-button-icon"
                                />
                                {t('otlp.metrics.attributes.not-exists-action')}
                              </HzButton>
                            )
                          },
                          {
                            key: 'replace',
                            header: t('otlp.metrics.attributes.column.replace'),
                            render: row => (
                              <HzButton
                                type="button"
                                size="xs"
                                intent="ghost"
                                data-otlp-metrics-attribute-replace-action={row.name}
                                data-otlp-metrics-attribute-replace-action-owner="hertzbeat-ui-button"
                                aria-label={t('otlp.metrics.attributes.replace-action.aria', { name: row.name, value: row.value })}
                                onClick={() => applyMetricAttributeReplaceFilter(row.name, row.value, selectedMetricSeries)}
                              >
                                <HzButtonIcon
                                  icon={Replace}
                                  data-otlp-metrics-attribute-replace-action-icon={row.name}
                                  data-otlp-metrics-attribute-replace-action-icon-owner="hertzbeat-ui-button-icon"
                                />
                                {t('otlp.metrics.attributes.replace-action')}
                              </HzButton>
                            )
                          },
                          {
                            key: 'group',
                            header: t('otlp.metrics.attributes.column.group'),
                            render: row => (
                              <HzButton
                                type="button"
                                size="xs"
                                intent="ghost"
                                data-otlp-metrics-attribute-group-action={row.name}
                                data-otlp-metrics-attribute-group-action-owner="hertzbeat-ui-button"
                                aria-label={t('otlp.metrics.attributes.group-action.aria', { name: row.name })}
                                onClick={() => applyMetricAttributeGroupBy(row.name, selectedMetricSeries)}
                              >
                                <HzButtonIcon
                                  icon={Workflow}
                                  data-otlp-metrics-attribute-group-action-icon={row.name}
                                  data-otlp-metrics-attribute-group-action-icon-owner="hertzbeat-ui-button-icon"
                                />
                                {t('otlp.metrics.attributes.group-action')}
                              </HzButton>
                            )
                          }
                        ]}
                      />
                    </HzCollapsibleSection>
                    {linkedRecordRows.length > 0 ? (
                      <HzCollapsibleSection
                        data-otlp-metrics-linked-record-summary="log-trace-alert-links"
                        data-otlp-metrics-linked-record-summary-panel="collapsible"
                        data-otlp-metrics-linked-record-summary-owner="hertzbeat-ui-collapsible-section"
                        aria-label={t('otlp.metrics.linked-records.aria')}
                        title={t('otlp.metrics.linked-records.title')}
                        meta={t('otlp.metrics.linked-records.meta')}
                        surface="inset"
                      >
                        <div
                          data-otlp-metrics-linked-record-handoff="shared-context-handoff"
                          data-otlp-metrics-linked-record-handoff-owner="hertzbeat-ui-context-handoff"
                        >
                          <HzContextHandoff
                            title={t('otlp.metrics.linked-records.handoff.title')}
                            context={t('otlp.metrics.linked-records.meta')}
                            targets={linkedRecordHandoffTargets}
                            frame="flush"
                          />
                        </div>
                      </HzCollapsibleSection>
                    ) : null}
                    {attributionDiagnostics.length > 0 ? (
                      <HzCollapsibleSection
                        data-otlp-metrics-attribution-diagnostics-panel="collapsible"
                        data-otlp-metrics-attribution-diagnostics-panel-owner="hertzbeat-ui-collapsible-section"
                        aria-label={t('otlp.metrics.attribution.diagnostics.aria')}
                        title={t('otlp.metrics.attribution.diagnostics.title')}
                        meta="hertzbeat.*"
                        surface="inset"
                      >
                        <HzAttributeDiagnostics
                          data-otlp-metrics-attribution-diagnostics="hertzbeat-attribute-diagnostics"
                          data-otlp-metrics-attribution-diagnostics-owner="hertzbeat-ui-attribute-diagnostics"
                          title={t('otlp.metrics.attribution.diagnostics.title')}
                          namespaceLabel="hertzbeat.*"
                          rows={attributionDiagnosticRows}
                          frame="embedded"
                        />
                      </HzCollapsibleSection>
                    ) : null}
                    <HzCollapsibleSection
                      data-otlp-metrics-entity-context="hertzbeat-signal-entity-context"
                      data-otlp-metrics-entity-context-panel="collapsible"
                      data-otlp-metrics-entity-context-panel-owner="hertzbeat-ui-collapsible-section"
                      aria-label={t('otlp.metrics.entity-context.aria')}
                      title={t('otlp.metrics.entity-context.title')}
                      meta={t('otlp.metrics.entity-context.current-window')}
                      surface="inset"
                    >
                      <HzDetailRows
                        data-otlp-metrics-entity-context-owner="hertzbeat-ui-detail-rows"
                        heading={t('otlp.metrics.entity-context.title')}
                        padding="compact-y"
                        rows={entityContextDetailRows}
                      />
                    </HzCollapsibleSection>
                  </HzPanelSection>
                </HzPanelSurface>
                ) : (
                  <HzAssistiveMarker
                    data-otlp-metrics-detail-panel-empty="suppressed-until-real-series"
                    data-otlp-metrics-detail-panel-empty-owner="hertzbeat-ui-assistive-marker"
                  />
                )}
              </HzWorkbenchLayout>
          </HzSignalWorkbenchShell>
        );
      }}
    </ClientWorkbench>
  );
}
