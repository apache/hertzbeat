'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Database, Play, RotateCcw, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EChartsPanel, type EChartsDataZoomRange } from '@/components/observability/echarts-panel';
import { buildTimeRangeControlLabels, formatEpochMillisDraft, TimeRangeControl } from '@/components/observability/time-range-control';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { useI18n } from '@/components/providers/i18n-provider';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { apiMessageGet } from '@/lib/api-client';
import { formatTime } from '@/lib/format';
import { loadOtlpMetricsConsole, queryStateFromParams, type OtlpMetricsQueryState } from '@/lib/otlp-metrics/controller';
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

const actionClass =
  'inline-flex h-8 items-center justify-center gap-2 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe3ee] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:border-[#3b4454] hover:bg-[#151821]';
const primaryActionClass =
  'inline-flex h-8 items-center justify-center gap-2 rounded-[3px] border border-[#3b4454] bg-[#18202c] px-4 text-[12px] font-semibold text-[#f2f6fb] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors hover:bg-[#202938]';
const disabledActionClass =
  'inline-flex h-8 cursor-not-allowed items-center justify-center gap-2 rounded-[3px] border border-[#242a34] bg-[#0b0e13] px-3 text-[12px] font-semibold text-[#687386] opacity-80 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]';
const panelClass = 'rounded-[4px] border border-[#252b35] bg-[#0d1015] shadow-[0_18px_60px_rgba(0,0,0,0.28)]';
const inputClass =
  'h-8 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#e6edf7] outline-none transition-colors placeholder:text-[#697386] focus:border-[#4e74f8] focus:ring-2 focus:ring-[rgba(78,116,248,0.12)]';

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

