// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../../test/i18n-test-helper';
import type { TranslationParams } from '../../../../lib/i18n';

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
const zhT = createTranslatorMock({ locale: 'zh-CN' });

function tZh(key: string, params?: TranslationParams) {
  return zhT(key, params);
}

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
    t: zhT
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
  EChartsPanel: ({ edge, onDataZoomChange, preserveDataZoom, ...props }: any) => (
    <button
      {...props}
      type="button"
      data-echarts-panel="otlp-metrics"
      data-echarts-panel-edge={edge}
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
  buildOtlpMetricsConsoleUrl: (query: Record<string, unknown> = {}) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });
    const search = params.toString();
    return `/api/otlp/v1/metrics${search ? `?${search}` : ''}`;
  },
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
    from: params.get('from') || undefined,
    to: params.get('to') || undefined,
    start: params.get('start') || undefined,
    end: params.get('end') || undefined,
    refresh: params.get('refresh') || undefined,
    live: params.get('live') || undefined,
    tz: params.get('tz') || undefined,
    timezone: params.get('timezone') || undefined
  })
}));

vi.mock('@/lib/signal-route-context', () => ({
  buildSignalEntityContextRows: () => [
    { label: tZh('signal.context.entity.label'), value: 'checkout', meta: 'entityId 7' },
    { label: tZh('signal.context.service.label'), value: 'checkout', meta: 'payments' },
    { label: tZh('signal.context.environment.label'), value: 'prod', meta: tZh('signal.context.environment.meta') },
    { label: tZh('signal.context.time.label'), value: 'last-1h', meta: tZh('signal.context.time.meta.default') },
    { label: tZh('signal.context.source.label'), value: 'OTLP', meta: tZh('signal.context.source.otlp.meta') }
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
    from: mockState.searchParams.get('from') || undefined,
    to: mockState.searchParams.get('to') || undefined,
    timeRange: mockState.searchParams.get('timeRange') || undefined,
    timezone: mockState.searchParams.get('timezone') || undefined,
    source: mockState.searchParams.get('source') || undefined,
    collector: mockState.searchParams.get('collector') || undefined,
    template: mockState.searchParams.get('template') || undefined,
    traceId: mockState.searchParams.get('traceId') || undefined,
    spanId: mockState.searchParams.get('spanId') || undefined
  })
}));

