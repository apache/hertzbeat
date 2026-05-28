import {
  appendSignalRouteContext,
  buildSignalAlertHandlingHref,
  buildSignalAlertRulesHref,
  buildSignalEntityHref,
  readEntityIdRouteParam,
  stripReturnLabelFromHref,
  type SignalRouteContext
} from '../signal-route-context';
import { buildChartDataZoomTimeContext, type ChartDataZoomRange, type TimeContext } from '../time-context';
import type { OtlpMetricsQueryState } from './controller';
import type { EChartsOption } from 'echarts';
import type { OtlpMetricsConsole } from '@/lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type OtlpMetricSeriesView = {
  key: string;
  name: string;
  labels: Record<string, string>;
  points: Array<[number, number | null]>;
  latestValue: number | null;
};

export type OtlpMetricTrendBar = {
  key: string;
  seriesName: string;
  label: string;
  value: number;
  valueLabel: string;
  heightPct: number;
};

export type MetricsDataZoomRange = ChartDataZoomRange;

export type OtlpMetricSeriesAttributionDiagnostic = {
  key: string;
  label: string;
  value: string;
  state: 'present' | 'missing';
  meta: string;
};

export type OtlpMetricSeriesEvidenceRow = {
  label: string;
  value: string;
  meta: string;
};

export type OtlpMetricSeriesLinkedRecordRow = {
  key: 'logs' | 'traces' | 'alerts';
  label: string;
  value: string;
  meta: string;
  href: string;
};

export type MetricsExplorerState = {
  chartLabel: string;
  hasSeries: boolean;
  emptyTitle: string;
  noMetricsTitle: string;
  sendMetricsLabel: string;
  seriesCountLabel: string;
};

function firstText(...values: Array<string | null | undefined>): string | undefined {
  return values.find((value): value is string => value != null && value.trim() !== '');
}

function readSeriesLabel(series: OtlpMetricSeriesView | null | undefined, ...keys: string[]) {
  if (!series) return undefined;
  return firstText(...keys.map(key => series.labels[key]));
}

function buildMetricSeriesSignalContext(series: OtlpMetricSeriesView | null | undefined): SignalRouteContext {
  if (!series) return {};
  return {
    entityId: readEntityIdRouteParam(readSeriesLabel(series, 'hertzbeat.entity_id', 'hertzbeat_entity_id', 'entity.id', 'entity_id')),
    entityName: readSeriesLabel(series, 'hertzbeat.entity_name', 'hertzbeat_entity_name', 'entity.name', 'entity_name'),
    serviceName: readSeriesLabel(series, 'service.name', 'service_name', 'serviceName'),
    serviceNamespace: readSeriesLabel(series, 'service.namespace', 'service_namespace', 'serviceNamespace'),
    environment: readSeriesLabel(series, 'deployment.environment.name', 'deployment_environment_name', 'deployment_environment', 'environment'),
    traceId: readSeriesLabel(series, 'traceId', 'trace_id', 'trace.id', 'trace_id_hex'),
    spanId: readSeriesLabel(series, 'spanId', 'span_id', 'span.id', 'span_id_hex'),
    collector: readSeriesLabel(series, 'hertzbeat.collector', 'hertzbeat_collector', 'collector'),
    template: readSeriesLabel(series, 'hertzbeat.template', 'hertzbeat_template', 'hertzbeat.monitor_template', 'hertzbeat_monitor_template', 'template')
  };
}

export function buildConsoleFacts(
  data: OtlpMetricsConsole,
  t: Translator,
  formatTime: (value?: number | string | null) => string
) {
  return [
    { label: t('otlp.metrics.stats.total-series'), value: String(data.stats?.totalSeries ?? 0) },
    { label: t('otlp.metrics.stats.non-empty-series'), value: String(data.stats?.nonEmptySeries ?? 0) },
    { label: t('otlp.metrics.stats.datasource'), value: data.datasource || '-' },
    { label: t('otlp.metrics.stats.latest-observed'), value: formatTime(data.stats?.latestObservedAt) }
  ];
}

