import { describe, expect, it, vi } from 'vitest';
import {
  buildQueryStats,
  buildSelectedSpanEventRows,
  buildSelectedSpanFacts,
  buildSelectedSpanLinkRows,
  buildTraceAttributeRows,
  buildTraceCodeNavigationUrl,
  buildTraceAlertRuleDraft,
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
        durationMs: '420',
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

  it('builds selected span attribute rows with stable sorting and readable values', () => {
    expect(
      buildTraceAttributeRows(
        {
          'http.route': '/checkout/:id',
          'db.statement': 'select * from orders',
          'messaging.retry': 2,
          'array.value': ['a', 'b'],
          'object.value': { nested: true }
        } as any,
        t('trace.manage.drawer.attributes.span.meta'),
        t
      )
    ).toEqual([
      { title: 'array.value', copy: 'a, b', meta: t('trace.manage.drawer.attributes.span.meta') },
      { title: 'db.statement', copy: 'select * from orders', meta: t('trace.manage.drawer.attributes.span.meta') },
      { title: 'http.route', copy: '/checkout/:id', meta: t('trace.manage.drawer.attributes.span.meta') },
      { title: 'messaging.retry', copy: '2', meta: t('trace.manage.drawer.attributes.span.meta') },
      { title: 'object.value', copy: t('trace.manage.event.attributes.object'), meta: t('trace.manage.drawer.attributes.span.meta') }
    ]);

    expect(buildTraceAttributeRows({}, t('trace.manage.drawer.attributes.resource.meta'), t)).toEqual([
      {
        title: t('trace.manage.drawer.attributes.empty.title'),
        copy: t('trace.manage.drawer.attributes.empty.copy'),
        meta: t('trace.manage.drawer.attributes.resource.meta')
      }
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
    const routeContext = {
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
    };
    const alertDraft = buildTraceAlertRuleDraft(
      {
        traceId: '',
        spanId: '',
        serviceName: 'checkout',
        resourceFilter: 'deployment.environment.name="prod"',
        operationName: 'POST /checkout',
        minDurationMs: '',
        maxDurationMs: '',
        errorOnly: true,
        spanScope: 'root'
      } as any,
      { ...routeContext, serviceNamespace: 'payments' }
    );
    const result = buildTraceHandoffLinks(
      {
        traceId: 'trace-1',
        serviceName: 'checkout',
        serviceNamespace: 'payments',
        startTime: 1000,
        durationNanos: 2_000_000
      } as any,
      { spanId: 'span-1', serviceName: 'checkout' } as any,
      routeContext,
      { alertDraft }
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
    expect(alertParams.get('intent')).toBe('create');
    expect(alertParams.get('entityId')).toBe('7');
    expect(alertParams.get('serviceName')).toBe('checkout');
    expect(alertParams.get('environment')).toBe('prod');
    expect(alertParams.get('timeRange')).toBe('last-1h');
    expect(alertParams.get('source')).toBe('otlp');
    expect(alertParams.get('alertName')).toBe('checkout trace alert');
    expect(alertParams.get('alertQueryType')).toBe('traces');
    expect(alertParams.get('alertDatasource')).toBe('sql');
    expect(alertParams.get('alertTemplate')).toBe('Trace error rate detected ${service_name} ${operation}: ${__value__}');
    expect(alertParams.get('alertExpression')).toContain('FROM hertzbeat_apm_red_1m');
    expect(alertParams.get('alertExpression')).toContain("WHERE service_name = 'checkout'");
    expect(alertParams.get('alertExpression')).toContain("AND operation = 'POST /checkout'");
    expect(alertParams.get('alertExpression')).toContain("AND entity_id = '7'");
    expect(alertParams.get('alertExpression')).toContain("AND service_namespace = 'payments'");
    expect(alertParams.get('alertExpression')).toContain("AND deployment_environment = 'prod'");
    expect(alertParams.get('alertExpression')).toContain('HAVING __value__ > 0');
    expect(alertParams.get('alertQuery')).toContain('serviceName=checkout');
    expect(alertParams.get('alertQuery')).toContain('operationName=POST /checkout');
    expect(alertParams.get('alertQuery')).toContain('errorOnly=true');

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

    const dashboardHref = new URL(result.dashboardHref, 'https://example.com');
    expect(dashboardHref.pathname).toBe('/dashboard');
    expect(dashboardHref.searchParams.get('intent')).toBe('add-panel');
    expect(dashboardHref.searchParams.get('signal')).toBe('traces');
    expect(dashboardHref.searchParams.get('panelTitle')).toBe('checkout');
    expect(dashboardHref.searchParams.get('entityId')).toBe('7');
    expect(dashboardHref.searchParams.get('serviceName')).toBe('checkout');
    expect(dashboardHref.searchParams.get('environment')).toBe('prod');
    expect(dashboardHref.searchParams.get('timeRange')).toBe('last-1h');
    expect(dashboardHref.searchParams.get('source')).toBe('otlp');
    expect(dashboardHref.searchParams.get('panelQueryType')).toBe('traces');
    expect(dashboardHref.searchParams.get('panelDatasource')).toBe('sql');
    expect(dashboardHref.searchParams.get('panelExpression')).toContain('FROM hertzbeat_apm_red_1m');
    expect(dashboardHref.searchParams.get('panelQuery')).toContain('serviceName=checkout');
    expect(dashboardHref.searchParams.get('panelQuery')).toContain('operationName=POST /checkout');
  });

  it('does not invent trace alert SQL when the query has no error-only service scope', () => {
    expect(buildTraceAlertRuleDraft({
      traceId: '',
      spanId: '',
      serviceName: '',
      operationName: '',
      errorOnly: true,
      spanScope: 'root'
    } as any).expression).toBeUndefined();
    expect(buildTraceAlertRuleDraft({
      traceId: '',
      spanId: '',
      serviceName: `checkout' OR 1=1`,
      operationName: '',
      errorOnly: true,
      spanScope: 'root'
    } as any).expression).toBeUndefined();
    expect(buildTraceAlertRuleDraft({
      traceId: '',
      spanId: '',
      serviceName: 'checkout',
      operationName: `POST /checkout'; DROP TABLE hertzbeat_apm_red_1m; --`,
      errorOnly: true,
      spanScope: 'root'
    } as any).expression).toBeUndefined();
    expect(buildTraceAlertRuleDraft({
      traceId: '',
      spanId: '',
      serviceName: 'checkout',
      operationName: '',
      errorOnly: false,
      spanScope: 'root'
    } as any).expression).toBeUndefined();
  });

  it('builds a scoped trace latency alert SQL from minimum duration filters', () => {
    const draft = buildTraceAlertRuleDraft(
      {
        traceId: '',
        spanId: '',
        serviceName: 'checkout',
        resourceFilter: '',
        operationName: 'POST /checkout',
        minDurationMs: '250',
        maxDurationMs: '500',
        errorOnly: false,
        spanScope: 'root'
      } as any,
      {
        entityId: '7',
        serviceNamespace: 'payments',
        environment: 'prod'
      }
    );

    expect(draft.datasource).toBe('sql');
    expect(draft.template).toBe('Trace latency detected ${service_name} ${operation}: ${__value__} ms');
    expect(draft.expression).toContain('SUM(duration_sum_nano) / NULLIF(SUM(duration_count), 0) / 1000000 AS __value__');
    expect(draft.expression).toContain('FROM hertzbeat_apm_red_1m');
    expect(draft.expression).toContain("WHERE service_name = 'checkout'");
    expect(draft.expression).toContain("AND operation = 'POST /checkout'");
    expect(draft.expression).toContain("AND entity_id = '7'");
    expect(draft.expression).toContain("AND service_namespace = 'payments'");
    expect(draft.expression).toContain("AND deployment_environment = 'prod'");
    expect(draft.expression).toContain('HAVING __value__ >= 250 AND __value__ <= 500');
  });

  it('keeps RED-backed resource filters in trace alert SQL', () => {
    const draft = buildTraceAlertRuleDraft({
      traceId: '',
      spanId: '',
      serviceName: '',
      resourceFilter:
        'service.name=checkout and service.namespace="payments" and deployment.environment.name=prod and hertzbeat.entity_id=7',
      operationName: 'POST /checkout',
      minDurationMs: '',
      maxDurationMs: '',
      errorOnly: true,
      spanScope: 'root'
    } as any);

    expect(draft.datasource).toBe('sql');
    expect(draft.expression).toContain("WHERE service_name = 'checkout'");
    expect(draft.expression).toContain("AND operation = 'POST /checkout'");
    expect(draft.expression).toContain("AND service_namespace = 'payments'");
    expect(draft.expression).toContain("AND deployment_environment = 'prod'");
    expect(draft.expression).toContain("AND entity_id = '7'");
    expect(draft.expression).toContain('HAVING __value__ > 0');
  });

  it('falls back to raw trace SQL for non-RED resource filters', () => {
    const draft = buildTraceAlertRuleDraft({
      traceId: '',
      spanId: '',
      serviceName: 'checkout',
      resourceFilter: 'service.version=1.2.3',
      operationName: 'POST /checkout',
      minDurationMs: '',
      maxDurationMs: '',
      errorOnly: true,
      spanScope: 'root'
    } as any);

    expect(draft.datasource).toBe('sql');
    expect(draft.expression).toContain('FROM hzb_traces');
    expect(draft.expression).toContain("WHERE service_name = 'checkout'");
    expect(draft.expression).toContain("AND span_name = 'POST /checkout'");
    expect(draft.expression).toContain("AND json_get_string(resource_attributes, '$[\"service.version\"]') = '1.2.3'");
    expect(draft.expression).toContain("AND span_status_code IN ('STATUS_CODE_ERROR', 'ERROR')");
    expect(draft.expression).toContain("AND (parent_span_id IS NULL OR parent_span_id = '')");
    expect(draft.expression).toContain('COUNT(*) AS __value__');
    expect(draft.expression).toContain('HAVING __value__ > 0');
  });

  it('uses raw trace SQL for error-only alerts with duration filters', () => {
    const draft = buildTraceAlertRuleDraft({
      traceId: '',
      spanId: '',
      serviceName: 'checkout',
      resourceFilter: '',
      operationName: '',
      minDurationMs: '250',
      maxDurationMs: '500',
      errorOnly: true,
      spanScope: 'root'
    } as any);

    expect(draft.datasource).toBe('sql');
    expect(draft.expression).toContain('FROM hzb_traces');
    expect(draft.expression).toContain('duration_nano >= 250000000');
    expect(draft.expression).toContain('duration_nano <= 500000000');
    expect(draft.expression).toContain("span_status_code IN ('STATUS_CODE_ERROR', 'ERROR')");
    expect(draft.expression).toContain('HAVING __value__ > 0');
  });

  it('does not invent trace latency SQL from unsafe duration or optional filters', () => {
    expect(buildTraceAlertRuleDraft({
      traceId: '',
      spanId: '',
      serviceName: 'checkout',
      operationName: 'POST /checkout',
      minDurationMs: '250 OR 1=1',
      errorOnly: false,
      spanScope: 'root'
    } as any).expression).toBeUndefined();
    expect(buildTraceAlertRuleDraft({
      traceId: '',
      spanId: '',
      serviceName: 'checkout',
      operationName: `POST /checkout'; DROP TABLE hertzbeat_apm_red_1m; --`,
      minDurationMs: '250',
      errorOnly: false,
      spanScope: 'root'
    } as any).expression).toBeUndefined();
    expect(buildTraceAlertRuleDraft({
      traceId: '',
      spanId: '',
      serviceName: 'checkout',
      resourceFilter: 'service.version=1.2.3',
      operationName: '',
      minDurationMs: '250',
      errorOnly: false,
      spanScope: 'root'
    } as any).expression).toContain('FROM hzb_traces');
    expect(buildTraceAlertRuleDraft({
      traceId: '',
      spanId: '',
      serviceName: 'checkout',
      resourceFilter: '',
      operationName: '',
      minDurationMs: '250',
      maxDurationMs: '',
      errorOnly: true,
      spanScope: 'root'
    } as any).expression).toContain('FROM hzb_traces');
    expect(buildTraceAlertRuleDraft({
      traceId: '',
      spanId: '',
      serviceName: 'checkout',
      resourceFilter: '',
      operationName: '',
      minDurationMs: '',
      maxDurationMs: '500',
      errorOnly: true,
      spanScope: 'root'
    } as any).expression).toContain('FROM hzb_traces');
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
        spanName: 'POST /checkout',
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
    expect(metricsParams.get('operationName')).toBe('POST /checkout');

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

  it('carries selected span resource attributes into trace-to-metrics handoffs', () => {
    const result = buildTraceHandoffLinks(
      {
        traceId: 'trace-resource-context',
        serviceName: 'checkout',
        serviceNamespace: 'payments',
        startTime: 1000,
        durationNanos: 2_000_000,
        resourceAttributes: {
          'host.name': 'node-a'
        }
      } as any,
      {
        spanId: 'span-api',
        serviceName: 'checkout',
        resourceAttributes: {
          'service.namespace': 'payments',
          'deployment.environment.name': 'prod',
          'k8s.namespace.name': 'shop',
          'k8s.pod.name': 'checkout-7d9',
          'k8s.node.name': 'node-a',
          'container.name': 'checkout',
          'host.name': 'node-a'
        }
      } as any,
      {
        entityId: '42',
        entityName: 'Checkout API',
        source: 'otlp'
      }
    );

    const metricsParams = new URL(result.metricsHref, 'https://example.com').searchParams;
    expect(metricsParams.get('traceId')).toBe('trace-resource-context');
    expect(metricsParams.get('spanId')).toBe('span-api');
    expect(metricsParams.get('serviceName')).toBe('checkout');
    expect(metricsParams.get('serviceNamespace')).toBe('payments');
    expect(metricsParams.get('entityId')).toBe('42');
    expect(metricsParams.get('filter')).toBe(
      'k8s.namespace.name="shop" and k8s.pod.name="checkout-7d9" and k8s.node.name="node-a" and k8s.container.name="checkout" and host.name="node-a"'
    );
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
