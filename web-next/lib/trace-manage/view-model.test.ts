import { describe, expect, it, vi } from 'vitest';
import {
  buildQueryStats,
  buildSelectedSpanEventRows,
  buildSelectedSpanFacts,
  buildSelectedSpanLinkRows,
  buildTraceCodeNavigationUrl,
  buildTraceAttributionDiagnostics,
  buildTraceExplorerRows,
  buildTraceExplorerState,
  buildTraceHandoffLinks,
  buildTraceWaterfallRows
} from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('trace view model', () => {
  it('builds HertzBeat trace explorer rows from trace list items', () => {
    expect(
      buildTraceExplorerRows(
        [
          {
            traceId: 'trace-1',
            rootSpanId: 'root-1',
            rootSpanName: 'POST /checkout',
            serviceName: 'checkout',
            serviceNamespace: 'payments',
            durationNanos: 420_000_000,
            status: 'ERROR',
            startTime: 1713200000000
          }
        ],
        (nanos?: number | null) => `${(nanos ?? 0) / 1_000_000}ms`,
        () => '2026-04-16 22:00:00'
      )
    ).toEqual([
      {
        key: 'trace-1',
        traceId: 'trace-1',
        rootSpanId: 'root-1',
        name: 'POST /checkout',
        service: 'checkout',
        namespace: 'payments',
        duration: '420ms',
        status: 'ERROR',
        statusTone: 'danger',
        startTime: '2026-04-16 22:00:00'
      }
    ]);
  });

  it('builds traces explorer summary copy without depending on old workspace facts', () => {
    expect(
      buildTraceExplorerState(
        {
          totalTraceCount: 10,
          errorTraceCount: 4,
          latestObservedAt: 1713200000000,
          hasActiveTrace: true
        },
        3,
        () => '2026-04-16 22:00:00'
      )
    ).toEqual({
      traceCountLabel: '10 traces',
      errorCountLabel: '4 errors',
      listCountLabel: '3 rows',
      latestObservedLabel: '2026-04-16 22:00:00',
      hasResults: true
    });
  });

  it('builds query stats from overview and result count', () => {
    expect(
      buildQueryStats(
        {
          totalTraceCount: 10,
          errorTraceCount: 4,
          hasActiveTrace: true
        },
        3,
        t
      )
    ).toEqual([
      [t('trace.manage.stat.error-ratio'), '40%'],
      [t('trace.manage.stat.activity'), t('common.active')],
      [t('trace.manage.stat.list-count'), '3']
    ]);
  });

  it('projects span events onto the trace-wide waterfall timeline', () => {
    const rows = buildTraceWaterfallRows(
      {
        traceId: 'trace-1',
        serviceName: 'checkout',
        startTime: 1713200000000,
        durationNanos: 100_000_000,
        spans: [
          {
            traceId: 'trace-1',
            spanId: 'root',
            spanName: 'POST /checkout',
            serviceName: 'checkout',
            status: 'OK',
            durationNanos: 100_000_000,
            startTime: 1713200000000,
            events: [{ name: 'request received', timeUnixNano: 1713200000030000000, attributes: { queue: 'default' } }]
          },
          {
            traceId: 'trace-1',
            spanId: 'db',
            parentSpanId: 'root',
            spanName: 'db.query',
            serviceName: 'postgres',
            status: 'ERROR',
            durationNanos: 20_000_000,
            startTime: 1713200000060,
            events: [{ name: 'exception', timeUnixNano: 1713200000075000000, attributes: { error: 'timeout' } }]
          }
        ]
      },
      'db',
      (nanos?: number | null) => `${(nanos ?? 0) / 1_000_000}ms`,
      t
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].events?.[0]).toEqual(
      expect.objectContaining({
        key: 'root:event:0',
        label: 'request received',
        tone: 'default'
      })
    );
    expect(rows[0].events?.[0].leftPct).toBeCloseTo(30, 1);
    expect(rows[1]).toEqual(
      expect.objectContaining({
        key: 'db',
        depth: 1,
        selected: true,
        tone: 'danger'
      })
    );
    expect(rows[1].events?.[0]).toEqual(
      expect.objectContaining({
        key: 'db:event:0',
        label: 'exception',
        tone: 'danger'
      })
    );
    expect(rows[1].events?.[0].leftPct).toBeCloseTo(75, 1);
  });

  it('keeps span events visible on the waterfall when the backend omits event timestamps', () => {
    const rows = buildTraceWaterfallRows(
      {
        traceId: 'trace-1',
        serviceName: 'checkout',
        startTime: 1713200000000,
        durationNanos: 100_000_000,
        spans: [
          {
            traceId: 'trace-1',
            spanId: 'root',
            spanName: 'POST /checkout',
            serviceName: 'checkout',
            status: 'OK',
            durationNanos: 100_000_000,
            startTime: 1713200000000,
            events: [
              { name: 'cart.validated', timeUnixNano: null, attributes: { cart: 'ok' } },
              { name: 'payment.authorized', attributes: { payment: 'ok' } }
            ]
          }
        ]
      },
      'root',
      (nanos?: number | null) => `${(nanos ?? 0) / 1_000_000}ms`,
      t
    );

    expect(rows[0].events).toHaveLength(2);
    expect(rows[0].events?.[0]).toEqual(
      expect.objectContaining({
        key: 'root:event:0',
        label: 'cart.validated',
        tone: 'default'
      })
    );
    expect(rows[0].events?.[0].leftPct).toBeGreaterThan(0);
    expect(rows[0].events?.[0].leftPct).toBeLessThan(rows[0].events?.[1].leftPct ?? 0);
    expect(rows[0].events?.[1].leftPct).toBeLessThan(100);
  });

  it('builds selected span event and link evidence in operator language without raw JSON', () => {
    const eventRows = buildSelectedSpanEventRows(
      {
        events: [
          {
            name: 'exception',
            timeUnixNano: 1713200000030000000,
            attributes: {
              'exception.type': 'TimeoutError',
              'hertzbeat.entity_id': '7'
            }
          },
          {
            timeUnixNano: 1713200000040000000,
            attributes: {}
          }
        ]
      } as any,
      value => (value ? `time:${value}` : '-'),
      t
    );

    expect(eventRows).toEqual([
      {
        title: 'exception',
        copy: 'exception.type=TimeoutError · hertzbeat.entity_id=7',
        meta: 'time:1713200000030'
      },
      {
        title: t('trace.manage.event.fallback'),
        copy: t('trace.manage.event.attributes.empty'),
        meta: 'time:1713200000040'
      }
    ]);
    expect(eventRows[0].copy).not.toContain('{');
    expect(eventRows[0].copy).not.toContain('}');

    expect(buildSelectedSpanLinkRows({ links: [{ traceId: 'trace-linked', spanId: 'span-linked' }, {}] } as any, t)).toEqual([
      {
        title: 'trace-linked',
        copy: 'span-linked',
        meta: t('trace.manage.link.meta')
      },
      {
        title: t('trace.manage.link.fallback'),
        copy: '-',
        meta: t('trace.manage.link.meta')
      }
    ]);
  });

  it('builds selected span facts with service namespace fallback', () => {
    expect(
      buildSelectedSpanFacts(
        {
          traceId: 't-1',
          spanId: 's-1',
          spanName: 'db.query',
          spanKind: 'Span',
          status: 'OK',
          durationNanos: 300_000_000,
          serviceName: 'checkout',
          resourceAttributes: { 'service.namespace': 'payments' }
        },
        { traceId: 't-1', serviceName: 'checkout', serviceNamespace: 'payments', spans: [] },
        t,
        (nanos?: number | null) => `${(nanos ?? 0) / 1_000_000}ms`
      )
    ).toEqual([
      { title: 'db.query', copy: 'Span · OK', meta: '300ms' },
      { title: t('trace.manage.selected-span.service-namespace'), copy: 'checkout · payments', meta: t('trace.manage.trace-state-empty') }
    ]);
  });

  it('builds HertzBeat attribution diagnostics for trace detail without entity id', () => {
    expect(
      buildTraceAttributionDiagnostics(
        {
          traceId: 'trace-self',
          serviceName: 'HertzBeat',
          resourceAttributes: {
            'service.name': 'HertzBeat',
            'hertzbeat.collector': 'collector-local',
            'hertzbeat.template': 'hertzbeat-self'
          },
          spans: []
        } as any,
        {
          traceId: 'trace-self',
          spanId: 'span-self',
          serviceName: 'HertzBeat',
          resourceAttributes: {
            'service.namespace': 'hertzbeat'
          },
          spanAttributes: {
            'http.route': '/api/logs/sse/subscribe'
          }
        } as any,
        {},
        t
      )
    ).toEqual([
      {
        key: 'hertzbeat.entity_id',
        label: 'hertzbeat.entity_id',
        value: '-',
        state: 'missing',
        meta: t('trace.manage.attribution-diagnostics.entity-id.missing')
      },
      {
        key: 'hertzbeat.entity_name',
        label: 'hertzbeat.entity_name',
        value: '-',
        state: 'missing',
        meta: t('trace.manage.attribution-diagnostics.entity-name.missing')
      },
      {
        key: 'hertzbeat.workspace_id',
        label: 'hertzbeat.workspace_id',
        value: '-',
        state: 'missing',
        meta: t('trace.manage.attribution-diagnostics.workspace-id.missing')
      },
      {
        key: 'hertzbeat.collector',
        label: 'hertzbeat.collector',
        value: 'collector-local',
        state: 'present',
        meta: t('trace.manage.attribution-diagnostics.collector.present')
      },
      {
        key: 'hertzbeat.template',
        label: 'hertzbeat.template',
        value: 'hertzbeat-self',
        state: 'present',
        meta: t('trace.manage.attribution-diagnostics.template.present')
      }
    ]);
  });

  it('builds logs, metrics, and entity handoff links with shared route context', () => {
    const result = buildTraceHandoffLinks(
      {
        traceId: 'trace-1',
        serviceName: 'checkout',
        serviceNamespace: 'payments',
        startTime: 1000,
        durationNanos: 2_000_000
      } as any,
      { spanId: 'span-1', serviceName: 'checkout' } as any,
      {
        entityId: '7',
        entityName: 'Checkout API',
        returnTo: '/entities/7',
        environment: 'prod',
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

    expect(result.entitiesHref).toBe('/entities?search=checkout');

    const intakeParams = new URL(result.intakeHref, 'https://example.com').searchParams;
    expect(intakeParams.get('signal')).toBe('traces');
    expect(intakeParams.get('entityId')).toBe('7');
    expect(intakeParams.get('entityName')).toBe('Checkout API');
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
    expect(intakeParams.get('returnTo')).toBe('/trace/manage');
    expect(intakeParams.get('returnLabel')).toBeNull();

    const logParams = new URL(result.logsHref, 'https://example.com').searchParams;
    expect(logParams.get('traceId')).toBe('trace-1');
    expect(logParams.get('spanId')).toBe('span-1');
    expect(logParams.get('serviceName')).toBe('checkout');
    expect(logParams.get('serviceNamespace')).toBe('payments');
    expect(logParams.get('entityId')).toBe('7');
    expect(logParams.get('entityName')).toBe('Checkout API');
    expect(logParams.get('returnTo')).toBe('/entities/7');
    expect(logParams.get('returnLabel')).toBeNull();
    expect(logParams.get('environment')).toBe('prod');
    expect(logParams.get('start')).toBe('1000');
    expect(logParams.get('end')).toBe('1002');
    expect(logParams.get('refresh')).toBe('30');
    expect(logParams.get('live')).toBe('false');
    expect(logParams.get('tz')).toBe('Asia/Shanghai');
    expect(logParams.get('monitorId')).toBe('42');
    expect(logParams.get('monitorName')).toBe('HTTPS Probe');
    expect(logParams.get('monitorApp')).toBe('website');
    expect(logParams.get('monitorInstance')).toBe('example.com:443');

    const metricsParams = new URL(result.metricsHref, 'https://example.com').searchParams;
    expect(metricsParams.get('traceId')).toBe('trace-1');
    expect(metricsParams.get('spanId')).toBe('span-1');
    expect(metricsParams.get('serviceName')).toBe('checkout');
    expect(metricsParams.get('serviceNamespace')).toBe('payments');
    expect(metricsParams.get('entityId')).toBe('7');
    expect(metricsParams.get('entityName')).toBe('Checkout API');
    expect(metricsParams.get('returnTo')).toBe('/entities/7');
    expect(metricsParams.get('returnLabel')).toBeNull();
    expect(metricsParams.get('environment')).toBe('prod');
    expect(metricsParams.get('timeRange')).toBe('last-1h');
    expect(metricsParams.get('source')).toBe('otlp');
    expect(metricsParams.get('collector')).toBe('collector-a');
    expect(metricsParams.get('template')).toBe('spring-boot');
    expect(metricsParams.get('start')).toBe('1000');
    expect(metricsParams.get('end')).toBe('1002');
    expect(metricsParams.get('refresh')).toBe('30');
    expect(metricsParams.get('live')).toBe('false');
    expect(metricsParams.get('tz')).toBe('Asia/Shanghai');
    expect(metricsParams.get('monitorId')).toBe('42');
    expect(metricsParams.get('monitorName')).toBe('HTTPS Probe');
    expect(metricsParams.get('monitorApp')).toBe('website');
    expect(metricsParams.get('monitorInstance')).toBe('example.com:443');

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
    expect(alertParams.get('signal')).toBe('traces');
    expect(alertParams.get('entityId')).toBe('7');
    expect(alertParams.get('serviceName')).toBe('checkout');
    expect(alertParams.get('environment')).toBe('prod');
    expect(alertParams.get('timeRange')).toBe('last-1h');
    expect(alertParams.get('source')).toBe('otlp');

    const alertHandlingHref = new URL(result.alertHandlingHref, 'https://example.com');
    expect(alertHandlingHref.pathname).toBe('/alert');
    expect(alertHandlingHref.searchParams.get('status')).toBe('firing');
    expect(alertHandlingHref.searchParams.get('signal')).toBe('traces');
    expect(alertHandlingHref.searchParams.get('search')).toBe('checkout');
    expect(alertHandlingHref.searchParams.get('entityId')).toBe('7');
    expect(alertHandlingHref.searchParams.get('serviceName')).toBe('checkout');
    expect(alertHandlingHref.searchParams.get('environment')).toBe('prod');
    expect(alertHandlingHref.searchParams.get('timeRange')).toBe('last-1h');
    expect(alertHandlingHref.searchParams.get('source')).toBe('otlp');
  });

  it('uses trace detail and selected span HertzBeat attributes when route entity context is missing', () => {
    const result = buildTraceHandoffLinks(
      {
        traceId: 'trace-entity-from-detail',
        serviceName: 'checkout',
        serviceNamespace: 'payments',
        startTime: 1000,
        durationNanos: 2_000_000,
        resourceAttributes: {
          'hertzbeat.entity_id': '42',
          'hertzbeat.entity_name': 'Checkout API',
          'hertzbeat.collector': 'collector-a',
          'hertzbeat.template': 'spring-boot'
        }
      } as any,
      {
        spanId: 'span-db',
        serviceName: 'checkout',
        resourceAttributes: {
          'deployment.environment.name': 'prod-east',
          'service.namespace': 'payments-db',
          'hertzbeat.entity_id': '43',
          'hertzbeat.entity_name': 'Checkout DB',
          'hertzbeat.collector': 'collector-b',
          'hertzbeat.template': 'postgres'
        }
      } as any,
      {
        source: 'otlp',
        returnTo: '/trace/manage?traceId=trace-entity-from-detail&returnLabel=Trace'
      }
    );

    const logParams = new URL(result.logsHref, 'https://example.com').searchParams;
    expect(logParams.get('traceId')).toBe('trace-entity-from-detail');
    expect(logParams.get('spanId')).toBe('span-db');
    expect(logParams.get('entityId')).toBe('43');
    expect(logParams.get('entityName')).toBe('Checkout DB');
    expect(logParams.get('serviceName')).toBe('checkout');
    expect(logParams.get('serviceNamespace')).toBe('payments-db');
    expect(logParams.get('environment')).toBe('prod-east');
    expect(logParams.get('collector')).toBe('collector-b');
    expect(logParams.get('template')).toBe('postgres');
    expect(logParams.get('returnTo')).toBe('/trace/manage?traceId=trace-entity-from-detail');

    const metricsParams = new URL(result.metricsHref, 'https://example.com').searchParams;
    expect(metricsParams.get('entityId')).toBe('43');
    expect(metricsParams.get('entityName')).toBe('Checkout DB');
    expect(metricsParams.get('collector')).toBe('collector-b');
    expect(metricsParams.get('template')).toBe('postgres');

    const entityHref = new URL(result.entityHref, 'https://example.com');
    expect(entityHref.pathname).toBe('/entities/43');
    expect(entityHref.searchParams.get('entityName')).toBe('Checkout DB');
    expect(entityHref.searchParams.get('collector')).toBe('collector-b');
    expect(entityHref.searchParams.get('template')).toBe('postgres');

    const alertHandlingHref = new URL(result.alertHandlingHref, 'https://example.com');
    expect(alertHandlingHref.searchParams.get('entityId')).toBe('43');
    expect(alertHandlingHref.searchParams.get('entityName')).toBe('Checkout DB');
    expect(alertHandlingHref.searchParams.get('collector')).toBe('collector-b');
    expect(alertHandlingHref.searchParams.get('template')).toBe('postgres');
  });

  it('lets the related-logs handoff override the return path back to the active trace workbench', () => {
    const activeTraceReturnTo =
      `/trace/manage?traceId=trace-1&spanId=span-1&serviceName=checkout&errorOnly=true&returnTo=%2Foverview&returnLabel=${encodeURIComponent(t('menu.trace.manage'))}`;
    const result = buildTraceHandoffLinks(
      {
        traceId: 'trace-1',
        serviceName: 'checkout',
        serviceNamespace: 'payments',
        startTime: 1000,
        durationNanos: 2_000_000
      } as any,
      { spanId: 'span-1', serviceName: 'checkout' } as any,
      {
        entityId: '7',
        entityName: 'Checkout API',
        returnTo: '/overview',
        environment: 'prod'
      },
      {
        logsReturnTo: activeTraceReturnTo,
        metricsReturnTo: activeTraceReturnTo,
        logsReturnLabel: t('menu.log.manage'),
        intakeReturnLabel: t('trace.manage.route.action.intake')
      }
    );

    const intakeParams = new URL(result.intakeHref, 'https://example.com').searchParams;
    expect(intakeParams.get('returnLabel')).toBeNull();

    const logParams = new URL(result.logsHref, 'https://example.com').searchParams;
    expect(logParams.get('traceId')).toBe('trace-1');
    expect(logParams.get('spanId')).toBe('span-1');
    expect(logParams.get('returnTo')).toBe(
      '/trace/manage?traceId=trace-1&spanId=span-1&serviceName=checkout&errorOnly=true&returnTo=%2Foverview'
    );
    expect(logParams.get('returnLabel')).toBeNull();

    const metricsParams = new URL(result.metricsHref, 'https://example.com').searchParams;
    expect(metricsParams.get('traceId')).toBe('trace-1');
    expect(metricsParams.get('spanId')).toBe('span-1');
    expect(metricsParams.get('returnTo')).toBe(
      '/trace/manage?traceId=trace-1&spanId=span-1&serviceName=checkout&errorOnly=true&returnTo=%2Foverview'
    );
    expect(metricsParams.get('returnLabel')).toBeNull();
  });

  it('keeps the trace-to-log and trace-to-metrics handoffs populated before detail hydration finishes', () => {
    const result = buildTraceHandoffLinks(
      null,
      null,
      {
        returnTo: '/overview',
        serviceName: 'checkout',
        serviceNamespace: 'payments',
        environment: 'prod',
        start: '1000',
        end: '1100'
      },
      {
        traceId: 'trace-1',
        spanId: 'span-root-1',
        logsReturnTo: '/trace/manage?traceId=trace-1&spanId=span-root-1',
        metricsReturnTo: '/trace/manage?traceId=trace-1&spanId=span-root-1'
      }
    );

    const logParams = new URL(result.logsHref, 'https://example.com').searchParams;
    expect(logParams.get('traceId')).toBe('trace-1');
    expect(logParams.get('spanId')).toBe('span-root-1');
    expect(logParams.get('serviceName')).toBe('checkout');
    expect(logParams.get('serviceNamespace')).toBe('payments');
    expect(logParams.get('environment')).toBe('prod');
    expect(logParams.get('start')).toBe('1000');
    expect(logParams.get('end')).toBe('1100');
    expect(logParams.get('returnTo')).toBe('/trace/manage?traceId=trace-1&spanId=span-root-1');
    expect(logParams.get('returnLabel')).toBeNull();

    const metricsParams = new URL(result.metricsHref, 'https://example.com').searchParams;
    expect(metricsParams.get('traceId')).toBe('trace-1');
    expect(metricsParams.get('spanId')).toBe('span-root-1');
    expect(metricsParams.get('serviceName')).toBe('checkout');
    expect(metricsParams.get('serviceNamespace')).toBe('payments');
    expect(metricsParams.get('environment')).toBe('prod');
    expect(metricsParams.get('start')).toBe('1000');
    expect(metricsParams.get('end')).toBe('1100');
    expect(metricsParams.get('returnTo')).toBe('/trace/manage?traceId=trace-1&spanId=span-root-1');
    expect(metricsParams.get('returnLabel')).toBeNull();
  });

  it('does not round decimal trace detail time bounds into handoff urls', () => {
    const result = buildTraceHandoffLinks(
      {
        traceId: 'trace-decimal',
        serviceName: 'HertzBeat',
        startTime: 1777484896189.989,
        durationNanos: 960_000_000
      } as any,
      { spanId: 'span-decimal', serviceName: 'HertzBeat' } as any
    );

    const logParams = new URL(result.logsHref, 'https://example.com').searchParams;
    const metricsParams = new URL(result.metricsHref, 'https://example.com').searchParams;

    expect(logParams.get('start')).toBeNull();
    expect(logParams.get('end')).toBeNull();
    expect(metricsParams.get('start')).toBeNull();
    expect(metricsParams.get('end')).toBeNull();
  });

  it('builds trace code navigation urls from selected span and hint', () => {
    expect(
      buildTraceCodeNavigationUrl(
        {
          serviceName: 'checkout',
          spanAttributes: {
            'code.function': 'handleTrace',
            'code.filepath': 'web-next/app/trace/manage/page.tsx'
          }
        } as any,
        {
          repositoryUrl: 'https://github.com/apache/hertzbeat',
          provider: 'github',
          defaultPath: 'web-next',
          searchQuery: 'fallback'
        }
      )
    ).toBe('https://github.com/apache/hertzbeat/search?q=path%3Aweb-next%2Fapp%2Ftrace%2Fmanage%2Fpage.tsx%20handleTrace&type=code');
  });
});