vi.mock('@/lib/otlp-metrics/view-model', () => ({
  buildMetricsExplorerState: () => ({
    chartLabel: tZh('otlp.metrics.explorer.chart-label', { count: mockState.metricSeries.length }),
    hasSeries: mockState.metricSeries.length > 0,
    emptyTitle: tZh('otlp.metrics.explorer.empty-title'),
    noMetricsTitle: tZh('otlp.metrics.explorer.no-metrics-title'),
    sendMetricsLabel: tZh('otlp.metrics.explorer.waiting-ingest'),
    seriesCountLabel: tZh('otlp.metrics.explorer.series-count', { count: mockState.metricSeries.length })
  }),
  buildConsoleFacts: () => [
    { label: tZh('otlp.metrics.stats.total-series'), value: '0' },
    { label: tZh('otlp.metrics.stats.non-empty-series'), value: '0' },
    { label: tZh('otlp.metrics.stats.datasource'), value: 'prometheus' },
    { label: tZh('otlp.metrics.stats.latest-observed'), value: '-' }
  ],
  buildConsoleMetrics: () => [
    { label: tZh('otlp.metrics.stats.non-empty-series'), value: '0' },
    { label: tZh('otlp.metrics.stats.series-total'), value: '0' },
    { label: tZh('otlp.metrics.stats.intake-state'), value: tZh('common.empty') }
  ],
  buildContextRows: () => [
    { title: tZh('otlp.metrics.context.current-service'), copy: 'checkout', meta: 'payments' },
    { title: tZh('otlp.metrics.context.time-range'), copy: '2026-04-12 20:00:00 → 2026-04-12 20:00:00', meta: 'ok' }
  ],
  buildMetricSeriesContextRows: (series: any) => series
    ? [
        { label: tZh('otlp.metrics.series.context.metric-name'), value: series.name, meta: tZh('otlp.metrics.series.context.selected-series') },
        { label: tZh('otlp.metrics.series.context.entity'), value: series.labels['hertzbeat.entity_name'] || '-', meta: tZh('otlp.metrics.series.entity-id', { entityId: series.labels['hertzbeat.entity_id'] || '-' }) },
        { label: tZh('otlp.metrics.series.context.service'), value: series.labels['service.name'] || series.labels.service_name || '-', meta: series.labels['service.namespace'] || series.labels.service_namespace || '-' },
        { label: tZh('otlp.metrics.series.context.template'), value: series.labels['hertzbeat.template'] || '-', meta: tZh('otlp.metrics.series.context.collector', { collector: series.labels['hertzbeat.collector'] || '-' }) },
        { label: tZh('otlp.metrics.series.context.environment'), value: series.labels['deployment.environment.name'] || series.labels.deployment_environment_name || '-', meta: tZh('otlp.metrics.series.context.deployment-environment') }
      ]
    : [],
  buildMetricSeriesEvidenceRows: (series: any) => series
    ? [
        { label: tZh('otlp.metrics.evidence.samples'), value: String((series.points || []).length), meta: tZh('otlp.metrics.evidence.real-samples') },
        { label: tZh('otlp.metrics.evidence.latest-value'), value: String(series.latestValue ?? '-'), meta: 'Recent sample' },
        { label: tZh('otlp.metrics.evidence.value-range'), value: '12 - 20', meta: tZh('otlp.metrics.evidence.average', { average: 16 }) },
        { label: tZh('otlp.metrics.evidence.sample-window'), value: 'T1000 → T2000', meta: tZh('otlp.metrics.evidence.real-sample-time') },
        { label: tZh('otlp.metrics.evidence.linked-trace'), value: series.labels.trace_id || '-', meta: series.labels.span_id || '-' }
      ]
    : [],
  buildMetricSeriesLinkedRecordRows: (series: any, handoffLinks: any) => series
    ? [
        {
          key: 'logs',
          label: tZh('otlp.metrics.handoff.logs'),
          value: series.labels.trace_id ? tZh('otlp.metrics.handoff.logs-by-trace') : tZh('otlp.metrics.handoff.logs-by-service'),
          meta: series.labels.span_id ? tZh('otlp.metrics.handoff.logs-current-span') : tZh('otlp.metrics.handoff.logs-service-filter'),
          href: handoffLinks.logsHref
        },
        {
          key: 'traces',
          label: tZh('otlp.metrics.handoff.traces'),
          value: series.labels.trace_id ? tZh('otlp.metrics.handoff.trace-open') : tZh('otlp.metrics.handoff.trace-waiting-id'),
          meta: series.labels.span_id ? tZh('otlp.metrics.handoff.trace-full-current-span') : tZh('otlp.metrics.handoff.trace-missing-id'),
          href: handoffLinks.tracesHref
        },
        {
          key: 'alerts',
          label: tZh('otlp.metrics.handoff.alerts'),
          value: series.labels['hertzbeat.entity_id'] ? tZh('otlp.metrics.handoff.alerts-by-entity') : tZh('otlp.metrics.handoff.alerts-by-service'),
          meta: series.labels['hertzbeat.entity_id'] ? tZh('otlp.metrics.handoff.alerts-by-entity-meta') : tZh('otlp.metrics.handoff.alerts-by-service-meta'),
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
      row('hertzbeat.entity_id', series.labels['hertzbeat.entity_id'], series.labels['hertzbeat.entity_id'] ? tZh('otlp.metrics.attribution.entity-id.present') : tZh('otlp.metrics.attribution.entity-id.missing')),
      row('hertzbeat.entity_name', series.labels['hertzbeat.entity_name'], tZh('otlp.metrics.attribution.entity-name')),
      row('hertzbeat.workspace_id', series.labels['hertzbeat.workspace_id'], tZh('otlp.metrics.attribution.workspace-id')),
      row('hertzbeat.collector', series.labels['hertzbeat.collector'], tZh('otlp.metrics.attribution.collector')),
      row('hertzbeat.template', series.labels['hertzbeat.template'], tZh('otlp.metrics.attribution.template'))
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
          from: '1970-01-01 08:00:01',
          to: '1970-01-01 08:00:02'
        }
      : null,
  buildMetricSeriesRows: () => mockState.metricSeries.map(series => ({
    title: series.name,
    copy: series.labels['service.name'] || series.labels.service_name || '-',
    meta: series.latestValue == null ? '-' : String(series.latestValue),
    entityLabel: series.labels['hertzbeat.entity_name'] || series.labels.hertzbeat_entity_name || '-',
    entityMeta: series.labels['hertzbeat.entity_id'] || series.labels.hertzbeat_entity_id
      ? tZh('otlp.metrics.series.entity-id', { entityId: series.labels['hertzbeat.entity_id'] || series.labels.hertzbeat_entity_id })
      : tZh('otlp.metrics.series.entity-missing'),
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
  it('keeps the metrics header and query toolbar copy behind i18n keys', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/ingestion/otlp/metrics/otlp-metrics-page.tsx'), 'utf8');
    const slice = source.slice(
      source.indexOf('const serviceGroupLabel'),
      source.indexOf('data-otlp-metrics-chart-band="hertzbeat-ui-chart-band"')
    );

    expect(slice).not.toMatch(/[\u4e00-\u9fff]/);
    expect(slice).toContain("t('otlp.metrics.header.kicker')");
    expect(slice).toContain("t('otlp.metrics.query.run')");
    expect(slice).toContain("t('otlp.metrics.group.service')");
    expect(slice).toContain("t('otlp.metrics.scope.all-services')");
  });

  it('keeps metrics on the OTLP cold Workbench owner instead of the old external-product explorer stack', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/ingestion/otlp/metrics/otlp-metrics-page.tsx'), 'utf8');

    expect(source).toContain('data-otlp-metrics-route="otlp-hertzbeat-ui-metrics-workbench"');
    expect(source).toContain('HzSignalWorkbenchShell');
    expect(source).toContain('data-otlp-metrics-shell-owner="hertzbeat-ui-signal-workbench-shell"');
    expect(source).toContain('layout="topology-workbench"');
    expect(source).not.toContain('className="flex min-h-[calc(100vh-56px)] flex-col gap-3 bg-[#07090b] px-3 pb-3 pt-0 text-[#e8edf5]"');
    expect(source).toContain('data-otlp-metrics-style-baseline="hertzbeat-ui-matte"');
    expect(source).toContain('data-otlp-metrics-query-bar="hertzbeat-ui-query-row"');
    expect(source).toContain('data-otlp-metrics-query-bar-owner="hertzbeat-ui-panel-surface"');
    expect(source).toContain('padding="query"');
    expect(source).toContain('data-otlp-metrics-query-control-stack="shared-inline-controls"');
    expect(source).toContain('data-otlp-metrics-query-control-stack-owner="hertzbeat-ui-control-stack"');
    expect(source).toContain('data-otlp-metrics-context-control-stack="shared-inline-controls"');
    expect(source).toContain('data-otlp-metrics-context-control-stack-owner="hertzbeat-ui-control-stack"');
    expect(source).toContain('layout="inline-wrap"');
    expect(source).toContain('spacing="top-2"');
    expect(source).not.toContain('className="flex flex-wrap items-center gap-2"');
    expect(source).not.toContain('className="mt-2 flex flex-wrap items-center gap-2"');
    expect(source).not.toContain('data-otlp-metrics-context-control-stack-owner="hertzbeat-ui-control-stack"\n                  className="mt-2"');
    expect(source).toContain('HzSearchFieldFrame');
    expect(source).toContain('HzSearchFieldIcon');
    expect(source).toContain('HzInput');
    expect(source).toContain('data-otlp-metrics-query-input="true"');
    expect(source).toContain('data-otlp-metrics-query-search-frame="shared-search-field-frame"');
    expect(source).toContain('data-otlp-metrics-query-search-frame-owner="hertzbeat-ui-search-field-frame"');
    expect(source).toContain('width="metrics-query"');
    expect(source).toContain('data-otlp-metrics-query-search-icon-owner="hertzbeat-ui-search-field-icon"');
    expect(source).toContain('data-otlp-metrics-query-input-owner="hertzbeat-ui-input"');
    expect(source).toContain('inset="search-icon"');
    expect(source).toContain('width="metrics-query-expression"');
    expect(source).not.toContain('<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4');
    expect(source).not.toContain('className={`${inputClass} w-full pl-9 font-mono`}');
    expect(source).not.toContain('className="w-full font-mono"');
    expect(source).not.toContain('className="min-w-[320px] max-w-[560px] flex-1"');
    expect(source).toContain('data-otlp-metrics-service-input="true"');
    expect(source).toContain('data-otlp-metrics-namespace-input="true"');
    expect(source).toContain('data-otlp-metrics-environment-input="true"');
    expect(source).toContain('data-otlp-metrics-context-input="service-name"');
    expect(source).toContain('data-otlp-metrics-context-input="namespace"');
    expect(source).toContain('data-otlp-metrics-context-input="environment"');
    expect(source).toContain('data-otlp-metrics-context-input="trace-id"');
    expect(source).toContain('data-otlp-metrics-context-input-owner="hertzbeat-ui-input"');
    expect(source).toContain('width="metrics-context"');
    expect(source).toContain('width="metrics-context-compact"');
    expect(source).toContain('width="metrics-trace-id"');
    expect(source).not.toContain('className="w-[220px]"');
    expect(source).not.toContain('className="w-[160px]"');
    expect(source).not.toContain('className="min-w-[220px] max-w-[360px] flex-1 font-mono"');
    expect(source).not.toContain("import { Input } from '@/components/ui/input'");
    expect(source).not.toContain('const inputClass =');
    expect(source).not.toContain('className={`${inputClass}');
    expect(source).toContain('data-otlp-metrics-aggregation-select="true"');
    expect(source).toContain('data-otlp-metrics-aggregation-select-owner="hertzbeat-ui-select"');
    expect(source).toContain('width="metrics-aggregation"');
    expect(source).toContain('data-otlp-metrics-aggregation-option');
    expect(source).toContain('data-otlp-metrics-group-by-select="true"');
    expect(source).toContain('data-otlp-metrics-group-by-select-owner="hertzbeat-ui-select"');
    expect(source).toContain('width="metrics-group-by"');
    expect(source).toContain('data-otlp-metrics-group-by-option');
    expect(source).toContain('HzSelect');
    expect(source).not.toContain("import { Select } from '@/components/ui/select'");
    expect(source).not.toContain('containerClassName="w-[124px]"');
    expect(source).not.toContain('containerClassName="w-[132px]"');
    expect(source).not.toContain('className="w-[124px]"');
    expect(source).not.toContain('className="w-[132px]"');
    expect(source).toContain('HzQueryActionGroup');
    expect(source).toContain('HzButton');
    expect(source).toContain('data-otlp-metrics-query-action-group="shared-query-action-group"');
    expect(source).toContain('data-otlp-metrics-query-action-group-owner="hertzbeat-ui-query-action-group"');
    expect(source).toContain('data-otlp-metrics-query-action-icon-owner="hertzbeat-ui-button-icon"');
    expect(source).toContain('data-otlp-metrics-reset-action="true"');
    expect(source).not.toContain('const primaryActionClass =');
    expect(source).not.toContain('className={primaryActionClass}');
    expect(source).not.toContain('<Play className="h-4 w-4" aria-hidden="true" />');
    expect(source).not.toContain('<RotateCcw className="h-4 w-4" aria-hidden="true" />');
    expect(source).not.toContain('<section data-otlp-metrics-query-bar="hertzbeat-ui-query-row" className={`${panelClass} px-4 py-3`}>');
    expect(source).toContain('data-otlp-metrics-header-topbar="time-context"');
    expect(source).toContain('data-otlp-metrics-header-topbar-owner="hertzbeat-ui-workbench-layout"');
    expect(source).toContain('data-otlp-metrics-page-shell="flat-direct-stack"');
    expect(source).toContain('data-otlp-metrics-page-shell-layer="removed"');
    expect(source).toContain('data-otlp-metrics-page-stack="direct-panels"');
    expect(source).not.toContain('data-otlp-metrics-page-shell="full-width-no-gutters"');
    expect(source).not.toContain('data-otlp-metrics-page-shell-gutter="edge-to-edge-viewport"');
    expect(source).not.toContain('data-otlp-metrics-page-shell-top="flush-under-app-bar"');
    expect(source).not.toContain('className="flex w-full max-w-none flex-col gap-3 px-3 py-3"');
    expect(source).not.toContain('w-[calc(100%+2rem)]');
    expect(source).not.toContain('-mx-4');
    expect(source).not.toContain('className="flex min-h-[calc(100vh-56px)] flex-col gap-3 bg-[#07090b] px-3 pb-3 pt-0 text-[#e8edf5]"');
    expect(source).toContain('HzSignalWorkbenchShell');
    expect(source).toContain('data-otlp-metrics-shell-owner="hertzbeat-ui-signal-workbench-shell"');
    expect(source).toContain('layout="topology-workbench"');
    expect(source).toContain('data-otlp-metrics-header="hertzbeat-ui-compact-header"');
    expect(source).toContain('data-otlp-metrics-header-owner="hertzbeat-ui-panel-surface"');
    expect(source).toContain('data-otlp-metrics-header-layout="compact-title-with-aligned-toolbar"');
    expect(source).toContain('data-otlp-metrics-header-layout-frame="compact-title-with-aligned-toolbar"');
    expect(source).toContain('data-otlp-metrics-header-layout-frame-owner="hertzbeat-ui-workbench-layout"');
    expect(source).toContain('variant="metrics-header"');
    expect(source).not.toContain('className="grid min-w-0 gap-3 xl:grid-cols-[minmax(280px,1fr)_minmax(780px,auto)] xl:items-start"');
    expect(source).toContain('data-otlp-metrics-title-block="operator-context"');
    expect(source).toContain('data-otlp-metrics-title-block-owner="hertzbeat-ui-workbench-header-copy"');
    expect(source).toContain('HzWorkbenchHeaderCopy');
    expect(source).toContain('density="compact"');
    expect(source).toContain("eyebrow={t('otlp.metrics.header.kicker')}");
    expect(source).toContain("title={t('otlp.metrics.title')}");
    expect(source).toContain('data-otlp-metrics-header-context-strip="applied-query-facts"');
    expect(source).toContain('data-otlp-metrics-header-context-strip-owner="hertzbeat-ui-toolbar-chips"');
    expect(source).toContain('spacing="top-3"');
    expect(source).toContain('data-otlp-metrics-header-context-pill="applied-query-fact"');
    expect(source).toContain('data-otlp-metrics-header-context-pill-owner="hertzbeat-ui-status-badge"');
    expect(source).toContain('headerContextPills.map');
    expect(source).toContain('<HzChipGroup');
    expect(source).toContain('<HzStatusBadge');
    expect(source).toContain('layout="context-pill"');
    expect(source).toContain('label={pill.label}');
    expect(source).toContain('value={pill.value}');
    expect(source).not.toContain('data-otlp-metrics-header-context-strip-owner="hertzbeat-ui-toolbar-chips"\n                        className="mt-3"');
    expect(source).not.toContain("<p className=\"mb-2 text-[12px] font-semibold tracking-[0.08em] text-[#8792a5]\">{t('otlp.metrics.header.kicker')}</p>");
    expect(source).not.toContain("<h1 className=\"text-[26px] font-semibold tracking-normal text-[#f4f7fb]\">{t('otlp.metrics.title')}</h1>");
    expect(source).not.toContain('className="inline-flex h-7 max-w-[220px] items-center gap-2 rounded-[3px] border border-[#252b35] bg-[#10141b] px-2.5 text-[11px]"');
    expect(source).not.toContain('className="max-w-[220px] gap-2"');
    expect(source).not.toContain('<span className="shrink-0 font-semibold text-[#7f8a9d]">{pill.label}</span>');
    expect(source).not.toContain('<span className="truncate font-semibold text-[#dbe5f3]">{pill.value}</span>');
    expect(source).not.toContain('data-otlp-metrics-header-copy="operator-query-copy"');
    expect(source).not.toContain('mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-6 py-6');
    expect(source).not.toContain('xl:grid-cols-[minmax(0,1fr)_auto]');
    expect(source).toContain('data-otlp-metrics-time-toolbar="top-right-corner"');
    expect(source).toContain('data-otlp-metrics-time-toolbar-owner="hertzbeat-ui-workbench-layout"');
    expect(source).toContain('data-otlp-metrics-toolbar-stack="same-width-time-actions"');
    expect(source).toContain('variant="header-toolbar-slot"');
    expect(source).toContain('variant="time-toolbar"');
    expect(source).not.toContain('data-otlp-metrics-toolbar-stack="same-width-time-actions"\n                      className="justify-end"');
    expect(source).toContain('HzActionGroup');
    expect(source).toContain('HzButtonLink');
    expect(source).toContain('HzButtonIcon');
    expect(source).toContain('data-otlp-metrics-return-action-group-owner="hertzbeat-ui-action-group"');
    expect(source).toContain('data-otlp-metrics-return-action="true"');
    expect(source).toContain('data-otlp-metrics-header-action="return-source"');
    expect(source).toContain('data-otlp-metrics-header-action-icon-owner="hertzbeat-ui-button-icon"');
    expect(source).toContain("t('otlp.metrics.route.action.return-source')");
    expect(source).not.toContain('className="ml-auto flex min-w-[360px] flex-col items-end gap-2"');
    expect(source).not.toContain('className="flex min-w-0 justify-end xl:justify-self-end"');
    expect(source).not.toContain('className="flex w-full max-w-[1120px] flex-wrap justify-end gap-2"');
    expect(source).not.toContain('className="flex w-full justify-end"');
    expect(source).toContain('data-otlp-metrics-time-control-placement="top-right"');
    expect(source).toContain('data-otlp-metrics-time-control-owner="hertzbeat-ui-control-stack"');
    expect(source).toContain('HzControlStack');
    expect(source).toContain('layout="end-inline"');
    expect(source).toContain('data-otlp-metrics-time-range-control-owner="hertzbeat-shared-time-range-control"');
    expect(source).not.toContain('variant="narrow-rail"\n                          className="justify-end"');
    expect(source).toContain('data-otlp-metrics-time-control-visual="narrow-top-right-rail"');
    expect(source).toContain('data-otlp-metrics-time-control-fit="no-clipping"');
    expect(source).toContain('data-otlp-metrics-header-actions="removed"');
    expect(source).not.toContain('const panelClass =');
    expect(source).not.toContain('className={`${panelClass} px-4 py-3`}');
    expect(source).not.toContain("'border-[var(--ops-primary)] px-3'");
    expect(source).not.toContain('data-otlp-metrics-action-row="aligned-context-actions"');
    expect(source).not.toContain('href="/setting/collector"');
    expect(source).not.toContain('href="/setting/define"');
    expect(source).toContain('variant="narrow-rail"');
    expect(source).not.toContain('className="w-full justify-end border-[#2b3039] bg-[#101217]"');
    expect(source).toContain('showAbsoluteFields');
    expect(source.indexOf('data-otlp-metrics-time-control="shared-time-context-control"')).toBeLessThan(
      source.indexOf('data-otlp-metrics-query-bar="hertzbeat-ui-query-row"')
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
    expect(source).toContain('data-otlp-metrics-chart-band="hertzbeat-ui-chart-band"');
    expect(source).toContain('data-otlp-metrics-chart-band-owner="hertzbeat-ui-panel-surface"');
    expect(source).toContain('padding="chart"');
    expect(source).toContain('data-otlp-metrics-chart-layout="wide-series-chart-with-compact-meta"');
    expect(source).toContain('data-otlp-metrics-chart-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(source).toContain('variant="chart-stack"');
    expect(source).not.toContain('className="grid items-start gap-3"');
    expect(source).toContain('data-otlp-metrics-series-mode="entity-series-set"');
    expect(source).toContain('data-otlp-metrics-chart-header-layout="trend-toolbar"');
    expect(source).toContain('data-otlp-metrics-chart-header-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(source).toContain('variant="metrics-chart-toolbar"');
    expect(source).not.toContain('className="mb-3 text-[12px] text-[#8792a5]"');
    expect(source).toContain('data-otlp-metrics-chart-title-label="shared-panel-title-label"');
    expect(source).toContain('data-otlp-metrics-chart-title-label-owner="hertzbeat-ui-panel-title-label"');
    expect(source).toContain('data-otlp-metrics-chart-toolbar-actions="shared-toolbar-actions"');
    expect(source).toContain('data-otlp-metrics-chart-toolbar-actions-owner="hertzbeat-ui-action-group"');
    expect(source).toContain('layout="end-wrap"');
    expect(source).not.toContain('<span className="inline-flex min-w-0 flex-wrap items-center justify-end gap-2">');
    expect(source).not.toContain('<span className="inline-flex items-center gap-2 font-semibold text-[#c6cfdd]">');
    expect(source).not.toContain('<BarChart3 className="h-4 w-4" aria-hidden="true" />');
    expect(source).toContain('const hasMetricSeries = metricSeries.length > 0');
    expect(source).toContain('{hasMetricSeries ? (');
    expect(source).toContain('data-otlp-metrics-chart-meta-row="compact-real-facts"');
    expect(source).toContain('data-otlp-metrics-chart-meta-row-owner="hertzbeat-ui-toolbar-chips"');
    expect(source).toContain('align="end"');
    expect(source).not.toContain('data-otlp-metrics-chart-meta-row-owner="hertzbeat-ui-toolbar-chips"\n                            density="compact"\n                            className="justify-end"');
    expect(source).toContain('data-otlp-metrics-chart-meta-fact="true"');
    expect(source).toContain('data-otlp-metrics-chart-meta-fact-owner="hertzbeat-ui-status-badge"');
    expect(source).toContain('layout="metric-fact"');
    expect(source).toContain('label={fact.label}');
    expect(source).toContain('value={fact.value}');
    expect(source).not.toContain('<span className="truncate text-[10px] font-semibold text-[#7f8a9d]">{fact.label}</span>');
    expect(source).not.toContain('<span className="truncate text-[11px] font-semibold text-[#cfd8e6]">{fact.value}</span>');
    expect(source).toContain('facts.map');
    expect(source).toContain('HzChipGroup');
    expect(source).not.toContain('data-otlp-metrics-facts-grid="inline-summary-strip"');
    expect(source).toContain('data-otlp-metrics-empty-state="honest-no-series"');
    expect(source).toContain('data-otlp-metrics-empty-state-context="applied-query-visible"');
    expect(source).toContain('data-otlp-metrics-chart-panel="series-set-trend"');
    expect(source).toContain('data-otlp-metrics-chart-panel-owner="hertzbeat-ui-panel-surface"');
    expect(source).toContain('data-otlp-metrics-chart-panel-variant-owner="hertzbeat-ui-panel-surface"');
    expect(source).toContain('padding="chart-inner"');
    expect(source).toContain('variant="chart-inner"');
    expect(source).toContain('HzPanelSurface');
    expect(source).not.toContain('className="bg-[#10141b] px-3 py-3 shadow-none"');
    expect(source).not.toContain('className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#8792a5]"');
    expect(source).not.toContain('className="min-w-0 rounded-[4px] border border-[#252b35] bg-[#10141b] px-3 py-3"');
    expect(source).not.toContain('data-otlp-metrics-chart-band="hertzbeat-ui-chart-band" className={`${panelClass} px-4 py-4`}');
    expect(source).not.toContain('data-otlp-metrics-chart-layout="fact-stack-with-wide-trend"');
    expect(source).not.toContain('data-otlp-metrics-facts-grid="compact-summary-stack"');
    expect(source).not.toContain('className="grid items-start gap-3 xl:grid-cols-[320px_minmax(0,1fr)]"');
    expect(source).not.toContain('repeat(4,minmax(0,160px))_minmax(0,1fr)');
    expect(source).not.toContain('className="inline-flex h-6 min-w-0 max-w-[180px] items-center gap-1 rounded-[3px] border border-[#252b35] bg-[#0d1015] px-2"');
    expect(source).toContain('data-otlp-metrics-chart-datazoom-state="local-observation"');
    expect(source).toContain('data-otlp-metrics-chart-datazoom-preserve="preserved"');
    expect(source).toContain('data-otlp-metrics-chart-zoom-apply="local-to-query-time"');
    expect(source).toContain('data-otlp-metrics-chart-zoom-apply-owner="hertzbeat-ui-button"');
    expect(source).toContain('data-otlp-metrics-chart-zoom-apply-state={');
    expect(source).not.toContain('className="h-7 px-2"');
    expect(source).toContain('metricsChartZoomDraftLabel');
    expect(source).toContain('data-otlp-metrics-chart-zoom-draft="pending-query-time"');
    expect(source).toContain('data-otlp-metrics-chart-zoom-draft-owner="hertzbeat-ui-status-badge"');
    expect(source).toContain('data-otlp-metrics-chart-zoom-draft-state="pending"');
    expect(source).toContain('layout="zoom-draft"');
    expect(source).toContain("label={t('time.context.zoom.draft')}");
    expect(source).toContain('value={metricsChartZoomDraftLabel}');
    expect(source).toContain('valueFont="mono"');
    expect(source).not.toContain("<span className=\"shrink-0 text-[#7f8a9d]\">{t('time.context.zoom.draft')}</span>");
    expect(source).not.toContain('<span className="min-w-0 truncate font-mono">{metricsChartZoomDraftLabel}</span>');
    expect(source).toContain('data-otlp-metrics-chart-series-count="toolbar-count"');
    expect(source).toContain('data-otlp-metrics-chart-series-count-owner="hertzbeat-ui-status-badge"');
    expect(source).not.toContain('className="inline-flex h-7 items-center justify-center rounded-[3px] border border-[#2b3039] bg-transparent px-2 text-[11px] font-semibold text-[#9ca7ba] transition-colors enabled:hover:border-[#3b4454] enabled:hover:bg-[#151821] enabled:hover:text-[#e6edf7] disabled:cursor-not-allowed disabled:opacity-45"');
    expect(source).not.toContain('className="inline-flex h-7 max-w-[340px] items-center gap-1.5 overflow-hidden rounded-[3px] border border-[#344052] bg-[#121823] px-2 text-[11px] font-semibold text-[#cfd8e6]"');
    expect(source).toContain('formatEpochMillisDraft');
    expect(source).toContain('buildMetricsChartOption(metricSeries)');
    expect(source).toContain('height={300}');
    expect(source).toContain('edge="metrics-chart"');
    expect(source).toContain('data-otlp-metrics-echarts-edge="shared-metrics-chart"');
    expect(source).toContain('data-otlp-metrics-echarts-edge-owner="hertzbeat-ui-echarts-panel"');
    expect(source).not.toContain('className="rounded-none border-x-0 border-y border-[#252b35] bg-transparent"');
    expect(source).toContain('buildMetricsDataZoomTimeContext(');
    expect(source).toContain('preserveDataZoom');
    expect(source).toContain('handleMetricsChartZoomChange(nextZoom);');
    expect(source).toContain('const nextZoomContext = buildMetricsDataZoomTimeContext(');
    expect(source).toContain('buildMetricTrendBars');
    expect(source).toContain('data-otlp-metrics-trend-bar={');
    expect(source).toContain("'real-series-point'");
    expect(source).toContain('data-otlp-metrics-trend-bar-owner="hertzbeat-ui-trend-bar"');
    expect(source).toContain('heightPct={series.heightPct}');
    expect(source).toContain('HzTrendBar');
    expect(source).not.toContain('className="min-w-0 flex-1 rounded-t-[3px] border border-[#2f3b4d] bg-[#182232]"');
    expect(source).not.toContain('style={{ height: `${series.heightPct}%` }}');
    expect(source).toContain('HzDataMetaText');
    expect(source).toContain('data-otlp-metrics-trend-sample-helper="real-sample-count"');
    expect(source).toContain('data-otlp-metrics-trend-sample-helper-owner="hertzbeat-ui-data-meta-text"');
    expect(source).toContain('spacing="trend-helper"');
    expect(source).not.toContain('<div className="mt-2 text-[11px] text-[#6d7788]">');
    expect(source).toContain('data-otlp-metrics-trend-empty="no-real-series"');
    expect(source).toContain('data-otlp-metrics-trend-empty-owner="hertzbeat-ui-state-notice"');
    expect(source).toContain('frame="trend-empty"');
    expect(source).toContain('data-otlp-metrics-trend-frame="shared-compact-bars"');
    expect(source).toContain('data-otlp-metrics-trend-frame-owner="hertzbeat-ui-trend-frame"');
    expect(source).not.toContain('<div className="flex h-16 items-end gap-1.5">');
    expect(source).not.toContain('className="flex h-full min-w-0 flex-1 flex-col justify-center border-dashed border-[#2a303a] bg-[#0c1016] text-center"');
    expect(source).toContain('HzStateNotice');
    expect(source).not.toContain('empty-series-placeholder');
    expect(source).not.toContain('Array.from({ length: 10 }');
    expect(source).toContain('const [selectedSeriesKey, setSelectedSeriesKey]');
    expect(source).toContain('selectedMetricSeries');
    expect(source).toContain('buildMetricsHandoffLinks(mergedData, query, routeContext, selectedMetricSeries)');
    expect(source).toContain('metricSeriesTableRows');
    expect(source).toContain('HzDataTable');
    expect(source).toContain('HzDataCellText');
    expect(source).toContain('HzEmptyState');
    expect(source).toContain('data-otlp-metrics-workbench-grid-owner="hertzbeat-ui-workbench-layout"');
    expect(source).toContain("variant={hasMetricSeries ? 'metrics-series-detail' : 'metrics-series-only'}");
    expect(source).not.toContain("className={hasMetricSeries ? 'grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]' : 'grid items-start gap-4'}");
    expect(source).toContain('data-otlp-metrics-series-table-owner="hertzbeat-ui-data-table"');
    expect(source).toContain('data-otlp-metrics-series-table-panel-owner="hertzbeat-ui-panel-surface"');
    expect(source).toContain('data-otlp-metrics-series-table-header="shared-panel-header"');
    expect(source).toContain('data-otlp-metrics-series-table-header-owner="hertzbeat-ui-panel-header"');
    expect(source).toContain('chrome="transparent-topless"');
    expect(source).not.toContain('className="border-x-0 border-t-0 bg-transparent"');
    expect(source).toContain("title={t('otlp.metrics.series.collection.title')}");
    expect(source).toContain('data-otlp-metrics-series-table-summary-owner="hertzbeat-ui-status-badge"');
    expect(source).toContain('data-otlp-metrics-series-table-empty-state="shared-empty-state"');
    expect(source).toContain('data-otlp-metrics-series-table-empty-state-owner="hertzbeat-ui-empty-state"');
    expect(source).toContain('data-otlp-metrics-series-set-summary-owner="hertzbeat-ui-stat-strip"');
    expect(source).toContain('data-otlp-metrics-series-set-summary-section="shared-panel-section"');
    expect(source).toContain('data-otlp-metrics-series-set-summary-section-owner="hertzbeat-ui-panel-section"');
    expect(source).toContain('data-otlp-metrics-series-set-summary-strip="shared-stat-strip"');
    expect(source).toContain('data-otlp-metrics-series-set-summary-strip-owner="hertzbeat-ui-stat-strip"');
    expect(source).toContain('frame="panel-inset"');
    expect(source).toContain('spacing="compact"');
    expect(source).toContain('data-otlp-metrics-series-set-summary-cell={row.label}');
    expect(source).toContain('data-otlp-metrics-series-set-summary-cell-owner="hertzbeat-ui-stat-cell"');
    expect(source).toContain('frame="inset"');
    expect(source).not.toContain('className="border-[#252b35] bg-[#0d1015]"');
    expect(source).not.toContain('<div className="border-b border-[#252b35] px-4 py-3">');
    expect(source).not.toContain('className="rounded-[3px] border border-[#252b35] bg-[#10141b] p-1"');
    expect(source).not.toContain('className="gap-1"');
    expect(source).toContain('data-otlp-metrics-series-data-table="shared-data-table"');
    expect(source).toContain('data-otlp-metrics-series-data-table-owner="hertzbeat-ui-data-table"');
    expect(source).toContain("'data-otlp-metrics-series-row': 'selectable-series'");
    expect(source).toContain("'data-otlp-metrics-series-row-selected': selectedMetricSeries?.key === row.series?.key ? 'true' : 'false'");
    expect(source).toContain('data-otlp-metrics-series-entity="true"');
    expect(source).toContain('data-otlp-metrics-series-entity-owner="hertzbeat-ui-data-cell-stack"');
    expect(source).toContain('width="metrics-entity"');
    expect(source).toContain('data-otlp-metrics-series-entity-label-owner="hertzbeat-ui-data-cell-text"');
    expect(source).toContain('data-otlp-metrics-series-entity-meta-owner="hertzbeat-ui-data-cell-text"');
    expect(source).toContain('data-otlp-metrics-series-entity-state={row.entityState}');
    expect(source).not.toContain('<span data-otlp-metrics-series-entity="true" className="block min-w-[140px]">');
    expect(source).toContain('tone="strong"');
    expect(source).toContain('weight="semibold"');
    expect(source).toContain('casing="plain"');
    expect(source).toContain("tone={row.entityState === 'present' ? 'success' : 'muted'}");
    expect(source).toContain('data-otlp-metrics-series-latest-owner="hertzbeat-ui-data-cell-text"');
    expect(source).toContain('font="mono"');
    expect(source).toContain('tone="bright"');
    expect(source).not.toContain('className="font-semibold text-[#dbe5f3]"');
    expect(source).not.toContain("className={row.entityState === 'present' ? 'normal-case tracking-normal text-[#75c795]' : 'normal-case tracking-normal text-[#8b94a4]'}");
    expect(source).not.toContain('className="font-mono text-[#e6edf7]"');
    expect(source).toContain('setSelectedSeriesKey(row.series.key)');
    expect(source).toContain('buildMetricSeriesContextRows(selectedMetricSeries, t)');
    expect(source).toContain('buildMetricSeriesEvidenceRows(selectedMetricSeries, formatTime, t)');
    expect(source).toContain('buildMetricSeriesLinkedRecordRows(selectedMetricSeries, handoffLinks, t)');
    expect(source).toContain('linkedRecordHandoffTargets');
    expect(source).toContain('buildMetricSeriesAttributionDiagnostics(selectedMetricSeries, t)');
    expect(source).toContain('HzCollapsibleSection');
    expect(source).toContain('HzContextHandoff');
    expect(source).toContain('HzDetailRows');
    expect(source).toContain('HzPanelHeader');
    expect(source).toContain('HzStatStrip');
    expect(source).toContain('HzStatCell');
    expect(source).toContain('HzAttributeDiagnostics');
    expect(source).toContain('metricsDetailContextRows');
    expect(source).toContain('data-otlp-metrics-detail-panel-header="shared-panel-header"');
    expect(source).toContain('data-otlp-metrics-detail-panel-header-owner="hertzbeat-ui-panel-header"');
    expect(source).toContain('chrome="transparent"');
    expect(source).not.toContain('className="bg-transparent"');
    expect(source).toContain('data-otlp-metrics-detail-panel-stickiness-owner="hertzbeat-ui-panel-surface"');
    expect(source).toContain('stickiness="top-4"');
    expect(source).not.toContain('className="xl:sticky xl:top-4 xl:self-start"');
    expect(source).toContain('data-otlp-metrics-detail-summary-stats="shared-stat-strip"');
    expect(source).toContain('data-otlp-metrics-detail-summary-stats-owner="hertzbeat-ui-stat-strip"');
    expect(source).toContain('data-otlp-metrics-detail-summary-stat-owner="hertzbeat-ui-stat-cell"');
    expect(source).toContain('frame="panel-solid"');
    expect(source).toContain('frame="flush"');
    expect(source).not.toContain('className="rounded-[3px] border border-[#252b35] bg-[#252b35] p-1"');
    expect(source).not.toContain('density="compact"\n                          className="border-0"');
    expect(source).toContain('data-otlp-metrics-detail-context-rows="shared-detail-rows"');
    expect(source).toContain('data-otlp-metrics-detail-context-rows-owner="hertzbeat-ui-detail-rows"');
    expect(source).toContain('offset="top"');
    expect(source).not.toContain('data-otlp-metrics-detail-context-rows-owner="hertzbeat-ui-detail-rows"\n                      className="mt-3"');
    expect(source).toContain('selectedSeriesContextDetailRows');
    expect(source).toContain('selectedSeriesEvidenceDetailRows');
    expect(source).toContain('entityContextDetailRows');
    expect(source).toContain('data-otlp-metrics-selected-series-context="selected-series-attribution"');
    expect(source).toContain('data-otlp-metrics-selected-series-context-owner="hertzbeat-ui-detail-rows"');
    expect(source).toContain('data-otlp-metrics-selected-series-evidence="real-sample-evidence"');
    expect(source).toContain('data-otlp-metrics-selected-series-evidence-owner="hertzbeat-ui-detail-rows"');
    expect(source).toContain('boundary="top"');
    expect(source).not.toContain('className="mt-3 border-t border-[#252b35] pt-3"');
    expect(source).toContain('data-otlp-metrics-linked-record-summary="log-trace-alert-links"');
    expect(source).toContain('data-otlp-metrics-linked-record-summary-owner="hertzbeat-ui-collapsible-section"');
    expect(source).toContain('surface="inset"');
    expect(source).toContain('data-otlp-metrics-linked-record-action={row.key}');
    expect(source).toContain('data-otlp-metrics-linked-record-handoff="shared-context-handoff"');
    expect(source).toContain('data-otlp-metrics-linked-record-handoff-owner="hertzbeat-ui-context-handoff"');
    expect(source).toContain('frame="flush"');
    expect(source).not.toContain('className="border-0"');
    expect(source).toContain('data-otlp-metrics-attribution-diagnostics="hertzbeat-attribute-diagnostics"');
    expect(source).toContain('data-otlp-metrics-attribution-diagnostics-owner="hertzbeat-ui-attribute-diagnostics"');
    expect(source).toContain('frame="embedded"');
    expect(source).not.toContain('className="rounded-none border-0 bg-transparent"');
    expect(source).toContain('attributionDiagnosticRows');
    expect(source).toContain("'data-otlp-metrics-attribution-diagnostic-state': row.state");
    expect(source).toContain("t('otlp.metrics.series.context.selected-series')");
    expect(source).toContain("t('otlp.metrics.detail.evidence.heading')");
    expect(source).toContain("t('otlp.metrics.linked-records.title')");
    expect(source).toContain("t('otlp.metrics.handoff.logs.action')");
    expect(source).toContain("t('otlp.metrics.handoff.traces.action')");
    expect(source).toContain("t('otlp.metrics.attribution.diagnostics.title')");
    expect(source).toContain('namespaceLabel="hertzbeat.*"');
    expect(source).toContain("t('otlp.metrics.detail.selected-series.aria')");
    expect(source).not.toContain('<p className="text-[11px] font-semibold text-[#8792a5]">');
    expect(source).not.toContain('grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-[#252b35] bg-[#252b35]');
    expect(source).not.toContain('className="col-span-2 min-w-0 bg-[#10141b] px-3 py-2"');
    expect(source).not.toContain('className="grid grid-cols-[minmax(0,1fr)_52px] gap-2 text-[11px]"');
    expect(source).toContain("stateLabel: row.state === 'present' ? t('otlp.metrics.attribution.state.present')");
    expect(source).not.toContain('className="grid grid-cols-[72px_minmax(0,1fr)] gap-2 text-[11px]"');
    expect(source).not.toContain('hover:border-[#344052] hover:bg-[#121823]');
    expect(source).not.toContain('<table className="w-full border-collapse text-left text-[12px]">');
    expect(source).not.toContain('className={`cursor-pointer border-b border-[#1f2530] last:border-b-0');
    expect(source).not.toContain('className="mt-3 grid gap-px overflow-hidden rounded-[3px] border border-[#252b35] bg-[#252b35] sm:grid-cols-2 xl:grid-cols-5"');
    expect(source).not.toContain('className="min-w-0 bg-[#10141b] px-2.5 py-2"');
    expect(source).not.toContain('className="mx-auto flex max-w-[280px] flex-col items-center"');
    expect(source).not.toContain('<Database className="h-8 w-8 text-[#7d8798]" aria-hidden="true" />');
    expect(source).not.toContain('<summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 text-[11px] font-semibold text-[#8792a5]">');
    expect(source).not.toContain('className="rounded-[3px] border border-[#2b3039] bg-[#101217] px-2 py-1 text-[11px] font-semibold text-[#9ca7ba]"');
    expect(source).not.toContain('<p className="text-[12px] font-semibold text-[#8792a5]">');
    expect(source).not.toContain('<h2 className="mt-2 truncate text-[18px] font-semibold text-[#f2f6fb]">{firstSeries.title}</h2>');
    expect(source).not.toContain('className="flex h-full min-w-0 flex-1 items-center justify-center rounded-[3px] border border-dashed border-[#2a303a] bg-[#0c1016] px-3 text-center"');
    expect(source).not.toContain('<p className="text-[12px] font-semibold text-[#a7b0bf]">');
    expect(source).not.toContain('<span>{workbenchState.seriesCountLabel}</span>');
    expect(source).toContain('data-otlp-metrics-workbench-grid="series-detail-split"');
    expect(source).toContain('data-otlp-metrics-workbench-grid-owner="hertzbeat-ui-workbench-layout"');
    expect(source).toContain("variant={hasMetricSeries ? 'metrics-series-detail' : 'metrics-series-only'}");
    expect(source).not.toContain("'grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]'");
    expect(source).not.toContain('xl:grid-cols-[minmax(0,1fr)_360px]');
    expect(source).not.toContain('2xl:grid-cols-[minmax(0,1fr)_330px]');
    expect(source).toContain('data-otlp-metrics-series-table="hertzbeat-ui-dense-metric-list"');
    expect(source).toContain('data-otlp-metrics-series-table-mode="service-entity-series-set"');
    expect(source).toContain('data-otlp-metrics-series-table-density="primary-scan"');
    expect(source).toContain('data-otlp-metrics-series-table-panel-owner="hertzbeat-ui-panel-surface"');
    expect(source).toContain('data-otlp-metrics-series-table-summary-owner="hertzbeat-ui-status-badge"');
    expect(source).not.toContain('className={`${panelClass} min-w-0 overflow-hidden`}');
    expect(source).toContain('data-otlp-metrics-series-set-summary-owner="hertzbeat-ui-stat-strip"');
    expect(source).toContain('data-otlp-metrics-series-set-summary="service-entity-scope"');
    expect(source).toContain('seriesSetScopeRows.map');
    expect(source).toContain("t('otlp.metrics.series.collection.title')");
    expect(source).not.toContain('<p className="text-[12px] font-semibold text-[#8792a5]">');
    expect(source).not.toContain('className="flex min-w-0 items-center justify-between gap-3"');
    expect(source).toContain('data-otlp-metrics-detail-panel="hertzbeat-ui-detail-panel"');
    expect(source).toContain('data-otlp-metrics-detail-panel-owner="hertzbeat-ui-panel-surface"');
    expect(source).toContain('data-otlp-metrics-detail-panel-priority="secondary-inspector"');
    expect(source).toContain('data-otlp-metrics-detail-panel-header-owner="hertzbeat-ui-panel-header"');
    expect(source).toContain('data-otlp-metrics-detail-panel-body="compact-evidence-stack"');
    expect(source).toContain('data-otlp-metrics-detail-panel-body-owner="hertzbeat-ui-panel-section"');
    expect(source).toContain('divider="none"');
    expect(source).not.toContain('<div data-otlp-metrics-detail-panel-body="compact-evidence-stack" className="px-4 py-3">');
    expect(source).toContain('{hasMetricSeries && selectedMetricSeries ? (');
    expect(source).toContain('data-otlp-metrics-detail-panel-empty="suppressed-until-real-series"');
    expect(source).toContain('data-otlp-metrics-detail-panel-empty-owner="hertzbeat-ui-assistive-marker"');
    expect(source).toContain('HzAssistiveMarker');
    expect(source).not.toContain('<span data-otlp-metrics-detail-panel-empty="suppressed-until-real-series" className="sr-only" />');
    expect(source).not.toContain('className={`${panelClass} min-w-0 overflow-hidden xl:sticky xl:top-4 xl:self-start`}');
    expect(source).toContain('data-otlp-metrics-secondary-context="collapsible-evidence-diagnostics"');
    expect(source).toContain('data-otlp-metrics-secondary-context-owner="hertzbeat-ui-panel-section"');
    expect(source).toContain('spacing="stack-2"');
    expect(source).not.toContain('<div data-otlp-metrics-secondary-context="collapsible-evidence-diagnostics" className="space-y-2 border-t border-[#252b35] px-4 py-3">');
    expect(source).toContain('data-otlp-metrics-linked-record-summary-panel="collapsible"');
    expect(source).toContain('data-otlp-metrics-attribution-diagnostics-panel="collapsible"');
    expect(source).toContain('data-otlp-metrics-attribution-diagnostics-panel-owner="hertzbeat-ui-collapsible-section"');
    expect(source).toContain('data-otlp-metrics-entity-context-panel="collapsible"');
    expect(source).toContain('data-otlp-metrics-entity-context-panel-owner="hertzbeat-ui-collapsible-section"');
    expect(source).toContain('data-otlp-metrics-entity-context-owner="hertzbeat-ui-detail-rows"');
    expect(source).toContain('padding="compact-y"');
    expect(source).not.toContain('className="py-2"');
    expect(source.match(/className="border-\[#252b35\] bg-\[#0d1015\]"/g) ?? []).toHaveLength(0);
    expect(source).not.toContain('<details');
    expect(source).toContain('data-otlp-metrics-handoff-actions="compact-context-actions"');
    expect(source).toContain('data-otlp-metrics-handoff-action-section="shared-panel-section"');
    expect(source).toContain('data-otlp-metrics-handoff-action-section-owner="hertzbeat-ui-panel-section"');
    expect(source).toContain('data-otlp-metrics-handoff-actions-owner="hertzbeat-ui-action-group"');
    expect(source).toContain('layout="grid-2"');
    expect(source).toContain('layout="full"');
    expect(source).not.toContain('data-otlp-metrics-entity-action="true" className="w-full px-2"');
    expect(source).not.toContain('data-otlp-metrics-alert-handling-action="true" className="w-full px-2"');
    expect(source).not.toContain('data-otlp-metrics-logs-action="true" className="w-full px-2"');
    expect(source).not.toContain('data-otlp-metrics-traces-action="true" className="w-full px-2"');
    expect(source).not.toContain('data-otlp-metrics-entities-action="true" className="w-full px-2"');
    expect(source).not.toContain('className="grid grid-cols-2 gap-2 border-t border-[#252b35] px-4 py-3"');
    expect(source).toContain('data-otlp-metrics-entity-context="hertzbeat-signal-entity-context"');
    expect(source).toContain("aria-label={t('otlp.metrics.entity-context.aria')}");
    expect(source).not.toContain('data-otlp-metrics-hertzbeat-loop="collector-template-alert-loop"');
    expect(source).toContain("t('otlp.metrics.title')");
    expect(source).toContain("t('otlp.metrics.query.run')");
    expect(source).not.toContain('data-otlp-metrics-action-row="aligned-context-actions"');
    expect(source).not.toContain('href="/setting/collector"');
    expect(source).not.toContain('href="/setting/define"');
    expect(source).toContain("t('otlp.metrics.entity-context.title')");
    expect(source).toContain("t('topology.context-link.entity')");
    expect(source).toContain("t('otlp.metrics.handoff.alerts')");
    expect(source).toContain('href={handoffLinks.alertHandlingHref}');
    expect(source).not.toContain('data-otlp-metrics-alert-context-hint="entity-trace-alert-handoff"');
    expect(source).not.toContain('data-otlp-metrics-signal-handoff-hint="metric-log-trace-context"');
    expect(source).toContain('data-otlp-metrics-entity-action="true"');
    expect(source).toContain('data-otlp-metrics-alert-handling-action="true"');
    expect(source).toContain('data-otlp-metrics-logs-action="true"');
    expect(source).toContain('data-otlp-metrics-traces-action="true"');
    expect(source).toContain('data-otlp-metrics-entities-action="true"');
    expect(source).toContain('HzButtonLink');
    expect(source).toContain('HzDisabledActionShell');
    expect(source).toContain('data-otlp-metrics-entity-action-disabled-shell-owner="hertzbeat-ui-disabled-action-shell"');
    expect(source).toContain('layout="full"');
    expect(source).not.toContain('data-otlp-metrics-entity-action-disabled-shell-owner="hertzbeat-ui-disabled-action-shell"\n                          className="w-full"');
    expect(source).not.toContain('const actionClass =');
    expect(source).not.toContain('const disabledActionClass =');
    expect(source).not.toContain('className={`${actionClass}');
    expect(source).not.toContain('className={`${disabledActionClass}');
    expect(source).toContain("const missingEntityHandoffTitle = t('otlp.metrics.handoff.entity-disabled')");
    expect(source).toContain('data-otlp-metrics-entity-action-disabled="missing-entity-id"');
    expect(source).toContain('size="md"\n                            layout="full"\n                            disabled');
    expect(source).not.toContain('data-otlp-metrics-entity-action-disabled="missing-entity-id"\n                            size="md"\n                            className="w-full px-2"');
    expect(source).toContain('title={missingEntityHandoffTitle}');
    expect(source).toContain('buildOtlpMetricsRoute');
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
    const source = readFileSync(resolve(process.cwd(), 'app/ingestion/otlp/metrics/otlp-metrics-page.tsx'), 'utf8');

    expect(source).toContain('data-otlp-metrics-run-query-action="true"');
    expect(source).not.toContain('border-[#4f6df0]');
    expect(source).not.toContain('bg-[#4566e8]');
    expect(source).not.toContain('hover:bg-[#5574f4]');
  });

  it('does not directly coerce query route primitives with Number in page context', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/ingestion/otlp/metrics/otlp-metrics-page.tsx'), 'utf8');

    expect(source).not.toContain('Number(query.start)');
    expect(source).not.toContain('Number(query.end)');
    expect(source).not.toContain('Number(query.entityId)');
    expect(source).toContain('readEpochMillisRouteParam');
  });

  it('renders the cold metrics query row, chart band, dense list, and detail panel', async () => {
    const { default: OtlpMetricsPage } = await import('./page');
    const html = renderToStaticMarkup(<OtlpMetricsPage />);

    expect(html).toContain('data-otlp-metrics-route="otlp-hertzbeat-ui-metrics-workbench"');
    expect(html).toContain('data-hz-ui="signal-workbench-shell"');
    expect(html).toContain('data-hz-signal-workbench-shell-owner="hertzbeat-ui-signal-workbench-shell"');
    expect(html).toContain('data-hz-signal-workbench-shell-layout="topology-workbench"');
    expect(html).toContain('data-otlp-metrics-shell-owner="hertzbeat-ui-signal-workbench-shell"');
    expect(html).toContain('data-hz-signal-workbench-shell-content="true"');
    expect(html).toContain('data-hz-signal-workbench-shell-content-layout="topology-workbench"');
    expect(html).toContain('class="flex w-full min-w-0 flex-col gap-0 px-4 pb-4 pt-3 xl:px-5"');
    expect(html).toContain('data-otlp-metrics-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-otlp-metrics-page-shell="flat-direct-stack"');
    expect(html).toContain('data-otlp-metrics-page-shell-layer="removed"');
    expect(html).toContain('data-otlp-metrics-page-stack="direct-panels"');
    expect(html).not.toContain('data-otlp-metrics-page-shell="full-width-no-gutters"');
    expect(html).not.toContain('data-otlp-metrics-page-shell-gutter="edge-to-edge-viewport"');
    expect(html).not.toContain('data-otlp-metrics-page-shell-top="flush-under-app-bar"');
    expect(html).toContain('data-otlp-metrics-query-bar="hertzbeat-ui-query-row"');
    expect(html).toContain('data-otlp-metrics-query-bar-owner="hertzbeat-ui-panel-surface"');
    expect(html).toContain('data-hz-panel-surface-padding="query"');
    expect(html).toContain('data-otlp-metrics-query-control-stack="shared-inline-controls"');
    expect(html).toContain('data-otlp-metrics-context-control-stack="shared-inline-controls"');
    expect(html).toContain('data-hz-control-stack-layout="inline-wrap"');
    expect(html).toContain('data-hz-control-stack-spacing="top-2"');
    expect(html).toContain('data-otlp-metrics-time-control="shared-time-context-control"');
    expect(html).toContain('data-otlp-metrics-time-control-owner="hertzbeat-ui-control-stack"');
    expect(html).toContain('data-otlp-metrics-time-range-control-owner="hertzbeat-shared-time-range-control"');
    expect(html).toContain('data-hz-ui="control-stack"');
    expect(html).toContain('data-hz-control-stack-layout="end-inline"');
    expect(html).toContain('data-otlp-metrics-time-control-placement="top-right"');
    expect(html).toContain('data-otlp-metrics-time-control-visual="narrow-top-right-rail"');
    expect(html).toContain('data-otlp-metrics-time-control-fit="no-clipping"');
    expect(html).toContain('data-otlp-metrics-header-topbar="time-context"');
    expect(html).toContain('data-otlp-metrics-header-topbar-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-hz-workbench-layout-variant="header-toolbar-slot"');
    expect(html).toContain('data-otlp-metrics-header-owner="hertzbeat-ui-panel-surface"');
    expect(html).toContain('data-hz-panel-surface-padding="query"');
    expect(html).toContain('data-otlp-metrics-header-layout="compact-title-with-aligned-toolbar"');
    expect(html).toContain('data-otlp-metrics-header-layout-frame="compact-title-with-aligned-toolbar"');
    expect(html).toContain('data-otlp-metrics-header-layout-frame-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-hz-workbench-layout-variant="metrics-header"');
    expect(html).toContain('data-otlp-metrics-title-block="operator-context"');
    expect(html).toContain('data-otlp-metrics-title-block-owner="hertzbeat-ui-workbench-header-copy"');
    expect(html).toContain('data-hz-ui="workbench-header-copy"');
    expect(html).toContain('data-hz-workbench-header-copy-density="compact"');
    expect(html).toContain('data-otlp-metrics-header-context-strip="applied-query-facts"');
    expect(html).toContain('data-otlp-metrics-header-context-strip-owner="hertzbeat-ui-toolbar-chips"');
    expect(html).toContain('data-otlp-metrics-header-context-pill-owner="hertzbeat-ui-status-badge"');
    expect(html).toContain('data-hz-status-badge-layout="context-pill"');
    expect(html).toContain('data-hz-status-badge-part="label"');
    expect(html).toContain('data-hz-status-badge-part="value"');
    expect(html).toContain('data-hz-ui="chip-group"');
    expect(html).toContain('data-hz-chip-group-align="start"');
    expect(html).toContain('data-hz-chip-group-density="compact"');
    expect(html).toContain('data-hz-chip-group-spacing="top-3"');
    expect(html).not.toContain('data-otlp-metrics-header-copy="operator-query-copy"');
    expect(html).toContain('data-otlp-metrics-toolbar-stack="same-width-time-actions"');
    expect(html).toContain('data-otlp-metrics-query-search-frame="shared-search-field-frame"');
    expect(html).toContain('data-otlp-metrics-query-search-frame-owner="hertzbeat-ui-search-field-frame"');
    expect(html).toContain('data-hz-search-field-frame-owner="hertzbeat-ui-search-field-frame"');
    expect(html).toContain('data-hz-search-field-frame-width="metrics-query"');
    expect(html).toContain('relative min-w-[320px] max-w-[560px] flex-1');
    expect(html).toContain('data-otlp-metrics-query-search-icon="metric-query"');
    expect(html).toContain('data-otlp-metrics-query-search-icon-owner="hertzbeat-ui-search-field-icon"');
    expect(html).toContain('data-hz-search-field-icon-owner="hertzbeat-ui-search-field-icon"');
    expect(html).toContain('data-otlp-metrics-query-input-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-hz-input-inset="search-icon"');
    expect(html).toContain('data-hz-input-width="metrics-query-expression"');
    expect(html).toContain('w-full font-mono');
    expect(html).toContain('data-otlp-metrics-context-input="service-name"');
    expect(html).toContain('data-otlp-metrics-context-input="namespace"');
    expect(html).toContain('data-otlp-metrics-context-input="environment"');
    expect(html).toContain('data-otlp-metrics-context-input="trace-id"');
    expect(html).toContain('data-otlp-metrics-context-input-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-hz-input-width="metrics-context"');
    expect(html).toContain('data-hz-input-width="metrics-context-compact"');
    expect(html).toContain('data-hz-input-width="metrics-trace-id"');
    expect(html).toContain('min-w-[220px] max-w-[360px] flex-1 font-mono');
    expect(html).toContain('data-hz-input-inset="none"');
    expect(html).toContain('data-otlp-metrics-aggregation-select-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-otlp-metrics-group-by-select-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-hz-ui="select"');
    expect(html).toContain('data-hz-select-width="metrics-aggregation"');
    expect(html).toContain('data-hz-select-width="metrics-group-by"');
    expect(html).toContain('data-hz-ui="select-trigger"');
    expect(html).toContain('data-otlp-metrics-query-action-group="shared-query-action-group"');
    expect(html).toContain('data-otlp-metrics-query-action-group-owner="hertzbeat-ui-query-action-group"');
    expect(html).toContain('data-hz-query-action-group-owner="hertzbeat-ui-query-action-group"');
    expect(html).toContain('data-hz-query-action-group-kind="run-reset"');
    expect(html).toContain('data-otlp-metrics-query-action-icon="run"');
    expect(html).toContain('data-otlp-metrics-query-action-icon="reset"');
    expect(html).toContain('data-otlp-metrics-query-action-icon-owner="hertzbeat-ui-button-icon"');
    expect(html).toContain('data-otlp-metrics-reset-action="true"');
    expect(html).toContain('data-hz-ui="button"');
    expect(html).toContain('data-hz-ui="button-link"');
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
    expect(html).toContain('data-otlp-metrics-chart-band="hertzbeat-ui-chart-band"');
    expect(html).toContain('data-otlp-metrics-chart-layout="wide-series-chart-with-compact-meta"');
    expect(html).toContain('data-otlp-metrics-chart-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-hz-workbench-layout-variant="chart-stack"');
    expect(html).toContain('data-otlp-metrics-series-mode="entity-series-set"');
    expect(html).not.toContain('data-otlp-metrics-chart-meta-row="compact-real-facts"');
    expect(html).not.toContain('data-otlp-metrics-facts-grid="inline-summary-strip"');
    expect(html).toContain('data-otlp-metrics-chart-panel="series-set-trend"');
    expect(html).toContain('data-otlp-metrics-chart-band-owner="hertzbeat-ui-panel-surface"');
    expect(html).toContain('data-hz-panel-surface-padding="chart"');
    expect(html).toContain('data-otlp-metrics-chart-panel-owner="hertzbeat-ui-panel-surface"');
    expect(html).toContain('data-hz-ui="panel-surface"');
    expect(html).toContain('data-hz-panel-surface-density="operator-compact"');
    expect(html).toContain('data-otlp-metrics-chart-panel-variant-owner="hertzbeat-ui-panel-surface"');
    expect(html).toContain('data-hz-panel-surface-padding="chart-inner"');
    expect(html).toContain('data-hz-panel-surface-variant="chart-inner"');
    expect(html).toContain('data-otlp-metrics-chart-header-layout="trend-toolbar"');
    expect(html).toContain('data-otlp-metrics-chart-header-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-hz-ui="workbench-layout"');
    expect(html).toContain('data-hz-workbench-layout-variant="metrics-chart-toolbar"');
    expect(html).toContain('mb-3 gap-2 text-[12px] text-[#8792a5] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center');
    expect(html).toContain('data-otlp-metrics-chart-title-label="shared-panel-title-label"');
    expect(html).toContain('data-otlp-metrics-chart-title-label-owner="hertzbeat-ui-panel-title-label"');
    expect(html).toContain('data-hz-ui="panel-title-label"');
    expect(html).toContain('data-hz-panel-title-label-density="operator-compact"');
    expect(html).toContain('data-otlp-metrics-chart-datazoom-state="local-observation"');
    expect(html).toContain('data-otlp-metrics-chart-datazoom-preserve="preserved"');
    expect(html).toContain('data-otlp-metrics-chart-series-count="toolbar-count"');
    expect(html).toContain('data-otlp-metrics-chart-series-count-owner="hertzbeat-ui-status-badge"');
    expect(html).toContain('data-otlp-metrics-trend-empty="no-real-series"');
    expect(html).toContain('data-otlp-metrics-trend-empty-owner="hertzbeat-ui-state-notice"');
    expect(html).toContain('data-otlp-metrics-trend-frame="shared-compact-bars"');
    expect(html).toContain('data-otlp-metrics-trend-frame-owner="hertzbeat-ui-trend-frame"');
    expect(html).toContain('data-hz-ui="trend-frame"');
    expect(html).toContain('data-hz-trend-frame-density="operator-compact"');
    expect(html).toContain('data-hz-ui="state-notice"');
    expect(html).toContain('data-hz-state-variant="hint"');
    expect(html).toContain('data-hz-state-frame="trend-empty"');
    expect(html).toContain('data-hz-state-hint-owner="hertzbeat-ui-state-notice"');
    expect(html).toContain(tZh('otlp.metrics.trend.empty.title'));
    expect(html).toContain(tZh('otlp.metrics.trend.empty.copy'));
    expect(html).toContain('data-otlp-metrics-empty-guidance="operator-no-data-guidance"');
    expect(html).toContain('data-otlp-metrics-empty-state="honest-no-series"');
    expect(html).toContain('data-otlp-metrics-empty-state-context="applied-query-visible"');
    expect(html).toContain(tZh('otlp.metrics.explorer.no-metrics-title'));
    expect(html).not.toContain('data-otlp-metrics-trend-bar="empty-series-placeholder"');
    expect(html).toContain('data-otlp-metrics-workbench-grid="series-detail-split"');
    expect(html).toContain('data-otlp-metrics-workbench-grid-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-hz-ui="workbench-layout"');
    expect(html).toContain('data-hz-workbench-layout-variant="metrics-series-only"');
    expect(html).toContain('data-otlp-metrics-series-table="hertzbeat-ui-dense-metric-list"');
    expect(html).toContain('data-otlp-metrics-series-table-mode="service-entity-series-set"');
    expect(html).toContain('data-otlp-metrics-series-table-density="primary-scan"');
    expect(html).toContain('data-otlp-metrics-series-table-owner="hertzbeat-ui-data-table"');
    expect(html).toContain('data-otlp-metrics-series-table-panel-owner="hertzbeat-ui-panel-surface"');
    expect(html).toContain('data-hz-ui="panel-surface"');
    expect(html).toContain('data-hz-panel-surface-clip="true"');
    expect(html).toContain('data-otlp-metrics-series-table-header="shared-panel-header"');
    expect(html).toContain('data-otlp-metrics-series-table-header-owner="hertzbeat-ui-panel-header"');
    expect(html).toContain('data-hz-ui="panel-header"');
    expect(html).toContain('data-hz-panel-header-density="operator-compact"');
    expect(html).toContain('data-hz-panel-header-chrome="transparent-topless"');
    expect(html).toContain('data-otlp-metrics-series-table-summary-owner="hertzbeat-ui-status-badge"');
    expect(html).toContain('data-hz-ui="status-badge"');
    expect(html).toContain('data-hz-status-size="xs"');
    expect(html).toContain('data-otlp-metrics-series-set-summary-owner="hertzbeat-ui-stat-strip"');
    expect(html).toContain('data-otlp-metrics-series-set-summary-section="shared-panel-section"');
    expect(html).toContain('data-otlp-metrics-series-set-summary-section-owner="hertzbeat-ui-panel-section"');
    expect(html).toContain('data-hz-panel-section-owner="hertzbeat-ui-panel-section"');
    expect(html).toContain('data-hz-panel-section-padding="summary"');
    expect(html).toContain('data-otlp-metrics-series-set-summary-strip="shared-stat-strip"');
    expect(html).toContain('data-otlp-metrics-series-set-summary-strip-owner="hertzbeat-ui-stat-strip"');
    expect(html).toContain('data-hz-stat-strip-frame="panel-inset"');
    expect(html).toContain('data-hz-stat-strip-spacing="compact"');
    expect(html).toContain('data-otlp-metrics-series-set-summary-cell-owner="hertzbeat-ui-stat-cell"');
    expect(html).toContain('data-hz-ui="stat-strip"');
    expect(html).toContain('data-hz-ui="stat-cell"');
    expect(html).toContain('data-otlp-metrics-series-data-table="shared-data-table"');
    expect(html).toContain('data-otlp-metrics-series-data-table-owner="hertzbeat-ui-data-table"');
    expect(html).toContain('data-hz-ui="data-table"');
    expect(html).toContain('data-hz-data-table-variant="embedded"');
    expect(html).toContain('data-otlp-metrics-series-table-empty-state="shared-empty-state"');
    expect(html).toContain('data-otlp-metrics-series-table-empty-state-owner="hertzbeat-ui-empty-state"');
    expect(html).toContain('data-hz-ui="empty-state"');
    expect(html).toContain('data-hz-empty-state-layout="table-panel"');
    expect(html).toContain('data-otlp-metrics-series-set-summary="service-entity-scope"');
    expect(html).not.toContain('data-otlp-metrics-detail-panel="hertzbeat-ui-detail-panel"');
    expect(html).toContain('data-otlp-metrics-detail-panel-empty="suppressed-until-real-series"');
    expect(html).toContain('data-otlp-metrics-detail-panel-empty-owner="hertzbeat-ui-assistive-marker"');
    expect(html).toContain('data-hz-ui="assistive-marker"');
    expect(html).toContain('data-hz-assistive-marker-visibility="sr-only"');
    expect(html).not.toContain('data-otlp-metrics-detail-panel-body="compact-evidence-stack"');
    expect(html).not.toContain('data-otlp-metrics-secondary-context="collapsible-evidence-diagnostics"');
    expect(html).not.toContain('data-otlp-metrics-entity-context-panel="collapsible"');
    expect(html).not.toContain('data-otlp-metrics-handoff-actions="compact-context-actions"');
    expect(html).not.toContain('data-otlp-metrics-entity-context="hertzbeat-signal-entity-context"');
    expect(html).not.toContain('data-otlp-metrics-hertzbeat-loop="collector-template-alert-loop"');
    expect(html).toContain(tZh('otlp.metrics.title'));
    expect(html).toContain(tZh('otlp.metrics.field.service'));
    expect(html).toContain('checkout');
    expect(html).toContain(tZh('otlp.metrics.field.namespace'));
    expect(html).toContain('payments');
    expect(html).toContain(tZh('otlp.metrics.query.aria'));
    expect(html).toContain(tZh('otlp.metrics.field.group-by'));
    expect(html).toContain(tZh('otlp.metrics.aggregation.aria'));
    expect(html).toContain(tZh('otlp.metrics.trend.title'));
    expect(html).toContain(tZh('otlp.metrics.series.collection.title'));
    expect(html).toContain(tZh('otlp.metrics.scope.service'));
    expect(html).toContain(tZh('otlp.metrics.scope.series'));
    expect(html).toContain(tZh('otlp.metrics.context.time-range'));
    expect(html).toContain(tZh('otlp.metrics.query.run'));
    expect(html).toContain('data-otlp-metrics-header-actions="removed"');
    expect(html).not.toContain('data-otlp-metrics-action-row="aligned-context-actions"');
    expect(html).not.toContain('status=firing');
    expect(html).not.toContain('Summary');
    expect(html).not.toContain('Explorer');
    expect(html).not.toContain('Views');
    expect(html).not.toContain('Run Query');
    expect(html).not.toContain('Save this view');
    expect(html).not.toContain('Create an Alert');
    expect(html).not.toContain('Add to Dashboard');
    expect(html).not.toContain('Sending metrics to SigNoZ');
    expect(html).not.toContain('>service.name<');
  });

  it('renders a shared return action when metrics inherit a trace return path', async () => {
    mockState.searchParams = new URLSearchParams(
      'traceId=trace-123&spanId=span-456&serviceName=checkout&returnTo=%2Ftrace%2Fmanage%3FtraceId%3Dtrace-123%26spanId%3Dspan-456%26serviceName%3Dcheckout'
    );
    const { default: OtlpMetricsPage } = await import('./page');

    const html = renderToStaticMarkup(<OtlpMetricsPage />);

    expect(html).toContain('data-otlp-metrics-return-action-group-owner="hertzbeat-ui-action-group"');
    expect(html).toContain('data-hz-action-group-layout="full-end"');
    expect(html).toContain('data-otlp-metrics-return-action="true"');
    expect(html).toContain('data-otlp-metrics-header-action="return-source"');
    expect(html).toContain('data-otlp-metrics-header-action-icon="return-source"');
    expect(html).toContain('data-otlp-metrics-header-action-icon-owner="hertzbeat-ui-button-icon"');
    expect(html).toContain('href="/trace/manage?traceId=trace-123&amp;spanId=span-456&amp;serviceName=checkout"');
    expect(html).toContain(tZh('otlp.metrics.route.action.return-source'));
  });

  it('does not show fake zero metric cards or a selected-series inspector when no real series exists', async () => {
    mockState.metricSeries = [];

    const { default: OtlpMetricsPage } = await import('./page');
    const html = renderToStaticMarkup(<OtlpMetricsPage />);

    expect(html).toContain('data-otlp-metrics-empty-state="honest-no-series"');
    expect(html).toContain('data-otlp-metrics-empty-state-context="applied-query-visible"');
    expect(html).toContain('data-otlp-metrics-trend-empty-owner="hertzbeat-ui-state-notice"');
    expect(html).toContain('data-hz-state-frame="trend-empty"');
    expect(html).toContain('data-otlp-metrics-trend-frame-owner="hertzbeat-ui-trend-frame"');
    expect(html).toContain('data-otlp-metrics-detail-panel-empty="suppressed-until-real-series"');
    expect(html).toContain('data-otlp-metrics-detail-panel-empty-owner="hertzbeat-ui-assistive-marker"');
    expect(html).toContain('data-hz-ui="assistive-marker"');
    expect(html).not.toContain('data-otlp-metrics-facts-grid="inline-summary-strip"');
    expect(html).not.toContain('data-otlp-metrics-detail-panel="hertzbeat-ui-detail-panel"');
    expect(html).not.toContain('data-otlp-metrics-detail-panel-body="compact-evidence-stack"');
    expect(html).not.toContain('data-otlp-metrics-handoff-actions="compact-context-actions"');
    expect(html).not.toContain('data-otlp-metrics-entity-action-disabled="missing-entity-id"');
    expect(html).not.toContain('data-otlp-metrics-facts-grid="inline-summary-strip"');
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
    expect(html).toContain('data-echarts-panel-edge="metrics-chart"');
    expect(html).toContain('data-otlp-metrics-echarts-edge="shared-metrics-chart"');
    expect(html).toContain('data-otlp-metrics-echarts-edge-owner="hertzbeat-ui-echarts-panel"');
    expect(html).toContain('data-echarts-panel-preserve-datazoom="true"');
    expect(html).toContain('data-otlp-metrics-chart-datazoom-state="local-observation"');
    expect(html).toContain('data-otlp-metrics-chart-datazoom-preserve="preserved"');
    expect(html).toContain('data-otlp-metrics-chart-zoom-apply="local-to-query-time"');
    expect(html).toContain('data-otlp-metrics-chart-zoom-apply-owner="hertzbeat-ui-button"');
    expect(html).toContain('data-otlp-metrics-chart-zoom-apply-state="idle"');
    expect(html).toContain('data-hz-ui="button"');
    expect(html).toContain('data-hz-control-height="28"');
    expect(html).not.toContain('data-otlp-metrics-chart-zoom-draft="pending-query-time"');
    expect(html).toContain('data-otlp-metrics-chart-meta-row="compact-real-facts"');
    expect(html).toContain('data-otlp-metrics-chart-meta-row-owner="hertzbeat-ui-toolbar-chips"');
    expect(html).toContain('data-otlp-metrics-chart-toolbar-actions="shared-toolbar-actions"');
    expect(html).toContain('data-otlp-metrics-chart-toolbar-actions-owner="hertzbeat-ui-action-group"');
    expect(html).toContain('data-hz-ui="action-group"');
    expect(html).toContain('data-hz-action-group-layout="end-wrap"');
    expect(html).toContain('data-otlp-metrics-chart-meta-fact="true"');
    expect(html).toContain('data-otlp-metrics-chart-meta-fact-owner="hertzbeat-ui-status-badge"');
    expect(html).toContain('data-hz-ui="chip-group"');
    expect(html).toContain('data-hz-chip-group-density="compact"');
    expect(html).toContain('data-hz-ui="status-badge"');
    expect(html).toContain('data-hz-status-badge-layout="metric-fact"');
    expect(html).toContain('data-hz-status-badge-part="label"');
    expect(html).toContain('data-hz-status-badge-part="value"');
    expect(html).not.toContain('data-otlp-metrics-facts-grid="inline-summary-strip"');
    expect(html).toContain('disabled=""');
    expect(html).toContain(tZh('time.context.zoom.apply'));
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
    expect(applyAction?.getAttribute('data-otlp-metrics-chart-zoom-apply-owner')).toBe('hertzbeat-ui-button');
    expect(applyAction?.getAttribute('data-hz-ui')).toBe('button');
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
    expect(applyAction?.getAttribute('data-otlp-metrics-chart-zoom-apply-owner')).toBe('hertzbeat-ui-button');
    expect(applyAction?.getAttribute('data-hz-ui')).toBe('button');
    expect(applyAction?.getAttribute('data-otlp-metrics-chart-zoom-apply-state')).toBe('ready');
    const zoomDraft = interactionContainer.querySelector('[data-otlp-metrics-chart-zoom-draft="pending-query-time"]') as HTMLElement | null;
    expect(zoomDraft).not.toBeNull();
    expect(zoomDraft?.getAttribute('data-otlp-metrics-chart-zoom-draft-owner')).toBe('hertzbeat-ui-status-badge');
    expect(zoomDraft?.getAttribute('data-hz-ui')).toBe('status-badge');
    expect(zoomDraft?.getAttribute('data-hz-status-tone')).toBe('info');
    expect(zoomDraft?.getAttribute('data-hz-status-badge-layout')).toBe('zoom-draft');
    expect(zoomDraft?.getAttribute('data-otlp-metrics-chart-zoom-draft-state')).toBe('pending');
    expect(zoomDraft?.querySelector('[data-hz-status-badge-part="label"]')).not.toBeNull();
    expect(zoomDraft?.querySelector('[data-hz-status-badge-part="value"]')).not.toBeNull();
    expect(zoomDraft?.textContent).toContain('1970-01-01 08:00:01');
    expect(zoomDraft?.textContent).toContain('1970-01-01 08:00:02');
    expect(startInput?.getAttribute('data-time-range-absolute-input-format')).toBe('local-datetime');
    expect(endInput?.getAttribute('data-time-range-absolute-input-format')).toBe('local-datetime');
    expect(startInput?.value).toBe('');
    expect(endInput?.value).toBe('');
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
    expect(href).toContain('from=1970-01-01+08%3A00%3A01');
    expect(href).toContain('to=1970-01-01+08%3A00%3A02');
    expect(href).not.toContain('start=1500');
    expect(href).not.toContain('end=2500');
    expect(href).not.toContain('refresh=30');
    expect(href).toContain('live=false');
    expect(href).toContain('timezone=Asia%2FShanghai');
    expect(href).not.toContain('tz=Asia%2FShanghai');
  });

  it('keeps the metrics top-right toolbar on the shared time control contract', async () => {
    mockState.searchParams = new URLSearchParams('timeRange=last-6h&refresh=30&live=true&tz=Asia%2FShanghai');
    const source = readFileSync(resolve(process.cwd(), 'app/ingestion/otlp/metrics/otlp-metrics-page.tsx'), 'utf8');

    const { default: OtlpMetricsPage } = await import('./page');
    const html = renderToStaticMarkup(<OtlpMetricsPage />);

    expect(source).toContain('data-otlp-metrics-time-control-placement="top-right"');
    expect(source).toContain('data-otlp-metrics-time-toolbar="top-right-corner"');
    expect(source).toContain('data-otlp-metrics-time-toolbar-owner="hertzbeat-ui-workbench-layout"');
    expect(source).toContain('data-otlp-metrics-header-topbar="time-context"');
    expect(source).toContain('data-otlp-metrics-header-topbar-owner="hertzbeat-ui-workbench-layout"');
    expect(source).toContain('data-otlp-metrics-toolbar-stack="same-width-time-actions"');
    expect(source).toContain('variant="header-toolbar-slot"');
    expect(source).toContain('variant="time-toolbar"');
    expect(source).toContain('data-otlp-metrics-time-control-visual="narrow-top-right-rail"');
    expect(source).toContain('data-otlp-metrics-time-control-fit="no-clipping"');
    expect(source).toContain('variant="narrow-rail"');
    expect(source).toContain('data-otlp-metrics-title-block="operator-context"');
    expect(source).toContain('data-otlp-metrics-title-block-owner="hertzbeat-ui-workbench-header-copy"');
    expect(source).not.toContain('xl:grid-cols-[minmax(0,1fr)_auto]');
    expect(source).not.toContain('data-otlp-metrics-time-control-layout="compact-rail"');
    expect(source).not.toContain('data-otlp-metrics-time-control="shared-time-context-control" className="min-w-[520px] flex-1"');
    expect(source).not.toContain('className="flex min-w-0 justify-end xl:justify-self-end"');
    expect(source).not.toContain('className="flex w-full max-w-[1120px] flex-wrap justify-end gap-2"');
    expect(source).not.toContain('className="flex w-full justify-end"');
    expect(source).toContain('data-otlp-metrics-time-control-owner="hertzbeat-ui-control-stack"');
    expect(source).toContain('data-otlp-metrics-time-range-control-owner="hertzbeat-shared-time-range-control"');
    expect(source).toContain('layout="end-inline"');
    expect(source).not.toContain('variant="narrow-rail"\n                          className="justify-end"');
    expect(source.indexOf('data-otlp-metrics-time-control="shared-time-context-control"')).toBeLessThan(
      source.indexOf('data-otlp-metrics-query-bar="hertzbeat-ui-query-row"')
    );
    expect(html).toContain('data-otlp-metrics-time-control="shared-time-context-control"');
    expect(html).toContain('data-otlp-metrics-time-control-owner="hertzbeat-ui-control-stack"');
    expect(html).toContain('data-otlp-metrics-time-range-control-owner="hertzbeat-shared-time-range-control"');
    expect(html).toContain('data-hz-ui="control-stack"');
    expect(html).toContain('data-hz-control-stack-layout="end-inline"');
    expect(html).toContain('data-otlp-metrics-time-control-placement="top-right"');
    expect(html).toContain('data-otlp-metrics-time-toolbar="top-right-corner"');
    expect(html).toContain('data-otlp-metrics-time-toolbar-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-otlp-metrics-toolbar-stack="same-width-time-actions"');
    expect(html).toContain('data-otlp-metrics-header-topbar-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-hz-workbench-layout-variant="header-toolbar-slot"');
    expect(html).toContain('data-hz-workbench-layout-variant="time-toolbar"');
    expect(html).toContain('grid min-w-0 ml-auto w-full max-w-[1120px] justify-end gap-2 xl:w-auto');
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
    const aggregationSelect = interactionContainer.querySelector('[data-otlp-metrics-aggregation-select="true"]') as HTMLElement | null;
    const groupBySelect = interactionContainer.querySelector('[data-otlp-metrics-group-by-select="true"]') as HTMLElement | null;
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
      timeRangeSelect!.value = 'last-1h';
      timeRangeSelect!.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });

    await act(async () => {
      aggregationSelect!.querySelector('[data-hz-ui="select-trigger"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    await act(async () => {
      aggregationSelect!.querySelector('[data-otlp-metrics-aggregation-option="sum"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    await act(async () => {
      groupBySelect!.querySelector('[data-hz-ui="select-trigger"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    await act(async () => {
      groupBySelect!.querySelector('[data-otlp-metrics-group-by-option="service_name"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
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
    expect(href).not.toContain('refresh=30');
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
    expect(initialEntityCells[0]?.getAttribute('data-hz-ui')).toBe('data-cell-stack');
    expect(initialEntityCells[0]?.getAttribute('data-otlp-metrics-series-entity-owner')).toBe('hertzbeat-ui-data-cell-stack');
    expect(initialEntityCells[0]?.getAttribute('data-hz-data-cell-stack-width')).toBe('metrics-entity');
    expect(initialEntityCells[0]?.className).toContain('min-w-[140px]');
    const initialEntityLabel = initialEntityCells[0]?.querySelector('[data-otlp-metrics-series-entity-label-owner="hertzbeat-ui-data-cell-text"]') as HTMLElement | null;
    const initialEntityMeta = initialEntityCells[0]?.querySelector('[data-otlp-metrics-series-entity-meta-owner="hertzbeat-ui-data-cell-text"]') as HTMLElement | null;
    const initialLatestValue = interactionContainer.querySelector('[data-otlp-metrics-series-latest-owner="hertzbeat-ui-data-cell-text"]') as HTMLElement | null;
    expect(initialEntityLabel?.getAttribute('data-hz-data-cell-tone')).toBe('strong');
    expect(initialEntityLabel?.getAttribute('data-hz-data-cell-weight')).toBe('semibold');
    expect(initialEntityMeta?.getAttribute('data-hz-data-cell-tone')).toBe('success');
    expect(initialEntityMeta?.getAttribute('data-hz-data-cell-casing')).toBe('plain');
    expect(initialEntityMeta?.getAttribute('data-otlp-metrics-series-entity-state')).toBe('present');
    expect(initialLatestValue?.getAttribute('data-hz-data-cell-tone')).toBe('bright');
    expect(initialLatestValue?.getAttribute('data-hz-data-cell-font')).toBe('mono');

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
    expect(evidencePanel?.getAttribute('data-otlp-metrics-selected-series-evidence-owner')).toBe('hertzbeat-ui-detail-rows');
    expect(evidencePanel?.getAttribute('data-hz-detail-rows-owner')).toBe('hertzbeat-ui-detail-rows');
    expect(evidencePanel?.getAttribute('data-hz-detail-rows-boundary')).toBe('top');
    expect(evidencePanel?.textContent).toContain(tZh('otlp.metrics.detail.evidence.heading'));
    expect(evidencePanel?.textContent).toContain(tZh('otlp.metrics.evidence.sample-window'));
    const detailBody = interactionContainer.querySelector('[data-otlp-metrics-detail-panel-body="compact-evidence-stack"]') as HTMLElement | null;
    expect(detailBody).not.toBeNull();
    expect(detailBody?.getAttribute('data-otlp-metrics-detail-panel-body-owner')).toBe('hertzbeat-ui-panel-section');
    expect(detailBody?.getAttribute('data-hz-panel-section-owner')).toBe('hertzbeat-ui-panel-section');
    expect(detailBody?.getAttribute('data-hz-panel-section-divider')).toBe('none');
    expect(evidencePanel?.textContent).toContain(tZh('otlp.metrics.evidence.real-sample-time'));
    expect(evidencePanel?.textContent).toContain(tZh('otlp.metrics.evidence.linked-trace'));
    expect(evidencePanel?.textContent).toContain('trace-inventory');
    const sampleHelper = interactionContainer.querySelector('[data-otlp-metrics-trend-sample-helper="real-sample-count"]') as HTMLElement | null;
    expect(sampleHelper).not.toBeNull();
    expect(sampleHelper?.getAttribute('data-otlp-metrics-trend-sample-helper-owner')).toBe('hertzbeat-ui-data-meta-text');
    expect(sampleHelper?.getAttribute('data-hz-ui')).toBe('data-meta-text');
    expect(sampleHelper?.getAttribute('data-hz-data-meta-spacing')).toBe('trend-helper');
    expect(sampleHelper?.textContent).toContain('-');
    const selectedContextPanel = interactionContainer.querySelector('[data-otlp-metrics-selected-series-context="selected-series-attribution"]') as HTMLElement | null;
    expect(selectedContextPanel?.getAttribute('data-otlp-metrics-selected-series-context-owner')).toBe('hertzbeat-ui-detail-rows');
    expect(selectedContextPanel?.getAttribute('data-hz-detail-rows-owner')).toBe('hertzbeat-ui-detail-rows');
    expect(selectedContextPanel?.getAttribute('data-hz-detail-rows-boundary')).toBe('top');
    expect(selectedContextPanel?.textContent).toContain(tZh('otlp.metrics.series.context.selected-series'));
    expect(selectedContextPanel?.textContent).toContain('fastapi');
    const detailPanelHeader = interactionContainer.querySelector('[data-otlp-metrics-detail-panel-header="shared-panel-header"]') as HTMLElement | null;
    const detailPanel = interactionContainer.querySelector('[data-otlp-metrics-detail-panel="hertzbeat-ui-detail-panel"]') as HTMLElement | null;
    const detailGrid = interactionContainer.querySelector('[data-otlp-metrics-workbench-grid="series-detail-split"]') as HTMLElement | null;
    expect(detailGrid?.getAttribute('data-otlp-metrics-workbench-grid-owner')).toBe('hertzbeat-ui-workbench-layout');
    expect(detailGrid?.getAttribute('data-hz-ui')).toBe('workbench-layout');
    expect(detailGrid?.getAttribute('data-hz-workbench-layout-variant')).toBe('metrics-series-detail');
    expect(detailPanel?.getAttribute('data-otlp-metrics-detail-panel-owner')).toBe('hertzbeat-ui-panel-surface');
    expect(detailPanel?.getAttribute('data-hz-ui')).toBe('panel-surface');
    expect(detailPanel?.getAttribute('data-hz-panel-surface-clip')).toBe('true');
    expect(detailPanel?.getAttribute('data-otlp-metrics-detail-panel-stickiness-owner')).toBe('hertzbeat-ui-panel-surface');
    expect(detailPanel?.getAttribute('data-hz-panel-surface-stickiness')).toBe('top-4');
    expect(detailPanelHeader?.getAttribute('data-otlp-metrics-detail-panel-header-owner')).toBe('hertzbeat-ui-panel-header');
    expect(detailPanelHeader?.getAttribute('data-hz-ui')).toBe('panel-header');
    expect(detailPanelHeader?.getAttribute('data-hz-panel-header-owner')).toBe('hertzbeat-ui-panel-header');
    expect(detailPanelHeader?.getAttribute('data-hz-panel-header-chrome')).toBe('transparent');
    expect(detailPanelHeader?.textContent).toContain(tZh('otlp.metrics.detail.eyebrow'));
    expect(detailPanelHeader?.textContent).toContain('db.client.duration');
    const detailSummaryStats = interactionContainer.querySelector('[data-otlp-metrics-detail-summary-stats="shared-stat-strip"]') as HTMLElement | null;
    expect(detailSummaryStats?.getAttribute('data-otlp-metrics-detail-summary-stats-owner')).toBe('hertzbeat-ui-stat-strip');
    expect(detailSummaryStats?.getAttribute('data-hz-stat-strip-owner')).toBe('hertzbeat-ui-stat-strip');
    expect(detailSummaryStats?.getAttribute('data-hz-stat-strip-frame')).toBe('panel-solid');
    expect(detailSummaryStats?.querySelectorAll('[data-otlp-metrics-detail-summary-stat-owner="hertzbeat-ui-stat-cell"]')).toHaveLength(3);
    expect(detailSummaryStats?.querySelector('[data-otlp-metrics-detail-summary-stat-owner="hertzbeat-ui-stat-cell"]')?.getAttribute('data-hz-stat-frame')).toBe('flush');
    const detailContextRows = interactionContainer.querySelector('[data-otlp-metrics-detail-context-rows="shared-detail-rows"]') as HTMLElement | null;
    expect(detailContextRows?.getAttribute('data-otlp-metrics-detail-context-rows-owner')).toBe('hertzbeat-ui-detail-rows');
    expect(detailContextRows?.getAttribute('data-hz-detail-rows-owner')).toBe('hertzbeat-ui-detail-rows');
    expect(detailContextRows?.getAttribute('data-hz-detail-rows-offset')).toBe('top');
    expect(detailContextRows?.textContent).toContain(tZh('otlp.metrics.detail.query-context'));
    const entityContextRows = interactionContainer.querySelector('[data-otlp-metrics-entity-context="hertzbeat-signal-entity-context"] [data-otlp-metrics-entity-context-owner="hertzbeat-ui-detail-rows"]') as HTMLElement | null;
    expect(entityContextRows?.getAttribute('data-hz-detail-rows-owner')).toBe('hertzbeat-ui-detail-rows');
    expect(entityContextRows?.getAttribute('data-hz-detail-rows-padding')).toBe('compact-y');
    expect(entityContextRows?.textContent).toContain(tZh('otlp.metrics.entity-context.title'));

    const logHref = (interactionContainer.querySelector('[data-otlp-metrics-logs-action="true"]') as HTMLAnchorElement | null)?.href;
    const traceHref = (interactionContainer.querySelector('[data-otlp-metrics-traces-action="true"]') as HTMLAnchorElement | null)?.href;
    const entityHref = (interactionContainer.querySelector('[data-otlp-metrics-entity-action="true"]') as HTMLAnchorElement | null)?.href;
    const alertHref = (interactionContainer.querySelector('[data-otlp-metrics-alert-handling-action="true"]') as HTMLAnchorElement | null)?.href;
    const handoffSection = interactionContainer.querySelector('[data-otlp-metrics-handoff-action-section="shared-panel-section"]') as HTMLElement | null;
    const handoffGroup = interactionContainer.querySelector('[data-otlp-metrics-handoff-actions="compact-context-actions"]') as HTMLElement | null;

    expect(handoffSection?.getAttribute('data-otlp-metrics-handoff-action-section-owner')).toBe('hertzbeat-ui-panel-section');
    expect(handoffSection?.getAttribute('data-hz-ui')).toBe('panel-section');
    expect(handoffSection?.getAttribute('data-hz-panel-section-divider')).toBe('top');
    expect(handoffGroup?.getAttribute('data-otlp-metrics-handoff-actions-owner')).toBe('hertzbeat-ui-action-group');
    expect(handoffGroup?.getAttribute('data-hz-action-group-owner')).toBe('hertzbeat-ui-action-group');
    expect(handoffGroup?.getAttribute('data-hz-action-group-layout')).toBe('grid-2');
    expect(handoffGroup?.querySelectorAll('[data-hz-ui="button-link"]')).toHaveLength(5);
    handoffGroup?.querySelectorAll('[data-hz-ui="button-link"]').forEach(link => {
      expect(link.getAttribute('data-hz-button-link-layout')).toBe('full');
    });

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

    expect(html).toContain('data-otlp-metrics-secondary-context="collapsible-evidence-diagnostics"');
    expect(html).toContain('data-otlp-metrics-secondary-context-owner="hertzbeat-ui-panel-section"');
    expect(html).toContain('data-hz-ui="panel-section"');
    expect(html).toContain('data-hz-panel-section-divider="top"');
    expect(html).toContain('data-hz-panel-section-spacing="stack-2"');
    expect(html).toContain('data-otlp-metrics-linked-record-summary="log-trace-alert-links"');
    expect(html).toContain('data-otlp-metrics-linked-record-summary-owner="hertzbeat-ui-collapsible-section"');
    expect(html).toContain('data-hz-ui="collapsible-section"');
    expect(html).toContain('data-hz-collapsible-owner="hertzbeat-ui-collapsible-section"');
    expect(html).toContain('data-hz-collapsible-surface="inset"');
    expect(html).toContain('data-hz-collapsible-summary-owner="hertzbeat-ui-collapsible-section"');
    expect(html).toContain('data-hz-collapsible-body-owner="hertzbeat-ui-collapsible-section"');
    expect(html).toContain('data-otlp-metrics-linked-record-handoff="shared-context-handoff"');
    expect(html).toContain('data-otlp-metrics-linked-record-handoff-owner="hertzbeat-ui-context-handoff"');
    expect(html).toContain('data-hz-ui="context-handoff"');
    expect(html).toContain('data-hz-context-handoff-owner="hertzbeat-ui-context-handoff"');
    expect(html).toContain('data-hz-context-handoff-frame="flush"');
    expect(html).toContain(tZh('otlp.metrics.linked-records.title'));
    expect(html).toContain(tZh('otlp.metrics.linked-records.handoff.title'));
    expect(html).toContain(tZh('otlp.metrics.handoff.logs'));
    expect(html).toContain(tZh('otlp.metrics.handoff.logs-by-trace'));
    expect(html).toContain(tZh('otlp.metrics.handoff.logs-current-span'));
    expect(html).toContain(tZh('otlp.metrics.handoff.traces'));
    expect(html).toContain(tZh('otlp.metrics.handoff.trace-full-current-span'));
    expect(html).toContain(tZh('otlp.metrics.handoff.alerts'));
    expect(html).toContain(tZh('otlp.metrics.handoff.alerts-by-entity-meta'));
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
    expect(html).toContain('data-otlp-metrics-entity-action-disabled-shell-owner="hertzbeat-ui-disabled-action-shell"');
    expect(html).toContain('data-hz-disabled-action-shell-owner="hertzbeat-ui-disabled-action-shell"');
    expect(html).toContain('data-hz-button-layout="full"');
    expect(html).toContain('data-otlp-metrics-attribution-diagnostics="hertzbeat-attribute-diagnostics"');
    expect(html).toContain('data-otlp-metrics-attribution-diagnostics-owner="hertzbeat-ui-attribute-diagnostics"');
    expect(html).toContain('data-hz-attribute-diagnostics-owner="hertzbeat-ui-attribute-diagnostics"');
    expect(html).toContain('data-hz-attribute-diagnostics-frame="embedded"');
    expect(html).toContain('data-hz-attribute-diagnostic-row="true"');
    expect(html).toContain('data-hz-attribute-diagnostic-badge="true"');
    expect(html).toContain(tZh('otlp.metrics.attribution.diagnostics.title'));
    expect(html).toContain('hertzbeat.entity_id');
    expect(html).toContain(tZh('otlp.metrics.attribution.entity-id.missing'));
    expect(html).toContain('hertzbeat.collector');
    expect(html).toContain('collector-local');
    expect(html).toContain('hertzbeat.template');
    expect(html).toContain('jvm');
    expect(html).toContain(`title="${tZh('otlp.metrics.handoff.entity-disabled')}"`);
    expect(html).toContain(`aria-label="${tZh('otlp.metrics.handoff.entity-disabled')}"`);
    expect(html).not.toContain('data-otlp-metrics-entity-action="true" href="/entities/');
    expect(html).toContain('/entities?search=self-monitor');
  });
});
