import { describe, expect, it, vi } from 'vitest';
import {
  buildMonitorMetrics,
  buildMonitorWorkbenchNarrative,
  buildSelectedMonitorRows,
  shouldFallbackMonitorEntityWorkbench
} from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('monitor view model', () => {
  it('builds page metrics from monitor list', () => {
    expect(
      buildMonitorMetrics(
        [
          { status: 1 },
          { status: 2 },
          { status: 0 },
          { status: 1 }
        ] as Array<{ status: number }>,
        t
      )
    ).toEqual([
      { label: t('monitors.metric.up'), value: '2', tone: 'success' },
      { label: t('monitors.metric.down'), value: '1', tone: 'danger' },
      { label: t('monitors.metric.paused'), value: '1', tone: 'warning' }
    ]);
  });

  it('builds selected monitor rows', () => {
    expect(
      buildSelectedMonitorRows(
        {
          name: 'mysql-prod',
          app: 'checkout',
          instance: '10.0.0.1',
          status: 2,
          labels: { region: 'cn' },
          gmtUpdate: '2026-04-10T10:00:00Z'
        } as any,
        t,
        () => '2026-04-10 18:00:00',
        () => t('monitor.detail.status.down')
      )
    ).toEqual([
      { title: 'mysql-prod', copy: 'checkout · 10.0.0.1', meta: t('monitor.detail.status.down') },
      { title: t('common.labels'), copy: '1', meta: t('monitors.updated-at', { time: '2026-04-10 18:00:00' }) }
    ]);
  });

  it('uses localized empty fallback for missing selected monitor rail meta', () => {
    expect(
      buildSelectedMonitorRows(
        null,
        t,
        () => '2026-04-10 18:00:00',
        () => t('monitor.detail.status.down')
      )
    ).toEqual([{ title: t('monitors.empty-selected.title'), copy: t('monitors.empty-selected.copy'), meta: t('common.none') }]);
  });

  it('uses localized fallback for missing selected monitor identity facts', () => {
    expect(
      buildSelectedMonitorRows(
        {
          name: 'orphan-monitor',
          app: '',
          instance: '',
          status: 1,
          labels: {},
          gmtCreate: '2026-04-10T10:00:00Z'
        } as any,
        t,
        () => '2026-04-10 18:00:00',
        () => t('monitor.status.up')
      )
    ).toEqual([
      { title: 'orphan-monitor', copy: `${t('common.none')} · ${t('common.none')}`, meta: t('monitor.status.up') },
      { title: t('common.labels'), copy: '0', meta: t('monitors.updated-at', { time: '2026-04-10 18:00:00' }) }
    ]);
  });

  it('builds entity workbench copy for fallback and empty states', () => {
    expect(
      buildMonitorWorkbenchNarrative(
        {
          entityContextActive: true,
          total: 0,
          downCount: 0,
          status: '2',
          fellBackToAll: false
        },
        t
      )
    ).toBe(t('entity.monitor.workbench.copy.empty'));

    expect(
      buildMonitorWorkbenchNarrative(
        {
          entityContextActive: true,
          total: 3,
          downCount: 0,
          status: '',
          fellBackToAll: true
        },
        t
      )
    ).toBe(t('entity.monitor.workbench.copy.fallback', { total: 3 }));
  });

  it('falls back from down-only entity workbench mode only when the first abnormal pass is empty', () => {
    expect(
      shouldFallbackMonitorEntityWorkbench({
        entityContextActive: true,
        statusWasImplicit: true,
        status: '2',
        totalElements: 0,
        fellBackToAll: false
      })
    ).toBe(true);

    expect(
      shouldFallbackMonitorEntityWorkbench({
        entityContextActive: true,
        statusWasImplicit: false,
        status: '2',
        totalElements: 0,
        fellBackToAll: false
      })
    ).toBe(false);

    expect(
      shouldFallbackMonitorEntityWorkbench({
        entityContextActive: true,
        statusWasImplicit: true,
        status: '2',
        totalElements: 2,
        fellBackToAll: false
      })
    ).toBe(false);
  });
});
