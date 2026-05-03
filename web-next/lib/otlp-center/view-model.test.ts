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

  it('builds binding rows', () => {
    expect(
      buildBindingRows([
        { entityId: 1, displayName: 'checkout', primaryIdentityKey: 'service.name', primaryIdentityValue: 'checkout', monitorBindCount: 2 }
      ] as any)
    ).toEqual([
      { title: 'checkout', copy: 'service.name = checkout', meta: 'binds 2' }
    ]);
  });

  it('builds OTLP readiness rows only from overview fields returned by the backend today', () => {
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
      () => '2026/04/10 18:05:00'
    );

    expect(rows).toEqual([
      { key: 'signals', title: '三信号接入', copy: '2 / 3 活跃', meta: 'Metrics 12 · Logs 9 · Traces 0', tone: 'success' },
      { key: 'latest-report', title: '最近上报', copy: '2026/04/10 18:05:00', meta: '已收到遥测', tone: 'neutral' },
      { key: 'entity-binding', title: '实体归因', copy: '3 个实体', meta: '对象目录', tone: 'success' },
      { key: 'service-discovery', title: '服务发现', copy: '4 个服务', meta: '最近 24 小时', tone: 'success' }
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

  it('builds the existing HertzBeat collection loop without future-only app entries', () => {
    const links = buildCollectionLoopLinks();

    expect(links.map(link => [link.key, link.href])).toEqual([
      ['otlp-intake', '/ingestion/otlp'],
      ['traditional-monitoring', '/monitors'],
      ['collector-cluster', '/setting/collector'],
      ['monitoring-template', '/setting/define'],
      ['service-discovery', '/entities/discovery'],
      ['object-directory', '/entities']
    ]);
    expect(links.map(link => link.title)).toEqual([
      'OTLP 三信号接入',
      '传统监控资源',
      '采集器集群',
      '监控模板',
      '服务发现',
      '对象目录'
    ]);
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