const metricsTimeRangePresets = TIME_CONTEXT_PRESETS.map(preset => ({ value: preset.value, label: preset.label }));

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
  const query = useMemo(() => queryStateFromParams(searchParams), [searchParams]);
  const routeContext = useMemo(() => readSignalRouteContext(searchParams), [searchParams]);
  const load = useCallback(async (): Promise<OtlpMetricsConsole> => loadOtlpMetricsConsole(apiMessageGet, query), [query]);
  const initialDraft = useMemo(() => ({
    query: query.query || '',
    aggregation: query.aggregation || 'avg',
    groupBy: query.groupBy || 'service_name',
    timeRange: query.timeRange || 'last-30m',
    start: query.start || '',
    end: query.end || '',
    refresh: query.refresh || '',
    live: query.live || '',
    tz: query.tz || '',
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
    query.live,
    query.refresh,
    query.serviceName,
    query.serviceNamespace,
    query.start,
    query.timeRange,
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
    start: draft.start || query.start,
    end: draft.end || query.end,
    refresh: draft.refresh || query.refresh,
    live: draft.live || query.live,
    tz: draft.tz || query.tz
  }), [
    draft.end,
    draft.live,
    draft.refresh,
    draft.start,
    draft.timeRange,
    draft.tz,
    query.end,
    query.live,
    query.refresh,
    query.start,
    query.timeRange,
    query.tz
  ]);

  const applyMetricsQuery = useCallback((nextTimeContext?: TimeContext) => {
    const timeContext = sanitizeTimeContext({
      timeRange: nextTimeContext?.timeRange || draft.timeRange || query.timeRange || 'last-30m',
      start: nextTimeContext?.start || draft.start || query.start,
      end: nextTimeContext?.end || draft.end || query.end,
      refresh: nextTimeContext?.refresh || draft.refresh || query.refresh,
      live: nextTimeContext?.live || draft.live || query.live,
      tz: nextTimeContext?.tz || draft.tz || query.tz
    });
    const bounds = resolveTimeContextBounds(timeContext);
    const hasAbsoluteDraft = Boolean(timeContext.start && timeContext.end);
    router.replace(buildOtlpMetricsRoute({
      ...query,
      query: draft.query.trim() || undefined,
      aggregation: draft.aggregation,
      groupBy: draft.groupBy,
      timeRange: timeContext.timeRange || 'last-30m',
      serviceName: draft.serviceName.trim() || undefined,
      serviceNamespace: draft.serviceNamespace.trim() || undefined,
      environment: draft.environment.trim() || undefined,
      traceId: draft.traceId.trim() || undefined,
      start: bounds?.start || (!hasAbsoluteDraft ? query.start : undefined),
      end: bounds?.end || (!hasAbsoluteDraft ? query.end : undefined),
      refresh: timeContext.refresh,
      live: timeContext.live,
      tz: timeContext.tz
    }));
  }, [draft, query, router]);

  const applyMetricsTimeContext = useCallback((timeContext: TimeContext) => {
    const sanitized = sanitizeTimeContext(timeContext);
    setDraft(previous => ({
      ...previous,
      timeRange: sanitized.timeRange || previous.timeRange || 'last-30m',
      start: sanitized.start || '',
      end: sanitized.end || '',
      refresh: sanitized.refresh || '',
      live: sanitized.live || '',
      tz: sanitized.tz || ''
    }));
    applyMetricsQuery(sanitized);
  }, [applyMetricsQuery]);

  return (
    <ClientWorkbench load={load} loadingCopy={t('otlp.metrics.loading')}>
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
        const workbenchState = buildMetricsExplorerState(mergedData);
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
        const selectedSeriesEvidenceRows = buildMetricSeriesEvidenceRows(selectedMetricSeries, formatTime);
        const attributionDiagnostics = buildMetricSeriesAttributionDiagnostics(selectedMetricSeries, t);
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
        const metricsChartZoomDraftLabel = metricsChartZoomContext?.start && metricsChartZoomContext?.end
          ? `${formatEpochMillisDraft(metricsChartZoomContext.start)} → ${formatEpochMillisDraft(metricsChartZoomContext.end)}`
          : '';
        const canApplyMetricsChartZoom = Boolean(metricsChartZoomContext && metricsChartZoomDraftLabel);
        const facts = buildConsoleFacts(mergedData, t, formatTime);
        const metrics = buildConsoleMetrics(mergedData, t);
        const contextRows = buildContextRows(mergedData, t, formatTime);
        const handoffLinks = buildMetricsHandoffLinks(mergedData, query, routeContext, selectedMetricSeries);
        const linkedRecordRows = buildMetricSeriesLinkedRecordRows(selectedMetricSeries, handoffLinks);
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
        const headerContextPills = [
          { label: '服务', value: firstRouteText(mergedData.context?.serviceName, query.serviceName, draft.serviceName) },
          { label: '命名空间', value: firstRouteText(mergedData.context?.serviceNamespace, query.serviceNamespace, draft.serviceNamespace) },
          { label: '环境', value: firstRouteText(mergedData.context?.environment, query.environment, draft.environment) },
          {
            label: '分组',
            value:
              draft.groupBy === 'service_namespace'
                ? '命名空间'
                : draft.groupBy === 'deployment_environment_name'
                  ? '环境'
              : '服务'
          }
        ].filter((pill): pill is { label: string; value: string } => Boolean(pill.value));
        const seriesSetScopeRows = [
          { label: '服务范围', value: firstRouteText(mergedData.context?.serviceName, query.serviceName, draft.serviceName) || '全部服务' },
          { label: '命名空间', value: firstRouteText(mergedData.context?.serviceNamespace, query.serviceNamespace, draft.serviceNamespace) || '全部命名空间' },
          { label: '环境', value: firstRouteText(mergedData.context?.environment, query.environment, draft.environment) || '全部环境' },
          {
            label: '分组',
            value:
              draft.groupBy === 'service_namespace'
                ? '命名空间'
                : draft.groupBy === 'deployment_environment_name'
                  ? '环境'
                  : '服务'
          },
          { label: '序列', value: `${seriesRows.length} 条` }
        ];
        const latestObservedAt = latestSeriesTimestamp(mergedData);
        const firstSeries = (selectedMetricSeriesIndex >= 0 ? seriesRows[selectedMetricSeriesIndex] : undefined) ?? seriesRows[0] ?? {
          title: mergedData.query || '未选择指标',
          copy: mergedData.context?.serviceName || routeContext.serviceName || '-',
          meta: '-'
        };

        return (
          <main
            data-otlp-metrics-route="otlp-cold-metrics-workbench"
            data-otlp-metrics-style-baseline="hertzbeat-cold-matte"
            data-otlp-metrics-page-shell="flat-direct-stack"
            data-otlp-metrics-page-shell-layer="removed"
            data-otlp-metrics-page-stack="direct-panels"
            className="flex min-h-[calc(100vh-56px)] flex-col gap-3 bg-[#07090b] px-3 pb-3 pt-0 text-[#e8edf5]"
          >
              <section
                data-otlp-metrics-header="cold-compact-header"
                data-otlp-metrics-header-layout="compact-title-with-aligned-toolbar"
                data-otlp-metrics-header-actions="removed"
                className={`${panelClass} px-4 py-3`}
              >
                <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(280px,1fr)_minmax(780px,auto)] xl:items-start">
                  <div data-otlp-metrics-title-block="operator-context" className="min-w-0">
                    <p className="mb-2 text-[12px] font-semibold tracking-[0.08em] text-[#8792a5]">可观测 / 指标</p>
                    <h1 className="text-[26px] font-semibold tracking-normal text-[#f4f7fb]">指标工作台</h1>
                    {headerContextPills.length ? (
                      <div data-otlp-metrics-header-context-strip="applied-query-facts" className="mt-3 flex flex-wrap gap-2">
                        {headerContextPills.map(pill => (
                          <span
                            key={pill.label}
                            className="inline-flex h-7 max-w-[220px] items-center gap-2 rounded-[3px] border border-[#252b35] bg-[#10141b] px-2.5 text-[11px]"
                          >
                            <span className="shrink-0 font-semibold text-[#7f8a9d]">{pill.label}</span>
                            <span className="truncate font-semibold text-[#dbe5f3]">{pill.value}</span>
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div data-otlp-metrics-header-topbar="time-context" className="flex min-w-0 justify-end xl:justify-self-end">
                    <div
                      data-otlp-metrics-time-toolbar="top-right-corner"
                      data-otlp-metrics-toolbar-stack="same-width-time-actions"
                      className="flex w-full max-w-[1120px] justify-end"
                    >
                      <div
                        data-otlp-metrics-time-control="shared-time-context-control"
                        data-otlp-metrics-time-control-placement="top-right"
                        data-otlp-metrics-time-control-visual="narrow-top-right-rail"
                        data-otlp-metrics-time-control-fit="no-clipping"
                        className="flex w-full justify-end"
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
                          className="justify-end"
                          presetSelectProps={{ 'data-otlp-metrics-time-range-select': 'true' }}
                          presetOptionDataAttribute="data-otlp-metrics-time-range-preset"
                          refreshActionProps={{ 'data-otlp-metrics-time-refresh-action': 'true' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section data-otlp-metrics-query-bar="cold-query-row" className={`${panelClass} px-4 py-3`}>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[320px] max-w-[560px] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7d8798]" aria-hidden="true" />
                    <Input
                      data-otlp-metrics-query-input="true"
                      aria-label="指标查询"
                      value={draft.query || mergedData.query || ''}
                      onChange={event => updateDraftField('query', event.target.value)}
                      onInput={event => updateDraftField('query', event.currentTarget.value)}
                      placeholder="http.server.duration"
                      className={`${inputClass} w-full pl-9 font-mono`}
                    />
                  </div>
                  <Select
                    data-otlp-metrics-aggregation-select="true"
                    aria-label="聚合方式"
                    value={draft.aggregation}
                    onChange={event => updateDraftField('aggregation', event.target.value)}
                    containerClassName="w-[124px]"
                    className="h-8 min-w-0 text-[#d5dce8]"
                  >
                    <option value="avg">平均</option>
                    <option value="sum">求和</option>
                    <option value="max">最大</option>
                    <option value="min">最小</option>
                  </Select>
                  <Select
                    data-otlp-metrics-group-by-select="true"
                    aria-label="分组"
                    value={draft.groupBy}
                    onChange={event => updateDraftField('groupBy', event.target.value)}
                    containerClassName="w-[132px]"
                    className="h-8 min-w-0 text-[#d5dce8]"
                  >
                    <option value="service_name">服务</option>
                    <option value="service_namespace">命名空间</option>
                    <option value="deployment_environment_name">环境</option>
                  </Select>
                  <button data-otlp-metrics-run-query-action="true" type="button" className={primaryActionClass} onClick={applyMetricsQuery}>
                    <Play className="h-4 w-4" aria-hidden="true" />
                    运行查询
                  </button>
                  <Link href="/ingestion/otlp/metrics" className={actionClass}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    重置
                  </Link>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Input
                    data-otlp-metrics-service-input="true"
                    aria-label="服务名称"
                    value={draft.serviceName || mergedData.context?.serviceName || ''}
                    onChange={event => updateDraftField('serviceName', event.target.value)}
                    onInput={event => updateDraftField('serviceName', event.currentTarget.value)}
                    placeholder="服务名称"
                    className={`${inputClass} w-[220px]`}
                  />
                  <Input
                    data-otlp-metrics-namespace-input="true"
                    aria-label="命名空间"
                    value={draft.serviceNamespace || mergedData.context?.serviceNamespace || ''}
                    onChange={event => updateDraftField('serviceNamespace', event.target.value)}
                    onInput={event => updateDraftField('serviceNamespace', event.currentTarget.value)}
                    placeholder="命名空间"
                    className={`${inputClass} w-[220px]`}
                  />
                  <Input
                    data-otlp-metrics-environment-input="true"
                    aria-label="环境"
                    value={draft.environment || mergedData.context?.environment || ''}
                    onChange={event => updateDraftField('environment', event.target.value)}
                    onInput={event => updateDraftField('environment', event.currentTarget.value)}
                    placeholder="环境"
                    className={`${inputClass} w-[160px]`}
                  />
                  <Input
                    data-otlp-metrics-trace-id-input="true"
                    aria-label="链路 ID"
                    value={draft.traceId}
                    onChange={event => updateDraftField('traceId', event.target.value)}
                    onInput={event => updateDraftField('traceId', event.currentTarget.value)}
                    placeholder="链路 ID"
                    className={`${inputClass} min-w-[220px] max-w-[360px] flex-1 font-mono`}
                  />
                </div>
              </section>

              <section data-otlp-metrics-chart-band="cold-chart-band" className={`${panelClass} px-4 py-4`}>
                <div
                  data-otlp-metrics-chart-layout="wide-series-chart-with-compact-meta"
                  data-otlp-metrics-series-mode="entity-series-set"
                  className="grid items-start gap-3"
                >
                  <div
                    data-otlp-metrics-chart-panel="series-set-trend"
                    className="min-w-0 rounded-[4px] border border-[#252b35] bg-[#10141b] px-3 py-3"
                    data-otlp-metrics-chart-datazoom-state="local-observation"
                    data-otlp-metrics-chart-datazoom-preserve="preserved"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#8792a5]">
                      <span className="inline-flex items-center gap-2 font-semibold text-[#c6cfdd]">
                        <BarChart3 className="h-4 w-4" aria-hidden="true" />
                        趋势带
                      </span>
                      <span className="inline-flex min-w-0 flex-wrap items-center justify-end gap-2">
                        {hasMetricSeries ? (
                          <span data-otlp-metrics-chart-meta-row="compact-real-facts" className="inline-flex min-w-0 flex-wrap items-center justify-end gap-1.5">
                            {facts.map(fact => (
                              <span
                                key={fact.label}
                                data-otlp-metrics-chart-meta-fact="true"
                                className="inline-flex h-6 min-w-0 max-w-[180px] items-center gap-1 rounded-[3px] border border-[#252b35] bg-[#0d1015] px-2"
                              >
                                <span className="truncate text-[10px] font-semibold text-[#7f8a9d]">{fact.label}</span>
                                <span className="truncate text-[11px] font-semibold text-[#cfd8e6]">{fact.value}</span>
                              </span>
                            ))}
                          </span>
                        ) : null}
                        {metricsChartZoomDraftLabel ? (
                          <span
                            data-otlp-metrics-chart-zoom-draft="pending-query-time"
                            data-otlp-metrics-chart-zoom-draft-state="pending"
                            className="inline-flex h-7 max-w-[340px] items-center gap-1.5 overflow-hidden rounded-[3px] border border-[#344052] bg-[#121823] px-2 text-[11px] font-semibold text-[#cfd8e6]"
                          >
                            <span className="shrink-0 text-[#7f8a9d]">{t('time.context.zoom.draft')}</span>
                            <span className="min-w-0 truncate font-mono">{metricsChartZoomDraftLabel}</span>
                          </span>
                        ) : null}
                        {hasMetricSeries ? (
                          <button
                            type="button"
                            className="inline-flex h-7 items-center justify-center rounded-[3px] border border-[#2b3039] bg-transparent px-2 text-[11px] font-semibold text-[#9ca7ba] transition-colors enabled:hover:border-[#3b4454] enabled:hover:bg-[#151821] enabled:hover:text-[#e6edf7] disabled:cursor-not-allowed disabled:opacity-45"
                            data-otlp-metrics-chart-zoom-apply="local-to-query-time"
                            data-otlp-metrics-chart-zoom-apply-state={canApplyMetricsChartZoom ? 'ready' : 'idle'}
                            disabled={!canApplyMetricsChartZoom}
                            onClick={() => {
                              if (!metricsChartZoomContext) return;
                              setMetricsChartZoomRange(null);
                              applyMetricsTimeContext(metricsChartZoomContext);
                            }}
                          >
                            {t('time.context.zoom.apply')}
                          </button>
                        ) : null}
                        <span>{workbenchState.seriesCountLabel}</span>
                      </span>
                    </div>
                    {hasMetricSeries ? (
                      <EChartsPanel
                        option={metricsChartOption}
                        height={300}
                        className="rounded-none border-x-0 border-y border-[#252b35] bg-transparent"
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
                            start: nextZoomContext.start || '',
                            end: nextZoomContext.end || '',
                            refresh: nextZoomContext.refresh || previous.refresh || draftTimeContext.refresh || '',
                            live: nextZoomContext.live || previous.live || draftTimeContext.live || '',
                            tz: nextZoomContext.tz || previous.tz || draftTimeContext.tz || ''
                          }));
                        }}
                      />
                    ) : (
                      <div className="flex h-16 items-end gap-1.5">
                        {trendBars.length ? (
                          trendBars.map(series => (
                            <span
                              key={series.key}
                              data-otlp-metrics-trend-bar={'real-series-point'}
                              className="min-w-0 flex-1 rounded-t-[3px] border border-[#2f3b4d] bg-[#182232]"
                              style={{ height: `${series.heightPct}%` }}
                              title={`${series.seriesName} · ${series.label} · ${series.valueLabel}`}
                            />
                          ))
                        ) : (
                          <div
                            data-otlp-metrics-trend-empty="no-real-series"
                            data-otlp-metrics-empty-state="honest-no-series"
                            data-otlp-metrics-empty-state-context="applied-query-visible"
                            className="flex h-full min-w-0 flex-1 items-center justify-center rounded-[3px] border border-dashed border-[#2a303a] bg-[#0c1016] px-3 text-center"
                          >
                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold text-[#a7b0bf]">暂无指标趋势</p>
                              <p className="mt-1 text-[11px] leading-4 text-[#657083]">运行查询后展示真实采样点。</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {!hasMetricSeries ? null : (
                      <div className="mt-2 text-[11px] text-[#6d7788]">
                        {trendBars.length ? `${trendBars.length} 个采样点` : '-'}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section data-otlp-metrics-workbench-grid="series-detail-split" className={hasMetricSeries ? 'grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]' : 'grid items-start gap-4'}>
                <div
                  data-otlp-metrics-series-table="cold-dense-metric-list"
                  data-otlp-metrics-series-table-mode="service-entity-series-set"
                  data-otlp-metrics-series-table-density="primary-scan"
                  className={`${panelClass} min-w-0 overflow-hidden`}
                >
                  <div className="border-b border-[#252b35] px-4 py-3">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <p className="text-[12px] font-semibold text-[#8792a5]">序列集合</p>
                      <span
                        data-otlp-metrics-series-table-summary="result-count"
                        className="rounded-[3px] border border-[#2b3039] bg-[#101217] px-2 py-1 text-[11px] font-semibold text-[#9ca7ba]"
                      >
                        {seriesRows.length} 条
                      </span>
                    </div>
                    <div
                      data-otlp-metrics-series-set-summary="service-entity-scope"
                      className="mt-3 grid gap-px overflow-hidden rounded-[3px] border border-[#252b35] bg-[#252b35] sm:grid-cols-2 xl:grid-cols-5"
                    >
                      {seriesSetScopeRows.map(row => (
                        <div key={row.label} className="min-w-0 bg-[#10141b] px-2.5 py-2">
                          <p className="truncate text-[10px] font-semibold text-[#7f8a9d]">{row.label}</p>
                          <p className="mt-1 truncate text-[12px] font-semibold text-[#e6edf7]">{row.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <table className="w-full border-collapse text-left text-[12px]">
                    <thead className="border-b border-[#252b35] bg-[#10141b] text-[#8792a5]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">指标名称</th>
                        <th className="px-4 py-3 font-semibold">服务</th>
                        <th className="px-4 py-3 font-semibold">实体</th>
                        <th className="px-4 py-3 font-semibold">最新值</th>
                        <th className="px-4 py-3 font-semibold">采样点</th>
                        <th className="px-4 py-3 font-semibold">最近时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seriesRows.length ? (
                        seriesRows.map((row, index) => {
                          const series = metricSeries[index];
                          const isSelectedSeries = selectedMetricSeries?.key === series?.key;
                          return (
                            <tr
                              key={`${row.title}-${index}`}
                              data-otlp-metrics-series-row="selectable-series"
                              data-otlp-metrics-series-row-selected={isSelectedSeries ? 'true' : 'false'}
                              className={`cursor-pointer border-b border-[#1f2530] last:border-b-0 ${isSelectedSeries ? 'bg-[#131b28]' : 'hover:bg-[#111721]'}`}
                              tabIndex={0}
                              onClick={() => {
                                if (series) setSelectedSeriesKey(series.key);
                              }}
                              onKeyDown={event => {
                                if ((event.key === 'Enter' || event.key === ' ') && series) {
                                  event.preventDefault();
                                  setSelectedSeriesKey(series.key);
                                }
                              }}
                            >
                            <td className="max-w-[320px] truncate px-4 py-3 font-mono text-[12px] font-semibold text-[#edf3fb]">{row.title}</td>
                            <td className="px-4 py-3 text-[#c8d2df]">{row.copy}</td>
                            <td data-otlp-metrics-series-entity="true" className="min-w-[140px] px-4 py-3">
                              <span className="block truncate font-semibold text-[#dbe5f3]">{row.entityLabel}</span>
                              <span
                                className={`mt-1 block truncate text-[11px] ${
                                  row.entityState === 'present' ? 'text-[#75c795]' : 'text-[#8b94a4]'
                                }`}
                              >
                                {row.entityMeta}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-[#e6edf7]">{row.meta}</td>
                            <td className="px-4 py-3 text-[#c8d2df]">{metricSeries[index]?.points.length ?? 0}</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-[#8792a5]">{formatTime(latestObservedAt)}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="h-[260px] text-center">
                            <div className="mx-auto flex max-w-[280px] flex-col items-center">
                              <Database className="h-8 w-8 text-[#7d8798]" aria-hidden="true" />
                              <p className="mt-3 text-[14px] font-semibold text-[#edf3fb]">{workbenchState.emptyTitle}</p>
                              <p
                                data-otlp-metrics-empty-guidance="operator-no-data-guidance"
                                className="mt-2 text-[12px] leading-5 text-[#7f8a9d]"
                              >
                                {workbenchState.noMetricsTitle}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {hasMetricSeries && selectedMetricSeries ? (
                <aside
                  data-otlp-metrics-detail-panel="cold-detail-panel"
                  data-otlp-metrics-detail-panel-priority="secondary-inspector"
                  className={`${panelClass} min-w-0 overflow-hidden xl:sticky xl:top-4 xl:self-start`}
                >
                  <div className="border-b border-[#252b35] px-4 py-3">
                    <p className="text-[12px] font-semibold text-[#8792a5]">详情面板</p>
                    <h2 className="mt-2 truncate text-[18px] font-semibold text-[#f2f6fb]">{firstSeries.title}</h2>
                    <p className="mt-1 truncate text-[11px] text-[#6d7788]">{workbenchState.chartLabel}</p>
                  </div>
                  <div data-otlp-metrics-detail-panel-body="compact-evidence-stack" className="px-4 py-3">
                    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-[#252b35] bg-[#252b35]">
                      {metrics.map(metric => (
                        <div key={metric.label} className="min-w-0 bg-[#10141b] px-3 py-2">
                          <p className="truncate text-[11px] font-semibold text-[#8792a5]">{metric.label}</p>
                          <p className="mt-1 truncate text-[13px] font-semibold text-[#e6edf7]">{metric.value}</p>
                        </div>
                      ))}
                      {contextRows.map(row => (
                        <div key={row.title} className="col-span-2 min-w-0 bg-[#10141b] px-3 py-2">
                          <p className="truncate text-[11px] font-semibold text-[#8792a5]">{row.title}</p>
                          <p className="mt-1 truncate text-[13px] font-semibold text-[#e6edf7]">{row.copy}</p>
                          <p className="mt-1 truncate text-[11px] text-[#6d7788]">{row.meta}</p>
                        </div>
                      ))}
                    </div>
                    {selectedSeriesContextRows.length > 0 ? (
                      <div
                        data-otlp-metrics-selected-series-context="selected-series-attribution"
                        aria-label="当前选中序列 关联实体 当前服务 采集模板 当前环境"
                        className="mt-3 border-t border-[#252b35] pt-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold text-[#8792a5]">当前选中序列</p>
                          <span className="text-[11px] font-semibold text-[#6d7788]">采集模板</span>
                        </div>
                        <div className="space-y-2">
                          {selectedSeriesContextRows.map(row => (
                            <div key={row.label} className="grid grid-cols-[72px_minmax(0,1fr)] gap-2 text-[11px]">
                              <span className="text-[#7f8a9d]">{row.label}</span>
                              <span className="min-w-0">
                                <span className="block truncate font-semibold text-[#e6edf7]">{row.value}</span>
                                <span className="block truncate text-[#6d7788]">{row.meta}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {selectedSeriesEvidenceRows.length > 0 ? (
                      <div
                        data-otlp-metrics-selected-series-evidence="real-sample-evidence"
                        aria-label="指标证据 采样点 最新值 值域 采样窗口 关联链路"
                        className="mt-3 border-t border-[#252b35] pt-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold text-[#8792a5]">指标证据</p>
                          <span className="text-[11px] font-semibold text-[#6d7788]">真实采样</span>
                        </div>
                        <div className="space-y-2">
                          {selectedSeriesEvidenceRows.map(row => (
                            <div key={row.label} className="grid grid-cols-[72px_minmax(0,1fr)] gap-2 text-[11px]">
                              <span className="text-[#7f8a9d]">{row.label}</span>
                              <span className="min-w-0">
                                <span className="block truncate font-semibold text-[#e6edf7]">{row.value}</span>
                                <span className="block truncate text-[#6d7788]">{row.meta}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div data-otlp-metrics-handoff-actions="compact-context-actions" className="grid grid-cols-2 gap-2 border-t border-[#252b35] px-4 py-3">
                    {canOpenEntity ? (
                      <Link href={handoffLinks.entityHref} data-otlp-metrics-entity-action="true" className={`${actionClass} w-full px-2`}>
                        实体详情
                      </Link>
                    ) : (
                      <span className="inline-flex" title={missingEntityHandoffTitle}>
                        <button
                          data-otlp-metrics-entity-action-disabled="missing-entity-id"
                          type="button"
                          className={`${disabledActionClass} w-full px-2`}
                          disabled
                          title={missingEntityHandoffTitle}
                          aria-label={missingEntityHandoffTitle}
                        >
                          实体详情
                        </button>
                      </span>
                    )}
                    <Link href={handoffLinks.alertHandlingHref} data-otlp-metrics-alert-handling-action="true" className={`${actionClass} w-full px-2`}>
                      告警处理
                    </Link>
                    <Link href={handoffLinks.logsHref} data-otlp-metrics-logs-action="true" className={`${actionClass} w-full px-2`}>
                      查看日志
                    </Link>
                    <Link href={handoffLinks.tracesHref} data-otlp-metrics-traces-action="true" className={`${actionClass} w-full px-2`}>
                      查看链路
                    </Link>
                    <Link href={handoffLinks.entitiesHref} className={`${actionClass} w-full px-2`}>
                      对象目录
                    </Link>
                  </div>
                  <div data-otlp-metrics-secondary-context="collapsible-evidence-diagnostics" className="space-y-2 border-t border-[#252b35] px-4 py-3">
                    {linkedRecordRows.length > 0 ? (
                      <details
                        data-otlp-metrics-linked-record-summary="log-trace-alert-links"
                        data-otlp-metrics-linked-record-summary-panel="collapsible"
                        aria-label="关联记录 历史日志 链路瀑布图 告警处理"
                        className="rounded-[3px] border border-[#252b35] bg-[#0d1015]"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 text-[11px] font-semibold text-[#8792a5]">
                          <span>关联记录</span>
                          <span className="text-[#6d7788]">日志 / 链路 / 告警</span>
                        </summary>
                        <div className="space-y-2 border-t border-[#252b35] p-2">
                          {linkedRecordRows.map(row => (
                            <Link
                              key={row.key}
                              href={row.href}
                              data-otlp-metrics-linked-record-action={row.key}
                              className="block rounded-[3px] border border-[#252b35] bg-[#0b0f15] px-2.5 py-2 transition-colors hover:border-[#344052] hover:bg-[#121823]"
                            >
                              <span className="flex min-w-0 items-center justify-between gap-2 text-[11px]">
                                <span className="truncate text-[#7f8a9d]">{row.label}</span>
                                <span className="shrink-0 font-semibold text-[#e6edf7]">{row.value}</span>
                              </span>
                              <span className="mt-1 block truncate text-[11px] text-[#6d7788]">{row.meta}</span>
                            </Link>
                          ))}
                        </div>
                      </details>
                    ) : null}
                    {attributionDiagnostics.length > 0 ? (
                      <details
                        data-otlp-metrics-attribution-diagnostics="hertzbeat-attribute-diagnostics"
                        data-otlp-metrics-attribution-diagnostics-panel="collapsible"
                        aria-label="归因诊断 hertzbeat.entity_id hertzbeat.entity_name hertzbeat.workspace_id hertzbeat.collector hertzbeat.template"
                        className="rounded-[3px] border border-[#252b35] bg-[#0d1015]"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 text-[11px] font-semibold text-[#8792a5]">
                          <span>归因诊断</span>
                          <span className="text-[#6d7788]">hertzbeat.*</span>
                        </summary>
                        <div className="space-y-2 border-t border-[#252b35] p-2">
                          {attributionDiagnostics.map(row => (
                            <div
                              key={row.key}
                              data-otlp-metrics-attribution-diagnostic-state={row.state}
                              className="grid grid-cols-[minmax(0,1fr)_52px] gap-2 text-[11px]"
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-mono font-semibold text-[#e6edf7]">{row.label}</span>
                                <span className="block truncate text-[#6d7788]">{row.value} · {row.meta}</span>
                              </span>
                              <span
                                className={`inline-flex h-5 items-center justify-center rounded-[3px] border px-1.5 font-semibold ${
                                  row.state === 'present'
                                    ? 'border-[#24543b] bg-[#0d241a] text-[#76d69b]'
                                    : 'border-[#4a3140] bg-[#24111a] text-[#d68aa6]'
                                }`}
                              >
                                {row.state === 'present' ? '已提供' : '缺失'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : null}
                    <details
                      data-otlp-metrics-entity-context="hertzbeat-signal-entity-context"
                      data-otlp-metrics-entity-context-panel="collapsible"
                      aria-label="实体上下文 当前实体 监控实例 当前服务 链路上下文 当前环境 时间范围 采集来源"
                      className="rounded-[3px] border border-[#252b35] bg-[#0d1015]"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 text-[11px] font-semibold text-[#8792a5]">
                        <span>实体上下文</span>
                        <span className="text-[#6d7788]">当前窗口</span>
                      </summary>
                      <div className="space-y-2 border-t border-[#252b35] p-2">
                        {entityContextRows.map(row => (
                          <div key={row.label} className="grid grid-cols-[72px_minmax(0,1fr)] gap-2 text-[11px]">
                            <span className="text-[#7f8a9d]">{row.label}</span>
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-[#e6edf7]">{row.value}</span>
                              <span className="block truncate text-[#6d7788]">{row.meta}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                </aside>
                ) : (
                  <span data-otlp-metrics-detail-panel-empty="suppressed-until-real-series" className="sr-only" />
                )}
              </section>
          </main>
        );
      }}
    </ClientWorkbench>
  );
}
