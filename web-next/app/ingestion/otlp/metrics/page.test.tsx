// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../../test/i18n-test-helper';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockState = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  replace: vi.fn(),
  lastLoad: null as null | (() => Promise<unknown>),
  metricSeries: [] as any[],
  renderData: {
    datasource: 'prometheus',
    queryMode: 'builder',
    query: '',
    stats: { totalSeries: 0, nonEmptySeries: 0, latestObservedAt: null },
    context: { serviceName: 'checkout', serviceNamespace: 'payments', start: 1712730000000, end: 1712733600000 },
    results: { msg: 'ok', frames: [] },
    emptyStateReason: 'no_context',
    errorMessage: null
  }
}));

const apiMessageGet = vi.fn();
const loadOtlpMetricsConsole = vi.fn();

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockState.replace
  }),
  useSearchParams: () =>
    ({
      get: (key: string) => mockState.searchParams.get(key)
    }) as { get: (key: string) => string | null }
}));

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock()
  })
}));

vi.mock('@/components/workbench/client-workbench', () => ({
  ClientWorkbench: ({ children, load }: { children: (data: any) => React.ReactNode; load: () => Promise<unknown> }) => {
    mockState.lastLoad = load;
    return <div data-client-workbench="true">{children(mockState.renderData)}</div>;
  }
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, containerClassName: _containerClassName, ...props }: any) => <select {...props}>{children}</select>
}));

vi.mock('@/components/observability/echarts-panel', () => ({
  EChartsPanel: ({ onDataZoomChange, preserveDataZoom }: any) => (
    <button
      type="button"
      data-echarts-panel="otlp-metrics"
      data-echarts-panel-preserve-datazoom={preserveDataZoom ? 'true' : 'false'}
      onClick={() => onDataZoomChange?.({ start: 25, end: 75 })}
    >
      metrics chart
    </button>
  )
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageGet
}));

vi.mock('@/lib/format', () => ({
  formatTime: () => '2026-04-12 20:00:00'
}));

vi.mock('@/lib/otlp-metrics/controller', () => ({
  loadOtlpMetricsConsole,
  queryStateFromParams: (params: { get(key: string): string | null }) => ({
    query: params.get('query') || undefined,
    aggregation: params.get('aggregation') || undefined,
    groupBy: params.get('groupBy') || undefined,
    timeRange: params.get('timeRange') || undefined,
    collector: params.get('collector') || undefined,
    template: params.get('template') || undefined,
    entityId: params.get('entityId') || undefined,
    entityName: params.get('entityName') || undefined,
    returnTo: params.get('returnTo') || undefined,
    traceId: params.get('traceId') || undefined,
    spanId: params.get('spanId') || undefined,
    serviceName: params.get('serviceName') || undefined,
    serviceNamespace: params.get('serviceNamespace') || undefined,
    environment: params.get('environment') || undefined,
    start: params.get('start') || undefined,
    end: params.get('end') || undefined,
    refresh: params.get('refresh') || undefined,
    live: params.get('live') || undefined,
    tz: params.get('tz') || undefined
  })
}));

vi.mock('@/lib/signal-route-context', () => ({
  buildSignalEntityContextRows: () => [
    { label: '当前实体', value: 'checkout', meta: 'entityId 7' },
    { label: '当前服务', value: 'checkout', meta: 'payments' },
    { label: '当前环境', value: 'prod', meta: '环境' },
    { label: '时间范围', value: 'last-1h', meta: '查询窗口' },
    { label: '采集来源', value: 'OTLP', meta: 'HertzBeat OTLP 接入' }
  ],
  readEpochMillisRouteParam: (value: string | null | undefined) => {
    const trimmed = value?.trim();
    return trimmed && /^\d+$/.test(trimmed) ? trimmed : undefined;
  },
  readEntityIdRouteParam: (value: string | null | undefined) => {
    const trimmed = value?.trim();
    return trimmed && /^\d+$/.test(trimmed) ? trimmed : undefined;
  },
  readSignalRouteContext: () => ({
    entityId: mockState.searchParams.get('entityId') || undefined,
    entityName: mockState.searchParams.get('entityName') || undefined,
    returnTo: mockState.searchParams.get('returnTo') || undefined,
    serviceName: mockState.searchParams.get('serviceName') || undefined,
    serviceNamespace: mockState.searchParams.get('serviceNamespace') || undefined,
    environment: mockState.searchParams.get('environment') || undefined,
    timeRange: mockState.searchParams.get('timeRange') || undefined,
    source: mockState.searchParams.get('source') || undefined,
    collector: mockState.searchParams.get('collector') || undefined,
    template: mockState.searchParams.get('template') || undefined,
    traceId: mockState.searchParams.get('traceId') || undefined,
    spanId: mockState.searchParams.get('spanId') || undefined
  })
}));