export function buildConsoleMetrics(data: OtlpMetricsConsole, t: Translator) {
  return [
    { label: t('otlp.metrics.stats.non-empty-series'), value: String(data.stats?.nonEmptySeries ?? 0) },
    { label: t('otlp.metrics.stats.series-total'), value: String(data.stats?.totalSeries ?? 0) },
    { label: t('otlp.metrics.stats.intake-state'), value: data.query ? t('common.ready') : t('common.empty') }
  ];
}

export function buildMetricsExplorerState(data: OtlpMetricsConsole, t: Translator): MetricsExplorerState {
  const totalSeries = data.stats?.totalSeries ?? data.results?.frames?.length ?? 0;
  const nonEmptySeries = data.stats?.nonEmptySeries ?? 0;
  return {
    chartLabel: t('otlp.metrics.explorer.chart-label', { count: nonEmptySeries }),
    hasSeries: totalSeries > 0 || nonEmptySeries > 0,
    emptyTitle: t('otlp.metrics.explorer.empty-title'),
    noMetricsTitle: t('otlp.metrics.explorer.no-metrics-title'),
    sendMetricsLabel: t('otlp.metrics.explorer.waiting-ingest'),
    seriesCountLabel: t('otlp.metrics.explorer.series-count', { count: totalSeries })
  };
}

export function buildConsoleRows(data: OtlpMetricsConsole, t: Translator) {
  return [
    { title: t('otlp.metrics.context.current-metric'), copy: data.query || '-', meta: data.emptyStateReason || data.errorMessage || t('otlp.metrics.query-ready') },
    { title: t('otlp.metrics.context.handoff-destination'), copy: t('otlp.metrics.context.handoff-copy'), meta: t('otlp.metrics.context.handoff-meta') }
  ];
}

export function buildContextRows(
  data: OtlpMetricsConsole,
  t: Translator,
  formatTime: (value?: number | string | null) => string
) {
  return [
    { title: t('otlp.metrics.context.current-service'), copy: data.context?.serviceName || '-', meta: data.context?.serviceNamespace || '-' },
    { title: t('otlp.metrics.context.time-range'), copy: `${formatTime(data.context?.start)} → ${formatTime(data.context?.end)}`, meta: data.results?.msg || t('otlp.metrics.query-context') }
  ];
}

export function buildMetricSeriesViews(data: OtlpMetricsConsole, t: Translator): OtlpMetricSeriesView[] {
  return (data.results?.frames || [])
    .map((frame, index) => {
      const labels = frame.schema?.labels || {};
      const name = labels.__name__ || `${t('otlp.metrics.series.fallback')} ${index + 1}`;
      const points = (frame.data || []).map(row => {
        const timestamp = Number(row?.[0]);
        const value = row?.[1] == null || row?.[1] === '' ? null : Number(row[1]);
        return [timestamp, Number.isFinite(value as number) ? (value as number) : null] as [number, number | null];
      });

      return {
        key: `${name}-${index}`,
        name,
        labels,
        points,
        latestValue: points.length > 0 ? points[points.length - 1][1] : null,
      };
    })
    .filter(series => series.points.length > 0);
}

