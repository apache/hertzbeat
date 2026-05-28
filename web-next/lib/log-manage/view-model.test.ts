import { describe, expect, it, vi } from 'vitest';
import {
  buildLogCodeNavigationUrl,
  buildLogAttributionDiagnostics,
  buildLogExplorerRows,
  buildLogHandoffLinks,
  buildRelatedTraceRowCopy,
  buildSelectedLogFacts,
  buildSelectedLogRows,
  buildTrendRows
} from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });
const enT = createTranslatorMock({ locale: 'en-US' });

describe('log view model', () => {
  it('builds trend rows from hourly stats', () => {
    expect(buildTrendRows({ '10:00': 2, '11:00': 5 }, t)).toEqual([
      { title: '10:00', copy: '日志 2', meta: '趋势' },
      { title: '11:00', copy: '日志 5', meta: '趋势' }
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
      { title: '资源字段', copy: '1', meta: '日志属性 1' },
      { title: '跨度与级别', copy: 'span123 · ERROR', meta: '2026-04-10 10:00:00' },
      { title: '链路 ID', copy: 'abc123', meta: 'trace' },
      { title: '跨度 ID', copy: 'span123', meta: 'span' }
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
        meta: '用于定位一次日志接入事件'
      },
      {
        key: 'hertzbeat.ingest_id',
        label: 'hertzbeat.ingest_id',
        value: 'ingest-1',
        state: 'present',
        meta: '用于排查接入批次'
      },
      {
        key: 'hertzbeat.entity_id',
        label: 'hertzbeat.entity_id',
        value: '-',
        state: 'missing',
        meta: '缺少实体 ID，实体详情会保持禁用'
      },
      {
        key: 'hertzbeat.entity_name',
        label: 'hertzbeat.entity_name',
        value: '-',
        state: 'missing',
        meta: '缺少实体名称时使用服务名辅助检索'
      },
      {
        key: 'hertzbeat.workspace_id',
        label: 'hertzbeat.workspace_id',
        value: '-',
        state: 'missing',
        meta: '缺少工作区字段时使用当前部署上下文'
      },
      {
        key: 'hertzbeat.collector',
        label: 'hertzbeat.collector',
        value: 'collector-local',
        state: 'present',
        meta: '采集器来源'
      },
      {
        key: 'hertzbeat.template',
        label: 'hertzbeat.template',
        value: 'hertzbeat-self',
        state: 'present',
        meta: '监控模板归属'
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
    expect(alertParams.get('entityId')).toBe('7');
    expect(alertParams.get('serviceName')).toBe('checkout');
    expect(alertParams.get('environment')).toBe('prod');
    expect(alertParams.get('timeRange')).toBe('last-1h');
    expect(alertParams.get('source')).toBe('otlp');

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
          'hertzbeat.entity_name': 'HertzBeat 自监控',
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
    expect(entityHref.searchParams.get('entityName')).toBe('HertzBeat 自监控');
    expect(entityHref.searchParams.get('serviceName')).toBe('HertzBeat');
    expect(entityHref.searchParams.get('environment')).toBe('prod');
    expect(entityHref.searchParams.get('collector')).toBe('collector-local');
    expect(entityHref.searchParams.get('template')).toBe('hertzbeat-self');

    const metricsParams = new URL(result.metricsHref, 'https://example.com').searchParams;
    expect(metricsParams.get('entityId')).toBe('42');
    expect(metricsParams.get('entityName')).toBe('HertzBeat 自监控');
    expect(metricsParams.get('collector')).toBe('collector-local');
    expect(metricsParams.get('template')).toBe('hertzbeat-self');
  });

  it('can override the trace return path with the current log workspace route', () => {
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
        traceReturnTo:
          '/log/manage?traceId=trace-1&spanId=span-1&view=stream&start=1709999100000&end=1710000060000&returnTo=%2Foverview&returnLabel=日志工作台',
        traceReturnLabel: '链路工作台',
        intakeReturnLabel: '日志接入'
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
    expect(metricsParams.get('returnTo')).toBe('/overview');
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
