import {
  appendSignalRouteContext,
  buildSignalAlertHandlingHref,
  buildSignalAlertRulesHref,
  buildSignalDashboardHref,
  buildSignalEntityHref,
  readEntityIdRouteParam,
  stripReturnLabelFromHref,
  type SignalAlertRuleDraftContext,
  type SignalRouteContext
} from '../signal-route-context';
import { buildChartDataZoomTimeContext, type ChartDataZoomRange, type TimeContext } from '../time-context';
import type { OtlpMetricsQueryState } from './controller';
import type { EChartsOption } from 'echarts';
import type { OtlpMetricsConsole, OtlpMetricsInventory } from '@/lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type OtlpMetricSeriesView = {
  key: string;
  name: string;
  labels: Record<string, string>;
  description: string;
  metricType: string;
  unit: string;
  points: Array<[number, number | null]>;
  latestValue: number | null;
};

export type OtlpMetricInventorySort = 'name' | 'latest' | 'samples' | 'time-series';

export type OtlpMetricInventoryRow = {
  title: string;
  copy?: string;
  meta?: string;
  entityLabel?: string;
  entityMeta?: string;
  entityState?: 'present' | 'missing';
  pointCount?: number;
  sampleCount?: number;
  timeSeriesCount?: number;
  latestObservedAt?: number | null;
  description?: string;
  metricType?: string;
  unit?: string;
  inventorySource?: string;
  inventoryLabels?: Record<string, string>;
  series?: OtlpMetricSeriesView | null;
};

export type OtlpMetricTrendBar = {
  key: string;
  seriesName: string;
  label: string;
  value: number;
  valueLabel: string;
  heightPct: number;
};

export type OtlpMetricThresholdConfig = {
  warning?: number;
  critical?: number;
  warningLabel: string;
  criticalLabel: string;
};