export function buildMetricsChartOption(seriesList: OtlpMetricSeriesView[]): EChartsOption {
  const hasZoomableSeries = seriesList.some(series => series.points.length > 1);
  return {
    animation: false,
    backgroundColor: 'transparent',
    grid: {
      left: 18,
      right: 18,
      top: 24,
      bottom: hasZoomableSeries ? 72 : 34,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      backgroundColor: 'rgba(11, 18, 32, 0.96)',
      borderColor: 'rgba(148, 163, 184, 0.18)',
      borderWidth: 1,
      textStyle: { color: 'rgba(241, 245, 249, 0.92)' },
    },
    legend: {
      show: seriesList.length > 1,
      top: 0,
      right: 0,
      textStyle: {
        color: 'rgba(148, 163, 184, 0.72)',
        fontSize: 11,
      },
    },
    xAxis: {
      type: 'time',
      splitNumber: 5,
      axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.24)' } },
      axisTick: { show: false },
      axisLabel: { color: 'rgba(148, 163, 184, 0.72)', fontSize: 10, margin: 12, hideOverlap: true },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: {
        lineStyle: {
          color: 'rgba(148, 163, 184, 0.14)',
          type: 'dashed',
        },
      },
      axisLabel: { color: 'rgba(148, 163, 184, 0.72)', fontSize: 10, margin: 10 },
    },
    dataZoom: hasZoomableSeries
      ? [
          {
            type: 'slider',
            xAxisIndex: 0,
            filterMode: 'none',
            start: 0,
            end: 100,
            bottom: 18,
            height: 28,
            showDetail: false,
            textStyle: {
              color: 'rgba(148, 163, 184, 0.72)'
            }
          },
          {
            type: 'inside',
            xAxisIndex: 0,
            filterMode: 'none',
            start: 0,
            end: 100,
            zoomOnMouseWheel: false,
            moveOnMouseMove: false,
            moveOnMouseWheel: false
          }
        ]
      : undefined,
    series: seriesList.slice(0, 6).map(series => ({
      name: series.name,
      type: 'line',
      smooth: true,
      connectNulls: true,
      showSymbol: false,
      symbol: 'circle',
      lineStyle: {
        width: 2,
      },
      areaStyle: {
        opacity: 0.08,
      },
      data: series.points.map(point => [point[0], point[1] == null ? Number.NaN : point[1]]),
    })),
  };
}

export function buildMetricsDataZoomTimeContext(
  seriesList: OtlpMetricSeriesView[],
  zoomRange: MetricsDataZoomRange | null | undefined,
  fallbackTimeRange?: string
): TimeContext | null {
  return buildChartDataZoomTimeContext(
    seriesList.flatMap(series => series.points.map(point => point[0])),
    zoomRange,
    fallbackTimeRange
  );
}

export function buildMetricSeriesRows(seriesList: OtlpMetricSeriesView[], t: Translator) {
  return seriesList.map(series => {
    const context = buildMetricSeriesSignalContext(series);
    const entityId = readEntityIdRouteParam(context.entityId);
    return {
      title: series.name,
      copy: context.serviceName || t('otlp.metrics.series.unknown-service'),
      meta: series.latestValue == null ? '-' : String(series.latestValue),
      entityLabel: context.entityName || entityId || '-',
      entityMeta: entityId ? t('otlp.metrics.series.entity-id', { entityId }) : t('otlp.metrics.series.entity-missing'),
      entityState: entityId ? 'present' : 'missing'
    };
  });
}

export function buildMetricSeriesContextRows(series: OtlpMetricSeriesView | null | undefined, t: Translator) {
  if (!series) return [];
  const context = buildMetricSeriesSignalContext(series);
  const entityId = readEntityIdRouteParam(context.entityId);
  return [
    {
      label: t('otlp.metrics.series.context.metric-name'),
      value: series.name || '-',
      meta: t('otlp.metrics.series.context.selected-series')
    },
    {
      label: t('otlp.metrics.series.context.entity'),
      value: context.entityName || entityId || '-',
      meta: entityId ? t('otlp.metrics.series.entity-id', { entityId }) : t('otlp.metrics.series.entity-missing')
    },
    {
      label: t('otlp.metrics.series.context.service'),
      value: context.serviceName || '-',
      meta: context.serviceNamespace || t('otlp.metrics.series.context.service-context')
    },
    {
      label: t('otlp.metrics.series.context.template'),
      value: context.template || '-',
      meta: context.collector ? t('otlp.metrics.series.context.collector', { collector: context.collector }) : t('otlp.metrics.series.context.monitor-template')
    },
    {
      label: t('otlp.metrics.series.context.environment'),
      value: context.environment || '-',
      meta: t('otlp.metrics.series.context.deployment-environment')
    }
  ];
}

