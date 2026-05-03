import { describe, expect, it } from 'vitest';
import {
  buildStatusBrand,
  buildStatusComponentHistoryRows,
  buildStatusFacts,
  buildStatusIncidentCards,
  buildStatusIncidentYears,
  buildStatusMetrics,
  buildStatusOrgRows,
  buildStatusPosture,
  buildStatusRows,
  clampStatusIncidentYear,
  componentTone
} from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({
  locale: 'zh-CN',
  overrides: {
    'status.incidents.view': '事件历史视图',
    'status.incidents.copy': '查看最近的公开事件和恢复进展。',
  }
});

describe('status center view model', () => {
  it('maps component status to tone buckets', () => {
    expect(componentTone(0)).toBe('normal');
    expect(componentTone(1)).toBe('abnormal');
    expect(componentTone(2)).toBe('unknown');
    expect(componentTone(9)).toBe('unknown');
  });

  it('builds metrics from component and incident lists', () => {
    expect(
      buildStatusMetrics(
        [{ status: 0 }, { status: 3 }] as any,
        [{ id: 1 }] as any,
        t
      )
    ).toEqual([
      { label: '组件数', value: '2', tone: 'success' },
      { label: '正常', value: '1', tone: 'success' },
      { label: '事件数', value: '1', tone: 'warning' }
    ]);
  });

  it('builds status facts from the active mode', () => {
    expect(buildStatusFacts('incident', [{ id: 1 }] as any, [{ id: 7 }] as any, t as any)).toEqual([
      { label: '工作区', value: '状态页面' },
      { label: '组件数', value: '1' },
      { label: '事件数', value: '1' },
      { label: '当前视图', value: '事件历史视图' }
    ]);
  });

  it('builds component rows for component mode', () => {
    expect(
      buildStatusRows(
        'component',
        [{ name: 'api', status: 0, endpoint: '/health', latestTime: 1712730000000 }] as any,
        [],
        t,
        () => '2026-04-10 18:00:00'
      )
    ).toEqual([
      {
        title: 'api',
        copy: '/health',
        meta: '正常 · 2026-04-10 18:00:00'
      }
    ]);
  });

  it('builds incident rows for incident mode', () => {
    expect(
      buildStatusRows(
        'incident',
        [],
        [{
          id: 7,
          title: 'db outage',
          status: 2,
          updateTime: 1712730000000,
          contents: [{ message: '数据库延迟升高', timestamp: 1712730000000 }]
        }] as any,
        t,
        () => '2026-04-10 18:00:00'
      )
    ).toEqual([
      {
        title: 'db outage',
        copy: '数据库延迟升高',
        meta: '观察中 · 2026-04-10 18:00:00'
      }
    ]);
  });

  it('builds status org rows and public posture', () => {
    expect(buildStatusOrgRows('component', { name: 'Ops', description: 'Public board', state: 0 } as any, t)).toEqual([
      { title: 'Ops', copy: 'Public board', meta: '所有系统正常运行' },
      { title: '当前视图', copy: '组件健康视图', meta: '状态页面' }
    ]);

    expect(buildStatusPosture('incident', [{ id: 7 }] as any, t)).toEqual({
      title: '事件历史视图',
      copy: '查看最近的公开事件和恢复进展。',
      tone: 'danger'
    });
  });

  it('builds the public brand block and year selector options', () => {
    expect(
      buildStatusBrand(
        {
          name: 'HB Status',
          description: 'Public board',
          state: 1,
          home: 'https://hertzbeat.apache.org',
          feedback: 'ops@hertzbeat.apache.org',
          logo: 'https://hertzbeat.apache.org/logo.svg',
          color: '#123456',
          gmtUpdate: 1712730000000
        } as any,
        t,
        () => '2026-04-10 18:00:00'
      )
    ).toEqual({
      title: 'HB Status',
      subtitle: 'Public board',
      logo: 'https://hertzbeat.apache.org/logo.svg',
      color: '#123456',
      stateLabel: '部分系统运行异常',
      stateColor: '#e56c23',
      homeHref: 'https://hertzbeat.apache.org',
      feedbackHref: 'mailto:ops@hertzbeat.apache.org',
      homeLabel: '主页',
      feedbackLabel: '问题反馈',
      historyLabel: '历史',
      uptimeLabel: 'Uptime',
      updatedLabel: '更新于',
      updatedAt: '2026-04-10 18:00:00'
    });

    expect(buildStatusIncidentYears(2026, t, 3)).toEqual([
      { value: 2026, label: '年份 2026' },
      { value: 2025, label: '年份 2025' },
      { value: 2024, label: '年份 2024' }
    ]);

    expect(clampStatusIncidentYear(2031, 2026)).toBe(2026);
    expect(clampStatusIncidentYear(1965, 2026)).toBe(1970);
    expect(clampStatusIncidentYear(Number.NaN, 2026)).toBe(2026);
  });

  it('builds component history rows and incident cards from public payloads', () => {
    expect(
      buildStatusComponentHistoryRows(
        [
          {
            id: 7,
            name: 'API',
            description: 'public api',
            state: 0,
            latestTime: 1712730000000,
            history: [
              { timestamp: 1712640000000, state: 1, uptime: 0.84, abnormal: 10, normal: 50, unknowing: 2 },
              { timestamp: 1712730000000, state: 0, uptime: 0.99, abnormal: 1, normal: 70, unknowing: 0 }
            ]
          }
        ] as any,
        t,
        () => '2026-04-10 18:00:00'
      )
    ).toEqual([
      {
        key: '7',
        title: 'API',
        copy: 'public api',
        state: 0,
        statusLabel: '正常',
        latestTimeLabel: '2026-04-10 18:00:00',
        latestUptimeLabel: '99.00%',
        historyLabel: '组件历史',
        uptimeLabel: 'Uptime',
        history: [
          { timestamp: 1712730000000, state: 0, uptime: 0.99, abnormal: 1, normal: 70, unknowing: 0 },
          { timestamp: 1712640000000, state: 1, uptime: 0.84, abnormal: 10, normal: 50, unknowing: 2 }
        ],
        blocks: [
          {
            timestampLabel: '2026-04-10 18:00:00',
            uptimeLabel: '99.00%',
            title: '2026-04-10 18:00:00 · Uptime 99.00%',
            color: '#28a745'
          },
          {
            timestampLabel: '2026-04-10 18:00:00',
            uptimeLabel: '84.00%',
            title: '2026-04-10 18:00:00 · Uptime 84.00%',
            color: 'rgb(255, 252, 0)'
          }
        ]
      }
    ]);

    expect(
      buildStatusIncidentCards(
        [
          {
            id: 9,
            name: 'API degraded',
            state: 1,
            startTime: 1712720000000,
            updateTime: 1712730000000,
            contents: [
              { message: 'Investigating payment latency', state: 0, timestamp: 10 },
              { message: 'Monitoring progress', state: 2, timestamp: 20 }
            ]
          }
        ] as any,
        t,
        () => '2026-04-10 18:00:00'
      )
    ).toEqual([
      {
        key: '9',
        title: 'API degraded',
        copy: 'Monitoring progress',
        state: 1,
        stateLabel: '已确认',
        stateColor: '#e56c23',
        meta: '已确认 · 2026-04-10 18:00:00',
        rangeLabel: '事件范围 · 2026-04-10 18:00:00 → 2026-04-10 18:00:00',
        startAtLabel: '2026-04-10 18:00:00',
        updateAtLabel: '2026-04-10 18:00:00',
        contents: [
          {
            timestampLabel: '2026-04-10 18:00:00',
            stateLabel: '调查中',
            state: 0,
            stateColor: '#ff2f2f',
            message: 'Investigating payment latency'
          },
          {
            timestampLabel: '2026-04-10 18:00:00',
            stateLabel: '观察中',
            state: 2,
            stateColor: '#19a7e7',
            message: 'Monitoring progress'
          }
        ]
      }
    ]);
  });
});
