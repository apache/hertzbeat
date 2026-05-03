import { describe, expect, it, vi } from 'vitest';
import { buildEntityMetrics, buildEntityRows, buildEntityTableRows, buildSelectedEntityRows } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('entity view model', () => {
  it('builds entity metrics from current page data', () => {
    expect(
      buildEntityMetrics(
        [
          { activeAlertCount: 2, monitorCount: 4, relationCount: 1 },
          { activeAlertCount: 0, monitorCount: 3, relationCount: 2 }
        ] as any,
        t
      )
    ).toEqual([
      { label: '当前页告警', value: '2', tone: 'warning' },
      { label: '当前页监控', value: '7', tone: 'success' },
      { label: '当前页关系', value: '3' }
    ]);
  });

  it('builds entity list rows', () => {
    const rows = buildEntityRows(
      [
        {
          entity: {
            id: 1,
            displayName: 'Checkout Service',
            type: 'service',
            owner: 'ops',
            environment: 'local'
          },
          monitorCount: 4,
          activeAlertCount: 2,
          lastEvidenceAt: 1712730000000
        }
      ] as any,
      t,
      (type?: string | null) => (type === 'service' ? '服务' : '-'),
      (env?: string | null) => (env === 'local' ? '本地' : '-'),
      () => '2026-04-10 18:00:00'
    );

    expect(rows).toEqual([
      {
        key: '1',
        title: 'Checkout Service',
        copy: '服务 · ops · 本地',
        meta: '监控 4 · 告警 2 · 证据 2026-04-10 18:00:00'
      }
    ]);
  });

  it('builds HertzBeat-native entity table rows with lightweight health affordances', () => {
    expect(
      buildEntityTableRows(
        [
          {
            entity: {
              id: 1,
              displayName: 'Checkout Service',
              type: 'service',
              status: 'healthy',
              environment: 'local'
            },
            monitorCount: 4,
            activeAlertCount: 2,
            relationCount: 1,
            lastEvidenceAt: 1712730000000
          }
        ] as any,
        t,
        (type?: string | null) => (type === 'service' ? '服务' : '-'),
        (env?: string | null) => (env === 'local' ? '本地' : '-'),
        (status?: string | null) => status || '-',
        () => '2026-04-10 18:00:00'
      )
    ).toEqual([
      {
        key: '1',
        name: 'Checkout Service',
        type: '服务',
        environment: '本地',
        status: 'healthy',
        health: {
          score: 84,
          scoreText: '84 / 100',
          label: '健康评分 84',
          copy: '采集 4 / 4 健康',
          meta: '告警 2 · 异常 0',
          tone: 'warning'
        },
        monitorCount: '4',
        activeAlertCount: '2',
        relationCount: '1',
        updatedAt: '2026-04-10 18:00:00',
        href: '/entities/1'
      }
    ]);
  });

  it('builds selected entity summary rows', () => {
    expect(
      buildSelectedEntityRows(
        {
          entity: { displayName: 'Checkout Service', type: 'service', status: 'unknown' },
          activeAlertCount: 2,
          identityCount: 3,
          monitorCount: 4,
          relationCount: 1,
          definitionActivitySummary: null
        } as any,
        t,
        (type?: string | null) => (type === 'service' ? '服务' : '-'),
        (status?: string | null) => (status === 'unknown' ? '未知' : '-')
      )
    ).toEqual([
      { title: 'Checkout Service', copy: '服务 · 未知', meta: '告警 2' },
      { title: '身份 / 监控 / 关系', copy: '3 / 4 / 1', meta: '定义活动 -' }
    ]);
  });
});