export function buildMetricSeriesEvidenceRows(
  series: OtlpMetricSeriesView | null | undefined,
  formatTime: (value?: number | string | null) => string,
  t: Translator
): OtlpMetricSeriesEvidenceRow[] {
  if (!series) return [];
  const validPoints = series.points.filter((point): point is [number, number] => {
    const [timestamp, value] = point;
    return Number.isFinite(timestamp) && value != null && Number.isFinite(value);
  });
  const timedPoints = series.points.filter(point => Number.isFinite(point[0]));
  const skippedCount = Math.max(series.points.length - validPoints.length, 0);
  const latestPoint = validPoints[validPoints.length - 1];
  const values = validPoints.map(([, value]) => value);
  const minValue = values.length ? Math.min(...values) : null;
  const maxValue = values.length ? Math.max(...values) : null;
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const firstTimestamp = timedPoints[0]?.[0];
  const lastTimestamp = timedPoints[timedPoints.length - 1]?.[0];
  const traceId = readSeriesLabel(series, 'traceId', 'trace_id', 'trace.id', 'trace_id_hex');
  const spanId = readSeriesLabel(series, 'spanId', 'span_id', 'span.id', 'span_id_hex');

  return [
    {
      label: t('otlp.metrics.evidence.samples'),
      value: String(validPoints.length),
      meta: skippedCount > 0 ? t('otlp.metrics.evidence.empty-skipped', { count: skippedCount }) : t('otlp.metrics.evidence.real-samples')
    },
    {
      label: t('otlp.metrics.evidence.latest-value'),
      value: latestPoint ? String(latestPoint[1]) : '-',
      meta: latestPoint ? formatTime(latestPoint[0]) : t('otlp.metrics.evidence.waiting-latest')
    },
    {
      label: t('otlp.metrics.evidence.value-range'),
      value: minValue != null && maxValue != null ? `${minValue} - ${maxValue}` : '-',
      meta: average != null ? t('otlp.metrics.evidence.average', { average }) : t('otlp.metrics.evidence.waiting-real-samples')
    },
    {
      label: t('otlp.metrics.evidence.sample-window'),
      value: firstTimestamp != null && lastTimestamp != null ? `${formatTime(firstTimestamp)} → ${formatTime(lastTimestamp)}` : '-',
      meta: firstTimestamp != null && lastTimestamp != null ? t('otlp.metrics.evidence.real-sample-time') : t('otlp.metrics.evidence.waiting-sample-time')
    },
    {
      label: t('otlp.metrics.evidence.linked-trace'),
      value: traceId || '-',
      meta: spanId || (traceId ? t('otlp.metrics.evidence.missing-span') : t('otlp.metrics.evidence.missing-trace-span'))
    }
  ];
}

