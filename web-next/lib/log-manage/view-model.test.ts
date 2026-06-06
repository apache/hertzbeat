import { describe, expect, it, vi } from 'vitest';
import {
  buildLogCodeNavigationUrl,
  buildLogAlertRuleDraft,
  buildLogAttributionDiagnostics,
  buildLogExplorerRows,
  buildLogHandoffLinks,
  buildLogMetricsPreviewTargets,
  buildLogAttributeRows,
  buildRelatedTraceRowCopy,
  buildSelectedLogFacts,
  buildSelectedLogRows,
  buildTrendRows
} from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });
const enT = createTranslatorMock({
  locale: 'en-US',
  overrides: {
    'log.manage.trend.meta': 'Trend'
  }
});

describe('log view model', () => {
  it('builds trend rows from hourly stats', () => {
    expect(buildTrendRows({ '10:00': 2, '11:00': 5 }, t)).toEqual([
      { title: '10:00', copy: t('log.manage.trend.count', { count: 2 }), meta: t('log.manage.trend.meta') },
      { title: '11:00', copy: t('log.manage.trend.count', { count: 5 }), meta: t('log.manage.trend.meta') }
    ]);
  });

  it('builds English trend count rows without localized fallback text', () => {
    const rows = buildTrendRows({ '10:00': 2, '11:00': 5 }, enT);

    expect(rows).toEqual([
      { title: '10:00', copy: '2 logs', meta: 'Trend' },
      { title: '11:00', copy: '5 logs', meta: 'Trend' }
    ]);
    expect(rows.map(row => `${row.copy} ${row.meta}`).join('\n')).not.toMatch(/[\u4e00-\u9fff]/);
  });

  it('builds selected log rows from a selected log entry', () => {
    expect(
      buildSelectedLogRows(
        {
          resource: { 'service.name': 'checkout' },
          body: 'timeout on db',
          traceId: 'abc123',
          spanId: 'span123',
          severityText: 'ERROR',
          attributes: { retry: 1 },
          timeUnixNano: 1712730000000000000
        },
        t,
        () => 'timeout on db',
        () => '2026-04-10 10:00:00'
      )
    ).toEqual([
      { title: 'checkout', copy: 'timeout on db', meta: 'abc123' },
      { title: t('log.manage.selected.resource-keys'), copy: '1', meta: t('log.manage.selected.attributes', { count: 1 }) },
      { title: t('log.manage.selected.span-severity'), copy: 'span123 · ERROR', meta: '2026-04-10 10:00:00' },
      { title: t('log.manage.trace-id'), copy: 'abc123', meta: 'trace' },
      { title: t('log.manage.span-id'), copy: 'span123', meta: 'span' }
    ]);
  });

  it('builds HertzBeat log explorer rows from log entries', () => {
    expect(
      buildLogExplorerRows(
        [
          {
            traceId: 'trace-1',
            spanId: 'span-1',
            severityText: 'ERROR',
            body: 'checkout timeout',
            timeUnixNano: 1712730000000000000,
            resource: { 'service.name': 'checkout' }
          }
        ] as any,
        {
          bodyText: value => String(value),
          formatTime: () => '2026-04-10 10:00:00',
          severityLabel: entry => entry.severityText || 'LOG'
        }
      )
    ).toEqual([
      {
        key: '1712730000000000000-trace-1-span-1-0',
        timestamp: '2026-04-10 10:00:00',
        message: 'checkout timeout',
        service: 'checkout',
        severity: 'ERROR',
        severityTone: 'danger',
        traceId: 'trace-1',
        spanId: 'span-1'
      }
    ]);
  });

  it('builds stream detail facts from a selected log entry', () => {
    expect(
      buildSelectedLogFacts(
        {
          traceId: 'abc123',
          spanId: 'span123',
          severityText: 'ERROR',
          timeUnixNano: 1712730000000000000
        },
        t,
        () => '2026-04-10 10:00:00'
      )
    ).toEqual([
      { label: t('log.stream.severity'), value: 'ERROR' },
      { label: t('log.stream.timestamp'), value: '2026-04-10 10:00:00' },
      { label: t('log.stream.trace-id-full'), value: 'abc123', monospace: true },
      { label: t('log.stream.span-id-full'), value: 'span123', monospace: true }
    ]);
  });

  it('builds selected log attribute rows from resource and log attributes', () => {
    expect(
      buildLogAttributeRows(
        {
          resource: {
            'service.name': 'checkout',
            'deployment.environment.name': 'prod'
          },
          attributes: {
            'http.route': '/checkout/:id',
            'retry.count': 2,
            'array.value': ['a', 'b'],
            'object.value': { nested: true }
          }
        },
        t
      )
    ).toEqual([
      { key: 'attribute-array.value', source: t('log.manage.attributes.source.attribute'), name: 'array.value', value: 'a, b' },
      { key: 'attribute-http.route', source: t('log.manage.attributes.source.attribute'), name: 'http.route', value: '/checkout/:id' },
      { key: 'attribute-object.value', source: t('log.manage.attributes.source.attribute'), name: 'object.value', value: t('log.manage.attributes.value.object') },
      { key: 'attribute-retry.count', source: t('log.manage.attributes.source.attribute'), name: 'retry.count', value: '2' },
      { key: 'resource-deployment.environment.name', source: t('log.manage.attributes.source.resource'), name: 'deployment.environment.name', value: 'prod' },
      { key: 'resource-service.name', source: t('log.manage.attributes.source.resource'), name: 'service.name', value: 'checkout' }
    ]);
  });

  it('builds an explicit empty log attribute row when no fields exist', () => {
    expect(buildLogAttributeRows(null, t)).toEqual([
      {
        key: 'empty',
        source: '-',
        name: t('log.manage.attributes.empty.name'),
        value: t('log.manage.attributes.empty.value')
      }
    ]);
  });

  it('surfaces HertzBeat-native log correlation attributes in the detail facts', () => {
    expect(
      buildSelectedLogFacts(
        {
          traceId: 'abc123',
          spanId: 'span123',
          severityText: 'ERROR',
          timeUnixNano: 1712730000000000000,
          attributes: {
            'hertzbeat.event_id': 'event-1',
            'hertzbeat.ingest_id': 'ingest-1'
          },
          resource: {
            'hertzbeat.entity_id': 'entity-1',
            'hertzbeat.workspace_id': 'workspace-1'
          }
        },
        t,
        () => '2026-04-10 10:00:00'
      )
    ).toEqual([
      { label: t('log.stream.severity'), value: 'ERROR' },
      { label: t('log.stream.timestamp'), value: '2026-04-10 10:00:00' },
      { label: t('log.stream.trace-id-full'), value: 'abc123', monospace: true },
      { label: t('log.stream.span-id-full'), value: 'span123', monospace: true },
      { label: 'HertzBeat event_id', value: 'event-1', monospace: true },
      { label: 'HertzBeat ingest_id', value: 'ingest-1', monospace: true },
      { label: 'HertzBeat entity_id', value: 'entity-1', monospace: true },
      { label: 'HertzBeat workspace_id', value: 'workspace-1', monospace: true }
    ]);
  });

  it('builds HertzBeat attribution diagnostics for self-monitoring logs without entity id', () => {
    expect(
      buildLogAttributionDiagnostics(
        {
          traceId: '',
          spanId: '',
          severityText: 'INFO',
          body: 'self monitor heartbeat',
          attributes: {
            'hertzbeat.event_id': 'event-1',
            'hertzbeat.ingest_id': 'ingest-1'
          },
          resource: {
            'service.name': 'HertzBeat',
            'hertzbeat.collector': 'collector-local',
            'hertzbeat.template': 'hertzbeat-self'
          }
        } as any,
        t
      )
    ).toEqual([
      {
        key: 'hertzbeat.event_id',
        label: 'hertzbeat.event_id',
        value: 'event-1',
        state: 'present',
        meta: t('log.manage.attribution.event-id.present')
      },
      {
        key: 'hertzbeat.ingest_id',
        label: 'hertzbeat.ingest_id',
        value: 'ingest-1',
        state: 'present',
        meta: t('log.manage.attribution.ingest-id.present')
      },
      {
        key: 'hertzbeat.entity_id',
        label: 'hertzbeat.entity_id',
        value: '-',
        state: 'missing',
        meta: t('log.manage.attribution.entity-id.missing')
      },
      {
        key: 'hertzbeat.entity_name',
        label: 'hertzbeat.entity_name',
        value: '-',
        state: 'missing',
        meta: t('log.manage.attribution.entity-name.missing')
      },
      {
        key: 'hertzbeat.workspace_id',
        label: 'hertzbeat.workspace_id',
        value: '-',
        state: 'missing',
        meta: t('log.manage.attribution.workspace-id.missing')
      },
      {
        key: 'hertzbeat.collector',
        label: 'hertzbeat.collector',
        value: 'collector-local',
        state: 'present',
        meta: t('log.manage.attribution.collector')
      },
      {
        key: 'hertzbeat.template',
        label: 'hertzbeat.template',
        value: 'hertzbeat-self',
        state: 'present',
        meta: t('log.manage.attribution.template')
      }
    ]);
  });

  it('builds related-trace row copy with service, status, and span kind', () => {
    expect(
      buildRelatedTraceRowCopy(
        {
          serviceName: 'checkout',
          status: 'ERROR',
          spanKind: 'SERVER'
        } as any,
        'fallback-service'
      )
    ).toBe('checkout · ERROR · SERVER');
  });

  it('builds trace, metrics, and entity handoff links', () => {
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
    const alertDraft = buildLogAlertRuleDraft(
      {
        search: 'checkout failed',
        logContent: '',
        traceId: '',
        spanId: '',
        severityNumber: '',
        severityText: 'ERROR',
        resourceFilter: 'service.name="checkout"',
        attributeFilter: 'http.status_code=500'
      } as any,
      routeContext
    );
    const result = buildLogHandoffLinks(
      {
        traceId: 'trace-1',
        spanId: 'span-1',
        timeUnixNano: 1_710_000_000_000_000_000,
        resource: {
          'service.name': 'checkout',
          'service.namespace': 'payments',
          'deployment.environment.name': 'prod',
          'k8s.namespace.name': 'shop',
          'k8s.pod.name': 'checkout-7d9',
          'k8s.node.name': 'node-a',
          'k8s.container.name': 'checkout',
          'host.name': 'node-a'
        }
      } as any,
      routeContext,
      { alertDraft }
    );

    expect(result.entitiesHref).toBe('/entities?search=checkout');

    const intakeParams = new URL(result.intakeHref, 'https://example.com').searchParams;
    expect(intakeParams.get('signal')).toBe('logs');
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
    expect(intakeParams.get('returnTo')).toBe('/log/manage');
    expect(intakeParams.get('returnLabel')).toBeNull();

    const traceParams = new URL(result.traceHref, 'https://example.com').searchParams;
    expect(traceParams.get('traceId')).toBe('trace-1');
    expect(traceParams.get('spanId')).toBe('span-1');
    expect(traceParams.get('serviceName')).toBe('checkout');
    expect(traceParams.get('serviceNamespace')).toBe('payments');
    expect(traceParams.get('entityId')).toBe('7');
    expect(traceParams.get('entityName')).toBe('Checkout API');
    expect(traceParams.get('returnTo')).toBe('/entities/7');
    expect(traceParams.get('returnLabel')).toBeNull();
    expect(traceParams.get('environment')).toBe('prod');
    expect(traceParams.get('start')).toBe('1709999100000');
    expect(traceParams.get('end')).toBe('1710000060000');
    expect(traceParams.get('refresh')).toBe('30');
    expect(traceParams.get('live')).toBe('false');
    expect(traceParams.get('tz')).toBe('Asia/Shanghai');
    expect(traceParams.get('monitorId')).toBe('42');
    expect(traceParams.get('monitorName')).toBe('HTTPS Probe');
    expect(traceParams.get('monitorApp')).toBe('website');
    expect(traceParams.get('monitorInstance')).toBe('example.com:443');

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
    expect(metricsParams.get('start')).toBe('1709999100000');
    expect(metricsParams.get('end')).toBe('1710000060000');
    expect(metricsParams.get('refresh')).toBe('30');
    expect(metricsParams.get('live')).toBe('false');
    expect(metricsParams.get('tz')).toBe('Asia/Shanghai');
    expect(metricsParams.get('monitorId')).toBe('42');
    expect(metricsParams.get('monitorName')).toBe('HTTPS Probe');
    expect(metricsParams.get('monitorApp')).toBe('website');
    expect(metricsParams.get('monitorInstance')).toBe('example.com:443');
    expect(metricsParams.get('filter')).toBe(
      'k8s.namespace.name="shop" and k8s.pod.name="checkout-7d9" and k8s.node.name="node-a" and k8s.container.name="checkout" and host.name="node-a"'
    );

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
    expect(alertParams.get('signal')).toBe('logs');
    expect(alertParams.get('intent')).toBe('create');
    expect(alertParams.get('entityId')).toBe('7');
    expect(alertParams.get('serviceName')).toBe('checkout');
    expect(alertParams.get('environment')).toBe('prod');
    expect(alertParams.get('timeRange')).toBe('last-1h');
    expect(alertParams.get('source')).toBe('otlp');
    expect(alertParams.get('alertName')).toBe('Log alert');
    expect(alertParams.get('alertQueryType')).toBe('logs');
    expect(alertParams.get('alertExpression')).toBe(
      "log.severityText == 'ERROR' && contains(log.body, 'checkout failed') && "
      + "log.resource['deployment.environment.name'] == 'prod' && log.resource['service.name'] == 'checkout' && "
      + "log.attributes['http.status_code'] == 500"
    );
    expect(alertParams.get('alertTemplate')).toBe('Log matched: {{log.body}}');
    expect(alertParams.get('alertQuery')).toContain('search=checkout failed');
    expect(alertParams.get('alertQuery')).toContain('resourceFilter=service.name="checkout"');
    expect(alertParams.get('alertQuery')).toContain('attributeFilter=http.status_code=500');

    const alertHandlingHref = new URL(result.alertHandlingHref, 'https://example.com');
    expect(alertHandlingHref.pathname).toBe('/alert');
    expect(alertHandlingHref.searchParams.get('status')).toBe('firing');
    expect(alertHandlingHref.searchParams.get('signal')).toBe('logs');
    expect(alertHandlingHref.searchParams.get('search')).toBe('checkout');
    expect(alertHandlingHref.searchParams.get('entityId')).toBe('7');
    expect(alertHandlingHref.searchParams.get('serviceName')).toBe('checkout');
    expect(alertHandlingHref.searchParams.get('environment')).toBe('prod');
    expect(alertHandlingHref.searchParams.get('timeRange')).toBe('last-1h');
    expect(alertHandlingHref.searchParams.get('source')).toBe('otlp');

    const dashboardHref = new URL(result.dashboardHref, 'https://example.com');
    expect(dashboardHref.pathname).toBe('/dashboard');
    expect(dashboardHref.searchParams.get('intent')).toBe('add-panel');
    expect(dashboardHref.searchParams.get('signal')).toBe('logs');
    expect(dashboardHref.searchParams.get('panelTitle')).toBe('checkout');
    expect(dashboardHref.searchParams.get('entityId')).toBe('7');
    expect(dashboardHref.searchParams.get('serviceName')).toBe('checkout');
    expect(dashboardHref.searchParams.get('environment')).toBe('prod');
    expect(dashboardHref.searchParams.get('timeRange')).toBe('last-1h');
    expect(dashboardHref.searchParams.get('source')).toBe('otlp');
    expect(dashboardHref.searchParams.get('panelQueryType')).toBe('logs');
    expect(dashboardHref.searchParams.get('panelQuery')).toContain('search=checkout failed');
    expect(dashboardHref.searchParams.get('panelQuery')).toContain('resourceFilter=service.name="checkout"');
  });

  it('builds executable log alert expressions for bounded content searches', () => {
    expect(buildLogAlertRuleDraft({
      search: 'checkout failed',
      logContent: '',
      traceId: '',
      spanId: '',
      severityNumber: '',
      severityText: '',
      resourceFilter: '',
      attributeFilter: ''
    } as any)).toMatchObject({
      name: 'Log alert',
      queryType: 'logs',
      query: 'search=checkout failed',
      expression: "contains(log.body, 'checkout failed')",
      template: 'Log matched: {{log.body}}'
    });
    expect(buildLogAlertRuleDraft({
      search: 'generic timeout',
      logContent: 'db down',
      traceId: '',
      spanId: '',
      severityNumber: '',
      severityText: '',
      resourceFilter: '',
      attributeFilter: ''
    } as any).expression).toBe("contains(log.body, 'db down')");
    expect(buildLogAlertRuleDraft({
      search: '',
      logContent: '',
      traceId: '',
      spanId: '',
      severityNumber: '',
      severityText: `ERROR' || true`,
      resourceFilter: '',
      attributeFilter: ''
    } as any).expression).toBeUndefined();
    expect(buildLogAlertRuleDraft({
      search: 'checkout failed',
      logContent: '',
      traceId: '',
      spanId: '',
      severityNumber: '',
      severityText: `ERROR' || true`,
      resourceFilter: '',
      attributeFilter: ''
    } as any).expression).toBeUndefined();
  });

  it('builds bounded executable log alert expressions from simple filters', () => {
    expect(buildLogAlertRuleDraft(
      {
        search: 'checkout failed',
        logContent: '',
        traceId: '',
        spanId: '',
        severityNumber: '',
        severityText: 'error',
        resourceFilter: 'service.name="checkout" and deployment.environment.name!=staging',
        attributeFilter: 'http.status_code=500, http.route:/checkout/{id}, http.target!="/health"'
      } as any,
      {
        serviceName: 'checkout',
        environment: 'prod'
      }
    )).toMatchObject({
      expression:
        "log.severityText == 'ERROR' && contains(log.body, 'checkout failed') && "
        + "log.resource['service.name'] == 'checkout' && log.resource['deployment.environment.name'] == 'prod' && "
        + "log.resource['deployment.environment.name'] != 'staging' && log.attributes['http.status_code'] == 500 && "
        + "log.attributes['http.route'] == '/checkout/{id}' && log.attributes['http.target'] != '/health'",
      template: 'Log matched: {{log.body}}'
    });
  });

  it('keeps trace and span scope in executable log alert expressions', () => {
    expect(buildLogAlertRuleDraft(
      {
        search: 'checkout failed',
        logContent: '',
        traceId: 'trace-123',
        spanId: '',
        severityNumber: '',
        severityText: 'ERROR',
        resourceFilter: '',
        attributeFilter: ''
      } as any,
      {
        spanId: 'span-456'
      }
    )).toMatchObject({
      expression:
        "log.severityText == 'ERROR' && contains(log.body, 'checkout failed') && "
        + "log.traceId == 'trace-123' && log.spanId == 'span-456'",
      template: 'Log matched: {{log.body}}'
    });
  });

  it('keeps severity number scope in executable log alert expressions', () => {
    expect(buildLogAlertRuleDraft(
      {
        search: '',
        logContent: '',
        traceId: 'trace-123',
        spanId: '',
        severityNumber: '17',
        severityText: '',
        resourceFilter: '',
        attributeFilter: ''
      } as any
    )).toMatchObject({
      query: 'severityNumber=17\ntraceId=trace-123',
      expression: "log.severityNumber == 17 && log.traceId == 'trace-123'",
      template: 'Log matched: {{log.body}}'
    });
  });

  it('suppresses executable log alert expressions for unsafe severity number values', () => {
    expect(buildLogAlertRuleDraft({
      search: 'checkout failed',
      logContent: '',
      traceId: '',
      spanId: '',
      severityNumber: '17 || true',
      severityText: '',
      resourceFilter: '',
      attributeFilter: ''
    } as any).expression).toBeUndefined();
  });

  it('suppresses executable log alert expressions for unsafe trace scope values', () => {
    expect(buildLogAlertRuleDraft({
      search: 'checkout failed',
      logContent: '',
      traceId: `trace-123' || true`,
      spanId: '',
      severityNumber: '',
      severityText: '',
      resourceFilter: '',
      attributeFilter: ''
    } as any).expression).toBeUndefined();
  });

  it('suppresses executable log alert expressions for unsafe content searches', () => {
    expect(buildLogAlertRuleDraft({
      search: 'first line\nsecond line',
      logContent: '',
      traceId: '',
      spanId: '',
      severityNumber: '',
      severityText: '',
      resourceFilter: '',
      attributeFilter: ''
    } as any).expression).toBeUndefined();
  });

  it('suppresses executable log alert expressions when filters are not simple equality clauses', () => {
    expect(buildLogAlertRuleDraft({
      search: '',
      logContent: '',
      traceId: '',
      spanId: '',
      severityNumber: '',
      severityText: 'ERROR',
      resourceFilter: 'service.name="checkout" or service.name="billing"',
      attributeFilter: ''
    } as any).expression).toBeUndefined();
  });

  it('selects bounded log detail metrics preview targets from resource filter context', () => {
    const k8sAndHostHref =
      '/ingestion/otlp/metrics?serviceName=checkout&filter='
      + encodeURIComponent('k8s.pod.name="checkout-7d9" and host.name="node-a"');
    expect(buildLogMetricsPreviewTargets(k8sAndHostHref)).toEqual([
      { family: 'cpu', query: 'container.cpu.usage', source: 'k8s' },
      { family: 'memory', query: 'container.memory.working_set', source: 'k8s' },
      { family: 'cpu', query: 'system.cpu.utilization', source: 'host' },
      { family: 'memory', query: 'system.memory.usage', source: 'host' }
    ]);

    const hostOnlyHref = '/ingestion/otlp/metrics?serviceName=node-exporter&filter=' + encodeURIComponent('host.name="node-a"');
    expect(buildLogMetricsPreviewTargets(hostOnlyHref)).toEqual([
      { family: 'cpu', query: 'system.cpu.utilization', source: 'host' },
      { family: 'memory', query: 'system.memory.usage', source: 'host' }
    ]);

    expect(buildLogMetricsPreviewTargets('/ingestion/otlp/metrics?serviceName=checkout')).toEqual([]);
    expect(buildLogMetricsPreviewTargets(null)).toEqual([]);
  });

  it('uses HertzBeat entity attributes from the selected log for exact entity handoff', () => {
    const result = buildLogHandoffLinks(
      {
        traceId: 'trace-self',
        spanId: 'span-self',
        timeUnixNano: 1_710_000_000_000_000_000,
        resource: {
          'service.name': 'HertzBeat',
          'deployment.environment.name': 'prod',
          'hertzbeat.entity_id': '42',
          'hertzbeat.entity_name': 'HertzBeat self-monitoring',
          'hertzbeat.collector': 'collector-local',
          'hertzbeat.template': 'hertzbeat-self'
        }
      } as any,
      {
        source: 'otlp'
      }
    );

    const entityHref = new URL(result.entityHref, 'https://example.com');
    expect(entityHref.pathname).toBe('/entities/42');
    expect(entityHref.searchParams.get('entityId')).toBe('42');
    expect(entityHref.searchParams.get('entityName')).toBe('HertzBeat self-monitoring');
    expect(entityHref.searchParams.get('serviceName')).toBe('HertzBeat');
    expect(entityHref.searchParams.get('environment')).toBe('prod');
    expect(entityHref.searchParams.get('collector')).toBe('collector-local');
    expect(entityHref.searchParams.get('template')).toBe('hertzbeat-self');

    const metricsParams = new URL(result.metricsHref, 'https://example.com').searchParams;
    expect(metricsParams.get('entityId')).toBe('42');
    expect(metricsParams.get('entityName')).toBe('HertzBeat self-monitoring');
    expect(metricsParams.get('collector')).toBe('collector-local');
    expect(metricsParams.get('template')).toBe('hertzbeat-self');
  });

  it('can override trace and metrics return paths with the current log workspace route', () => {
    const currentLogReturnTo =
      `/log/manage?traceId=trace-1&spanId=span-1&view=stream&start=1709999100000&end=1710000060000&returnTo=%2Foverview&returnLabel=${encodeURIComponent(t('menu.log.manage'))}`;
    const result = buildLogHandoffLinks(
      {
        traceId: 'trace-1',
        spanId: 'span-1',
        timeUnixNano: 1_710_000_000_000_000_000,
        resource: { 'service.name': 'checkout', 'service.namespace': 'payments' }
      } as any,
      {
        entityId: '7',
        entityName: 'Checkout API',
        returnTo: '/overview',
        environment: 'prod'
      },
      {
        traceReturnTo: currentLogReturnTo,
        metricsReturnTo: currentLogReturnTo,
        traceReturnLabel: t('menu.trace.manage'),
        intakeReturnLabel: t('log.manage.route.action.intake')
      }
    );

    const intakeParams = new URL(result.intakeHref, 'https://example.com').searchParams;
    expect(intakeParams.get('returnLabel')).toBeNull();

    const traceParams = new URL(result.traceHref, 'https://example.com').searchParams;
    expect(traceParams.get('returnTo')).toBe(
      '/log/manage?traceId=trace-1&spanId=span-1&view=stream&start=1709999100000&end=1710000060000&returnTo=%2Foverview'
    );
    expect(traceParams.get('returnLabel')).toBeNull();

    const metricsParams = new URL(result.metricsHref, 'https://example.com').searchParams;
    expect(metricsParams.get('returnTo')).toBe(
      '/log/manage?traceId=trace-1&spanId=span-1&view=stream&start=1709999100000&end=1710000060000&returnTo=%2Foverview'
    );
    expect(metricsParams.get('returnLabel')).toBeNull();
  });

  it('keeps log-to-trace handoff time windows as integer milliseconds', () => {
    const result = buildLogHandoffLinks({
      traceId: 'd7929ee1f228c6b7260c0d474f2f5e05',
      spanId: 'c940851ebb7bb449',
      timeUnixNano: 1_777_485_796_189_989_000,
      resource: { 'service.name': 'HertzBeat' }
    } as any);

    const traceParams = new URL(result.traceHref, 'https://example.com').searchParams;

    expect(traceParams.get('start')).toBe('1777484896189');
    expect(traceParams.get('end')).toBe('1777485856189');
    expect(traceParams.get('start')).not.toContain('.');
    expect(traceParams.get('end')).not.toContain('.');
  });

  it('builds code navigation urls from selected log and base hint', () => {
    expect(
      buildLogCodeNavigationUrl(
        {
          resource: { 'service.name': 'checkout' },
          attributes: { 'code.function': 'handlePayment', 'code.filepath': 'web-next/app/log/manage/page.tsx' }
        } as any,
        {
          repositoryUrl: 'https://github.com/apache/hertzbeat',
          provider: 'github',
          defaultPath: 'web-next',
          searchQuery: 'fallback'
        }
      )
    ).toBe('https://github.com/apache/hertzbeat/search?q=path%3Aweb-next%2Fapp%2Flog%2Fmanage%2Fpage.tsx%20handlePayment&type=code');
  });
});
