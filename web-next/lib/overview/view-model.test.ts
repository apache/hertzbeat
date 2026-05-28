import { describe, expect, it, vi } from 'vitest';
import {
  buildInvestigationLanes,
  buildOverviewConsoleViewModel,
  buildOverviewMetrics
} from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });
const enT = createTranslatorMock({ locale: 'en-US' });

describe('overview view model', () => {
  it('builds entity and alert metrics from app summary data', () => {
    expect(
      buildOverviewMetrics(
        [
          { category: 'svc', app: 'checkout', size: 10, availableSize: 8, unAvailableSize: 1, unManageSize: 1 },
          { category: 'svc', app: 'payments', size: 5, availableSize: 5, unAvailableSize: 0, unManageSize: 0 }
        ],
        {
          total: 3,
          dealNum: 0,
          rate: 0,
          priorityCriticalNum: 1,
          priorityWarningNum: 2,
          priorityEmergencyNum: 0
        },
        t
      )
    ).toMatchObject({
      totalEntities: 15,
      healthyEntities: 13,
      degradedEntities: 2,
      healthRatio: 87,
      activeAlerts: 3,
      criticalAlerts: 1,
      warningAlerts: 2
    });
  });

  it('recommends trace lane first when latest alert carries traceId', () => {
    const lanes = buildInvestigationLanes(
      {
        totalEntities: 7,
        appCount: 2,
        topAlertHasTraceId: true
      },
      t
    );

    expect(lanes.find(item => item.href === '/trace/manage')?.stat).toBe('当前事件含链路 ID');
    expect(lanes.find(item => item.href === '/log/manage')?.stat).toBe('无链路 ID 时优先');
  });

  it('localizes overview investigation lane titles, copy, stats, and actions', () => {
    const lanes = buildInvestigationLanes(
      {
        totalEntities: 7,
        appCount: 2,
        topAlertHasTraceId: false
      },
      t
    );

    expect(lanes.find(item => item.href === '/entities')).toMatchObject({
      title: '实体目录',
      eyebrow: '实体优先',
      copy: '先从监控实体和服务归属定位影响范围，再进入信号排查。',
      stat: '已纳管 7 个实体',
      action: '打开实体目录'
    });
    expect(lanes.find(item => item.href === '/log/manage')).toMatchObject({
      title: '日志',
      eyebrow: '运行证据',
      copy: '用相同服务、实体和时间上下文查看日志事件。',
      stat: '日志可用',
      action: '打开日志'
    });
    expect(lanes.find(item => item.href === '/trace/manage')).toMatchObject({
      title: '链路',
      eyebrow: '请求路径',
      copy: '存在链路上下文时跟进跨度，再回到实体证据。',
      stat: '分布式链路就绪',
      action: '打开链路'
    });
    expect(lanes.find(item => item.href === '/ingestion/otlp/metrics')).toMatchObject({
      title: 'OTLP 指标',
      eyebrow: '三信号接入',
      copy: '在私有部署的 HertzBeat 工作区查看进入的指标序列。',
      stat: '已接入 2 个监控应用',
      action: '打开指标'
    });
  });

  it('keeps English log lane recommendation copy in English', () => {
    const lanes = buildInvestigationLanes(
      {
        totalEntities: 7,
        appCount: 2,
        topAlertHasTraceId: true
      },
      enT
    );
    const logStat = lanes.find(item => item.href === '/log/manage')?.stat;

    expect(logStat).toBe('Prioritize when trace ID is missing');
    expect(logStat).not.toMatch(/[\u4e00-\u9fff]/);
  });

  it('builds the HertzBeat overview console structure from app and alert data', () => {
    const viewModel = buildOverviewConsoleViewModel(
      [
        { category: 'service', app: 'checkout', size: 4, availableSize: 3, unAvailableSize: 1, unManageSize: 0 },
        { category: 'service', app: 'payments', size: 2, availableSize: 2, unAvailableSize: 0, unManageSize: 0 }
      ],
      [
        {
          id: 1,
          fingerprint: 'fp-1',
          content: 'checkout latency spike',
          status: 'firing',
          gmtUpdate: 1713201000000,
          labels: {
            severity: 'critical',
            service: 'checkout',
            owner: 'Platform'
          },
          annotations: {
            summary: 'Latency high'
          }
        }
      ],
      t
    );

    expect(viewModel.showSetupGuide).toBe(false);
    expect(viewModel.summaryCards).toHaveLength(3);
    expect(viewModel.summaryCards[0]).toMatchObject({
      key: 'critical',
      label: '高优先级告警',
      value: '1'
    });
    expect(viewModel.problemFocus).toMatchObject({
      title: 'checkout latency spike',
      severity: 'critical',
      severityTone: 'danger',
      owner: 'Platform'
    });
    expect(viewModel.impactedEntities[0]).toMatchObject({
      name: 'checkout',
      severity: 'critical',
      severityTone: 'danger'
    });
    expect(viewModel.quickEntryItems.map(item => item.route)).toEqual([
      '/entities',
      '/log/manage',
      '/trace/manage',
      '/ingestion/otlp/metrics',
      '/dashboard'
    ]);
    expect(viewModel.guidanceNextLinks.map(item => item.route)).toEqual([
      '/entities',
      '/log/manage',
      '/trace/manage'
    ]);
    expect(viewModel.guidanceHeadline).toBe('下一步：先处理当前最值得关注的问题');
    expect(viewModel.activityItems[0]?.tag).toBe('告警中');
  });
});
