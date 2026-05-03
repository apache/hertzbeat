import { describe, expect, it } from 'vitest';
import { buildStatusComponentDraft, buildStatusComponentEvidenceRows, buildStatusComponentPayload, buildStatusFacts, buildStatusIncidentDraft, buildStatusIncidentEvidenceRows, buildStatusIncidentPayload, buildStatusMetrics, buildStatusOrgDraft, buildStatusOrgOverviewRows, buildStatusOrgPayload, buildStatusRows, stateLabel, validateStatusComponentDraft, validateStatusIncidentDraft, validateStatusOrgDraft } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({
  overrides: {
    'setting.status.title': 'Status page settings',
    'setting.status.org.title': 'Org profile',
    'setting.status.components.title': 'Components',
    'setting.status.incidents.title': 'Incidents',
    'setting.status.org.state': 'Org state',
    'setting.status.org.copy': 'Configure the public org information shown on the status page.',
    'setting.status.org.fallback': 'Unnamed status org',
    'setting.status.org.feedback': 'Feedback'
  }
});

const zhT = createTranslatorMock({
  locale: 'zh-CN',
  overrides: {
    'setting.status.title': '状态页设置',
    'setting.status.org.title': '组织档案',
    'setting.status.components.title': '组件',
    'setting.status.incidents.title': '事件',
    'setting.status.org.state': '组织状态',
    'setting.status.org.copy': '配置公开状态页展示的组织信息。',
    'setting.status.org.fallback': '未命名状态组织',
    'setting.status.org.feedback': '反馈入口'
  }
});

describe('setting status view model', () => {
  it('maps state labels', () => {
    expect(stateLabel(0)).toBe('Normal');
    expect(stateLabel(1)).toBe('Abnormal');
    expect(stateLabel(2)).toBe('Unknown');
    expect(stateLabel(0, zhT)).toBe('正常');
    expect(stateLabel(undefined)).toBe('-');
  });

  it('builds status facts', () => {
    expect(buildStatusFacts({ name: 'HB Status' } as any, [{}, {}] as any, { totalElements: 3 } as any, t)).toEqual([
      { label: 'Workspace', value: 'Status page settings' },
      { label: 'Org profile', value: 'HB Status' },
      { label: 'Components', value: '2' },
      { label: 'Incidents', value: '3' }
    ]);
  });

  it('builds status metrics', () => {
    expect(buildStatusMetrics([{ id: 1 }, { id: 2 }] as any, { totalElements: 1 } as any, { state: 1 } as any, t)).toEqual([
      { label: 'Components', value: '2', tone: 'success' },
      { label: 'Incidents', value: '1', tone: 'warning' },
      { label: 'Org state', value: 'Some Systems Abnormal' }
    ]);
  });

  it('builds component rows', () => {
    expect(
      buildStatusRows(
        'component',
        [{ name: 'API', description: 'public api', state: 0, gmtUpdate: 1712730000000 }] as any,
        { content: [] } as any,
        t,
        () => '2026-04-10 18:00:00'
      )
    ).toEqual([
      { title: 'API', copy: 'public api', meta: 'Normal · 2026-04-10 18:00:00' }
    ]);
  });

  it('builds selectable component evidence rows', () => {
    expect(
      buildStatusComponentEvidenceRows(
        [{ id: 7, name: 'API', description: 'public api', state: 0, gmtUpdate: 1712730000000 }] as any,
        t,
        () => '2026-04-10 18:00:00'
      )
    ).toEqual([
      { key: '7', title: 'API', copy: 'public api', meta: 'Normal · 2026-04-10 18:00:00' }
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
        () => '2026-04-10 18:00:00'
      )
    ).toEqual([
      {
        key: '9',
        title: 'API degraded',
        copy: 'Investigating payment latency',
        meta: 'Identified · Components 1 · 2026-04-10 18:00:00'
      }
    ]);

    expect(
      buildStatusIncidentDraft({
        id: 9,
        orgId: 1,
        name: 'API degraded',
        state: 1,
        components: [{ id: 7 }, { id: 8 }],
        contents: [{ message: 'Investigating', state: 1, timestamp: 10 }]
      } as any)
    ).toEqual({
      id: 9,
      orgId: 1,
      name: 'API degraded',
      state: '1',
      componentIdsText: '7, 8',
      message: 'Investigating',
      existingContents: [{ message: 'Investigating', state: 1, timestamp: 10 }],
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

    expect(validateStatusIncidentDraft({ name: '', state: '0', componentIdsText: '', message: '' }, t)).toBe('Incident name is required');
    expect(validateStatusIncidentDraft({ name: 'API degraded', state: '0', componentIdsText: '', message: '' }, t)).toBe('At least one component id is required');
    expect(validateStatusIncidentDraft({ name: 'API degraded', state: '0', componentIdsText: '7', message: '' }, t)).toBe('Incident message is required');
    expect(validateStatusIncidentDraft({ name: 'API degraded', state: '0', componentIdsText: '7', message: 'Investigating' }, t)).toBeNull();
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
        () => '2026-04-10 18:00:00'
      )
    ).toEqual([
      {
        title: 'HB Status',
        copy: 'Configure the public org information shown on the status page.',
        meta: 'All Systems Operational'
      },
      {
        title: 'Feedback',
        copy: 'https://hertzbeat.apache.org · mailto:ops@hertzbeat.apache.org',
        meta: '2026-04-10 18:00:00'
      }
    ]);

    expect(buildStatusFacts({ name: 'HB 状态页' } as any, [{}] as any, { totalElements: 1 } as any, zhT)).toEqual([
      { label: '工作区', value: '状态页设置' },
      { label: '组织档案', value: 'HB 状态页' },
      { label: '组件数', value: '1' },
      { label: '事件数', value: '1' }
    ]);

    expect(buildStatusMetrics([{ id: 1 }] as any, { totalElements: 1 } as any, { state: 1 } as any, zhT)).toEqual([
      { label: '组件', value: '1', tone: 'success' },
      { label: '事件', value: '1', tone: 'warning' },
      { label: '组织状态', value: '部分系统运行异常' }
    ]);

    expect(
      buildStatusIncidentEvidenceRows(
        {
          content: [{
            id: 9,
            name: '支付接口抖动',
            state: 1,
            components: [{ id: 7 }],
            contents: [{ message: '正在排查', state: 1, timestamp: 10 }],
            gmtUpdate: 1712730000000
          }],
          totalElements: 1
        } as any,
        zhT,
        () => '2026-04-10 18:00:00'
      )
    ).toEqual([
      {
        key: '9',
        title: '支付接口抖动',
        copy: '正在排查',
        meta: '已确认 · 组件 1 · 2026-04-10 18:00:00'
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

    expect(validateStatusOrgDraft(buildStatusOrgDraft(null), t)).toBe('Org name is required');
    expect(validateStatusOrgDraft({ ...buildStatusOrgDraft(null), name: 'HB' }, t)).toBe('Org description is required');
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

    expect(validateStatusComponentDraft(buildStatusComponentDraft(null), t)).toBe('Component name is required');
    expect(validateStatusComponentDraft({ ...buildStatusComponentDraft(null), name: 'API' }, t)).toBe('Component description is required');
    expect(validateStatusComponentDraft({ ...buildStatusComponentDraft(null), name: 'API', description: 'public api' }, t)).toBeNull();
  });
});
