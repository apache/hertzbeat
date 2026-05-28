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
      { label: '当前页运行中', value: '2', tone: 'success' },
      { label: '当前页异常', value: '1', tone: 'danger' },
      { label: '当前页暂停', value: '1', tone: 'warning' }
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
        () => '异常'
      )
    ).toEqual([
      { title: 'mysql-prod', copy: 'checkout · 10.0.0.1', meta: '异常' },
      { title: '标签', copy: '1', meta: '更新时间 2026-04-10 18:00:00' }
    ]);
  });

  it('uses localized empty fallback for missing selected monitor rail meta', () => {
    expect(
      buildSelectedMonitorRows(
        null,
        t,
        () => '2026-04-10 18:00:00',
        () => '异常'
      )
    ).toEqual([{ title: '还未选择监控', copy: '从列表选择监控实例后，这里会显示操作和上下文。', meta: '无' }]);
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
        () => '正常'
      )
    ).toEqual([
      { title: 'orphan-monitor', copy: '无 · 无', meta: '正常' },
      { title: '标签', copy: '0', meta: '更新时间 2026-04-10 18:00:00' }
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
    ).toBe('当前没有关联监控，可回到遥测发现或编辑页补充监控。');

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
    ).toBe('当前没有异常监控，可继续核对已绑定监控的覆盖情况。');
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
