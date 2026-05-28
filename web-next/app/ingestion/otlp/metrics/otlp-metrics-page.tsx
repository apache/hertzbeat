'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Play, RotateCcw, Search, Workflow } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HzActionGroup, HzAssistiveMarker, HzAttributeDiagnostics, HzButton, HzButtonIcon, HzButtonLink, HzChipGroup, HzCollapsibleSection, HzContextHandoff, HzControlStack, HzDataCellStack, HzDataCellText, HzDataMetaText, HzDataTable, HzDetailRows, HzDisabledActionShell, HzEmptyState, HzInput, HzPanelHeader, HzPanelSection, HzPanelSurface, HzPanelTitleLabel, HzQueryActionGroup, HzSearchFieldFrame, HzSearchFieldIcon, HzSelect, HzSignalWorkbenchShell, HzStateNotice, HzStatCell, HzStatStrip, HzStatusBadge, HzTrendBar, HzTrendFrame, HzWorkbenchHeaderCopy, HzWorkbenchLayout } from '@hertzbeat/ui';
import { EChartsPanel, type EChartsDataZoomRange } from '@/components/observability/echarts-panel';
import { buildTimeRangeControlLabels, buildTimeRangePresetLabels, formatEpochMillisDraft, TimeRangeControl } from '@/components/observability/time-range-control';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { useI18n } from '@/components/providers/i18n-provider';
import { apiMessageGet } from '@/lib/api-client';
import { formatTime } from '@/lib/format';
import { buildOtlpMetricsConsoleUrl, loadOtlpMetricsConsole, queryStateFromParams, type OtlpMetricsQueryState } from '@/lib/otlp-metrics/controller';
import { buildSignalEntityContextRows, readEntityIdRouteParam, readEpochMillisRouteParam, readSignalRouteContext, type SignalRouteContext } from '@/lib/signal-route-context';
import { resolveTimeContextBounds, sanitizeTimeContext, TIME_CONTEXT_PRESETS, type TimeContext } from '@/lib/time-context';
import {
  buildConsoleFacts,
  buildConsoleMetrics,
  buildContextRows,
  buildMetricSeriesAttributionDiagnostics,
  buildMetricSeriesContextRows,
  buildMetricSeriesEvidenceRows,
  buildMetricSeriesLinkedRecordRows,
  buildMetricSeriesRows,
  buildMetricSeriesViews,
  buildMetricsChartOption,
  buildMetricsDataZoomTimeContext,
  buildMetricTrendBars,
  buildMetricsExplorerState,
  buildMetricsHandoffLinks,
  type OtlpMetricSeriesView
} from '@/lib/otlp-metrics/view-model';
import type { OtlpMetricsConsole } from '@/lib/types';
import { buildOtlpMetricsRoute, hasMetricsDisplayReturnLabel } from './route-state';

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
  const routeContext = useMemo(() => readSignalRouteContext(searchParams), [searchParams]);
  const workbenchCacheKey = useMemo(() => buildOtlpMetricsConsoleUrl(query), [query]);
  const load = useCallback(async (): Promise<OtlpMetricsConsole> => loadOtlpMetricsConsole(apiMessageGet, query), [query]);
  const initialDraft = useMemo(() => ({
    query: query.query || '',
    aggregation: query.aggregation || 'avg',
    groupBy: query.groupBy || 'service_name',
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
    traceId: query.traceId || ''
  }), [
    query.aggregation,
    query.environment,
    query.groupBy,
    query.query,
    query.end,
    query.from,
    query.live,
    query.refresh,
    query.serviceName,
    query.serviceNamespace,
    query.start,
    query.timeRange,
    query.timezone,
    query.to,
    query.traceId,
    query.tz
  ]);
  const [draft, setDraft] = useState(initialDraft);
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);
  const [metricsChartZoomRange, setMetricsChartZoomRange] = useState<EChartsDataZoomRange | null>(null);

  useEffect(() => {
    if (hasMetricsDisplayReturnLabel(searchParams)) {
      router.replace(buildOtlpMetricsRoute(query));
    }
  }, [query, router, searchParams]);

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  const updateDraftField = useCallback((field: keyof typeof draft, value: string) => {
    setDraft(previous => ({ ...previous, [field]: value }));
  }, []);

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

  const applyMetricsQuery = useCallback((nextTimeContext?: TimeContext) => {
    const timeContext = sanitizeTimeContext({
      timeRange: nextTimeContext?.timeRange || draft.timeRange || query.timeRange || 'last-30m',
      from: nextTimeContext?.from || draft.from || query.from,
      to: nextTimeContext?.to || draft.to || query.to,
      start: nextTimeContext?.start || draft.start || query.start,
      end: nextTimeContext?.end || draft.end || query.end,
      refresh: nextTimeContext?.refresh || draft.refresh || query.refresh,
      live: nextTimeContext?.live || draft.live || query.live,
      tz: nextTimeContext?.tz || draft.tz || query.tz,
      timezone: nextTimeContext?.timezone || draft.timezone || query.timezone
    });
    const bounds = resolveTimeContextBounds(timeContext);
    const hasExpressionDraft = Boolean(timeContext.from && timeContext.to);
    const hasAbsoluteDraft = Boolean(timeContext.start && timeContext.end);
    router.replace(buildOtlpMetricsRoute({
      ...query,
      query: draft.query.trim() || undefined,
      aggregation: draft.aggregation,
      groupBy: draft.groupBy,
      timeRange: timeContext.timeRange || 'last-30m',
      from: hasExpressionDraft ? timeContext.from : undefined,
      to: hasExpressionDraft ? timeContext.to : undefined,
      serviceName: draft.serviceName.trim() || undefined,
      serviceNamespace: draft.serviceNamespace.trim() || undefined,
      environment: draft.environment.trim() || undefined,
      traceId: draft.traceId.trim() || undefined,
      start: hasExpressionDraft ? undefined : bounds?.start || (!hasAbsoluteDraft ? query.start : undefined),
      end: hasExpressionDraft ? undefined : bounds?.end || (!hasAbsoluteDraft ? query.end : undefined),
      refresh: timeContext.refresh,
      live: timeContext.live,
      tz: hasExpressionDraft ? undefined : timeContext.tz,
      timezone: hasExpressionDraft ? timeContext.timezone || timeContext.tz : timeContext.timezone
    }));
  }, [draft, query, router]);

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
            entityName: data.context?.entityName || query.entityName,
            serviceName: data.context?.serviceName || query.serviceName,
            serviceNamespace: data.context?.serviceNamespace || query.serviceNamespace,
            environment: data.context?.environment || query.environment,
            start: data.context?.start ?? queryStart,
            end: data.context?.end ?? queryEnd
          }
        };
        const workbenchState = buildMetricsExplorerState(mergedData, t);
        const metricSeries = buildMetricSeriesViews(mergedData, t);
        const hasMetricSeries = metricSeries.length > 0;
        const seriesRows = buildMetricSeriesRows(metricSeries, t);
        const selectedMetricSeries =
          metricSeries.find(series => series.key === selectedSeriesKey) ||
          findMetricSeriesForRouteTrace(metricSeries, query, routeContext) ||
          metricSeries[0] ||
          null;
        const selectedMetricSeriesIndex = selectedMetricSeries ? metricSeries.findIndex(series => series.key === selectedMetricSeries.key) : -1;
        const selectedSeriesContextRows = buildMetricSeriesContextRows(selectedMetricSeries, t);
        const selectedSeriesEvidenceRows = buildMetricSeriesEvidenceRows(selectedMetricSeries, formatTime, t);
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
          stateLabel: row.state === 'present' ? '已提供' : '缺失',
          tone: row.state === 'present' ? 'success' as const : 'critical' as const,
          rowProps: {
            'data-otlp-metrics-attribution-diagnostic-state': row.state
          } as React.HTMLAttributes<HTMLDivElement>
        }));
        const trendSourceSeries = selectedMetricSeries
          ? [selectedMetricSeries, ...metricSeries.filter(series => series.key !== selectedMetricSeries.key)]
          : metricSeries;
        const trendBars = buildMetricTrendBars(trendSourceSeries, formatTime);
        const metricsChartOption = buildMetricsChartOption(metricSeries);
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
          entityName: query.entityName || mergedData.context?.entityName,
          serviceName: mergedData.context?.serviceName || query.serviceName,
          serviceNamespace: mergedData.context?.serviceNamespace || query.serviceNamespace,
          environment: mergedData.context?.environment || query.environment,
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
        const currentGroupLabel = draft.groupBy === 'service_namespace'
          ? namespaceGroupLabel
          : draft.groupBy === 'deployment_environment_name'
            ? environmentGroupLabel
            : serviceGroupLabel;
        const headerContextPills = [
          { label: t('otlp.metrics.field.service'), value: firstRouteText(mergedData.context?.serviceName, query.serviceName, draft.serviceName) },
          { label: t('otlp.metrics.field.namespace'), value: firstRouteText(mergedData.context?.serviceNamespace, query.serviceNamespace, draft.serviceNamespace) },
          { label: t('otlp.metrics.field.environment'), value: firstRouteText(mergedData.context?.environment, query.environment, draft.environment) },
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
        const firstSeries = (selectedMetricSeriesIndex >= 0 ? seriesRows[selectedMetricSeriesIndex] : undefined) ?? seriesRows[0] ?? {
          title: mergedData.query || t('otlp.metrics.query.unselected'),
          copy: mergedData.context?.serviceName || routeContext.serviceName || '-',
          meta: '-'
        };

        return (
          <HzSignalWorkbenchShell
            data-otlp-metrics-route="otlp-cold-metrics-workbench"
            data-otlp-metrics-shell-owner="hertzbeat-ui-signal-workbench-shell"
            data-otlp-metrics-style-baseline="hertzbeat-cold-matte"
            data-otlp-metrics-page-shell="flat-direct-stack"
            data-otlp-metrics-page-shell-layer="removed"
            data-otlp-metrics-page-stack="direct-panels"
            layout="metrics-workbench"
          >
              <HzPanelSurface
                data-otlp-metrics-header="cold-compact-header"
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
                data-otlp-metrics-query-bar="cold-query-row"
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
                    options={[
                      { value: 'service_name', label: serviceGroupLabel },
                      { value: 'service_namespace', label: namespaceGroupLabel },
                      { value: 'deployment_environment_name', label: environmentGroupLabel }
                    ]}
                    optionDataAttributes={option => ({
                      'data-otlp-metrics-group-by-option': option.value
                    })}
                  />
                  <HzQueryActionGroup
                    data-otlp-metrics-query-action-group="shared-query-action-group"
                    data-otlp-metrics-query-action-group-owner="hertzbeat-ui-query-action-group"
                  >
                    <HzButton data-otlp-metrics-run-query-action="true" intent="primary" size="md" onClick={applyMetricsQuery}>
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
                </HzControlStack>
              </HzPanelSurface>

              <HzPanelSurface
                data-otlp-metrics-chart-band="cold-chart-band"
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
                        趋势带
                      </HzPanelTitleLabel>
                      <HzActionGroup
                        layout="end-wrap"
                        data-otlp-metrics-chart-toolbar-actions="shared-toolbar-actions"
                        data-otlp-metrics-chart-toolbar-actions-owner="hertzbeat-ui-action-group"
                      >
                        {hasMetricSeries ? (
                          <HzChipGroup
                            data-otlp-metrics-chart-meta-row="compact-real-facts"
                            data-otlp-metrics-chart-meta-row-owner="hertzbeat-ui-toolbar-chips"
                            align="end"
                            density="compact"
                          >
                            {facts.map(fact => (
                              <HzStatusBadge
                                key={fact.label}
                                data-otlp-metrics-chart-meta-fact="true"
                                data-otlp-metrics-chart-meta-fact-owner="hertzbeat-ui-status-badge"
                                tone="neutral"
                                size="sm"
                                layout="metric-fact"
                                label={fact.label}
                                value={fact.value}
                              />
                            ))}
                          </HzChipGroup>
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
                            title="暂无指标趋势"
                            description="运行查询后展示真实采样点。"
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
                        {trendBars.length ? `${trendBars.length} 个采样点` : '-'}
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
                  data-otlp-metrics-series-table="cold-dense-metric-list"
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
                    title="序列集合"
                    meta={
                      <HzStatusBadge
                        data-otlp-metrics-series-table-summary="result-count"
                        data-otlp-metrics-series-table-summary-owner="hertzbeat-ui-status-badge"
                        tone="neutral"
                        size="xs"
                      >
                        {seriesRows.length} 条
                      </HzStatusBadge>
                    }
                  />
                  <HzPanelSection
                    data-otlp-metrics-series-set-summary-section="shared-panel-section"
                    data-otlp-metrics-series-set-summary-section-owner="hertzbeat-ui-panel-section"
                  >
                    <HzStatStrip
                      columns={4}
                      frame="panel-inset"
                      spacing="compact"
                      data-otlp-metrics-series-set-summary="service-entity-scope"
                      data-otlp-metrics-series-set-summary-owner="hertzbeat-ui-stat-strip"
                      data-otlp-metrics-series-set-summary-strip="shared-stat-strip"
                      data-otlp-metrics-series-set-summary-strip-owner="hertzbeat-ui-stat-strip"
                    >
                      {seriesSetScopeRows.map(row => (
                        <HzStatCell
                          key={row.label}
                          data-otlp-metrics-series-set-summary-cell={row.label}
                          data-otlp-metrics-series-set-summary-cell-owner="hertzbeat-ui-stat-cell"
                          label={row.label}
                          value={row.value}
                          variant="tile"
                          density="compact"
                          frame="inset"
                        />
                      ))}
                    </HzStatStrip>
                  </HzPanelSection>
                  <HzDataTable
                    data-otlp-metrics-series-data-table="shared-data-table"
                    data-otlp-metrics-series-data-table-owner="hertzbeat-ui-data-table"
                    variant="embedded"
                    rows={metricSeriesTableRows}
                    getRowKey={row => row.rowKey}
                    selectedRowKey={selectedMetricSeries?.key}
                    onRowClick={row => {
                      if (row.series) setSelectedSeriesKey(row.series.key);
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
                        header: '指标名称',
                        render: row => <HzDataCellText variant="title" display="block">{row.title}</HzDataCellText>
                      },
                      {
                        key: 'service',
                        header: '服务',
                        render: row => <HzDataCellText variant="value">{row.copy}</HzDataCellText>
                      },
                      {
                        key: 'entity',
                        header: '实体',
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
                        header: '最新值',
                        render: row => <HzDataCellText variant="value" font="mono" tone="bright" data-otlp-metrics-series-latest-owner="hertzbeat-ui-data-cell-text">{row.meta}</HzDataCellText>
                      },
                      {
                        key: 'points',
                        header: '采样点',
                        render: row => <HzDataCellText variant="value">{row.pointCount}</HzDataCellText>
                      },
                      {
                        key: 'time',
                        header: '最近时间',
                        render: () => <HzDataCellText variant="timestamp">{formatTime(latestObservedAt)}</HzDataCellText>
                      }
                    ]}
                  />
                </HzPanelSurface>

                {hasMetricSeries && selectedMetricSeries ? (
                <HzPanelSurface
                  data-otlp-metrics-detail-panel="cold-detail-panel"
                  data-otlp-metrics-detail-panel-owner="hertzbeat-ui-panel-surface"
                  data-otlp-metrics-detail-panel-priority="secondary-inspector"
                  data-otlp-metrics-detail-panel-stickiness-owner="hertzbeat-ui-panel-surface"
                  clip
                  stickiness="top-4"
                >
                  <HzPanelHeader
                    data-otlp-metrics-detail-panel-header="shared-panel-header"
                    data-otlp-metrics-detail-panel-header-owner="hertzbeat-ui-panel-header"
                    chrome="transparent"
                    eyebrow="详情面板"
                    title={firstSeries.title}
                    subtitle={workbenchState.chartLabel}
                  />
                  <HzPanelSection
                    divider="none"
                    data-otlp-metrics-detail-panel-body="compact-evidence-stack"
                    data-otlp-metrics-detail-panel-body-owner="hertzbeat-ui-panel-section"
                  >
                    <HzStatStrip
                      columns={3}
                      frame="panel-solid"
                      data-otlp-metrics-detail-summary-stats="shared-stat-strip"
                      data-otlp-metrics-detail-summary-stats-owner="hertzbeat-ui-stat-strip"
                    >
                      {metrics.map(metric => (
                        <HzStatCell
                          key={metric.label}
                          data-otlp-metrics-detail-summary-stat={metric.label}
                          data-otlp-metrics-detail-summary-stat-owner="hertzbeat-ui-stat-cell"
                          label={metric.label}
                          value={metric.value}
                          variant="tile"
                          density="compact"
                          frame="flush"
                        />
                      ))}
                    </HzStatStrip>
                    <HzDetailRows
                      data-otlp-metrics-detail-context-rows="shared-detail-rows"
                      data-otlp-metrics-detail-context-rows-owner="hertzbeat-ui-detail-rows"
                      offset="top"
                      heading="查询上下文"
                      rows={metricsDetailContextRows}
                    />
                    {selectedSeriesContextRows.length > 0 ? (
                      <HzDetailRows
                        data-otlp-metrics-selected-series-context="selected-series-attribution"
                        data-otlp-metrics-selected-series-context-owner="hertzbeat-ui-detail-rows"
                        aria-label="当前选中序列 关联实体 当前服务 采集模板 当前环境"
                        boundary="top"
                        heading="当前选中序列"
                        rows={selectedSeriesContextDetailRows}
                      />
                    ) : null}
                    {selectedSeriesEvidenceRows.length > 0 ? (
                      <HzDetailRows
                        data-otlp-metrics-selected-series-evidence="real-sample-evidence"
                        data-otlp-metrics-selected-series-evidence-owner="hertzbeat-ui-detail-rows"
                        aria-label="指标证据 采样点 最新值 值域 采样窗口 关联链路"
                        boundary="top"
                        heading="指标证据"
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
                          实体详情
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
                            实体详情
                          </HzButton>
                        </HzDisabledActionShell>
                      )}
                      <HzButtonLink component={Link} href={handoffLinks.alertHandlingHref} size="md" layout="full" data-otlp-metrics-alert-handling-action="true">
                        告警处理
                      </HzButtonLink>
                      <HzButtonLink component={Link} href={handoffLinks.logsHref} size="md" layout="full" data-otlp-metrics-logs-action="true">
                        查看日志
                      </HzButtonLink>
                      <HzButtonLink component={Link} href={handoffLinks.tracesHref} size="md" layout="full" data-otlp-metrics-traces-action="true">
                        查看链路
                      </HzButtonLink>
                      <HzButtonLink component={Link} href={handoffLinks.entitiesHref} size="md" layout="full" data-otlp-metrics-entities-action="true">
                        对象目录
                      </HzButtonLink>
                    </HzActionGroup>
                  </HzPanelSection>
                  <HzPanelSection
                    divider="top"
                    spacing="stack-2"
                    data-otlp-metrics-secondary-context="collapsible-evidence-diagnostics"
                    data-otlp-metrics-secondary-context-owner="hertzbeat-ui-panel-section"
                  >
                    {linkedRecordRows.length > 0 ? (
                      <HzCollapsibleSection
                        data-otlp-metrics-linked-record-summary="log-trace-alert-links"
                        data-otlp-metrics-linked-record-summary-panel="collapsible"
                        data-otlp-metrics-linked-record-summary-owner="hertzbeat-ui-collapsible-section"
                        aria-label="关联记录 历史日志 链路瀑布图 告警处理"
                        title="关联记录"
                        meta="日志 / 链路 / 告警"
                        surface="inset"
                      >
                        <div
                          data-otlp-metrics-linked-record-handoff="shared-context-handoff"
                          data-otlp-metrics-linked-record-handoff-owner="hertzbeat-ui-context-handoff"
                        >
                          <HzContextHandoff
                            title="证据跳转"
                            context="日志 / 链路 / 告警"
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
                        aria-label="归因诊断 hertzbeat.entity_id hertzbeat.entity_name hertzbeat.workspace_id hertzbeat.collector hertzbeat.template"
                        title="归因诊断"
                        meta="hertzbeat.*"
                        surface="inset"
                      >
                        <HzAttributeDiagnostics
                          data-otlp-metrics-attribution-diagnostics="hertzbeat-attribute-diagnostics"
                          data-otlp-metrics-attribution-diagnostics-owner="hertzbeat-ui-attribute-diagnostics"
                          title="归因诊断"
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
                      aria-label="实体上下文 当前实体 监控实例 当前服务 链路上下文 当前环境 时间范围 采集来源"
                      title="实体上下文"
                      meta="当前窗口"
                      surface="inset"
                    >
                      <HzDetailRows
                        data-otlp-metrics-entity-context-owner="hertzbeat-ui-detail-rows"
                        heading="实体上下文"
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
