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
  currentStatusViewLabel,
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
  locale: 'zh-CN'
});
const enT = createTranslatorMock({ locale: 'en-US' });
const formattedAt = '2026-04-10 18:00:00';
const statusMeta = (stateLabel: string) => `${stateLabel} · ${formattedAt}`;
const incidentFallbackTitle = () => `${t('status.incident.default-title')} ${t('common.none')}`;
const historyBlockTitle = (uptimeLabel: string) => `${formattedAt} · ${statusPublicUptimeLabel(t)} ${uptimeLabel}`;

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
      { label: statusComponentsCountLabel(t), value: '2', tone: 'success' },
      { label: componentStateLabel(0, t), value: '1', tone: 'success' },
      { label: statusIncidentsCountLabel(t), value: '1', tone: 'warning' }
    ]);
  });

  it('builds status facts from the active mode', () => {
    expect(buildStatusFacts('incident', [{ id: 1 }] as any, [{ id: 7 }] as any, t as any)).toEqual([
      { label: t('common.workspace'), value: statusPageLabel(t) },
      { label: statusComponentsCountLabel(t), value: '1' },
      { label: statusIncidentsCountLabel(t), value: '1' },
      { label: statusViewLabel(t), value: currentStatusViewLabel('incident', t) }
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
        meta: statusMeta(componentStateLabel(0, t))
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
        copy: t('common.none'),
        meta: statusMeta(componentStateLabel(1, t))
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
          contents: [{ message: 'Database latency increased', timestamp: 1712730000000 }]
        }] as any,
        t,
        () => formattedAt
      )
    ).toEqual([
      {
        title: 'db outage',
        copy: 'Database latency increased',
        meta: statusMeta(incidentStateLabel(2, t))
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
        title: incidentFallbackTitle(),
        copy: 'Checking gateway errors',
        meta: statusMeta(incidentStateLabel(0, t))
      }
    ]);
  });

  it('uses runtime none fallback for status empty row meta', () => {
    expect(buildStatusRows('component', [], [], t, () => '2026-04-10 18:00:00')).toEqual([
      {
        title: t('status.components.empty.title'),
        copy: t('status.components.empty.copy'),
        meta: t('common.none')
      }
    ]);

    expect(buildStatusRows('incident', [], [], t, () => '2026-04-10 18:00:00')).toEqual([
      {
        title: t('status.incidents.empty.title'),
        copy: t('status.incidents.empty.copy'),
        meta: t('common.none')
      }
    ]);
  });

  it('builds status org rows and public posture', () => {
    expect(buildStatusOrgRows('component', { name: 'Ops', description: 'Public board', state: 0 } as any, t)).toEqual([
      { title: 'Ops', copy: 'Public board', meta: orgStateLabel(0, t) },
      { title: statusViewLabel(t), copy: currentStatusViewLabel('component', t), meta: statusPageLabel(t) }
    ]);

    expect(buildStatusPosture('incident', [{ id: 7 }] as any, t)).toEqual({
      title: currentStatusViewLabel('incident', t),
      copy: t('status.incidents.copy'),
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
      stateLabel: orgStateLabel(1, t),
      stateColor: '#e56c23',
      homeHref: 'https://hertzbeat.apache.org',
      feedbackHref: 'mailto:ops@hertzbeat.apache.org',
      homeLabel: statusPublicHomeLabel(t),
      feedbackLabel: statusPublicFeedbackLabel(t),
      historyLabel: statusPublicHistoryLabel(t),
      uptimeLabel: statusPublicUptimeLabel(t),
      updatedLabel: statusPublicUpdatedLabel(t),
      updatedAt: formattedAt
    });

    expect(buildStatusIncidentYears(2026, t, 3)).toEqual([
      { value: 2026, label: `${statusPublicYearLabel(t)} 2026` },
      { value: 2025, label: `${statusPublicYearLabel(t)} 2025` },
      { value: 2024, label: `${statusPublicYearLabel(t)} 2024` }
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
        () => formattedAt
      )
    ).toEqual([
      {
        key: '7',
        title: 'API',
        copy: 'public api',
        state: 0,
        tone: 'success',
        statusLabel: componentStateLabel(0, t),
        latestTimeLabel: formattedAt,
        latestUptimeLabel: '99.00%',
        historyLabel: statusPublicComponentHistoryLabel(t),
        uptimeLabel: statusPublicUptimeLabel(t),
        history: [
          { timestamp: 1712730000000, state: 0, uptime: 0.99, abnormal: 1, normal: 70, unknowing: 0 },
          { timestamp: 1712640000000, state: 1, uptime: 0.84, abnormal: 10, normal: 50, unknowing: 2 }
        ],
        blocks: [
          {
            timestampLabel: formattedAt,
            uptimeLabel: '99.00%',
            title: historyBlockTitle('99.00%'),
            color: '#28a745'
          },
          {
            timestampLabel: formattedAt,
            uptimeLabel: '84.00%',
            title: historyBlockTitle('84.00%'),
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
        () => formattedAt
      )
    ).toEqual([
      {
        key: '9',
        title: 'API degraded',
        copy: 'Monitoring progress',
        state: 1,
        tone: 'default',
        stateLabel: incidentStateLabel(1, t),
        stateColor: '#e56c23',
        meta: statusMeta(incidentStateLabel(1, t)),
        rangeLabel: `${statusPublicIncidentRangeLabel(t)} · ${formattedAt} → ${formattedAt}`,
        startAtLabel: formattedAt,
        updateAtLabel: formattedAt,
        contents: [
          {
            timestampLabel: formattedAt,
            stateLabel: incidentStateLabel(0, t),
            state: 0,
            tone: 'danger',
            stateColor: '#ff2f2f',
            message: 'Investigating payment latency'
          },
          {
            timestampLabel: formattedAt,
            stateLabel: incidentStateLabel(2, t),
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
        () => formattedAt
      )[0].contents[0]
    ).toEqual({
      timestampLabel: formattedAt,
      stateLabel: t('common.none'),
      state: null,
      tone: 'default',
      stateColor: '#6b7280',
      message: 'Waiting for upstream confirmation'
    });
  });

  it('prefers normalized public incident create time over raw start time', () => {
    const labels = buildStatusIncidentCards(
      [
        {
          id: 12,
          title: 'Archive incident',
          state: 3,
          startTime: 1776851621157,
          createTime: 1739324100000,
          updateTime: 1739328300000,
          contents: [{ message: 'Recovered', state: 3, timestamp: 1739328300000 }]
        }
      ] as any,
      t,
      value => `time:${value}`
    )[0];

    expect(labels.startAtLabel).toBe('time:1739324100000');
    expect(labels.rangeLabel).toContain('time:1739324100000');
    expect(labels.rangeLabel).not.toContain('time:1776851621157');
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
      title: incidentFallbackTitle(),
      copy: 'Checking public impact',
      stateLabel: incidentStateLabel(0, t)
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
        () => formattedAt
      )[0]
    ).toMatchObject({
      key: '11',
      title: 'Gateway',
      copy: '/ready',
      latestUptimeLabel: t('common.none'),
      blocks: [
        {
          timestampLabel: formattedAt,
          uptimeLabel: t('common.none'),
          title: historyBlockTitle(t('common.none'))
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
    ).toBe(t('common.none'));
  });
});
