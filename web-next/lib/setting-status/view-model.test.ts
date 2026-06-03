import { describe, expect, it, vi } from 'vitest';
import {
  incidentStateLabel,
  orgStateLabel,
  statusComponentsCountLabel,
  statusComponentsLabel,
  statusIncidentsCountLabel,
  statusIncidentsLabel,
  statusOrganizationCopy,
  statusOrganizationLabel,
  statusOrganizationStateLabel,
  statusSettingLabel
} from '../status-center/display';
import {
  buildStatusComponentDraft,
  buildStatusComponentEvidenceRows,
  buildStatusComponentPayload,
  buildStatusFacts,
  buildStatusIncidentDraft,
  buildStatusIncidentEvidenceRows,
  buildStatusIncidentPayload,
  buildStatusMetrics,
  buildStatusOrgDraft,
  buildStatusOrgOverviewRows,
  buildStatusOrgPayload,
  buildStatusRows,
  settingStatusComponentTagTone,
  settingStatusIncidentTagTone,
  stateLabel,
  validateStatusComponentDraft,
  validateStatusIncidentDraft,
  validateStatusOrgDraft
} from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock();
const zhT = createTranslatorMock({ locale: 'zh-CN' });
const formattedAt = '2026-04-10 18:00:00';
const componentMeta = (translator: typeof t, state: number) => `${stateLabel(state, translator)} · ${formattedAt}`;
const incidentMeta = (translator: typeof t, state: number, componentCount: number) =>
  `${incidentStateLabel(state, translator)} · ${statusComponentsLabel(translator)} ${componentCount} · ${formattedAt}`;
const incidentFallbackTitle = (translator: typeof t) =>
  `${translator('setting.status.incidents.item.fallback')} ${translator('common.none')}`;