export type OtlpMetricExpectedRangeConfig = {
  label: string;
  lowerLabel: string;
  upperLabel: string;
  lowerData: Array<[number, number]>;
  upperGapData: Array<[number, number]>;
  sampleCount: number;
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

export type OtlpMetricSeriesSampleRow = {
  key: string;
  index: string;
  timestamp: string;
  rawTimestamp: string;
  value: string;
  state: string;
};

export type OtlpMetricSeriesAttributeRow = {
  key: string;
  name: string;
  value: string;
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

function compactAlertDraftValue(value: string | null | undefined, maxLength = 160) {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
}

export function buildMetricsAlertRuleDraft(
  query: OtlpMetricsQueryState,
  routeContext: SignalRouteContext = {},
  selectedSeries?: OtlpMetricSeriesView | null
): SignalAlertRuleDraftContext {
  const metricName = compactAlertDraftValue(query.query || selectedSeries?.name || query.series);
  const expression = compactAlertDraftValue(query.formula || query.query || selectedSeries?.name || query.series, 240);
  const parts = [
    ['query', query.query || selectedSeries?.name],
    ['series', query.series],
    ['formula', query.formula],
    ['filter', query.filter],
    ['aggregation', query.aggregation],
    ['groupBy', query.groupBy],
    ['entityId', query.entityId || routeContext.entityId],
    ['entityType', query.entityType || routeContext.entityType],
    ['entityName', query.entityName || routeContext.entityName],
    ['serviceName', query.serviceName || routeContext.serviceName],
    ['serviceNamespace', query.serviceNamespace || routeContext.serviceNamespace],
    ['operationName', query.operationName || routeContext.operationName],
    ['environment', query.environment || routeContext.environment],
    ['traceId', query.traceId || routeContext.traceId],
    ['spanId', query.spanId || routeContext.spanId]
  ]
    .map(([key, value]) => {
      const normalized = compactAlertDraftValue(value);
      return normalized ? `${key}=${normalized}` : undefined;
    })
    .filter((value): value is string => Boolean(value));
  return {
    name: metricName ? `${metricName} metric alert` : 'Metric alert',
    query: parts.join('\n'),
    queryType: 'metrics',
    expression,
    datasource: 'promql'
  };
}

function metadataText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}

function readSeriesLabel(series: OtlpMetricSeriesView | null | undefined, ...keys: string[]) {
  if (!series) return undefined;
  return firstText(...keys.map(key => series.labels[key]));
}

function escapeLogAttributeFilterValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildLogAttributeFilterExpression(name: string, value: string | undefined) {
  const trimmedName = name.trim();
  const trimmedValue = value?.trim();
  if (!/^[A-Za-z0-9_.:-]+$/.test(trimmedName) || !trimmedValue || trimmedValue === '-') return undefined;
  return `${trimmedName}="${escapeLogAttributeFilterValue(trimmedValue)}"`;
}

function buildMetricSeriesSignalContext(series: OtlpMetricSeriesView | null | undefined): SignalRouteContext {
  if (!series) return {};
  return {
    entityId: readEntityIdRouteParam(readSeriesLabel(series, 'hertzbeat.entity_id', 'hertzbeat_entity_id', 'entity.id', 'entity_id')),
    entityType: readSeriesLabel(series, 'hertzbeat.entity_type', 'hertzbeat_entity_type', 'entity.type', 'entity_type'),
    entityName: readSeriesLabel(series, 'hertzbeat.entity_name', 'hertzbeat_entity_name', 'entity.name', 'entity_name'),
    serviceName: readSeriesLabel(series, 'service.name', 'service_name', 'serviceName'),
    serviceNamespace: readSeriesLabel(series, 'service.namespace', 'service_namespace', 'serviceNamespace'),
    environment: readSeriesLabel(series, 'deployment.environment.name', 'deployment_environment_name', 'deployment_environment', 'environment'),
    operationName: readSeriesLabel(series, 'operationName', 'operation_name', 'operation', 'http.route', 'http_route'),
    traceId: readSeriesLabel(series, 'traceId', 'trace_id', 'trace.id', 'trace_id_hex'),
    spanId: readSeriesLabel(series, 'spanId', 'span_id', 'span.id', 'span_id_hex'),
    collector: readSeriesLabel(series, 'hertzbeat.collector', 'hertzbeat_collector', 'collector'),
    template: readSeriesLabel(series, 'hertzbeat.template', 'hertzbeat_template', 'hertzbeat.monitor_template', 'hertzbeat_monitor_template', 'template')
  };
}

function buildMetricsLogsOperationAttributeFilter(
  selectedSeries: OtlpMetricSeriesView | null | undefined,
  operationName: string | undefined,
  traceId: string | undefined,
  spanId: string | undefined
) {
  if (traceId || spanId) return undefined;
  const httpRoute = readSeriesLabel(selectedSeries, 'http.route', 'http_route');
  if (httpRoute) return buildLogAttributeFilterExpression('http.route', httpRoute);
  return buildLogAttributeFilterExpression('span.name', operationName);
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
      const meta = frame.schema?.meta || {};
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
        description: firstText(
          metadataText(meta.description),
          metadataText(meta.help),
          labels.description,
          labels['otel.metric.description'],
          labels.metric_description
        ) || '',
        metricType: firstText(
          metadataText(meta.metricType),
          metadataText(meta.type),
          metadataText(meta.metric_type),
          labels.metric_type,
          labels['metric.type'],
          labels['otel.metric.type'],
          labels.instrument_type
        ) || '',
        unit: firstText(
          metadataText(meta.unit),
          metadataText(meta.metricUnit),
          metadataText(meta.metric_unit),
          labels.unit,
          labels['otel.metric.unit'],
          labels.metric_unit
        ) || '',
        points,
        latestValue: points.length > 0 ? points[points.length - 1][1] : null,
      };
    })
    .filter(series => series.points.length > 0);
}