vi.mock('@/lib/otlp-metrics/view-model', () => ({
  buildMetricsExplorerState: () => ({
    chartLabel: `${mockState.metricSeries.length} 条有数据序列`,
    hasSeries: mockState.metricSeries.length > 0,
    emptyTitle: '暂无指标序列',
    noMetricsTitle: '确认时间范围、实体归因、采集器和监控模板后再查看指标。',
    sendMetricsLabel: '等待 OTLP 指标写入',
    seriesCountLabel: `${mockState.metricSeries.length} 条序列`
  }),
  buildConsoleFacts: () => [
    { label: '指标序列', value: '0' },
    { label: '有数据序列', value: '0' },
    { label: '存储来源', value: 'prometheus' },
    { label: '最近上报', value: '-' }
  ],
  buildConsoleMetrics: () => [
    { label: '有数据序列', value: '0' },
    { label: '序列总数', value: '0' },
    { label: '接入状态', value: '空' }
  ],
  buildContextRows: () => [
    { title: '当前服务', copy: 'checkout', meta: 'payments' },
    { title: '时间范围', copy: '2026-04-12 20:00:00 → 2026-04-12 20:00:00', meta: 'ok' }
  ],
  buildMetricSeriesContextRows: (series: any) => series
    ? [
        { label: '指标名称', value: series.name, meta: '当前选中序列' },
        { label: '关联实体', value: series.labels['hertzbeat.entity_name'] || '-', meta: `entityId ${series.labels['hertzbeat.entity_id'] || '-'}` },
        { label: '当前服务', value: series.labels['service.name'] || series.labels.service_name || '-', meta: series.labels['service.namespace'] || series.labels.service_namespace || '-' },
        { label: '采集模板', value: series.labels['hertzbeat.template'] || '-', meta: `采集器 ${series.labels['hertzbeat.collector'] || '-'}` },
        { label: '当前环境', value: series.labels['deployment.environment.name'] || series.labels.deployment_environment_name || '-', meta: '部署环境' }
      ]
    : [],
  buildMetricSeriesEvidenceRows: (series: any) => series
    ? [
        { label: '采样点', value: String((series.points || []).length), meta: '真实采样点' },
        { label: '最新值', value: String(series.latestValue ?? '-'), meta: '最近采样' },
        { label: '值域', value: '12 - 20', meta: '平均 16' },
        { label: '采样窗口', value: 'T1000 → T2000', meta: '真实采样时间' },
        { label: '关联链路', value: series.labels.trace_id || '-', meta: series.labels.span_id || '-' }
      ]
    : [],
  buildMetricSeriesLinkedRecordRows: (series: any, handoffLinks: any) => series
    ? [
        {
          key: 'logs',
          label: '历史日志',
          value: series.labels.trace_id ? '按链路查看' : '按服务查看',
          meta: series.labels.span_id ? '历史日志会定位到当前 span' : '缺少链路 ID 时按服务筛选',
          href: handoffLinks.logsHref
        },
        {
          key: 'traces',
          label: '链路瀑布图',
          value: series.labels.trace_id ? '可打开' : '等待链路 ID',
          meta: series.labels.span_id ? '打开完整链路并保留当前 span' : '指标没有链路 ID，暂不能定位链路',
          href: handoffLinks.tracesHref
        },
        {
          key: 'alerts',
          label: '告警处理',
          value: series.labels['hertzbeat.entity_id'] ? '带实体处理' : '按服务处理',
          meta: series.labels['hertzbeat.entity_id'] ? '按实体、服务和指标进入告警' : '缺少实体 ID 时按服务进入告警',
          href: handoffLinks.alertHandlingHref
        }
      ]
    : [],
  buildMetricSeriesAttributionDiagnostics: (series: any) => {
    if (!series) return [];
    const row = (key: string, value: string | undefined, meta: string) => ({
      key,
      label: key,
      value: value || '-',
      state: value ? 'present' : 'missing',
      meta
    });
    return [
      row('hertzbeat.entity_id', series.labels['hertzbeat.entity_id'], series.labels['hertzbeat.entity_id'] ? '可打开实体详情' : '缺少实体 ID，实体详情会保持禁用'),
      row('hertzbeat.entity_name', series.labels['hertzbeat.entity_name'], '用于展示实体名称'),
      row('hertzbeat.workspace_id', series.labels['hertzbeat.workspace_id'], '缺少工作区字段时使用当前部署上下文'),
      row('hertzbeat.collector', series.labels['hertzbeat.collector'], '采集器来源'),
      row('hertzbeat.template', series.labels['hertzbeat.template'], '监控模板归属')
    ];
  },
  buildMetricSeriesViews: () => mockState.metricSeries,
  buildMetricsChartOption: () => ({
    series: [],
    dataZoom: [{ type: 'slider', start: 0, end: 100 }]
  }),
  buildMetricsDataZoomTimeContext: (_seriesList: any[], zoomRange: any, fallbackTimeRange?: string) =>
    zoomRange
      ? {
          timeRange: fallbackTimeRange || 'last-30m',
          start: '1500',
          end: '2500'
        }
      : null,
  buildMetricSeriesRows: () => mockState.metricSeries.map(series => ({
    title: series.name,
    copy: series.labels['service.name'] || series.labels.service_name || '-',
    meta: series.latestValue == null ? '-' : String(series.latestValue),
    entityLabel: series.labels['hertzbeat.entity_name'] || series.labels.hertzbeat_entity_name || '-',
    entityMeta: series.labels['hertzbeat.entity_id'] || series.labels.hertzbeat_entity_id ? `entityId ${series.labels['hertzbeat.entity_id'] || series.labels.hertzbeat_entity_id}` : '等待实体归因',
    entityState: series.labels['hertzbeat.entity_id'] || series.labels.hertzbeat_entity_id ? 'present' : 'missing'
  })),
  buildMetricTrendBars: () => [],
  buildMetricsHandoffLinks: (_data: any, _query: any, _routeContext: any, selectedSeries?: any) => {
    const serviceName = selectedSeries?.labels['service.name'] || selectedSeries?.labels.service_name || 'checkout';
    const serviceNamespace = selectedSeries?.labels['service.namespace'] || selectedSeries?.labels.service_namespace || 'payments';
    const environment = selectedSeries?.labels['deployment.environment.name'] || selectedSeries?.labels.deployment_environment_name || 'prod';
    const entityId = selectedSeries ? selectedSeries.labels['hertzbeat.entity_id'] : mockState.searchParams.get('entityId') || '7';
    const entityName = selectedSeries?.labels['hertzbeat.entity_name'] || 'Checkout API';
    const traceId = selectedSeries?.labels.trace_id || mockState.searchParams.get('traceId') || undefined;
    const spanId = selectedSeries?.labels.span_id || mockState.searchParams.get('spanId') || undefined;
    const collector = selectedSeries?.labels['hertzbeat.collector'] || undefined;
    const template = selectedSeries?.labels['hertzbeat.template'] || undefined;
    const params = new URLSearchParams({
      entityName,
      serviceName,
      serviceNamespace,
      environment,
      source: 'otlp'
    });
    if (entityId) params.set('entityId', entityId);
    if (traceId) params.set('traceId', traceId);
    if (spanId) params.set('spanId', spanId);
    if (collector) params.set('collector', collector);
    if (template) params.set('template', template);
    const logParams = new URLSearchParams(params);
    if (traceId) {
      logParams.set('view', 'list');
    } else {
      logParams.set('search', `service.name = "${serviceName}"`);
    }
    const alertParams = new URLSearchParams(params);
    alertParams.set('status', 'firing');
    alertParams.set('signal', 'metrics');
    alertParams.set('search', serviceName);
    return {
      intakeHref: '/ingestion/otlp?signal=metrics&returnTo=%2Fingestion%2Fotlp%2Fmetrics',
      logsHref: `/log/manage?${logParams.toString()}`,
      tracesHref: `/trace/manage?${params.toString()}`,
      entitiesHref: `/entities?search=${encodeURIComponent(serviceName)}`,
      entityHref: entityId ? `/entities/${entityId}?${params.toString()}` : `/entities?search=${encodeURIComponent(serviceName)}&${params.toString()}`,
      alertRulesHref: `/alert/setting?signal=metrics&${params.toString()}`,
      alertHandlingHref: `/alert?${alertParams.toString()}`
    };
  }
}));

beforeEach(() => {
  mockState.searchParams = new URLSearchParams();
  mockState.replace.mockReset();
  mockState.lastLoad = null;
  mockState.metricSeries = [];
  apiMessageGet.mockReset();
  loadOtlpMetricsConsole.mockReset();
  loadOtlpMetricsConsole.mockResolvedValue(mockState.renderData);
});

let interactionRoot: Root | null = null;
let interactionContainer: HTMLDivElement | null = null;

afterEach(() => {
  if (interactionRoot) {
    act(() => {
      interactionRoot?.unmount();
    });
  }
  interactionRoot = null;
  interactionContainer?.remove();
  interactionContainer = null;
});