describe('setting status view model', () => {
  it('maps state labels', () => {
    expect(stateLabel(0, t)).toBe('Normal');
    expect(stateLabel(1, t)).toBe('Abnormal');
    expect(stateLabel(2, t)).toBe('Unknown');
    expect(stateLabel(0, zhT)).toBe(zhT('status.component.state.0'));
    expect(stateLabel(undefined, t)).toBe('-');
  });

  it('maps admin status tag tones from normalized state values', () => {
    expect(settingStatusComponentTagTone(0)).toBe('ok');
    expect(settingStatusComponentTagTone('degraded')).toBe('bad');
    expect(settingStatusComponentTagTone(undefined)).toBe('neutral');

    expect(settingStatusIncidentTagTone('investigating')).toBe('bad');
    expect(settingStatusIncidentTagTone(1)).toBe('warn');
    expect(settingStatusIncidentTagTone(2)).toBe('warn');
    expect(settingStatusIncidentTagTone('resolved')).toBe('ok');
    expect(settingStatusIncidentTagTone(undefined)).toBe('neutral');
  });

  it('builds status facts', () => {
    expect(buildStatusFacts({ name: 'HB Status' } as any, [{}, {}] as any, { totalElements: 3 } as any, t)).toEqual([
      { label: t('common.workspace'), value: statusSettingLabel(t) },
      { label: statusOrganizationLabel(t), value: 'HB Status' },
      { label: statusComponentsCountLabel(t), value: '2' },
      { label: statusIncidentsCountLabel(t), value: '3' }
    ]);
  });

  it('builds status metrics', () => {
    expect(buildStatusMetrics([{ id: 1 }, { id: 2 }] as any, { totalElements: 1 } as any, { state: 1 } as any, t)).toEqual([
      { label: statusComponentsLabel(t), value: '2', tone: 'success' },
      { label: statusIncidentsLabel(t), value: '1', tone: 'warning' },
      { label: statusOrganizationStateLabel(t), value: orgStateLabel(1, t) }
    ]);
  });

  it('builds component rows', () => {
    expect(
      buildStatusRows(
        'component',
        [{ name: 'API', description: 'public api', state: 0, gmtUpdate: 1712730000000 }] as any,
        { content: [] } as any,
        t,
        () => formattedAt
      )
    ).toEqual([
      { title: 'API', copy: 'public api', meta: componentMeta(t, 0) }
    ]);
  });

  it('uses runtime none fallback for setting status component rows without descriptions', () => {
    expect(
      buildStatusRows(
        'component',
        [{ name: 'API', state: 1, gmtUpdate: 1712730000000 }] as any,
        { content: [] } as any,
        zhT,
        () => formattedAt
      )
    ).toEqual([
      { title: 'API', copy: zhT('common.none'), meta: componentMeta(zhT, 1) }
    ]);
  });

  it('uses runtime none fallback for setting status empty row meta', () => {
    expect(
      buildStatusRows(
        'component',
        [],
        { content: [] } as any,
        zhT,
        () => formattedAt
      )
    ).toEqual([
      { title: zhT('setting.status.components.empty.title'), copy: zhT('setting.status.components.empty.copy'), meta: zhT('common.none') }
    ]);

    expect(
      buildStatusRows(
        'incident',
        [],
        { content: [] } as any,
        zhT,
        () => formattedAt
      )
    ).toEqual([
      { title: zhT('setting.status.incidents.empty.title'), copy: zhT('setting.status.incidents.empty.copy'), meta: zhT('common.none') }
    ]);
  });

  it('builds selectable component evidence rows', () => {
    expect(
      buildStatusComponentEvidenceRows(
        [{ id: 7, name: 'API', description: 'public api', state: 0, gmtUpdate: 1712730000000 }] as any,
        t,
        () => formattedAt
      )
    ).toEqual([
      { key: '7', title: 'API', copy: 'public api', meta: componentMeta(t, 0) }
    ]);
  });

  it('uses runtime none fallback for setting status component evidence without descriptions', () => {
    expect(
      buildStatusComponentEvidenceRows(
        [{ id: 8, name: 'Worker', state: 0, gmtUpdate: 1712730000000 }] as any,
        zhT,
        () => formattedAt
      )
    ).toEqual([
      { key: '8', title: 'Worker', copy: zhT('common.none'), meta: componentMeta(zhT, 0) }
    ]);
  });

  it('builds incident evidence rows and payloads', () => {
    expect(
      buildStatusIncidentEvidenceRows(
        {
          content: [{
            id: 9,
            name: 'API degraded',
            state: 1,
            components: [{ id: 7 }],
            contents: [{ message: 'Investigating payment latency', state: 1, timestamp: 10 }],
            gmtUpdate: 1712730000000
          }],
          totalElements: 1
        } as any,
        t,
        () => formattedAt
      )
    ).toEqual([
      {
        key: '9',
        title: 'API degraded',
        copy: 'Investigating payment latency',
        meta: incidentMeta(t, 1, 1)
      }
    ]);

    expect(
      buildStatusIncidentDraft({
        id: 9,
        orgId: 1,
        name: 'API degraded',
        state: 1,
        components: [{ id: 7 }, { id: 8 }],
        contents: [
          { message: 'Investigating', state: 1, timestamp: 10 },
          { message: 'Monitoring mitigation', state: 2, timestamp: 30 }
        ]
      } as any)
    ).toEqual({
      id: 9,
      orgId: 1,
      name: 'API degraded',
      state: '1',
      componentIdsText: '7, 8',
      message: 'Monitoring mitigation',
      existingContents: [
        { message: 'Monitoring mitigation', state: 2, timestamp: 30 },
        { message: 'Investigating', state: 1, timestamp: 10 }
      ],
      startTime: null,
      endTime: null
    });

    const payload = buildStatusIncidentPayload(
      {
        name: 'API degraded',
        state: '2',
        componentIdsText: '7',
        message: 'Monitoring',
        existingContents: [],
      },
      [{ id: 7, name: 'API' }] as any
    );
    expect(payload).toMatchObject({
      name: 'API degraded',
      state: 2,
      components: [{ id: 7, name: 'API' }],
      contents: [{ message: 'Monitoring', state: 2 }]
    });

    expect(validateStatusIncidentDraft({ name: '', state: '0', componentIdsText: '', message: '' }, t)).toBe(t('setting.status.validation.incident-name'));
    expect(validateStatusIncidentDraft({ name: 'API degraded', state: '0', componentIdsText: '', message: '' }, t)).toBe(t('setting.status.validation.incident-components'));
    expect(validateStatusIncidentDraft({ name: 'API degraded', state: '0', componentIdsText: '7', message: '' }, t)).toBe(t('setting.status.validation.incident-message'));
    expect(validateStatusIncidentDraft({ name: 'API degraded', state: '0', componentIdsText: '7', message: 'Investigating' }, t)).toBeNull();
  });

  it('appends status incident content with the selected state and incident id', () => {
    const now = 1779753000000;
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(now);

    try {
      const payload = buildStatusIncidentPayload(
        {
          id: 9,
          orgId: 1,
          name: 'API degraded',
          state: '3',
          componentIdsText: '7, 8',
          message: 'Resolved after rollback',
          existingContents: [{ id: 8, incidentId: 9, message: 'Identified bad deploy', state: 1, timestamp: 1000 }],
          startTime: 500,
          endTime: null
        },
        [
          { id: 7, name: 'API' },
          { id: 8, name: 'Checkout' },
          { id: 12, name: 'Database' }
        ] as any
      );

      expect(payload).toMatchObject({
        id: 9,
        orgId: 1,
        name: 'API degraded',
        state: 3,
        startTime: 500,
        endTime: now,
        components: [
          { id: 7, name: 'API' },
          { id: 8, name: 'Checkout' }
        ],
        contents: [
          { id: 8, incidentId: 9, message: 'Identified bad deploy', state: 1, timestamp: 1000 },
          { incidentId: 9, message: 'Resolved after rollback', state: 3, timestamp: now }
        ]
      });
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('uses runtime none fallback for setting status incident titles without id', () => {
    const incidentWithoutIdentity = {
      state: 1,
      components: [],
      contents: [{ message: 'Investigating', state: 1, timestamp: 10 }],
      gmtUpdate: 1712730000000
    };

    expect(
      buildStatusRows(
        'incident',
        [],
        { content: [incidentWithoutIdentity] } as any,
        zhT,
        () => formattedAt
      )
    ).toEqual([
      {
        title: incidentFallbackTitle(zhT),
        copy: 'Investigating',
        meta: incidentMeta(zhT, 1, 0)
      }
    ]);

    expect(
      buildStatusIncidentEvidenceRows(
        { content: [incidentWithoutIdentity], totalElements: 1 } as any,
        zhT,
        () => formattedAt
      )
    ).toEqual([
      {
        key: 'incident',
        title: incidentFallbackTitle(zhT),
        copy: 'Investigating',
        meta: incidentMeta(zhT, 1, 0)
      }
    ]);
  });

  it('builds localized org overview rows and zh-CN summaries', () => {
    expect(
      buildStatusOrgOverviewRows(
        {
          name: 'HB Status',
          description: '',
          state: 0,
          home: 'https://hertzbeat.apache.org',
          feedback: 'mailto:ops@hertzbeat.apache.org',
          gmtUpdate: 1712730000000
        } as any,
        t,
        () => formattedAt
      )
    ).toEqual([
      {
        title: 'HB Status',
        copy: statusOrganizationCopy(t),
        meta: 'All Systems Operational'
      },
      {
        title: 'Feedback',
        copy: 'https://hertzbeat.apache.org · mailto:ops@hertzbeat.apache.org',
        meta: formattedAt
      }
    ]);

    expect(buildStatusFacts({ name: 'HB Status' } as any, [{}] as any, { totalElements: 1 } as any, zhT)).toEqual([
      { label: zhT('common.workspace'), value: statusSettingLabel(zhT) },
      { label: statusOrganizationLabel(zhT), value: 'HB Status' },
      { label: statusComponentsCountLabel(zhT), value: '1' },
      { label: statusIncidentsCountLabel(zhT), value: '1' }
    ]);

    expect(buildStatusMetrics([{ id: 1 }] as any, { totalElements: 1 } as any, { state: 1 } as any, zhT)).toEqual([
      { label: statusComponentsLabel(zhT), value: '1', tone: 'success' },
      { label: statusIncidentsLabel(zhT), value: '1', tone: 'warning' },
      { label: statusOrganizationStateLabel(zhT), value: orgStateLabel(1, zhT) }
    ]);

    expect(
      buildStatusIncidentEvidenceRows(
        {
          content: [{
            id: 9,
            name: 'Payment API jitter',
            state: 1,
            components: [{ id: 7 }],
            contents: [{ message: 'Investigating', state: 1, timestamp: 10 }],
            gmtUpdate: 1712730000000
          }],
          totalElements: 1
        } as any,
        zhT,
        () => formattedAt
      )
    ).toEqual([
      {
        key: '9',
        title: 'Payment API jitter',
        copy: 'Investigating',
        meta: incidentMeta(zhT, 1, 1)
      }
    ]);
  });

  it('uses runtime none fallback for setting status org overview links', () => {
    expect(
      buildStatusOrgOverviewRows(
        {
          name: 'HB Status',
          description: 'Public status overview',
          state: 0,
          home: '',
          feedback: '   ',
          gmtUpdate: 1712730000000
        } as any,
        t,
        () => formattedAt
      )
    ).toEqual([
      {
        title: 'HB Status',
        copy: 'Public status overview',
        meta: 'All Systems Operational'
      },
      {
        title: 'Feedback',
        copy: 'None · None',
        meta: formattedAt
      }
    ]);
  });

  it('builds and validates the status org draft', () => {
    expect(buildStatusOrgDraft({ id: 1, name: 'HB', state: 1, description: 'desc', home: 'https://home', feedback: 'https://feedback', logo: 'https://logo', color: '#fff' } as any)).toEqual({
      id: 1,
      name: 'HB',
      state: '1',
      description: 'desc',
      home: 'https://home',
      feedback: 'https://feedback',
      logo: 'https://logo',
      color: '#fff'
    });

    expect(buildStatusOrgPayload(buildStatusOrgDraft({ id: 1, name: 'HB', state: 1, description: 'desc' } as any))).toEqual({
      id: 1,
      name: 'HB',
      state: 1,
      description: 'desc',
      home: '',
      feedback: '',
      logo: '',
      color: ''
    });

    expect(validateStatusOrgDraft(buildStatusOrgDraft(null), t)).toBe(t('setting.status.validation.name'));
    expect(validateStatusOrgDraft({ ...buildStatusOrgDraft(null), name: 'HB' }, t)).toBe(t('setting.status.validation.description'));
    expect(validateStatusOrgDraft({ ...buildStatusOrgDraft(null), name: 'HB', description: 'desc' }, t)).toBeNull();
  });

  it('builds and validates the status component draft', () => {
    expect(
      buildStatusComponentDraft({
        id: 7,
        orgId: 1,
        name: 'API',
        description: 'public api',
        labels: { env: 'prod' },
        method: 1,
        configState: 2,
        state: 0
      } as any)
    ).toEqual({
      id: 7,
      orgId: 1,
      name: 'API',
      description: 'public api',
      labelsText: 'env:prod',
      method: '1',
      configState: '2',
      state: '0'
    });

    expect(
      buildStatusComponentPayload({
        id: 7,
        orgId: 1,
        name: 'API',
        description: 'public api',
        labelsText: 'env:prod, team:platform',
        method: '1',
        configState: '2',
        state: '0'
      })
    ).toEqual({
      id: 7,
      orgId: 1,
      name: 'API',
      description: 'public api',
      labels: { env: 'prod', team: 'platform' },
      method: 1,
      configState: 2,
      state: 0
    });

    expect(validateStatusComponentDraft(buildStatusComponentDraft(null), t)).toBe(t('setting.status.validation.component-name'));
    expect(validateStatusComponentDraft({ ...buildStatusComponentDraft(null), name: 'API' }, t)).toBe(t('setting.status.validation.component-description'));
    expect(validateStatusComponentDraft({ ...buildStatusComponentDraft(null), name: 'API', description: 'public api' }, t)).toBeNull();
  });
});