type MetricsFormulaTransform = {
  operator: '+' | '-' | '*' | '/';
  operand: number;
};

function parseMetricsFormula(formula?: string | null): MetricsFormulaTransform | null {
  const normalized = formula?.trim();
  if (!normalized) return null;
  const match = /^(?:A|a|value)\s*([+\-*/])\s*(-?(?:\d+(?:\.\d+)?|\.\d+))$/.exec(normalized);
  if (!match) return null;
  const operand = Number(match[2]);
  if (!Number.isFinite(operand)) return null;
  if (match[1] === '/' && operand === 0) return null;
  return {
    operator: match[1] as MetricsFormulaTransform['operator'],
    operand
  };
}

function applyMetricsFormulaValue(value: number, transform: MetricsFormulaTransform) {
  switch (transform.operator) {
    case '+':
      return value + transform.operand;
    case '-':
      return value - transform.operand;
    case '*':
      return value * transform.operand;
    case '/':
      return value / transform.operand;
    default:
      return value;
  }
}

export function applyMetricsFormula(
  seriesList: OtlpMetricSeriesView[],
  formula?: string | null
): OtlpMetricSeriesView[] {
  const transform = parseMetricsFormula(formula);
  if (!transform) return seriesList;
  return seriesList.map(series => {
    const points = series.points.map(([timestamp, value]) => {
      if (value == null || !Number.isFinite(value)) return [timestamp, null] as [number, number | null];
      const nextValue = applyMetricsFormulaValue(value, transform);
      return [timestamp, Number.isFinite(nextValue) ? nextValue : null] as [number, number | null];
    });
    return {
      ...series,
      points,
      latestValue: points.length > 0 ? points[points.length - 1][1] : null
    };
  });
}

function buildMetricThresholdMarkLine(thresholds: OtlpMetricThresholdConfig | null | undefined) {
  if (!thresholds) return undefined;
  const data = [
    thresholds.warning == null
      ? null
      : {
          yAxis: thresholds.warning,
          name: thresholds.warningLabel,
          lineStyle: { color: '#f2c94c', type: 'dashed' as const, width: 1.5 },
          label: { color: '#f2c94c', formatter: `${thresholds.warningLabel} {c}` }
        },
    thresholds.critical == null
      ? null
      : {
          yAxis: thresholds.critical,
          name: thresholds.criticalLabel,
          lineStyle: { color: '#ef6f6c', type: 'dashed' as const, width: 1.5 },
          label: { color: '#ef6f6c', formatter: `${thresholds.criticalLabel} {c}` }
        }
  ].filter((item): item is NonNullable<typeof item> => item != null);
  if (!data.length) return undefined;
  return {
    silent: true,
    symbol: 'none',
    data
  };
}

