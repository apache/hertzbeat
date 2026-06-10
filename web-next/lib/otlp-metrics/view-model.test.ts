import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import {
  buildConsoleFacts,
  buildConsoleMetrics,
  buildConsoleRows,
  buildContextRows,
  buildMetricsExplorerState,
  buildMetricsHandoffLinks,
  buildMetricInventorySourceRows,
  buildMetricInventoryRows,
  buildMetricSeriesRows,
  buildMetricSeriesSampleRows,
  buildMetricSeriesAttributeRows,
  buildMetricExpectedRangeConfig,
  buildMetricThresholdConfig,
  buildMetricSeriesAttributionDiagnostics,
  buildMetricSeriesContextRows,
  buildMetricSeriesEvidenceRows,
  buildMetricSeriesLinkedRecordRows,
  buildMetricSeriesViews,
  buildMetricTrendBars,
  applyMetricsFormula,
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
                  labels: {
                    __name__: 'http_requests_total',
                    service_name: 'checkout',
                    unit: 'requests'
                  },
                  meta: {
                    description: 'Total HTTP requests',
                    metricType: 'counter'
                  }
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
        labels: { __name__: 'http_requests_total', service_name: 'checkout', unit: 'requests' },
        description: 'Total HTTP requests',
        metricType: 'counter',
        unit: 'requests',
        points: [
          [1000, 12],
          [2000, 14]
        ],
        latestValue: 14
      }
    ]);
  });

  it('applies safe single-query metric formulas to series points', () => {
    const series = [
      {
        key: 'latency-0',
        name: 'latency',
        labels: {},
        description: '',
        metricType: 'gauge',
        unit: 'ms',
        points: [
          [1000, 1.5],
          [2000, null],
          [3000, 2]
        ],
        latestValue: 2
      }
    ];

    expect(applyMetricsFormula(series as any, 'A * 1000')[0]?.points).toEqual([
      [1000, 1500],
      [2000, null],
      [3000, 2000]
    ]);
    expect(applyMetricsFormula(series as any, 'value / 0')).toBe(series);
    expect(applyMetricsFormula(series as any, 'B / A')).toBe(series);
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
        description: '-',
        metricType: '-',
        unit: '-',
        sampleCount: 2,
        pointCount: 2,
        timeSeriesCount: 1,
        entityLabel: '-',
        entityMeta: t('otlp.metrics.series.entity-missing'),
        entityState: 'missing'
      }
    ]);
  });

  it('formats metrics chart legends from series labels', () => {
    const series = [
      {
        key: 'http_requests_total-0',
        name: 'http_requests_total',
        labels: { 'service.name': 'checkout', service_name: 'checkout_underscore' },
        points: [
          [1000, 12],
          [2000, 14]
        ],
        latestValue: 14
      }
    ];

    const option = buildMetricsChartOption(series as any, undefined, undefined, '{{service.name}} - p95');
    expect((option.series as any[])[0].name).toBe('checkout - p95');
  });

  it('builds static threshold lines for metrics chart display without changing series data', () => {
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

    const thresholds = buildMetricThresholdConfig('75.5', '90', t);
    expect(thresholds).toEqual({
      warning: 75.5,
      critical: 90,
      warningLabel: t('otlp.metrics.threshold.warning'),
      criticalLabel: t('otlp.metrics.threshold.critical')
    });

    const option = buildMetricsChartOption(series as any, thresholds);
    const chartSeries = option.series as any[];
    expect(chartSeries[0].data).toEqual([
      [1000, 12],
      [2000, 14]
    ]);
    expect(chartSeries[0].markLine).toMatchObject({
      silent: true,
      symbol: 'none',
      data: [
        { yAxis: 75.5, name: t('otlp.metrics.threshold.warning') },
        { yAxis: 90, name: t('otlp.metrics.threshold.critical') }
      ]
    });
  });

  it('ignores invalid static metric threshold values', () => {
    expect(buildMetricThresholdConfig('abc', 'Infinity', t)).toBeNull();
    expect(buildMetricThresholdConfig('', undefined, t)).toBeNull();
  });

  it('builds an expected range band from real metric points without changing the raw chart series', () => {
    const series = [
      {
        key: 'http_requests_total-0',
        name: 'http_requests_total',
        labels: { service_name: 'checkout' },
        points: [
          [1000, 10],
          [2000, 12],
          [3000, 20]
        ],
        latestValue: 20
      }
    ];

    const expectedRange = buildMetricExpectedRangeConfig(series[0] as any, t);
    expect(expectedRange).toMatchObject({
      label: t('otlp.metrics.expected-range.label'),
      lowerLabel: t('otlp.metrics.expected-range.lower'),
      upperLabel: t('otlp.metrics.expected-range.upper'),
      sampleCount: 3
    });
    expect(expectedRange?.lowerData[0]).toEqual([1000, 9]);
    expect(expectedRange?.upperGapData[0]).toEqual([1000, 2]);
    expect(expectedRange?.lowerData[2][1]).toBeCloseTo(5.36, 2);
    expect(expectedRange?.upperGapData[2][1]).toBeCloseTo(17.28, 2);

    const option = buildMetricsChartOption(series as any, null, expectedRange);
    const chartSeries = option.series as any[];
    expect(chartSeries[0]).toMatchObject({
      name: t('otlp.metrics.expected-range.lower'),
      type: 'line',
      stack: 'otlp-metrics-expected-range',
      silent: true
    });
    expect(chartSeries[1]).toMatchObject({
      name: t('otlp.metrics.expected-range.label'),
      type: 'line',
      stack: 'otlp-metrics-expected-range',
      areaStyle: { color: 'rgba(96, 165, 250, 0.14)' }
    });
    expect(chartSeries[2].data).toEqual([
      [1000, 10],
      [2000, 12],
      [3000, 20]
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
        description: '-',
        metricType: '-',
        unit: '-',
        sampleCount: 1,
        pointCount: 1,
        timeSeriesCount: 1,
        entityLabel: 'Checkout API',
        entityMeta: 'entityId 4200',
        entityState: 'present'
      }
    ]);
  });

  it('filters and sorts metric inventory rows by metric, service, labels, latest value, and samples', () => {
    const rows = buildMetricSeriesRows(
      [
        {
          key: 'db_latency-0',
          name: 'db_latency',
          labels: {
            service_name: 'inventory',
            region: 'west',
            hertzbeat_entity_name: 'Inventory DB'
          },
          points: [[1000, 42]],
          latestValue: 42
        },
        {
          key: 'http_requests_total-1',
          name: 'http_requests_total',
          labels: {
            service_name: 'checkout',
            route: '/cart',
            hertzbeat_entity_name: 'Checkout API'
          },
          points: [[1000, 12], [2000, 18], [3000, 24]],
          latestValue: 24
        },
        {
          key: 'cache_hits-2',
          name: 'cache_hits',
          labels: {
            service_name: 'checkout',
            region: 'east'
          },
          points: [[1000, 100], [2000, 101]],
          latestValue: 101
        }
      ],
      t
    ).map((row, index) => ({
      ...row,
      rowKey: String(index),
      pointCount: [1, 3, 2][index],
      timeSeriesCount: [5, 9, 2][index],
      series: [
        {
          key: 'db_latency-0',
          name: 'db_latency',
          labels: {
            service_name: 'inventory',
            region: 'west',
            hertzbeat_entity_name: 'Inventory DB'
          },
          points: [[1000, 42]],
          latestValue: 42
        },
        {
          key: 'http_requests_total-1',
          name: 'http_requests_total',
          labels: {
            service_name: 'checkout',
            route: '/cart',
            hertzbeat_entity_name: 'Checkout API'
          },
          points: [[1000, 12], [2000, 18], [3000, 24]],
          latestValue: 24
        },
        {
          key: 'cache_hits-2',
          name: 'cache_hits',
          labels: {
            service_name: 'checkout',
            region: 'east'
          },
          points: [[1000, 100], [2000, 101]],
          latestValue: 101
        }
      ][index]
    }));

    expect(buildMetricInventoryRows(rows, 'checkout', 'name').map(row => row.title)).toEqual([
      'cache_hits',
      'http_requests_total'
    ]);
    expect(buildMetricInventoryRows(rows, 'region', 'latest').map(row => row.title)).toEqual([
      'cache_hits',
      'db_latency'
    ]);
    expect(buildMetricInventoryRows(rows, '', 'samples').map(row => row.title)).toEqual([
      'http_requests_total',
      'cache_hits',
      'db_latency'
    ]);
    expect(buildMetricInventoryRows(rows, '', 'time-series').map(row => row.title)).toEqual([
      'http_requests_total',
      'db_latency',
      'cache_hits'
    ]);
  });

  it('builds source-backed metric inventory rows from the backend inventory contract', () => {
    const rows = buildMetricInventorySourceRows(
      {
        source: 'promql-inventory',
        context: {
          entityId: 7,
          entityType: 'service',
          entityName: 'Checkout API',
          serviceName: 'checkout',
          serviceNamespace: 'commerce',
          environment: 'prod',
          start: 1000,
          end: 2000
        },
        total: 1,
        items: [
          {
            metricName: 'http_server_duration',
            family: 'latency',
            timeSeriesCount: 3,
            latestObservedAt: 2000,
            labels: {
              service_name: 'checkout',
              http_route: '/checkout'
            }
          }
        ]
      },
      t
    );

    expect(rows).toEqual([
      expect.objectContaining({
        title: 'http_server_duration',
        copy: 'checkout',
        metricType: 'latency',
        timeSeriesCount: 3,
        latestObservedAt: 2000,
        entityLabel: 'Checkout API',
        entityMeta: t('otlp.metrics.series.entity-id', { entityId: '7' }),
        inventorySource: 'promql-inventory',
        inventoryLabels: {
          service_name: 'checkout',
          http_route: '/checkout'
        },
        series: null
      })
    ]);
    expect(buildMetricInventoryRows(rows, 'checkout', 'latest').map(row => row.title)).toEqual([
      'http_server_duration'
    ]);
  });

  it('builds SigNoz-style metric inventory metadata from real frame schema fields', () => {
    const rows = buildMetricSeriesRows(
      buildMetricSeriesViews(
        {
          results: {
            frames: [
              {
                schema: {
                  labels: {
                    __name__: 'http.server.duration',
                    service_name: 'checkout',
                    unit: 'ms'
                  },
                  meta: {
                    description: 'Server duration histogram',
                    type: 'histogram'
                  }
                },
                data: [
                  [1000, 12],
                  [2000, 18],
                  [3000, 21]
                ]
              }
            ]
          }
        } as any,
        t
      ),
      t
    );

    expect(rows[0]).toMatchObject({
      title: 'http.server.duration',
      description: 'Server duration histogram',
      metricType: 'histogram',
      unit: 'ms',
      sampleCount: 3,
      pointCount: 3,
      timeSeriesCount: 1
    });
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

  it('builds selected metric table inspector rows from raw series samples', () => {
    expect(
      buildMetricSeriesSampleRows(
        {
          key: 'checkout_latency_ms-0',
          name: 'checkout.latency',
          labels: { 'service.name': 'checkout' },
          points: [
            [1000, 12],
            [2000, null],
            [3000, 24]
          ],
          latestValue: 24
        },
        value => `T${value}`,
        t
      )
    ).toEqual([
      {
        key: 'checkout_latency_ms-0:1000:0',
        index: '1',
        timestamp: 'T1000',
        rawTimestamp: '1000',
        value: '12',
        state: t('otlp.metrics.inspector.sample-state.present')
      },
      {
        key: 'checkout_latency_ms-0:2000:1',
        index: '2',
        timestamp: 'T2000',
        rawTimestamp: '2000',
        value: '-',
        state: t('otlp.metrics.inspector.sample-state.empty')
      },
      {
        key: 'checkout_latency_ms-0:3000:2',
        index: '3',
        timestamp: 'T3000',
        rawTimestamp: '3000',
        value: '24',
        state: t('otlp.metrics.inspector.sample-state.present')
      }
    ]);
  });

  it('builds searchable selected metric attribute rows from real series labels', () => {
    const series = {
      key: 'checkout_latency_ms-0',
      name: 'checkout.latency',
      labels: {
        'service.name': 'checkout',
        'deployment.environment.name': 'prod',
        route: '/checkout',
        empty: ''
      },
      points: [[1000, 12]],
      latestValue: 12
    };

    expect(buildMetricSeriesAttributeRows(series, '')).toEqual([
      {
        key: 'deployment.environment.name',
        name: 'deployment.environment.name',
        value: 'prod'
      },
      {
        key: 'route',
        name: 'route',
        value: '/checkout'
      },
      {
        key: 'service.name',
        name: 'service.name',
        value: 'checkout'
      }
    ]);

    expect(buildMetricSeriesAttributeRows(series, 'prod')).toEqual([
      {
        key: 'deployment.environment.name',
        name: 'deployment.environment.name',
        value: 'prod'
      }
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
        operationName: 'POST /checkout',
        query: 'http.server.duration',
        filter: 'service.name="checkout"',
        formula: 'rate(http.server.duration[5m])',
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
    expect(alertParams.get('intent')).toBe('create');
    expect(alertParams.get('entityId')).toBe('7');
    expect(alertParams.get('serviceName')).toBe('checkout');
    expect(alertParams.get('operationName')).toBe('POST /checkout');
    expect(alertParams.get('environment')).toBe('prod');
    expect(alertParams.get('timeRange')).toBe('last-1h');
    expect(alertParams.get('source')).toBe('otlp');
    expect(alertParams.get('alertName')).toBe('http.server.duration metric alert');
    expect(alertParams.get('alertQueryType')).toBe('metrics');
    expect(alertParams.get('alertExpression')).toBe('rate(http.server.duration[5m])');
    expect(alertParams.get('alertDatasource')).toBe('promql');
    expect(alertParams.get('alertQuery')).toContain('query=http.server.duration');
    expect(alertParams.get('alertQuery')).toContain('filter=service.name="checkout"');
    expect(alertParams.get('alertQuery')).toContain('entityId=7');
    expect(alertParams.get('alertQuery')).toContain('entityName=Checkout API');
    expect(alertParams.get('alertQuery')).toContain('serviceNamespace=payments');
    expect(alertParams.get('alertQuery')).toContain('operationName=POST /checkout');
    expect(alertParams.get('alertQuery')).toContain('traceId=trace-1');
    expect(alertParams.get('alertQuery')).toContain('spanId=span-1');

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

    const dashboardHref = new URL(result.dashboardHref, 'https://example.com');
    expect(dashboardHref.pathname).toBe('/dashboard');
    expect(dashboardHref.searchParams.get('intent')).toBe('add-panel');
    expect(dashboardHref.searchParams.get('signal')).toBe('metrics');
    expect(dashboardHref.searchParams.get('panelTitle')).toBe('checkout');
    expect(dashboardHref.searchParams.get('entityId')).toBe('7');
    expect(dashboardHref.searchParams.get('serviceName')).toBe('checkout');
    expect(dashboardHref.searchParams.get('environment')).toBe('prod');
    expect(dashboardHref.searchParams.get('timeRange')).toBe('last-1h');
    expect(dashboardHref.searchParams.get('source')).toBe('otlp');
    expect(dashboardHref.searchParams.get('panelQueryType')).toBe('metrics');
    expect(dashboardHref.searchParams.get('panelExpression')).toBe('rate(http.server.duration[5m])');
    expect(dashboardHref.searchParams.get('panelDatasource')).toBe('promql');
    expect(dashboardHref.searchParams.get('panelQuery')).toContain('query=http.server.duration');
    expect(dashboardHref.searchParams.get('panelQuery')).toContain('filter=service.name="checkout"');
    expect(dashboardHref.searchParams.get('panelQuery')).toContain('operationName=POST /checkout');
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
          http_route: '/inventory/{id}',
          'hertzbeat.entity_id': '42',
          'hertzbeat.entity_type': 'service',
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
    expect(logParams.get('entityType')).toBe('service');
    expect(logParams.get('entityName')).toBe('Inventory API');
    expect(logParams.get('serviceName')).toBe('inventory');
    expect(logParams.get('serviceNamespace')).toBe('warehouse');
    expect(logParams.get('environment')).toBe('prod-east');
    expect(logParams.get('traceId')).toBe('trace-series-42');
    expect(logParams.get('spanId')).toBe('span-series-42');
    expect(logParams.get('operationName')).toBe('/inventory/{id}');
    expect(logParams.get('attributeFilter')).toBeNull();
    expect(logParams.get('collector')).toBe('collector-b');
    expect(logParams.get('template')).toBe('fastapi');

    const traceParams = new URL(result.tracesHref, 'https://example.com').searchParams;
    expect(traceParams.get('serviceName')).toBe('inventory');
    expect(traceParams.get('serviceNamespace')).toBe('warehouse');
    expect(traceParams.get('environment')).toBe('prod-east');
    expect(traceParams.get('traceId')).toBe('trace-series-42');
    expect(traceParams.get('spanId')).toBe('span-series-42');
    expect(traceParams.get('operationName')).toBe('/inventory/{id}');
    expect(traceParams.get('attributeFilter')).toBeNull();
    expect(traceParams.get('entityId')).toBe('42');
    expect(traceParams.get('entityType')).toBe('service');

    const entityHref = new URL(result.entityHref, 'https://example.com');
    expect(entityHref.pathname).toBe('/entities/42');
    expect(entityHref.searchParams.get('entityName')).toBe('Inventory API');
    expect(entityHref.searchParams.get('serviceName')).toBe('inventory');

    const alertHandlingHref = new URL(result.alertHandlingHref, 'https://example.com');
    expect(alertHandlingHref.searchParams.get('search')).toBe('inventory');
    expect(alertHandlingHref.searchParams.get('entityId')).toBe('42');
    expect(alertHandlingHref.searchParams.get('entityType')).toBe('service');
    expect(alertHandlingHref.searchParams.get('serviceName')).toBe('inventory');
    expect(alertHandlingHref.searchParams.get('operationName')).toBe('/inventory/{id}');

    const alertRulesHref = new URL(result.alertRulesHref, 'https://example.com');
    expect(alertRulesHref.searchParams.get('entityType')).toBe('service');
    expect(alertRulesHref.searchParams.get('operationName')).toBe('/inventory/{id}');
    expect(alertRulesHref.searchParams.get('alertQuery')).toContain('entityType=service');
    expect(alertRulesHref.searchParams.get('alertQuery')).toContain('operationName=/inventory/{id}');
  });

  it('preserves backend-resolved metrics operation context in shared handoffs', () => {
    const result = buildMetricsHandoffLinks(
      {
        context: {
          entityId: 7,
          entityType: 'service',
          entityName: 'Checkout API',
          serviceName: 'checkout',
          serviceNamespace: 'payments',
          environment: 'prod',
          operationName: 'POST /checkout',
          start: 1000,
          end: 2000
        }
      } as any,
      {
        query: 'http.server.duration',
        filter: 'service.name="checkout"'
      },
      {
        source: 'otlp'
      }
    );

    const logParams = new URL(result.logsHref, 'https://example.com').searchParams;
    expect(logParams.get('operationName')).toBe('POST /checkout');
    expect(logParams.get('attributeFilter')).toBe('span.name="POST /checkout"');

    const traceParams = new URL(result.tracesHref, 'https://example.com').searchParams;
    expect(traceParams.get('operationName')).toBe('POST /checkout');
    expect(traceParams.get('serviceName')).toBe('checkout');
    expect(traceParams.get('entityType')).toBe('service');

    const alertRulesHref = new URL(result.alertRulesHref, 'https://example.com');
    expect(alertRulesHref.searchParams.get('operationName')).toBe('POST /checkout');
    expect(alertRulesHref.searchParams.get('alertQuery')).toContain('operationName=POST /checkout');

    const dashboardHref = new URL(result.dashboardHref, 'https://example.com');
    expect(dashboardHref.searchParams.get('panelQuery')).toContain('operationName=POST /checkout');
  });

  it('adds an executable log attribute filter for operation-level metric handoffs', () => {
    const result = buildMetricsHandoffLinks(
      {
        context: {
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
      { source: 'otlp' },
      {
        key: 'http-server-duration-checkout',
        name: 'http.server.duration',
        labels: {
          __name__: 'http.server.duration',
          'service.name': 'checkout',
          'service.namespace': 'payments',
          'deployment.environment.name': 'prod',
          http_route: '/checkout/:id'
        },
        points: [[2000, 18]],
        latestValue: 18
      }
    );

    const logParams = new URL(result.logsHref, 'https://example.com').searchParams;
    expect(logParams.get('traceId')).toBeNull();
    expect(logParams.get('spanId')).toBeNull();
    expect(logParams.get('serviceName')).toBe('checkout');
    expect(logParams.get('serviceNamespace')).toBe('payments');
    expect(logParams.get('operationName')).toBe('/checkout/:id');
    expect(logParams.get('attributeFilter')).toBe('http.route="/checkout/:id"');

    const traceParams = new URL(result.tracesHref, 'https://example.com').searchParams;
    expect(traceParams.get('traceId')).toBeNull();
    expect(traceParams.get('spanId')).toBeNull();
    expect(traceParams.get('serviceName')).toBe('checkout');
    expect(traceParams.get('serviceNamespace')).toBe('payments');
    expect(traceParams.get('operationName')).toBe('/checkout/:id');
    expect(traceParams.get('attributeFilter')).toBe('http.route="/checkout/:id"');
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
