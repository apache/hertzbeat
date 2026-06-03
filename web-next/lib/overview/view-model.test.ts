import { describe, expect, it, vi } from 'vitest';
import {
  buildInvestigationLanes,
  buildOverviewConsoleViewModel,
  buildOverviewMetrics
} from './view-model';
import { SUPPLEMENTAL_MESSAGES } from '../i18n-runtime-messages';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });
const enT = createTranslatorMock({ locale: 'en-US' });

const overviewDashboardMessageKeys = [
  'dashboard.darkops.kicker',
  'dashboard.darkops.title',
  'dashboard.darkops.subtitle',
  'dashboard.darkops.action.refresh',
  'dashboard.darkops.action.review-alerts',
  'dashboard.home.status.title',
  'dashboard.home.status.copy',
  'dashboard.home.status.action.entities',
  'dashboard.home.status.workspace',
  'dashboard.home.status.ingestion',
  'dashboard.home.status.entities',
  'dashboard.home.status.alerts',
  'dashboard.home.status.ready',
  'dashboard.home.status.pending',
  'dashboard.guidance.setup.headline',
  'dashboard.guidance.ready.headline',
  'dashboard.guidance.setup.description',
  'dashboard.guidance.ready.description',
  'dashboard.guidance.setup.action',
  'dashboard.setup.status.logs',
  'dashboard.setup.status.traces',
  'dashboard.setup.status.metrics',
  'dashboard.setup.status.pending',
  'dashboard.empty.title',
  'dashboard.empty.copy',
  'dashboard.problem-focus.kicker',
  'dashboard.problem-focus.entity',
  'dashboard.problem-focus.owner',
  'dashboard.problem-focus.open-context',
  'dashboard.problem-focus.review-alerts',
  'dashboard.problem-focus.empty.title',
  'dashboard.problem-focus.empty.entity',
  'dashboard.problem-focus.empty.owner',
  'dashboard.problem-focus.empty.summary',
  'dashboard.problem-focus.default-title',
  'dashboard.problem-focus.default-entity',
  'dashboard.problem-focus.default-summary',
  'dashboard.summary.critical.label',
  'dashboard.summary.critical.hint',
  'dashboard.summary.critical.delta.active',
  'dashboard.summary.critical.delta.idle',
  'dashboard.summary.unassigned.label',
  'dashboard.summary.unassigned.hint',
  'dashboard.summary.unassigned.delta.active',
  'dashboard.summary.unassigned.delta.idle',
  'dashboard.summary.degraded.label',
  'dashboard.summary.degraded.hint',
  'dashboard.summary.degraded.delta.active',
  'dashboard.summary.degraded.delta.idle',
  'dashboard.summary.drawer-subtitle',
  'dashboard.summary.value',
  'dashboard.summary.delta',
  'dashboard.workbench.fact.entities',
  'dashboard.workbench.fact.alerts',
  'dashboard.workbench.fact.unassigned',
  'dashboard.setup.checklist.title',
  'dashboard.setup.checklist.data-source',
  'dashboard.setup.checklist.entities',
  'dashboard.setup.checklist.logs',
  'dashboard.setup.checklist.traces',
  'dashboard.setup.checklist.metrics',
  'dashboard.setup.checklist.alerts',
  'dashboard.setup.checklist.dashboards',
  'dashboard.trend.alert.label',
  'dashboard.trend.alert.insight',
  'dashboard.trend.availability.label',
  'dashboard.trend.availability.insight',
  'dashboard.trend.error.label',
  'dashboard.trend.error.insight',
  'dashboard.affected.kicker',
  'dashboard.affected.title',
  'dashboard.affected.browse-all',
  'dashboard.affected.status.impacted',
  'dashboard.affected.status.healthy',
  'dashboard.affected.last-issue.healthy',
  'dashboard.affected.drawer-subtitle',
  'dashboard.affected.status-label',
  'dashboard.activity.title',
  'dashboard.activity.empty',
  'dashboard.activity.default-title',
  'dashboard.activity.pending-entity',
  'dashboard.coverage.unknown',
  'dashboard.coverage.total',
  'dashboard.coverage.healthy',
  'dashboard.coverage.abnormal',
  'dashboard.coverage.clean',
  'dashboard.quick-entry.kicker',
  'dashboard.quick-entry.title',
  'dashboard.quick-entry.entities',
  'dashboard.quick-entry.entities.copy',
  'dashboard.quick-entry.logs',
  'dashboard.quick-entry.logs.copy',
  'dashboard.quick-entry.traces',
  'dashboard.quick-entry.traces.copy',
  'dashboard.quick-entry.metrics',
  'dashboard.quick-entry.metrics.copy',
  'dashboard.quick-entry.dashboards',
  'dashboard.quick-entry.dashboards.copy',
  'dashboard.owner.unassigned',
  'dashboard.severity.critical',
  'dashboard.severity.warning',
  'dashboard.severity.error',
  'dashboard.severity.healthy'
] as const;

const runtimeLocales = ['en-US', 'zh-CN'] as const;

describe('overview view model', () => {
  it('resolves overview dashboard copy from i18n catalogs', () => {
    for (const key of overviewDashboardMessageKeys) {
      expect(t(key), key).not.toBe(key);
      expect(enT(key), key).not.toBe(key);

      for (const locale of runtimeLocales) {
        expect(SUPPLEMENTAL_MESSAGES[locale]?.[key], `${locale}:${key}`).toBeTruthy();
      }
    }
  });

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

    expect(lanes.find(item => item.href === '/trace/manage')?.stat).toBe(
      t('overview.lane.trace.stat.detected')
    );
    expect(lanes.find(item => item.href === '/log/manage')?.stat).toBe(
      t('overview.lane.logs.stat.recommended')
    );
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
      title: t('overview.lane.entities.title'),
      eyebrow: t('overview.lane.entities.eyebrow'),
      copy: t('overview.lane.entities.copy'),
      stat: t('overview.lane.entities.stat', { count: 7 }),
      action: t('overview.lane.entities.action')
    });
    expect(lanes.find(item => item.href === '/log/manage')).toMatchObject({
      title: t('overview.lane.logs.title'),
      eyebrow: t('overview.lane.logs.eyebrow'),
      copy: t('overview.lane.logs.copy'),
      stat: t('overview.lane.logs.stat.available'),
      action: t('overview.lane.logs.action')
    });
    expect(lanes.find(item => item.href === '/trace/manage')).toMatchObject({
      title: t('overview.lane.trace.title'),
      eyebrow: t('overview.lane.trace.eyebrow'),
      copy: t('overview.lane.trace.copy'),
      stat: t('overview.lane.trace.stat.distributed'),
      action: t('overview.lane.trace.action')
    });
    expect(lanes.find(item => item.href === '/ingestion/otlp/metrics')).toMatchObject({
      title: t('overview.lane.otlp.title'),
      eyebrow: t('overview.lane.otlp.eyebrow'),
      copy: t('overview.lane.otlp.copy'),
      stat: t('overview.lane.otlp.stat', { count: 2 }),
      action: t('overview.lane.otlp.action')
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
      label: t('dashboard.summary.critical.label'),
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
    expect(viewModel.guidanceHeadline).toBe(t('dashboard.guidance.ready.headline'));
    expect(viewModel.activityItems[0]?.tag).toBe(t('alert.status.firing'));
  });
});
