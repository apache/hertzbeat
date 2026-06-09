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
const originalFetch = globalThis.fetch;

function tZh(key: string, params?: TranslationParams) {
  return zhT(key, params);
}

async function flushDashboardEditPromises() {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
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
        if (key === 'inspector') return;
        if (key === 'series') return;
        if (key === 'legendFormat') return;
        if (key === 'formula') return;
        if (key === 'inventorySearch' || key === 'inventorySort' || key === 'inventoryPageSize' || key === 'inventoryPageIndex') return;
        if (key === 'seriesAttributeSearch') return;
        if (key === 'warningThreshold' || key === 'criticalThreshold') return;
        if (key === 'expectedRange') return;
        params.set(key, String(value));
      }
    });
    const search = params.toString();
    return `/api/otlp/v1/metrics${search ? `?${search}` : ''}`;
  },
  queryStateFromParams: (params: { get(key: string): string | null }) => ({
    query: params.get('query') || undefined,
    series: params.get('series') || undefined,
    filter: params.get('filter') || undefined,
    aggregation: params.get('aggregation') || undefined,
    temporalAggregation: params.get('temporalAggregation') || undefined,
    groupBy: params.get('groupBy') || undefined,
    legendFormat: params.get('legendFormat') || undefined,
    formula: params.get('formula') || undefined,
    inventorySearch: params.get('inventorySearch') || undefined,
    inventorySort: params.get('inventorySort') || undefined,
    inventoryPageSize: params.get('inventoryPageSize') || undefined,
    inventoryPageIndex: params.get('inventoryPageIndex') || undefined,
    seriesAttributeSearch: params.get('seriesAttributeSearch') || undefined,
    relatedMetricSource: params.get('relatedMetricSource') || undefined,
    relatedMetricFamily: params.get('relatedMetricFamily') || undefined,
    relatedMetricReason: params.get('relatedMetricReason') || undefined,
    relatedMetricMatchedLabels: params.get('relatedMetricMatchedLabels') || undefined,
    relatedMetricResourceMatch: params.get('relatedMetricResourceMatch') || undefined,
    step: params.get('step') || undefined,
    limit: params.get('limit') || undefined,
    timeRange: params.get('timeRange') || undefined,
    collector: params.get('collector') || undefined,
    template: params.get('template') || undefined,
    entityId: params.get('entityId') || undefined,
    entityName: params.get('entityName') || undefined,
    returnTo: params.get('returnTo') || undefined,
    traceId: params.get('traceId') || undefined,
    spanId: params.get('spanId') || undefined,
    inspector: params.get('inspector') === 'table' ? 'table' : 'graph',
    warningThreshold: params.get('warningThreshold') || undefined,
    criticalThreshold: params.get('criticalThreshold') || undefined,
    expectedRange: params.get('expectedRange') === 'on' ? 'on' : undefined,
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
  isDashboardReturnContext: (href?: string | null) => href?.startsWith('/dashboard') || false,
  readSignalPanelEditContext: () => {
    if (mockState.searchParams.get('intent') !== 'edit-panel') return null;
    const dashboardKey = mockState.searchParams.get('dashboardKey') || undefined;
    const panelId = mockState.searchParams.get('panelId') || undefined;
    if (!dashboardKey || !panelId) return null;
    return {
      intent: 'edit-panel',
      dashboardKey,
      panelId,
      draftKey: mockState.searchParams.get('draftKey') || undefined,
      returnTo: mockState.searchParams.get('returnTo') || undefined,
      returnLabel: mockState.searchParams.get('returnLabel') || undefined
    };
  },
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
  stripReturnLabelFromHref: (href?: string | null) => {
    if (!href) return undefined;
    const [path, query = ''] = href.split('?');
    const params = new URLSearchParams(query);
    params.delete('returnLabel');
    const search = params.toString();
    return search ? `${path}?${search}` : path;
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
  buildMetricSeriesSampleRows: (series: any) => series
    ? (series.points || []).map(([timestamp, value]: [number, number | null], index: number) => ({
        key: `${series.key}:${timestamp}:${index}`,
        index: String(index + 1),
        timestamp: `T${timestamp}`,
        rawTimestamp: String(timestamp),
        value: value == null ? '-' : String(value),
        state: value == null ? tZh('otlp.metrics.inspector.sample-state.empty') : tZh('otlp.metrics.inspector.sample-state.present')
      }))
    : [],
  buildMetricSeriesAttributeRows: (series: any, search: string) => {
    if (!series) return [];
    const normalizedSearch = search.trim().toLowerCase();
    return Object.entries(series.labels || {})
      .map(([name, value]) => ({ key: name, name, value: String(value).trim() }))
      .filter(row => row.value)
      .filter(row => !normalizedSearch || `${row.name} ${row.value}`.toLowerCase().includes(normalizedSearch))
      .sort((left, right) => left.name.localeCompare(right.name));
  },
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
  applyMetricsFormula: (seriesList: any[], formula?: string | null) => (
    formula?.trim() === 'A * 1000'
      ? seriesList.map(series => ({
          ...series,
          points: (series.points || []).map(([timestamp, value]: [number, number | null]) => [
            timestamp,
            value == null ? null : value * 1000
          ]),
          latestValue: series.latestValue == null ? null : series.latestValue * 1000
        }))
      : seriesList
  ),
  buildMetricExpectedRangeConfig: (series: any) => series
    ? {
        label: tZh('otlp.metrics.expected-range.label'),
        lowerLabel: tZh('otlp.metrics.expected-range.lower'),
        upperLabel: tZh('otlp.metrics.expected-range.upper'),
        lowerData: [[1000, 9]],
        upperGapData: [[1000, 2]],
        sampleCount: 1
      }
    : null,
  buildMetricsChartOption: (_seriesList: any[], thresholds?: any, expectedRange?: any, legendFormat?: any) => ({
    series: [],
    dataZoom: [{ type: 'slider', start: 0, end: 100 }],
    thresholdProof: thresholds || null,
    expectedRangeProof: expectedRange || null,
    legendFormatProof: legendFormat || null
  }),
  buildMetricThresholdConfig: (warningThreshold?: string, criticalThreshold?: string) => {
    const warning = warningThreshold && Number.isFinite(Number(warningThreshold)) ? Number(warningThreshold) : undefined;
    const critical = criticalThreshold && Number.isFinite(Number(criticalThreshold)) ? Number(criticalThreshold) : undefined;
    return warning == null && critical == null
      ? null
      : {
          warning,
          critical,
          warningLabel: tZh('otlp.metrics.threshold.warning'),
          criticalLabel: tZh('otlp.metrics.threshold.critical')
        };
  },
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
    description: series.description || '-',
    metricType: series.metricType || '-',
    unit: series.unit || '-',
    sampleCount: (series.points || []).length,
    pointCount: (series.points || []).length,
    timeSeriesCount: 1,
    entityLabel: series.labels['hertzbeat.entity_name'] || series.labels.hertzbeat_entity_name || '-',
    entityMeta: series.labels['hertzbeat.entity_id'] || series.labels.hertzbeat_entity_id
      ? tZh('otlp.metrics.series.entity-id', { entityId: series.labels['hertzbeat.entity_id'] || series.labels.hertzbeat_entity_id })
      : tZh('otlp.metrics.series.entity-missing'),
    entityState: series.labels['hertzbeat.entity_id'] || series.labels.hertzbeat_entity_id ? 'present' : 'missing'
  })),
  buildMetricInventoryRows: (rows: any[], search: string, sort: string) => {
    const normalizedSearch = search.trim().toLowerCase();
    const filteredRows = normalizedSearch
      ? rows.filter(row => [row.title, row.copy, row.meta, row.entityLabel, row.entityMeta, row.series?.name, ...Object.values(row.series?.labels || {})].join(' ').toLowerCase().includes(normalizedSearch))
      : [...rows];
    return filteredRows.sort((left, right) => {
      if (sort === 'latest') return (right.series?.latestValue ?? Number.NEGATIVE_INFINITY) - (left.series?.latestValue ?? Number.NEGATIVE_INFINITY);
      if (sort === 'samples') return (right.pointCount ?? 0) - (left.pointCount ?? 0);
      if (sort === 'time-series') return (right.timeSeriesCount ?? 0) - (left.timeSeriesCount ?? 0);
      return String(left.title).localeCompare(String(right.title));
    });
  },
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
      alertHandlingHref: `/alert?${alertParams.toString()}`,
      dashboardHref: `/dashboard?intent=add-panel&signal=metrics&panelTitle=${encodeURIComponent(serviceName)}&${params.toString()}`
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
  globalThis.fetch = originalFetch;
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
    const messagesSource = readFileSync(resolve(process.cwd(), 'lib/i18n-runtime-messages.ts'), 'utf8');

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
    expect(source).toContain('data-otlp-metrics-builder-control-stack="shared-query-builder-controls"');
    expect(source).toContain('data-otlp-metrics-builder-control-stack-owner="hertzbeat-ui-control-stack"');
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
    expect(source).toContain('data-otlp-metrics-filter-input="true"');
    expect(source).toContain('data-otlp-metrics-filter-input-owner="hertzbeat-ui-input"');
    expect(source).toContain("aria-label={t('otlp.metrics.filter.aria')}");
    expect(source).toContain("placeholder={t('otlp.metrics.filter.placeholder')}");
    expect(messagesSource).toContain("'otlp.metrics.filter.placeholder': 'service.name = \"checkout\", http.route CONTAINS checkout, k8s.pod.name EXISTS'");
    expect(source).toContain('width="metrics-filter-expression"');
    expect(source).toContain('data-otlp-metrics-temporal-aggregation-select="true"');
    expect(source).toContain('data-otlp-metrics-temporal-aggregation-select-owner="hertzbeat-ui-select"');
    expect(source).toContain("aria-label={t('otlp.metrics.temporal.aria')}");
    expect(source).toContain('width="metrics-temporal-aggregation"');
    expect(source).toContain('data-otlp-metrics-temporal-aggregation-option');
    expect(source).toContain('data-otlp-metrics-step-input="true"');
    expect(source).toContain('data-otlp-metrics-step-input-owner="hertzbeat-ui-input"');
    expect(source).toContain('width="metrics-query-step"');
    expect(source).toContain('data-otlp-metrics-limit-input="true"');
    expect(source).toContain('data-otlp-metrics-limit-input-owner="hertzbeat-ui-input"');
    expect(source).toContain('width="metrics-query-limit"');
    expect(source).toContain('data-otlp-metrics-legend-format-input="true"');
    expect(source).toContain('data-otlp-metrics-legend-format-input-owner="hertzbeat-ui-input"');
    expect(source).toContain("aria-label={t('otlp.metrics.legend-format.aria')}");
    expect(source).toContain('data-otlp-metrics-formula-input="true"');
    expect(source).toContain('data-otlp-metrics-formula-input-owner="hertzbeat-ui-input"');
    expect(source).toContain("aria-label={t('otlp.metrics.formula.aria')}");
    expect(source).toContain('data-otlp-metrics-warning-threshold-input="true"');
    expect(source).toContain('data-otlp-metrics-warning-threshold-input-owner="hertzbeat-ui-input"');
    expect(source).toContain('data-otlp-metrics-critical-threshold-input="true"');
    expect(source).toContain('data-otlp-metrics-critical-threshold-input-owner="hertzbeat-ui-input"');
    expect(source).toContain('data-otlp-metrics-expected-range-toggle="true"');
    expect(source).toContain('data-otlp-metrics-expected-range-toggle-owner="hertzbeat-ui-button"');
    expect(source).toContain('buildMetricThresholdConfig(query.warningThreshold, query.criticalThreshold, t)');
    expect(source).toContain("query.expectedRange === 'on'");
    expect(source).toContain('buildMetricExpectedRangeConfig(selectedMetricSeries || metricSeries[0] || null, t)');
    expect(source).toContain('applyMetricsFormula(buildMetricSeriesViews(mergedData, t), query.formula)');
    expect(source).toContain('applyMetricsFormula(buildMetricSeriesViews(mergedData, t), query.formula)');
    expect(source).toContain('buildMetricsChartOption(metricSeries, metricThresholdConfig, metricExpectedRangeConfig, query.legendFormat)');
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
    expect(source).toContain('data-otlp-metrics-context-input="span-id"');
    expect(source).toContain('data-otlp-metrics-span-id-input="true"');
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
    expect(source).toContain('isDashboardReturnContext(query.returnTo || routeContext.returnTo)');
    expect(source).toContain('data-otlp-metrics-source-context={sourceContextKind}');
    expect(source).toContain('data-otlp-metrics-source-context-return={query.returnTo || routeContext.returnTo || \'\'}');
    expect(source).toContain('data-otlp-metrics-source-context-trace={query.traceId || routeContext.traceId || \'\'}');
    expect(source).toContain('data-otlp-metrics-source-context-span={query.spanId || routeContext.spanId || \'\'}');
    expect(source).toContain('data-otlp-metrics-source-context-service={query.serviceName || routeContext.serviceName || \'\'}');
    expect(source).toContain('readSignalPanelEditContext(searchParams)');
    expect(source).toContain('appendMetricsPanelEditContext(route, panelEditContext)');
    expect(source).toContain('const replaceMetricsHref = useCallback((route: string) => {');
    expect(source).toContain('router.replace(appendMetricsPanelEditContext(route, panelEditContext))');
    expect(source).toContain('if (!panelEditContext && hasMetricsDisplayReturnLabel(searchParams))');
    expect(source).toContain("panelEditContext\n          ? 'dashboard-panel-edit'");
    expect(source).toContain('data-otlp-metrics-panel-edit-context={panelEditContext?.intent || \'none\'}');
    expect(source).toContain('data-otlp-metrics-panel-edit-dashboard={panelEditContext?.dashboardKey || \'\'}');
    expect(source).toContain('data-otlp-metrics-panel-edit-panel={panelEditContext?.panelId || \'\'}');
    expect(source).toContain('data-otlp-metrics-panel-edit-draft={panelEditContext?.draftKey || \'\'}');
    expect(source).toContain('data-otlp-metrics-panel-edit-return={panelEditContext?.returnTo || \'\'}');
    expect(source).toContain('applySignalDashboardPanelEditContext(createSignalDashboardPanelDraft({');
    expect(source).toContain('}), panelEditContext)');
    expect(source).toContain('saveSignalDashboardPanelEditContext(panelEditContext, panelDraft)');
    expect(source).toContain("t(panelEditContext ? 'otlp.metrics.dashboard-panel-draft.update-current' : 'otlp.metrics.dashboard-panel-draft.add-current')");
    expect(source).toContain("data-otlp-metrics-dashboard-panel-draft-action={panelEditContext ? 'update-current' : 'add-current'}");
    expect(source).toContain("data-otlp-metrics-dashboard-panel-draft-action-mode={panelEditContext ? 'edit-panel' : 'new-panel'}");
    expect(source).toContain('data-otlp-metrics-dashboard-panel-draft-action-dashboard={panelEditContext?.dashboardKey || \'\'}');
    expect(source).toContain('data-otlp-metrics-dashboard-panel-draft-action-panel={panelEditContext?.panelId || \'\'}');
    expect(source).toContain('data-otlp-metrics-dashboard-panel-draft-action-draft={panelEditContext?.draftKey || \'\'}');
    expect(source).toContain('data-otlp-metrics-dashboard-panel-draft-status-mode={panelEditContext ? \'edit-panel\' : \'new-panel\'}');
    expect(source).toContain('data-otlp-metrics-dashboard-panel-draft-status-dashboard={panelEditContext?.dashboardKey || \'\'}');
    expect(source).toContain('data-otlp-metrics-dashboard-panel-draft-status-panel={panelEditContext?.panelId || \'\'}');
    expect(source).toContain("`otlp.metrics.dashboard-panel-draft.update-${dashboardPanelDraftState}`");
    expect(source).toContain('data-otlp-metrics-dashboard-panel-draft-return-action="dashboard"');
    expect(source).toContain('data-otlp-metrics-dashboard-panel-draft-return-action-owner="hertzbeat-ui-button-link"');
    expect(source).toContain('data-otlp-metrics-dashboard-panel-draft-return-action-dashboard={panelEditContext.dashboardKey || \'\'}');
    expect(source).toContain('data-otlp-metrics-dashboard-panel-draft-return-action-panel={panelEditContext.panelId || \'\'}');
    expect(source).toContain("t('otlp.metrics.dashboard-panel-draft.return-dashboard')");
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
    expect(source).toContain('data-otlp-metrics-chart-meta-row-owner="hertzbeat-ui-signal-summary-strip"');
    expect(source).toContain('layout="toolbar"');
    expect(source).not.toContain('data-otlp-metrics-chart-meta-row-owner="hertzbeat-ui-toolbar-chips"\n                            density="compact"\n                            className="justify-end"');
    expect(source).toContain('items={facts.map(fact => ({');
    expect(source).toContain('label: fact.label');
    expect(source).toContain('value: fact.value');
    expect(source).not.toContain('<span className="truncate text-[10px] font-semibold text-[#7f8a9d]">{fact.label}</span>');
    expect(source).not.toContain('<span className="truncate text-[11px] font-semibold text-[#cfd8e6]">{fact.value}</span>');
    expect(source).toContain('facts.map');
    expect(source).toContain('HzSignalSummaryStrip');
    expect(source).not.toContain('layout="metric-fact"');
    expect(source).toContain('data-otlp-metrics-empty-state="honest-no-series"');
    expect(source).toContain('data-otlp-metrics-empty-state-context="applied-query-visible"');
    expect(source).toContain('data-otlp-metrics-chart-panel="series-set-trend"');
    expect(source).toContain('data-otlp-metrics-chart-panel-owner="hertzbeat-ui-panel-surface"');
    expect(source).toContain('data-otlp-metrics-explorer-view="time-series"');
    expect(source).toContain('data-otlp-metrics-explorer-view-owner="hertzbeat-ui-signal-time-series"');
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
    expect(source).toContain('buildMetricsChartOption(metricSeries, metricThresholdConfig, metricExpectedRangeConfig, query.legendFormat)');
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
    expect(source).toContain("title={t('otlp.metrics.inventory.title')}");
    expect(source).toContain('data-otlp-metrics-series-table-summary-owner="hertzbeat-ui-status-badge"');
    expect(source).toContain('data-otlp-metrics-inventory-count="filtered-series"');
    expect(source).toContain('metricInventorySummary');
    expect(source).toContain('buildMetricInventoryRows(metricSeriesTableRows, metricInventorySearch, metricInventorySort)');
    expect(source).toContain('metricInventoryPageRows');
    expect(source).toContain('HzPaginationBar');
    expect(source).toContain("const metricInventorySearch = query.inventorySearch || ''");
    expect(source).toContain("const metricInventorySort: OtlpMetricInventorySort = query.inventorySort || 'name'");
    expect(source).toContain("const metricInventoryPageSize = resolveMetricInventoryPageSize(query.inventoryPageSize)");
    expect(source).toContain("const metricInventoryPageIndex = resolveMetricInventoryPageIndex(query.inventoryPageIndex)");
    expect(source).toContain("const metricAttributeSearch = query.seriesAttributeSearch || ''");
    expect(source).toContain('replaceMetricsInventoryRoute');
    expect(source).toContain('replaceMetricsInventoryPageRoute');
    expect(source).toContain('replaceMetricsAttributeSearchRoute');
    expect(source).toContain('data-otlp-metrics-inventory-controls="search-sort"');
    expect(source).toContain('data-otlp-metrics-inventory-controls-owner="hertzbeat-ui-panel-section"');
    expect(source).toContain('data-otlp-metrics-inventory-search-frame-owner="hertzbeat-ui-search-field-frame"');
    expect(source).toContain('width="metrics-inventory"');
    expect(source).toContain('data-otlp-metrics-inventory-search-input-owner="hertzbeat-ui-input"');
    expect(source).toContain("aria-label={t('otlp.metrics.inventory.search.aria')}");
    expect(source).toContain("placeholder={t('otlp.metrics.inventory.search.placeholder')}");
    expect(source).toContain('width="metrics-inventory-search"');
    expect(source).toContain('data-otlp-metrics-inventory-sort-select-owner="hertzbeat-ui-select"');
    expect(source).toContain("aria-label={t('otlp.metrics.inventory.sort.aria')}");
    expect(source).toContain('width="metrics-inventory-sort"');
    expect(source).toContain("{ value: 'time-series', label: t('otlp.metrics.inventory.sort.time-series') }");
    expect(source).toContain("'data-otlp-metrics-inventory-sort-option': option.value");
    expect(source).toContain('data-otlp-metrics-export-format-owner="hertzbeat-ui-select"');
    expect(source).toContain('data-otlp-metrics-export-scope-owner="hertzbeat-ui-select"');
    expect(source).toContain('data-otlp-metrics-download-owner="hertzbeat-ui-button"');
    expect(source).toContain("downloadMetricsSeries(metricSeries, selectedMetricSeries)");
    expect(source).toContain('data-otlp-metrics-inventory="metric-inventory"');
    expect(source).toContain('data-otlp-metrics-inventory-owner="hertzbeat-ui-data-table"');
    expect(source).toContain('data-otlp-metrics-inventory-filtered-count={metricInventoryRows.length}');
    expect(source).toContain('data-otlp-metrics-inventory-total-count={metricSeriesTableRows.length}');
    expect(source).toContain('data-otlp-metrics-inventory-page-size={metricInventoryPageSize}');
    expect(source).toContain('data-otlp-metrics-inventory-page-index={clampedMetricInventoryPageIndex}');
    expect(source).toContain('rows={metricInventoryPageRows}');
    expect(source).toContain('data-otlp-metrics-inventory-pagination="shared-pagination-bar"');
    expect(source).toContain('data-otlp-metrics-inventory-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(source).toContain("header: t('otlp.metrics.inventory.column.description')");
    expect(source).toContain("header: t('otlp.metrics.inventory.column.type')");
    expect(source).toContain("header: t('otlp.metrics.inventory.column.unit')");
    expect(source).toContain("header: t('otlp.metrics.inventory.column.time-series')");
    expect(source).toContain('data-otlp-metrics-inventory-description-owner="hertzbeat-ui-data-cell-text"');
    expect(source).toContain('data-otlp-metrics-inventory-type-owner="hertzbeat-ui-data-cell-text"');
    expect(source).toContain('data-otlp-metrics-inventory-unit-owner="hertzbeat-ui-data-cell-text"');
    expect(source).toContain('data-otlp-metrics-inventory-time-series-owner="hertzbeat-ui-data-cell-text"');
    expect(source).toContain('data-otlp-metrics-series-table-empty-state="shared-empty-state"');
    expect(source).toContain('data-otlp-metrics-series-table-empty-state-owner="hertzbeat-ui-empty-state"');
    expect(source).toContain('data-otlp-metrics-series-set-summary-owner="hertzbeat-ui-signal-summary-strip"');
    expect(source).toContain('data-otlp-metrics-series-set-summary-section="shared-panel-section"');
    expect(source).toContain('data-otlp-metrics-series-set-summary-section-owner="hertzbeat-ui-panel-section"');
    expect(source).toContain('data-otlp-metrics-series-set-summary-strip="inline-signal-summary"');
    expect(source).toContain('data-otlp-metrics-series-set-summary-strip-owner="hertzbeat-ui-signal-summary-strip"');
    expect(source).toContain('items={seriesSetScopeRows.map(row => ({');
    expect(source).toContain('label: row.label');
    expect(source).toContain('value: row.value');
    expect(source).not.toContain('data-otlp-metrics-series-set-summary-cell-owner="hertzbeat-ui-stat-cell"');
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
    expect(source).toContain('applySelectedMetricSeries(row.series)');
    expect(source).toContain('buildMetricSeriesRouteContext(series)');
    expect(source).toContain('series: series.key');
    expect(source).toContain('buildMetricSeriesContextRows(selectedMetricSeries, t)');
    expect(source).toContain('buildMetricSeriesEvidenceRows(selectedMetricSeries, formatTime, t)');
    expect(source).toContain('buildMetricSeriesSampleRows(selectedMetricSeries, formatTime, t)');
    expect(source).toContain('buildMetricSeriesAttributeRows(selectedMetricSeries, metricAttributeSearch)');
    expect(source).toContain('buildMetricSeriesLinkedRecordRows(selectedMetricSeries, handoffLinks, t)');
    expect(source).toContain('linkedRecordHandoffTargets');
    expect(source).toContain('buildMetricSeriesAttributionDiagnostics(selectedMetricSeries, t)');
    expect(source).toContain('HzCollapsibleSection');
    expect(source).toContain('HzContextHandoff');
    expect(source).toContain('HzDetailRows');
    expect(source).toContain('HzPanelHeader');
    expect(source).not.toContain('HzStatStrip');
    expect(source).not.toContain('HzStatCell');
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
    expect(source).toContain('data-otlp-metrics-detail-summary-stats-owner="hertzbeat-ui-signal-summary-strip"');
    expect(source).toContain('layout="detail"');
    expect(source).toContain('items={metrics.map(metric => ({');
    expect(source).not.toContain('data-otlp-metrics-detail-summary-stat-owner="hertzbeat-ui-stat-cell"');
    expect(source).not.toContain('className="rounded-[3px] border border-[#252b35] bg-[#252b35] p-1"');
    expect(source).not.toContain('density="compact"\n                          className="border-0"');
    expect(source).toContain('data-otlp-metrics-detail-context-rows="shared-detail-rows"');
    expect(source).toContain('data-otlp-metrics-detail-context-rows-owner="hertzbeat-ui-detail-rows"');
    expect(source).toContain('offset="top"');
    expect(source).not.toContain('data-otlp-metrics-detail-context-rows-owner="hertzbeat-ui-detail-rows"\n                      className="mt-3"');
    expect(source).toContain('selectedSeriesContextDetailRows');
    expect(source).toContain('selectedSeriesEvidenceDetailRows');
    expect(source).toContain('entityContextDetailRows');
    expect(source).toContain('const selectedMetricSeriesRouteContext: Partial<SignalRouteContext> = selectedMetricSeries');
    expect(source).toContain('const selectedMetricSourceMatch =');
    expect(source).toContain('data-otlp-metrics-detail-source-context={sourceContextKind}');
    expect(source).toContain('data-otlp-metrics-detail-source-match={selectedMetricSourceMatch}');
    expect(source).toContain('data-otlp-metrics-detail-selected-series={selectedMetricSeries.key}');
    expect(source).toContain('data-otlp-metrics-detail-requested-trace={requestedMetricTraceId}');
    expect(source).toContain('data-otlp-metrics-detail-requested-span={requestedMetricSpanId}');
    expect(source).toContain('data-otlp-metrics-detail-requested-service={requestedMetricServiceName}');
    expect(source).toContain('data-otlp-metrics-detail-selected-trace={selectedMetricTraceId}');
    expect(source).toContain('data-otlp-metrics-detail-selected-span={selectedMetricSpanId}');
    expect(source).toContain('data-otlp-metrics-detail-selected-service={selectedMetricServiceName}');
    expect(source).toContain('data-otlp-metrics-selected-series-context="selected-series-attribution"');
    expect(source).toContain('data-otlp-metrics-selected-series-context-owner="hertzbeat-ui-detail-rows"');
    expect(source).toContain('data-otlp-metrics-selected-series-evidence="real-sample-evidence"');
    expect(source).toContain('data-otlp-metrics-selected-series-evidence-owner="hertzbeat-ui-detail-rows"');
    expect(source).toContain('data-otlp-metrics-selected-series-evidence-series={selectedMetricSeries.key}');
    expect(source).toContain('data-otlp-metrics-selected-series-evidence-trace={selectedMetricTraceId}');
    expect(source).toContain('data-otlp-metrics-selected-series-evidence-span={selectedMetricSpanId}');
    expect(source).toContain('data-otlp-metrics-selected-series-evidence-samples={selectedSeriesEvidenceRows.length}');
    expect(source).toContain('data-otlp-metrics-inspector-toggle="graph-table"');
    expect(source).toContain('data-otlp-metrics-inspector-toggle-owner="hertzbeat-ui-action-group"');
    expect(source).toContain('data-otlp-metrics-inspector-view={metricsInspectorView}');
    expect(source).toContain('data-otlp-metrics-inspector-action="graph"');
    expect(source).toContain('data-otlp-metrics-inspector-action="table"');
    expect(source).toContain('data-otlp-metrics-inspector-sample-table="selected-series-samples"');
    expect(source).toContain('data-otlp-metrics-inspector-sample-table-owner="hertzbeat-ui-data-table"');
    expect(source).toContain('data-otlp-metrics-inspector-sample-table-series={selectedMetricSeries.key}');
    expect(source).toContain('data-otlp-metrics-inspector-sample-table-samples={selectedSeriesSampleRows.length}');
    expect(source).toContain('data-otlp-metrics-inspector-sample-table-trace={selectedMetricTraceId}');
    expect(source).toContain('data-otlp-metrics-inspector-sample-table-span={selectedMetricSpanId}');
    expect(source).toContain("header: t('otlp.metrics.inspector.column.timestamp')");
    expect(source).toContain("header: t('otlp.metrics.inspector.column.raw-timestamp')");
    expect(source).toContain("header: t('otlp.metrics.inspector.column.value')");
    expect(source).toContain('data-otlp-metrics-attribute-summary="selected-series-labels"');
    expect(source).toContain('data-otlp-metrics-attribute-summary-owner="hertzbeat-ui-collapsible-section"');
    expect(source).toContain('data-otlp-metrics-attribute-controls="search"');
    expect(source).toContain('data-otlp-metrics-attribute-controls-owner="hertzbeat-ui-control-stack"');
    expect(source).toContain('data-otlp-metrics-attribute-search-input-owner="hertzbeat-ui-input"');
    expect(source).toContain('data-otlp-metrics-attribute-table="selected-series-labels"');
    expect(source).toContain('data-otlp-metrics-attribute-table-owner="hertzbeat-ui-data-table"');
    expect(source).toContain("header: t('otlp.metrics.attributes.column.name')");
    expect(source).toContain("header: t('otlp.metrics.attributes.column.value')");
    expect(source).toContain("header: t('otlp.metrics.attributes.column.contains')");
    expect(source).toContain("header: t('otlp.metrics.attributes.column.exclude')");
    expect(source).toContain("header: t('otlp.metrics.attributes.column.exists')");
    expect(source).toContain("header: t('otlp.metrics.attributes.column.not-exists')");
    expect(source).toContain('buildMetricAttributeExcludeFilterExpression');
    expect(source).toContain('buildMetricAttributeContainsFilterExpression');
    expect(source).toContain('buildMetricAttributeExistsFilterExpression');
    expect(source).toContain('buildMetricAttributeNotExistsFilterExpression');
    expect(source).toContain('applyMetricAttributeExcludeFilter');
    expect(source).toContain('applyMetricAttributeContainsFilter');
    expect(source).toContain('applyMetricAttributeExistsFilter');
    expect(source).toContain('applyMetricAttributeNotExistsFilter');
    expect(source).toContain('data-otlp-metrics-attribute-filter-out-action={row.name}');
    expect(source).toContain('data-otlp-metrics-attribute-filter-out-action-owner="hertzbeat-ui-button"');
    expect(source).toContain('data-otlp-metrics-attribute-contains-action={row.name}');
    expect(source).toContain('data-otlp-metrics-attribute-contains-action-owner="hertzbeat-ui-button"');
    expect(source).toContain('data-otlp-metrics-attribute-exists-action={row.name}');
    expect(source).toContain('data-otlp-metrics-attribute-exists-action-owner="hertzbeat-ui-button"');
    expect(source).toContain('data-otlp-metrics-attribute-not-exists-action={row.name}');
    expect(source).toContain('data-otlp-metrics-attribute-not-exists-action-owner="hertzbeat-ui-button"');
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
    expect(source).toContain('data-otlp-metrics-series-set-summary-owner="hertzbeat-ui-signal-summary-strip"');
    expect(source).toContain('data-otlp-metrics-series-set-summary="service-entity-scope"');
    expect(source).toContain('seriesSetScopeRows.map');
    expect(source).toContain("t('otlp.metrics.inventory.title')");
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
    expect(source).toContain("t('explorer.actions.create-alert')");
    expect(source).toContain('href={handoffLinks.alertRulesHref}');
    expect(source).toContain('data-otlp-metrics-alert-rule-action="true"');
    expect(source).toContain("t('explorer.actions.add-dashboard')");
    expect(source).toContain('href={handoffLinks.dashboardHref}');
    expect(source).toContain('data-otlp-metrics-dashboard-action="true"');
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
    expect(html).toContain('data-otlp-metrics-builder-control-stack="shared-query-builder-controls"');
    expect(html).toContain('data-otlp-metrics-builder-control-stack-owner="hertzbeat-ui-control-stack"');
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
    expect(html).toContain('data-otlp-metrics-context-input="span-id"');
    expect(html).toContain('data-otlp-metrics-span-id-input="true"');
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
    expect(html).toContain('data-otlp-metrics-explorer-view="time-series"');
    expect(html).toContain('data-otlp-metrics-explorer-view-owner="hertzbeat-ui-signal-time-series"');
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
    expect(html).toContain('data-otlp-metrics-inventory-count="filtered-series"');
    expect(html).toContain('data-hz-ui="status-badge"');
    expect(html).toContain('data-hz-status-size="xs"');
    expect(html).toContain('data-otlp-metrics-inventory-controls="search-sort"');
    expect(html).toContain('data-otlp-metrics-inventory-controls-owner="hertzbeat-ui-panel-section"');
    expect(html).toContain('data-otlp-metrics-inventory-search-frame-owner="hertzbeat-ui-search-field-frame"');
    expect(html).toContain('data-hz-search-field-frame-width="metrics-inventory"');
    expect(html).toContain('data-otlp-metrics-inventory-search-input="true"');
    expect(html).toContain('data-otlp-metrics-inventory-search-input-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-hz-input-width="metrics-inventory-search"');
    expect(html).toContain('data-otlp-metrics-inventory-sort-select="true"');
    expect(html).toContain('data-otlp-metrics-inventory-sort-select-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-hz-select-width="metrics-inventory-sort"');
    expect(html).toContain('data-otlp-metrics-series-set-summary-owner="hertzbeat-ui-signal-summary-strip"');
    expect(html).toContain('data-otlp-metrics-series-set-summary-section="shared-panel-section"');
    expect(html).toContain('data-otlp-metrics-series-set-summary-section-owner="hertzbeat-ui-panel-section"');
    expect(html).toContain('data-hz-panel-section-owner="hertzbeat-ui-panel-section"');
    expect(html).toContain('data-hz-panel-section-padding="summary"');
    expect(html).toContain('data-otlp-metrics-series-set-summary-strip="inline-signal-summary"');
    expect(html).toContain('data-otlp-metrics-series-set-summary-strip-owner="hertzbeat-ui-signal-summary-strip"');
    expect(html).toContain('data-hz-ui="signal-summary-strip"');
    expect(html).toContain('data-hz-ui="signal-summary-item"');
    expect(html).toContain('data-otlp-metrics-series-data-table="shared-data-table"');
    expect(html).toContain('data-otlp-metrics-series-data-table-owner="hertzbeat-ui-data-table"');
    expect(html).toContain('data-otlp-metrics-inventory="metric-inventory"');
    expect(html).toContain('data-otlp-metrics-inventory-owner="hertzbeat-ui-data-table"');
    expect(html).toContain('data-otlp-metrics-inventory-filtered-count="0"');
    expect(html).toContain('data-otlp-metrics-inventory-total-count="0"');
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
    expect(html).toContain(tZh('otlp.metrics.filter.aria'));
    expect(html).toContain(tZh('otlp.metrics.temporal.aria'));
    expect(html).toContain(tZh('otlp.metrics.step.aria'));
    expect(html).toContain(tZh('otlp.metrics.limit.aria'));
    expect(html).toContain(tZh('otlp.metrics.field.group-by'));
    expect(html).toContain(tZh('otlp.metrics.aggregation.aria'));
    expect(html).toContain(tZh('otlp.metrics.trend.title'));
    expect(html).toContain(tZh('otlp.metrics.inventory.title'));
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
    expect(html).toContain('data-otlp-metrics-chart-meta-row-owner="hertzbeat-ui-signal-summary-strip"');
    expect(html).toContain('data-otlp-metrics-chart-toolbar-actions="shared-toolbar-actions"');
    expect(html).toContain('data-otlp-metrics-chart-toolbar-actions-owner="hertzbeat-ui-action-group"');
    expect(html).toContain('data-hz-ui="action-group"');
    expect(html).toContain('data-hz-action-group-layout="end-wrap"');
    expect(html).toContain('data-hz-signal-summary-layout="toolbar"');
    expect(html).not.toContain('data-hz-status-badge-layout="metric-fact"');
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

  it('applies metric, builder filters, service, aggregation, grouping, and time range into the workbench route', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1712733600000);
    mockState.searchParams = new URLSearchParams('entityId=7&entityName=Checkout%20API&source=otlp&collector=collector-a&template=spring-boot&traceId=trace-123&spanId=span-456');

    const { default: OtlpMetricsPage } = await import('./page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<OtlpMetricsPage />);
      await Promise.resolve();
    });

    const queryInput = interactionContainer.querySelector('[data-otlp-metrics-query-input="true"]') as HTMLInputElement | null;
    const filterInput = interactionContainer.querySelector('[data-otlp-metrics-filter-input="true"]') as HTMLInputElement | null;
    const stepInput = interactionContainer.querySelector('[data-otlp-metrics-step-input="true"]') as HTMLInputElement | null;
    const limitInput = interactionContainer.querySelector('[data-otlp-metrics-limit-input="true"]') as HTMLInputElement | null;
    const legendFormatInput = interactionContainer.querySelector('[data-otlp-metrics-legend-format-input="true"]') as HTMLInputElement | null;
    const formulaInput = interactionContainer.querySelector('[data-otlp-metrics-formula-input="true"]') as HTMLInputElement | null;
    const warningThresholdInput = interactionContainer.querySelector('[data-otlp-metrics-warning-threshold-input="true"]') as HTMLInputElement | null;
    const criticalThresholdInput = interactionContainer.querySelector('[data-otlp-metrics-critical-threshold-input="true"]') as HTMLInputElement | null;
    const serviceInput = interactionContainer.querySelector('[data-otlp-metrics-service-input="true"]') as HTMLInputElement | null;
    const namespaceInput = interactionContainer.querySelector('[data-otlp-metrics-namespace-input="true"]') as HTMLInputElement | null;
    const environmentInput = interactionContainer.querySelector('[data-otlp-metrics-environment-input="true"]') as HTMLInputElement | null;
    const spanIdInput = interactionContainer.querySelector('[data-otlp-metrics-span-id-input="true"]') as HTMLInputElement | null;
    const aggregationSelect = interactionContainer.querySelector('[data-otlp-metrics-aggregation-select="true"]') as HTMLElement | null;
    const temporalAggregationSelect = interactionContainer.querySelector('[data-otlp-metrics-temporal-aggregation-select="true"]') as HTMLElement | null;
    const groupBySelect = interactionContainer.querySelector('[data-otlp-metrics-group-by-select="true"]') as HTMLElement | null;
    const timeRangeSelect = interactionContainer.querySelector('[data-otlp-metrics-time-range-select="true"]') as HTMLSelectElement | null;
    const timeApplyAction = interactionContainer.querySelector('[data-time-range-apply-action="true"]') as HTMLButtonElement | null;
    const runAction = interactionContainer.querySelector('[data-otlp-metrics-run-query-action="true"]') as HTMLButtonElement | null;

    expect(queryInput).not.toBeNull();
    expect(filterInput).not.toBeNull();
    expect(stepInput).not.toBeNull();
    expect(limitInput).not.toBeNull();
    expect(legendFormatInput).not.toBeNull();
    expect(formulaInput).not.toBeNull();
    expect(warningThresholdInput).not.toBeNull();
    expect(criticalThresholdInput).not.toBeNull();
    expect(serviceInput).not.toBeNull();
    expect(spanIdInput).not.toBeNull();
    expect(spanIdInput?.value).toBe('span-456');
    expect(aggregationSelect).not.toBeNull();
    expect(temporalAggregationSelect).not.toBeNull();
    expect(groupBySelect).not.toBeNull();
    expect(timeRangeSelect).not.toBeNull();
    expect(timeApplyAction).not.toBeNull();

    await act(async () => {
      queryInput!.value = 'http_server_duration_milliseconds_count';
      queryInput!.dispatchEvent(new Event('input', { bubbles: true }));
      filterInput!.value = 'service.name="checkout"';
      filterInput!.dispatchEvent(new Event('input', { bubbles: true }));
      stepInput!.value = '60';
      stepInput!.dispatchEvent(new Event('input', { bubbles: true }));
      limitInput!.value = '25';
      limitInput!.dispatchEvent(new Event('input', { bubbles: true }));
      legendFormatInput!.value = '{{service.name}} - p95';
      legendFormatInput!.dispatchEvent(new Event('input', { bubbles: true }));
      formulaInput!.value = 'A * 1000';
      formulaInput!.dispatchEvent(new Event('input', { bubbles: true }));
      warningThresholdInput!.value = '75.5';
      warningThresholdInput!.dispatchEvent(new Event('input', { bubbles: true }));
      criticalThresholdInput!.value = '90';
      criticalThresholdInput!.dispatchEvent(new Event('input', { bubbles: true }));
      serviceInput!.value = 'checkout';
      serviceInput!.dispatchEvent(new Event('input', { bubbles: true }));
      namespaceInput!.value = 'payments';
      namespaceInput!.dispatchEvent(new Event('input', { bubbles: true }));
      environmentInput!.value = 'prod';
      environmentInput!.dispatchEvent(new Event('input', { bubbles: true }));
      spanIdInput!.value = 'span-789';
      spanIdInput!.dispatchEvent(new Event('input', { bubbles: true }));
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
      temporalAggregationSelect!.querySelector('[data-hz-ui="select-trigger"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    await act(async () => {
      temporalAggregationSelect!.querySelector('[data-otlp-metrics-temporal-aggregation-option="rate"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
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
    expect(href).toContain('filter=service.name%3D%22checkout%22');
    expect(href).toContain('aggregation=sum');
    expect(href).toContain('temporalAggregation=rate');
    expect(href).toContain('groupBy=service_name');
    expect(href).toContain('legendFormat=%7B%7Bservice.name%7D%7D+-+p95');
    expect(href).toContain('formula=A+*+1000');
    expect(href).toContain('step=60');
    expect(href).toContain('limit=25');
    expect(href).toContain('warningThreshold=75.5');
    expect(href).toContain('criticalThreshold=90');
    expect(href).toContain('serviceName=checkout');
    expect(href).toContain('serviceNamespace=payments');
    expect(href).toContain('environment=prod');
    expect(href).toContain('traceId=trace-123');
    expect(href).toContain('spanId=span-789');
    expect(href).toContain('timeRange=last-1h');
    expect(href).toContain('start=1712730000000');
    expect(href).toContain('end=1712733600000');
    expect(href).toContain('entityId=7');
    expect(href).toContain('collector=collector-a');
    expect(href).toContain('template=spring-boot');
    expect(href).not.toContain('returnLabel=');
    nowSpy.mockRestore();
  });

  it('keeps metrics group-by optional when the route has no groupBy', async () => {
    mockState.searchParams = new URLSearchParams();

    const { default: OtlpMetricsPage } = await import('./page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<OtlpMetricsPage />);
      await Promise.resolve();
    });

    const queryInput = interactionContainer.querySelector('[data-otlp-metrics-query-input="true"]') as HTMLInputElement | null;
    const groupBySelect = interactionContainer.querySelector('[data-otlp-metrics-group-by-select="true"]') as HTMLElement | null;
    const runAction = interactionContainer.querySelector('[data-otlp-metrics-run-query-action="true"]') as HTMLButtonElement | null;
    expect(groupBySelect?.textContent).toContain(tZh('otlp.metrics.group.none'));

    await act(async () => {
      groupBySelect!.querySelector('[data-hz-ui="select-trigger"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(groupBySelect?.querySelector('[data-otlp-metrics-group-by-option=""]')).not.toBeNull();

    await act(async () => {
      queryInput!.value = 'http.server.duration';
      queryInput!.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    await act(async () => {
      runAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const href = String(mockState.replace.mock.calls.at(-1)?.[0]);
    expect(href).toContain('/ingestion/otlp/metrics?');
    expect(href).toContain('query=http.server.duration');
    expect(href).not.toContain('groupBy=');
    expect(href).not.toContain('service_name');
  });

  it('toggles the expected range display as route-only chart state', async () => {
    mockState.searchParams = new URLSearchParams('query=http.server.duration');

    const { default: OtlpMetricsPage } = await import('./page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<OtlpMetricsPage />);
      await Promise.resolve();
    });

    const expectedRangeToggle = interactionContainer.querySelector('[data-otlp-metrics-expected-range-toggle="true"]') as HTMLButtonElement | null;
    expect(expectedRangeToggle).not.toBeNull();
    expect(expectedRangeToggle?.getAttribute('aria-pressed')).toBe('false');

    await act(async () => {
      expectedRangeToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const toggleHref = String(mockState.replace.mock.calls.at(-1)?.[0]);
    expect(toggleHref).toBe('/ingestion/otlp/metrics?query=http.server.duration&expectedRange=on');
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

    expect(loadOtlpMetricsConsole).toHaveBeenCalledWith(apiMessageGet, expect.objectContaining({
      entityId: undefined,
      entityName: undefined,
      returnTo: undefined,
      traceId: 'trace-123',
      spanId: 'span-456',
      serviceName: 'checkout',
      serviceNamespace: undefined,
      environment: undefined,
      start: undefined,
      end: undefined,
      inspector: 'graph'
    }));
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
    expect(html).toContain('/alert/setting?signal=metrics');
    expect(html).toContain(tZh('explorer.actions.create-alert'));
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
    expect(rows[1]?.getAttribute('data-otlp-metrics-series-row-selected')).toBe('true');
    const initialEntityCells = Array.from(interactionContainer.querySelectorAll('[data-otlp-metrics-series-entity="true"]')) as HTMLElement[];
    expect(initialEntityCells[1]?.textContent).toContain('Checkout API');
    expect(initialEntityCells[1]?.textContent).toContain('entityId 7');
    expect(initialEntityCells[1]?.getAttribute('data-hz-ui')).toBe('data-cell-stack');
    expect(initialEntityCells[1]?.getAttribute('data-otlp-metrics-series-entity-owner')).toBe('hertzbeat-ui-data-cell-stack');
    expect(initialEntityCells[1]?.getAttribute('data-hz-data-cell-stack-width')).toBe('metrics-entity');
    expect(initialEntityCells[1]?.className).toContain('min-w-[140px]');
    const initialEntityLabel = initialEntityCells[1]?.querySelector('[data-otlp-metrics-series-entity-label-owner="hertzbeat-ui-data-cell-text"]') as HTMLElement | null;
    const initialEntityMeta = initialEntityCells[1]?.querySelector('[data-otlp-metrics-series-entity-meta-owner="hertzbeat-ui-data-cell-text"]') as HTMLElement | null;
    const initialLatestValue = interactionContainer.querySelector('[data-otlp-metrics-series-latest-owner="hertzbeat-ui-data-cell-text"]') as HTMLElement | null;
    expect(initialEntityLabel?.getAttribute('data-hz-data-cell-tone')).toBe('strong');
    expect(initialEntityLabel?.getAttribute('data-hz-data-cell-weight')).toBe('semibold');
    expect(initialEntityMeta?.getAttribute('data-hz-data-cell-tone')).toBe('success');
    expect(initialEntityMeta?.getAttribute('data-hz-data-cell-casing')).toBe('plain');
    expect(initialEntityMeta?.getAttribute('data-otlp-metrics-series-entity-state')).toBe('present');
    expect(initialLatestValue?.getAttribute('data-hz-data-cell-tone')).toBe('bright');
    expect(initialLatestValue?.getAttribute('data-hz-data-cell-font')).toBe('mono');

    await act(async () => {
      rows[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(rows[0]?.getAttribute('data-otlp-metrics-series-row-selected')).toBe('true');
    const selectedSeriesHref = String(mockState.replace.mock.calls.at(-1)?.[0]);
    const selectedSeriesParams = new URL(selectedSeriesHref, 'http://localhost').searchParams;
    expect(selectedSeriesParams.get('series')).toBe('db_client_duration-1');
    expect(selectedSeriesParams.get('entityId')).toBe('42');
    expect(selectedSeriesParams.get('entityName')).toBe('Inventory API');
    expect(selectedSeriesParams.get('serviceName')).toBe('inventory');
    expect(selectedSeriesParams.get('serviceNamespace')).toBe('warehouse');
    expect(selectedSeriesParams.get('environment')).toBe('prod-east');
    expect(selectedSeriesParams.get('traceId')).toBe('trace-inventory');
    expect(selectedSeriesParams.get('spanId')).toBe('span-inventory');
    expect(selectedSeriesParams.get('collector')).toBe('collector-b');
    expect(selectedSeriesParams.get('template')).toBe('fastapi');
    const selectedEntityCells = Array.from(interactionContainer.querySelectorAll('[data-otlp-metrics-series-entity="true"]')) as HTMLElement[];
    expect(selectedEntityCells[0]?.textContent).toContain('Inventory API');
    expect(selectedEntityCells[0]?.textContent).toContain('entityId 42');
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
    expect(detailSummaryStats?.getAttribute('data-otlp-metrics-detail-summary-stats-owner')).toBe('hertzbeat-ui-signal-summary-strip');
    expect(detailSummaryStats?.getAttribute('data-hz-ui')).toBe('signal-summary-strip');
    expect(detailSummaryStats?.getAttribute('data-hz-signal-summary-layout')).toBe('detail');
    expect(detailSummaryStats?.querySelectorAll('[data-hz-ui="signal-summary-item"]')).toHaveLength(3);
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
    const alertRuleHref = (interactionContainer.querySelector('[data-otlp-metrics-alert-rule-action="true"]') as HTMLAnchorElement | null)?.href;
    const dashboardHref = (interactionContainer.querySelector('[data-otlp-metrics-dashboard-action="true"]') as HTMLAnchorElement | null)?.href;
    const handoffSection = interactionContainer.querySelector('[data-otlp-metrics-handoff-action-section="shared-panel-section"]') as HTMLElement | null;
    const handoffGroup = interactionContainer.querySelector('[data-otlp-metrics-handoff-actions="compact-context-actions"]') as HTMLElement | null;

    expect(handoffSection?.getAttribute('data-otlp-metrics-handoff-action-section-owner')).toBe('hertzbeat-ui-panel-section');
    expect(handoffSection?.getAttribute('data-hz-ui')).toBe('panel-section');
    expect(handoffSection?.getAttribute('data-hz-panel-section-divider')).toBe('top');
    expect(handoffGroup?.getAttribute('data-otlp-metrics-handoff-actions-owner')).toBe('hertzbeat-ui-action-group');
    expect(handoffGroup?.getAttribute('data-hz-action-group-owner')).toBe('hertzbeat-ui-action-group');
    expect(handoffGroup?.getAttribute('data-hz-action-group-layout')).toBe('grid-2');
    expect(handoffGroup?.querySelectorAll('[data-hz-ui="button-link"]')).toHaveLength(7);
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

    const alertRuleParams = new URL(alertRuleHref || '', 'http://localhost').searchParams;
    expect(alertRuleParams.get('signal')).toBe('metrics');
    expect(alertRuleParams.get('entityId')).toBe('42');
    expect(alertRuleParams.get('serviceName')).toBe('inventory');
    expect(alertRuleParams.get('traceId')).toBe('trace-inventory');

    const dashboardParams = new URL(dashboardHref || '', 'http://localhost').searchParams;
    expect(dashboardParams.get('intent')).toBe('add-panel');
    expect(dashboardParams.get('signal')).toBe('metrics');
    expect(dashboardParams.get('panelTitle')).toBe('inventory');
    expect(dashboardParams.get('entityId')).toBe('42');
    expect(dashboardParams.get('serviceName')).toBe('inventory');
  });

  it('restores selected metric series from route state before falling back to the first row', async () => {
    mockState.searchParams = new URLSearchParams('query=http.server.duration&inspector=table&series=inventory_latency-1');
    mockState.metricSeries = [
      {
        key: 'checkout_latency-0',
        name: 'checkout.latency',
        labels: {
          'service.name': 'checkout',
          'hertzbeat.entity_id': '7',
          'hertzbeat.entity_name': 'Checkout API'
        },
        points: [[1000, 12]],
        latestValue: 12
      },
      {
        key: 'inventory_latency-1',
        name: 'inventory.latency',
        labels: {
          'service.name': 'inventory',
          'hertzbeat.entity_id': '42',
          'hertzbeat.entity_name': 'Inventory API'
        },
        points: [[2000, 20]],
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
    expect(rows[0]?.getAttribute('data-otlp-metrics-series-row-selected')).toBe('false');
    expect(rows[1]?.getAttribute('data-otlp-metrics-series-row-selected')).toBe('true');
    const sampleTable = interactionContainer.querySelector('[data-otlp-metrics-inspector-sample-table="selected-series-samples"]') as HTMLElement | null;
    expect(sampleTable?.textContent).toContain('T2000');
    expect(sampleTable?.textContent).not.toContain('T1000');
    expect(mockState.replace).not.toHaveBeenCalled();
  });

  it('downloads the current metrics query samples with selected-series scope from shared UI controls', async () => {
    mockState.searchParams = new URLSearchParams('query=http.server.duration&series=inventory_latency-1');
    mockState.metricSeries = [
      {
        key: 'checkout_latency-0',
        name: 'checkout.latency',
        labels: {
          'service.name': 'checkout',
          'service.namespace': 'payments',
          'deployment.environment.name': 'prod'
        },
        description: 'Checkout latency',
        metricType: 'gauge',
        unit: 'ms',
        points: [[1713200000000, 12]],
        latestValue: 12
      },
      {
        key: 'inventory_latency-1',
        name: 'inventory.latency',
        labels: {
          'service.name': 'inventory',
          'service.namespace': 'warehouse',
          'deployment.environment.name': 'prod-east'
        },
        description: 'Inventory latency',
        metricType: 'gauge',
        unit: 'ms',
        points: [
          [1713200000000, 20],
          [1713200060000, null]
        ],
        latestValue: 20
      }
    ];
    const createObjectURL = vi.fn(() => 'blob:hertzbeat-metrics');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL
    });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    const { default: OtlpMetricsPage } = await import('./page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<OtlpMetricsPage />);
      await Promise.resolve();
    });

    const exportFormatSelect = interactionContainer.querySelector('[data-otlp-metrics-export-format-select="true"]') as HTMLElement | null;
    const exportScopeSelect = interactionContainer.querySelector('[data-otlp-metrics-export-scope-select="true"]') as HTMLElement | null;
    const downloadAction = interactionContainer.querySelector('[data-otlp-metrics-download-action="current-query"]') as HTMLButtonElement | null;
    expect(exportFormatSelect).not.toBeNull();
    expect(exportFormatSelect?.getAttribute('data-otlp-metrics-export-format-owner')).toBe('hertzbeat-ui-select');
    expect(exportFormatSelect?.getAttribute('data-otlp-metrics-export-format-value')).toBe('csv');
    expect(exportScopeSelect).not.toBeNull();
    expect(exportScopeSelect?.getAttribute('data-otlp-metrics-export-scope-owner')).toBe('hertzbeat-ui-select');
    expect(exportScopeSelect?.getAttribute('data-otlp-metrics-export-scope-value')).toBe('all');
    expect(downloadAction).not.toBeNull();
    expect(downloadAction?.getAttribute('data-otlp-metrics-download-owner')).toBe('hertzbeat-ui-button');
    expect(downloadAction?.getAttribute('data-otlp-metrics-download-series-count')).toBe('2');

    await act(async () => {
      exportFormatSelect!.querySelector('[data-hz-ui="select-trigger"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    await act(async () => {
      exportFormatSelect!.querySelector('[data-otlp-metrics-export-format-option="jsonl"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(interactionContainer.querySelector('[data-otlp-metrics-export-format-select="true"]')?.getAttribute('data-otlp-metrics-export-format-value')).toBe('jsonl');

    await act(async () => {
      exportScopeSelect!.querySelector('[data-hz-ui="select-trigger"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    await act(async () => {
      exportScopeSelect!.querySelector('[data-otlp-metrics-export-scope-option="selected"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(interactionContainer.querySelector('[data-otlp-metrics-export-scope-select="true"]')?.getAttribute('data-otlp-metrics-export-scope-value')).toBe('selected');

    await act(async () => {
      downloadAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(apiMessageGet).not.toHaveBeenCalled();
    expect(loadOtlpMetricsConsole).not.toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const exportBlob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(exportBlob.type).toBe('application/x-ndjson;charset=utf-8');
    const exportText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(exportBlob);
    });
    const exportLines = exportText.split('\n');
    expect(exportLines).toHaveLength(2);
    expect(exportLines[0]).toContain('"metric":"inventory.latency"');
    expect(exportLines[0]).toContain('"service.name":"inventory"');
    expect(exportLines[1]).toContain('"value":null');
    expect(exportText).not.toContain('checkout.latency');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:hertzbeat-metrics');
    clickSpy.mockRestore();
  });

  it('loads a metric inventory row into the route-backed query builder', async () => {
    mockState.searchParams = new URLSearchParams('filter=service.name%3D%22checkout%22&timeRange=last-1h');
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

    const queryAction = interactionContainer.querySelector('[data-otlp-metrics-inventory-query-action="http_server_duration-0"]') as HTMLButtonElement | null;
    expect(queryAction).not.toBeNull();
    expect(queryAction?.getAttribute('data-otlp-metrics-inventory-query-action-owner')).toBe('hertzbeat-ui-button');
    expect(queryAction?.getAttribute('aria-label')).toContain('http.server.duration');

    await act(async () => {
      queryAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const href = String(mockState.replace.mock.calls.at(-1)?.[0]);
    expect(href).toContain('/ingestion/otlp/metrics?');
    expect(href).toContain('query=http.server.duration');
    expect(href).toContain('series=http_server_duration-0');
    expect(href).toContain('filter=service.name%3D%22checkout%22');
    expect(href).toContain('timeRange=last-1h');
    const params = new URL(href, 'http://localhost').searchParams;
    expect(params.get('entityId')).toBe('7');
    expect(params.get('entityName')).toBe('Checkout API');
    expect(params.get('serviceName')).toBe('checkout');
    expect(params.get('serviceNamespace')).toBe('payments');
    expect(params.get('environment')).toBe('prod');
    expect(params.get('traceId')).toBe('trace-checkout');
    expect(params.get('spanId')).toBe('span-checkout');
    expect(params.get('collector')).toBe('collector-a');
    expect(params.get('template')).toBe('spring-boot');
  });

  it('renders a route-backed table inspector for selected metric raw samples', async () => {
    mockState.searchParams = new URLSearchParams('inspector=table&query=http.server.duration');
    mockState.metricSeries = [
      {
        key: 'http_server_duration-0',
        name: 'http.server.duration',
        labels: {
          'service.name': 'checkout',
          'service.namespace': 'payments',
          'deployment.environment.name': 'prod',
          'hertzbeat.entity_id': '7',
          'hertzbeat.entity_name': 'Checkout API'
        },
        points: [
          [1000, 12],
          [2000, null],
          [3000, 20]
        ],
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

    const toggle = interactionContainer.querySelector('[data-otlp-metrics-inspector-toggle="graph-table"]') as HTMLElement | null;
    expect(toggle?.getAttribute('data-otlp-metrics-inspector-toggle-owner')).toBe('hertzbeat-ui-action-group');
    expect(toggle?.getAttribute('data-hz-action-group-owner')).toBe('hertzbeat-ui-action-group');
    expect(toggle?.getAttribute('data-otlp-metrics-inspector-view')).toBe('table');

    const tableAction = interactionContainer.querySelector('[data-otlp-metrics-inspector-action="table"]') as HTMLButtonElement | null;
    expect(tableAction?.getAttribute('data-otlp-metrics-inspector-action-owner')).toBe('hertzbeat-ui-button');
    expect(tableAction?.getAttribute('data-otlp-metrics-inspector-action-active')).toBe('true');
    expect(tableAction?.getAttribute('aria-pressed')).toBe('true');

    const sampleTable = interactionContainer.querySelector('[data-otlp-metrics-inspector-sample-table="selected-series-samples"]') as HTMLElement | null;
    expect(sampleTable).not.toBeNull();
    expect(sampleTable?.getAttribute('data-otlp-metrics-inspector-sample-table-owner')).toBe('hertzbeat-ui-data-table');
    expect(sampleTable?.getAttribute('data-hz-ui')).toBe('data-table');
    expect(sampleTable?.getAttribute('data-hz-data-table-variant')).toBe('embedded');
    expect(sampleTable?.textContent).toContain(tZh('otlp.metrics.inspector.column.timestamp'));
    expect(sampleTable?.textContent).toContain(tZh('otlp.metrics.inspector.column.raw-timestamp'));
    expect(sampleTable?.textContent).toContain('T1000');
    expect(sampleTable?.textContent).toContain('2000');
    expect(sampleTable?.textContent).toContain(tZh('otlp.metrics.inspector.sample-state.empty'));
    expect(sampleTable?.textContent).toContain('20');
    expect(interactionContainer.querySelector('[data-otlp-metrics-selected-series-evidence="real-sample-evidence"]')).toBeNull();

    const graphAction = interactionContainer.querySelector('[data-otlp-metrics-inspector-action="graph"]') as HTMLButtonElement | null;
    await act(async () => {
      graphAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(mockState.replace).toHaveBeenCalledWith('/ingestion/otlp/metrics?query=http.server.duration');
  });

  it('saves and restores the current metrics explorer query view from shared UI controls', async () => {
    window.localStorage.removeItem('hertzbeat.otlp-metrics.saved-query-views');
    mockState.searchParams = new URLSearchParams(
      'query=http.server.duration&series=checkout_latency-0&filter=service.name%3D%22checkout%22&aggregation=p95&temporalAggregation=rate&groupBy=route&legendFormat=%7B%7Bservice.name%7D%7D+-+p95&formula=A+*+1000&step=60&limit=10&inspector=table&warningThreshold=75&criticalThreshold=90&expectedRange=on&serviceName=checkout&entityId=7&environment=prod&timeRange=last-1h&relatedMetricSource=pod&relatedMetricFamily=latency&relatedMetricReason=resource-filter&relatedMetricMatchedLabels=k8s_pod_name&relatedMetricResourceMatch=%7B%22k8s_pod_name%22%3A%22checkout-7d9%22%7D'
    );
    const savedViewRequests: Array<{ path: string; method: string; body?: Record<string, unknown> }> = [];
    let serverSavedViews: Record<string, unknown>[] = [];
    globalThis.fetch = vi.fn(async (input, init) => {
      const path = String(input);
      const method = String(init?.method || 'GET').toUpperCase();
      const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined;
      savedViewRequests.push({ path, method, body });
      if (path.endsWith('/api/signal/saved-view/metrics') && method === 'GET') {
        return new Response(JSON.stringify({ code: 0, data: serverSavedViews }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (path.endsWith('/api/signal/saved-view') && method === 'PUT') {
        if (body) {
          serverSavedViews = [body, ...serverSavedViews.filter(view => view.viewKey !== body.viewKey)];
        }
        return new Response(JSON.stringify({ code: 0, data: body }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (path.includes('/api/signal/saved-view/metrics/') && method === 'DELETE') {
        const viewKey = decodeURIComponent(path.split('/').pop() || '');
        serverSavedViews = serverSavedViews.filter(view => view.viewKey !== viewKey);
        return new Response(JSON.stringify({ code: 0, data: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ code: 1, msg: `Unexpected request ${method} ${path}` }), { status: 500 });
    }) as typeof fetch;
    const { default: OtlpMetricsPage } = await import('./page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<OtlpMetricsPage />);
      await flushDashboardEditPromises();
    });

    const savedViewPanel = interactionContainer.querySelector('[data-otlp-metrics-saved-views="route-query-views"]') as HTMLElement | null;
    expect(savedViewPanel).toBeTruthy();
    expect(savedViewPanel?.getAttribute('data-otlp-metrics-saved-views-owner')).toBe('hertzbeat-ui-panel-surface');
    expect(savedViewPanel?.getAttribute('data-otlp-metrics-saved-view-persistence')).toBe('server-first');
    expect(savedViewPanel?.getAttribute('data-otlp-metrics-saved-view-persistence-owner')).toBe('hertzbeat-api');
    expect(savedViewPanel?.getAttribute('data-otlp-metrics-saved-view-storage-key')).toBe('hertzbeat.otlp-metrics.saved-query-views');

    const persistenceCopy = interactionContainer.querySelector('[data-otlp-metrics-saved-view-persistence-copy="server-first"]') as HTMLElement | null;
    expect(persistenceCopy?.textContent).toContain(zhT('otlp.metrics.saved-view.persistence.server'));

    const saveAction = interactionContainer.querySelector('[data-otlp-metrics-saved-view-action="save-current"]') as HTMLButtonElement | null;
    expect(saveAction).toBeTruthy();
    expect(saveAction?.getAttribute('data-otlp-metrics-saved-view-action-owner')).toBe('hertzbeat-ui-button');

    const clipboardWrites: string[] = [];
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn((value: string) => {
        clipboardWrites.push(value);
        return Promise.resolve();
      }) }
    });
    const copyAction = interactionContainer.querySelector('[data-otlp-metrics-saved-view-copy-action="current"]') as HTMLButtonElement | null;
    expect(copyAction).toBeTruthy();
    expect(copyAction?.getAttribute('data-otlp-metrics-saved-view-copy-owner')).toBe('hertzbeat-ui-button');
    const dashboardPanelDraftAction = interactionContainer.querySelector('[data-otlp-metrics-dashboard-panel-draft-action="add-current"]') as HTMLButtonElement | null;
    expect(dashboardPanelDraftAction).toBeTruthy();
    expect(dashboardPanelDraftAction?.getAttribute('data-otlp-metrics-dashboard-panel-draft-action-owner')).toBe('hertzbeat-ui-button');
    const relatedCandidateContext = interactionContainer.querySelector('[data-otlp-metrics-related-candidate-context="backend-related-metric-candidate"]') as HTMLElement | null;
    expect(relatedCandidateContext).toBeTruthy();
    expect(relatedCandidateContext?.getAttribute('data-otlp-metrics-related-candidate-context-owner')).toBe('hertzbeat-ui-detail-rows');
    expect(relatedCandidateContext?.getAttribute('data-otlp-metrics-related-candidate-source')).toBe('pod');
    expect(relatedCandidateContext?.getAttribute('data-otlp-metrics-related-candidate-family')).toBe('latency');
    expect(relatedCandidateContext?.getAttribute('data-otlp-metrics-related-candidate-reason')).toBe('resource-filter');
    expect(relatedCandidateContext?.getAttribute('data-otlp-metrics-related-candidate-labels')).toBe('k8s_pod_name');
    expect(relatedCandidateContext?.textContent).toContain(zhT('otlp.metrics.related-candidate.title'));
    expect(relatedCandidateContext?.textContent).toContain('checkout-7d9');

    await act(async () => {
      copyAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(clipboardWrites[0]).toContain('/ingestion/otlp/metrics?');
    expect(clipboardWrites[0]).toContain('query=http.server.duration');
    expect(clipboardWrites[0]).toContain('aggregation=p95');
    expect(clipboardWrites[0]).toContain('formula=A+*+1000');

    await act(async () => {
      saveAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushDashboardEditPromises();
    });

    const savedViews = JSON.parse(window.localStorage.getItem('hertzbeat.otlp-metrics.saved-query-views') || '[]');
    expect(savedViews).toHaveLength(1);
    expect(savedViews[0]?.label).toBe('http.server.duration');
    expect(savedViews[0]?.description).toContain('p95');
    expect(savedViews[0]?.description).toContain('rate');
    expect(savedViews[0]?.description).toContain('{{service.name}} - p95');
    expect(savedViews[0]?.description).toContain('A * 1000');
    expect(savedViews[0]?.description).toContain('60');
    expect(savedViews[0]?.description).toContain('10');
    expect(savedViews[0]?.description).toContain('on');
    const savedParams = new URL(savedViews[0]?.route, 'http://localhost').searchParams;
    expect(savedViews[0]?.route).toContain('/ingestion/otlp/metrics?');
    expect(savedParams.get('query')).toBe('http.server.duration');
    expect(savedParams.get('series')).toBe('checkout_latency-0');
    expect(savedParams.get('filter')).toBe('service.name="checkout"');
    expect(savedParams.get('aggregation')).toBe('p95');
    expect(savedParams.get('temporalAggregation')).toBe('rate');
    expect(savedParams.get('groupBy')).toBe('route');
    expect(savedParams.get('legendFormat')).toBe('{{service.name}} - p95');
    expect(savedParams.get('formula')).toBe('A * 1000');
    expect(savedParams.get('step')).toBe('60');
    expect(savedParams.get('limit')).toBe('10');
    expect(savedParams.get('inspector')).toBe('table');
    expect(savedParams.get('warningThreshold')).toBe('75');
    expect(savedParams.get('criticalThreshold')).toBe('90');
    expect(savedParams.get('expectedRange')).toBe('on');
    expect(savedParams.get('serviceName')).toBe('checkout');
    expect(savedParams.get('entityId')).toBe('7');
    expect(savedParams.get('environment')).toBe('prod');
    expect(savedParams.get('timeRange')).toBe('last-1h');
    expect(savedParams.get('relatedMetricSource')).toBe('pod');
    expect(savedParams.get('relatedMetricFamily')).toBe('latency');
    expect(savedParams.get('relatedMetricReason')).toBe('resource-filter');
    expect(savedParams.get('relatedMetricMatchedLabels')).toBe('k8s_pod_name');
    expect(savedParams.get('relatedMetricResourceMatch')).toBe('{"k8s_pod_name":"checkout-7d9"}');
    const saveRequest = savedViewRequests.find(request => request.method === 'PUT' && request.body?.route === savedViews[0]?.route);
    expect(saveRequest?.path).toBe('/api/signal/saved-view');
    expect(saveRequest?.body).toEqual(expect.objectContaining({
      signal: 'metrics',
      viewKey: savedViews[0]?.id,
      querySnapshot: savedViews[0]?.route,
      payload: expect.stringContaining('createdAt')
    }));
    expect(interactionContainer.querySelector('[data-otlp-metrics-saved-views="route-query-views"]')?.getAttribute('data-otlp-metrics-saved-view-persistence')).toBe('server-first');

    const renameSavedViewAction = interactionContainer.querySelector('[data-otlp-metrics-saved-view-rename-action]') as HTMLButtonElement | null;
    expect(renameSavedViewAction).toBeTruthy();
    expect(renameSavedViewAction?.getAttribute('data-otlp-metrics-saved-view-rename-owner')).toBe('hertzbeat-ui-button');

    await act(async () => {
      renameSavedViewAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const renameInput = interactionContainer.querySelector('[data-otlp-metrics-saved-view-rename-input]') as HTMLInputElement | null;
    expect(renameInput).toBeTruthy();
    expect(renameInput?.getAttribute('data-otlp-metrics-saved-view-rename-input-owner')).toBe('hertzbeat-ui-input');

    await act(async () => {
      renameInput!.value = 'Checkout p95 latency';
      renameInput!.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    const renameSaveAction = interactionContainer.querySelector('[data-otlp-metrics-saved-view-rename-save-action]') as HTMLButtonElement | null;
    expect(renameSaveAction).toBeTruthy();
    expect(renameSaveAction?.getAttribute('data-otlp-metrics-saved-view-rename-save-owner')).toBe('hertzbeat-ui-button');

    await act(async () => {
      renameSaveAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushDashboardEditPromises();
    });

    const renamedViews = JSON.parse(window.localStorage.getItem('hertzbeat.otlp-metrics.saved-query-views') || '[]');
    expect(renamedViews).toHaveLength(1);
    expect(renamedViews[0]?.label).toBe('Checkout p95 latency');
    expect(renamedViews[0]?.route).toBe(savedViews[0]?.route);

    mockState.searchParams = new URLSearchParams(
      'query=process.runtime.jvm.memory.used&series=jvm_memory-0&filter=service.name%3D%22billing%22&aggregation=avg&temporalAggregation=avg&groupBy=pool&legendFormat=%7B%7Bservice.name%7D%7D+%2F+%7B%7Bpool%7D%7D&formula=A+%2F+1024&step=120&limit=7&inspector=table&warningThreshold=512&criticalThreshold=768&serviceName=billing&entityId=9&environment=stage&timeRange=last-6h'
    );
    await act(async () => {
      interactionRoot?.unmount();
      interactionContainer.innerHTML = '';
      interactionRoot = createRoot(interactionContainer);
      interactionRoot?.render(<OtlpMetricsPage />);
      await Promise.resolve();
    });

    const updateSavedViewAction = interactionContainer.querySelector('[data-otlp-metrics-saved-view-update-action]') as HTMLButtonElement | null;
    expect(updateSavedViewAction).toBeTruthy();
    expect(updateSavedViewAction?.getAttribute('data-otlp-metrics-saved-view-update-owner')).toBe('hertzbeat-ui-button');

    await act(async () => {
      updateSavedViewAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushDashboardEditPromises();
    });

    const updatedViews = JSON.parse(window.localStorage.getItem('hertzbeat.otlp-metrics.saved-query-views') || '[]');
    expect(updatedViews).toHaveLength(1);
    expect(updatedViews[0]?.label).toBe('Checkout p95 latency');
    expect(updatedViews[0]?.route).not.toBe(savedViews[0]?.route);
    expect(updatedViews[0]?.description).toContain('avg');
    expect(updatedViews[0]?.description).toContain('{{service.name}} / {{pool}}');
    expect(updatedViews[0]?.description).toContain('A / 1024');
    expect(updatedViews[0]?.description).toContain('120');
    expect(updatedViews[0]?.description).toContain('7');
    const updatedParams = new URL(updatedViews[0]?.route, 'http://localhost').searchParams;
    expect(updatedViews[0]?.route).toContain('/ingestion/otlp/metrics?');
    expect(updatedParams.get('query')).toBe('process.runtime.jvm.memory.used');
    expect(updatedParams.get('series')).toBe('jvm_memory-0');
    expect(updatedParams.get('filter')).toBe('service.name="billing"');
    expect(updatedParams.get('aggregation')).toBe('avg');
    expect(updatedParams.get('temporalAggregation')).toBe('avg');
    expect(updatedParams.get('groupBy')).toBe('pool');
    expect(updatedParams.get('legendFormat')).toBe('{{service.name}} / {{pool}}');
    expect(updatedParams.get('formula')).toBe('A / 1024');
    expect(updatedParams.get('step')).toBe('120');
    expect(updatedParams.get('limit')).toBe('7');
    expect(updatedParams.get('inspector')).toBe('table');
    expect(updatedParams.get('warningThreshold')).toBe('512');
    expect(updatedParams.get('criticalThreshold')).toBe('768');
    expect(updatedParams.get('serviceName')).toBe('billing');
    expect(updatedParams.get('entityId')).toBe('9');
    expect(updatedParams.get('environment')).toBe('stage');
    expect(updatedParams.get('timeRange')).toBe('last-6h');

    const savedViewAction = interactionContainer.querySelector('[data-otlp-metrics-saved-view-select-action]') as HTMLButtonElement | null;
    expect(savedViewAction).toBeTruthy();
    expect(savedViewAction?.getAttribute('data-otlp-metrics-saved-view-select-owner')).toBe('hertzbeat-ui-button');
    mockState.replace.mockClear();

    await act(async () => {
      savedViewAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const restoredRoute = String(mockState.replace.mock.calls[0]?.[0]);
    const restoredParams = new URL(restoredRoute, 'http://localhost').searchParams;
    expect(restoredRoute).toContain('/ingestion/otlp/metrics?');
    expect(restoredParams.get('query')).toBe('process.runtime.jvm.memory.used');
    expect(restoredParams.get('series')).toBe('jvm_memory-0');
    expect(restoredParams.get('filter')).toBe('service.name="billing"');
    expect(restoredParams.get('aggregation')).toBe('avg');
    expect(restoredParams.get('temporalAggregation')).toBe('avg');
    expect(restoredParams.get('groupBy')).toBe('pool');
    expect(restoredParams.get('legendFormat')).toBe('{{service.name}} / {{pool}}');
    expect(restoredParams.get('formula')).toBe('A / 1024');
    expect(restoredParams.get('inspector')).toBe('table');
    expect(restoredParams.get('serviceName')).toBe('billing');
    expect(restoredParams.get('entityId')).toBe('9');
    expect(restoredParams.get('environment')).toBe('stage');

    const deleteSavedViewAction = interactionContainer.querySelector('[data-otlp-metrics-saved-view-delete-action]') as HTMLButtonElement | null;
    expect(deleteSavedViewAction).toBeTruthy();
    expect(deleteSavedViewAction?.getAttribute('data-otlp-metrics-saved-view-delete-owner')).toBe('hertzbeat-ui-button');

    await act(async () => {
      deleteSavedViewAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushDashboardEditPromises();
    });

    expect(JSON.parse(window.localStorage.getItem('hertzbeat.otlp-metrics.saved-query-views') || '[]')).toHaveLength(0);
    expect(savedViewRequests.some(request => request.method === 'DELETE' && request.path.includes('/api/signal/saved-view/metrics/'))).toBe(true);
    expect(interactionContainer.querySelector('[data-otlp-metrics-saved-views="route-query-views"]')?.getAttribute('data-otlp-metrics-saved-view-persistence')).toBe('server-first');
  });

  it('updates the originating dashboard widget when saving metrics in panel edit mode', async () => {
    mockState.searchParams = new URLSearchParams(
      'intent=edit-panel&dashboardKey=signals-overview&panelId=metrics-latency&draftKey=metrics-draft-latency&returnTo=%2Fdashboard%3Fdashboard%3Dsignals-overview&returnLabel=Signals%20overview&query=http.server.duration&series=checkout_latency-0&filter=service.name%3D%22checkout%22&aggregation=p95&temporalAggregation=rate&groupBy=route&legendFormat=%7B%7Bservice.name%7D%7D+-+p95&formula=A+*+1000&step=60&limit=10&inspector=table&serviceName=checkout&entityId=7&environment=prod&timeRange=last-1h&relatedMetricSource=pod&relatedMetricFamily=latency&relatedMetricReason=resource-filter&relatedMetricMatchedLabels=k8s_pod_name&relatedMetricResourceMatch=%7B%22k8s_pod_name%22%3A%22checkout-7d9%22%7D'
    );
    const { default: OtlpMetricsPage } = await import('./page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<OtlpMetricsPage />);
      await Promise.resolve();
    });

    const dashboardPanelDraftAction = interactionContainer.querySelector('[data-otlp-metrics-dashboard-panel-draft-action="update-current"]') as HTMLButtonElement | null;
    expect(dashboardPanelDraftAction).toBeTruthy();
    expect(dashboardPanelDraftAction?.getAttribute('data-otlp-metrics-dashboard-panel-draft-action-mode')).toBe('edit-panel');
    expect(dashboardPanelDraftAction?.getAttribute('data-otlp-metrics-dashboard-panel-draft-action-dashboard')).toBe('signals-overview');
    expect(dashboardPanelDraftAction?.getAttribute('data-otlp-metrics-dashboard-panel-draft-action-panel')).toBe('metrics-latency');
    const queryInput = interactionContainer.querySelector('[data-otlp-metrics-query-input="true"]') as HTMLInputElement | null;
    const runQueryAction = interactionContainer.querySelector('[data-otlp-metrics-run-query-action="true"]') as HTMLButtonElement | null;
    expect(queryInput).toBeTruthy();
    expect(runQueryAction).toBeTruthy();

    await act(async () => {
      queryInput!.value = 'process.runtime.jvm.memory.used';
      queryInput!.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    await act(async () => {
      runQueryAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const editedRoute = String(mockState.replace.mock.calls.at(-1)?.[0]);
    expect(editedRoute).toContain('query=process.runtime.jvm.memory.used');
    expect(editedRoute).toContain('intent=edit-panel');
    expect(editedRoute).toContain('dashboardKey=signals-overview');
    expect(editedRoute).toContain('panelId=metrics-latency');
    expect(editedRoute).toContain('draftKey=metrics-draft-latency');
    expect(editedRoute).toContain('returnTo=%2Fdashboard%3Fdashboard%3Dsignals-overview');
    expect(editedRoute).toContain('returnLabel=Signals+overview');
    const savedDashboards: unknown[] = [];
    globalThis.fetch = vi.fn(async (input, init) => {
      const path = String(input);
      const method = String(init?.method || 'GET').toUpperCase();
      if (path.includes('/api/signal/dashboard-panel-draft') && method === 'PUT') {
        return new Response(JSON.stringify({ code: 0, data: JSON.parse(String(init?.body)) }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (path.endsWith('/api/signal/dashboard') && method === 'GET') {
        return new Response(JSON.stringify({
          code: 0,
          data: [{
            dashboardKey: 'signals-overview',
            title: 'Signals overview',
            description: 'Signals',
            tags: 'metrics',
            layout: JSON.stringify([{ i: 'metrics-latency', x: 0, y: 0, w: 6, h: 4 }]),
            widgets: JSON.stringify([{
              id: 'metrics-latency',
              draftKey: 'metrics-draft-latency',
              signal: 'metrics',
              title: 'Old latency',
              visualization: 'graph',
              route: '/ingestion/otlp/metrics?query=old',
              querySnapshot: '/ingestion/otlp/metrics?query=old'
            }]),
            panelMap: JSON.stringify({ 'metrics-latency': 'metrics-draft-latency' })
          }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (path.endsWith('/api/signal/dashboard') && method === 'PUT') {
        const dashboard = JSON.parse(String(init?.body));
        savedDashboards.push(dashboard);
        return new Response(JSON.stringify({ code: 0, data: dashboard }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ code: 1, msg: `Unexpected request ${method} ${path}` }), { status: 500 });
    }) as typeof fetch;

    await act(async () => {
      dashboardPanelDraftAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushDashboardEditPromises();
    });

    const draftRequest = vi.mocked(globalThis.fetch).mock.calls.find(call =>
      String(call[0]).includes('/api/signal/dashboard-panel-draft')
    );
    const draftBody = JSON.parse(String(draftRequest?.[1]?.body));
    expect(draftBody).toEqual(expect.objectContaining({
      signal: 'metrics',
      draftKey: 'metrics-draft-latency',
      visualization: 'table',
      querySnapshot: expect.stringContaining('/ingestion/otlp/metrics?')
    }));
    expect(draftBody.route).toContain('query=http.server.duration');
    expect(draftBody.route).toContain('aggregation=p95');
    expect(draftBody.route).toContain('relatedMetricSource=pod');
    expect(draftBody.route).toContain('relatedMetricFamily=latency');
    expect(draftBody.route).toContain('relatedMetricReason=resource-filter');
    expect(draftBody.route).toContain('relatedMetricMatchedLabels=k8s_pod_name');
    expect(new URL(draftBody.route, 'http://localhost').searchParams.get('relatedMetricResourceMatch')).toBe('{"k8s_pod_name":"checkout-7d9"}');
    expect(JSON.parse(draftBody.payload).dashboardPanelEdit).toEqual(expect.objectContaining({
      intent: 'edit-panel',
      dashboardKey: 'signals-overview',
      panelId: 'metrics-latency',
      draftKey: 'metrics-draft-latency',
      returnTo: '/dashboard?dashboard=signals-overview',
      returnLabel: 'Signals overview'
    }));
    expect(savedDashboards).toHaveLength(1);
    const savedDashboard = savedDashboards[0] as { widgets: string; panelMap: string };
    const savedWidget = JSON.parse(savedDashboard.widgets)[0];
    expect(savedWidget).toEqual(expect.objectContaining({
      id: 'metrics-latency',
      draftKey: 'metrics-draft-latency',
      signal: 'metrics',
      visualization: 'table',
      route: expect.stringContaining('query=http.server.duration')
    }));
    expect(savedWidget.route).toContain('aggregation=p95');
    expect(savedWidget.route).toContain('relatedMetricSource=pod');
    expect(new URL(savedWidget.route, 'http://localhost').searchParams.get('relatedMetricResourceMatch')).toBe('{"k8s_pod_name":"checkout-7d9"}');
    expect(JSON.parse(savedWidget.payload).dashboardPanelEdit).toEqual(expect.objectContaining({
      dashboardKey: 'signals-overview',
      panelId: 'metrics-latency'
    }));
    expect(JSON.parse(savedDashboard.panelMap)).toEqual({ 'metrics-latency': 'metrics-draft-latency' });
    const dashboardPanelDraftStatus = interactionContainer.querySelector('[data-otlp-metrics-dashboard-panel-draft-status="saved"]') as HTMLElement | null;
    expect(dashboardPanelDraftStatus?.getAttribute('data-otlp-metrics-dashboard-panel-draft-status-mode')).toBe('edit-panel');
    expect(dashboardPanelDraftStatus?.textContent).toContain(zhT('otlp.metrics.dashboard-panel-draft.update-saved'));
  });

  it('renders searchable selected metric attributes from real series labels', async () => {
    mockState.metricSeries = [
      {
        key: 'checkout_latency-0',
        name: 'checkout.latency',
        labels: {
          'service.name': 'checkout',
          'deployment.environment.name': 'prod',
          route: '/checkout',
          'hertzbeat.entity_id': '7',
          trace_id: 'trace-checkout',
          span_id: 'span-checkout'
        },
        points: [[1000, 12]],
        latestValue: 12
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

    const attributePanel = interactionContainer.querySelector('[data-otlp-metrics-attribute-summary="selected-series-labels"]') as HTMLElement | null;
    expect(attributePanel).not.toBeNull();
    expect(attributePanel?.getAttribute('data-otlp-metrics-attribute-summary-owner')).toBe('hertzbeat-ui-collapsible-section');
    expect(attributePanel?.getAttribute('data-hz-collapsible-owner')).toBe('hertzbeat-ui-collapsible-section');
    expect(attributePanel?.textContent).toContain(tZh('otlp.metrics.attributes.title'));

    const attributeControls = interactionContainer.querySelector('[data-otlp-metrics-attribute-controls="search"]') as HTMLElement | null;
    expect(attributeControls?.getAttribute('data-otlp-metrics-attribute-controls-owner')).toBe('hertzbeat-ui-control-stack');
    expect(attributeControls?.getAttribute('data-hz-action-group-owner') || attributeControls?.getAttribute('data-hz-control-stack-owner')).toBe('hertzbeat-ui-control-stack');

    const attributeTable = interactionContainer.querySelector('[data-otlp-metrics-attribute-table="selected-series-labels"]') as HTMLElement | null;
    expect(attributeTable?.getAttribute('data-otlp-metrics-attribute-table-owner')).toBe('hertzbeat-ui-data-table');
    expect(attributeTable?.getAttribute('data-hz-ui')).toBe('data-table');
    expect(attributeTable?.getAttribute('data-otlp-metrics-attribute-table-count')).toBe('6');
    expect(attributeTable?.textContent).toContain('deployment.environment.name');
    expect(attributeTable?.textContent).toContain('prod');
    expect(attributeTable?.textContent).toContain('service.name');
    expect(attributeTable?.textContent).toContain('checkout');
    expect(attributeTable?.textContent).toContain('route');

    const serviceFilterAction = interactionContainer.querySelector('[data-otlp-metrics-attribute-filter-action="service.name"]') as HTMLButtonElement | null;
    expect(serviceFilterAction?.getAttribute('data-otlp-metrics-attribute-filter-action-owner')).toBe('hertzbeat-ui-button');
    expect(serviceFilterAction?.getAttribute('aria-label')).toContain('service.name');

    await act(async () => {
      serviceFilterAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const filterHref = String(mockState.replace.mock.calls.at(-1)?.[0]);
    expect(filterHref).toContain('/ingestion/otlp/metrics?');
    expect(filterHref).toContain('filter=service.name%3D%22checkout%22');
    const filterParams = new URL(filterHref, 'http://localhost').searchParams;
    expect(filterParams.get('series')).toBe('checkout_latency-0');
    expect(filterParams.get('entityId')).toBe('7');
    expect(filterParams.get('serviceName')).toBe('checkout');
    expect(filterParams.get('environment')).toBe('prod');
    expect(filterParams.get('traceId')).toBe('trace-checkout');
    expect(filterParams.get('spanId')).toBe('span-checkout');

    const serviceContainsAction = interactionContainer.querySelector('[data-otlp-metrics-attribute-contains-action="service.name"]') as HTMLButtonElement | null;
    expect(serviceContainsAction?.getAttribute('data-otlp-metrics-attribute-contains-action-owner')).toBe('hertzbeat-ui-button');
    expect(serviceContainsAction?.getAttribute('aria-label')).toContain('service.name');

    await act(async () => {
      serviceContainsAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const containsHref = String(mockState.replace.mock.calls.at(-1)?.[0]);
    const containsParams = new URL(containsHref, 'http://localhost').searchParams;
    expect(containsParams.get('filter')).toContain('service.name CONTAINS checkout');
    expect(containsParams.get('series')).toBe('checkout_latency-0');
    expect(containsParams.get('entityId')).toBe('7');
    expect(containsParams.get('serviceName')).toBe('checkout');
    expect(containsParams.get('environment')).toBe('prod');
    expect(containsParams.get('traceId')).toBe('trace-checkout');
    expect(containsParams.get('spanId')).toBe('span-checkout');

    const serviceExcludeAction = interactionContainer.querySelector('[data-otlp-metrics-attribute-filter-out-action="service.name"]') as HTMLButtonElement | null;
    expect(serviceExcludeAction?.getAttribute('data-otlp-metrics-attribute-filter-out-action-owner')).toBe('hertzbeat-ui-button');
    expect(serviceExcludeAction?.getAttribute('aria-label')).toContain('service.name');

    await act(async () => {
      serviceExcludeAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const excludeHref = String(mockState.replace.mock.calls.at(-1)?.[0]);
    const excludeParams = new URL(excludeHref, 'http://localhost').searchParams;
    expect(excludeParams.get('filter')).toContain('service.name!="checkout"');
    expect(excludeParams.get('series')).toBe('checkout_latency-0');
    expect(excludeParams.get('entityId')).toBe('7');
    expect(excludeParams.get('serviceName')).toBe('checkout');
    expect(excludeParams.get('environment')).toBe('prod');
    expect(excludeParams.get('traceId')).toBe('trace-checkout');
    expect(excludeParams.get('spanId')).toBe('span-checkout');

    const serviceExistsAction = interactionContainer.querySelector('[data-otlp-metrics-attribute-exists-action="service.name"]') as HTMLButtonElement | null;
    expect(serviceExistsAction?.getAttribute('data-otlp-metrics-attribute-exists-action-owner')).toBe('hertzbeat-ui-button');
    expect(serviceExistsAction?.getAttribute('aria-label')).toContain('service.name');

    await act(async () => {
      serviceExistsAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const existsHref = String(mockState.replace.mock.calls.at(-1)?.[0]);
    const existsParams = new URL(existsHref, 'http://localhost').searchParams;
    expect(existsParams.get('filter')).toContain('service.name EXISTS');
    expect(existsParams.get('series')).toBe('checkout_latency-0');
    expect(existsParams.get('entityId')).toBe('7');
    expect(existsParams.get('serviceName')).toBe('checkout');
    expect(existsParams.get('environment')).toBe('prod');
    expect(existsParams.get('traceId')).toBe('trace-checkout');
    expect(existsParams.get('spanId')).toBe('span-checkout');

    const serviceNotExistsAction = interactionContainer.querySelector('[data-otlp-metrics-attribute-not-exists-action="service.name"]') as HTMLButtonElement | null;
    expect(serviceNotExistsAction?.getAttribute('data-otlp-metrics-attribute-not-exists-action-owner')).toBe('hertzbeat-ui-button');
    expect(serviceNotExistsAction?.getAttribute('aria-label')).toContain('service.name');

    await act(async () => {
      serviceNotExistsAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const notExistsHref = String(mockState.replace.mock.calls.at(-1)?.[0]);
    const notExistsParams = new URL(notExistsHref, 'http://localhost').searchParams;
    expect(notExistsParams.get('filter')).toContain('service.name NOT EXISTS');
    expect(notExistsParams.get('series')).toBe('checkout_latency-0');
    expect(notExistsParams.get('entityId')).toBe('7');
    expect(notExistsParams.get('serviceName')).toBe('checkout');
    expect(notExistsParams.get('environment')).toBe('prod');
    expect(notExistsParams.get('traceId')).toBe('trace-checkout');
    expect(notExistsParams.get('spanId')).toBe('span-checkout');

    const routeGroupAction = interactionContainer.querySelector('[data-otlp-metrics-attribute-group-action="route"]') as HTMLButtonElement | null;
    expect(routeGroupAction?.getAttribute('data-otlp-metrics-attribute-group-action-owner')).toBe('hertzbeat-ui-button');
    expect(routeGroupAction?.getAttribute('aria-label')).toContain('route');

    await act(async () => {
      routeGroupAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const groupHref = String(mockState.replace.mock.calls.at(-1)?.[0]);
    expect(groupHref).toContain('filter=service.name%3D%22checkout%22');
    expect(groupHref).toContain('groupBy=route');
    const groupParams = new URL(groupHref, 'http://localhost').searchParams;
    expect(groupParams.get('series')).toBe('checkout_latency-0');
    expect(groupParams.get('traceId')).toBe('trace-checkout');
    expect(groupParams.get('spanId')).toBe('span-checkout');

    const searchInput = interactionContainer.querySelector('[data-otlp-metrics-attribute-search-input="true"]') as HTMLInputElement | null;
    expect(searchInput?.getAttribute('data-otlp-metrics-attribute-search-input-owner')).toBe('hertzbeat-ui-input');
    expect(searchInput?.getAttribute('data-hz-input-width')).toBe('metrics-inventory-search');
    expect(searchInput?.value).toBe('');

    await act(async () => {
      if (searchInput) {
        searchInput.value = 'prod';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      await Promise.resolve();
    });

    const attributeSearchHref = String(mockState.replace.mock.calls.at(-1)?.[0]);
    expect(attributeSearchHref).toContain('seriesAttributeSearch=prod');
  });

  it('restores selected metric attribute search from route state', async () => {
    mockState.searchParams = new URLSearchParams('seriesAttributeSearch=prod');
    mockState.metricSeries = [
      {
        key: 'checkout_latency-0',
        name: 'checkout.latency',
        labels: {
          'service.name': 'checkout',
          'deployment.environment.name': 'prod',
          route: '/checkout'
        },
        points: [[1000, 12]],
        latestValue: 12
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

    const searchInput = interactionContainer.querySelector('[data-otlp-metrics-attribute-search-input="true"]') as HTMLInputElement | null;
    expect(searchInput?.value).toBe('prod');

    const filteredAttributeTable = interactionContainer.querySelector('[data-otlp-metrics-attribute-table="selected-series-labels"]') as HTMLElement | null;
    expect(filteredAttributeTable?.getAttribute('data-otlp-metrics-attribute-table-count')).toBe('1');
    expect(filteredAttributeTable?.textContent).toContain('deployment.environment.name');
    expect(filteredAttributeTable?.textContent).toContain('prod');
    expect(filteredAttributeTable?.textContent).not.toContain('service.name');
    expect(filteredAttributeTable?.textContent).not.toContain('/checkout');
  });

  it('replaces metrics attribute filters from selected series labels', async () => {
    mockState.searchParams = new URLSearchParams('filter=old.attr%3D%22stale%22');
    mockState.metricSeries = [
      {
        key: 'checkout_latency-0',
        name: 'checkout.latency',
        labels: {
          'service.name': 'checkout',
          route: '/checkout',
          trace_id: 'trace-checkout',
          span_id: 'span-checkout'
        },
        points: [[1000, 12]],
        latestValue: 12
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

    const replaceAction = interactionContainer.querySelector('[data-otlp-metrics-attribute-replace-action="service.name"]') as HTMLButtonElement | null;
    expect(replaceAction).not.toBeNull();
    expect(replaceAction?.getAttribute('data-otlp-metrics-attribute-replace-action-owner')).toBe('hertzbeat-ui-button');
    expect(replaceAction?.getAttribute('aria-label')).toContain('service.name');

    await act(async () => {
      replaceAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const href = String(mockState.replace.mock.calls.at(-1)?.[0]);
    expect(href).toContain('/ingestion/otlp/metrics?');
    expect(href).toContain('filter=service.name%3D%22checkout%22');
    expect(href).not.toContain('old.attr');
    const params = new URL(href, 'http://localhost').searchParams;
    expect(params.get('series')).toBe('checkout_latency-0');
    expect(params.get('serviceName')).toBe('checkout');
    expect(params.get('traceId')).toBe('trace-checkout');
    expect(params.get('spanId')).toBe('span-checkout');
  });

  it('filters metrics group values from the series table back into the query route', async () => {
    mockState.searchParams = new URLSearchParams('groupBy=service_name');
    mockState.metricSeries = [
      {
        key: 'checkout_latency-0',
        name: 'checkout.latency',
        labels: {
          service_name: 'checkout',
          'service.name': 'checkout'
        },
        points: [[1000, 12]],
        latestValue: 12
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

    const groupValueAction = interactionContainer.querySelector(
      '[data-otlp-metrics-series-group-filter-action="service_name"][data-otlp-metrics-series-group-filter-value="checkout"]'
    ) as HTMLButtonElement | null;
    expect(groupValueAction).not.toBeNull();
    expect(groupValueAction?.getAttribute('data-otlp-metrics-series-group-filter-owner')).toBe('hertzbeat-ui-button');
    expect(groupValueAction?.getAttribute('aria-label')).toContain('service_name');

    await act(async () => {
      groupValueAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const href = String(mockState.replace.mock.calls.at(-1)?.[0]);
    expect(href).toContain('/ingestion/otlp/metrics?');
    expect(href).toContain('filter=service_name%3D%22checkout%22');
    expect(href).toContain('groupBy=service_name');
  });

  it('narrows metrics inventory rows by service without requiring groupBy', async () => {
    mockState.searchParams = new URLSearchParams('query=http.server.duration&filter=route%3D%22%2Fcheckout%22&timeRange=last-1h&inventorySearch=checkout&inventorySort=time-series');
    mockState.metricSeries = [
      {
        key: 'checkout_latency-0',
        name: 'checkout.latency',
        labels: {
          'service.name': 'checkout'
        },
        points: [[1000, 12]],
        latestValue: 12
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

    const inventorySearchInput = interactionContainer.querySelector('[data-otlp-metrics-inventory-search-input="true"]') as HTMLInputElement | null;
    const inventorySortSelect = interactionContainer.querySelector('[data-otlp-metrics-inventory-sort-select="true"]') as HTMLElement | null;
    expect(inventorySearchInput?.value).toBe('checkout');
    expect(inventorySortSelect).not.toBeNull();

    await act(async () => {
      inventorySearchInput!.value = 'latency';
      inventorySearchInput!.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    const searchHref = String(mockState.replace.mock.calls.at(-1)?.[0]);
    expect(searchHref).toContain('inventorySearch=latency');
    expect(searchHref).toContain('inventorySort=time-series');

    await act(async () => {
      inventorySortSelect!.querySelector('[data-hz-ui="select-trigger"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    await act(async () => {
      inventorySortSelect!.querySelector('[data-otlp-metrics-inventory-sort-option="samples"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const sortHref = String(mockState.replace.mock.calls.at(-1)?.[0]);
    expect(sortHref).toContain('inventorySearch=checkout');
    expect(sortHref).toContain('inventorySort=samples');

    const serviceAction = interactionContainer.querySelector(
      '[data-otlp-metrics-series-service-filter-action="checkout"]'
    ) as HTMLButtonElement | null;
    expect(serviceAction).not.toBeNull();
    expect(serviceAction?.getAttribute('data-otlp-metrics-series-service-filter-owner')).toBe('hertzbeat-ui-button');
    expect(serviceAction?.getAttribute('aria-label')).toContain('checkout');

    await act(async () => {
      serviceAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const href = String(mockState.replace.mock.calls.at(-1)?.[0]);
    expect(href).toContain('/ingestion/otlp/metrics?');
    expect(href).toContain('query=http.server.duration');
    expect(href).toContain('filter=route%3D%22%2Fcheckout%22');
    expect(href).toContain('serviceName=checkout');
    expect(href).toContain('series=checkout_latency-0');
    expect(href).toContain('timeRange=last-1h');
    expect(href).not.toContain('groupBy=');
  });

  it('paginates the metrics inventory through route-backed shared controls', async () => {
    mockState.searchParams = new URLSearchParams('query=http.server.duration&inventoryPageSize=5&inventoryPageIndex=1');
    mockState.metricSeries = [
      {
        key: 'alpha_latency-0',
        name: 'alpha.latency',
        labels: { 'service.name': 'alpha' },
        points: [[1000, 1]],
        latestValue: 1
      },
      {
        key: 'bravo_latency-0',
        name: 'bravo.latency',
        labels: { 'service.name': 'bravo' },
        points: [[1000, 2]],
        latestValue: 2
      },
      {
        key: 'charlie_latency-0',
        name: 'charlie.latency',
        labels: { 'service.name': 'charlie' },
        points: [[1000, 3]],
        latestValue: 3
      },
      {
        key: 'delta_latency-0',
        name: 'delta.latency',
        labels: { 'service.name': 'delta' },
        points: [[1000, 4]],
        latestValue: 4
      },
      {
        key: 'echo_latency-0',
        name: 'echo.latency',
        labels: { 'service.name': 'echo' },
        points: [[1000, 5]],
        latestValue: 5
      },
      {
        key: 'foxtrot_latency-0',
        name: 'foxtrot.latency',
        labels: { 'service.name': 'foxtrot' },
        points: [[1000, 6]],
        latestValue: 6
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

    const inventoryTable = interactionContainer.querySelector('[data-otlp-metrics-inventory="metric-inventory"]') as HTMLElement | null;
    const pagination = interactionContainer.querySelector('[data-otlp-metrics-inventory-pagination="shared-pagination-bar"]') as HTMLElement | null;
    expect(inventoryTable?.getAttribute('data-otlp-metrics-inventory-page-size')).toBe('5');
    expect(inventoryTable?.getAttribute('data-otlp-metrics-inventory-page-index')).toBe('1');
    expect(inventoryTable?.getAttribute('data-otlp-metrics-inventory-filtered-count')).toBe('6');
    expect(pagination?.getAttribute('data-otlp-metrics-inventory-pagination-owner')).toBe('hertzbeat-ui-pagination-bar');
    expect(interactionContainer.querySelector('[data-otlp-metrics-inventory-query-action="foxtrot_latency-0"]')).not.toBeNull();
    expect(interactionContainer.querySelector('[data-otlp-metrics-inventory-query-action="alpha_latency-0"]')).toBeNull();

    const nextButton = pagination?.querySelector('[data-otlp-metrics-inventory-pagination-next="true"]') as HTMLButtonElement | null;
    expect(nextButton?.disabled).toBe(true);
    const previousButton = pagination?.querySelector('[data-otlp-metrics-inventory-pagination-previous="true"]') as HTMLButtonElement | null;
    expect(previousButton?.disabled).toBe(false);

    await act(async () => {
      previousButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const previousHref = String(mockState.replace.mock.calls.at(-1)?.[0]);
    expect(previousHref).toContain('inventoryPageSize=5');
    expect(previousHref).not.toContain('inventoryPageIndex=1');

    const pageSizeSelect = pagination?.querySelector('[data-otlp-metrics-inventory-pagination-page-size="true"]') as HTMLElement | null;
    expect(pageSizeSelect).not.toBeNull();

    await act(async () => {
      pageSizeSelect!.querySelector('[data-hz-ui="select-trigger"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    await act(async () => {
      pageSizeSelect!.querySelector('[data-otlp-metrics-inventory-page-size-option="20"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const pageSizeHref = String(mockState.replace.mock.calls.at(-1)?.[0]);
    expect(pageSizeHref).toContain('inventoryPageSize=20');
    expect(pageSizeHref).not.toContain('inventoryPageIndex=1');
  });

  it('keeps custom metrics groupBy dimensions visible after route reload', async () => {
    mockState.searchParams = new URLSearchParams('groupBy=route');
    mockState.metricSeries = [
      {
        key: 'checkout_latency-0',
        name: 'checkout.latency',
        labels: {
          route: '/checkout',
          service_name: 'checkout'
        },
        points: [[1000, 12]],
        latestValue: 12
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

    const groupBySelect = interactionContainer.querySelector('[data-otlp-metrics-group-by-select="true"]') as HTMLElement | null;
    expect(groupBySelect).not.toBeNull();
    await act(async () => {
      groupBySelect!.querySelector('[data-hz-ui="select-trigger"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(groupBySelect?.querySelector('[data-otlp-metrics-group-by-option="route"]')).not.toBeNull();
    expect(groupBySelect?.textContent).toContain('route');

    const seriesSetSummary = interactionContainer.querySelector('[data-otlp-metrics-series-set-summary="service-entity-scope"]') as HTMLElement | null;
    expect(seriesSetSummary?.textContent).toContain('route');
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
    expect(html).toContain('data-otlp-metrics-detail-source-context="direct"');
    expect(html).toContain('data-otlp-metrics-detail-source-match="trace-span"');
    expect(html).toContain('data-otlp-metrics-detail-selected-series="http_server_duration-1"');
    expect(html).toContain('data-otlp-metrics-detail-requested-trace="trace-target"');
    expect(html).toContain('data-otlp-metrics-detail-requested-span="span-target"');
    expect(html).toContain('data-otlp-metrics-detail-requested-service="checkout"');
    expect(html).toContain('data-otlp-metrics-detail-selected-trace="trace-target"');
    expect(html).toContain('data-otlp-metrics-detail-selected-span="span-target"');
    expect(html).toContain('data-otlp-metrics-detail-selected-service="checkout"');
    expect(html).toContain('data-otlp-metrics-selected-series-evidence-series="http_server_duration-1"');
    expect(html).toContain('data-otlp-metrics-selected-series-evidence-trace="trace-target"');
    expect(html).toContain('data-otlp-metrics-selected-series-evidence-span="span-target"');
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