function mean(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function standardDeviation(values: number[], average: number) {
  if (values.length < 2) return 0;
  const variance = values.reduce((total, value) => total + Math.pow(value - average, 2), 0) / values.length;
  return Math.sqrt(variance);
}

export function buildMetricExpectedRangeConfig(
  series: OtlpMetricSeriesView | null | undefined,
  t: Translator
): OtlpMetricExpectedRangeConfig | null {
  const points = (series?.points || [])
    .map(([timestamp, value]) => [timestamp, value] as [number, number | null])
    .filter(([timestamp, value]) => Number.isFinite(timestamp) && value != null && Number.isFinite(value));
  if (points.length < 3) return null;

  const lowerData: Array<[number, number]> = [];
  const upperGapData: Array<[number, number]> = [];
  points.forEach(([timestamp], index) => {
    const windowStart = Math.max(0, index - 5);
    const values = points.slice(windowStart, index + 1).map(([, value]) => value as number);
    const average = mean(values);
    const deviation = standardDeviation(values, average);
    const minimumBand = Math.max(Math.abs(average) * 0.05, 1);
    const bandWidth = Math.max(deviation * 2, minimumBand);
    const lower = average - bandWidth;
    const upper = average + bandWidth;
    lowerData.push([timestamp, lower]);
    upperGapData.push([timestamp, Math.max(upper - lower, 0)]);
  });

  return {
    label: t('otlp.metrics.expected-range.label'),
    lowerLabel: t('otlp.metrics.expected-range.lower'),
    upperLabel: t('otlp.metrics.expected-range.upper'),
    lowerData,
    upperGapData,
    sampleCount: points.length
  };
}

function buildMetricExpectedRangeSeries(expectedRange: OtlpMetricExpectedRangeConfig | null | undefined) {
  if (!expectedRange) return [];
  const stack = 'otlp-metrics-expected-range';
  return [
    {
      name: expectedRange.lowerLabel,
      type: 'line' as const,
      stack,
      silent: true,
      showSymbol: false,
      symbol: 'none',
      data: expectedRange.lowerData,
      lineStyle: { opacity: 0 },
      itemStyle: { opacity: 0 },
      tooltip: { show: false },
      z: 0
    },
    {
      name: expectedRange.label,
      type: 'line' as const,
      stack,
      silent: true,
      showSymbol: false,
      symbol: 'none',
      data: expectedRange.upperGapData,
      lineStyle: { opacity: 0 },
      itemStyle: { opacity: 0 },
      areaStyle: { color: 'rgba(96, 165, 250, 0.14)' },
      tooltip: { show: false },
      z: 0
    }
  ];
}

function formatMetricLegendName(series: OtlpMetricSeriesView, legendFormat?: string | null) {
  const format = legendFormat?.trim();
  if (!format) return series.name;
  const formatted = format.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, rawKey: string) => {
    const key = String(rawKey).trim();
    return series.labels[key] ?? series.labels[key.replace(/\./g, '_')] ?? '';
  }).trim();
  return formatted || series.name;
}

