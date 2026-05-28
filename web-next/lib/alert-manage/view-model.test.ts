import { describe, expect, it, vi } from 'vitest';
import type { AlertSummary, PageResult, SingleAlert } from '@/lib/types';
import {
  buildAlertEntityContextSummary,
  buildAlertEvidenceContextRows,
  buildAlertClosureOperationFailureFeedback,
  buildAlertClosureOperationFeedback,
  buildAlertEvidenceClosureRows,
  buildAlertClosureOperationRows,
  buildAlertGroupActionLabels,
  buildAlertGroupCards,
  buildAlertMetrics,
  buildAlertEventClosureReview,
  buildAlertRuleQuickDialogModel,
  buildAlertRuleWorkspaceHref,
  buildAlertNoiseControlManageHref,
  buildAlertNoiseControlSummary,
  clearAlertInhibitEqualLabels,
  clearAlertInhibitTarget,
  copyAlertInhibitSourceToTarget,
  dropSeverityFromAlertInhibitTarget,
  buildSelectedAlertRows,
  buildAlertRows
} from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('alert view model', () => {
  it('builds alert metric cards from summary counts', () => {
    const summary: AlertSummary = {
      total: 9,
      dealNum: 5,
      rate: 55,
      priorityWarningNum: 4,
      priorityCriticalNum: 3,
      priorityEmergencyNum: 1
    };

    expect(buildAlertMetrics(summary, t)).toEqual([
      { label: '警告', value: '4', tone: 'warning' },
      { label: '严重', value: '3', tone: 'danger' },
      { label: '紧急', value: '1', tone: 'danger' }
    ]);
  });

  it('builds evidence list rows from alert page content', () => {
    const rows = buildAlertRows(
      {
        content: [
          {
            id: 7,
            content: 'CPU high',
            labels: { service: 'checkout', severity: 'critical' },
            status: 'firing',
            gmtUpdate: 1712730000000
          }
        ],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 8
      } as unknown as PageResult<SingleAlert>,
      t,
      alert => (alert.labels?.severity || '').toUpperCase() || '告警',
      status => (status === 'firing' ? '触发中' : '-'),
      () => '2026-04-10 18:00:00',
      '默认告警'
    );

    expect(rows).toEqual([
      {
        key: '7',
        title: 'CPU high',
        copy: 'checkout · 触发中',
        meta: 'CRITICAL · 2026-04-10 18:00:00'
      }
    ]);
  });

  it('renders missing alert row identity facts with the localized empty fallback', () => {
    const rows = buildAlertRows(
      {
        content: [
          {
            id: 8,
            content: 'Disk high',
            labels: {},
            status: 'firing',
            gmtUpdate: 1712730000000
          }
        ],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 8
      } as unknown as PageResult<SingleAlert>,
      t,
      alert => (alert.labels?.severity || '').toUpperCase() || '告警',
      status => (status === 'firing' ? '触发中' : '-'),
      () => '2026-04-10 18:00:00',
      '默认告警'
    );

    expect(rows).toEqual([
      {
        key: '8',
        title: 'Disk high',
        copy: '无 · 触发中',
        meta: '告警 · 2026-04-10 18:00:00'
      }
    ]);
  });

  it('builds selected alert summary rows', () => {
    expect(
      buildSelectedAlertRows(
        {
          id: 7,
          content: 'CPU high',
          fingerprint: 'fp-1',
          creator: 'ops',
          labels: { service: 'checkout', severity: 'critical' },
          status: 'firing',
          triggerTimes: 3,
          startAt: 1712730000000,
          gmtUpdate: 1712730300000
        } as SingleAlert,
        t,
        alert => (alert.labels?.severity || '').toUpperCase() || '告警',
        status => (status === 'firing' ? '触发中' : '-'),
        () => '2026-04-10 18:00:00',
        '默认告警'
      )
    ).toEqual([
      {
        title: 'CPU high',
        copy: 'checkout · 触发中',
        meta: 'CRITICAL'
      },
      {
        title: '指纹 / 创建者',
        copy: 'fp-1 · ops',
        meta: '更新时间 2026-04-10 18:00:00'
      },
      {
        title: '触发 / 活跃窗口',
        copy: '3 次触发 · 2026-04-10 18:00:00',
        meta: '结束 2026-04-10 18:00:00'
      }
    ]);
  });

  it('renders missing selected alert fingerprint facts with the localized empty fallback', () => {
    expect(
      buildSelectedAlertRows(
        {
          id: 8,
          content: 'Disk high',
          fingerprint: ' ',
          creator: '',
          labels: {},
          status: 'firing',
          triggerTimes: 1,
          startAt: 1712730000000,
          gmtUpdate: 1712730300000
        } as SingleAlert,
        t,
        alert => (alert.labels?.severity || '').toUpperCase() || '告警',
        status => (status === 'firing' ? '触发中' : '-'),
        () => '2026-04-10 18:00:00',
        '默认告警'
      )
    ).toEqual([
      {
        title: 'Disk high',
        copy: '无 · 触发中',
        meta: '告警'
      },
      {
        title: '指纹 / 创建者',
        copy: '无 · 无',
        meta: '更新时间 2026-04-10 18:00:00'
      },
      {
        title: '触发 / 活跃窗口',
        copy: '1 次触发 · 2026-04-10 18:00:00',
        meta: '结束 2026-04-10 18:00:00'
      }
    ]);
  });

  it('builds empty selected rows when nothing is selected', () => {
    expect(buildSelectedAlertRows(null, t, () => '告警', () => '触发中', () => '-', '默认告警')).toEqual([
      {
        title: '未选中告警',
        copy: '左侧选择一条告警查看详情。',
        meta: '无'
      }
    ]);
  });

  it('renders empty selected alert meta with the localized empty fallback', () => {
    expect(buildSelectedAlertRows(null, t, () => '告警', () => '触发中', () => '-', '默认告警')[0]?.meta).toBe('无');
  });

  it('builds the entity-context summary strip for the alert workbench', () => {
    expect(
      buildAlertEntityContextSummary(
        {
          search: 'checkout',
          status: 'firing',
          severity: 'critical',
          entityId: '42',
          entityName: 'Checkout API',
          returnTo: '/entities/42'
        },
        t
      )
    ).toBe('状态: 告警中 · 严重级别: 严重 · 搜索: checkout');
  });

  it('renders unknown alert entity-context statuses with a localized fallback', () => {
    expect(
      buildAlertEntityContextSummary(
        {
          search: 'checkout',
          status: 'triaging',
          severity: 'warning',
          entityId: '42',
          entityName: 'Checkout API',
          returnTo: '/entities/42'
        },
        t
      )
    ).toBe('状态: 未知状态 triaging · 严重级别: 警告 · 搜索: checkout');
  });

  it('renders unknown alert entity-context severities with a localized fallback', () => {
    expect(
      buildAlertEntityContextSummary(
        {
          search: 'checkout',
          status: 'firing',
          severity: 'degraded',
          entityId: '42',
          entityName: 'Checkout API',
          returnTo: '/entities/42'
        },
        t
      )
    ).toBe('状态: 告警中 · 严重级别: 未知严重级别 degraded · 搜索: checkout');
  });

  it('builds compact inherited evidence context rows without fake health or zero states', () => {
    expect(
      buildAlertEvidenceContextRows(
        {
          search: 'checkout',
          status: 'firing',
          severity: 'critical',
          entityId: '42',
          entityName: 'Checkout API',
          serviceName: 'checkout',
          environment: 'prod',
          timeRange: 'last-45m',
          start: '1713200000000',
          end: '1713202700000',
          refresh: '30',
          live: 'false',
          tz: 'Asia/Shanghai',
          source: 'monitor',
          signal: 'metrics',
          monitorId: '632051474676992',
          monitorName: 'checkout-http',
          monitorApp: 'website',
          monitorInstance: 'example.com:443',
          traceId: 'trace-123',
          spanId: 'span-456',
          returnTo: '/monitors/632051474676992'
        },
        t
      )
    ).toEqual([
      {
        key: 'time',
        title: '时间范围',
        copy: 'last-45m',
        meta: '2024/04/16 00:53:20 → 2024/04/16 01:38:20 · 已暂停 · Asia/Shanghai'
      },
      {
        key: 'monitor',
        title: '监控实例',
        copy: 'checkout-http',
        meta: 'website · example.com:443 · 监控 ID 632051474676992'
      },
      {
        key: 'source',
        title: '采集来源',
        copy: '传统监控',
        meta: '监控中心上下文'
      },
      {
        key: 'trace',
        title: '链路上下文',
        copy: 'trace-123',
        meta: 'Span ID span-456'
      }
    ]);
  });

  it('renders unknown alert evidence sources with a localized fallback', () => {
    expect(buildAlertEvidenceContextRows({ source: 'external-prometheus' }, t)).toEqual([
      {
        key: 'source',
        title: '采集来源',
        copy: '未知证据来源 external-prometheus',
        meta: '继承的证据来源'
      }
    ]);
  });

  it('localizes alert evidence refresh meta in English without leaking raw implementation labels', () => {
    expect(
      buildAlertEvidenceContextRows(
        {
          timeRange: 'last-45m',
          start: '1713200000000',
          end: '1713202700000',
          refresh: '30',
          live: 'false',
          tz: 'UTC',
          source: 'alert'
        },
        createTranslatorMock({ locale: 'en-US' })
      )[0]
    ).toMatchObject({
      key: 'time',
      title: 'Time range',
      copy: 'last-45m',
      meta: '04/15/2024, 16:53:20 → 04/15/2024, 17:38:20 · paused · UTC'
    });
  });

  it('uses locale code instead of visible alert labels for evidence date formatting', () => {
    const englishWithChineseVisibleLabels = createTranslatorMock({
      locale: 'en-US',
      overrides: {
        'common.refresh': '刷新',
        'alert.workbench.kicker': '告警中心'
      }
    });

    expect(
      buildAlertEvidenceContextRows(
        {
          timeRange: 'last-45m',
          start: '1713200000000',
          end: '1713202700000',
          tz: 'UTC'
        },
        englishWithChineseVisibleLabels
      )[0].meta
    ).toContain('04/15/2024');
  });

  it('builds the noise-control summary card for suppressed alert posture', () => {
    expect(
      buildAlertNoiseControlSummary(
        {
          activeSilenceCount: 1,
          matchingInhibitCount: 2,
          possibleAlertSuppression: true,
          activeSilences: [],
          matchingInhibits: []
        },
        0,
        t
      )
    ).toEqual({
      title: '可见告警可能被规则隐藏',
      copy: '当前没有更强的活跃告警，但命中了 1 条静默规则和 2 条抑制规则，先确认是否隐藏了告警。',
      silenceActionLabel: '查看命中的静默规则',
      inhibitActionLabel: '查看命中的抑制规则'
    });
  });

  it('keeps Angular create-capable noise-control labels when suppression is possible and no matching rules exist', () => {
    expect(
      buildAlertNoiseControlSummary(
        {
          activeSilenceCount: 0,
          matchingInhibitCount: 0,
          possibleAlertSuppression: true,
          activeSilences: [],
          matchingInhibits: []
        },
        3,
        t
      )
    ).toEqual({
      title: '静默或抑制规则仍在生效',
      copy: '当前实体命中 0 条静默规则和 0 条抑制规则，排查时同时看可见和隐藏告警。',
      silenceActionLabel: '查看或新建静默规则',
      inhibitActionLabel: '查看或新建抑制规则'
    });
  });

  it('builds noise-control management hrefs with machine context and no display return label', () => {
    expect(
      buildAlertNoiseControlManageHref(
        'silence',
        {
          search: '',
          status: 'firing',
          severity: '',
          entityId: '42',
          entityName: 'Checkout API',
          returnTo: '/entities/42?returnLabel=Checkout'
        },
        {
          activeSilenceCount: 1,
          matchingInhibitCount: 0,
          possibleAlertSuppression: false,
          activeSilences: [{ id: 11, name: 'silence-1', type: 'silence' }],
          matchingInhibits: []
        }
      )
    ).toBe('/alert/silence?entityId=42&entityName=Checkout+API&returnTo=%2Fentities%2F42&matchMode=entity-noise-controls&matchingRuleType=silence&matchingRuleIds=11');
  });

  it('keeps topology edge context when opening silence and inhibit closure actions', () => {
    const returnTo =
      '/topology?viewMode=resource-dependency&sourceKind=database-middleware-connection&edgeId=svc-checkout--res-orders-db&environment=prod&timeRange=last-1h';
    const query = {
      search: 'checkout-api',
      status: 'firing',
      severity: '',
      entityId: 'service:commerce/checkout',
      entityName: 'checkout-api',
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod',
      timeRange: 'last-1h',
      source: 'topology',
      viewMode: 'resource-dependency',
      sourceKind: 'database-middleware-connection',
      edgeId: 'svc-checkout--res-orders-db',
      returnTo: `${returnTo}&returnLabel=HertzBeat%20%E4%BC%81%E4%B8%9A%E8%BF%90%E7%BB%B4%E6%8B%93%E6%89%91`
    } as const;

    const silenceHref = buildAlertNoiseControlManageHref('silence', query, {
      activeSilenceCount: 1,
      matchingInhibitCount: 0,
      possibleAlertSuppression: false,
      activeSilences: [{ id: 11, name: 'silence-1', type: 'silence' }],
      matchingInhibits: []
    });
    const inhibitHref = buildAlertRuleWorkspaceHref('inhibit', query);
    const silenceParams = new URL(silenceHref, 'http://localhost').searchParams;
    const inhibitParams = new URL(inhibitHref, 'http://localhost').searchParams;

    expect(silenceHref).toMatch(/^\/alert\/silence\?/);
    expect(silenceParams.get('matchMode')).toBe('entity-noise-controls');
    expect(silenceParams.get('matchingRuleIds')).toBe('11');
    expect(inhibitHref).toMatch(/^\/alert\/inhibit\?/);
    [silenceParams, inhibitParams].forEach(params => {
      expect(params.get('entityId')).toBe('service:commerce/checkout');
      expect(params.get('entityName')).toBe('checkout-api');
      expect(params.get('returnTo')).toBe(returnTo);
      expect(params.get('returnLabel')).toBeNull();
      expect(params.get('serviceName')).toBe('checkout-api');
      expect(params.get('serviceNamespace')).toBe('commerce');
      expect(params.get('environment')).toBe('prod');
      expect(params.get('timeRange')).toBe('last-1h');
      expect(params.get('source')).toBe('topology');
      expect(params.get('viewMode')).toBe('resource-dependency');
      expect(params.get('sourceKind')).toBe('database-middleware-connection');
      expect(params.get('edgeId')).toBe('svc-checkout--res-orders-db');
    });
  });

  it('builds current group action posture for entity-context firing alerts', () => {
    expect(buildAlertGroupActionLabels({ status: 'firing' } as any, true, t)).toEqual([
      '确认告警',
      '标记已恢复',
      '创建静默',
      '创建抑制'
    ]);
  });

  it('builds OTLP alert evidence closure rows across entity, metrics, logs, traces, and topology', () => {
    const query = {
      search: 'checkout',
      status: 'firing',
      severity: 'critical',
      entityId: '42',
      entityName: 'Checkout API',
      serviceName: 'checkout',
      serviceNamespace: 'payments',
      environment: 'prod',
      timeRange: 'last-1h',
      source: 'otlp',
      signal: 'traces',
      traceId: 'trace-123',
      spanId: 'span-456',
      collector: 'collector-a',
      template: 'spring-boot',
      returnTo: '/topology?viewMode=resource-dependency&edgeId=svc-checkout--orders-db'
    } as const;
    const group = {
      id: 7,
      status: 'firing',
      groupLabels: { service: 'checkout', severity: 'critical' },
      commonLabels: { alertname: 'HighCPU', service: 'checkout', severity: 'critical' },
      alerts: [
        {
          id: 701,
          content: 'CPU high',
          labels: { alertname: 'HighCPU', service: 'checkout', severity: 'critical' },
          status: 'firing'
        },
        {
          id: 702,
          content: 'Memory high',
          labels: { alertname: 'HighMemory', service: 'checkout', severity: 'critical' },
          status: 'firing'
        }
      ]
    } as any;

    const evidenceRows = buildAlertEvidenceClosureRows(query, group, t);
    const operationRows = buildAlertClosureOperationRows(query, group, t);

    expect(evidenceRows.map(row => row.key)).toEqual(['entity', 'metrics', 'logs', 'traces', 'topology']);
    expect(evidenceRows.map(row => row.title)).toEqual(['实体详情', '指标证据', '日志证据', '链路证据', '拓扑影响面']);
    expect(evidenceRows.find(row => row.key === 'entity')?.href).toContain('/entities/42?');
    expect(evidenceRows.find(row => row.key === 'metrics')?.href).toContain('/ingestion/otlp/metrics?');
    expect(evidenceRows.find(row => row.key === 'metrics')?.href).toContain('serviceName=checkout');
    expect(evidenceRows.find(row => row.key === 'metrics')?.href).toContain('entityId=42');
    expect(evidenceRows.find(row => row.key === 'metrics')?.href).toContain('traceId=trace-123');
    expect(evidenceRows.find(row => row.key === 'metrics')?.href).toContain('spanId=span-456');
    expect(evidenceRows.find(row => row.key === 'metrics')?.href).toContain('collector=collector-a');
    expect(evidenceRows.find(row => row.key === 'metrics')?.href).toContain('template=spring-boot');
    expect(evidenceRows.find(row => row.key === 'logs')?.href).toContain('/log/manage?');
    expect(evidenceRows.find(row => row.key === 'logs')?.href).toContain('view=list');
    expect(evidenceRows.find(row => row.key === 'logs')?.href).toContain('search=service.name+%3D+%22checkout%22');
    expect(evidenceRows.find(row => row.key === 'logs')?.href).toContain('traceId=trace-123');
    expect(evidenceRows.find(row => row.key === 'logs')?.meta).toBe('按 traceId/spanId 查看相关日志');
    expect(evidenceRows.find(row => row.key === 'traces')?.href).toContain('/trace/manage?');
    expect(evidenceRows.find(row => row.key === 'traces')?.href).toContain('serviceName=checkout');
    expect(evidenceRows.find(row => row.key === 'traces')?.href).toContain('traceId=trace-123');
    expect(evidenceRows.find(row => row.key === 'traces')?.href).toContain('spanId=span-456');
    expect(evidenceRows.find(row => row.key === 'traces')?.meta).toBe('打开同一 traceId/spanId 的链路证据');
    expect(evidenceRows.find(row => row.key === 'topology')?.href).toContain('/topology?');
    expect(operationRows.map(row => row.key)).toEqual(['acknowledge', 'recover', 'threshold', 'notice', 'group', 'silence', 'inhibit', 'automation', 'close']);
    expect(operationRows.map(row => row.label)).toEqual(['确认告警', '标记已恢复', '创建阈值规则', '配置通知策略', '配置分组收敛', '创建静默', '创建抑制', '建议自动化动作', '关闭告警']);
    expect(operationRows.find(row => row.key === 'threshold')?.href).toContain('/alert/setting?');
    expect(operationRows.find(row => row.key === 'notice')?.href).toContain('/alert/notice?');
    expect(operationRows.find(row => row.key === 'group')?.href).toContain('/alert/group?');
    expect(operationRows.find(row => row.key === 'silence')?.href).toContain('/alert/silence?');
    expect(operationRows.find(row => row.key === 'inhibit')?.href).toContain('/alert/inhibit?');
    const automationHref = operationRows.find(row => row.key === 'automation')?.href;
    expect(automationHref).toContain('/actions?');
    expect(automationHref).toContain('source=alert');
    expect(automationHref).toContain('entityId=42');
    expect(automationHref).toContain('serviceName=checkout');
    expect(automationHref).toContain('traceId=trace-123');
    expect(automationHref).toContain('spanId=span-456');
    expect(automationHref).toContain('alertGroupId=7');
  });

  it('preserves full fault evidence context when opening topology from alert evidence', () => {
    const query = {
      search: 'checkout',
      status: 'firing',
      severity: 'critical',
      entityId: 'service:commerce/checkout',
      entityName: 'checkout-api',
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod',
      timeRange: 'last-1h',
      source: 'otlp',
      signal: 'traces',
      traceId: 'trace-123',
      spanId: 'span-456',
      collector: 'edge-collector-a',
      template: 'java-service',
      viewMode: 'resource-dependency',
      sourceKind: 'database-middleware-connection',
      edgeId: 'svc-checkout--res-orders-db',
      returnTo:
        '/topology?viewMode=resource-dependency&sourceKind=database-middleware-connection&edgeId=svc-checkout--res-orders-db&returnLabel=Topology'
    } as const;

    const topologyHref = buildAlertEvidenceClosureRows(query, null, t).find(row => row.key === 'topology')?.href || '';
    const topologyUrl = new URL(topologyHref, 'http://localhost');
    const params = topologyUrl.searchParams;

    expect(topologyUrl.pathname).toBe('/topology');
    expect(params.get('viewMode')).toBe('resource-dependency');
    expect(params.get('sourceKind')).toBe('database-middleware-connection');
    expect(params.get('edgeId')).toBe('svc-checkout--res-orders-db');
    expect(params.get('entityId')).toBe('service:commerce/checkout');
    expect(params.get('entityName')).toBe('checkout-api');
    expect(params.get('serviceName')).toBe('checkout-api');
    expect(params.get('serviceNamespace')).toBe('commerce');
    expect(params.get('environment')).toBe('prod');
    expect(params.get('timeRange')).toBe('last-1h');
    expect(params.get('source')).toBe('otlp');
    expect(params.get('signal')).toBe('traces');
    expect(params.get('traceId')).toBe('trace-123');
    expect(params.get('spanId')).toBe('span-456');
    expect(params.get('collector')).toBe('edge-collector-a');
    expect(params.get('template')).toBe('java-service');
    expect(params.get('returnLabel')).toBeNull();
    expect(params.get('returnTo')).toBeNull();
  });

  it('preserves three-signal alert context when opening rule workspaces from alert closure', () => {
    const query = {
      search: 'checkout',
      status: 'firing',
      severity: 'critical',
      entityId: 'service:commerce/checkout',
      entityName: 'checkout-api',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'prod',
      timeRange: 'last-1h',
      source: 'otlp',
      signal: 'traces',
      traceId: 'trace-123',
      spanId: 'span-456',
      collector: 'edge-collector-a',
      template: 'java-service',
      returnTo: '/trace/manage?traceId=trace-123&returnLabel=Trace'
    } as const;

    (['setting', 'notice', 'group', 'silence', 'inhibit'] as const).forEach(mode => {
      const href = buildAlertRuleWorkspaceHref(mode, query);
      const params = new URL(href, 'http://localhost').searchParams;

      expect(href).toMatch(new RegExp(`^/alert/${mode === 'setting' ? 'setting' : mode}\\?`));
      expect(params.get('entityId')).toBe('service:commerce/checkout');
      expect(params.get('entityName')).toBe('checkout-api');
      expect(params.get('serviceName')).toBe('checkout');
      expect(params.get('serviceNamespace')).toBe('commerce');
      expect(params.get('environment')).toBe('prod');
      expect(params.get('timeRange')).toBe('last-1h');
      expect(params.get('source')).toBe('otlp');
      expect(params.get('signal')).toBe('traces');
      expect(params.get('traceId')).toBe('trace-123');
      expect(params.get('spanId')).toBe('span-456');
      expect(params.get('collector')).toBe('edge-collector-a');
      expect(params.get('template')).toBe('java-service');
      expect(params.get('returnTo')).toBe('/trace/manage?traceId=trace-123');
      expect(params.get('returnLabel')).toBeNull();
    });
  });

  it('preserves unified time and monitor context across alert evidence and closure workspaces', () => {
    const query = {
      search: 'checkout',
      status: 'firing',
      severity: 'critical',
      entityId: '42',
      entityName: 'Checkout API',
      serviceName: 'checkout',
      environment: 'prod',
      timeRange: 'last-45m',
      start: '1713200000000',
      end: '1713202700000',
      refresh: '30',
      live: 'false',
      tz: 'Asia/Shanghai',
      source: 'monitor',
      signal: 'metrics',
      monitorId: '632051474676992',
      monitorName: 'checkout-http',
      monitorApp: 'website',
      monitorInstance: 'example.com:443',
      returnTo: '/monitors/632051474676992?returnLabel=Monitor'
    } as const;

    const evidenceHrefs = buildAlertEvidenceClosureRows(query, null, t).map(row => row.href);
    const operationHrefs = buildAlertClosureOperationRows(query, null, t)
      .map(row => row.href)
      .filter((href): href is string => Boolean(href));

    [...evidenceHrefs, ...operationHrefs].forEach(href => {
      const params = new URL(href, 'http://localhost').searchParams;

      expect(params.get('timeRange')).toBe('last-45m');
      expect(params.get('start')).toBe('1713200000000');
      expect(params.get('end')).toBe('1713202700000');
      expect([null, '30']).toContain(params.get('refresh'));
      expect(params.get('live')).toBe('false');
      expect(params.get('tz')).toBe('Asia/Shanghai');
      expect(params.get('monitorId')).toBe('632051474676992');
      expect(params.get('monitorName')).toBe('checkout-http');
      expect(params.get('monitorApp')).toBe('website');
      expect(params.get('monitorInstance')).toBe('example.com:443');
      expect(params.get('returnLabel')).toBeNull();
    });
  });

  it('derives one buffered event window for alert evidence when the route has no explicit absolute range', () => {
    const query = {
      search: 'checkout',
      status: 'firing',
      severity: 'critical',
      entityId: '42',
      entityName: 'Checkout API',
      serviceName: 'checkout',
      environment: 'prod',
      timeRange: 'last-1h',
      refresh: '30',
      live: 'false',
      tz: 'Asia/Shanghai',
      source: 'otlp',
      signal: 'metrics',
      returnTo: '/alert'
    } as const;
    const group = {
      id: 7,
      status: 'firing',
      groupLabels: { service: 'checkout', severity: 'critical' },
      commonLabels: { service: 'checkout', severity: 'critical' },
      alerts: [
        {
          id: 701,
          content: 'CPU high',
          labels: { service: 'checkout', severity: 'critical' },
          status: 'firing',
          startAt: 1713200000000,
          endAt: 1713201800000
        }
      ]
    } as any;

    const evidenceRows = buildAlertEvidenceClosureRows(query, group, t);
    const operationHrefs = buildAlertClosureOperationRows(query, group, t)
      .map(row => row.href)
      .filter((href): href is string => Boolean(href));
    const contextRows = buildAlertEvidenceContextRows(query, t, group);

    expect(contextRows).toContainEqual({
      key: 'time',
      title: '时间范围',
      copy: 'last-1h',
      meta: '2024/04/16 00:38:20 → 2024/04/16 01:38:20 · 已暂停 · Asia/Shanghai'
    });
    [...evidenceRows.map(row => row.href), ...operationHrefs].forEach(href => {
      const params = new URL(href, 'http://localhost').searchParams;

      expect(params.get('timeRange')).toBe('last-1h');
      expect(params.get('start')).toBe('1713199100000');
      expect(params.get('end')).toBe('1713202700000');
      expect([null, '30']).toContain(params.get('refresh'));
      expect(params.get('live')).toBe('false');
      expect(params.get('tz')).toBe('Asia/Shanghai');
      expect(params.get('returnLabel')).toBeNull();
    });
  });

  it('summarizes milestone 6 closure without promoting roadmap-only incident domains', () => {
    const review = buildAlertEventClosureReview();

    expect(review.milestone).toBe(6);
    expect(review.status).toBe('ready-for-topology-fault-analysis');
    expect(review.evidenceKeys).toEqual(['entity', 'metrics', 'logs', 'traces', 'topology']);
    expect(review.operationKeys).toEqual(['acknowledge', 'recover', 'threshold', 'notice', 'group', 'silence', 'inhibit', 'automation', 'close']);
    expect(review.directMutationKeys).toEqual(['acknowledge', 'recover', 'close']);
    expect(review.ruleWorkspaceModes).toEqual(['setting', 'notice', 'group', 'silence', 'inhibit']);
    expect(review.implementedCapabilities).toEqual([
      'alert-evidence-entity',
      'alert-evidence-metrics',
      'alert-evidence-logs',
      'alert-evidence-traces',
      'alert-evidence-topology',
      'alert-acknowledge',
      'alert-recover',
      'alert-close',
      'threshold-rules',
      'notification-policies',
      'grouping-rules',
      'silence-rules',
      'inhibit-rules'
    ]);
    expect(review.futureRoadmapOnly).toEqual([
      'incident-management',
      'on-call',
      'status-pages',
      'case-management',
      'slo',
      'event-management'
    ]);
    expect(review.nextMilestone).toBe('topology-dependency-change-fault-analysis');
  });

  it('builds explicit post-operation feedback for alert evidence closure actions', () => {
    expect(buildAlertClosureOperationFeedback('acknowledge', t)).toBe('标记成功!');
    expect(buildAlertClosureOperationFeedback('recover', t)).toBe('标记成功!');
    expect(buildAlertClosureOperationFeedback('reopen', t)).toBe('标记成功!');
    expect(buildAlertClosureOperationFeedback('close', t)).toBe('删除成功!');
    expect(buildAlertClosureOperationFeedback('delete', t)).toBe('删除成功!');
    expect(buildAlertClosureOperationFailureFeedback('acknowledge', t)).toBe('标记失败!');
    expect(buildAlertClosureOperationFailureFeedback('recover', t)).toBe('标记失败!');
    expect(buildAlertClosureOperationFailureFeedback('reopen', t)).toBe('标记失败!');
    expect(buildAlertClosureOperationFailureFeedback('close', t)).toBe('删除失败!');
    expect(buildAlertClosureOperationFailureFeedback('delete', t)).toBe('删除失败!');
  });

  it('builds alert group cards with labels, triage reason, and action posture', () => {
    expect(
      buildAlertGroupCards(
        {
          content: [
            {
              id: 7,
              status: 'firing',
              groupLabels: { service: 'checkout', severity: 'critical' },
              alerts: [
                {
                  id: 701,
                  content: 'CPU high',
                  labels: { alertname: 'HighCPU', severity: 'critical' },
                  annotations: { summary: 'CPU has been high for two intervals' },
                  status: 'firing',
                  triggerTimes: 2,
                  startAt: 1713190000000,
                  activeAt: 1713200000000
                }
              ],
              gmtUpdate: 1713200000000
            }
          ],
          totalElements: 1,
          pageIndex: 0,
          pageSize: 8
        } as any,
        true,
        t,
        () => '2026-04-19 20:00:00'
      )
    ).toEqual([
      expect.objectContaining({
        key: '7',
        triageReason: '当前只剩这一组活跃告警，先确认它是否解释了实体状态',
        responseStage: '处置状态: 待确认',
        evidenceSummary: '证据: 1 条告警 · 2 个标签',
        closureSummary: '下一步: 确认告警 / 标记已恢复 / 创建静默 / 创建抑制',
        actionLabels: ['确认告警', '标记已恢复', '创建静默', '创建抑制'],
        labels: ['service:checkout', 'severity:critical'],
        alerts: [
          expect.objectContaining({
            title: 'CPU high',
            status: '告警中',
            statusTone: 'critical',
            annotations: [{ key: 'summary', value: 'CPU has been high for two intervals' }],
            timeRows: [
              { key: 'first', label: '开始', value: '2026-04-19 20:00:00' },
              { key: 'last', label: '最后触发', value: '2026-04-19 20:00:00' }
            ]
          })
        ]
      })
    ]);
  });

  it('keeps the Angular acknowledged-card resolve action beside unacknowledge', () => {
    expect(
      buildAlertGroupCards(
        {
          content: [
            {
              id: 8,
              status: 'acknowledged',
              groupLabels: { service: 'checkout' },
              alerts: [
                {
                  id: 801,
                  content: 'CPU high acknowledged',
                  labels: { alertname: 'HighCPU', severity: 'warning' },
                  status: 'acknowledged',
                  activeAt: 1713200000000
                }
              ],
              gmtUpdate: 1713200000000
            }
          ],
          totalElements: 1,
          pageIndex: 0,
          pageSize: 8
        } as any,
        true,
        t,
        () => '2026-04-19 20:00:00'
      )[0]
    ).toEqual(expect.objectContaining({
      responseStage: '处置状态: 已接手',
      closureSummary: '下一步: 取消确认 / 标记已恢复 / 创建静默 / 创建抑制',
      actionLabels: ['取消确认', '标记已恢复', '创建静默', '创建抑制']
    }));
  });

  it('builds current silence and inhibit quick-dialog models from a grouped alert', () => {
    const group = {
      id: 7,
      status: 'firing',
      groupLabels: { service: 'checkout', severity: 'critical' },
      commonLabels: { service: 'checkout', severity: 'critical' },
      alerts: [
        {
          id: 701,
          content: 'CPU high',
          labels: { alertname: 'HighCPU', service: 'checkout', severity: 'critical' },
          status: 'firing'
        }
      ]
    } as any;
    const query = {
      search: '',
      status: 'firing',
      severity: '',
      entityId: '42',
      entityName: 'Checkout API',
      returnTo: '/entities/42'
    } as const;

    expect(buildAlertRuleQuickDialogModel(group, 'silence', query, t)).toMatchObject({
      title: '创建告警静默',
      entityTitle: 'Checkout API',
      summary: '将基于 1 条告警的共用标签预填静默规则',
      previewLabels: [
        { key: 'service', value: 'checkout' },
        { key: 'severity', value: 'critical' }
      ],
      silenceDraft: expect.objectContaining({
        name: 'Checkout API silence',
        matchAll: false,
        labelsText: 'service:checkout, severity:critical',
        type: '0'
      })
    });

    expect(buildAlertRuleQuickDialogModel(group, 'inhibit', query, t)).toMatchObject({
      title: '创建告警抑制',
      entityTitle: 'Checkout API',
      summary: '将基于 1 条告警的共用标签预填抑制规则',
      previewLabels: [
        { key: 'service', value: 'checkout' },
        { key: 'severity', value: 'critical' }
      ],
      targetPreviewLabels: [
        { key: 'service', value: 'checkout' }
      ],
      inhibitDraft: expect.objectContaining({
        name: 'Checkout API inhibit',
        sourceLabelsText: 'service:checkout, severity:critical',
        targetLabelsText: 'service:checkout',
        equalLabelsText: 'service'
      })
    });

    const selectedBatchGroup = {
      ...group,
      id: 0,
      groupKey: '__selected_batch__',
      alerts: [
        { id: 701, labels: { service: 'checkout', severity: 'critical' }, status: 'firing' },
        { id: 801, labels: { service: 'checkout', severity: 'critical' }, status: 'firing' }
      ]
    } as any;

    expect(buildAlertRuleQuickDialogModel(selectedBatchGroup, 'silence', query, t)).toMatchObject({
      summary: '将基于 2 条告警的共用标签预填静默规则'
    });

    const severityOnlyGroup = {
      ...group,
      groupLabels: { severity: 'critical' },
      commonLabels: { severity: 'critical' }
    } as any;

    expect(buildAlertRuleQuickDialogModel(severityOnlyGroup, 'inhibit', query, t)).toMatchObject({
      warning: '当前选中的告警没有稳定共用标签，需要手动补充抑制条件后再创建抑制规则。',
      targetPreviewLabels: [],
      inhibitDraft: expect.objectContaining({
        sourceLabelsText: 'severity:critical',
        targetLabelsText: '',
        equalLabelsText: ''
      })
    });
  });

  it('applies the shared inhibit quick-dialog shortcuts to the draft', () => {
    const draft = {
      name: '',
      enable: true,
      sourceLabelsText: 'service:checkout, severity:critical',
      targetLabelsText: 'service:checkout, severity:critical',
      equalLabelsText: 'service, severity'
    };

    expect(copyAlertInhibitSourceToTarget({ ...draft, targetLabelsText: '' })).toMatchObject({
      targetLabelsText: 'service:checkout, severity:critical'
    });
    expect(dropSeverityFromAlertInhibitTarget(draft)).toMatchObject({
      targetLabelsText: 'service:checkout'
    });
    expect(clearAlertInhibitTarget(draft)).toMatchObject({
      targetLabelsText: ''
    });
    expect(clearAlertInhibitEqualLabels(draft)).toMatchObject({
      equalLabelsText: ''
    });
  });
});
