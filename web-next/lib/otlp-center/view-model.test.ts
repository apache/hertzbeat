import { describe, expect, it, vi } from 'vitest';
import {
  buildBindingRows,
  buildCollectionLoopLinks,
  buildGuideAuthRows,
  buildGuideRows,
  buildProtocolOptions,
  buildReadinessRows,
  buildSelfCheckRows,
  buildSignalRows,
  buildUnboundCandidateRows,
  filterGuideRowsByProtocol,
  filterGuideSnippetsByProtocol
} from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock();

describe('otlp center view model', () => {
  it('builds signal rows', () => {
    expect(
      buildSignalRows(
        [
          { signal: 'logs', active: true, summary: 'healthy', intakeMode: 'push', totalCount: 3 }
        ] as any,
        t
      )
    ).toEqual([
      { title: 'LOGS · Active', copy: 'healthy', meta: 'push · 3' }
    ]);
  });

  it('builds guide rows', () => {
    expect(
      buildGuideRows([
        { signal: 'metrics', protocol: 'http', summary: 'send metrics', endpoint: '/v1/metrics' }
      ] as any)
    ).toEqual([
      { title: 'metrics · http', copy: 'send metrics', meta: '/v1/metrics' }
    ]);
  });

  it('resolves fallback guide summary keys through i18n', () => {
    expect(
      buildGuideRows(
        [
          {
            signal: 'metrics',
            protocol: 'http',
            summary: 'otlp.guide.fallback.metrics.summary',
            endpoint: '/v1/metrics'
          }
        ] as any,
        ((key: string) => (key === 'otlp.guide.fallback.metrics.summary' ? 'Translated metrics guide' : key)) as any
      )
    ).toEqual([
      { title: 'metrics · http', copy: 'Translated metrics guide', meta: '/v1/metrics' }
    ]);
  });

  it('builds binding rows', () => {
    expect(
      buildBindingRows([
        { entityId: 1, displayName: 'checkout', primaryIdentityKey: 'service.name', primaryIdentityValue: 'checkout', monitorBindCount: 2 }
      ] as any)
    ).toEqual([
      { title: 'checkout', copy: 'service.name = checkout', meta: 'binds 2' }
    ]);
  });

  it('builds OTLP unbound entity candidate rows from telemetry identity without inventing entity health', () => {
    const rows = buildUnboundCandidateRows([
      {
        suggestedName: 'checkout',
        suggestedType: 'service',
        namespace: 'commerce',
        environment: 'prod',
        primaryIdentityKey: 'service.name',
        primaryIdentityValue: 'checkout',
        signals: ['logs', 'metrics'],
        canonicalIdentities: {
          'service.name': 'checkout',
          'service.namespace': 'commerce',
          'deployment.environment.name': 'prod'
        },
        latestObservedAt: 1775834700000
      }
    ] as any);

    expect(rows).toEqual([
      {
        key: 'service.name:checkout:commerce:prod',
        title: 'checkout',
        copy: 'service.name = checkout',
        meta: 'commerce · prod · logs, metrics',
        href: '/entities/discovery?identityKey=service.name&identityValue=checkout&serviceName=checkout&serviceNamespace=commerce&environment=prod',
        signals: ['logs', 'metrics'],
        canonicalIdentitySummary: 'service.name=checkout;service.namespace=commerce;deployment.environment.name=prod'
      }
    ]);
    expect(JSON.stringify(rows)).not.toContain('healthy');
    expect(JSON.stringify(rows)).not.toContain('entityId');
  });

  it('builds OTLP readiness rows through i18n from overview fields returned by the backend today', () => {
    const rows = buildReadinessRows(
      {
        metrics: { signal: 'metrics', active: true, totalCount: 12 },
        logs: { signal: 'logs', active: true, totalCount: 9 },
        traces: { signal: 'traces', active: false, totalCount: 0 },
        activeSignalCount: 2,
        latestObservedAt: 1775834700000,
        recentServiceCount: 4,
        boundEntityCount: 3,
        recentEvents: []
      } as any,
      {
        recentBoundEntities: [
          { entityId: 1, name: 'checkout', monitorBindCount: 1 }
        ]
      } as any,
      () => '2026/04/10 18:05:00',
      createTranslatorMock({
        overrides: {
          'otlp.readiness.signals.title': 'Signals connected',
          'otlp.readiness.signals.copy': '{{active}} / {{total}} active',
          'otlp.readiness.latest.title': 'Latest report',
          'otlp.readiness.latest.received': 'Telemetry received',
          'otlp.readiness.entity.title': 'Entity attribution',
          'otlp.readiness.entity.copy': '{{count}} entities',
          'otlp.readiness.entity.meta': 'Object catalog',
          'otlp.readiness.discovery.title': 'Service discovery',
          'otlp.readiness.discovery.copy': '{{count}} services',
          'otlp.readiness.discovery.meta': 'Last 24 hours'
        }
      })
    );

    expect(rows).toEqual([
      { key: 'signals', title: 'Signals connected', copy: '2 / 3 active', meta: 'Metrics 12 · Logs 9 · Traces 0', tone: 'success' },
      { key: 'latest-report', title: 'Latest report', copy: '2026/04/10 18:05:00', meta: 'Telemetry received', tone: 'neutral' },
      { key: 'entity-binding', title: 'Entity attribution', copy: '3 entities', meta: 'Object catalog', tone: 'success' },
      { key: 'service-discovery', title: 'Service discovery', copy: '4 services', meta: 'Last 24 hours', tone: 'success' }
    ]);
    expect(rows.map(row => row.key)).not.toEqual(expect.arrayContaining([
      'dropped',
      'parse-failures',
      'entity-merge-failures',
      'template-binding',
      'collector-nodes'
    ]));
  });

  it('builds backend-backed self-check rows for collector storage query and Greptime status', () => {
    expect(
      buildSelfCheckRows([
        { key: 'collector', title: 'Collector 集群', status: 'warning', summary: '2 / 3 在线', detail: '1 个采集节点离线', checkedAt: 1775834700000 },
        { key: 'storage', title: '历史存储', status: 'success', summary: '1 / 1 可用', detail: 'HistoryDataReader 可用', checkedAt: 1775834700000 },
        { key: 'query', title: '查询服务', status: 'success', summary: '指标、日志和链路查询可用', detail: 'PromQL 与历史查询可用', checkedAt: 1775834700000 },
        { key: 'greptime', title: 'GreptimeDB', status: 'success', summary: 'SQL 自检通过', detail: 'SELECT 1 成功', checkedAt: 1775834700000 }
      ] as any)
    ).toEqual([
      { key: 'collector', title: 'Collector 集群', copy: '2 / 3 在线', meta: '1 个采集节点离线', tone: 'warning' },
      { key: 'storage', title: '历史存储', copy: '1 / 1 可用', meta: 'HistoryDataReader 可用', tone: 'success' },
      { key: 'query', title: '查询服务', copy: '指标、日志和链路查询可用', meta: 'PromQL 与历史查询可用', tone: 'success' },
      { key: 'greptime', title: 'GreptimeDB', copy: 'SQL 自检通过', meta: 'SELECT 1 成功', tone: 'success' }
    ]);
  });

  it('builds the existing HertzBeat collection loop through i18n without future-only app entries', () => {
    const links = buildCollectionLoopLinks(
      createTranslatorMock({
        overrides: {
          'otlp.collection-loop.otlp-intake.title': 'OTLP signal intake',
          'otlp.collection-loop.otlp-intake.copy': 'Connect OpenTelemetry signals and keep drilldowns available.',
          'otlp.collection-loop.otlp-intake.meta': 'Signals',
          'otlp.collection-loop.traditional-monitoring.title': 'Traditional monitors',
          'otlp.collection-loop.traditional-monitoring.copy': 'Keep host and database monitors in the same operations loop.',
          'otlp.collection-loop.traditional-monitoring.meta': 'Resources',
          'otlp.collection-loop.collector-cluster.title': 'Collector cluster',
          'otlp.collection-loop.collector-cluster.copy': 'Manage collection nodes and dispatch status.',
          'otlp.collection-loop.collector-cluster.meta': 'Collector',
          'otlp.collection-loop.monitoring-template.title': 'Monitor templates',
          'otlp.collection-loop.monitoring-template.copy': 'Maintain templates that map traditional monitors and OTLP entities.',
          'otlp.collection-loop.monitoring-template.meta': 'Templates',
          'otlp.collection-loop.service-discovery.title': 'Service discovery',
          'otlp.collection-loop.service-discovery.copy': 'Confirm discovered services and telemetry identities.',
          'otlp.collection-loop.service-discovery.meta': 'Discovery',
          'otlp.collection-loop.object-directory.title': 'Object catalog',
          'otlp.collection-loop.object-directory.copy': 'Review resources, signals, topology, and alert context around entities.',
          'otlp.collection-loop.object-directory.meta': 'Entities'
        }
      })
    );

    expect(links.map(link => [link.key, link.href])).toEqual([
      ['otlp-intake', '/ingestion/otlp'],
      ['traditional-monitoring', '/monitors'],
      ['collector-cluster', '/setting/collector'],
      ['monitoring-template', '/setting/define'],
      ['service-discovery', '/entities/discovery'],
      ['object-directory', '/entities']
    ]);
    expect(links.map(link => link.title)).toEqual([
      'OTLP signal intake',
      'Traditional monitors',
      'Collector cluster',
      'Monitor templates',
      'Service discovery',
      'Object catalog'
    ]);
    expect(JSON.stringify(links)).not.toMatch(/[\u4e00-\u9fff]/);
    expect(links.map(link => link.href)).not.toEqual(expect.arrayContaining([
      '/observability-pipelines',
      '/pipelines',
      '/fleet',
      '/private-log-pipelines'
    ]));
  });

  it('builds protocol options and auth rows', () => {
    expect(buildProtocolOptions({ httpProtocolLabel: 'HTTP/JSON', grpcProtocolLabel: 'gRPC' } as any, t)).toEqual([
      { key: 'http', label: 'HTTP/JSON' },
      { key: 'grpc', label: 'gRPC' }
    ]);

    expect(
      buildGuideAuthRows(
        { authHeaderName: 'Authorization', authHeaderExample: 'Bearer <token>', grpcAuthorityExample: 'otlp.example.internal' } as any,
        t
      )
    ).toEqual([
      { title: 'Auth header', copy: 'Authorization · Bearer <token>', meta: 'auth' },
      { title: 'gRPC authority', copy: 'otlp.example.internal', meta: 'grpc' }
    ]);
  });

  it('filters guide rows and snippets by active protocol', () => {
    expect(
      filterGuideRowsByProtocol(
        [
          { signal: 'metrics', protocol: 'http', summary: 'send metrics', endpoint: '/v1/metrics' },
          { signal: 'traces', protocol: 'grpc', summary: 'send traces', endpoint: '/v1/traces' }
        ] as any,
        'http'
      )
    ).toEqual([
      { title: 'metrics · http', copy: 'send metrics', meta: '/v1/metrics' }
    ]);

    expect(
      filterGuideSnippetsByProtocol(
        [
          { key: 'http', protocol: 'http', title: 'HTTP sample', content: 'curl ...' },
          { key: 'grpc', protocol: 'grpc', title: 'gRPC sample', content: 'otel ...' }
        ] as any,
        'grpc'
      )
    ).toEqual([
      { key: 'grpc', protocol: 'grpc', title: 'gRPC sample', content: 'otel ...' }
    ]);
  });
});