export function buildMetricSeriesLinkedRecordRows(
  series: OtlpMetricSeriesView | null | undefined,
  handoffLinks: Pick<ReturnType<typeof buildMetricsHandoffLinks>, 'logsHref' | 'tracesHref' | 'alertHandlingHref'>,
  t: Translator
): OtlpMetricSeriesLinkedRecordRow[] {
  if (!series) return [];
  const traceId = readSeriesLabel(series, 'traceId', 'trace_id', 'trace.id', 'trace_id_hex');
  const spanId = readSeriesLabel(series, 'spanId', 'span_id', 'span.id', 'span_id_hex');
  const serviceName = readSeriesLabel(series, 'service.name', 'service_name', 'serviceName');
  const entityId = readEntityIdRouteParam(readSeriesLabel(series, 'hertzbeat.entity_id', 'hertzbeat_entity_id', 'entity.id', 'entity_id'));

  return [
    {
      key: 'logs',
      label: t('otlp.metrics.handoff.logs'),
      value: traceId ? t('otlp.metrics.handoff.logs-by-trace') : t('otlp.metrics.handoff.logs-by-service'),
      meta: traceId ? (spanId ? t('otlp.metrics.handoff.logs-current-span') : t('otlp.metrics.handoff.logs-current-trace')) : serviceName ? t('otlp.metrics.handoff.logs-service-filter') : t('otlp.metrics.handoff.logs-waiting-context'),
      href: handoffLinks.logsHref
    },
    {
      key: 'traces',
      label: t('otlp.metrics.handoff.traces'),
      value: traceId ? t('otlp.metrics.handoff.trace-open') : t('otlp.metrics.handoff.trace-waiting-id'),
      meta: traceId ? (spanId ? t('otlp.metrics.handoff.trace-full-current-span') : t('otlp.metrics.handoff.trace-full')) : t('otlp.metrics.handoff.trace-missing-id'),
      href: handoffLinks.tracesHref
    },
    {
      key: 'alerts',
      label: t('otlp.metrics.handoff.alerts'),
      value: entityId ? t('otlp.metrics.handoff.alerts-by-entity') : t('otlp.metrics.handoff.alerts-by-service'),
      meta: entityId ? t('otlp.metrics.handoff.alerts-by-entity-meta') : t('otlp.metrics.handoff.alerts-by-service-meta'),
      href: handoffLinks.alertHandlingHref
    }
  ];
}

export function buildMetricSeriesAttributionDiagnostics(
  series: OtlpMetricSeriesView | null | undefined,
  t: Translator
): OtlpMetricSeriesAttributionDiagnostic[] {
  if (!series) return [];
  const entityId = readEntityIdRouteParam(readSeriesLabel(series, 'hertzbeat.entity_id', 'hertzbeat_entity_id', 'entity.id', 'entity_id'));
  const entityName = readSeriesLabel(series, 'hertzbeat.entity_name', 'hertzbeat_entity_name', 'entity.name', 'entity_name');
  const workspaceId = readSeriesLabel(series, 'hertzbeat.workspace_id', 'hertzbeat_workspace_id', 'workspace.id', 'workspace_id');
  const collector = readSeriesLabel(series, 'hertzbeat.collector', 'hertzbeat_collector', 'collector');
  const template = readSeriesLabel(series, 'hertzbeat.template', 'hertzbeat_template', 'hertzbeat.monitor_template', 'hertzbeat_monitor_template', 'template');

  const row = (key: string, value: string | undefined, meta: string): OtlpMetricSeriesAttributionDiagnostic => ({
    key,
    label: key,
    value: value || '-',
    state: value ? 'present' : 'missing',
    meta
  });

  return [
    row('hertzbeat.entity_id', entityId, entityId ? t('otlp.metrics.attribution.entity-id.present') : t('otlp.metrics.attribution.entity-id.missing')),
    row('hertzbeat.entity_name', entityName, t('otlp.metrics.attribution.entity-name')),
    row('hertzbeat.workspace_id', workspaceId, t('otlp.metrics.attribution.workspace-id')),
    row('hertzbeat.collector', collector, t('otlp.metrics.attribution.collector')),
    row('hertzbeat.template', template, t('otlp.metrics.attribution.template'))
  ];
}

export function buildMetricTrendBars(
  seriesList: OtlpMetricSeriesView[],
  formatTime: (value?: number | string | null) => string,
  maxPoints = 10
): OtlpMetricTrendBar[] {
  const primarySeries = seriesList.find(series => series.points.some(([, value]) => value != null && Number.isFinite(value)));
  if (!primarySeries) return [];
  const points = primarySeries.points
    .filter((point): point is [number, number] => point[1] != null && Number.isFinite(point[1]))
    .slice(-maxPoints);
  const maxValue = Math.max(...points.map(([, value]) => Math.abs(value)), 1);

  return points.map(([timestamp, value], index) => ({
    key: `${primarySeries.key}:${timestamp}:${index}`,
    seriesName: primarySeries.name,
    label: formatTime(timestamp),
    value,
    valueLabel: String(value),
    heightPct: Math.max(8, Math.round((Math.abs(value) / maxValue) * 100))
  }));
}