export function buildMetricsChartOption(
  seriesList: OtlpMetricSeriesView[],
  thresholds?: OtlpMetricThresholdConfig | null,
  expectedRange?: OtlpMetricExpectedRangeConfig | null,
  legendFormat?: string | null
): EChartsOption {
  const hasZoomableSeries = seriesList.some(series => series.points.length > 1);
  const thresholdMarkLine = buildMetricThresholdMarkLine(thresholds);
  const expectedRangeSeries = buildMetricExpectedRangeSeries(expectedRange);
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
    series: [
      ...expectedRangeSeries,
      ...seriesList.slice(0, 6).map((series, index) => ({
        name: formatMetricLegendName(series, legendFormat),
        type: 'line' as const,
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
        markLine: index === 0 ? thresholdMarkLine : undefined,
        z: 2
      })),
    ],
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

function readFiniteThresholdValue(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function buildMetricThresholdConfig(
  warningThreshold: string | undefined,
  criticalThreshold: string | undefined,
  t: Translator
): OtlpMetricThresholdConfig | null {
  const warning = readFiniteThresholdValue(warningThreshold);
  const critical = readFiniteThresholdValue(criticalThreshold);
  if (warning == null && critical == null) return null;
  return {
    warning,
    critical,
    warningLabel: t('otlp.metrics.threshold.warning'),
    criticalLabel: t('otlp.metrics.threshold.critical')
  };
}

export function buildMetricSeriesRows(seriesList: OtlpMetricSeriesView[], t: Translator) {
  return seriesList.map(series => {
    const context = buildMetricSeriesSignalContext(series);
    const entityId = readEntityIdRouteParam(context.entityId);
    return {
      title: series.name,
      copy: context.serviceName || t('otlp.metrics.series.unknown-service'),
      meta: series.latestValue == null ? '-' : String(series.latestValue),
      description: series.description || '-',
      metricType: series.metricType || '-',
      unit: series.unit || '-',
      sampleCount: series.points.length,
      pointCount: series.points.length,
      timeSeriesCount: 1,
      entityLabel: context.entityName || entityId || '-',
      entityMeta: entityId ? t('otlp.metrics.series.entity-id', { entityId }) : t('otlp.metrics.series.entity-missing'),
      entityState: entityId ? 'present' : 'missing'
    };
  });
}

export function buildMetricInventorySourceRows(
  inventory: OtlpMetricsInventory | null | undefined,
  t: Translator
): OtlpMetricInventoryRow[] {
  return (inventory?.items || [])
    .map(item => {
      const metricName = item.metricName?.trim();
      if (!metricName) return null;
      const labels = item.labels || {};
      const context = inventory?.context || {};
      const entityId = readEntityIdRouteParam(firstText(
        labels['hertzbeat.entity_id'],
        labels.hertzbeat_entity_id,
        labels['entity.id'],
        labels.entity_id,
        context.entityId == null ? undefined : String(context.entityId)
      ));
      return {
        title: metricName,
        copy: firstText(labels['service.name'], labels.service_name, labels.serviceName, context.serviceName)
          || t('otlp.metrics.series.unknown-service'),
        meta: '-',
        description: '-',
        metricType: item.family || '-',
        unit: '-',
        pointCount: 0,
        sampleCount: 0,
        timeSeriesCount: item.timeSeriesCount ?? 0,
        latestObservedAt: item.latestObservedAt ?? null,
        entityLabel: firstText(
          labels['hertzbeat.entity_name'],
          labels.hertzbeat_entity_name,
          labels['entity.name'],
          labels.entity_name,
          context.entityName,
          entityId
        ) || '-',
        entityMeta: entityId ? t('otlp.metrics.series.entity-id', { entityId }) : t('otlp.metrics.series.entity-missing'),
        entityState: entityId ? 'present' : 'missing',
        inventorySource: inventory?.source || undefined,
        inventoryLabels: labels,
        series: null
      } satisfies OtlpMetricInventoryRow;
    })
    .filter((row): row is OtlpMetricInventoryRow => row != null);
}

function buildMetricInventorySearchText(row: OtlpMetricInventoryRow) {
  const labelText = row.series
    ? Object.entries(row.series.labels).flatMap(([key, value]) => [key, value])
    : [];
  const inventoryLabelText = row.inventoryLabels
    ? Object.entries(row.inventoryLabels).flatMap(([key, value]) => [key, value])
    : [];
  return [
    row.title,
    row.copy,
    row.meta,
    row.entityLabel,
    row.entityMeta,
    row.description,
    row.metricType,
    row.unit,
    row.inventorySource,
    row.series?.name,
    ...labelText,
    ...inventoryLabelText
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
    .join(' ')
    .toLowerCase();
}

function metricInventoryName(row: OtlpMetricInventoryRow) {
  return row.title || row.series?.name || '';
}

function metricInventoryLatestValue(row: OtlpMetricInventoryRow) {
  const value = row.series?.latestValue ?? row.latestObservedAt ?? Number(row.meta);
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
}

export function buildMetricInventoryRows<T extends OtlpMetricInventoryRow>(
  rows: T[],
  search: string,
  sort: OtlpMetricInventorySort = 'name'
): T[] {
  const normalizedSearch = search.trim().toLowerCase();
  const filteredRows = normalizedSearch
    ? rows.filter(row => buildMetricInventorySearchText(row).includes(normalizedSearch))
    : [...rows];

  const compareByName = (left: T, right: T) =>
    metricInventoryName(left).localeCompare(metricInventoryName(right), undefined, { sensitivity: 'base' });

  return filteredRows.sort((left, right) => {
    if (sort === 'latest') {
      return metricInventoryLatestValue(right) - metricInventoryLatestValue(left) || compareByName(left, right);
    }
    if (sort === 'samples') {
      return (right.pointCount ?? 0) - (left.pointCount ?? 0) || compareByName(left, right);
    }
    if (sort === 'time-series') {
      return (right.timeSeriesCount ?? 0) - (left.timeSeriesCount ?? 0) || compareByName(left, right);
    }
    return compareByName(left, right);
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

export function buildMetricSeriesSampleRows(
  series: OtlpMetricSeriesView | null | undefined,
  formatTime: (value?: number | string | null) => string,
  t: Translator
): OtlpMetricSeriesSampleRow[] {
  if (!series) return [];
  return series.points
    .filter(([timestamp]) => Number.isFinite(timestamp))
    .map(([timestamp, value], index) => {
      const hasValue = value != null && Number.isFinite(value);
      return {
        key: `${series.key}:${timestamp}:${index}`,
        index: String(index + 1),
        timestamp: formatTime(timestamp),
        rawTimestamp: String(timestamp),
        value: hasValue ? String(value) : '-',
        state: hasValue ? t('otlp.metrics.inspector.sample-state.present') : t('otlp.metrics.inspector.sample-state.empty')
      };
    });
}

export function buildMetricSeriesAttributeRows(
  series: OtlpMetricSeriesView | null | undefined,
  search: string
): OtlpMetricSeriesAttributeRow[] {
  if (!series) return [];
  const normalizedSearch = search.trim().toLowerCase();
  return Object.entries(series.labels)
    .map(([name, value]) => ({
      key: name,
      name,
      value: value.trim()
    }))
    .filter(row => row.value)
    .filter(row => !normalizedSearch || `${row.name} ${row.value}`.toLowerCase().includes(normalizedSearch))
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
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
  const operationName = firstText(
    selectedContext.operationName,
    data.context?.operationName ?? undefined,
    query.operationName,
    routeContext.operationName
  );
  const signalContext: SignalRouteContext = {
    ...routeContext,
    ...query,
    entityId: selectedContext.entityId || query.entityId || (data.context?.entityId != null ? String(data.context.entityId) : routeContext.entityId),
    entityType: selectedContext.entityType || query.entityType || (data.context?.entityType != null ? String(data.context.entityType) : routeContext.entityType),
    entityName: selectedContext.entityName || query.entityName || firstText(data.context?.entityName ?? undefined, routeContext.entityName),
    serviceName,
    serviceNamespace,
    environment,
    timeRange: routeContext.timeRange,
    traceId,
    spanId,
    operationName,
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
  const logOperationAttributeFilter = buildMetricsLogsOperationAttributeFilter(
    selectedSeries,
    operationName,
    traceId,
    spanId
  );
  if (logOperationAttributeFilter) logParams.set('attributeFilter', logOperationAttributeFilter);

  const traceParams = new URLSearchParams();
  if (traceId) traceParams.set('traceId', traceId);
  if (spanId) traceParams.set('spanId', spanId);
  if (serviceName) traceParams.set('serviceName', serviceName);
  appendSignalRouteContext(traceParams, signalContext);

  const entityParams = new URLSearchParams();
  if (serviceName) entityParams.set('search', serviceName);
  const signalDraft = buildMetricsAlertRuleDraft(query, signalContext, selectedSeries);

  return {
    intakeHref: intakeParams.toString() ? `/ingestion/otlp?${intakeParams.toString()}` : '/ingestion/otlp',
    logsHref: logParams.toString() ? `/log/manage?${logParams.toString()}` : '/log/manage',
    tracesHref: traceParams.toString() ? `/trace/manage?${traceParams.toString()}` : '/trace/manage',
    entitiesHref: entityParams.toString() ? `/entities?${entityParams.toString()}` : '/entities',
    entityHref: buildSignalEntityHref(signalContext, serviceName),
    alertHandlingHref: buildSignalAlertHandlingHref('metrics', signalContext),
    alertRulesHref: buildSignalAlertRulesHref('metrics', signalContext, signalDraft),
    dashboardHref: buildSignalDashboardHref('metrics', signalContext, signalDraft)
  };
}
