'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, ExternalLink, LayoutDashboard, Maximize2, Minimize2, Pencil, RefreshCw, Save, Trash2, X } from 'lucide-react';
import {
  HzButton,
  HzButtonLink,
  HzDataCellStack,
  HzDataCellText,
  HzDataMetaText,
  HzDataTable,
  HzEmptyState,
  HzExplorerFrame,
  HzInput,
  HzPanelSurface,
  HzSelect,
  HzStatusBadge,
  type HzDataColumn
} from '@hertzbeat/ui';
import { useI18n } from '../../components/providers/i18n-provider';
import {
  applySignalDashboardTimeRange,
  buildSignalDashboardCompositionFromDrafts,
  buildSignalDashboardExecutionPlans,
  buildSignalDashboardPanelRuntimeRenderDescriptor,
  buildSignalDashboardRuntimeEvidenceSourceHandoff,
  buildSignalDashboardRuntimeEvidenceFilters,
  buildSignalDashboardRuntimeEvidenceFilterSuggestions,
  buildSignalDashboardRuntimeMetricsTooltip,
  buildSignalDashboardPanelEditHref,
  buildSignalDashboardRuntimeSyncCrosshair,
  buildSignalDashboardRuntimeSyncTooltip,
  buildSignalDashboardVariableOptions,
  buildSignalOperationDrilldownDashboard,
  buildSignalServiceOverviewDashboard,
  createSignalDashboardPanelDraftsFromFilterSelection,
  createSignalDashboardPanelDraftFromRuntimeBreakout,
  createSignalDashboardPanelDraftFromRuntimeEvidence,
  deleteSignalDashboard,
  executeSignalDashboardPanelPlan,
  filterSignalDashboardVariableOptions,
  loadSignalDashboards,
  mergeSignalDashboardDraftsIntoComposition,
  normalizeSignalDashboardKey,
  parseSignalDashboardVariables,
  resolveSignalDashboardRefreshState,
  resolveSignalDashboardTimeRange,
  resolveSignalDashboardPreviewPanels,
  saveSignalDashboard,
  selectSignalDashboardVariableOption,
  readSignalDashboardWidgetPanelEditMetadata,
  summarizeSignalDashboardPanelRuntime,
  updateSignalDashboardPanelLayout,
  updateSignalDashboardVariables,
  type SignalDashboard,
  type SignalDashboardPanelExecutionResult,
  type SignalDashboardLayoutPatch,
  type SignalDashboardPanelRuntimeRenderDescriptor,
  type SignalDashboardTimeRange,
  type SignalDashboardVariable,
  type SignalDashboardVariableType
} from '../../lib/signal-dashboards';
import {
  deleteSignalDashboardPanelDraft,
  duplicateSignalDashboardPanelDraft,
  loadAllSignalDashboardPanelDrafts,
  saveSignalDashboardPanelDraft,
  type SignalDashboardPanelDraft,
  type SignalDashboardPanelDraftSignal,
  type SignalDashboardPanelVisualization
} from '../../lib/signal-dashboard-panel-drafts';
import {
  createSignalDashboardPanelDraftFromSavedView,
  deleteSignalSavedQueryView,
  loadAllSignalSavedQueryViewsWithDiagnostics,
  saveSignalSavedQueryView,
  type SignalSavedViewSignal,
  type SignalSavedQueryViewWithSignal
} from '../../lib/signal-saved-views';
import {
  buildDashboardDeepLinkHref,
  buildDashboardReturnHref,
  buildDashboardTimeRangeDeepLinkHref,
  buildDashboardVariableDeepLinkHref,
  readDashboardVariableUrlOverrides,
  type SearchParamsRecord
} from '../../lib/dashboard/navigation';

type DraftLoadState = 'loading' | 'ready' | 'empty' | 'error';
type SavedViewLoadState = DraftLoadState | 'partial';
type CompositionState = 'loading' | 'ready' | 'empty' | 'saving' | 'saved' | 'error';
type SavedViewDraftFields = {
  label: string;
  description: string;
};

const SIGNALS: SignalDashboardPanelDraftSignal[] = ['logs', 'traces', 'metrics', 'alerts'];
const VARIABLE_TYPE_OPTIONS: { value: SignalDashboardVariableType; labelKey: string }[] = [
  { value: 'custom', labelKey: 'dashboard.composition.variable.type.custom' },
  { value: 'textbox', labelKey: 'dashboard.composition.variable.type.textbox' },
  { value: 'query', labelKey: 'dashboard.composition.variable.type.query' },
  { value: 'dynamic', labelKey: 'dashboard.composition.variable.type.dynamic' }
];

type DashboardRuntimeSyncProps = {
  syncTimestamp: string;
  pinnedSyncTimestamp: string;
  onSyncTimestamp: (timestamp: string) => void;
  onPinSyncTimestamp: (timestamp: string) => void;
};

function firstParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function replaceDashboardDeepLink(dashboardKey: string) {
  if (typeof window === 'undefined') return;
  window.history.replaceState(
    window.history.state,
    '',
    buildDashboardDeepLinkHref(window.location.href, dashboardKey)
  );
}

function replaceDashboardVariableDeepLink(variableName: string, value: string) {
  if (typeof window === 'undefined') return;
  window.history.replaceState(
    window.history.state,
    '',
    buildDashboardVariableDeepLinkHref(window.location.href, variableName, value)
  );
}

function replaceDashboardTimeRangeDeepLink(timeRange: SignalDashboardTimeRange) {
  if (typeof window === 'undefined') return;
  window.history.replaceState(
    window.history.state,
    '',
    buildDashboardTimeRangeDeepLinkHref(window.location.href, timeRange)
  );
}

function applyVariableUrlOverridesToDashboards(
  dashboards: SignalDashboard[],
  overrides: Record<string, string>
) {
  const overrideEntries = Object.entries(overrides);
  if (overrideEntries.length === 0) return dashboards;
  return dashboards.map(dashboard => {
    let changed = false;
    const variables = parseSignalDashboardVariables(dashboard).map(variable => {
      if (!Object.prototype.hasOwnProperty.call(overrides, variable.name)) return variable;
      changed = true;
      return {
        ...variable,
        value: overrides[variable.name]
      };
    });
    return changed ? updateSignalDashboardVariables(dashboard, variables) : dashboard;
  });
}

function countBySignal(drafts: SignalDashboardPanelDraft[], signal: SignalDashboardPanelDraftSignal) {
  return drafts.filter(draft => draft.signal === signal).length;
}

function savedViewRowKey(view: SignalSavedQueryViewWithSignal) {
  return `${view.signal}:${view.id}`;
}

function formatUpdatedAt(value: string | undefined, locale: string) {
  if (!value) return '-';
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(timestamp);
}

function visualizationLabel(visualization: SignalDashboardPanelVisualization | string) {
  if (visualization === 'time-series') return 'Time series';
  return visualization.charAt(0).toUpperCase() + visualization.slice(1);
}

function parseWidgetCount(dashboard: SignalDashboard) {
  try {
    const widgets = JSON.parse(dashboard.widgets);
    return Array.isArray(widgets) ? widgets.length : 0;
  } catch {
    return 0;
  }
}

function readPanelDraftSourceSummary(draft: SignalDashboardPanelDraft) {
  if (!draft.payload) return '';
  try {
    const payload = JSON.parse(draft.payload) as { savedViewRouteSummaryText?: unknown };
    return typeof payload.savedViewRouteSummaryText === 'string' ? payload.savedViewRouteSummaryText : '';
  } catch {
    return '';
  }
}

