import { describe, expect, it, vi } from 'vitest';
import {
  buildInvestigationLanes,
  buildOverviewConsoleViewModel,
  buildOverviewMetrics
} from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

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
      owner: 'Platform'
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
