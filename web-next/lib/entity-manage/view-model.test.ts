import { describe, expect, it, vi } from 'vitest';
import { buildEntityMetrics, buildEntityRows, buildEntityTableRows, buildSelectedEntityRows, isEntityHealthyStatus } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });
const enT = createTranslatorMock({ locale: 'en-US' });

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

  it('uses localized fallback for missing entity row owner', () => {
    const rows = buildEntityRows(
      [
        {
          entity: {
            id: 2,
            displayName: 'Unowned Service',
            type: 'service',
            owner: '',
            environment: 'local'
          },
          monitorCount: 0,
          activeAlertCount: 0,
          lastEvidenceAt: null
        }
      ] as any,
      t,
      (type?: string | null) => (type === 'service' ? '服务' : '-'),
      (env?: string | null) => (env === 'local' ? '本地' : '-'),
      () => '无'
    );

    expect(rows[0].copy).toBe('服务 · 无 · 本地');
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
        statusTone: 'success',
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

  it('detects healthy entity statuses from raw entity data before localization', () => {
    expect(isEntityHealthyStatus('healthy')).toBe(true);
    expect(isEntityHealthyStatus('Healthy')).toBe(true);
    expect(isEntityHealthyStatus('up')).toBe(true);
    expect(isEntityHealthyStatus('normal')).toBe(true);
    expect(isEntityHealthyStatus('unhealthy')).toBe(false);
    expect(isEntityHealthyStatus('健康')).toBe(false);
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

  it('uses localized empty fallback for the unselected entity rail', () => {
    expect(
      buildSelectedEntityRows(
        null,
        t,
        (type?: string | null) => (type === 'service' ? '服务' : '-'),
        (status?: string | null) => (status === 'unknown' ? '未知' : '-')
      )
    ).toEqual([{ title: '还未选择实体', copy: '从列表选择实体后，这里会显示证据和操作上下文。', meta: '无' }]);
  });

  it('builds English evidence summary copy without localized fallbacks', () => {
    const metrics = buildEntityMetrics(
      [
        { activeAlertCount: 2, monitorCount: 4, relationCount: 1 },
        { activeAlertCount: 0, monitorCount: 3, relationCount: 2 }
      ] as any,
      enT
    );
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
      enT,
      (type?: string | null) => (type === 'service' ? 'Service' : '-'),
      (env?: string | null) => (env === 'local' ? 'Local' : '-'),
      () => '2026-04-10 18:00:00'
    );
    const selectedRows = buildSelectedEntityRows(
      {
        entity: { displayName: 'Checkout Service', type: 'service', status: 'unknown' },
        activeAlertCount: 2,
        identityCount: 3,
        monitorCount: 4,
        relationCount: 1,
        definitionActivitySummary: null
      } as any,
      enT,
      (type?: string | null) => (type === 'service' ? 'Service' : '-'),
      (status?: string | null) => (status === 'unknown' ? 'Unknown' : '-')
    );

    expect(metrics).toEqual([
      { label: 'Current page alerts', value: '2', tone: 'warning' },
      { label: 'Current page monitors', value: '7', tone: 'success' },
      { label: 'Current page relations', value: '3' }
    ]);
    expect(rows[0]?.meta).toBe('Monitors 4 · alerts 2 · evidence 2026-04-10 18:00:00');
    expect(selectedRows).toEqual([
      { title: 'Checkout Service', copy: 'Service · Unknown', meta: 'Alerts 2' },
      { title: 'Identity / monitors / relations', copy: '3 / 4 / 1', meta: 'Definition activity -' }
    ]);
    expect(
      [
        ...metrics.map(metric => metric.label),
        rows[0]?.meta,
        ...selectedRows.flatMap(row => [row.title, row.copy, row.meta])
      ].join('\n')
    ).not.toMatch(/[\u4e00-\u9fff]/);
  });
});
