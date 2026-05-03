import { describe, expect, it } from 'vitest';
import {
  buildCollectionSourceRows,
  buildCurrentAlertRows,
  buildDetailFacts,
  buildDrilldownRows,
  buildEntityAttributionRows,
  buildEntityContextHandoffLinks,
  buildEntityHealthModel,
  buildEntityIncomingContextRows,
  buildNextActionRows,
  buildOverviewRows,
  buildRelationshipRows,
  buildSummaryRows
} from './view-model';

describe('entity detail view model', () => {
  it('builds detail facts from entity', () => {
    expect(
      buildDetailFacts({ id: 123, type: 'service', status: 'unknown', owner: 'ops' } as any)
    ).toEqual([
      { label: '实体 ID', value: '123' },
      { label: '类型', value: 'service' },
      { label: '状态', value: '未知' },
      { label: '负责人', value: 'ops' }
    ]);
  });

  it('builds overview rows', () => {
    expect(
      buildOverviewRows(
        {
          description: 'checkout service',
          system: 'payments',
          owner: 'platform',
          environment: 'prod',
          status: 'healthy',
          type: 'service'
        } as any,
        {} as any
      )
    ).toEqual([
      { title: '状态', copy: '健康', meta: 'service' },
      { title: '负责人', copy: 'platform', meta: 'payments' },
      { title: '环境', copy: 'prod', meta: '-' },
      { title: '描述', copy: 'checkout service', meta: '-' }
    ]);
  });

  it('builds related signal summary rows', () => {
    expect(
      buildSummaryRows({
        evidenceSummary: { downMonitorCount: 1 },
        monitorSummary: { totalBoundMonitors: 2 },
        logSummary: { hintCount: 3, preferredQueryTitle: 'checkout errors' },
        traceSummary: { recentTraceCount: 4, recentErrorTraceCount: 1 }
      } as any)
    ).toEqual([
      { title: '关联指标', copy: '2 个绑定监控', meta: '1 个异常监控' },
      { title: '关联日志', copy: '3 条查询线索可用', meta: 'checkout errors' },
      { title: '关联链路', copy: '4 条近期链路', meta: '1 条错误链路' }
    ]);
  });

  it('builds the lightweight HertzBeat service health model without heavy SLO authoring', () => {
    expect(
      buildEntityHealthModel({
        entity: {
          entity: {
            id: 42,
            name: 'checkout-api',
            environment: 'prod'
          }
        },
        evidenceSummary: {
          collectorOfflineCount: 1,
          collectorOnlineCount: 1,
          collectorTaskCount: 11,
          collectorTotalCount: 2,
          collectorLastSeenAt: '2026-04-10 18:05:00',
          downMonitorCount: 1,
          healthyMonitorCount: 1,
          logHintCount: 3
        },
        alertSummary: {
          totalActiveAlerts: 1
        },
        monitorSummary: {
          totalBoundMonitors: 2
        },
        logSummary: {
          hintCount: 3
        },
        traceSummary: {
          recentTraceCount: 4,
          recentErrorTraceCount: 1
        }
      } as any)
    ).toEqual([
      { title: '健康评分', copy: '66 / 100', meta: '轻量健康模型' },
      { title: '可用性', copy: '50%', meta: '1 / 2 监控健康' },
      { title: '错误率', copy: '25%', meta: '1 / 4 错误链路' },
      { title: '延迟', copy: '暂无链路延迟', meta: '等待 OTLP Span' },
      { title: '当前告警', copy: '1 个活跃告警', meta: '告警闭环' },
      { title: '最近异常', copy: '5 个异常线索', meta: '监控 1 · 链路 1 · 日志 3' },
      {
        title: '采集健康',
        copy: '采集器 1 / 2 在线',
        meta: '任务 11 · 离线 1',
        freshness: '最近上报 2026-04-10 18:05:00',
        href: '/setting/collector?entityId=42&serviceName=checkout-api&environment=prod&timeRange=last-1h'
      }
    ]);
  });

  it('builds next action rows from server guidance when available', () => {
    expect(
      buildNextActionRows(
        {
          nextActions: [
            {
              title: 'Open monitors',
              summary: 'Inspect the abnormal monitors first.',
              actionLabel: 'Open monitors'
            },
            {
              title: 'Open discovery',
              summary: 'Add more evidence before triage.',
              actionLabel: 'Open discovery'
            }
          ]
        } as any,
        '123'
      )
    ).toEqual([
      { title: '打开监控', copy: '先检查异常监控。', meta: '打开监控' },
      { title: '打开发现', copy: '先补充更多证据。', meta: '打开发现' }
    ]);
  });

  it('builds drilldown rows', () => {
    expect(buildDrilldownRows('123')).toEqual([
      { title: '定义工作台', copy: '/entities/123/definition', meta: '下一步路由' },
      { title: '编辑实体', copy: '/entities/123/edit', meta: '下一步路由' },
      { title: '遥测发现', copy: '/entities/discovery', meta: '共享路由' }
    ]);
  });

  it('builds entity context handoff links with unified entity, service, environment, time, trace, and span context', () => {
    expect(
      buildEntityContextHandoffLinks(
        {
          entity: {
            entity: {
              id: 42,
              name: 'checkout',
              displayName: 'Checkout',
              environment: 'prod'
            }
          },
          traceSummary: {
            latestTraceId: 'trace-123',
            latestSpanId: 'span-456'
          }
        } as any,
        'last-30m'
      )
    ).toEqual([
      {
        key: 'metrics',
        title: '关联指标',
        copy: '/ingestion/otlp/metrics?entityId=42&serviceName=checkout&environment=prod&timeRange=last-30m',
        meta: '指标工作台'
      },
      {
        key: 'logs',
        title: '关联日志',
        copy: '/log/manage?entityId=42&serviceName=checkout&environment=prod&timeRange=last-30m&traceId=trace-123&spanId=span-456',
        meta: '日志工作台'
      },
      {
        key: 'traces',
        title: '关联链路',
        copy: '/trace/manage?entityId=42&serviceName=checkout&environment=prod&timeRange=last-30m&traceId=trace-123&spanId=span-456',
        meta: '链路工作台'
      },
      {
        key: 'alerts',
        title: '告警规则',
        copy: '/alert/setting?entityId=42&serviceName=checkout&environment=prod&timeRange=last-30m',
        meta: '阈值规则'
      },
      {
        key: 'monitors',
        title: '绑定监控',
        copy: '/monitors?entityId=42&entityName=Checkout&serviceName=checkout&environment=prod&timeRange=last-30m&returnTo=%2Fentities%2F42',
        meta: '监控对象'
      },
      {
        key: 'topology',
        title: '上下游拓扑',
        copy: '/topology?entityId=42&serviceName=checkout&environment=prod&timeRange=last-30m',
        meta: '关系图'
      },
      {
        key: 'template',
        title: '模板绑定',
        copy: '/entities/42/definition?entityId=42&serviceName=checkout&environment=prod&timeRange=last-30m',
        meta: '监控模板'
      }
    ]);
  });

  it('preserves inherited absolute time, refresh, pause, timezone, and monitor context from entity handoffs', () => {
    const links = buildEntityContextHandoffLinks(
      {
        entity: {
          entity: {
            id: 42,
            name: 'checkout',
            displayName: 'Checkout',
            environment: 'prod'
          }
        },
        traceSummary: {
          latestTraceId: 'trace-summary',
          latestSpanId: 'span-summary'
        }
      } as any,
      {
        timeRange: 'last-45m',
        serviceName: 'checkout-route',
        serviceNamespace: 'commerce',
        environment: 'staging',
        start: '1713200000000',
        end: '1713202700000',
        refresh: '30',
        live: 'false',
        tz: 'Asia/Shanghai',
        source: 'monitor',
        monitorId: '632051474676992',
        monitorName: 'checkout-http',
        monitorApp: 'website',
        monitorInstance: 'example.com:443',
        traceId: 'trace-123',
        spanId: 'span-456'
      }
    );

    links.forEach(link => {
      const params = new URL(link.copy, 'http://localhost').searchParams;

      expect(params.get('timeRange')).toBe('last-45m');
      expect(params.get('serviceName')).toBe('checkout-route');
      expect(params.get('serviceNamespace')).toBe('commerce');
      expect(params.get('environment')).toBe('staging');
      expect(params.get('start')).toBe('1713200000000');
      expect(params.get('end')).toBe('1713202700000');
      expect(params.get('refresh')).toBe('30');
      expect(params.get('live')).toBe('false');
      expect(params.get('tz')).toBe('Asia/Shanghai');
      expect(params.get('source')).toBe('monitor');
      expect(params.get('monitorId')).toBe('632051474676992');
      expect(params.get('monitorName')).toBe('checkout-http');
      expect(params.get('monitorApp')).toBe('website');
      expect(params.get('monitorInstance')).toBe('example.com:443');
    });

    expect(new URL(links.find(link => link.key === 'logs')?.copy || '/', 'http://localhost').searchParams.get('traceId')).toBe('trace-123');
    expect(new URL(links.find(link => link.key === 'traces')?.copy || '/', 'http://localhost').searchParams.get('spanId')).toBe('span-456');
  });

  it('builds compact visible inherited context rows for entity detail evidence entry', () => {
    expect(
      buildEntityIncomingContextRows({
        timeRange: 'last-45m',
        start: '1713200000000',
        end: '1713202700000',
        refresh: '30',
        live: 'false',
        tz: 'Asia/Shanghai',
        serviceName: 'checkout-api',
        environment: 'prod',
        source: 'monitor',
        monitorId: '632051474676992',
        monitorName: 'checkout-http',
        monitorApp: 'website',
        monitorInstance: 'example.com:443'
      })
    ).toEqual([
      { label: '监控实例', value: 'checkout-http', meta: 'website · example.com:443 · monitorId 632051474676992' },
      { label: '当前服务', value: 'checkout-api', meta: '服务上下文' },
      { label: '当前环境', value: 'prod', meta: '环境' },
      {
        label: '时间范围',
        value: 'last-45m',
        meta: '2024/04/16 00:53:20 → 2024/04/16 01:38:20 · 刷新 30s · 已暂停 · Asia/Shanghai'
      },
      { label: '采集来源', value: '传统监控', meta: '监控中心上下文' }
    ]);
    expect(buildEntityIncomingContextRows({})).toEqual([]);
  });

  it('builds current alerts, relationships, and source/template rows for the context center', () => {
    const detail = {
      entity: {
        entity: {
          source: 'otlp',
          labels: { 'k8s.namespace.name': 'prod' }
        },
        identities: [{ key: 'service.name', value: 'checkout' }],
        monitorBinds: [{ templateName: 'spring-boot', monitorId: 7 }],
        relations: [
          { type: 'calls', targetEntityId: 'mysql-1', targetEntityName: 'mysql-prod' },
          { relationType: 'owned-by', targetEntityName: 'payment-app' }
        ]
      },
      activeAlerts: [
        { id: 1, status: 'firing', content: 'error rate high', labels: { severity: 'critical' } }
      ],
      alertSummary: {
        totalActiveAlerts: 1
      }
    } as any;

    expect(buildCurrentAlertRows(detail)).toEqual([
      { title: '当前告警 #1', copy: 'error rate high', meta: 'firing · severity=critical' }
    ]);
    expect(buildRelationshipRows(detail)).toEqual([
      { title: 'calls', copy: 'mysql-prod', meta: 'mysql-1' },
      { title: 'owned-by', copy: 'payment-app', meta: '上下游关系' }
    ]);
    expect(buildCollectionSourceRows(detail)).toEqual([
      { title: '采集来源', copy: 'otlp', meta: '实体来源' },
      { title: '身份标识', copy: '1 个身份', meta: 'service.name=checkout' },
      { title: '模板绑定', copy: '1 个绑定', meta: 'spring-boot' },
      { title: '标签', copy: '1 个标签', meta: 'k8s.namespace.name=prod' }
    ]);
  });

  it('builds entity attribution rows across traditional monitoring and OTLP evidence', () => {
    const detail = {
      entity: {
        entity: {
          id: 42,
          name: 'checkout-api',
          displayName: 'Checkout API',
          source: 'otlp'
        },
        identities: [
          { key: 'service.name', value: 'checkout' },
          { key: 'hertzbeat.entity_id', value: '42' }
        ],
        monitorBinds: [{ templateName: 'spring-boot', monitorId: 7 }],
        relations: [{ type: 'calls', targetEntityName: 'mysql-prod' }]
      }
    } as any;

    expect(buildEntityAttributionRows(detail)).toEqual([
      { key: 'traditional-monitor', state: 'ready', title: '传统监控绑定', copy: '1 个绑定', meta: 'spring-boot' },
      { key: 'otlp-attribution', state: 'ready', title: 'OTLP 归因', copy: '2 个身份', meta: 'service.name=checkout' },
      { key: 'candidate-confirmation', state: 'ready', title: '候选确认', copy: '已归入实体', meta: 'Checkout API' },
      { key: 'missing-diagnostics', state: 'ready', title: '归因诊断', copy: '归因证据完整', meta: '可进入对象详情' }
    ]);
  });

  it('builds missing attribution diagnostics before an entity can become a clean resource catalog entry', () => {
    expect(
      buildEntityAttributionRows({
        entity: {
          entity: {
            id: 99,
            name: 'unknown-service',
            source: 'otlp'
          },
          identities: [],
          monitorBinds: [],
          relations: []
        }
      } as any)
    ).toEqual([
      { key: 'traditional-monitor', state: 'missing', title: '传统监控绑定', copy: '0 个绑定', meta: '等待监控模板' },
      { key: 'otlp-attribution', state: 'missing', title: 'OTLP 归因', copy: '缺少身份', meta: '等待 hertzbeat.entity_id 或 service.name' },
      { key: 'candidate-confirmation', state: 'review', title: '候选确认', copy: '待确认', meta: '进入遥测发现确认候选' },
      { key: 'missing-diagnostics', state: 'missing', title: '归因诊断', copy: '需要补齐归因', meta: '缺少身份标识、监控绑定' }
    ]);
  });
});