export function buildMetricsHandoffLinks(
  data: OtlpMetricsConsole,
  query: OtlpMetricsQueryState,
  routeContext: SignalRouteContext = {},
  selectedSeries?: OtlpMetricSeriesView | null
) {
  const selectedContext = buildMetricSeriesSignalContext(selectedSeries);
  const serviceName = firstText(selectedContext.serviceName, data.context?.serviceName ?? undefined, query.serviceName, routeContext.serviceName);
  const serviceNamespace = firstText(
    selectedContext.serviceNamespace,
    data.context?.serviceNamespace ?? undefined,
    query.serviceNamespace,
    routeContext.serviceNamespace
  );
  const environment = firstText(selectedContext.environment, data.context?.environment ?? undefined, query.environment, routeContext.environment);
  const start = query.start || (data.context?.start != null ? String(data.context.start) : routeContext.start);
  const end = query.end || (data.context?.end != null ? String(data.context.end) : routeContext.end);
  const traceId = firstText(selectedContext.traceId, query.traceId, routeContext.traceId);
  const spanId = firstText(selectedContext.spanId, query.spanId, routeContext.spanId);
  const signalContext: SignalRouteContext = {
    ...routeContext,
    ...query,
    entityId: selectedContext.entityId || query.entityId || (data.context?.entityId != null ? String(data.context.entityId) : routeContext.entityId),
    entityName: selectedContext.entityName || query.entityName || firstText(data.context?.entityName ?? undefined, routeContext.entityName),
    serviceName,
    serviceNamespace,
    environment,
    timeRange: routeContext.timeRange,
    traceId,
    spanId,
    source: routeContext.source || 'otlp',
    collector: selectedContext.collector || query.collector || routeContext.collector,
    template: selectedContext.template || query.template || routeContext.template,
    returnTo: stripReturnLabelFromHref(query.returnTo || routeContext.returnTo),
    start,
    end
  };

  const intakeParams = new URLSearchParams();
  appendSignalRouteContext(intakeParams, signalContext);
  intakeParams.set('returnTo', '/ingestion/otlp/metrics');
  intakeParams.set('signal', 'metrics');

  const logParams = new URLSearchParams();
  if (traceId) {
    logParams.set('view', 'list');
  } else if (serviceName) {
    logParams.set('search', `service.name = "${serviceName}"`);
  }
  if (traceId) logParams.set('traceId', traceId);
  if (spanId) logParams.set('spanId', spanId);
  appendSignalRouteContext(logParams, signalContext);

  const traceParams = new URLSearchParams();
  if (traceId) traceParams.set('traceId', traceId);
  if (spanId) traceParams.set('spanId', spanId);
  if (serviceName) traceParams.set('serviceName', serviceName);
  appendSignalRouteContext(traceParams, signalContext);

  const entityParams = new URLSearchParams();
  if (serviceName) entityParams.set('search', serviceName);

  return {
    intakeHref: intakeParams.toString() ? `/ingestion/otlp?${intakeParams.toString()}` : '/ingestion/otlp',
    logsHref: logParams.toString() ? `/log/manage?${logParams.toString()}` : '/log/manage',
    tracesHref: traceParams.toString() ? `/trace/manage?${traceParams.toString()}` : '/trace/manage',
    entitiesHref: entityParams.toString() ? `/entities?${entityParams.toString()}` : '/entities',
    entityHref: buildSignalEntityHref(signalContext, serviceName),
    alertHandlingHref: buildSignalAlertHandlingHref('metrics', signalContext),
    alertRulesHref: buildSignalAlertRulesHref('metrics', signalContext)
  };
}