function DashboardRuntimeStatePanel({
  runtimeRenderer
}: {
  runtimeRenderer: SignalDashboardPanelRuntimeRenderDescriptor;
}) {
  return (
    <div className="grid gap-1" data-dashboard-runtime-state-panel={runtimeRenderer.kind}>
      {runtimeRenderer.rows.map(row => (
        <div
          key={row.key}
          className="grid min-w-0 grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] gap-2 text-[11px]"
          data-dashboard-composition-runtime-preview-row={row.key}
          data-dashboard-runtime-state-row={row.key}
        >
          <span className="truncate font-semibold text-[#d7deea]">{row.title}</span>
          <span className="truncate text-[#8f99ab]">{row.copy}</span>
          {row.meta ? (
            <span className="col-span-2 truncate text-[10px] text-[#6f7a8d]">{row.meta}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function DashboardRuntimeTable({
  runtimeRenderer,
  tableKind,
  labels,
  syncTimestamp,
  pinnedSyncTimestamp,
  onSyncTimestamp,
  onPinSyncTimestamp
}: {
  runtimeRenderer: SignalDashboardPanelRuntimeRenderDescriptor;
  tableKind: 'logs' | 'traces';
  labels: {
    time: string;
    service: string;
    status: string;
    message: string;
    trace: string;
    span: string;
    duration: string;
  };
} & DashboardRuntimeSyncProps) {
  const markerName = tableKind === 'logs'
    ? 'data-dashboard-runtime-logs-table'
    : 'data-dashboard-runtime-trace-table';
  const contextLabel = tableKind === 'logs' ? labels.span : labels.duration;
  return (
    <div
      className="min-w-0 overflow-hidden"
      data-dashboard-runtime-table-fields="observedAt,service,status,message,traceId,spanOrDuration"
      {...{ [markerName]: runtimeRenderer.panelId }}
    >
      <div
        className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.45fr)_minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,0.5fr)] border-b border-[#252b35] pb-1 text-[10px] font-semibold text-[#6f7a8d]"
        data-dashboard-runtime-table-header={tableKind}
      >
        <span data-dashboard-runtime-table-column="observedAt">{labels.time}</span>
        <span data-dashboard-runtime-table-column="service">{labels.service}</span>
        <span data-dashboard-runtime-table-column="status">{labels.status}</span>
        <span data-dashboard-runtime-table-column="message">{labels.message}</span>
        <span data-dashboard-runtime-table-column="traceId">{labels.trace}</span>
        <span data-dashboard-runtime-table-column={tableKind === 'logs' ? 'spanId' : 'duration'}>{contextLabel}</span>
      </div>
      <div className="grid gap-1 pt-1">
        {runtimeRenderer.tableRows.length > 0 ? runtimeRenderer.tableRows.map(row => {
          const syncSelected = row.observedAt !== '-' && row.observedAt === syncTimestamp;
          const syncPinned = row.observedAt !== '-' && row.observedAt === pinnedSyncTimestamp;
          return (
            <div
              key={row.key}
              className={`grid min-w-0 grid-cols-[minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.45fr)_minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,0.5fr)] gap-2 rounded-[3px] text-[11px] outline-none ${
                syncPinned ? 'bg-[#173342] ring-1 ring-[#7aa8ff]' : syncSelected ? 'bg-[#123326] ring-1 ring-[#42d19f]' : ''
              }`}
              tabIndex={0}
              onFocus={() => row.observedAt !== '-' && onSyncTimestamp(row.observedAt)}
              onMouseEnter={() => row.observedAt !== '-' && onSyncTimestamp(row.observedAt)}
              onClick={() => row.observedAt !== '-' && onPinSyncTimestamp(row.observedAt)}
              data-dashboard-runtime-table-row={row.key}
              data-dashboard-runtime-table-row-observed-at={row.observedAt}
              data-dashboard-runtime-table-row-service={row.service}
              data-dashboard-runtime-table-row-status={row.status}
              data-dashboard-runtime-table-row-trace={row.traceId}
              data-dashboard-runtime-table-row-span={row.spanId}
              data-dashboard-runtime-table-row-duration={row.duration}
              data-dashboard-runtime-sync-publisher="table-row"
              data-dashboard-runtime-sync-timestamp={row.observedAt}
              data-dashboard-runtime-sync-selected={syncSelected ? 'true' : 'false'}
              data-dashboard-runtime-sync-pinned={syncPinned ? 'true' : 'false'}
              data-dashboard-runtime-sync-pin-action="toggle"
            >
              <span className="truncate text-[#8f99ab]">{row.observedAt}</span>
              <span className="truncate text-[#d7deea]">{row.service}</span>
              <span className="truncate font-semibold text-[#d7deea]">{row.status}</span>
              <span className="truncate text-[#aeb8c8]">{row.message || row.name}</span>
              <span className="truncate font-mono text-[#6f7a8d]">{row.traceId}</span>
              <span className="truncate font-mono text-[#6f7a8d]">{tableKind === 'logs' ? row.spanId : row.duration}</span>
            </div>
          );
        }) : runtimeRenderer.rows.map(row => (
          <div
            key={row.key}
            className="grid min-w-0 grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] gap-2 text-[11px]"
            data-dashboard-composition-runtime-preview-row={row.key}
            data-dashboard-runtime-table-fallback-row={row.key}
          >
            <span className="truncate font-semibold text-[#d7deea]">{row.title}</span>
            <span className="truncate text-[#8f99ab]">{row.copy}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardRuntimeTraceWaterfall({
  runtimeRenderer,
  syncTimestamp,
  pinnedSyncTimestamp,
  onSyncTimestamp,
  onPinSyncTimestamp
}: {
  runtimeRenderer: SignalDashboardPanelRuntimeRenderDescriptor;
} & DashboardRuntimeSyncProps) {
  if (runtimeRenderer.traceWaterfallRows.length === 0) return null;
  const source = runtimeRenderer.traceWaterfallRows[0]?.source || 'list-roots';
  return (
    <div
      className="mt-2 grid gap-1 border-t border-[#252b35] pt-2"
      data-dashboard-runtime-trace-waterfall={runtimeRenderer.panelId}
      data-dashboard-runtime-trace-waterfall-source={source}
      data-dashboard-runtime-trace-waterfall-rows={runtimeRenderer.traceWaterfallRows.length}
    >
      {runtimeRenderer.traceWaterfallRows.slice(0, 4).map(row => {
        const syncSelected = row.observedAt !== '-' && row.observedAt === syncTimestamp;
        const syncPinned = row.observedAt !== '-' && row.observedAt === pinnedSyncTimestamp;
        return (
          <div
            key={row.key}
            className={`grid min-w-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] items-center gap-2 rounded-[3px] text-[10px] outline-none ${
              syncPinned ? 'bg-[#173342] ring-1 ring-[#7aa8ff]' : syncSelected ? 'bg-[#123326] ring-1 ring-[#42d19f]' : ''
            }`}
            tabIndex={0}
            onFocus={() => row.observedAt !== '-' && onSyncTimestamp(row.observedAt)}
            onMouseEnter={() => row.observedAt !== '-' && onSyncTimestamp(row.observedAt)}
            onClick={() => row.observedAt !== '-' && onPinSyncTimestamp(row.observedAt)}
            data-dashboard-runtime-trace-waterfall-row={row.key}
            data-dashboard-runtime-trace-waterfall-row-source={row.source}
            data-dashboard-runtime-trace-waterfall-row-depth={row.depth}
            data-dashboard-runtime-trace-waterfall-row-service={row.service}
            data-dashboard-runtime-trace-waterfall-row-span={row.spanId}
            data-dashboard-runtime-trace-waterfall-row-trace={row.traceId}
            data-dashboard-runtime-trace-waterfall-row-duration={row.duration}
            data-dashboard-runtime-sync-publisher="trace-waterfall-row"
            data-dashboard-runtime-sync-timestamp={row.observedAt}
            data-dashboard-runtime-sync-selected={syncSelected ? 'true' : 'false'}
            data-dashboard-runtime-sync-pinned={syncPinned ? 'true' : 'false'}
            data-dashboard-runtime-sync-pin-action="toggle"
          >
          <div className="min-w-0" style={{ paddingLeft: `${Math.min(row.depth, 4) * 8}px` }}>
            <span className="block truncate font-semibold text-[#d7deea]">{row.name}</span>
            <span className="block truncate text-[#6f7a8d]">{`${row.service} · ${row.status}`}</span>
          </div>
          <div className="relative h-[18px] overflow-hidden rounded-[2px] bg-[#111720]">
            <div
              className={row.tone === 'danger' ? 'absolute top-1 h-[10px] rounded-[2px] bg-[#ff6b6b]' : 'absolute top-1 h-[10px] rounded-[2px] bg-[#42d19f]'}
              style={{
                left: `${row.leftPct}%`,
                width: `${row.widthPct}%`
              }}
              data-dashboard-runtime-trace-waterfall-bar={row.key}
              data-dashboard-runtime-trace-waterfall-bar-left={row.leftPct}
              data-dashboard-runtime-trace-waterfall-bar-width={row.widthPct}
            />
          </div>
          </div>
        );
      })}
    </div>
  );
}

function DashboardRuntimeBarChart({
  runtimeRenderer,
  chartKind
}: {
  runtimeRenderer: SignalDashboardPanelRuntimeRenderDescriptor;
  chartKind: 'log-trend' | 'metrics';
}) {
  const markerName = chartKind === 'log-trend'
    ? 'data-dashboard-runtime-log-trend-chart'
    : 'data-dashboard-runtime-metrics-chart';
  return (
    <div className="min-w-0" {...{ [markerName]: runtimeRenderer.panelId }}>
      <div className="flex h-[58px] items-end gap-1" data-dashboard-composition-runtime-preview-bars-grid="true">
        {runtimeRenderer.bars.map(bar => (
          <div key={bar.key} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <div
              className="w-full rounded-t-[2px] bg-[#4f8cff]"
              style={{ height: `${bar.heightPct}%` }}
              data-dashboard-composition-runtime-preview-bar={bar.key}
              data-dashboard-composition-runtime-preview-bar-value={bar.value}
            />
            <span className="max-w-full truncate text-[9px] leading-none text-[#8f99ab]">{bar.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const METRICS_SERIES_COLORS = ['#42d19f', '#f6c343', '#ff7a70', '#7aa8ff', '#c084fc', '#4dd0e1'];

function DashboardRuntimeMetricsChart({
  runtimeRenderer,
  syncTimestamp,
  pinnedSyncTimestamp,
  onSyncTimestamp,
  onPinSyncTimestamp
}: {
  runtimeRenderer: SignalDashboardPanelRuntimeRenderDescriptor;
} & DashboardRuntimeSyncProps) {
  const chart = runtimeRenderer.metricsChart;
  if (!chart || chart.series.length === 0) {
    return <DashboardRuntimeBarChart runtimeRenderer={runtimeRenderer} chartKind="metrics" />;
  }
  const syncPoints = syncTimestamp
    ? chart.series.flatMap(series => series.points.filter(point => String(point.timestamp) === syncTimestamp))
    : [];
  const syncCrosshairX = syncPoints.length > 0
    ? syncPoints.reduce((sum, point) => sum + point.xPct, 0) / syncPoints.length
    : null;
  const metricsTooltip = buildSignalDashboardRuntimeMetricsTooltip(chart, syncTimestamp);
  const syncTooltipAlign = syncCrosshairX != null && syncCrosshairX > 62 ? 'right' : 'left';
  return (
    <div
      className="min-w-0"
      data-dashboard-runtime-metrics-chart={runtimeRenderer.panelId}
      data-dashboard-runtime-metrics-chart-series-count={chart.seriesCount}
      data-dashboard-runtime-metrics-chart-sample-count={chart.sampleCount}
      data-dashboard-runtime-metrics-chart-crosshair-state={syncCrosshairX == null ? 'idle' : 'active'}
      data-dashboard-runtime-metrics-chart-crosshair-points={syncPoints.length}
      data-dashboard-runtime-metrics-chart-crosshair-x={syncCrosshairX ?? ''}
      data-dashboard-runtime-metrics-chart-x-min={chart.xMin}
      data-dashboard-runtime-metrics-chart-x-max={chart.xMax}
      data-dashboard-runtime-metrics-chart-y-min={chart.yMin}
      data-dashboard-runtime-metrics-chart-y-max={chart.yMax}
    >
      <div
        className="relative h-[72px] overflow-hidden border border-[#252b35] bg-[#0b0f14]"
        data-dashboard-runtime-metrics-chart-plot={runtimeRenderer.panelId}
      >
        <div className="absolute inset-x-0 top-1/2 border-t border-[#1d2530]" />
        <div className="absolute inset-y-0 left-1/2 border-l border-[#1d2530]" />
        <svg
          className="absolute inset-[6px] h-[calc(100%-12px)] w-[calc(100%-12px)] overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          data-dashboard-runtime-metrics-chart-svg={runtimeRenderer.panelId}
        >
          {chart.series.map((series, seriesIndex) => (
            <path
              key={series.key}
              d={series.pathD}
              fill="none"
              vectorEffect="non-scaling-stroke"
              stroke={METRICS_SERIES_COLORS[seriesIndex % METRICS_SERIES_COLORS.length]}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              data-dashboard-runtime-metrics-chart-line={series.key}
              data-dashboard-runtime-metrics-chart-line-label={series.label}
              data-dashboard-runtime-metrics-chart-line-path={series.pathD}
            />
          ))}
        </svg>
        <div
          className="pointer-events-none absolute inset-[6px]"
          data-dashboard-runtime-metrics-chart-crosshair-layer={runtimeRenderer.panelId}
          data-dashboard-runtime-metrics-chart-crosshair-state={syncCrosshairX == null ? 'idle' : 'active'}
          data-dashboard-runtime-metrics-chart-crosshair-points={syncPoints.length}
          data-dashboard-runtime-metrics-chart-crosshair-x={syncCrosshairX ?? ''}
        >
          {syncCrosshairX == null ? null : (
            <span
              className="absolute inset-y-0 w-px bg-[#f5f7fb]/80 shadow-[0_0_12px_rgba(245,247,251,0.35)]"
              style={{ left: `${syncCrosshairX}%` }}
              data-dashboard-runtime-metrics-chart-crosshair={runtimeRenderer.panelId}
              data-dashboard-runtime-metrics-chart-crosshair-timestamp={syncTimestamp}
              data-dashboard-runtime-metrics-chart-crosshair-x={syncCrosshairX}
            />
          )}
        </div>
        {syncCrosshairX == null || metricsTooltip.state !== 'sync' ? null : (
          <div
            className={`pointer-events-none absolute top-2 z-10 grid max-w-[150px] gap-1 rounded-[4px] border border-[#394252] bg-[#0d1117]/95 px-2 py-1 shadow-[0_10px_24px_rgba(0,0,0,0.32)] ${
              syncTooltipAlign === 'right' ? '-translate-x-full' : ''
            }`}
            style={{ left: `${syncCrosshairX}%` }}
            data-dashboard-runtime-metrics-chart-floating-tooltip={runtimeRenderer.panelId}
            data-dashboard-runtime-metrics-chart-floating-tooltip-state={metricsTooltip.state}
            data-dashboard-runtime-metrics-chart-floating-tooltip-align={syncTooltipAlign}
            data-dashboard-runtime-metrics-chart-floating-tooltip-timestamp={metricsTooltip.timestamp}
            data-dashboard-runtime-metrics-chart-floating-tooltip-rows={metricsTooltip.rowCount}
          >
            <span
              className="truncate font-mono text-[9px] font-semibold text-[#f5f7fb]"
              data-dashboard-runtime-metrics-chart-floating-tooltip-time={metricsTooltip.timestamp}
            >
              {metricsTooltip.timestamp}
            </span>
            {metricsTooltip.rows.slice(0, 3).map(row => (
              <div
                key={`${row.key}:floating`}
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 text-[9px]"
                data-dashboard-runtime-metrics-chart-floating-tooltip-row={row.key}
                data-dashboard-runtime-metrics-chart-floating-tooltip-row-title={row.title}
                data-dashboard-runtime-metrics-chart-floating-tooltip-row-value={row.copy}
              >
                <span className="truncate text-[#8f99ab]">{row.title}</span>
                <span className="font-mono font-semibold text-[#d7deea]">{row.copy}</span>
              </div>
            ))}
          </div>
        )}
        {chart.series.map((series, seriesIndex) => (
          <div
            key={series.key}
            className="absolute inset-[6px]"
            data-dashboard-runtime-metrics-chart-series={series.key}
            data-dashboard-runtime-metrics-chart-series-label={series.label}
            data-dashboard-runtime-metrics-chart-series-samples={series.sampleCount}
            data-dashboard-runtime-metrics-chart-series-latest-value={series.latestValue}
            data-dashboard-runtime-metrics-chart-series-latest-timestamp={series.latestTimestamp}
          >
            {series.points.map(point => {
              const pointTimestamp = String(point.timestamp);
              const syncSelected = pointTimestamp === syncTimestamp;
              const syncPinned = pointTimestamp === pinnedSyncTimestamp;
              return (
                <span
                  key={point.key}
                  className={`absolute h-[5px] w-[5px] rounded-full outline-none ${
                    syncPinned
                      ? 'ring-2 ring-[#7aa8ff] ring-offset-1 ring-offset-[#0b0f14]'
                      : syncSelected ? 'ring-2 ring-[#f5f7fb] ring-offset-1 ring-offset-[#0b0f14]' : ''
                  }`}
                  tabIndex={0}
                  style={{
                    left: `${point.xPct}%`,
                    bottom: `${point.yPct}%`,
                    transform: 'translate(-50%, 50%)',
                    backgroundColor: METRICS_SERIES_COLORS[seriesIndex % METRICS_SERIES_COLORS.length]
                  }}
                  onFocus={() => onSyncTimestamp(pointTimestamp)}
                  onMouseEnter={() => onSyncTimestamp(pointTimestamp)}
                  onClick={() => onPinSyncTimestamp(pointTimestamp)}
                  data-dashboard-runtime-metrics-chart-point={point.key}
                  data-dashboard-runtime-metrics-chart-point-x={point.xPct}
                  data-dashboard-runtime-metrics-chart-point-y={point.yPct}
                  data-dashboard-runtime-metrics-chart-point-timestamp={point.timestamp}
                  data-dashboard-runtime-metrics-chart-point-value={point.value}
                  data-dashboard-runtime-sync-publisher="metrics-point"
                  data-dashboard-runtime-sync-timestamp={pointTimestamp}
                  data-dashboard-runtime-sync-selected={syncSelected ? 'true' : 'false'}
                  data-dashboard-runtime-sync-pinned={syncPinned ? 'true' : 'false'}
                  data-dashboard-runtime-sync-pin-action="toggle"
                />
              );
            })}
          </div>
        ))}
      </div>
      <div
        className="mt-1 grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 text-[9px] text-[#6f7a8d]"
        data-dashboard-runtime-metrics-chart-axis-labels={runtimeRenderer.panelId}
        data-dashboard-runtime-metrics-chart-axis-x-min-label={chart.xMinLabel}
        data-dashboard-runtime-metrics-chart-axis-x-max-label={chart.xMaxLabel}
        data-dashboard-runtime-metrics-chart-axis-y-min-label={chart.yMinLabel}
        data-dashboard-runtime-metrics-chart-axis-y-max-label={chart.yMaxLabel}
      >
        <span className="truncate font-mono">{chart.xMinLabel}</span>
        <span className="truncate text-center font-mono">{`${chart.yMinLabel} / ${chart.yMaxLabel}`}</span>
        <span className="truncate text-right font-mono">{chart.xMaxLabel}</span>
      </div>
      <div
        className="mt-2 grid gap-1 text-[10px]"
        data-dashboard-runtime-metrics-chart-tooltip={runtimeRenderer.panelId}
        data-dashboard-runtime-metrics-chart-tooltip-state={metricsTooltip.state}
        data-dashboard-runtime-metrics-chart-tooltip-timestamp={metricsTooltip.timestamp}
        data-dashboard-runtime-metrics-chart-tooltip-rows={metricsTooltip.rowCount}
      >
        {metricsTooltip.rows.map(row => (
          <div
            key={row.key}
            className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2"
            data-dashboard-runtime-metrics-chart-tooltip-row={row.key}
            data-dashboard-runtime-metrics-chart-tooltip-row-title={row.title}
            data-dashboard-runtime-metrics-chart-tooltip-row-value={row.copy}
            data-dashboard-runtime-metrics-chart-tooltip-row-time={row.meta}
          >
            <span className="truncate text-[#8f99ab]">{row.title}</span>
            <span className="font-mono font-semibold text-[#d7deea]">{row.copy}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardRuntimeTraceOverview({
  runtimeRenderer
}: {
  runtimeRenderer: SignalDashboardPanelRuntimeRenderDescriptor;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3" data-dashboard-runtime-trace-overview={runtimeRenderer.panelId}>
      {runtimeRenderer.rows.map(row => (
        <div
          key={row.key}
          className="min-w-0 border-l border-[#394252] pl-2"
          data-dashboard-composition-runtime-preview-row={row.key}
          data-dashboard-runtime-trace-overview-stat={row.key}
        >
          <span className="block truncate text-[10px] font-semibold text-[#6f7a8d]">{row.title}</span>
          <span className="block truncate text-[13px] font-semibold text-[#d7deea]">{row.copy}</span>
        </div>
      ))}
    </div>
  );
}

function DashboardRuntimeObjectPanel({
  runtimeRenderer
}: {
  runtimeRenderer: SignalDashboardPanelRuntimeRenderDescriptor;
}) {
  const { t } = useI18n();
  return (
    <div className="grid gap-1" data-dashboard-runtime-object-panel={runtimeRenderer.panelId}>
      {runtimeRenderer.rows.map(row => (
        <div
          key={row.key}
          className="grid min-w-0 grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_18px] gap-2 text-[11px]"
          data-dashboard-composition-runtime-preview-row={row.key}
          data-dashboard-composition-runtime-preview-row-related-signal={row.relatedSignal || ''}
          data-dashboard-composition-runtime-preview-row-related-handoff={row.relatedHandoffHref || ''}
        >
          <span className="truncate font-semibold text-[#d7deea]">{row.title}</span>
          <span className="truncate text-[#8f99ab]">{row.copy}</span>
          {row.relatedHandoffHref ? (
            <a
              href={row.relatedHandoffHref}
              className="inline-flex h-[18px] w-[18px] items-center justify-center rounded border border-[#394252] text-[#8f99ab] hover:border-[#4f8cff] hover:text-[#d7deea]"
              data-dashboard-composition-runtime-preview-row-action="open-related"
              data-dashboard-composition-runtime-preview-row-action-signal={row.relatedSignal}
              data-dashboard-composition-runtime-preview-row-action-href={row.relatedHandoffHref}
              aria-label={t('dashboard.runtime.sync.open-related')}
            >
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          ) : (
            <span aria-hidden="true" />
          )}
        </div>
      ))}
    </div>
  );
}

function DashboardRuntimePanelRenderer({
  runtimeRenderer,
  tableLabels,
  syncTimestamp,
  pinnedSyncTimestamp,
  onSyncTimestamp,
  onPinSyncTimestamp
}: {
  runtimeRenderer: SignalDashboardPanelRuntimeRenderDescriptor;
  tableLabels: React.ComponentProps<typeof DashboardRuntimeTable>['labels'];
} & DashboardRuntimeSyncProps) {
  if (runtimeRenderer.renderer === 'logs-table') {
    return (
      <DashboardRuntimeTable
        runtimeRenderer={runtimeRenderer}
        tableKind="logs"
        labels={tableLabels}
        syncTimestamp={syncTimestamp}
        pinnedSyncTimestamp={pinnedSyncTimestamp}
        onSyncTimestamp={onSyncTimestamp}
        onPinSyncTimestamp={onPinSyncTimestamp}
      />
    );
  }
  if (runtimeRenderer.renderer === 'trace-table') {
    return (
      <>
        <DashboardRuntimeTable
          runtimeRenderer={runtimeRenderer}
          tableKind="traces"
          labels={tableLabels}
          syncTimestamp={syncTimestamp}
          pinnedSyncTimestamp={pinnedSyncTimestamp}
          onSyncTimestamp={onSyncTimestamp}
          onPinSyncTimestamp={onPinSyncTimestamp}
        />
        <DashboardRuntimeTraceWaterfall
          runtimeRenderer={runtimeRenderer}
          syncTimestamp={syncTimestamp}
          pinnedSyncTimestamp={pinnedSyncTimestamp}
          onSyncTimestamp={onSyncTimestamp}
          onPinSyncTimestamp={onPinSyncTimestamp}
        />
      </>
    );
  }
  if (runtimeRenderer.renderer === 'log-trend-chart') {
    return <DashboardRuntimeBarChart runtimeRenderer={runtimeRenderer} chartKind="log-trend" />;
  }
  if (runtimeRenderer.renderer === 'metrics-chart') {
    return (
      <DashboardRuntimeMetricsChart
        runtimeRenderer={runtimeRenderer}
        syncTimestamp={syncTimestamp}
        pinnedSyncTimestamp={pinnedSyncTimestamp}
        onSyncTimestamp={onSyncTimestamp}
        onPinSyncTimestamp={onPinSyncTimestamp}
      />
    );
  }
  if (runtimeRenderer.renderer === 'trace-overview') {
    return <DashboardRuntimeTraceOverview runtimeRenderer={runtimeRenderer} />;
  }
  if (runtimeRenderer.renderer === 'object-panel') {
    return <DashboardRuntimeObjectPanel runtimeRenderer={runtimeRenderer} />;
  }
  return <DashboardRuntimeStatePanel runtimeRenderer={runtimeRenderer} />;
}

export default function DashboardDraftWorkspace({
  initialContext
}: {
  initialContext: SearchParamsRecord;
}) {
  const { locale, t } = useI18n();
  const [drafts, setDrafts] = useState<SignalDashboardPanelDraft[]>([]);
  const [savedViews, setSavedViews] = useState<SignalSavedQueryViewWithSignal[]>([]);
  const [dashboards, setDashboards] = useState<SignalDashboard[]>([]);
  const [loadState, setLoadState] = useState<DraftLoadState>('loading');
  const [savedViewLoadState, setSavedViewLoadState] = useState<SavedViewLoadState>('loading');
  const [savedViewFailedSignals, setSavedViewFailedSignals] = useState<SignalSavedViewSignal[]>([]);
  const [compositionState, setCompositionState] = useState<CompositionState>('loading');
  const [deletingDraftKey, setDeletingDraftKey] = useState<string | null>(null);
  const [duplicatingDraftKey, setDuplicatingDraftKey] = useState<string | null>(null);
  const [savingRuntimeEvidenceKey, setSavingRuntimeEvidenceKey] = useState<string | null>(null);
  const [savingFilterPanelKey, setSavingFilterPanelKey] = useState<string | null>(null);
  const [promotingSavedViewKey, setPromotingSavedViewKey] = useState<string | null>(null);
  const [savingSavedViewKey, setSavingSavedViewKey] = useState<string | null>(null);
  const [deletingSavedViewKey, setDeletingSavedViewKey] = useState<string | null>(null);
  const [deletingDashboardKey, setDeletingDashboardKey] = useState<string | null>(null);
  const [savedViewDrafts, setSavedViewDrafts] = useState<Record<string, SavedViewDraftFields>>({});
  const requestedDashboardParam = firstParamValue(initialContext.dashboard);
  const hasRequestedDashboardKey = Boolean(requestedDashboardParam?.trim());
  const requestedDashboardKey = normalizeSignalDashboardKey(requestedDashboardParam || 'signals-overview');
  const [dashboardKeyDraft, setDashboardKeyDraft] = useState(requestedDashboardKey);
  const [dashboardTitleDraft, setDashboardTitleDraft] = useState('');
  const [dashboardDescriptionDraft, setDashboardDescriptionDraft] = useState('');
  const [savingPreviewLayout, setSavingPreviewLayout] = useState(false);
  const [savingVariables, setSavingVariables] = useState(false);
  const [savingServiceOverview, setSavingServiceOverview] = useState(false);
  const [savingOperationDrilldown, setSavingOperationDrilldown] = useState(false);
  const [variableNameDraft, setVariableNameDraft] = useState('service.name');
  const [variableTypeDraft, setVariableTypeDraft] = useState<SignalDashboardVariableType>('textbox');
  const [variableValueDraft, setVariableValueDraft] = useState('');
  const [variableDescriptionDraft, setVariableDescriptionDraft] = useState('');
  const [variableOptionsDraft, setVariableOptionsDraft] = useState('');
  const [timeRangeStartDraft, setTimeRangeStartDraft] = useState(() => firstParamValue(initialContext.start) || firstParamValue(initialContext.from) || '');
  const [timeRangeEndDraft, setTimeRangeEndDraft] = useState(() => firstParamValue(initialContext.end) || firstParamValue(initialContext.to) || '');
  const [timeRangePresetDraft, setTimeRangePresetDraft] = useState(() => firstParamValue(initialContext.timeRange) || '');
  const [timeRangeRefreshDraft, setTimeRangeRefreshDraft] = useState(() => firstParamValue(initialContext.refresh) || '');
  const [timeRangeLiveDraft, setTimeRangeLiveDraft] = useState(() => firstParamValue(initialContext.live) || '');
  const [refreshTick, setRefreshTick] = useState(0);
  const [filterOptionSearchDrafts, setFilterOptionSearchDrafts] = useState<Record<string, string>>({});
  const [runtimeSyncHoverTimestamp, setRuntimeSyncHoverTimestamp] = useState('');
  const [runtimePinnedSyncTimestamp, setRuntimePinnedSyncTimestamp] = useState('');
  const [panelExecutionResults, setPanelExecutionResults] = useState<Record<string, SignalDashboardPanelExecutionResult>>({});
  const contextSource = firstParamValue(initialContext.source) || firstParamValue(initialContext.returnTo) || 'dashboard';
  const initialVariableUrlOverrides = useMemo(
    () => readDashboardVariableUrlOverrides(initialContext),
    [initialContext]
  );
  const serviceOverviewContext = useMemo(() => {
    const serviceName = firstParamValue(initialContext.serviceName)?.trim() || '';
    if (!serviceName) return null;
    return {
      serviceName,
      serviceNamespace: firstParamValue(initialContext.serviceNamespace)?.trim() || undefined,
      environment: firstParamValue(initialContext.environment)?.trim() || undefined,
      entityId: firstParamValue(initialContext.entityId)?.trim() || undefined,
      entityType: firstParamValue(initialContext.entityType)?.trim() || undefined,
      entityName: firstParamValue(initialContext.entityName)?.trim() || undefined,
      source: firstParamValue(initialContext.source)?.trim() || undefined,
      collector: firstParamValue(initialContext.collector)?.trim() || undefined,
      template: firstParamValue(initialContext.template)?.trim() || undefined
    };
  }, [initialContext]);
  const operationDrilldownContext = useMemo(() => {
    const operationName = firstParamValue(initialContext.operationName)?.trim() || '';
    if (!serviceOverviewContext || !operationName) return null;
    return {
      ...serviceOverviewContext,
      operationName
    };
  }, [initialContext, serviceOverviewContext]);
  const defaultDashboardTitle = t('dashboard.composition.default-title');
  const defaultDashboardDescription = t('dashboard.composition.default-description');
  const runtimeTableLabels = useMemo(() => ({
    time: t('dashboard.runtime.table.time'),
    service: t('dashboard.runtime.table.service'),
    status: t('dashboard.runtime.table.status'),
    message: t('dashboard.runtime.table.message'),
    trace: t('dashboard.runtime.table.trace'),
    span: t('dashboard.runtime.table.span'),
    duration: t('dashboard.runtime.table.duration')
  }), [t]);

  useEffect(() => {
    setDashboardTitleDraft(current => current || defaultDashboardTitle);
    setDashboardDescriptionDraft(current => current || defaultDashboardDescription);
  }, [defaultDashboardDescription, defaultDashboardTitle]);

  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');

    loadAllSignalDashboardPanelDrafts()
      .then(nextDrafts => {
        if (cancelled) return;
        setDrafts(nextDrafts);
        setLoadState(nextDrafts.length > 0 ? 'ready' : 'empty');
      })
      .catch(() => {
        if (cancelled) return;
        setLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSavedViewLoadState('loading');

    loadAllSignalSavedQueryViewsWithDiagnostics()
      .then(({ views: nextSavedViews, failedSignals }) => {
        if (cancelled) return;
        setSavedViews(nextSavedViews);
        setSavedViewFailedSignals(failedSignals);
        setSavedViewDrafts(nextSavedViews.reduce<Record<string, SavedViewDraftFields>>((draftsByKey, view) => {
          draftsByKey[savedViewRowKey(view)] = {
            label: view.label,
            description: view.description
          };
          return draftsByKey;
        }, {}));
        setSavedViewLoadState(failedSignals.length > 0 && nextSavedViews.length > 0 ? 'partial' : nextSavedViews.length > 0 ? 'ready' : failedSignals.length > 0 ? 'error' : 'empty');
      })
      .catch(() => {
        if (cancelled) return;
        setSavedViewFailedSignals(['logs', 'traces', 'metrics']);
        setSavedViewLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCompositionState('loading');

    loadSignalDashboards()
      .then(nextDashboards => {
        if (cancelled) return;
        const nextDashboardsWithUrlVariables = applyVariableUrlOverridesToDashboards(nextDashboards, initialVariableUrlOverrides);
        setDashboards(nextDashboardsWithUrlVariables);
        const firstDashboard = nextDashboardsWithUrlVariables[0];
        if (firstDashboard) {
          setDashboardKeyDraft(current => !hasRequestedDashboardKey && current === requestedDashboardKey ? firstDashboard.dashboardKey : current);
          setDashboardTitleDraft(current => current === defaultDashboardTitle || current.length === 0 ? firstDashboard.title : current);
          setDashboardDescriptionDraft(current =>
            current === defaultDashboardDescription || current.length === 0
              ? firstDashboard.description || defaultDashboardDescription
              : current
          );
        }
        setCompositionState(nextDashboardsWithUrlVariables.length > 0 ? 'ready' : 'empty');
      })
      .catch(() => {
        if (cancelled) return;
        setCompositionState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [defaultDashboardDescription, defaultDashboardTitle, hasRequestedDashboardKey, initialVariableUrlOverrides, requestedDashboardKey]);

  const metrics = useMemo(
    () => [
      { key: 'total', label: t('dashboard.panel-drafts.metric.total'), value: drafts.length },
      { key: 'saved-views', label: t('dashboard.saved-views.metric.total'), value: savedViews.length },
      { key: 'dashboards', label: t('dashboard.composition.metric.dashboards'), value: dashboards.length },
      ...SIGNALS.map(signal => ({
        key: signal,
        label: t(`dashboard.add-panel.signal.${signal}`),
        value: countBySignal(drafts, signal)
      }))
    ],
    [dashboards.length, drafts, savedViews.length, t]
  );
  const selectedDashboard = useMemo(
    () => dashboards.find(dashboard => dashboard.dashboardKey === dashboardKeyDraft) || null,
    [dashboardKeyDraft, dashboards]
  );
  const dashboardTimeRange = useMemo<SignalDashboardTimeRange>(() => {
    const start = timeRangeStartDraft.trim();
    const end = timeRangeEndDraft.trim();
    const timeRange = timeRangePresetDraft.trim();
    const refresh = timeRangeRefreshDraft.trim();
    const live = timeRangeLiveDraft.trim();
    const refreshContext = {
      ...(refresh ? { refresh } : {}),
      ...(live ? { live } : {})
    };
    if (start || end) {
      return {
        ...(start ? { start } : {}),
        ...(end ? { end } : {}),
        ...refreshContext
      };
    }
    return {
      ...(timeRange ? { timeRange } : {}),
      ...refreshContext
    };
  }, [timeRangeEndDraft, timeRangeLiveDraft, timeRangePresetDraft, timeRangeRefreshDraft, timeRangeStartDraft]);
  useEffect(() => {
    replaceDashboardTimeRangeDeepLink(dashboardTimeRange);
  }, [dashboardTimeRange]);
  const dashboardTimeRangeMode = dashboardTimeRange.start || dashboardTimeRange.end
    ? 'absolute'
    : dashboardTimeRange.timeRange
      ? 'relative'
      : 'panel';
  const dashboardExecutionTimeRange = useMemo(
    () => resolveSignalDashboardTimeRange(dashboardTimeRange),
    [dashboardTimeRange]
  );
  const dashboardRefreshState = useMemo(
    () => resolveSignalDashboardRefreshState(dashboardTimeRange),
    [dashboardTimeRange]
  );
  const previewPanels = useMemo(
    () => selectedDashboard ? resolveSignalDashboardPreviewPanels(selectedDashboard, { timeRange: dashboardExecutionTimeRange }) : [],
    [dashboardExecutionTimeRange, selectedDashboard]
  );
  const executionPlans = useMemo(
    () => selectedDashboard ? buildSignalDashboardExecutionPlans(selectedDashboard, { timeRange: dashboardExecutionTimeRange }) : [],
    [dashboardExecutionTimeRange, selectedDashboard]
  );
  const executionPlanByPanelId = useMemo(
    () => new Map(executionPlans.map(plan => [plan.panelId, plan])),
    [executionPlans]
  );
  const runtimeRenderers = useMemo(
    () => executionPlans.map(plan => buildSignalDashboardPanelRuntimeRenderDescriptor(plan, panelExecutionResults[plan.panelId])),
    [executionPlans, panelExecutionResults]
  );
  const runtimeRendererByPanelId = useMemo(
    () => new Map(runtimeRenderers.map(renderer => [renderer.panelId, renderer])),
    [runtimeRenderers]
  );
  const dashboardVariables = useMemo(
    () => selectedDashboard ? parseSignalDashboardVariables(selectedDashboard) : [],
    [selectedDashboard]
  );
  const dashboardReturnHref = useMemo(
    () => selectedDashboard
      ? buildDashboardReturnHref({
          dashboardKey: selectedDashboard.dashboardKey,
          timeRange: dashboardExecutionTimeRange,
          variables: dashboardVariables
        })
      : applySignalDashboardTimeRange('/dashboard', dashboardExecutionTimeRange),
    [dashboardExecutionTimeRange, dashboardVariables, selectedDashboard]
  );
  const runtimeSyncTimestamp = runtimePinnedSyncTimestamp || runtimeSyncHoverTimestamp;
  const runtimeSyncTooltip = useMemo(
    () => buildSignalDashboardRuntimeSyncTooltip(runtimeRenderers, runtimeSyncTimestamp, {
      timeRange: dashboardExecutionTimeRange,
      returnTo: dashboardReturnHref
    }),
    [dashboardExecutionTimeRange, dashboardReturnHref, runtimeRenderers, runtimeSyncTimestamp]
  );
  const runtimeSyncCrosshair = useMemo(
    () => buildSignalDashboardRuntimeSyncCrosshair(runtimeRenderers, runtimeSyncTimestamp),
    [runtimeRenderers, runtimeSyncTimestamp]
  );
  const dashboardVariableOptions = useMemo(
    () => buildSignalDashboardVariableOptions(dashboardVariables, executionPlans, panelExecutionResults),
    [dashboardVariables, executionPlans, panelExecutionResults]
  );
  const dashboardVariableOptionCount = useMemo(
    () => Object.values(dashboardVariableOptions).reduce((sum, options) => sum + options.length, 0),
    [dashboardVariableOptions]
  );
  const pinRuntimeSyncTimestamp = (timestamp: string) => {
    setRuntimeSyncHoverTimestamp(timestamp);
    setRuntimePinnedSyncTimestamp(current => current === timestamp ? '' : timestamp);
  };

  useEffect(() => {
    if (dashboardRefreshState.mode !== 'auto' || dashboardRefreshState.tickMs <= 0 || executionPlans.length === 0) {
      return undefined;
    }
    const intervalId = window.setInterval(() => {
      setRefreshTick(current => current + 1);
    }, dashboardRefreshState.tickMs);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [dashboardRefreshState.mode, dashboardRefreshState.tickMs, executionPlans.length]);

  useEffect(() => {
    let cancelled = false;
    if (executionPlans.length === 0) {
      setPanelExecutionResults({});
      return () => {
        cancelled = true;
      };
    }

    const initialResults = executionPlans.reduce<Record<string, SignalDashboardPanelExecutionResult>>((results, plan) => {
      results[plan.panelId] = plan.state === 'ready' && plan.primaryUrl
        ? {
            panelId: plan.panelId,
            state: 'loading',
            primaryUrl: plan.primaryUrl,
            apiUrl: plan.primaryUrl
          }
        : {
            panelId: plan.panelId,
            state: 'unsupported',
            primaryUrl: plan.primaryUrl,
            apiUrl: plan.primaryUrl,
            errorMessage: plan.unsupportedReason || 'unsupported-panel'
          };
      return results;
    }, {});
    setPanelExecutionResults(initialResults);

    executionPlans
      .filter(plan => plan.state === 'ready' && plan.primaryUrl)
      .forEach(plan => {
        void executeSignalDashboardPanelPlan(plan).then(result => {
          if (cancelled) return;
          setPanelExecutionResults(current => ({
            ...current,
            [result.panelId]: result
          }));
        });
      });

    return () => {
      cancelled = true;
    };
  }, [executionPlans, refreshTick]);

  const saveLayout = async () => {
    if (drafts.length === 0) return;
    setCompositionState('saving');
    try {
      const dashboardKey = normalizeSignalDashboardKey(dashboardKeyDraft || dashboardTitleDraft);
      const dashboard = buildSignalDashboardCompositionFromDrafts({
        dashboardKey,
        title: dashboardTitleDraft.trim() || defaultDashboardTitle,
        description: dashboardDescriptionDraft.trim() || defaultDashboardDescription,
        tags: SIGNALS.map(signal => t(`dashboard.add-panel.signal.${signal}`)),
        drafts
      });
      const saved = await saveSignalDashboard(dashboard);
      setDashboardKeyDraft(saved.dashboardKey);
      setDashboardTitleDraft(saved.title);
      setDashboardDescriptionDraft(saved.description || defaultDashboardDescription);
      replaceDashboardDeepLink(saved.dashboardKey);
      setDashboards(current => [saved, ...current.filter(item => item.dashboardKey !== saved.dashboardKey)]);
      setCompositionState('saved');
    } catch {
      setCompositionState('error');
    }
  };

  const updatePreviewLayout = (widgetId: string, patch: SignalDashboardLayoutPatch) => {
    if (!selectedDashboard) return;
    setDashboards(current => current.map(dashboard =>
      dashboard.dashboardKey === selectedDashboard.dashboardKey
        ? updateSignalDashboardPanelLayout(dashboard, widgetId, patch)
        : dashboard
    ));
    setCompositionState(current => current === 'error' ? current : 'ready');
  };

  const savePreviewLayout = async () => {
    if (!selectedDashboard || previewPanels.length === 0) return;
    setSavingPreviewLayout(true);
    setCompositionState('saving');
    try {
      const saved = await saveSignalDashboard(selectedDashboard);
      setDashboards(current => [saved, ...current.filter(item => item.dashboardKey !== saved.dashboardKey)]);
      setCompositionState('saved');
    } catch {
      setCompositionState('error');
    } finally {
      setSavingPreviewLayout(false);
    }
  };

  const saveServiceOverviewDashboard = async () => {
    if (!serviceOverviewContext) return;
    setSavingServiceOverview(true);
    setCompositionState('saving');
    try {
      const dashboard = buildSignalServiceOverviewDashboard({
        ...serviceOverviewContext,
        ...dashboardTimeRange
      });
      const saved = await saveSignalDashboard(dashboard);
      setDashboardKeyDraft(saved.dashboardKey);
      setDashboardTitleDraft(saved.title);
      setDashboardDescriptionDraft(saved.description || defaultDashboardDescription);
      replaceDashboardDeepLink(saved.dashboardKey);
      setDashboards(current => [saved, ...current.filter(item => item.dashboardKey !== saved.dashboardKey)]);
      setCompositionState('saved');
    } catch {
      setCompositionState('error');
    } finally {
      setSavingServiceOverview(false);
    }
  };

  const saveOperationDrilldownDashboard = async () => {
    if (!operationDrilldownContext) return;
    setSavingOperationDrilldown(true);
    setCompositionState('saving');
    try {
      const dashboard = buildSignalOperationDrilldownDashboard({
        ...operationDrilldownContext,
        ...dashboardTimeRange
      });
      const saved = await saveSignalDashboard(dashboard);
      setDashboardKeyDraft(saved.dashboardKey);
      setDashboardTitleDraft(saved.title);
      setDashboardDescriptionDraft(saved.description || defaultDashboardDescription);
      replaceDashboardDeepLink(saved.dashboardKey);
      setDashboards(current => [saved, ...current.filter(item => item.dashboardKey !== saved.dashboardKey)]);
      setCompositionState('saved');
    } catch {
      setCompositionState('error');
    } finally {
      setSavingOperationDrilldown(false);
    }
  };

  const replaceSelectedDashboardVariables = (variables: SignalDashboardVariable[]) => {
    if (!selectedDashboard) return;
    setDashboards(current => current.map(dashboard =>
      dashboard.dashboardKey === selectedDashboard.dashboardKey
        ? updateSignalDashboardVariables(dashboard, variables)
        : dashboard
    ));
    setCompositionState(current => current === 'error' ? current : 'ready');
  };

  const addVariable = () => {
    if (!selectedDashboard) return;
    const options = variableOptionsDraft.split(',').map(option => option.trim()).filter(Boolean);
    const nextVariable: SignalDashboardVariable = {
      name: variableNameDraft,
      type: variableTypeDraft,
      value: variableValueDraft,
      description: variableDescriptionDraft || undefined,
      options,
      multi: variableTypeDraft === 'custom' && options.length > 1
    };
    replaceSelectedDashboardVariables([
      nextVariable,
      ...dashboardVariables.filter(variable => variable.name !== nextVariable.name)
    ]);
    replaceDashboardVariableDeepLink(nextVariable.name, nextVariable.value);
  };

  const deleteVariable = (name: string) => {
    replaceSelectedDashboardVariables(dashboardVariables.filter(variable => variable.name !== name));
    replaceDashboardVariableDeepLink(name, '');
  };

  const selectVariableOption = (name: string, value: string) => {
    const nextVariables = selectSignalDashboardVariableOption(dashboardVariables, name, value);
    replaceSelectedDashboardVariables(nextVariables);
    replaceDashboardVariableDeepLink(
      name,
      nextVariables.find(variable => variable.name === name)?.value || ''
    );
  };

  const addEvidenceFilterVariable = (variableName: string, variableType: SignalDashboardVariableType, value: string) => {
    const nextVariable: SignalDashboardVariable = {
      name: variableName,
      type: variableType,
      value,
      description: undefined,
      options: variableType === 'custom' ? [value] : [],
      multi: false
    };
    replaceSelectedDashboardVariables([
      nextVariable,
      ...dashboardVariables.filter(variable => variable.name !== variableName)
    ]);
    replaceDashboardVariableDeepLink(nextVariable.name, nextVariable.value);
  };

  const addRuntimeEvidencePanelDraft = async (
    row: Parameters<typeof createSignalDashboardPanelDraftFromRuntimeEvidence>[0]['row'],
    route: string
  ) => {
    const draft = createSignalDashboardPanelDraftFromRuntimeEvidence({
      row,
      route,
      titlePrefix: t('dashboard.runtime.sync.evidence-panel-title-prefix')
    });
    if (!draft) return;
    setSavingRuntimeEvidenceKey(row.key);
    try {
      const saved = await saveSignalDashboardPanelDraft(draft);
      setDrafts(current => [
        saved,
        ...current.filter(item => `${item.signal}:${item.draftKey}` !== `${saved.signal}:${saved.draftKey}`)
      ]);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    } finally {
      setSavingRuntimeEvidenceKey(null);
    }
  };

  const addRuntimeBreakoutPanelDraft = async (
    row: Parameters<typeof createSignalDashboardPanelDraftFromRuntimeBreakout>[0]['row'],
    route: string,
    attribute: Parameters<typeof createSignalDashboardPanelDraftFromRuntimeBreakout>[0]['attribute']
  ) => {
    const draft = createSignalDashboardPanelDraftFromRuntimeBreakout({
      row,
      route,
      attribute,
      titlePrefix: t('dashboard.runtime.sync.breakout-panel-title-prefix')
    });
    if (!draft) return;
    const savingKey = `${row.key}:breakout:${attribute.name}`;
    setSavingRuntimeEvidenceKey(savingKey);
    try {
      const saved = await saveSignalDashboardPanelDraft(draft);
      setDrafts(current => [
        saved,
        ...current.filter(item => `${item.signal}:${item.draftKey}` !== `${saved.signal}:${saved.draftKey}`)
      ]);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    } finally {
      setSavingRuntimeEvidenceKey(null);
    }
  };

  const findFilterPanelExecutionPlan = (variable: SignalDashboardVariable) => {
    const variableName = variable.name.trim();
    const variableValue = variable.value.trim();
    if (!variableName || !variableValue) return null;
    return executionPlans.find(plan => {
      if (plan.state !== 'ready' || !plan.resolvedRoute) return false;
      return plan.sourceRoute.includes(`$${variableName}`) || plan.resolvedRoute.includes(variableValue);
    }) || null;
  };

  const addFilterSelectionPanelDraft = async (variable: SignalDashboardVariable) => {
    const executionPlan = findFilterPanelExecutionPlan(variable);
    const filterKey = `${variable.name}:${variable.value}`;
    const nextDrafts = executionPlan ? createSignalDashboardPanelDraftsFromFilterSelection({
      variable,
      signal: executionPlan.signal,
      sourcePanelId: executionPlan.panelId,
      route: executionPlan.resolvedRoute,
      titlePrefix: t('dashboard.composition.filter-toolbar.panel-title-prefix')
    }) : [];
    if (nextDrafts.length === 0) return;
    setSavingFilterPanelKey(filterKey);
    try {
      const savedDrafts: SignalDashboardPanelDraft[] = [];
      for (const draft of nextDrafts) {
        savedDrafts.push(await saveSignalDashboardPanelDraft(draft));
      }
      const savedKeys = new Set(savedDrafts.map(item => `${item.signal}:${item.draftKey}`));
      setDrafts(current => [
        ...savedDrafts,
        ...current.filter(item => !savedKeys.has(`${item.signal}:${item.draftKey}`))
      ]);
      setLoadState('ready');
      if (selectedDashboard) {
        const nextDashboard = mergeSignalDashboardDraftsIntoComposition(selectedDashboard, savedDrafts);
        const savedDashboard = await saveSignalDashboard(nextDashboard);
        setDashboards(current => [savedDashboard, ...current.filter(item => item.dashboardKey !== savedDashboard.dashboardKey)]);
        setDashboardTitleDraft(savedDashboard.title);
        setDashboardDescriptionDraft(savedDashboard.description || defaultDashboardDescription);
        setCompositionState('saved');
      }
    } catch {
      setLoadState('error');
      setCompositionState('error');
    } finally {
      setSavingFilterPanelKey(null);
    }
  };

  const saveVariables = async () => {
    if (!selectedDashboard) return;
    setSavingVariables(true);
    setCompositionState('saving');
    try {
      const saved = await saveSignalDashboard(selectedDashboard);
      setDashboards(current => [saved, ...current.filter(item => item.dashboardKey !== saved.dashboardKey)]);
      setCompositionState('saved');
    } catch {
      setCompositionState('error');
    } finally {
      setSavingVariables(false);
    }
  };

  const selectDashboard = (dashboard: SignalDashboard) => {
    setDashboardKeyDraft(dashboard.dashboardKey);
    setDashboardTitleDraft(dashboard.title);
    setDashboardDescriptionDraft(dashboard.description || defaultDashboardDescription);
    replaceDashboardDeepLink(dashboard.dashboardKey);
  };

  const deleteDashboard = async (dashboard: SignalDashboard) => {
    setDeletingDashboardKey(dashboard.dashboardKey);
    try {
      await deleteSignalDashboard(dashboard.dashboardKey);
      setDashboards(current => {
        const nextDashboards = current.filter(item => item.dashboardKey !== dashboard.dashboardKey);
        const nextSelected = nextDashboards[0];
        if (dashboardKeyDraft === dashboard.dashboardKey) {
          const nextDashboardKey = nextSelected?.dashboardKey || 'signals-overview';
          setDashboardKeyDraft(nextDashboardKey);
          setDashboardTitleDraft(nextSelected?.title || defaultDashboardTitle);
          setDashboardDescriptionDraft(nextSelected?.description || defaultDashboardDescription);
          replaceDashboardDeepLink(nextDashboardKey);
        }
        setCompositionState(nextDashboards.length > 0 ? 'ready' : 'empty');
        return nextDashboards;
      });
    } catch {
      setCompositionState('error');
    } finally {
      setDeletingDashboardKey(null);
    }
  };

  const deleteDraft = async (draft: SignalDashboardPanelDraft) => {
    const rowKey = `${draft.signal}:${draft.draftKey}`;
    setDeletingDraftKey(rowKey);
    try {
      await deleteSignalDashboardPanelDraft(draft.signal, draft.draftKey);
      setDrafts(current => {
        const nextDrafts = current.filter(item => `${item.signal}:${item.draftKey}` !== rowKey);
        return nextDrafts;
      });
      setLoadState(current => current === 'error' ? current : drafts.length > 1 ? 'ready' : 'empty');
    } catch {
      setLoadState('error');
    } finally {
      setDeletingDraftKey(null);
    }
  };

  const duplicateDraft = async (draft: SignalDashboardPanelDraft) => {
    const rowKey = `${draft.signal}:${draft.draftKey}`;
    setDuplicatingDraftKey(rowKey);
    try {
      const duplicate = duplicateSignalDashboardPanelDraft(draft, {
        titleSuffix: t('dashboard.add-panel.duplicate-title-suffix')
      });
      const saved = await saveSignalDashboardPanelDraft(duplicate);
      setDrafts(current => [
        saved,
        ...current.filter(item => `${item.signal}:${item.draftKey}` !== `${saved.signal}:${saved.draftKey}`)
      ]);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    } finally {
      setDuplicatingDraftKey(null);
    }
  };

  const addSavedViewAsPanelDraft = async (view: SignalSavedQueryViewWithSignal) => {
    const rowKey = savedViewRowKey(view);
    setPromotingSavedViewKey(rowKey);
    setSavedViewLoadState(current => current === 'error' ? current : 'ready');
    try {
      const draft = createSignalDashboardPanelDraftFromSavedView(view.signal, view);
      const saved = await saveSignalDashboardPanelDraft(draft);
      setDrafts(current => [
        saved,
        ...current.filter(item => `${item.signal}:${item.draftKey}` !== `${saved.signal}:${saved.draftKey}`)
      ]);
      setLoadState('ready');
    } catch {
      setSavedViewLoadState('error');
    } finally {
      setPromotingSavedViewKey(null);
    }
  };

  const deleteSavedView = async (view: SignalSavedQueryViewWithSignal) => {
    const rowKey = savedViewRowKey(view);
    setDeletingSavedViewKey(rowKey);
    try {
      await deleteSignalSavedQueryView(view.signal, view.id);
      setSavedViews(current => {
        const nextSavedViews = current.filter(item => savedViewRowKey(item) !== rowKey);
        setSavedViewLoadState(state => state === 'error' ? state : nextSavedViews.length > 0 ? 'ready' : 'empty');
        return nextSavedViews;
      });
      setSavedViewDrafts(current => {
        const nextDrafts = { ...current };
        delete nextDrafts[rowKey];
        return nextDrafts;
      });
    } catch {
      setSavedViewLoadState('error');
    } finally {
      setDeletingSavedViewKey(null);
    }
  };

  const updateSavedViewDraft = (view: SignalSavedQueryViewWithSignal, patch: Partial<SavedViewDraftFields>) => {
    const rowKey = savedViewRowKey(view);
    setSavedViewDrafts(current => ({
      ...current,
      [rowKey]: {
        label: current[rowKey]?.label ?? view.label,
        description: current[rowKey]?.description ?? view.description,
        ...patch
      }
    }));
  };

  const saveSavedViewMetadata = async (view: SignalSavedQueryViewWithSignal) => {
    const rowKey = savedViewRowKey(view);
    const draft = savedViewDrafts[rowKey] || { label: view.label, description: view.description };
    setSavingSavedViewKey(rowKey);
    try {
      const saved = await saveSignalSavedQueryView(view.signal, {
        ...view,
        label: draft.label.trim() || view.label,
        description: draft.description
      });
      const nextView: SignalSavedQueryViewWithSignal = { ...saved, signal: view.signal };
      setSavedViews(current => current.map(item => savedViewRowKey(item) === rowKey ? nextView : item));
      setSavedViewDrafts(current => ({
        ...current,
        [rowKey]: {
          label: nextView.label,
          description: nextView.description
        }
      }));
      setSavedViewLoadState(current => current === 'error' ? current : 'ready');
    } catch {
      setSavedViewLoadState('error');
    } finally {
      setSavingSavedViewKey(null);
    }
  };

  const columns: HzDataColumn<SignalDashboardPanelDraft>[] = [
    {
      key: 'panel',
      header: t('dashboard.panel-drafts.column.panel'),
      render: draft => {
        const sourceSummary = readPanelDraftSourceSummary(draft);
        return (
          <HzDataCellStack display="block">
            <HzDataCellText variant="title" display="block">{draft.title}</HzDataCellText>
            <HzDataCellText variant="copy" display="block" spacing="stack-tight">{draft.description || draft.draftKey}</HzDataCellText>
            {sourceSummary ? (
              <HzDataMetaText display="block" data-dashboard-panel-draft-source-summary={sourceSummary}>
                {sourceSummary}
              </HzDataMetaText>
            ) : null}
          </HzDataCellStack>
        );
      }
    },
    {
      key: 'signal',
      header: t('dashboard.panel-drafts.column.signal'),
      width: '112px',
      render: draft => <HzStatusBadge tone="info">{t(`dashboard.add-panel.signal.${draft.signal}`)}</HzStatusBadge>
    },
    {
      key: 'visualization',
      header: t('dashboard.panel-drafts.column.visualization'),
      width: '132px',
      render: draft => <HzDataCellText variant="type">{visualizationLabel(draft.visualization)}</HzDataCellText>
    },
    {
      key: 'route',
      header: t('dashboard.panel-drafts.column.route'),
      render: draft => <HzDataCellText variant="identifier" display="block">{draft.route}</HzDataCellText>
    },
    {
      key: 'updated',
      header: t('dashboard.panel-drafts.column.updated'),
      width: '172px',
      render: draft => <HzDataCellText variant="timestamp">{formatUpdatedAt(draft.updateTime || draft.createTime, locale)}</HzDataCellText>
    },
    {
      key: 'actions',
      header: t('dashboard.panel-drafts.column.actions'),
      width: '210px',
      render: draft => {
        const rowKey = `${draft.signal}:${draft.draftKey}`;
        return (
          <div className="flex flex-wrap items-center gap-2">
            <HzButtonLink
              href={draft.route}
              size="sm"
              data-dashboard-panel-draft-action="open-source"
            >
              <ExternalLink size={13} />
              {t('dashboard.add-panel.action.open-explorer')}
            </HzButtonLink>
            <HzButton
              type="button"
              size="sm"
              intent="ghost"
              disabled={duplicatingDraftKey === rowKey}
              onClick={() => void duplicateDraft(draft)}
              data-dashboard-panel-draft-action="duplicate"
            >
              <Copy size={13} />
              {t('dashboard.add-panel.action.duplicate-draft')}
            </HzButton>
            <HzButton
              type="button"
              size="sm"
              intent="ghost"
              disabled={deletingDraftKey === rowKey}
              onClick={() => void deleteDraft(draft)}
              data-dashboard-panel-draft-action="delete"
            >
              <Trash2 size={13} />
              {t('dashboard.add-panel.action.delete-draft')}
            </HzButton>
          </div>
        );
      }
    }
  ];

  const savedViewColumns: HzDataColumn<SignalSavedQueryViewWithSignal>[] = [
    {
      key: 'view',
      header: t('dashboard.saved-views.column.view'),
      render: view => {
        const rowKey = savedViewRowKey(view);
        const draft = savedViewDrafts[rowKey] || { label: view.label, description: view.description };
        return (
          <HzDataCellStack display="block">
            <label className="block min-w-0" data-dashboard-saved-view-field="label">
              <HzDataMetaText display="block">{t('dashboard.saved-views.field.label')}</HzDataMetaText>
              <HzInput
                className="mt-1"
                value={draft.label}
                onChange={event => updateSavedViewDraft(view, { label: event.target.value })}
                data-dashboard-saved-view-label-input={view.id}
              />
            </label>
            <label className="mt-2 block min-w-0" data-dashboard-saved-view-field="description">
              <HzDataMetaText display="block">{t('dashboard.saved-views.field.description')}</HzDataMetaText>
              <HzInput
                className="mt-1"
                value={draft.description}
                onChange={event => updateSavedViewDraft(view, { description: event.target.value })}
                data-dashboard-saved-view-description-input={view.id}
              />
            </label>
            <HzDataCellText variant="copy" display="block" spacing="stack-tight">{view.id}</HzDataCellText>
          </HzDataCellStack>
        );
      }
    },
    {
      key: 'signal',
      header: t('dashboard.saved-views.column.signal'),
      width: '112px',
      render: view => <HzStatusBadge tone="info">{t(`dashboard.add-panel.signal.${view.signal}`)}</HzStatusBadge>
    },
    {
      key: 'route',
      header: t('dashboard.saved-views.column.route'),
      render: view => <HzDataCellText variant="identifier" display="block">{view.route}</HzDataCellText>
    },
    {
      key: 'updated',
      header: t('dashboard.saved-views.column.created'),
      width: '172px',
      render: view => <HzDataCellText variant="timestamp">{new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(view.createdAt)}</HzDataCellText>
    },
    {
      key: 'actions',
      header: t('dashboard.saved-views.column.actions'),
      width: '240px',
      render: view => {
        const rowKey = savedViewRowKey(view);
        return (
          <div className="flex flex-wrap items-center gap-2">
            <HzButton
              type="button"
              size="sm"
              intent="primary"
              disabled={savingSavedViewKey === rowKey}
              onClick={() => void saveSavedViewMetadata(view)}
              data-dashboard-saved-view-action="update"
            >
              <Save size={13} />
              {t('dashboard.saved-views.action.update')}
            </HzButton>
            <HzButtonLink
              href={view.route}
              size="sm"
              data-dashboard-saved-view-action="open-source"
            >
              <ExternalLink size={13} />
              {t('dashboard.add-panel.action.open-explorer')}
            </HzButtonLink>
            <HzButton
              type="button"
              size="sm"
              intent="secondary"
              disabled={promotingSavedViewKey === rowKey}
              onClick={() => void addSavedViewAsPanelDraft(view)}
              data-dashboard-saved-view-action="add-panel"
            >
              <LayoutDashboard size={13} />
              {t('dashboard.saved-views.action.add-panel')}
            </HzButton>
            <HzButton
              type="button"
              size="sm"
              intent="ghost"
              disabled={deletingSavedViewKey === rowKey}
              onClick={() => void deleteSavedView(view)}
              data-dashboard-saved-view-action="delete"
            >
              <Trash2 size={13} />
              {t('dashboard.saved-views.action.delete')}
            </HzButton>
          </div>
        );
      }
    }
  ];

  const statusCopy = t(`dashboard.panel-drafts.status.${loadState}`);
  const savedViewStatusCopy = savedViewLoadState === 'partial'
    ? t('dashboard.saved-views.status.partial', {
      signals: savedViewFailedSignals.map(signal => t(`dashboard.add-panel.signal.${signal}`)).join(', ')
    })
    : t(`dashboard.saved-views.status.${savedViewLoadState}`);

  return (
    <div
      className="min-h-[calc(100vh-56px)] bg-[#07090b] text-[#e8edf5]"
      data-dashboard-workspace="signal-panel-drafts"
      data-dashboard-panel-draft-source="hertzbeat-api"
      data-dashboard-composition-source="hertzbeat-api"
      data-dashboard-panel-drafts-state={loadState}
      data-dashboard-saved-views-state={savedViewLoadState}
      data-dashboard-saved-views-failed-signals={savedViewFailedSignals.join(',')}
      data-dashboard-composition-state={compositionState}
      data-dashboard-panel-drafts-context-source={contextSource}
    >
      <HzExplorerFrame
        className="mx-0 mb-0 mt-0 min-h-[calc(100vh-56px)] sm:mx-0"
        eyebrow={t('menu.section.dashboards')}
        title={t('dashboard.panel-drafts.title')}
        description={t('dashboard.add-panel.saved-description')}
        mainId="dashboard-panel-drafts-main"
        mainLabel={t('dashboard.panel-drafts.title')}
        actions={
          <>
            <HzButton
              type="button"
              intent="primary"
              disabled={drafts.length === 0 || compositionState === 'saving'}
              onClick={() => void saveLayout()}
              data-dashboard-save-layout-action="signal-dashboard"
            >
              <Save size={14} />
              {t('dashboard.composition.action.save-layout')}
            </HzButton>
            <HzButtonLink href="/overview" intent="secondary" data-dashboard-panel-draft-action="overview">
              <LayoutDashboard size={14} />
              {t('dashboard.panel-drafts.action.overview')}
            </HzButtonLink>
          </>
        }
        metricStrip={
          <div className="border-b border-[#252b35] bg-[#0b0e13] px-4 py-3" data-dashboard-panel-draft-metrics="true">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
              {metrics.map(metric => (
                <HzPanelSurface
                  key={metric.key}
                  padding="query"
                  className="shadow-none"
                  data-dashboard-panel-draft-metric={metric.key}
                >
                  <HzDataMetaText display="block">{metric.label}</HzDataMetaText>
                  <div className="mt-1 text-[18px] font-semibold leading-none text-[#f5f7fb]">{metric.value}</div>
                </HzPanelSurface>
              ))}
            </div>
          </div>
        }
      >
        <div className="min-w-0 px-4 py-4">
          <HzPanelSurface
            className="mb-4"
            data-dashboard-composition-target-owner="hertzbeat-ui-panel-surface"
            data-dashboard-composition-target-key={normalizeSignalDashboardKey(dashboardKeyDraft || dashboardTitleDraft)}
          >
            <div className="grid min-w-0 gap-3 px-4 py-3 lg:grid-cols-[180px_minmax(0,1fr)_minmax(0,1.25fr)]">
              <div className="min-w-0">
                <HzDataMetaText display="block">{t('dashboard.composition.target-title')}</HzDataMetaText>
                <HzDataCellText variant="identifier" display="block" spacing="stack-tight">
                  {normalizeSignalDashboardKey(dashboardKeyDraft || dashboardTitleDraft)}
                </HzDataCellText>
              </div>
              <label className="min-w-0" data-dashboard-composition-target-field="title">
                <HzDataMetaText display="block">{t('dashboard.composition.field.title')}</HzDataMetaText>
                <HzInput
                  className="mt-1"
                  value={dashboardTitleDraft}
                  onChange={event => setDashboardTitleDraft(event.target.value)}
                  placeholder={defaultDashboardTitle}
                  data-dashboard-composition-title-input="true"
                />
              </label>
              <label className="min-w-0" data-dashboard-composition-target-field="description">
                <HzDataMetaText display="block">{t('dashboard.composition.field.description')}</HzDataMetaText>
                <HzInput
                  className="mt-1"
                  value={dashboardDescriptionDraft}
                  onChange={event => setDashboardDescriptionDraft(event.target.value)}
                  placeholder={defaultDashboardDescription}
                  data-dashboard-composition-description-input="true"
                />
              </label>
              <label className="min-w-0 lg:col-span-3" data-dashboard-composition-target-field="key">
                <HzDataMetaText display="block">{t('dashboard.composition.field.key')}</HzDataMetaText>
                <HzInput
                  className="mt-1 font-mono"
                  value={dashboardKeyDraft}
                  onChange={event => setDashboardKeyDraft(event.target.value)}
                  placeholder="signals-overview"
                  data-dashboard-composition-key-input="true"
                />
              </label>
            </div>
          </HzPanelSurface>
          <HzPanelSurface
            className="mb-4"
            clip
            data-dashboard-composition-variables-owner="hertzbeat-ui-panel-surface"
            data-dashboard-composition-variables-count={dashboardVariables.length}
            data-dashboard-composition-variable-options-count={dashboardVariableOptionCount}
            data-dashboard-composition-variables-state={selectedDashboard ? 'ready' : 'no-selection'}
          >
            <div className="flex min-w-0 flex-col gap-1 border-b border-[#252b35] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-[13px] font-semibold text-[#f3f6fb]">{t('dashboard.composition.variables-title')}</h2>
                <p className="mt-1 text-[12px] leading-5 text-[#8f99ab]">
                  {selectedDashboard ? t('dashboard.composition.variables-copy') : t('dashboard.composition.variables-empty-copy')}
                </p>
              </div>
              <HzButton
                type="button"
                size="sm"
                intent="secondary"
                disabled={!selectedDashboard || savingVariables}
                onClick={() => void saveVariables()}
                data-dashboard-composition-variables-action="save"
              >
                <Save size={13} />
                {t('dashboard.composition.action.save-variables')}
              </HzButton>
            </div>
            {selectedDashboard ? (
              <div className="grid gap-3 p-4">
                <div
                  className="grid min-w-0 gap-2 rounded-[4px] border border-[#252b35] bg-[#0d1117] p-3 lg:grid-cols-[minmax(0,1fr)_160px_minmax(0,1fr)]"
                  data-dashboard-composition-variable-editor="true"
                >
                  <label className="min-w-0">
                    <HzDataMetaText display="block">{t('dashboard.composition.variable.field.name')}</HzDataMetaText>
                    <HzInput
                      className="mt-1 font-mono"
                      value={variableNameDraft}
                      onChange={event => setVariableNameDraft(event.target.value)}
                      data-dashboard-composition-variable-input="name"
                    />
                  </label>
                  <label className="min-w-0">
                    <HzDataMetaText display="block">{t('dashboard.composition.variable.field.type')}</HzDataMetaText>
                    <HzSelect
                      className="mt-1"
                      options={VARIABLE_TYPE_OPTIONS.map(option => ({ value: option.value, label: t(option.labelKey) }))}
                      value={variableTypeDraft}
                      onChange={event => setVariableTypeDraft(event.target.value as SignalDashboardVariableType)}
                      data-dashboard-composition-variable-input="type"
                    />
                  </label>
                  <label className="min-w-0">
                    <HzDataMetaText display="block">{t('dashboard.composition.variable.field.value')}</HzDataMetaText>
                    <HzInput
                      className="mt-1"
                      value={variableValueDraft}
                      onChange={event => setVariableValueDraft(event.target.value)}
                      data-dashboard-composition-variable-input="value"
                    />
                  </label>
                  <label className="min-w-0 lg:col-span-2">
                    <HzDataMetaText display="block">{t('dashboard.composition.variable.field.description')}</HzDataMetaText>
                    <HzInput
                      className="mt-1"
                      value={variableDescriptionDraft}
                      onChange={event => setVariableDescriptionDraft(event.target.value)}
                      data-dashboard-composition-variable-input="description"
                    />
                  </label>
                  <label className="min-w-0">
                    <HzDataMetaText display="block">{t('dashboard.composition.variable.field.options')}</HzDataMetaText>
                    <HzInput
                      className="mt-1"
                      value={variableOptionsDraft}
                      onChange={event => setVariableOptionsDraft(event.target.value)}
                      data-dashboard-composition-variable-input="options"
                    />
                  </label>
                  <div className="flex items-end justify-end lg:col-span-3">
                    <HzButton
                      type="button"
                      size="sm"
                      intent="primary"
                      onClick={addVariable}
                      data-dashboard-composition-variables-action="add"
                    >
                      {t('dashboard.composition.action.add-variable')}
                    </HzButton>
                  </div>
                </div>
                {dashboardVariables.length > 0 ? (
                  <div className="grid gap-2" data-dashboard-composition-variable-list="true">
                    {dashboardVariables.map(variable => {
                      const variableOptions = dashboardVariableOptions[variable.name] || [];
                      const runtimeOptionCount = variableOptions.filter(option => option.source === 'runtime').length;
                      const staticOptionCount = variableOptions.filter(option => option.source === 'static').length;
                      const selectedVariableValues = variable.value.split(',').map(value => value.trim()).filter(Boolean);
                      return (
                        <div
                          key={variable.name}
                          className="grid min-w-0 gap-2 rounded-[4px] border border-[#252b35] bg-[#0b0e13] px-3 py-2 lg:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)_96px]"
                          data-dashboard-composition-variable-row={variable.name}
                          data-dashboard-composition-variable-type={variable.type}
                          data-dashboard-composition-variable-options-count={variableOptions.length}
                          data-dashboard-composition-variable-runtime-options-count={runtimeOptionCount}
                          data-dashboard-composition-variable-static-options-count={staticOptionCount}
                        >
                          <HzDataCellStack display="block">
                            <HzDataCellText variant="title" display="block">{`$${variable.name}`}</HzDataCellText>
                            <HzDataCellText variant="copy" display="block" spacing="stack-tight">
                              {variable.description || t('dashboard.composition.variable.description-empty')}
                            </HzDataCellText>
                          </HzDataCellStack>
                          <HzStatusBadge tone="info">{t(`dashboard.composition.variable.type.${variable.type}`)}</HzStatusBadge>
                          <div className="min-w-0">
                            <HzDataCellText variant="identifier" display="block">
                              {variable.options && variable.options.length > 0 ? variable.options.join(',') : variable.value || '-'}
                            </HzDataCellText>
                            {variableOptions.length > 0 ? (
                              <div
                                className="mt-1 flex min-w-0 flex-wrap gap-1"
                                data-dashboard-composition-variable-options={variable.name}
                              >
                                {variableOptions.slice(0, 6).map(option => {
                                  const selected = variable.multi
                                    ? selectedVariableValues.includes(option.value)
                                    : variable.value.trim() === option.value;
                                  return (
                                    <button
                                      type="button"
                                      key={option.key}
                                      className={`max-w-full truncate rounded-[3px] border px-1.5 py-0.5 text-left text-[10px] leading-4 ${
                                        selected
                                          ? 'border-[#62d6a4] bg-[#123326] text-[#ddfff2]'
                                          : 'border-[#2f3744] bg-[#111722] text-[#aeb8c8]'
                                      }`}
                                      title={`${option.label} (${option.count})`}
                                      onClick={() => selectVariableOption(variable.name, option.value)}
                                      data-dashboard-composition-variable-option={option.value}
                                      data-dashboard-composition-variable-option-source={option.source}
                                      data-dashboard-composition-variable-option-count={option.count}
                                      data-dashboard-composition-variable-option-selected={selected ? 'true' : 'false'}
                                      data-dashboard-composition-variable-option-action="select"
                                    >
                                      {option.label}
                                      <span className={`ml-1 ${selected ? 'text-[#9df2cf]' : 'text-[#6f7b8d]'}`}>{t(`dashboard.composition.variable.option-source.${option.source}`)}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                          <HzButton
                            type="button"
                            size="sm"
                            intent="ghost"
                            onClick={() => deleteVariable(variable.name)}
                            data-dashboard-composition-variables-action="delete"
                          >
                            <Trash2 size={13} />
                            {t('dashboard.composition.action.delete-variable')}
                          </HzButton>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <HzEmptyState
                    title={t('dashboard.composition.variables-empty-title')}
                    description={t('dashboard.composition.variables-empty-copy')}
                    layout="table-panel"
                    data-dashboard-composition-variables-empty-state="empty"
                  />
                )}
              </div>
            ) : (
              <HzEmptyState
                title={t('dashboard.composition.variables-empty-title')}
                description={t('dashboard.composition.variables-empty-copy')}
                layout="table-panel"
                data-dashboard-composition-variables-empty-state="no-selection"
              />
            )}
          </HzPanelSurface>
          <HzPanelSurface
            className="mb-4"
            clip
            data-dashboard-composition-preview-owner="hertzbeat-ui-panel-surface"
            data-dashboard-composition-preview-key={selectedDashboard?.dashboardKey || normalizeSignalDashboardKey(dashboardKeyDraft || dashboardTitleDraft)}
            data-dashboard-service-overview-context={serviceOverviewContext ? 'ready' : 'missing'}
            data-dashboard-service-overview-service={serviceOverviewContext?.serviceName || ''}
            data-dashboard-operation-drilldown-context={operationDrilldownContext ? 'ready' : 'missing'}
            data-dashboard-operation-drilldown-operation={operationDrilldownContext?.operationName || ''}
            data-dashboard-composition-preview-panels={previewPanels.length}
            data-dashboard-composition-time-range-mode={dashboardTimeRangeMode}
            data-dashboard-composition-time-range-start={dashboardTimeRange.start}
            data-dashboard-composition-time-range-end={dashboardTimeRange.end}
            data-dashboard-composition-time-range-preset={dashboardTimeRange.timeRange}
            data-dashboard-composition-time-range-execution-start={dashboardExecutionTimeRange.start}
            data-dashboard-composition-time-range-execution-end={dashboardExecutionTimeRange.end}
            data-dashboard-composition-refresh-mode={dashboardRefreshState.mode}
            data-dashboard-composition-refresh-interval={dashboardRefreshState.intervalSeconds}
            data-dashboard-composition-refresh-tick={refreshTick}
            data-dashboard-composition-refresh-live={dashboardTimeRange.live}
            data-dashboard-composition-runtime-sync-timestamp={runtimeSyncTimestamp}
            data-dashboard-composition-runtime-sync-hover-timestamp={runtimeSyncHoverTimestamp}
            data-dashboard-composition-runtime-sync-pinned-timestamp={runtimePinnedSyncTimestamp}
            data-dashboard-composition-runtime-sync-state={runtimeSyncTimestamp ? 'active' : 'idle'}
            data-dashboard-composition-runtime-sync-pin-state={runtimePinnedSyncTimestamp ? 'pinned' : 'idle'}
            data-dashboard-composition-runtime-sync-tooltip-state={runtimeSyncTooltip.state}
            data-dashboard-composition-runtime-sync-tooltip-rows={runtimeSyncTooltip.rowCount}
            data-dashboard-composition-runtime-sync-crosshair-state={runtimeSyncCrosshair.state}
            data-dashboard-composition-runtime-sync-crosshair-panels={runtimeSyncCrosshair.panelCount}
            data-dashboard-composition-runtime-sync-crosshair-points={runtimeSyncCrosshair.pointCount}
          >
            <div className="flex min-w-0 flex-col gap-1 border-b border-[#252b35] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-[13px] font-semibold text-[#f3f6fb]">{t('dashboard.composition.preview-title')}</h2>
                <p className="mt-1 text-[12px] leading-5 text-[#8f99ab]">
                  {selectedDashboard
                    ? t('dashboard.composition.preview-copy')
                    : t('dashboard.composition.preview-empty-copy')}
                </p>
              </div>
              <HzStatusBadge
                tone={previewPanels.length > 0 ? 'success' : 'warning'}
                label={t('dashboard.composition.widget-count')}
                value={previewPanels.length}
              />
              <HzStatusBadge
                tone={runtimeSyncTimestamp ? 'info' : 'neutral'}
                label={t('dashboard.runtime.sync')}
                value={runtimeSyncTimestamp || t('dashboard.runtime.sync.idle')}
              />
              <HzStatusBadge
                tone={runtimePinnedSyncTimestamp ? 'info' : 'neutral'}
                label={t('dashboard.runtime.sync.pin')}
                value={runtimePinnedSyncTimestamp || t('dashboard.runtime.sync.idle')}
              />
              <HzButton
                type="button"
                size="sm"
                intent="secondary"
                disabled={!selectedDashboard || previewPanels.length === 0 || savingPreviewLayout}
                onClick={() => void savePreviewLayout()}
                data-dashboard-composition-preview-action="save-layout"
              >
                <Save size={13} />
                {t('dashboard.composition.action.save-preview-layout')}
              </HzButton>
              <HzButton
                type="button"
                size="sm"
                intent="secondary"
                disabled={!serviceOverviewContext || savingServiceOverview}
                onClick={() => void saveServiceOverviewDashboard()}
                data-dashboard-service-overview-action="save"
                data-dashboard-service-overview-action-state={serviceOverviewContext ? 'ready' : 'missing'}
                data-dashboard-service-overview-action-service={serviceOverviewContext?.serviceName || ''}
              >
                <LayoutDashboard size={13} />
                {t('dashboard.composition.action.save-service-overview')}
              </HzButton>
              <HzButton
                type="button"
                size="sm"
                intent="secondary"
                disabled={!operationDrilldownContext || savingOperationDrilldown}
                onClick={() => void saveOperationDrilldownDashboard()}
                data-dashboard-operation-drilldown-action="save"
                data-dashboard-operation-drilldown-action-state={operationDrilldownContext ? 'ready' : 'missing'}
                data-dashboard-operation-drilldown-action-service={operationDrilldownContext?.serviceName || ''}
                data-dashboard-operation-drilldown-action-operation={operationDrilldownContext?.operationName || ''}
              >
                <ExternalLink size={13} />
                {t('dashboard.composition.action.save-operation-drilldown')}
              </HzButton>
            </div>
            <div
              className="grid gap-2 border-b border-[#252b35] bg-[#080b10] px-4 py-3"
              data-dashboard-composition-runtime-sync-tooltip={runtimeSyncTooltip.timestamp}
              data-dashboard-composition-runtime-sync-tooltip-state={runtimeSyncTooltip.state}
              data-dashboard-composition-runtime-sync-tooltip-rows={runtimeSyncTooltip.rowCount}
              data-dashboard-composition-runtime-sync-pin-state={runtimePinnedSyncTimestamp ? 'pinned' : 'idle'}
              data-dashboard-composition-runtime-sync-pinned-timestamp={runtimePinnedSyncTimestamp}
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <HzDataMetaText display="block">{t('dashboard.runtime.sync.tooltip')}</HzDataMetaText>
                <div className="flex min-w-0 items-center gap-2">
                  <HzDataCellText variant="identifier" display="block">
                    {runtimeSyncTooltip.timestamp || t('dashboard.runtime.sync.idle')}
                  </HzDataCellText>
                  <HzButton
                    type="button"
                    size="sm"
                    intent="ghost"
                    disabled={!runtimePinnedSyncTimestamp}
                    onClick={() => setRuntimePinnedSyncTimestamp('')}
                    data-dashboard-composition-runtime-sync-action="clear-pin"
                    data-dashboard-composition-runtime-sync-action-state={runtimePinnedSyncTimestamp ? 'enabled' : 'disabled'}
                  >
                    <X size={13} />
                    {t('dashboard.runtime.sync.clear-pin')}
                  </HzButton>
                </div>
              </div>
              {runtimeSyncTooltip.rows.length > 0 ? (
                <div className="grid gap-1" data-dashboard-composition-runtime-sync-tooltip-list="true">
                  {runtimeSyncTooltip.rows.slice(0, 6).map(row => {
                    const rowExecutionPlan = executionPlanByPanelId.get(row.panelId);
                    const rowHandoffHref = buildSignalDashboardRuntimeEvidenceSourceHandoff(rowExecutionPlan?.resolvedRoute, row, {
                      timeRange: dashboardExecutionTimeRange,
                      returnTo: dashboardReturnHref
                    });
                    const rowFilterCandidates = buildSignalDashboardRuntimeEvidenceFilters(dashboardVariables, row);
                    const rowFilterSuggestions = buildSignalDashboardRuntimeEvidenceFilterSuggestions(dashboardVariables, row);
                    return (
                      <div
                        key={row.key}
                        className="grid min-w-0 grid-cols-[72px_86px_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 rounded-[3px] border border-[#252b35] bg-[#0d1117] px-2 py-1 text-[10px]"
                        data-dashboard-composition-runtime-sync-tooltip-row={row.key}
                        data-dashboard-composition-runtime-sync-tooltip-row-panel={row.panelId}
                        data-dashboard-composition-runtime-sync-tooltip-row-signal={row.signal}
                        data-dashboard-composition-runtime-sync-tooltip-row-source={row.source}
                        data-dashboard-composition-runtime-sync-tooltip-row-handoff={rowHandoffHref}
                        data-dashboard-composition-runtime-sync-tooltip-row-handoff-state={rowHandoffHref ? 'ready' : 'missing'}
                        data-dashboard-composition-runtime-sync-tooltip-row-handoff-kind={rowHandoffHref ? 'resolved-route' : 'missing'}
                        data-dashboard-composition-runtime-sync-tooltip-row-handoff-trace={row.traceId || ''}
                        data-dashboard-composition-runtime-sync-tooltip-row-handoff-span={row.spanId || ''}
                        data-dashboard-composition-runtime-sync-tooltip-row-related-signal={row.relatedSignal || ''}
                        data-dashboard-composition-runtime-sync-tooltip-row-related-handoff={row.relatedHandoffHref || ''}
                        data-dashboard-composition-runtime-sync-tooltip-row-related-handoff-state={row.relatedHandoffHref ? 'ready' : 'missing'}
                        data-dashboard-composition-runtime-sync-tooltip-row-filter-candidates={rowFilterCandidates.length}
                        data-dashboard-composition-runtime-sync-tooltip-row-filter-suggestions={rowFilterSuggestions.length}
                        data-dashboard-composition-runtime-sync-tooltip-row-breakout-attributes={row.breakoutAttributes?.length || 0}
                      >
                        <span className="truncate font-semibold text-[#d7deea]">{row.signal}</span>
                        <span className="truncate text-[#6f7a8d]">{row.source}</span>
                        <span className="truncate text-[#aeb8c8]">{row.label}</span>
                        <span className="truncate font-mono text-[#d7deea]">{row.value}</span>
                        <span className="flex min-w-0 justify-end gap-1">
                          {rowFilterCandidates.slice(0, 2).map(candidate => (
                            <HzButton
                              key={candidate.key}
                              type="button"
                              size="sm"
                              intent="ghost"
                              onClick={() => selectVariableOption(candidate.variableName, candidate.value)}
                              data-dashboard-composition-runtime-sync-tooltip-row-action="apply-filter"
                              data-dashboard-composition-runtime-sync-tooltip-row-action-variable={candidate.variableName}
                              data-dashboard-composition-runtime-sync-tooltip-row-action-value={candidate.value}
                              data-dashboard-composition-runtime-sync-tooltip-row-action-filter-source={candidate.source}
                            >
                              {t('dashboard.runtime.sync.apply-filter')}
                            </HzButton>
                          ))}
                          {rowFilterSuggestions.slice(0, 2).map(suggestion => (
                            <HzButton
                              key={suggestion.key}
                              type="button"
                              size="sm"
                              intent="ghost"
                              onClick={() => addEvidenceFilterVariable(suggestion.variableName, suggestion.variableType, suggestion.value)}
                              data-dashboard-composition-runtime-sync-tooltip-row-action="add-filter-variable"
                              data-dashboard-composition-runtime-sync-tooltip-row-action-variable={suggestion.variableName}
                              data-dashboard-composition-runtime-sync-tooltip-row-action-value={suggestion.value}
                              data-dashboard-composition-runtime-sync-tooltip-row-action-filter-source={suggestion.source}
                              data-dashboard-composition-runtime-sync-tooltip-row-action-variable-type={suggestion.variableType}
                            >
                              {t('dashboard.runtime.sync.add-filter')}
                            </HzButton>
                          ))}
                          {(row.breakoutAttributes || []).slice(0, 2).map(attribute => {
                            const savingKey = `${row.key}:breakout:${attribute.name}`;
                            return (
                              <HzButton
                                key={attribute.key}
                                type="button"
                                size="sm"
                                intent="ghost"
                                disabled={!rowHandoffHref || savingRuntimeEvidenceKey === savingKey}
                                onClick={() => void addRuntimeBreakoutPanelDraft(row, rowHandoffHref, attribute)}
                                data-dashboard-composition-runtime-sync-tooltip-row-action="breakout-panel-draft"
                                data-dashboard-composition-runtime-sync-tooltip-row-action-panel={row.panelId}
                                data-dashboard-composition-runtime-sync-tooltip-row-action-attribute={attribute.name}
                                data-dashboard-composition-runtime-sync-tooltip-row-action-value={attribute.value}
                                data-dashboard-composition-runtime-sync-tooltip-row-action-href={rowHandoffHref}
                              >
                                <LayoutDashboard size={12} />
                                {t('dashboard.runtime.sync.breakout-panel-draft')}
                              </HzButton>
                            );
                          })}
                          {row.relatedHandoffHref ? (
                            <HzButtonLink
                              href={row.relatedHandoffHref}
                              size="sm"
                              intent="ghost"
                              data-dashboard-composition-runtime-sync-tooltip-row-action="open-related"
                              data-dashboard-composition-runtime-sync-tooltip-row-action-panel={row.panelId}
                              data-dashboard-composition-runtime-sync-tooltip-row-action-signal={row.relatedSignal}
                              data-dashboard-composition-runtime-sync-tooltip-row-action-href={row.relatedHandoffHref}
                            >
                              <ExternalLink size={12} />
                              {t('dashboard.runtime.sync.open-related')}
                            </HzButtonLink>
                          ) : null}
                          {rowHandoffHref ? (
                            <HzButton
                              type="button"
                              size="sm"
                              intent="ghost"
                              disabled={savingRuntimeEvidenceKey === row.key}
                              onClick={() => void addRuntimeEvidencePanelDraft(row, rowHandoffHref)}
                              data-dashboard-composition-runtime-sync-tooltip-row-action="add-panel-draft"
                              data-dashboard-composition-runtime-sync-tooltip-row-action-panel={row.panelId}
                              data-dashboard-composition-runtime-sync-tooltip-row-action-href={rowHandoffHref}
                            >
                              <LayoutDashboard size={12} />
                              {t('dashboard.runtime.sync.add-panel-draft')}
                            </HzButton>
                          ) : null}
                          {rowHandoffHref ? (
                            <HzButtonLink
                              href={rowHandoffHref}
                              size="sm"
                              intent="ghost"
                              data-dashboard-composition-runtime-sync-tooltip-row-action="open-source"
                              data-dashboard-composition-runtime-sync-tooltip-row-action-panel={row.panelId}
                              data-dashboard-composition-runtime-sync-tooltip-row-action-href={rowHandoffHref}
                            >
                              <ExternalLink size={12} />
                              {t('dashboard.runtime.sync.open-source')}
                            </HzButtonLink>
                          ) : null}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <div
              className="flex min-w-0 flex-col gap-2 border-b border-[#252b35] bg-[#090c11] px-4 py-3"
              data-dashboard-composition-filter-toolbar="true"
              data-dashboard-composition-filter-toolbar-state={selectedDashboard ? 'ready' : 'no-selection'}
              data-dashboard-composition-filter-toolbar-variables={dashboardVariables.length}
              data-dashboard-composition-filter-toolbar-options={dashboardVariableOptionCount}
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <HzDataMetaText display="block">{t('dashboard.composition.filter-toolbar.title')}</HzDataMetaText>
                <HzStatusBadge
                  tone={dashboardVariables.length > 0 ? 'info' : 'neutral'}
                  label={t('dashboard.composition.filter-toolbar.variables')}
                  value={dashboardVariables.length}
                />
              </div>
              {selectedDashboard && dashboardVariables.length > 0 ? (
                <div className="flex min-w-0 flex-wrap gap-2" data-dashboard-composition-filter-variable-list="true">
                  {dashboardVariables.map(variable => {
                    const variableOptions = dashboardVariableOptions[variable.name] || [];
                    const optionSearch = filterOptionSearchDrafts[variable.name] || '';
                    const visibleVariableOptions = filterSignalDashboardVariableOptions(variableOptions, optionSearch);
                    const selectedVariableValues = variable.value.split(',').map(value => value.trim()).filter(Boolean);
                  const filterPanelExecutionPlan = findFilterPanelExecutionPlan(variable);
                  const filterPanelDraftTemplates = filterPanelExecutionPlan ? createSignalDashboardPanelDraftsFromFilterSelection({
                    variable,
                    signal: filterPanelExecutionPlan.signal,
                    sourcePanelId: filterPanelExecutionPlan.panelId,
                    route: filterPanelExecutionPlan.resolvedRoute,
                    titlePrefix: t('dashboard.composition.filter-toolbar.panel-title-prefix')
                  }) : [];
                  const filterPanelKey = `${variable.name}:${variable.value}`;
                    const filterSelectOptions = [
                      { value: '', label: t('dashboard.composition.filter-toolbar.any') },
                      ...(variable.value && !visibleVariableOptions.some(option => option.value === variable.value)
                        ? [{ value: variable.value, label: variable.value }]
                        : []),
                      ...visibleVariableOptions.map(option => ({ value: option.value, label: option.label }))
                    ];
                    return (
                      <div
                        key={variable.name}
                        className="flex min-w-[220px] max-w-full flex-wrap items-center gap-1 rounded-[4px] border border-[#252b35] bg-[#0d1117] px-2 py-1.5"
                        data-dashboard-composition-filter-variable={variable.name}
                        data-dashboard-composition-filter-variable-type={variable.type}
                        data-dashboard-composition-filter-variable-value={variable.value}
                        data-dashboard-composition-filter-variable-options={variableOptions.length}
                        data-dashboard-composition-filter-variable-visible-options={visibleVariableOptions.length}
                        data-dashboard-composition-filter-variable-search={optionSearch}
                        data-dashboard-composition-filter-variable-selectable={variableOptions.length > 0 ? 'true' : 'false'}
                      >
                        <span className="max-w-[160px] truncate font-mono text-[11px] text-[#d7deea]">{`$${variable.name}`}</span>
                        <span
                          className="max-w-[140px] truncate rounded-[3px] bg-[#151b25] px-1.5 py-0.5 font-mono text-[10px] text-[#8f99ab]"
                          data-dashboard-composition-filter-variable-current={variable.value || ''}
                        >
                          {variable.value || t('dashboard.composition.filter-toolbar.any')}
                        </span>
                        <HzInput
                          className="h-7 min-w-[112px] max-w-[150px] text-[11px]"
                          value={optionSearch}
                          onChange={event => setFilterOptionSearchDrafts(current => ({
                            ...current,
                            [variable.name]: event.target.value
                          }))}
                          placeholder={t('dashboard.composition.filter-toolbar.search')}
                          data-dashboard-composition-filter-search={variable.name}
                          data-dashboard-composition-filter-search-value={optionSearch}
                          data-dashboard-composition-filter-search-results={visibleVariableOptions.length}
                        />
                        <HzSelect
                          className="min-w-[132px] max-w-[180px]"
                          size="sm"
                          value={variable.multi ? '' : variable.value.trim()}
                          options={filterSelectOptions}
                          onChange={event => selectVariableOption(variable.name, event.target.value)}
                          disabled={variableOptions.length === 0}
                          data-dashboard-composition-filter-select={variable.name}
                          data-dashboard-composition-filter-select-value={variable.multi ? '' : variable.value.trim()}
                          data-dashboard-composition-filter-select-options={filterSelectOptions.length}
                          aria-label={`${t('dashboard.composition.filter-toolbar.title')} ${variable.name}`}
                        />
                        {visibleVariableOptions.slice(0, 5).map(option => {
                          const selected = variable.multi
                            ? selectedVariableValues.includes(option.value)
                            : variable.value.trim() === option.value;
                          return (
                            <button
                              type="button"
                              key={option.key}
                              className={`max-w-[120px] truncate rounded-[3px] border px-1.5 py-0.5 text-left text-[10px] leading-4 ${
                                selected
                                  ? 'border-[#62d6a4] bg-[#123326] text-[#ddfff2]'
                                  : 'border-[#2f3744] bg-[#111722] text-[#aeb8c8]'
                              }`}
                              title={`${option.label} (${option.count})`}
                              onClick={() => selectVariableOption(variable.name, option.value)}
                              data-dashboard-composition-filter-option={option.value}
                              data-dashboard-composition-filter-option-source={option.source}
                              data-dashboard-composition-filter-option-selected={selected ? 'true' : 'false'}
                              data-dashboard-composition-filter-option-action="select"
                            >
                              {option.label}
                            </button>
                          );
                        })}
                        {filterPanelExecutionPlan ? (
                          <HzButton
                            type="button"
                            size="sm"
                            intent="ghost"
                            disabled={savingFilterPanelKey === filterPanelKey}
                            onClick={() => void addFilterSelectionPanelDraft(variable)}
                            data-dashboard-composition-filter-variable-action="add-panel-draft"
                            data-dashboard-composition-filter-variable-action-variable={variable.name}
                            data-dashboard-composition-filter-variable-action-value={variable.value}
                            data-dashboard-composition-filter-variable-action-panel={filterPanelExecutionPlan.panelId}
                            data-dashboard-composition-filter-variable-action-templates={filterPanelDraftTemplates.length}
                            data-dashboard-composition-filter-variable-action-compose={selectedDashboard ? 'dashboard' : 'drafts'}
                          >
                            <LayoutDashboard size={12} />
                            {t('dashboard.composition.filter-toolbar.add-panel-draft')}
                          </HzButton>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <div
              className="grid gap-2 border-b border-[#252b35] bg-[#0b0e13] px-4 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_auto]"
              data-dashboard-composition-time-range-control="true"
              data-dashboard-composition-time-range-control-mode={dashboardTimeRangeMode}
              data-dashboard-composition-time-range-control-execution-start={dashboardExecutionTimeRange.start}
              data-dashboard-composition-time-range-control-execution-end={dashboardExecutionTimeRange.end}
              data-dashboard-composition-refresh-mode={dashboardRefreshState.mode}
              data-dashboard-composition-refresh-interval={dashboardRefreshState.intervalSeconds}
              data-dashboard-composition-refresh-tick={refreshTick}
              data-dashboard-composition-refresh-live={dashboardTimeRange.live}
            >
              <label className="min-w-0">
                <HzDataMetaText display="block">{t('dashboard.composition.time-range.start')}</HzDataMetaText>
                <HzInput
                  className="mt-1 font-mono"
                  value={timeRangeStartDraft}
                  onChange={event => setTimeRangeStartDraft(event.target.value)}
                  data-dashboard-composition-time-range-input="start"
                />
              </label>
              <label className="min-w-0">
                <HzDataMetaText display="block">{t('dashboard.composition.time-range.end')}</HzDataMetaText>
                <HzInput
                  className="mt-1 font-mono"
                  value={timeRangeEndDraft}
                  onChange={event => setTimeRangeEndDraft(event.target.value)}
                  data-dashboard-composition-time-range-input="end"
                />
              </label>
              <label className="min-w-0">
                <HzDataMetaText display="block">{t('dashboard.composition.time-range.preset')}</HzDataMetaText>
                <HzInput
                  className="mt-1 font-mono"
                  value={timeRangePresetDraft}
                  onChange={event => setTimeRangePresetDraft(event.target.value)}
                  data-dashboard-composition-time-range-input="preset"
                />
              </label>
              <label className="min-w-0">
                <HzDataMetaText display="block">{t('dashboard.composition.time-range.refresh')}</HzDataMetaText>
                <HzInput
                  className="mt-1 font-mono"
                  value={timeRangeRefreshDraft}
                  onChange={event => setTimeRangeRefreshDraft(event.target.value)}
                  data-dashboard-composition-time-range-input="refresh"
                />
              </label>
              <label className="min-w-0">
                <HzDataMetaText display="block">{t('dashboard.composition.time-range.live')}</HzDataMetaText>
                <HzInput
                  className="mt-1 font-mono"
                  value={timeRangeLiveDraft}
                  onChange={event => setTimeRangeLiveDraft(event.target.value)}
                  data-dashboard-composition-time-range-input="live"
                />
              </label>
              <div className="flex min-w-0 items-end">
                <HzButton
                  type="button"
                  size="sm"
                  intent="secondary"
                  disabled={!selectedDashboard || previewPanels.length === 0}
                  onClick={() => setRefreshTick(current => current + 1)}
                  data-dashboard-composition-time-range-action="refresh"
                >
                  <RefreshCw size={13} />
                  {t('common.refresh')}
                </HzButton>
              </div>
            </div>
            {selectedDashboard && previewPanels.length > 0 ? (
              <div
                className="grid auto-rows-[42px] grid-cols-1 gap-3 bg-[#07090b] p-4 lg:grid-cols-12"
                data-dashboard-composition-preview-grid="true"
              >
                {previewPanels.map(panel => {
                  const signal = SIGNALS.includes(panel.widget.signal as SignalDashboardPanelDraftSignal)
                    ? panel.widget.signal as SignalDashboardPanelDraftSignal
                    : 'metrics';
                  const panelEditMetadata = readSignalDashboardWidgetPanelEditMetadata(panel.widget);
                  const panelEditHref = buildSignalDashboardPanelEditHref({
                    route: panel.resolvedRoute,
                    dashboardKey: selectedDashboard.dashboardKey,
                    panelId: panel.widget.id,
                    draftKey: panel.widget.draftKey,
                    returnTo: dashboardReturnHref,
                    returnLabel: selectedDashboard.title || t('menu.dashboard')
                  });
                  const executionPlan = executionPlanByPanelId.get(panel.widget.id);
                  const executionResult = panelExecutionResults[panel.widget.id];
                  const runtimeSummary = executionPlan
                    ? summarizeSignalDashboardPanelRuntime(executionPlan, executionResult)
                    : null;
                  const runtimeRenderer = runtimeRendererByPanelId.get(panel.widget.id) || null;
                  return (
                    <div
                      key={panel.widget.id}
                      className="flex min-h-[160px] min-w-0 flex-col justify-between rounded-[4px] border border-[#252b35] bg-[#0d1117] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
                      style={{
                        gridColumn: `span ${Math.max(1, Math.min(12, panel.layout.w))}`,
                        gridRow: `span ${Math.max(3, Math.min(8, panel.layout.h))}`
                      }}
                      data-dashboard-composition-preview-panel={panel.widget.id}
                      data-dashboard-composition-preview-draft={panel.widget.draftKey || ''}
                      data-dashboard-composition-preview-signal={panel.widget.signal}
                      data-dashboard-composition-preview-visualization={panel.widget.visualization}
                      data-dashboard-composition-preview-route={panel.resolvedRoute}
                      data-dashboard-composition-preview-raw-route={panel.widget.route}
                      data-dashboard-composition-preview-query={panel.resolvedQuerySnapshot}
                      data-dashboard-composition-execution-state={executionPlan?.state || 'unsupported'}
                      data-dashboard-composition-execution-view={executionPlan?.view}
                      data-dashboard-composition-execution-primary-url={executionPlan?.primaryUrl}
                      data-dashboard-composition-execution-endpoints={executionPlan ? Object.keys(executionPlan.apiUrls).length : 0}
                      data-dashboard-composition-execution-result-state={executionResult?.state || (executionPlan?.state === 'ready' ? 'idle' : 'unsupported')}
                      data-dashboard-composition-execution-result-url={executionResult?.apiUrl}
                      data-dashboard-composition-execution-result-error={executionResult?.state === 'error' ? executionResult.errorMessage : undefined}
                      data-dashboard-composition-execution-data-ready={executionResult?.state === 'ready' ? 'true' : 'false'}
                      data-dashboard-composition-runtime-summary-kind={runtimeSummary?.kind}
                      data-dashboard-composition-runtime-summary-items={runtimeSummary?.itemCount}
                      data-dashboard-composition-runtime-summary-total={runtimeSummary?.totalCount}
                      data-dashboard-composition-runtime-summary-series={runtimeSummary?.seriesCount}
                      data-dashboard-composition-runtime-summary-samples={runtimeSummary?.sampleCount}
                      data-dashboard-composition-runtime-renderer={runtimeRenderer?.renderer}
                      data-dashboard-composition-runtime-renderer-mode={runtimeRenderer?.mode}
                      data-dashboard-composition-runtime-renderer-items={runtimeRenderer?.itemCount}
                      data-dashboard-composition-runtime-preview-mode={runtimeRenderer?.mode}
                      data-dashboard-composition-runtime-preview-rows={runtimeRenderer?.rows.length}
                      data-dashboard-composition-runtime-preview-bars={runtimeRenderer?.bars.length}
                      data-dashboard-composition-preview-edit-href={panelEditHref}
                      data-dashboard-composition-preview-edit-intent="edit-panel"
                      data-dashboard-composition-preview-edit-source={panelEditMetadata?.intent || 'none'}
                      data-dashboard-composition-preview-edit-source-dashboard={panelEditMetadata?.dashboardKey || ''}
                      data-dashboard-composition-preview-edit-source-panel={panelEditMetadata?.panelId || ''}
                      data-dashboard-composition-preview-edit-source-draft={panelEditMetadata?.draftKey || ''}
                      data-dashboard-composition-preview-edit-source-return={panelEditMetadata?.returnTo || ''}
                    >
                      <div className="min-w-0">
                        <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
                          <HzStatusBadge tone="info">{t(`dashboard.add-panel.signal.${signal}`)}</HzStatusBadge>
                          <HzDataCellText variant="type">{visualizationLabel(panel.widget.visualization)}</HzDataCellText>
                        </div>
                        <HzDataCellText variant="title" display="block">{panel.widget.title}</HzDataCellText>
                        <HzDataCellText variant="copy" display="block" spacing="stack-tight">
                          {panel.widget.description || panel.widget.draftKey || panel.widget.id}
                        </HzDataCellText>
                        <HzDataCellText variant="identifier" display="block" spacing="stack-tight">
                          {panel.resolvedQuerySnapshot}
                        </HzDataCellText>
                        <HzDataMetaText display="block">
                          {executionPlan?.primaryUrl || panel.resolvedRoute}
                        </HzDataMetaText>
                        {runtimeRenderer ? (
                          <div
                            className="mt-3 min-h-[70px] rounded-[3px] border border-[#252b35] bg-[#07090b] p-2"
                            data-dashboard-composition-runtime-preview={runtimeRenderer.mode}
                          >
                            <DashboardRuntimePanelRenderer
                              runtimeRenderer={runtimeRenderer}
                              tableLabels={runtimeTableLabels}
                              syncTimestamp={runtimeSyncTimestamp}
                              pinnedSyncTimestamp={runtimePinnedSyncTimestamp}
                              onSyncTimestamp={setRuntimeSyncHoverTimestamp}
                              onPinSyncTimestamp={pinRuntimeSyncTimestamp}
                            />
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#252b35] pt-3">
                        <HzDataMetaText display="block">
                          {`${panel.layout.w}x${panel.layout.h}`}
                        </HzDataMetaText>
                        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
                          <HzButton
                            type="button"
                            size="sm"
                            intent="ghost"
                            onClick={() => updatePreviewLayout(panel.widget.id, { dx: -1 })}
                            data-dashboard-composition-layout-action="move-left"
                          >
                            <ArrowLeft size={13} />
                            {t('dashboard.composition.layout.move-left')}
                          </HzButton>
                          <HzButton
                            type="button"
                            size="sm"
                            intent="ghost"
                            onClick={() => updatePreviewLayout(panel.widget.id, { dx: 1 })}
                            data-dashboard-composition-layout-action="move-right"
                          >
                            <ArrowRight size={13} />
                            {t('dashboard.composition.layout.move-right')}
                          </HzButton>
                          <HzButton
                            type="button"
                            size="sm"
                            intent="ghost"
                            onClick={() => updatePreviewLayout(panel.widget.id, { dy: -1 })}
                            data-dashboard-composition-layout-action="move-up"
                          >
                            <ArrowUp size={13} />
                            {t('dashboard.composition.layout.move-up')}
                          </HzButton>
                          <HzButton
                            type="button"
                            size="sm"
                            intent="ghost"
                            onClick={() => updatePreviewLayout(panel.widget.id, { dy: 1 })}
                            data-dashboard-composition-layout-action="move-down"
                          >
                            <ArrowDown size={13} />
                            {t('dashboard.composition.layout.move-down')}
                          </HzButton>
                          <HzButton
                            type="button"
                            size="sm"
                            intent="ghost"
                            onClick={() => updatePreviewLayout(panel.widget.id, { dw: 1 })}
                            data-dashboard-composition-layout-action="wider"
                          >
                            <Maximize2 size={13} />
                            {t('dashboard.composition.layout.wider')}
                          </HzButton>
                          <HzButton
                            type="button"
                            size="sm"
                            intent="ghost"
                            onClick={() => updatePreviewLayout(panel.widget.id, { dw: -1 })}
                            data-dashboard-composition-layout-action="narrower"
                          >
                            <Minimize2 size={13} />
                            {t('dashboard.composition.layout.narrower')}
                          </HzButton>
                          <HzButton
                            type="button"
                            size="sm"
                            intent="ghost"
                            onClick={() => updatePreviewLayout(panel.widget.id, { dh: 1 })}
                            data-dashboard-composition-layout-action="taller"
                          >
                            <Maximize2 size={13} />
                            {t('dashboard.composition.layout.taller')}
                          </HzButton>
                          <HzButton
                            type="button"
                            size="sm"
                            intent="ghost"
                            onClick={() => updatePreviewLayout(panel.widget.id, { dh: -1 })}
                            data-dashboard-composition-layout-action="shorter"
                          >
                            <Minimize2 size={13} />
                            {t('dashboard.composition.layout.shorter')}
                          </HzButton>
                        </div>
                        <HzButtonLink
                          href={panelEditHref}
                          size="sm"
                          intent="secondary"
                          data-dashboard-composition-preview-action="edit-source"
                          data-dashboard-composition-preview-action-intent="edit-panel"
                          data-dashboard-composition-preview-action-panel={panel.widget.id}
                          data-dashboard-composition-preview-action-draft={panel.widget.draftKey}
                          data-dashboard-composition-preview-action-dashboard={selectedDashboard.dashboardKey}
                          data-dashboard-composition-preview-action-return={dashboardReturnHref}
                        >
                          <Pencil size={13} />
                          {t('dashboard.composition.action.edit-panel')}
                        </HzButtonLink>
                        <HzButtonLink
                          href={panel.resolvedRoute}
                          size="sm"
                          data-dashboard-composition-preview-action="open-source"
                        >
                          <ExternalLink size={13} />
                          {t('dashboard.add-panel.action.open-explorer')}
                        </HzButtonLink>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <HzEmptyState
                title={t('dashboard.composition.preview-empty-title')}
                description={selectedDashboard ? t('dashboard.composition.preview-no-panels-copy') : t('dashboard.composition.preview-empty-copy')}
                layout="table-panel"
                data-dashboard-composition-preview-empty-state={selectedDashboard ? 'no-panels' : 'no-selection'}
              />
            )}
          </HzPanelSurface>
          <HzPanelSurface
            className="mb-4"
            clip
            data-dashboard-composition-list-owner="hertzbeat-ui-panel-surface"
          >
            <div className="flex min-w-0 flex-col gap-1 border-b border-[#252b35] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-[13px] font-semibold text-[#f3f6fb]">{t('dashboard.composition.saved-title')}</h2>
                <p className="mt-1 text-[12px] leading-5 text-[#8f99ab]">{t(`dashboard.composition.status.${compositionState}`)}</p>
              </div>
              <HzStatusBadge tone={compositionState === 'error' ? 'critical' : compositionState === 'saving' ? 'warning' : 'success'}>
                {t(`dashboard.composition.status-label.${compositionState}`)}
              </HzStatusBadge>
            </div>
            {dashboards.length > 0 ? (
              <div className="grid gap-0 divide-y divide-[#252b35]" data-dashboard-composition-list="true">
                {dashboards.map(dashboard => (
                  <div
                    key={dashboard.dashboardKey}
                    className="grid min-w-0 gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_120px_160px_210px]"
                    data-dashboard-composition-row={dashboard.dashboardKey}
                    data-dashboard-composition-version={dashboard.version || 'v1'}
                    data-dashboard-composition-selected={dashboard.dashboardKey === dashboardKeyDraft ? 'true' : 'false'}
                  >
                    <HzDataCellStack display="block">
                      <HzDataCellText variant="title" display="block">{dashboard.title}</HzDataCellText>
                      <HzDataCellText variant="copy" display="block" spacing="stack-tight">
                        {dashboard.description || dashboard.dashboardKey}
                      </HzDataCellText>
                    </HzDataCellStack>
                    <HzStatusBadge tone="info" label={t('dashboard.composition.widget-count')} value={parseWidgetCount(dashboard)} />
                    <HzDataCellText variant="timestamp">{formatUpdatedAt(dashboard.updateTime || dashboard.createTime, locale)}</HzDataCellText>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <HzButton
                        type="button"
                        size="sm"
                        intent="ghost"
                        onClick={() => selectDashboard(dashboard)}
                        data-dashboard-composition-action="select"
                      >
                        <LayoutDashboard size={13} />
                        {t('dashboard.composition.action.select-dashboard')}
                      </HzButton>
                      <HzButton
                        type="button"
                        size="sm"
                        intent="ghost"
                        disabled={deletingDashboardKey === dashboard.dashboardKey}
                        onClick={() => void deleteDashboard(dashboard)}
                        data-dashboard-composition-action="delete"
                      >
                        <Trash2 size={13} />
                        {t('dashboard.composition.action.delete-dashboard')}
                      </HzButton>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <HzEmptyState
                title={t('dashboard.composition.empty-title')}
                description={t(`dashboard.composition.status.${compositionState}`)}
                layout="table-panel"
                data-dashboard-composition-empty-state={compositionState}
              />
            )}
          </HzPanelSurface>
          <HzPanelSurface
            className="mb-4"
            clip
            data-dashboard-saved-views-table-owner="hertzbeat-ui-data-table"
            data-dashboard-saved-views-state={savedViewLoadState}
            data-dashboard-saved-views-failed-signals={savedViewFailedSignals.join(',')}
          >
            <div className="flex min-w-0 flex-col gap-1 border-b border-[#252b35] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-[13px] font-semibold text-[#f3f6fb]">{t('dashboard.saved-views.title')}</h2>
                <p className="mt-1 text-[12px] leading-5 text-[#8f99ab]">{savedViewStatusCopy}</p>
              </div>
              <HzStatusBadge tone={savedViewLoadState === 'error' ? 'critical' : savedViewLoadState === 'loading' || savedViewLoadState === 'partial' ? 'warning' : 'success'}>
                {t(`dashboard.panel-drafts.status-label.${savedViewLoadState}`)}
              </HzStatusBadge>
            </div>
            {savedViewLoadState === 'loading' || savedViewLoadState === 'error' || savedViewLoadState === 'empty' ? (
              <HzEmptyState
                title={t(`dashboard.saved-views.empty-title.${savedViewLoadState}`)}
                description={savedViewStatusCopy}
                layout="table-panel"
                data-dashboard-saved-views-empty-state={savedViewLoadState}
              />
            ) : null}
            <HzDataTable<SignalSavedQueryViewWithSignal>
              columns={savedViewColumns}
              rows={savedViews}
              getRowKey={view => `${view.signal}:${view.id}`}
              emptyLabel={t('dashboard.saved-views.status.empty')}
              getRowProps={view => ({
                'data-dashboard-saved-view-row': view.id,
                'data-dashboard-saved-view-label': view.label,
                'data-dashboard-saved-view-description': view.description,
                'data-dashboard-saved-view-signal': view.signal,
                'data-dashboard-saved-view-route': view.route
              })}
            />
          </HzPanelSurface>
          <HzPanelSurface clip data-dashboard-panel-drafts-table-owner="hertzbeat-ui-data-table">
            <div className="flex min-w-0 flex-col gap-1 border-b border-[#252b35] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-[13px] font-semibold text-[#f3f6fb]">{t('dashboard.add-panel.saved-title')}</h2>
                <p className="mt-1 text-[12px] leading-5 text-[#8f99ab]">{statusCopy}</p>
              </div>
              <HzStatusBadge tone={loadState === 'error' ? 'critical' : loadState === 'loading' ? 'warning' : 'success'}>
                {t(`dashboard.panel-drafts.status-label.${loadState}`)}
              </HzStatusBadge>
            </div>
            {loadState === 'loading' || loadState === 'error' || loadState === 'empty' ? (
              <HzEmptyState
                title={t(`dashboard.panel-drafts.empty-title.${loadState}`)}
                description={statusCopy}
                layout="table-panel"
                data-dashboard-panel-drafts-empty-state={loadState}
              />
            ) : null}
            <HzDataTable<SignalDashboardPanelDraft>
              columns={columns}
              rows={drafts}
              getRowKey={draft => `${draft.signal}:${draft.draftKey}`}
              emptyLabel={t('dashboard.panel-drafts.status.empty')}
              getRowProps={draft => ({
                'data-dashboard-panel-draft-row': draft.draftKey,
                'data-dashboard-panel-draft-signal': draft.signal,
                'data-dashboard-panel-draft-visualization': draft.visualization,
                'data-dashboard-panel-draft-route': draft.route,
                'data-dashboard-panel-draft-source-summary': readPanelDraftSourceSummary(draft)
              })}
            />
          </HzPanelSurface>
        </div>
      </HzExplorerFrame>
    </div>
  );
}
