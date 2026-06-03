import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import {
  buildConsoleFacts,
  buildConsoleMetrics,
  buildConsoleRows,
  buildContextRows,
  buildMetricsExplorerState,
  buildMetricsHandoffLinks,
  buildMetricSeriesRows,
  buildMetricSeriesAttributionDiagnostics,
  buildMetricSeriesContextRows,
  buildMetricSeriesEvidenceRows,
  buildMetricSeriesLinkedRecordRows,
  buildMetricSeriesViews,
  buildMetricTrendBars,
  buildMetricsChartOption,
  buildMetricsDataZoomTimeContext
} from './view-model';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('otlp metrics view model', () => {
  it('builds the cold metrics Workbench empty-state summary', () => {
    expect(
      buildMetricsExplorerState(
        {
          query: '',
          stats: { totalSeries: 0, nonEmptySeries: 0 },
          results: { frames: [] },
          emptyStateReason: 'no_context'
        } as any,
        t
      )
    ).toEqual({
      chartLabel: t('otlp.metrics.explorer.chart-label', { count: 0 }),
      hasSeries: false,
      emptyTitle: t('otlp.metrics.explorer.empty-title'),
      noMetricsTitle: t('otlp.metrics.explorer.no-metrics-title'),
      sendMetricsLabel: t('otlp.metrics.explorer.waiting-ingest'),
      seriesCountLabel: t('otlp.metrics.explorer.series-count', { count: 0 })
    });
  });

  it('builds console facts', () => {
    expect(
      buildConsoleFacts(
        {
          datasource: 'prometheus',
          queryMode: 'builder',
          stats: { totalSeries: 4, nonEmptySeries: 2, latestObservedAt: 1712730000000 }
        } as any,
        t,
        () => '2026-04-10 18:00:00'
      )
    ).toEqual([
      { label: t('otlp.metrics.stats.total-series'), value: '4' },
      { label: t('otlp.metrics.stats.non-empty-series'), value: '2' },
      { label: t('otlp.metrics.stats.datasource'), value: 'prometheus' },
      { label: t('otlp.metrics.stats.latest-observed'), value: '2026-04-10 18:00:00' }
    ]);
  });

  it('builds console metrics', () => {
    expect(
      buildConsoleMetrics(
        {
          stats: { nonEmptySeries: 2, totalSeries: 4 },
          query: 'up',
          errorMessage: null
        } as any,
        t
      )
    ).toEqual([
      { label: t('otlp.metrics.stats.non-empty-series'), value: '2' },
      { label: t('otlp.metrics.stats.series-total'), value: '4' },
      { label: t('otlp.metrics.stats.intake-state'), value: t('common.ready') }
    ]);
  });

  it('builds context rows', () => {
    expect(
      buildContextRows(
        {
          context: { serviceName: 'checkout', serviceNamespace: 'payments', start: 1712730000000, end: 1712733600000 },
          results: { msg: 'ok' }
        } as any,
        t,
        () => '2026-04-10 18:00:00'
      )
    ).toEqual([
      { title: t('otlp.metrics.context.current-service'), copy: 'checkout', meta: 'payments' },
      { title: t('otlp.metrics.context.time-range'), copy: '2026-04-10 18:00:00 → 2026-04-10 18:00:00', meta: 'ok' }
    ]);
  });

  it('builds console rows', () => {
    expect(
      buildConsoleRows(
        {
          query: 'up',
          emptyStateReason: null,
          errorMessage: null
        } as any,
        t
      )
    ).toEqual([
      { title: t('otlp.metrics.context.current-metric'), copy: 'up', meta: t('otlp.metrics.query-ready') },
      { title: t('otlp.metrics.context.handoff-destination'), copy: t('otlp.metrics.context.handoff-copy'), meta: t('otlp.metrics.context.handoff-meta') }
    ]);
  });

  it('builds metric series views from frame results', () => {
    expect(
      buildMetricSeriesViews(
        {
          results: {
            frames: [
              {
                schema: {
                  labels: { __name__: 'http_requests_total', service_name: 'checkout' }
                },
                data: [
                  [1000, 12],
                  [2000, 14]
                ]
              }
            ]
          }
        } as any,
        t
      )
    ).toEqual([
      {
        key: 'http_requests_total-0',
        name: 'http_requests_total',
        labels: { __name__: 'http_requests_total', service_name: 'checkout' },
        points: [
          [1000, 12],
          [2000, 14]
        ],
        latestValue: 14
      }
    ]);
  });

  it('builds a chart option and series inspector rows', () => {
    const series = [
      {
        key: 'http_requests_total-0',
        name: 'http_requests_total',
        labels: { service_name: 'checkout' },
        points: [
          [1000, 12],
          [2000, 14]
        ],
        latestValue: 14
      }
    ];

    const option = buildMetricsChartOption(series as any);
    expect(Array.isArray(option.series)).toBe(true);
    expect((option.series as any[])[0].name).toBe('http_requests_total');
    expect(Array.isArray(option.dataZoom)).toBe(true);
    expect((option.dataZoom as any[])[0]).toMatchObject({
      type: 'slider',
      xAxisIndex: 0,
      filterMode: 'none',
      start: 0,
      end: 100
    });

    expect(buildMetricSeriesRows(series as any, t)).toEqual([
      {
        title: 'http_requests_total',
        copy: 'checkout',
        meta: '14',
        entityLabel: '-',
        entityMeta: t('otlp.metrics.series.entity-missing'),
        entityState: 'missing'
      }
    ]);
  });

  it('maps OTLP metric chart zoom into the shared absolute time context only when applied', () => {
    const first = new Date(2026, 4, 17, 15, 0, 0).getTime();
    const middle = new Date(2026, 4, 17, 16, 0, 0).getTime();
    const last = new Date(2026, 4, 17, 17, 0, 0).getTime();
    const series = [
      {
        key: 'http_requests_total-0',
        name: 'http_requests_total',
        labels: { service_name: 'checkout' },
        points: [
          [first, 12],
          [middle, 14],
          [last, 16]
        ],
        latestValue: 16
      }
    ];

    expect(buildMetricsDataZoomTimeContext(series as any, { start: 25, end: 75 }, 'last-1h')).toEqual({
      timeRange: 'last-1h',
      from: '2026-05-17 15:30:00',
      to: '2026-05-17 16:30:00'
    });

    expect(buildMetricsDataZoomTimeContext(series as any, { start: 0, end: 100 }, 'last-1h')).toBeNull();
  });

  it('builds metric series rows with normalized HertzBeat entity attribution visible in the table', () => {
    expect(
      buildMetricSeriesRows(
        [
          {
            key: 'hertzbeat_demo_checkout_latency_ms_milliseconds-0',
            name: 'hertzbeat_demo_checkout_latency_ms_milliseconds',
            labels: {
              service_name: 'checkout',
              service_namespace: 'hertzbeat-demo',
              deployment_environment_name: 'demo',
              hertzbeat_entity_id: '4200',
              hertzbeat_entity_name: 'Checkout API'
            },
            points: [[1777624642000, 128]],
            latestValue: 128
          }
        ],
        t
      )
    ).toEqual([
      {
        title: 'hertzbeat_demo_checkout_latency_ms_milliseconds',
        copy: 'checkout',
        meta: '128',
        entityLabel: 'Checkout API',
        entityMeta: 'entityId 4200',
        entityState: 'present'
      }
    ]);
  });

  it('builds trend bars from real metric series points instead of synthetic heights', () => {
    expect(
      buildMetricTrendBars(
        [
          {
            key: 'http_requests_total-0',
            name: 'http_requests_total',
            labels: { service_name: 'checkout' },
            points: [
              [1000, 12],
              [2000, 24],
              [3000, null],
              [4000, 18]
            ],
            latestValue: 18
          }
        ],
        value => `T${value}`,
        t
      )
    ).toEqual([
      {
        key: 'http_requests_total-0:1000:0',
        seriesName: 'http_requests_total',
        label: 'T1000',
        value: 12,
        valueLabel: '12',
        heightPct: 50
      },
      {
        key: 'http_requests_total-0:2000:1',
        seriesName: 'http_requests_total',
        label: 'T2000',
        value: 24,
        valueLabel: '24',
        heightPct: 100
      },
      {
        key: 'http_requests_total-0:4000:2',
        seriesName: 'http_requests_total',
        label: 'T4000',
        value: 18,
        valueLabel: '18',
        heightPct: 75
      }
    ]);
  });

  it('builds selected metric series attribution rows for the detail panel', () => {
    expect(
      buildMetricSeriesContextRows(
        {
          key: 'http_server_duration_milliseconds_count-1',
          name: 'http.server.duration',
          labels: {
            'service.name': 'inventory',
            'service.namespace': 'warehouse',
            'deployment.environment.name': 'prod-east',
            'hertzbeat.entity_id': '42',
            'hertzbeat.entity_name': 'Inventory API',
            'hertzbeat.collector': 'collector-b',
            'hertzbeat.template': 'fastapi'
          },
          points: [[2000, 18]],
          latestValue: 18
        },
        t
      )
    ).toEqual([
      { label: t('otlp.metrics.series.context.metric-name'), value: 'http.server.duration', meta: t('otlp.metrics.series.context.selected-series') },
      { label: t('otlp.metrics.series.context.entity'), value: 'Inventory API', meta: t('otlp.metrics.series.entity-id', { entityId: '42' }) },
      { label: t('otlp.metrics.series.context.service'), value: 'inventory', meta: 'warehouse' },
      { label: t('otlp.metrics.series.context.template'), value: 'fastapi', meta: t('otlp.metrics.series.context.collector', { collector: 'collector-b' }) },
      { label: t('otlp.metrics.series.context.environment'), value: 'prod-east', meta: t('otlp.metrics.series.context.deployment-environment') }
    ]);
  });

  it('builds selected metric evidence rows from real samples and trace context', () => {
    expect(
      buildMetricSeriesEvidenceRows(
        {
          key: 'checkout_latency_ms-0',
          name: 'checkout.latency',
          labels: {
            trace_id: 'trace-series-42',
            span_id: 'span-series-42'
          },
          points: [
            [1000, 12],
            [2000, null],
            [3000, 24],
            [4000, 18]
          ],
          latestValue: 18
        },
        value => `T${value}`,
        t
      )
    ).toEqual([
      { label: t('otlp.metrics.evidence.samples'), value: '3', meta: t('otlp.metrics.evidence.empty-skipped', { count: 1 }) },
      { label: t('otlp.metrics.evidence.latest-value'), value: '18', meta: 'T4000' },
      { label: t('otlp.metrics.evidence.value-range'), value: '12 - 24', meta: t('otlp.metrics.evidence.average', { average: 18 }) },
      { label: t('otlp.metrics.evidence.sample-window'), value: 'T1000 → T4000', meta: t('otlp.metrics.evidence.real-sample-time') },
      { label: t('otlp.metrics.evidence.linked-trace'), value: 'trace-series-42', meta: 'span-series-42' }
    ]);
  });

  it('builds operator-facing linked records for the selected metric series detail panel', () => {
    const series = {
      key: 'checkout_latency_ms-0',
      name: 'checkout.latency',
      labels: {
        'service.name': 'checkout',
        trace_id: 'trace-series-42',
        span_id: 'span-series-42',
        'hertzbeat.entity_id': '42'
      },
      points: [[1000, 12]],
      latestValue: 12
    };
    const handoffLinks = {
      logsHref: '/log/manage?view=list&traceId=trace-series-42&spanId=span-series-42',
      tracesHref: '/trace/manage?traceId=trace-series-42&spanId=span-series-42',
      alertHandlingHref: '/alert?status=firing&signal=metrics&search=checkout'
    };

    expect(buildMetricSeriesLinkedRecordRows(series, handoffLinks, t)).toEqual([
      {
        key: 'logs',
        label: t('otlp.metrics.handoff.logs'),
        value: t('otlp.metrics.handoff.logs-by-trace'),
        meta: t('otlp.metrics.handoff.logs-current-span'),
        href: handoffLinks.logsHref
      },
      {
        key: 'traces',
        label: t('otlp.metrics.handoff.traces'),
        value: t('otlp.metrics.handoff.trace-open'),
        meta: t('otlp.metrics.handoff.trace-full-current-span'),
        href: handoffLinks.tracesHref
      },
      {
        key: 'alerts',
        label: t('otlp.metrics.handoff.alerts'),
        value: t('otlp.metrics.handoff.alerts-by-entity'),
        meta: t('otlp.metrics.handoff.alerts-by-entity-meta'),
        href: handoffLinks.alertHandlingHref
      }
    ]);
  });

  it('builds HertzBeat attribution diagnostics for self-monitoring metric series without entity id', () => {
    expect(
      buildMetricSeriesAttributionDiagnostics(
        {
          key: 'jvm_memory_used-0',
          name: 'jvm.memory.used',
          labels: {
            'service.name': 'self-monitor',
            'service.namespace': 'hertzbeat',
            'hertzbeat.entity_name': 'HertzBeat Self Monitor',
            'hertzbeat.collector': 'collector-local',
            'hertzbeat.template': 'jvm'
          },
          points: [[1000, 20]],
          latestValue: 20
        },
        t
      )
    ).toEqual([
      {
        key: 'hertzbeat.entity_id',
        label: 'hertzbeat.entity_id',
        value: '-',
        state: 'missing',
        meta: t('otlp.metrics.attribution.entity-id.missing')
      },
      {
        key: 'hertzbeat.entity_name',
        label: 'hertzbeat.entity_name',
        value: 'HertzBeat Self Monitor',
        state: 'present',
        meta: t('otlp.metrics.attribution.entity-name')
      },
      {
        key: 'hertzbeat.workspace_id',
        label: 'hertzbeat.workspace_id',
        value: '-',
        state: 'missing',
        meta: t('otlp.metrics.attribution.workspace-id')
      },
      {
        key: 'hertzbeat.collector',
        label: 'hertzbeat.collector',
        value: 'collector-local',
        state: 'present',
        meta: t('otlp.metrics.attribution.collector')
      },
      {
        key: 'hertzbeat.template',
        label: 'hertzbeat.template',
        value: 'jvm',
        state: 'present',
        meta: t('otlp.metrics.attribution.template')
      }
    ]);
  });

  it('builds intake, logs, traces, and entity handoff links from metrics context', () => {
    const result = buildMetricsHandoffLinks(
      {
        context: {
          entityId: 7,
          entityName: 'Checkout API',
          serviceName: 'checkout',
          serviceNamespace: 'payments',
          environment: 'prod',
          start: 1000,
          end: 2000
        }
      } as any,
      {
        traceId: 'trace-1',
        spanId: 'span-1',
        returnTo: '/overview?returnLabel=Overview'
      },
      {
        timeRange: 'last-1h',
        refresh: '30',
        live: 'false',
        tz: 'Asia/Shanghai',
        source: 'otlp',
        collector: 'collector-a',
        template: 'spring-boot',
        monitorId: '42',
        monitorName: 'HTTPS Probe',
        monitorApp: 'website',
        monitorInstance: 'example.com:443'
      }
    );

    const intakeParams = new URL(result.intakeHref, 'https://example.com').searchParams;
    expect(intakeParams.get('start')).toBe('1000');
    expect(intakeParams.get('end')).toBe('2000');
    expect(intakeParams.get('entityId')).toBe('7');
    expect(intakeParams.get('entityName')).toBe('Checkout API');
    expect(intakeParams.get('returnTo')).toBe('/ingestion/otlp/metrics');
    expect(intakeParams.get('returnLabel')).toBeNull();
    expect(intakeParams.get('serviceName')).toBe('checkout');
    expect(intakeParams.get('serviceNamespace')).toBe('payments');
    expect(intakeParams.get('environment')).toBe('prod');
    expect(intakeParams.get('timeRange')).toBe('last-1h');
    expect(intakeParams.get('refresh')).toBe('30');
    expect(intakeParams.get('live')).toBe('false');
    expect(intakeParams.get('tz')).toBe('Asia/Shanghai');
    expect(intakeParams.get('source')).toBe('otlp');
    expect(intakeParams.get('collector')).toBe('collector-a');
    expect(intakeParams.get('template')).toBe('spring-boot');
    expect(intakeParams.get('monitorId')).toBe('42');
    expect(intakeParams.get('monitorName')).toBe('HTTPS Probe');
    expect(intakeParams.get('monitorApp')).toBe('website');
    expect(intakeParams.get('monitorInstance')).toBe('example.com:443');
    expect(intakeParams.get('signal')).toBe('metrics');
    const logParams = new URL(result.logsHref, 'https://example.com').searchParams;
    expect(logParams.get('traceId')).toBe('trace-1');
    expect(logParams.get('spanId')).toBe('span-1');
    expect(logParams.get('entityId')).toBe('7');
    expect(logParams.get('returnLabel')).toBeNull();
    expect(logParams.get('returnTo')).toBe('/overview');
    expect(logParams.get('serviceName')).toBe('checkout');
    expect(logParams.get('timeRange')).toBe('last-1h');
    expect(logParams.get('refresh')).toBe('30');
    expect(logParams.get('live')).toBe('false');
    expect(logParams.get('tz')).toBe('Asia/Shanghai');
    expect(logParams.get('source')).toBe('otlp');
    expect(logParams.get('monitorId')).toBe('42');
    expect(logParams.get('monitorName')).toBe('HTTPS Probe');
    expect(logParams.get('monitorApp')).toBe('website');
    expect(logParams.get('monitorInstance')).toBe('example.com:443');

    const traceParams = new URL(result.tracesHref, 'https://example.com').searchParams;
    expect(traceParams.get('traceId')).toBe('trace-1');
    expect(traceParams.get('spanId')).toBe('span-1');
    expect(traceParams.get('entityId')).toBe('7');
    expect(traceParams.get('returnLabel')).toBeNull();
    expect(traceParams.get('returnTo')).toBe('/overview');
    expect(traceParams.get('serviceName')).toBe('checkout');
    expect(traceParams.get('timeRange')).toBe('last-1h');
    expect(traceParams.get('refresh')).toBe('30');
    expect(traceParams.get('live')).toBe('false');
    expect(traceParams.get('tz')).toBe('Asia/Shanghai');
    expect(traceParams.get('source')).toBe('otlp');
    expect(traceParams.get('monitorId')).toBe('42');
    expect(traceParams.get('monitorName')).toBe('HTTPS Probe');
    expect(traceParams.get('monitorApp')).toBe('website');
    expect(traceParams.get('monitorInstance')).toBe('example.com:443');
    expect(result.entitiesHref).toBe('/entities?search=checkout');

    const entityHref = new URL(result.entityHref, 'https://example.com');
    expect(entityHref.pathname).toBe('/entities/7');
    expect(entityHref.searchParams.get('entityId')).toBe('7');
    expect(entityHref.searchParams.get('entityName')).toBe('Checkout API');
    expect(entityHref.searchParams.get('serviceName')).toBe('checkout');
    expect(entityHref.searchParams.get('environment')).toBe('prod');
    expect(entityHref.searchParams.get('timeRange')).toBe('last-1h');
    expect(entityHref.searchParams.get('traceId')).toBe('trace-1');
    expect(entityHref.searchParams.get('spanId')).toBe('span-1');
    expect(entityHref.searchParams.get('source')).toBe('otlp');

    const alertParams = new URL(result.alertRulesHref, 'https://example.com').searchParams;
    expect(alertParams.get('signal')).toBe('metrics');
    expect(alertParams.get('entityId')).toBe('7');
    expect(alertParams.get('serviceName')).toBe('checkout');
    expect(alertParams.get('environment')).toBe('prod');
    expect(alertParams.get('timeRange')).toBe('last-1h');
    expect(alertParams.get('source')).toBe('otlp');

    const handlingUrl = new URL(result.alertHandlingHref, 'https://example.com');
    expect(handlingUrl.pathname).toBe('/alert');
    expect(handlingUrl.searchParams.get('status')).toBe('firing');
    expect(handlingUrl.searchParams.get('signal')).toBe('metrics');
    expect(handlingUrl.searchParams.get('search')).toBe('checkout');
    expect(handlingUrl.searchParams.get('entityId')).toBe('7');
    expect(handlingUrl.searchParams.get('serviceName')).toBe('checkout');
    expect(handlingUrl.searchParams.get('environment')).toBe('prod');
    expect(handlingUrl.searchParams.get('timeRange')).toBe('last-1h');
    expect(handlingUrl.searchParams.get('source')).toBe('otlp');
  });

  it('lets a selected metric series drive service, entity, logs, traces, and alert handoffs', () => {
    const result = buildMetricsHandoffLinks(
      {
        context: {
          entityId: 7,
          entityName: 'Checkout API',
          serviceName: 'checkout',
          serviceNamespace: 'payments',
          environment: 'prod',
          start: 1000,
          end: 2000
        }
      } as any,
      {
        query: 'http_server_duration_milliseconds_count',
        serviceName: 'checkout',
        serviceNamespace: 'payments',
        environment: 'prod'
      },
      {
        source: 'otlp',
        collector: 'collector-a',
        template: 'spring-boot'
      },
      {
        key: 'http_server_duration_milliseconds_count-1',
        name: 'http.server.duration',
        labels: {
          __name__: 'http.server.duration',
          'service.name': 'inventory',
          'service.namespace': 'warehouse',
          'deployment.environment.name': 'prod-east',
          trace_id: 'trace-series-42',
          span_id: 'span-series-42',
          'hertzbeat.entity_id': '42',
          'hertzbeat.entity_name': 'Inventory API',
          'hertzbeat.collector': 'collector-b',
          'hertzbeat.template': 'fastapi'
        },
        points: [[2000, 18]],
        latestValue: 18
      }
    );

    const logParams = new URL(result.logsHref, 'https://example.com').searchParams;
    expect(logParams.get('view')).toBe('list');
    expect(logParams.get('search')).toBeNull();
    expect(logParams.get('entityId')).toBe('42');
    expect(logParams.get('entityName')).toBe('Inventory API');
    expect(logParams.get('serviceName')).toBe('inventory');
    expect(logParams.get('serviceNamespace')).toBe('warehouse');
    expect(logParams.get('environment')).toBe('prod-east');
    expect(logParams.get('traceId')).toBe('trace-series-42');
    expect(logParams.get('spanId')).toBe('span-series-42');
    expect(logParams.get('collector')).toBe('collector-b');
    expect(logParams.get('template')).toBe('fastapi');

    const traceParams = new URL(result.tracesHref, 'https://example.com').searchParams;
    expect(traceParams.get('serviceName')).toBe('inventory');
    expect(traceParams.get('serviceNamespace')).toBe('warehouse');
    expect(traceParams.get('environment')).toBe('prod-east');
    expect(traceParams.get('traceId')).toBe('trace-series-42');
    expect(traceParams.get('spanId')).toBe('span-series-42');
    expect(traceParams.get('entityId')).toBe('42');

    const entityHref = new URL(result.entityHref, 'https://example.com');
    expect(entityHref.pathname).toBe('/entities/42');
    expect(entityHref.searchParams.get('entityName')).toBe('Inventory API');
    expect(entityHref.searchParams.get('serviceName')).toBe('inventory');

    const alertHandlingHref = new URL(result.alertHandlingHref, 'https://example.com');
    expect(alertHandlingHref.searchParams.get('search')).toBe('inventory');
    expect(alertHandlingHref.searchParams.get('entityId')).toBe('42');
    expect(alertHandlingHref.searchParams.get('serviceName')).toBe('inventory');
  });

  it('opens trace-linked metric logs as history records without an extra text search filter', () => {
    const result = buildMetricsHandoffLinks(
      {
        context: {
          serviceName: 'checkout',
          serviceNamespace: 'hertzbeat-demo',
          environment: 'demo',
          start: 1777624642000,
          end: 1777624942000
        }
      } as any,
      {
        query: 'hertzbeat_demo_checkout_latency_ms_milliseconds'
      },
      {
        source: 'otlp'
      },
      {
        key: 'hertzbeat_demo_checkout_latency_ms_milliseconds-0',
        name: 'hertzbeat_demo_checkout_latency_ms_milliseconds',
        labels: {
          'service.name': 'checkout',
          'service.namespace': 'hertzbeat-demo',
          'deployment.environment.name': 'demo',
          trace_id: 'trace-linked-demo',
          span_id: '1111222233334444',
          'hertzbeat.entity_id': '4200',
          'hertzbeat.entity_name': 'Checkout API',
          'hertzbeat.collector': 'collector-demo-a',
          'hertzbeat.template': 'spring-boot'
        },
        points: [[1777624642000, 103]],
        latestValue: 103
      }
    );

    const logUrl = new URL(result.logsHref, 'https://example.com');
    expect(logUrl.pathname).toBe('/log/manage');
    expect(logUrl.searchParams.get('view')).toBe('list');
    expect(logUrl.searchParams.get('traceId')).toBe('trace-linked-demo');
    expect(logUrl.searchParams.get('spanId')).toBe('1111222233334444');
    expect(logUrl.searchParams.get('serviceName')).toBe('checkout');
    expect(logUrl.searchParams.get('collector')).toBe('collector-demo-a');
    expect(logUrl.searchParams.get('template')).toBe('spring-boot');
    expect(logUrl.searchParams.get('search')).toBeNull();
  });
});
