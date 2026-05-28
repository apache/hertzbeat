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
import {
  componentStateLabel,
  incidentStateLabel,
  orgStateLabel,
  statusIncidentPublicStartAtLabel,
  statusIncidentPublicUpdateAtLabel,
  statusComponentsCountLabel,
  statusComponentsLabel,
  statusFieldLabel,
  statusIncidentsCountLabel,
  statusIncidentsLabel,
  statusOrganizationCopy,
  statusOrganizationFallback,
  statusOrganizationLabel,
  statusOrganizationStateLabel,
  statusPageLabel,
  statusPublicComponentHistoryLabel,
  statusPublicFeedbackLabel,
  statusPublicHistoryLabel,
  statusPublicHomeLabel,
  statusPublicIncidentRangeLabel,
  statusPublicPoweredByLabel,
  statusPublicThirtyDayLabel,
  statusPublicTodayLabel,
  statusPublicToComponentLabel,
  statusPublicToIncidentLabel,
  statusPublicUpdatedLabel,
  statusPublicUptimeLabel,
  statusPublicYearLabel,
  statusSettingLabel,
  statusViewLabel
} from './display';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({
  locale: 'zh-CN',
  overrides: {
    'status.incident.default-title': '事件',
    'status.components.empty.title': '还没有组件',
    'status.components.empty.copy': '配置完成后，公开状态页组件会显示在这里。',
    'status.incidents.empty.title': '还没有事件',
    'status.incidents.empty.copy': '发布事件更新后，公开事件历史会显示在这里。',
    'status.incidents.view': '事件历史视图',
    'status.incidents.copy': '查看最近的公开事件和恢复进展。',
  }
});
const enT = createTranslatorMock({ locale: 'en-US' });

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

  it('uses runtime none fallback for status component rows without description or endpoint', () => {
    expect(
      buildStatusRows(
        'component',
        [{ name: 'queue', status: 1, latestTime: 1712730000000 }] as any,
        [],
        t,
        () => '2026-04-10 18:00:00'
      )
    ).toEqual([
      {
        title: 'queue',
        copy: '无',
        meta: '异常 · 2026-04-10 18:00:00'
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

  it('uses runtime none fallback for status incident rows without title or id', () => {
    expect(
      buildStatusRows(
        'incident',
        [],
        [{
          status: 0,
          updateTime: 1712730000000,
          contents: [{ message: 'Checking gateway errors', timestamp: 1712730000000 }]
        }] as any,
        t,
        () => '2026-04-10 18:00:00'
      )
    ).toEqual([
      {
        title: '事件 无',
        copy: 'Checking gateway errors',
        meta: '调查中 · 2026-04-10 18:00:00'
      }
    ]);
  });

  it('uses runtime none fallback for status empty row meta', () => {
    expect(buildStatusRows('component', [], [], t, () => '2026-04-10 18:00:00')).toEqual([
      {
        title: '还没有组件',
        copy: '配置完成后，公开状态页组件会显示在这里。',
        meta: '无'
      }
    ]);

    expect(buildStatusRows('incident', [], [], t, () => '2026-04-10 18:00:00')).toEqual([
      {
        title: '还没有事件',
        copy: '发布事件更新后，公开事件历史会显示在这里。',
        meta: '无'
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

  it('keeps English incident posture locale copy without localized fallback text', () => {
    const copy = enT('status.incidents.posture');

    expect(copy).toBe('Focus the public incident history entry.');
    expect(copy).not.toMatch(/[\u4e00-\u9fff]/);
  });

  it('uses English runtime fallbacks for public status history labels when translations are missing', () => {
    const missingTranslator = (key: string) => key;

    expect(statusPublicHomeLabel(missingTranslator)).toBe('Home');
    expect(statusPublicFeedbackLabel(missingTranslator)).toBe('Feedback');
    expect(statusPublicYearLabel(missingTranslator)).toBe('Year');
    expect(statusPublicHistoryLabel(missingTranslator)).toBe('History');
    expect(statusPublicUptimeLabel(missingTranslator)).toBe('Uptime');
    expect(statusPublicUpdatedLabel(missingTranslator)).toBe('Updated');
    expect(statusPublicComponentHistoryLabel(missingTranslator)).toBe('Component history');
    expect(statusPublicIncidentRangeLabel(missingTranslator)).toBe('Incident range');
    expect(statusPublicTodayLabel(missingTranslator)).toBe('Today');
    expect(statusPublicThirtyDayLabel(missingTranslator)).toBe('30 days');
    expect(statusPublicPoweredByLabel(missingTranslator)).toBe('Powered by HertzBeat');
    expect(statusPublicToIncidentLabel(missingTranslator)).toBe('Incident History');
    expect(statusPublicToComponentLabel(missingTranslator)).toBe('Status Page');
    expect(statusIncidentPublicStartAtLabel(missingTranslator)).toBe('Start At');
    expect(statusIncidentPublicUpdateAtLabel(missingTranslator)).toBe('Update At');
  });

  it('uses English runtime fallbacks for status center admin and fact labels when translations are missing', () => {
    const missingTranslator = (key: string) => key;

    expect(statusPageLabel(missingTranslator)).toBe('Status Page');
    expect(statusSettingLabel(missingTranslator)).toBe('Status page settings');
    expect(statusComponentsLabel(missingTranslator)).toBe('Components');
    expect(statusIncidentsLabel(missingTranslator)).toBe('Incidents');
    expect(statusOrganizationLabel(missingTranslator)).toBe('Org profile');
    expect(statusOrganizationStateLabel(missingTranslator)).toBe('Org state');
    expect(statusViewLabel(missingTranslator)).toBe('Current view');
    expect(statusFieldLabel(missingTranslator)).toBe('Status');
    expect(statusComponentsCountLabel(missingTranslator)).toBe('Components');
    expect(statusIncidentsCountLabel(missingTranslator)).toBe('Incidents');
    expect(statusOrganizationCopy(missingTranslator)).toBe('Configure the public org information shown on the status page.');
    expect(statusOrganizationFallback(missingTranslator)).toBe('Unnamed status org');
  });

  it('uses English runtime fallbacks for status center state labels when translations are missing', () => {
    const missingTranslator = (key: string) => key;

    expect(componentStateLabel(0, missingTranslator)).toBe('Normal');
    expect(componentStateLabel(1, missingTranslator)).toBe('Abnormal');
    expect(componentStateLabel(2, missingTranslator)).toBe('Unknown');
    expect(incidentStateLabel(0, missingTranslator)).toBe('Investigating');
    expect(incidentStateLabel(1, missingTranslator)).toBe('Identified');
    expect(incidentStateLabel(2, missingTranslator)).toBe('Monitoring');
    expect(incidentStateLabel(3, missingTranslator)).toBe('Resolved');
    expect(orgStateLabel(0, missingTranslator)).toBe('All Systems Operational');
    expect(orgStateLabel(1, missingTranslator)).toBe('Some Systems Abnormal');
    expect(orgStateLabel(2, missingTranslator)).toBe('All Systems Abnormal');
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
      uptimeLabel: '可用率',
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
        tone: 'success',
        statusLabel: '正常',
        latestTimeLabel: '2026-04-10 18:00:00',
        latestUptimeLabel: '99.00%',
        historyLabel: '组件历史',
        uptimeLabel: '可用率',
        history: [
          { timestamp: 1712730000000, state: 0, uptime: 0.99, abnormal: 1, normal: 70, unknowing: 0 },
          { timestamp: 1712640000000, state: 1, uptime: 0.84, abnormal: 10, normal: 50, unknowing: 2 }
        ],
        blocks: [
          {
            timestampLabel: '2026-04-10 18:00:00',
            uptimeLabel: '99.00%',
            title: '2026-04-10 18:00:00 · 可用率 99.00%',
            color: '#28a745'
          },
          {
            timestampLabel: '2026-04-10 18:00:00',
            uptimeLabel: '84.00%',
            title: '2026-04-10 18:00:00 · 可用率 84.00%',
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
        tone: 'default',
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
            tone: 'danger',
            stateColor: '#ff2f2f',
            message: 'Investigating payment latency'
          },
          {
            timestampLabel: '2026-04-10 18:00:00',
            stateLabel: '观察中',
            state: 2,
            tone: 'default',
            stateColor: '#19a7e7',
            message: 'Monitoring progress'
          }
        ]
      }
    ]);
  });

  it('uses runtime none fallback for incident content without state', () => {
    expect(
      buildStatusIncidentCards(
        [
          {
            id: 10,
            title: 'API latency',
            state: 2,
            updateTime: 1712730000000,
            contents: [{ message: 'Waiting for upstream confirmation', timestamp: 1712730000000 }]
          }
        ] as any,
        t,
        () => '2026-04-10 18:00:00'
      )[0].contents[0]
    ).toEqual({
      timestampLabel: '2026-04-10 18:00:00',
      stateLabel: '无',
      state: null,
      tone: 'default',
      stateColor: '#6b7280',
      message: 'Waiting for upstream confirmation'
    });
  });

  it('uses runtime none fallback for public incident cards without title, name, or id', () => {
    expect(
      buildStatusIncidentCards(
        [
          {
            state: 0,
            updateTime: 1712730000000,
            contents: [{ message: 'Checking public impact', timestamp: 1712730000000 }]
          }
        ] as any,
        t,
        () => '2026-04-10 18:00:00'
      )[0]
    ).toMatchObject({
      key: 'incident',
      title: '事件 无',
      copy: 'Checking public impact',
      stateLabel: '调查中'
    });
  });

  it('uses runtime none fallback for component history without uptime', () => {
    expect(
      buildStatusComponentHistoryRows(
        [
          {
            id: 11,
            name: 'Gateway',
            endpoint: '/ready',
            state: 1,
            latestTime: 1712730000000,
            history: [{ timestamp: 1712730000000, state: 2 }]
          }
        ] as any,
        t,
        () => '2026-04-10 18:00:00'
      )[0]
    ).toMatchObject({
      key: '11',
      title: 'Gateway',
      copy: '/ready',
      latestUptimeLabel: '无',
      blocks: [
        {
          timestampLabel: '2026-04-10 18:00:00',
          uptimeLabel: '无',
          title: '2026-04-10 18:00:00 · 可用率 无'
        }
      ]
    });
  });

  it('uses runtime none fallback for component history without description or endpoint', () => {
    expect(
      buildStatusComponentHistoryRows(
        [
          {
            id: 12,
            name: 'Worker',
            state: 0,
            latestTime: 1712730000000,
            history: [{ timestamp: 1712730000000, state: 0, uptime: 1 }]
          }
        ] as any,
        t,
        () => '2026-04-10 18:00:00'
      )[0].copy
    ).toBe('无');
  });
});
