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
    { label: '指标序列', value: String(data.stats?.totalSeries ?? 0) },
    { label: '有数据序列', value: String(data.stats?.nonEmptySeries ?? 0) },
    { label: '存储来源', value: data.datasource || '-' },
    { label: '最近上报', value: formatTime(data.stats?.latestObservedAt) }
  ];
}

export function buildConsoleMetrics(data: OtlpMetricsConsole, t: Translator) {
  return [
    { label: '有数据序列', value: String(data.stats?.nonEmptySeries ?? 0) },
    { label: '序列总数', value: String(data.stats?.totalSeries ?? 0) },
    { label: '接入状态', value: data.query ? t('common.ready') : t('common.empty') }
  ];
}

export function buildMetricsExplorerState(data: OtlpMetricsConsole): MetricsExplorerState {
  const totalSeries = data.stats?.totalSeries ?? data.results?.frames?.length ?? 0;
  const nonEmptySeries = data.stats?.nonEmptySeries ?? 0;
  return {
    chartLabel: `${nonEmptySeries} 条有数据序列`,
    hasSeries: totalSeries > 0 || nonEmptySeries > 0,
    emptyTitle: '暂无指标序列',
    noMetricsTitle: '确认时间范围、实体归因、采集器和监控模板后再查看指标。',
    sendMetricsLabel: '等待 OTLP 指标写入',
    seriesCountLabel: `${totalSeries} 条序列`
  };
}

export function buildConsoleRows(data: OtlpMetricsConsole, t: Translator) {
  return [
    { title: '当前指标', copy: data.query || '-', meta: data.emptyStateReason || data.errorMessage || t('otlp.metrics.query-ready') },
    { title: '排障去向', copy: '关联实体、日志、链路和告警处理。', meta: '按服务、模板和时间范围继续定位' }
  ];
}

export function buildContextRows(
  data: OtlpMetricsConsole,
  t: Translator,
  formatTime: (value?: number | string | null) => string
) {
  return [
    { title: '当前服务', copy: data.context?.serviceName || '-', meta: data.context?.serviceNamespace || '-' },
    { title: '时间范围', copy: `${formatTime(data.context?.start)} → ${formatTime(data.context?.end)}`, meta: data.results?.msg || t('otlp.metrics.query-context') }
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
      entityMeta: entityId ? `entityId ${entityId}` : '等待实体归因',
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
      label: '指标名称',
      value: series.name || '-',
      meta: '当前选中序列'
    },
    {
      label: '关联实体',
      value: context.entityName || entityId || '-',
      meta: entityId ? `entityId ${entityId}` : '等待实体归因'
    },
    {
      label: '当前服务',
      value: context.serviceName || '-',
      meta: context.serviceNamespace || '服务上下文'
    },
    {
      label: '采集模板',
      value: context.template || '-',
      meta: context.collector ? `采集器 ${context.collector}` : '监控模板'
    },
    {
      label: '当前环境',
      value: context.environment || '-',
      meta: '部署环境'
    }
  ];
}

export function buildMetricSeriesEvidenceRows(
  series: OtlpMetricSeriesView | null | undefined,
  formatTime: (value?: number | string | null) => string
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
      label: '采样点',
      value: String(validPoints.length),
      meta: skippedCount > 0 ? `${skippedCount} 个空值已跳过` : '真实采样点'
    },
    {
      label: '最新值',
      value: latestPoint ? String(latestPoint[1]) : '-',
      meta: latestPoint ? formatTime(latestPoint[0]) : '等待最新采样'
    },
    {
      label: '值域',
      value: minValue != null && maxValue != null ? `${minValue} - ${maxValue}` : '-',
      meta: average != null ? `平均 ${average}` : '等待真实采样'
    },
    {
      label: '采样窗口',
      value: firstTimestamp != null && lastTimestamp != null ? `${formatTime(firstTimestamp)} → ${formatTime(lastTimestamp)}` : '-',
      meta: firstTimestamp != null && lastTimestamp != null ? '真实采样时间' : '等待采样时间'
    },
    {
      label: '关联链路',
      value: traceId || '-',
      meta: spanId || (traceId ? '未提供 span_id' : '缺少 trace_id/span_id')
    }
  ];
}

export function buildMetricSeriesLinkedRecordRows(
  series: OtlpMetricSeriesView | null | undefined,
  handoffLinks: Pick<ReturnType<typeof buildMetricsHandoffLinks>, 'logsHref' | 'tracesHref' | 'alertHandlingHref'>
): OtlpMetricSeriesLinkedRecordRow[] {
  if (!series) return [];
  const traceId = readSeriesLabel(series, 'traceId', 'trace_id', 'trace.id', 'trace_id_hex');
  const spanId = readSeriesLabel(series, 'spanId', 'span_id', 'span.id', 'span_id_hex');
  const serviceName = readSeriesLabel(series, 'service.name', 'service_name', 'serviceName');
  const entityId = readEntityIdRouteParam(readSeriesLabel(series, 'hertzbeat.entity_id', 'hertzbeat_entity_id', 'entity.id', 'entity_id'));

  return [
    {
      key: 'logs',
      label: '历史日志',
      value: traceId ? '按链路查看' : '按服务查看',
      meta: traceId ? (spanId ? '历史日志会定位到当前 span' : '历史日志会定位到当前链路') : serviceName ? '缺少链路 ID 时按服务筛选' : '等待服务或链路上下文',
      href: handoffLinks.logsHref
    },
    {
      key: 'traces',
      label: '链路瀑布图',
      value: traceId ? '可打开' : '等待链路 ID',
      meta: traceId ? (spanId ? '打开完整链路并保留当前 span' : '打开完整链路') : '指标没有链路 ID，暂不能定位链路',
      href: handoffLinks.tracesHref
    },
    {
      key: 'alerts',
      label: '告警处理',
      value: entityId ? '带实体处理' : '按服务处理',
      meta: entityId ? '按实体、服务和指标进入告警' : '缺少实体 ID 时按服务进入告警',
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
    row('hertzbeat.entity_id', entityId, entityId ? '可打开实体详情' : '缺少实体 ID，实体详情会保持禁用'),
    row('hertzbeat.entity_name', entityName, '用于展示实体名称'),
    row('hertzbeat.workspace_id', workspaceId, '缺少工作区字段时使用当前部署上下文'),
    row('hertzbeat.collector', collector, '采集器来源'),
    row('hertzbeat.template', template, '监控模板归属')
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