describe('otlp metrics page', () => {
  it('keeps metrics on the OTLP cold Workbench owner instead of the old external-product explorer stack', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/ingestion/otlp/metrics/page.tsx'), 'utf8');

    expect(source).toContain('data-otlp-metrics-route="otlp-cold-metrics-workbench"');
    expect(source).toContain('data-otlp-metrics-style-baseline="hertzbeat-cold-matte"');
    expect(source).toContain('data-otlp-metrics-query-bar="cold-query-row"');
    expect(source).toContain('data-otlp-metrics-query-input="true"');
    expect(source).toContain('data-otlp-metrics-service-input="true"');
    expect(source).toContain('data-otlp-metrics-namespace-input="true"');
    expect(source).toContain('data-otlp-metrics-environment-input="true"');
    expect(source).toContain('data-otlp-metrics-aggregation-select="true"');
    expect(source).toContain('data-otlp-metrics-group-by-select="true"');
    expect(source).toContain('data-otlp-metrics-header-topbar="time-context"');
    expect(source).toContain('data-otlp-metrics-page-shell="flat-direct-stack"');
    expect(source).toContain('data-otlp-metrics-page-shell-layer="removed"');
    expect(source).toContain('data-otlp-metrics-page-stack="direct-panels"');
    expect(source).not.toContain('data-otlp-metrics-page-shell="full-width-no-gutters"');
    expect(source).not.toContain('data-otlp-metrics-page-shell-gutter="edge-to-edge-viewport"');
    expect(source).not.toContain('data-otlp-metrics-page-shell-top="flush-under-app-bar"');
    expect(source).not.toContain('className="flex w-full max-w-none flex-col gap-3 px-3 py-3"');
    expect(source).not.toContain('w-[calc(100%+2rem)]');
    expect(source).not.toContain('-mx-4');
    expect(source).toContain('className="flex min-h-[calc(100vh-56px)] flex-col gap-3 bg-[#07090b] px-3 pb-3 pt-0 text-[#e8edf5]"');
    expect(source).toContain('pt-0');
    expect(source).toContain('data-otlp-metrics-header-layout="compact-title-with-aligned-toolbar"');
    expect(source).toContain('data-otlp-metrics-title-block="operator-context"');
    expect(source).toContain('data-otlp-metrics-header-context-strip="applied-query-facts"');
    expect(source).toContain('headerContextPills.map');
    expect(source).not.toContain('data-otlp-metrics-header-copy="operator-query-copy"');
    expect(source).not.toContain('查询指标序列，按服务、命名空间、环境或标签分组。');
    expect(source).not.toContain('按当前查询条件展示');
    expect(source).not.toContain('mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-6 py-6');
    expect(source).not.toContain('按 OTLP 上下文、时间范围和指标表达式查看序列，并把采集集群、监控模板和阈值规则接到同一条排障链路里。');
    expect(source).not.toContain('xl:grid-cols-[minmax(0,1fr)_auto]');
    expect(source).toContain('data-otlp-metrics-time-toolbar="top-right-corner"');
    expect(source).toContain('data-otlp-metrics-toolbar-stack="same-width-time-actions"');
    expect(source).not.toContain('className="ml-auto flex min-w-[360px] flex-col items-end gap-2"');
    expect(source).toContain('data-otlp-metrics-time-control-placement="top-right"');
    expect(source).toContain('data-otlp-metrics-time-control-visual="narrow-top-right-rail"');
    expect(source).toContain('data-otlp-metrics-time-control-fit="no-clipping"');
    expect(source).toContain('data-otlp-metrics-header-actions="removed"');
    expect(source).not.toContain("'border-[var(--ops-primary)] px-3'");
    expect(source).not.toContain('data-otlp-metrics-action-row="aligned-context-actions"');
    expect(source).not.toContain('返回 OTLP 接入');
    expect(source).not.toContain('href="/setting/collector"');
    expect(source).not.toContain('href="/setting/define"');
    expect(source).toContain('variant="narrow-rail"');
    expect(source).not.toContain('className="w-full justify-end border-[#2b3039] bg-[#101217]"');
    expect(source).toContain('showAbsoluteFields');
    expect(source.indexOf('data-otlp-metrics-time-control="shared-time-context-control"')).toBeLessThan(
      source.indexOf('data-otlp-metrics-query-bar="cold-query-row"')
    );
    expect(source).toContain("'data-otlp-metrics-time-range-select': 'true'");
    expect(source).toContain('TimeRangeControl');
    expect(source).toContain('EChartsPanel');
    expect(source).toContain('EChartsDataZoomRange');
    expect(source).toContain('data-otlp-metrics-time-control="shared-time-context-control"');
    expect(source).toContain('presetOptionDataAttribute="data-otlp-metrics-time-range-preset"');
    expect(source).toContain("refreshActionProps={{ 'data-otlp-metrics-time-refresh-action': 'true' }}");
    expect(source).toContain('TIME_CONTEXT_PRESETS');
    expect(source).toContain('sanitizeTimeContext');
    expect(source).toContain('resolveTimeContextBounds(timeContext)');
    expect(source).toContain('data-otlp-metrics-chart-band="cold-chart-band"');
    expect(source).toContain('data-otlp-metrics-chart-layout="wide-series-chart-with-compact-meta"');
    expect(source).toContain('data-otlp-metrics-series-mode="entity-series-set"');
    expect(source).toContain('const hasMetricSeries = metricSeries.length > 0');
    expect(source).toContain('{hasMetricSeries ? (');
    expect(source).toContain('data-otlp-metrics-chart-meta-row="compact-real-facts"');
    expect(source).toContain('data-otlp-metrics-chart-meta-fact="true"');
    expect(source).toContain('facts.map');
    expect(source).not.toContain('data-otlp-metrics-facts-grid="inline-summary-strip"');
    expect(source).toContain('data-otlp-metrics-empty-state="honest-no-series"');
    expect(source).toContain('data-otlp-metrics-empty-state-context="applied-query-visible"');
    expect(source).toContain('data-otlp-metrics-chart-panel="series-set-trend"');
    expect(source).not.toContain('data-otlp-metrics-chart-layout="fact-stack-with-wide-trend"');
    expect(source).not.toContain('data-otlp-metrics-facts-grid="compact-summary-stack"');
    expect(source).not.toContain('className="grid items-start gap-3 xl:grid-cols-[320px_minmax(0,1fr)]"');
    expect(source).not.toContain('repeat(4,minmax(0,160px))_minmax(0,1fr)');
    expect(source).toContain('data-otlp-metrics-chart-datazoom-state="local-observation"');
    expect(source).toContain('data-otlp-metrics-chart-datazoom-preserve="preserved"');
    expect(source).toContain('data-otlp-metrics-chart-zoom-apply="local-to-query-time"');
    expect(source).toContain('data-otlp-metrics-chart-zoom-apply-state={');
    expect(source).toContain('metricsChartZoomDraftLabel');
    expect(source).toContain('data-otlp-metrics-chart-zoom-draft="pending-query-time"');
    expect(source).toContain('data-otlp-metrics-chart-zoom-draft-state="pending"');
    expect(source).toContain('formatEpochMillisDraft');
    expect(source).toContain('buildMetricsChartOption(metricSeries)');
    expect(source).toContain('height={300}');
    expect(source).toContain('buildMetricsDataZoomTimeContext(');
    expect(source).toContain('preserveDataZoom');
    expect(source).toContain('handleMetricsChartZoomChange(nextZoom);');
    expect(source).toContain('const nextZoomContext = buildMetricsDataZoomTimeContext(');
    expect(source).toContain('buildMetricTrendBars');
    expect(source).toContain('data-otlp-metrics-trend-bar={');
    expect(source).toContain("'real-series-point'");
    expect(source).toContain('data-otlp-metrics-trend-empty="no-real-series"');
    expect(source).not.toContain('empty-series-placeholder');
    expect(source).not.toContain('Array.from({ length: 10 }');
    expect(source).toContain('const [selectedSeriesKey, setSelectedSeriesKey]');
    expect(source).toContain('selectedMetricSeries');
    expect(source).toContain('buildMetricsHandoffLinks(mergedData, query, routeContext, selectedMetricSeries)');
    expect(source).toContain('data-otlp-metrics-series-row="selectable-series"');
    expect(source).toContain('data-otlp-metrics-series-row-selected={isSelectedSeries ?');
    expect(source).toContain('data-otlp-metrics-series-entity="true"');
    expect(source).toContain('setSelectedSeriesKey(series.key)');
    expect(source).toContain('buildMetricSeriesContextRows(selectedMetricSeries, t)');
    expect(source).toContain('buildMetricSeriesEvidenceRows(selectedMetricSeries, formatTime)');
    expect(source).toContain('buildMetricSeriesLinkedRecordRows(selectedMetricSeries, handoffLinks)');
    expect(source).toContain('buildMetricSeriesAttributionDiagnostics(selectedMetricSeries, t)');
    expect(source).toContain('data-otlp-metrics-selected-series-context="selected-series-attribution"');
    expect(source).toContain('data-otlp-metrics-selected-series-evidence="real-sample-evidence"');
    expect(source).toContain('data-otlp-metrics-linked-record-summary="log-trace-alert-links"');
    expect(source).toContain('data-otlp-metrics-linked-record-action={row.key}');
    expect(source).toContain('data-otlp-metrics-attribution-diagnostics="hertzbeat-attribute-diagnostics"');
    expect(source).toContain('data-otlp-metrics-attribution-diagnostic-state={row.state}');
    expect(source).toContain('当前选中序列');
    expect(source).toContain('指标证据');
    expect(source).toContain('关联记录');
    expect(source).toContain('历史日志');
    expect(source).toContain('链路瀑布图');
    expect(source).toContain('采样窗口');
    expect(source).toContain('归因诊断');
    expect(source).toContain('hertzbeat.entity_id');
    expect(source).toContain('采集模板');
    expect(source).toContain('data-otlp-metrics-workbench-grid="series-detail-split"');
    expect(source).toContain("'grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]'");
    expect(source).not.toContain('xl:grid-cols-[minmax(0,1fr)_360px]');
    expect(source).not.toContain('2xl:grid-cols-[minmax(0,1fr)_330px]');
    expect(source).toContain('data-otlp-metrics-series-table="cold-dense-metric-list"');
    expect(source).toContain('data-otlp-metrics-series-table-mode="service-entity-series-set"');
    expect(source).toContain('data-otlp-metrics-series-table-density="primary-scan"');
    expect(source).toContain('data-otlp-metrics-series-set-summary="service-entity-scope"');
    expect(source).toContain('seriesSetScopeRows.map');
    expect(source).toContain('序列集合');
    expect(source).not.toContain('最近序列');
    expect(source).toContain('data-otlp-metrics-detail-panel="cold-detail-panel"');
    expect(source).toContain('data-otlp-metrics-detail-panel-priority="secondary-inspector"');
    expect(source).toContain('data-otlp-metrics-detail-panel-body="compact-evidence-stack"');
    expect(source).toContain('{hasMetricSeries && selectedMetricSeries ? (');
    expect(source).toContain('data-otlp-metrics-detail-panel-empty="suppressed-until-real-series"');
    expect(source).toContain('data-otlp-metrics-secondary-context="collapsible-evidence-diagnostics"');
    expect(source).toContain('data-otlp-metrics-linked-record-summary-panel="collapsible"');
    expect(source).toContain('data-otlp-metrics-attribution-diagnostics-panel="collapsible"');
    expect(source).toContain('data-otlp-metrics-entity-context-panel="collapsible"');
    expect(source).toContain('<details');
    expect(source).toContain('data-otlp-metrics-handoff-actions="compact-context-actions"');
    expect(source).toContain('data-otlp-metrics-entity-context="hertzbeat-signal-entity-context"');
    expect(source).toContain('aria-label="实体上下文 当前实体 监控实例 当前服务 链路上下文 当前环境 时间范围 采集来源"');
    expect(source).not.toContain('data-otlp-metrics-hertzbeat-loop="collector-template-alert-loop"');
    expect(source).toContain('指标工作台');
    expect(source).toContain('运行查询');
    expect(source).not.toContain('data-otlp-metrics-action-row="aligned-context-actions"');
    expect(source).not.toContain('返回 OTLP 接入');
    expect(source).not.toContain('href="/setting/collector"');
    expect(source).not.toContain('href="/setting/define"');
    expect(source).not.toContain('接入质量');
    expect(source).not.toContain('HertzBeat 采集闭环');
    expect(source).not.toContain('>采集闭环<');
    expect(source).not.toContain('从接入健康、采集节点、模板归属到告警处理，保留 HertzBeat 自己的运维闭环。');
    expect(source).toContain('实体上下文');
    expect(source).toContain('采集来源');
    expect(source).toContain('实体详情');
    expect(source).toContain('告警处理');
    expect(source).toContain('href={handoffLinks.alertHandlingHref}');
    expect(source).not.toContain('data-otlp-metrics-alert-context-hint="entity-trace-alert-handoff"');
    expect(source).not.toContain('按当前实体、服务和已带入的链路上下文查看相关告警');
    expect(source).not.toContain('data-otlp-metrics-signal-handoff-hint="metric-log-trace-context"');
    expect(source).not.toContain('当前指标序列的实体、服务和链路标签会带入日志与链路工作台');
    expect(source).toContain('data-otlp-metrics-entity-action="true"');
    expect(source).toContain('data-otlp-metrics-alert-handling-action="true"');
    expect(source).toContain('data-otlp-metrics-logs-action="true"');
    expect(source).toContain('data-otlp-metrics-traces-action="true"');
    expect(source).toContain("const missingEntityHandoffTitle = t('otlp.metrics.handoff.entity-disabled')");
    expect(source).toContain('data-otlp-metrics-entity-action-disabled="missing-entity-id"');
    expect(source).toContain('title={missingEntityHandoffTitle}');
    expect(source).toContain('buildOtlpMetricsRoute');
    expect(source).not.toContain('告警规则');
    expect(source).not.toContain('returnLabel=');
    expect(source).not.toContain('signoz-metrics-explorer');
    expect(source).not.toContain('signoz-query-builder');
    expect(source).not.toContain('signoz-metrics-empty');
    expect(source).not.toContain('signoz-bottom-actions');
    expect(source).not.toContain('Search for a metric...');
    expect(source).not.toContain('Select a metric and run a query to see the results');
    expect(source).not.toContain('Save this view');
    expect(source).not.toContain('Create an Alert');
    expect(source).not.toContain('Add to Dashboard');
    expect(source).not.toContain('ThreeSignalDeskShell');
    expect(source).not.toContain('FactsStrip');
    expect(source).not.toContain('StageSection');
    expect(source).not.toContain('SummaryMetricGrid');
    expect(source).not.toContain('DrawerSection');
    expect(source).not.toContain('function barHeight');
    expect(source).not.toContain('metricSeries.length ? barHeight(index, metricSeries.length)');
    expect(source).not.toContain('const metricsTimeRangeOptions =');
  });

  it('keeps route-level actions on the cold-matte palette instead of bright blue demo buttons', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/ingestion/otlp/metrics/page.tsx'), 'utf8');

    expect(source).toContain('data-otlp-metrics-run-query-action="true"');
    expect(source).not.toContain('border-[#4f6df0]');
    expect(source).not.toContain('bg-[#4566e8]');
    expect(source).not.toContain('hover:bg-[#5574f4]');
  });

  it('does not directly coerce query route primitives with Number in page context', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/ingestion/otlp/metrics/page.tsx'), 'utf8');

    expect(source).not.toContain('Number(query.start)');
    expect(source).not.toContain('Number(query.end)');
    expect(source).not.toContain('Number(query.entityId)');
    expect(source).toContain('readEpochMillisRouteParam');
  });

  it('renders the cold metrics query row, chart band, dense list, and detail panel', async () => {
    const { default: OtlpMetricsPage } = await import('./page');
    const html = renderToStaticMarkup(<OtlpMetricsPage />);

    expect(html).toContain('data-otlp-metrics-route="otlp-cold-metrics-workbench"');
    expect(html).toContain('data-otlp-metrics-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-otlp-metrics-page-shell="flat-direct-stack"');
    expect(html).toContain('data-otlp-metrics-page-shell-layer="removed"');
    expect(html).toContain('data-otlp-metrics-page-stack="direct-panels"');
    expect(html).not.toContain('data-otlp-metrics-page-shell="full-width-no-gutters"');
    expect(html).not.toContain('data-otlp-metrics-page-shell-gutter="edge-to-edge-viewport"');
    expect(html).not.toContain('data-otlp-metrics-page-shell-top="flush-under-app-bar"');
    expect(html).toContain('data-otlp-metrics-query-bar="cold-query-row"');
    expect(html).toContain('data-otlp-metrics-time-control="shared-time-context-control"');
    expect(html).toContain('data-otlp-metrics-time-control-placement="top-right"');
    expect(html).toContain('data-otlp-metrics-time-control-visual="narrow-top-right-rail"');
    expect(html).toContain('data-otlp-metrics-time-control-fit="no-clipping"');
    expect(html).toContain('data-otlp-metrics-header-topbar="time-context"');
    expect(html).toContain('data-otlp-metrics-header-layout="compact-title-with-aligned-toolbar"');
    expect(html).toContain('data-otlp-metrics-title-block="operator-context"');
    expect(html).toContain('data-otlp-metrics-header-context-strip="applied-query-facts"');
    expect(html).not.toContain('data-otlp-metrics-header-copy="operator-query-copy"');
    expect(html).toContain('data-otlp-metrics-toolbar-stack="same-width-time-actions"');
    expect(html).toContain('data-time-range-control="hertzbeat-shared"');
    expect(html).toContain('data-time-range-control-visual="grafana-like-narrow-rail"');
    expect(html).toContain('data-time-range-control-layout="nowrap-top-right-rail"');
    expect(html).toContain('data-time-range-control-wrap="nowrap"');
    expect(html).toContain('data-time-range-control-card="false"');
    expect(html).toContain('data-time-range-control-density="narrow"');
    expect(html).toContain('data-time-range-control-overflow="fit-without-scroll"');
    expect(html).toContain('data-time-range-control-absolute-display="local-seconds"');
    expect(html).toContain('data-time-range-control-default-fields="expanded"');
    expect(html).toContain('data-time-range-control-manual-entry="visible"');
    expect(html).toContain('data-time-range-control-absolute-draft="ready"');
    expect(html).toContain('data-time-range-absolute-inputs="manual-entry"');
    expect(html).toContain('data-time-range-absolute-input-format="local-datetime"');
    expect(html).not.toContain('data-time-range-relative-input="true"');
    expect(html).toContain('data-time-range-start-input="true"');
    expect(html).toContain('data-time-range-end-input="true"');
    expect(html).toContain('data-time-range-refresh-select="true"');
    expect(html).toContain('data-time-range-live-toggle=');
    expect(html).toContain('data-time-range-apply-action="true"');
    expect(html).toContain('data-time-range-apply-visual="neutral-query-action"');
    const applyButton = html.match(/<button[^>]*data-time-range-apply-action="true"[^>]*>/)?.[0] ?? '';
    expect(applyButton).toContain('border-[var(--ops-border-strong)]');
    expect(applyButton).toContain('bg-[var(--ops-surface-panel)]');
    expect(applyButton).not.toContain('border-[var(--ops-primary)]');
    expect(html).toContain('data-otlp-metrics-chart-band="cold-chart-band"');
    expect(html).toContain('data-otlp-metrics-chart-layout="wide-series-chart-with-compact-meta"');
    expect(html).toContain('data-otlp-metrics-series-mode="entity-series-set"');
    expect(html).not.toContain('data-otlp-metrics-chart-meta-row="compact-real-facts"');
    expect(html).not.toContain('data-otlp-metrics-facts-grid="inline-summary-strip"');
    expect(html).toContain('data-otlp-metrics-chart-panel="series-set-trend"');
    expect(html).toContain('data-otlp-metrics-chart-datazoom-state="local-observation"');
    expect(html).toContain('data-otlp-metrics-chart-datazoom-preserve="preserved"');
    expect(html).toContain('data-otlp-metrics-trend-empty="no-real-series"');
    expect(html).toContain('暂无指标趋势');
    expect(html).toContain('运行查询后展示真实采样点。');
    expect(html).toContain('data-otlp-metrics-empty-guidance="operator-no-data-guidance"');
    expect(html).toContain('data-otlp-metrics-empty-state="honest-no-series"');
    expect(html).toContain('data-otlp-metrics-empty-state-context="applied-query-visible"');
    expect(html).toContain('确认时间范围、实体归因、采集器和监控模板后再查看指标。');
    expect(html).not.toContain('data-otlp-metrics-trend-bar="empty-series-placeholder"');
    expect(html).toContain('data-otlp-metrics-workbench-grid="series-detail-split"');
    expect(html).toContain('data-otlp-metrics-series-table="cold-dense-metric-list"');
    expect(html).toContain('data-otlp-metrics-series-table-mode="service-entity-series-set"');
    expect(html).toContain('data-otlp-metrics-series-table-density="primary-scan"');
    expect(html).toContain('data-otlp-metrics-series-set-summary="service-entity-scope"');
    expect(html).not.toContain('data-otlp-metrics-detail-panel="cold-detail-panel"');
    expect(html).toContain('data-otlp-metrics-detail-panel-empty="suppressed-until-real-series"');
    expect(html).not.toContain('data-otlp-metrics-detail-panel-body="compact-evidence-stack"');
    expect(html).not.toContain('data-otlp-metrics-secondary-context="collapsible-evidence-diagnostics"');
    expect(html).not.toContain('data-otlp-metrics-entity-context-panel="collapsible"');
    expect(html).not.toContain('data-otlp-metrics-handoff-actions="compact-context-actions"');
    expect(html).not.toContain('data-otlp-metrics-entity-context="hertzbeat-signal-entity-context"');
    expect(html).not.toContain('data-otlp-metrics-hertzbeat-loop="collector-template-alert-loop"');
    expect(html).toContain('指标工作台');
    expect(html).not.toContain('查询指标序列，按服务、命名空间、环境或标签分组。');
    expect(html).not.toContain('按当前查询条件展示');
    expect(html).toContain('服务');
    expect(html).toContain('checkout');
    expect(html).toContain('命名空间');
    expect(html).toContain('payments');
    expect(html).not.toContain('按 OTLP 上下文、时间范围和指标表达式查看序列，并把采集集群、监控模板和阈值规则接到同一条排障链路里。');
    expect(html).toContain('指标查询');
    expect(html).toContain('分组');
    expect(html).toContain('聚合方式');
    expect(html).toContain('趋势带');
    expect(html).toContain('序列集合');
    expect(html).toContain('服务范围');
    expect(html).toContain('命名空间');
    expect(html).toContain('序列');
    expect(html).not.toContain('最近序列');
    expect(html).not.toContain('详情面板');
    expect(html).toContain('时间范围');
    expect(html).toContain('运行查询');
    expect(html).toContain('data-otlp-metrics-header-actions="removed"');
    expect(html).not.toContain('data-otlp-metrics-action-row="aligned-context-actions"');
    expect(html).not.toContain('返回 OTLP 接入');
    expect(html).not.toContain('采集集群');
    expect(html).not.toContain('阈值规则');
    expect(html).not.toContain('HertzBeat 采集闭环');
    expect(html).not.toContain('采集闭环');
    expect(html).not.toContain('接入质量');
    expect(html).not.toContain('从接入健康、采集节点、模板归属到告警处理，保留 HertzBeat 自己的运维闭环。');
    expect(html).not.toContain('实体上下文');
    expect(html).not.toContain('当前实体');
    expect(html).not.toContain('采集来源');
    expect(html).not.toContain('实体详情');
    expect(html).not.toContain('告警处理');
    expect(html).not.toContain('status=firing');
    expect(html).not.toContain('告警规则');
    expect(html).not.toContain('Summary');
    expect(html).not.toContain('Explorer');
    expect(html).not.toContain('Views');
    expect(html).not.toContain('Run Query');
    expect(html).not.toContain('Save this view');
    expect(html).not.toContain('Create an Alert');
    expect(html).not.toContain('Add to Dashboard');
    expect(html).not.toContain('Sending metrics to SigNoZ');
    expect(html).not.toContain('保存视图');
    expect(html).not.toContain('>数据源<');
    expect(html).not.toContain('>查询模式<');
    expect(html).not.toContain('>查询状态<');
    expect(html).not.toContain('>service.name<');
    expect(html).not.toContain('>时间窗口<');
    expect(html).not.toContain('1 个查询');
  });

  it('does not show fake zero metric cards or a selected-series inspector when no real series exists', async () => {
    mockState.metricSeries = [];

    const { default: OtlpMetricsPage } = await import('./page');
    const html = renderToStaticMarkup(<OtlpMetricsPage />);

    expect(html).toContain('data-otlp-metrics-empty-state="honest-no-series"');
    expect(html).toContain('data-otlp-metrics-empty-state-context="applied-query-visible"');
    expect(html).toContain('data-otlp-metrics-detail-panel-empty="suppressed-until-real-series"');
    expect(html).not.toContain('data-otlp-metrics-facts-grid="inline-summary-strip"');
    expect(html).not.toContain('data-otlp-metrics-detail-panel="cold-detail-panel"');
    expect(html).not.toContain('data-otlp-metrics-detail-panel-body="compact-evidence-stack"');
    expect(html).not.toContain('data-otlp-metrics-handoff-actions="compact-context-actions"');
    expect(html).not.toContain('data-otlp-metrics-entity-action-disabled="missing-entity-id"');
    expect(html).not.toContain('接入状态</p><p');
    expect(html).not.toContain('就绪');
    expect(html).not.toContain('空</p>');
  });

  it('renders OTLP metrics chart zoom as local observation with an explicit disabled apply action until zoomed', async () => {
    mockState.metricSeries = [
      {
        key: 'http_requests_total-0',
        name: 'http_requests_total',
        labels: { service_name: 'checkout' },
        points: [
          [1000, 12],
          [2000, 14],
          [3000, 16]
        ],
        latestValue: 16
      }
    ];

    const { default: OtlpMetricsPage } = await import('./page');
    const html = renderToStaticMarkup(<OtlpMetricsPage />);

    expect(html).toContain('data-echarts-panel="otlp-metrics"');
    expect(html).toContain('data-echarts-panel-preserve-datazoom="true"');
    expect(html).toContain('data-otlp-metrics-chart-datazoom-state="local-observation"');
    expect(html).toContain('data-otlp-metrics-chart-datazoom-preserve="preserved"');
    expect(html).toContain('data-otlp-metrics-chart-zoom-apply="local-to-query-time"');
    expect(html).toContain('data-otlp-metrics-chart-zoom-apply-state="idle"');
    expect(html).not.toContain('data-otlp-metrics-chart-zoom-draft="pending-query-time"');
    expect(html).toContain('data-otlp-metrics-chart-meta-row="compact-real-facts"');
    expect(html).toContain('data-otlp-metrics-chart-meta-fact="true"');
    expect(html).not.toContain('data-otlp-metrics-facts-grid="inline-summary-strip"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('Apply as query time');
  });

  it('applies OTLP metric chart zoom to the route only after the explicit apply action', async () => {
    mockState.searchParams = new URLSearchParams('query=http_requests_total&timeRange=last-1h&refresh=30&live=false&tz=Asia%2FShanghai');
    mockState.metricSeries = [
      {
        key: 'http_requests_total-0',
        name: 'http_requests_total',
        labels: { service_name: 'checkout' },
        points: [
          [1000, 12],
          [2000, 14],
          [3000, 16]
        ],
        latestValue: 16
      }
    ];

    const { default: OtlpMetricsPage } = await import('./page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<OtlpMetricsPage />);
      await Promise.resolve();
    });

    let applyAction = interactionContainer.querySelector('[data-otlp-metrics-chart-zoom-apply="local-to-query-time"]') as HTMLButtonElement | null;
    const chart = interactionContainer.querySelector('[data-echarts-panel="otlp-metrics"]') as HTMLButtonElement | null;
    expect(applyAction).not.toBeNull();
    expect(applyAction?.disabled).toBe(true);
    expect(chart).not.toBeNull();

    await act(async () => {
      chart?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    applyAction = interactionContainer.querySelector('[data-otlp-metrics-chart-zoom-apply="local-to-query-time"]') as HTMLButtonElement | null;
    const startInput = interactionContainer.querySelector('[data-time-range-start-input="true"]') as HTMLInputElement | null;
    const endInput = interactionContainer.querySelector('[data-time-range-end-input="true"]') as HTMLInputElement | null;
    expect(applyAction?.disabled).toBe(false);
    expect(applyAction?.getAttribute('data-otlp-metrics-chart-zoom-apply-state')).toBe('ready');
    const zoomDraft = interactionContainer.querySelector('[data-otlp-metrics-chart-zoom-draft="pending-query-time"]') as HTMLElement | null;
    expect(zoomDraft).not.toBeNull();
    expect(zoomDraft?.getAttribute('data-otlp-metrics-chart-zoom-draft-state')).toBe('pending');
    expect(zoomDraft?.textContent).toContain('1970-01-01 08:00:01.500');
    expect(zoomDraft?.textContent).toContain('1970-01-01 08:00:02.500');
    expect(startInput?.getAttribute('data-time-range-absolute-input-format')).toBe('local-datetime');
    expect(endInput?.getAttribute('data-time-range-absolute-input-format')).toBe('local-datetime');
    expect(startInput?.value).toBe('1970-01-01 08:00:01');
    expect(endInput?.value).toBe('1970-01-01 08:00:02');
    expect(mockState.replace).not.toHaveBeenCalled();

    await act(async () => {
      applyAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(mockState.replace).toHaveBeenCalledTimes(1);
    const href = String(mockState.replace.mock.calls[0]?.[0]);
    expect(href).toContain('/ingestion/otlp/metrics?');
    expect(href).toContain('query=http_requests_total');
    expect(href).toContain('timeRange=last-1h');
    expect(href).toContain('start=1500');
    expect(href).toContain('end=2500');
    expect(href).toContain('refresh=30');
    expect(href).toContain('live=false');
    expect(href).toContain('tz=Asia%2FShanghai');
  });

  it('keeps the metrics top-right toolbar on the shared time control contract', async () => {
    mockState.searchParams = new URLSearchParams('timeRange=last-6h&refresh=30&live=true&tz=Asia%2FShanghai');
    const source = readFileSync(resolve(process.cwd(), 'app/ingestion/otlp/metrics/page.tsx'), 'utf8');

    const { default: OtlpMetricsPage } = await import('./page');
    const html = renderToStaticMarkup(<OtlpMetricsPage />);

    expect(source).toContain('data-otlp-metrics-time-control-placement="top-right"');
    expect(source).toContain('data-otlp-metrics-time-toolbar="top-right-corner"');
    expect(source).toContain('data-otlp-metrics-header-topbar="time-context"');
    expect(source).toContain('data-otlp-metrics-toolbar-stack="same-width-time-actions"');
    expect(source).toContain('data-otlp-metrics-time-control-visual="narrow-top-right-rail"');
    expect(source).toContain('data-otlp-metrics-time-control-fit="no-clipping"');
    expect(source).toContain('variant="narrow-rail"');
    expect(source).toContain('data-otlp-metrics-title-block="operator-context"');
    expect(source).not.toContain('xl:grid-cols-[minmax(0,1fr)_auto]');
    expect(source).not.toContain('data-otlp-metrics-time-control-layout="compact-rail"');
    expect(source).not.toContain('data-otlp-metrics-time-control="shared-time-context-control" className="min-w-[520px] flex-1"');
    expect(source.indexOf('data-otlp-metrics-time-control="shared-time-context-control"')).toBeLessThan(
      source.indexOf('data-otlp-metrics-query-bar="cold-query-row"')
    );
    expect(html).toContain('data-otlp-metrics-time-control="shared-time-context-control"');
    expect(html).toContain('data-otlp-metrics-time-control-placement="top-right"');
    expect(html).toContain('data-otlp-metrics-time-toolbar="top-right-corner"');
    expect(html).toContain('data-otlp-metrics-toolbar-stack="same-width-time-actions"');
    expect(html).toContain('data-otlp-metrics-time-control-visual="narrow-top-right-rail"');
    expect(html).toContain('data-otlp-metrics-time-control-fit="no-clipping"');
    expect(html).toContain('data-time-range-control="hertzbeat-shared"');
    expect(html).toContain('data-time-range-control-layout="nowrap-top-right-rail"');
    expect(html).toContain('data-time-range-control-visual="grafana-like-narrow-rail"');
    expect(html).toContain('data-time-range-control-overflow="fit-without-scroll"');
    expect(html).toContain('data-time-range-control-absolute-display="local-seconds"');
    expect(html).toContain('data-time-range-control-wrap="nowrap"');
    expect(html).toContain('data-time-range-control-card="false"');
    expect(html).toContain('data-otlp-metrics-time-range-select="true"');
    expect(html).toContain('data-otlp-metrics-time-range-preset="last-6h"');
    expect(html).not.toContain('data-time-range-relative-input="true"');
    expect(html).toContain('data-time-range-control-manual-entry="visible"');
    expect(html).toContain('data-time-range-start-input="true"');
    expect(html).toContain('data-time-range-end-input="true"');
    expect(html).toContain('data-time-range-refresh-select="true"');
    expect(html).toContain('data-time-range-timezone-select="true"');
    expect(html).toContain('data-time-range-live-toggle="live"');
    expect(html).toContain('data-time-range-apply-action="true"');
    expect(html).toContain('data-time-range-reset-action="true"');
    expect(html).toContain('data-otlp-metrics-time-refresh-action="true"');
  });

  it('applies metric, service, aggregation, grouping, and time range into the workbench route', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1712733600000);
    mockState.searchParams = new URLSearchParams('entityId=7&entityName=Checkout%20API&source=otlp&collector=collector-a&template=spring-boot');

    const { default: OtlpMetricsPage } = await import('./page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<OtlpMetricsPage />);
      await Promise.resolve();
    });

    const queryInput = interactionContainer.querySelector('[data-otlp-metrics-query-input="true"]') as HTMLInputElement | null;
    const serviceInput = interactionContainer.querySelector('[data-otlp-metrics-service-input="true"]') as HTMLInputElement | null;
    const namespaceInput = interactionContainer.querySelector('[data-otlp-metrics-namespace-input="true"]') as HTMLInputElement | null;
    const environmentInput = interactionContainer.querySelector('[data-otlp-metrics-environment-input="true"]') as HTMLInputElement | null;
    const aggregationSelect = interactionContainer.querySelector('[data-otlp-metrics-aggregation-select="true"]') as HTMLSelectElement | null;
    const groupBySelect = interactionContainer.querySelector('[data-otlp-metrics-group-by-select="true"]') as HTMLSelectElement | null;
    const timeRangeSelect = interactionContainer.querySelector('[data-otlp-metrics-time-range-select="true"]') as HTMLSelectElement | null;
    const timeApplyAction = interactionContainer.querySelector('[data-time-range-apply-action="true"]') as HTMLButtonElement | null;
    const runAction = interactionContainer.querySelector('[data-otlp-metrics-run-query-action="true"]') as HTMLButtonElement | null;

    expect(queryInput).not.toBeNull();
    expect(serviceInput).not.toBeNull();
    expect(aggregationSelect).not.toBeNull();
    expect(groupBySelect).not.toBeNull();
    expect(timeRangeSelect).not.toBeNull();
    expect(timeApplyAction).not.toBeNull();

    await act(async () => {
      queryInput!.value = 'http_server_duration_milliseconds_count';
      queryInput!.dispatchEvent(new Event('input', { bubbles: true }));
      serviceInput!.value = 'checkout';
      serviceInput!.dispatchEvent(new Event('input', { bubbles: true }));
      namespaceInput!.value = 'payments';
      namespaceInput!.dispatchEvent(new Event('input', { bubbles: true }));
      environmentInput!.value = 'prod';
      environmentInput!.dispatchEvent(new Event('input', { bubbles: true }));
      aggregationSelect!.value = 'sum';
      aggregationSelect!.dispatchEvent(new Event('change', { bubbles: true }));
      groupBySelect!.value = 'service_name';
      groupBySelect!.dispatchEvent(new Event('change', { bubbles: true }));
      timeRangeSelect!.value = 'last-1h';
      timeRangeSelect!.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });

    await act(async () => {
      timeApplyAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    await act(async () => {
      runAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(mockState.replace).toHaveBeenCalledTimes(2);
    const href = String(mockState.replace.mock.calls.at(-1)?.[0]);
    expect(href).toContain('/ingestion/otlp/metrics?');
    expect(href).toContain('query=http_server_duration_milliseconds_count');
    expect(href).toContain('aggregation=sum');
    expect(href).toContain('groupBy=service_name');
    expect(href).toContain('serviceName=checkout');
    expect(href).toContain('serviceNamespace=payments');
    expect(href).toContain('environment=prod');
    expect(href).toContain('timeRange=last-1h');
    expect(href).toContain('start=1712730000000');
    expect(href).toContain('end=1712733600000');
    expect(href).toContain('entityId=7');
    expect(href).toContain('collector=collector-a');
    expect(href).toContain('template=spring-boot');
    expect(href).not.toContain('returnLabel=');
    nowSpy.mockRestore();
  });

  it('applies a custom relative metrics window through the shared control', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1712733600000);
    mockState.searchParams = new URLSearchParams('query=http.server.duration&serviceName=checkout&timeRange=last-13h&refresh=30&live=false&tz=Asia%2FShanghai');

    const { default: OtlpMetricsPage } = await import('./page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<OtlpMetricsPage />);
      await Promise.resolve();
    });

    const relativeInput = interactionContainer.querySelector('[data-time-range-relative-input="true"]') as HTMLInputElement | null;
    const applyAction = interactionContainer.querySelector('[data-time-range-apply-action="true"]') as HTMLButtonElement | null;

    expect(relativeInput).not.toBeNull();
    expect(applyAction).not.toBeNull();

    await act(async () => {
      relativeInput!.value = '45m';
      relativeInput!.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    await act(async () => {
      applyAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(mockState.replace).toHaveBeenCalledTimes(1);
    const href = String(mockState.replace.mock.calls[0]?.[0]);
    expect(href).toContain('query=http.server.duration');
    expect(href).toContain('serviceName=checkout');
    expect(href).toContain('timeRange=last-45m');
    expect(href).toContain('start=1712730900000');
    expect(href).toContain('end=1712733600000');
    expect(href).toContain('refresh=30');
    expect(href).toContain('live=false');
    expect(href).toContain('tz=Asia%2FShanghai');
    nowSpy.mockRestore();
  });

  it('loads the existing metrics console API with the current query state', async () => {
    mockState.searchParams = new URLSearchParams('traceId=trace-123&spanId=span-456&serviceName=checkout');
    const { default: OtlpMetricsPage } = await import('./page');
    renderToStaticMarkup(<OtlpMetricsPage />);
    await mockState.lastLoad?.();

    expect(loadOtlpMetricsConsole).toHaveBeenCalledWith(apiMessageGet, {
      entityId: undefined,
      entityName: undefined,
      returnTo: undefined,
      traceId: 'trace-123',
      spanId: 'span-456',
      serviceName: 'checkout',
      serviceNamespace: undefined,
      environment: undefined,
      start: undefined,
      end: undefined
    });
  });

  it('keeps the context handoff links when opened from traced entity context', async () => {
    mockState.searchParams = new URLSearchParams(
      'entityId=7&entityName=checkout&returnTo=%2Foverview&returnLabel=Overview&traceId=trace-123&spanId=span-456&serviceName=checkout&serviceNamespace=payments&environment=prod&start=1712730000000&end=1712733600000'
    );
    mockState.metricSeries = [
      {
        key: 'checkout-requests-0',
        name: 'checkout.requests',
        labels: {
          'service.name': 'checkout',
          'service.namespace': 'payments',
          'deployment.environment.name': 'prod',
          'hertzbeat.entity_id': '7',
          'hertzbeat.entity_name': 'checkout',
          'hertzbeat.collector': 'collector-a',
          'hertzbeat.template': 'spring-boot',
          trace_id: 'trace-123',
          span_id: 'span-456'
        },
        points: [[1712730000000, 12]],
        latestValue: 12
      }
    ];

    const { default: OtlpMetricsPage } = await import('./page');
    const html = renderToStaticMarkup(<OtlpMetricsPage />);

    expect(html).not.toContain('/ingestion/otlp?signal=metrics');
    expect(html).toContain('/log/manage?');
    expect(html).toContain('/trace/manage?');
    expect(html).toContain('serviceName=checkout');
    expect(html).toContain('view=list');
    expect(html).not.toContain('search=service.name+%3D+%22checkout%22');
    expect(html).toContain('/entities/7?');
    expect(html).toContain('entityId=7');
    expect(html).not.toContain('/alert/setting?signal=metrics');
    expect(html).toContain('/alert?');
    expect(html).toContain('status=firing');
    expect(html).toContain('signal=metrics');
  });

  it('updates selected series attribution and handoff links when an operator selects another metric series', async () => {
    mockState.metricSeries = [
      {
        key: 'http_server_duration-0',
        name: 'http.server.duration',
        labels: {
          'service.name': 'checkout',
          'service.namespace': 'payments',
          'deployment.environment.name': 'prod',
          'hertzbeat.entity_id': '7',
          'hertzbeat.entity_name': 'Checkout API',
          'hertzbeat.collector': 'collector-a',
          'hertzbeat.template': 'spring-boot',
          trace_id: 'trace-checkout',
          span_id: 'span-checkout'
        },
        points: [[1000, 12]],
        latestValue: 12
      },
      {
        key: 'db_client_duration-1',
        name: 'db.client.duration',
        labels: {
          'service.name': 'inventory',
          'service.namespace': 'warehouse',
          'deployment.environment.name': 'prod-east',
          'hertzbeat.entity_id': '42',
          'hertzbeat.entity_name': 'Inventory API',
          'hertzbeat.collector': 'collector-b',
          'hertzbeat.template': 'fastapi',
          trace_id: 'trace-inventory',
          span_id: 'span-inventory'
        },
        points: [[1000, 20]],
        latestValue: 20
      }
    ];

    const { default: OtlpMetricsPage } = await import('./page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<OtlpMetricsPage />);
      await Promise.resolve();
    });

    const rows = Array.from(interactionContainer.querySelectorAll('[data-otlp-metrics-series-row="selectable-series"]')) as HTMLTableRowElement[];
    expect(rows).toHaveLength(2);
    expect(rows[0]?.getAttribute('data-otlp-metrics-series-row-selected')).toBe('true');
    const initialEntityCells = Array.from(interactionContainer.querySelectorAll('[data-otlp-metrics-series-entity="true"]')) as HTMLElement[];
    expect(initialEntityCells[0]?.textContent).toContain('Checkout API');
    expect(initialEntityCells[0]?.textContent).toContain('entityId 7');

    await act(async () => {
      rows[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(rows[1]?.getAttribute('data-otlp-metrics-series-row-selected')).toBe('true');
    const selectedEntityCells = Array.from(interactionContainer.querySelectorAll('[data-otlp-metrics-series-entity="true"]')) as HTMLElement[];
    expect(selectedEntityCells[1]?.textContent).toContain('Inventory API');
    expect(selectedEntityCells[1]?.textContent).toContain('entityId 42');
    expect(interactionContainer.textContent).toContain('fastapi');
    const evidencePanel = interactionContainer.querySelector('[data-otlp-metrics-selected-series-evidence="real-sample-evidence"]') as HTMLElement | null;
    expect(evidencePanel).not.toBeNull();
    expect(evidencePanel?.textContent).toContain('指标证据');
    expect(evidencePanel?.textContent).toContain('采样窗口');
    expect(evidencePanel?.textContent).toContain('真实采样时间');
    expect(evidencePanel?.textContent).toContain('关联链路');
    expect(evidencePanel?.textContent).toContain('trace-inventory');

    const logHref = (interactionContainer.querySelector('[data-otlp-metrics-logs-action="true"]') as HTMLAnchorElement | null)?.href;
    const traceHref = (interactionContainer.querySelector('[data-otlp-metrics-traces-action="true"]') as HTMLAnchorElement | null)?.href;
    const entityHref = (interactionContainer.querySelector('[data-otlp-metrics-entity-action="true"]') as HTMLAnchorElement | null)?.href;
    const alertHref = (interactionContainer.querySelector('[data-otlp-metrics-alert-handling-action="true"]') as HTMLAnchorElement | null)?.href;

    const logParams = new URL(logHref || '', 'http://localhost').searchParams;
    expect(logParams.get('view')).toBe('list');
    expect(logParams.get('search')).toBeNull();
    expect(logParams.get('entityId')).toBe('42');
    expect(logParams.get('serviceName')).toBe('inventory');
    expect(logParams.get('serviceNamespace')).toBe('warehouse');
    expect(logParams.get('environment')).toBe('prod-east');
    expect(logParams.get('traceId')).toBe('trace-inventory');
    expect(logParams.get('spanId')).toBe('span-inventory');
    expect(logParams.get('collector')).toBe('collector-b');
    expect(logParams.get('template')).toBe('fastapi');

    const traceParams = new URL(traceHref || '', 'http://localhost').searchParams;
    expect(traceParams.get('entityId')).toBe('42');
    expect(traceParams.get('serviceName')).toBe('inventory');
    expect(traceParams.get('traceId')).toBe('trace-inventory');
    expect(traceParams.get('spanId')).toBe('span-inventory');

    const entityUrl = new URL(entityHref || '', 'http://localhost');
    expect(entityUrl.pathname).toBe('/entities/42');
    expect(entityUrl.searchParams.get('entityName')).toBe('Inventory API');

    const alertParams = new URL(alertHref || '', 'http://localhost').searchParams;
    expect(alertParams.get('signal')).toBe('metrics');
    expect(alertParams.get('search')).toBe('inventory');
    expect(alertParams.get('entityId')).toBe('42');
  });

  it('prefers the metric series that matches the incoming trace context before building handoff links', async () => {
    mockState.searchParams = new URLSearchParams('traceId=trace-target&spanId=span-target&serviceName=checkout&source=otlp');
    mockState.metricSeries = [
      {
        key: 'http_server_duration-0',
        name: 'http.server.duration',
        labels: {
          'service.name': 'checkout',
          'service.namespace': 'payments',
          'deployment.environment.name': 'prod',
          'hertzbeat.entity_id': '7',
          'hertzbeat.entity_name': 'Checkout API',
          'hertzbeat.collector': 'collector-old',
          'hertzbeat.template': 'spring-boot',
          trace_id: 'trace-old',
          span_id: 'span-old'
        },
        points: [[1000, 12]],
        latestValue: 12
      },
      {
        key: 'http_server_duration-1',
        name: 'http.server.duration',
        labels: {
          'service.name': 'checkout',
          'service.namespace': 'payments',
          'deployment.environment.name': 'prod',
          'hertzbeat.entity_id': '7',
          'hertzbeat.entity_name': 'Checkout API',
          'hertzbeat.collector': 'collector-target',
          'hertzbeat.template': 'spring-boot',
          trace_id: 'trace-target',
          span_id: 'span-target'
        },
        points: [[1000, 18]],
        latestValue: 18
      }
    ];

    const { default: OtlpMetricsPage } = await import('./page');
    const html = renderToStaticMarkup(<OtlpMetricsPage />);

    expect(html).toContain('data-otlp-metrics-series-row-selected="true"');
    expect(html).toContain('trace-target');
    expect(html).toContain('span-target');
    expect(html).toContain('collector-target');
    expect(html).toContain('/log/manage?');
    expect(html).toContain('view=list');
    expect(html).not.toContain('trace-old&amp;spanId=span-old');
  });

  it('renders an operator-visible linked-record summary for the selected metric series', async () => {
    mockState.metricSeries = [
      {
        key: 'checkout_latency_ms-0',
        name: 'checkout.latency',
        labels: {
          'service.name': 'checkout',
          'service.namespace': 'payments',
          'deployment.environment.name': 'prod',
          'hertzbeat.entity_id': '42',
          'hertzbeat.entity_name': 'Checkout API',
          'hertzbeat.collector': 'collector-a',
          'hertzbeat.template': 'spring-boot',
          trace_id: 'trace-series-42',
          span_id: 'span-series-42'
        },
        points: [[1000, 12]],
        latestValue: 12
      }
    ];

    const { default: OtlpMetricsPage } = await import('./page');
    const html = renderToStaticMarkup(<OtlpMetricsPage />);

    expect(html).toContain('data-otlp-metrics-linked-record-summary="log-trace-alert-links"');
    expect(html).toContain('关联记录');
    expect(html).toContain('历史日志');
    expect(html).toContain('按链路查看');
    expect(html).toContain('历史日志会定位到当前 span');
    expect(html).toContain('链路瀑布图');
    expect(html).toContain('打开完整链路并保留当前 span');
    expect(html).toContain('告警处理');
    expect(html).toContain('按实体、服务和指标进入告警');
    expect(html).toContain('data-otlp-metrics-linked-record-action="logs"');
    expect(html).toContain('data-otlp-metrics-linked-record-action="traces"');
    expect(html).toContain('data-otlp-metrics-linked-record-action="alerts"');
    expect(html).toContain('/log/manage?');
    expect(html).toContain('view=list');
    expect(html).toContain('/trace/manage?');
    expect(html).toContain('/alert?');
    expect(html).toContain('trace-series-42');
    expect(html).toContain('span-series-42');
  });

  it('keeps entity detail disabled with i18n guidance when the selected metric series has no entity id', async () => {
    const messages = readFileSync(resolve(process.cwd(), 'lib/i18n-runtime-messages.ts'), 'utf8');
    mockState.metricSeries = [
      {
        key: 'jvm_memory_used-0',
        name: 'jvm.memory.used',
        labels: {
          'service.name': 'self-monitor',
          'service.namespace': 'hertzbeat',
          'deployment.environment.name': 'prod',
          'hertzbeat.collector': 'collector-local',
          'hertzbeat.template': 'jvm'
        },
        points: [[1000, 20]],
        latestValue: 20
      }
    ];

    const { default: OtlpMetricsPage } = await import('./page');
    const html = renderToStaticMarkup(<OtlpMetricsPage />);

    expect(messages).toContain("'otlp.metrics.handoff.entity-disabled'");
    expect(html).toContain('data-otlp-metrics-entity-action-disabled="missing-entity-id"');
    expect(html).toContain('data-otlp-metrics-attribution-diagnostics="hertzbeat-attribute-diagnostics"');
    expect(html).toContain('归因诊断');
    expect(html).toContain('hertzbeat.entity_id');
    expect(html).toContain('缺少实体 ID，实体详情会保持禁用');
    expect(html).toContain('hertzbeat.collector');
    expect(html).toContain('collector-local');
    expect(html).toContain('hertzbeat.template');
    expect(html).toContain('jvm');
    expect(html).toContain('title="otlp.metrics.handoff.entity-disabled"');
    expect(html).toContain('aria-label="otlp.metrics.handoff.entity-disabled"');
    expect(html).not.toContain('data-otlp-metrics-entity-action="true" href="/entities/');
    expect(html).toContain('/entities?search=self-monitor');
  });
});
