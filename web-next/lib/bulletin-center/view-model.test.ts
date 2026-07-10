import { describe, expect, it, vi } from 'vitest';
import { buildBulletinCurrentQueryLabel, buildBulletinFacts, buildBulletinFormDraft, buildBulletinMetricCellValues, buildBulletinMetricColumns, buildBulletinMetricsState, buildBulletinRefreshLabel, buildBulletinRefreshPresets, buildBulletinRows, buildBulletinSelectionRows, buildBulletinTabs, buildSelectedBulletinJson, pickSelectedBulletin, validateBulletinForm } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });
const formattedAt = '2026-04-10 18:00:00';
const formatAt = () => formattedAt;

describe('bulletin view model', () => {
  it('builds facts from list state and selection', () => {
    expect(buildBulletinFacts({ totalElements: 8, content: [1, 2] } as any, { name: 'Ops board' } as any, t)).toEqual([
      { label: t('common.workspace'), value: t('bulletin.facts.workspace') },
      { label: t('common.total'), value: '8' },
      { label: t('common.current-page-count'), value: '2' },
      { label: t('bulletin.facts.selected'), value: 'Ops board' }
    ]);
  });

  it('renders missing selected fact name with the localized empty fallback', () => {
    expect(buildBulletinFacts({ totalElements: 8, content: [] } as any, { name: ' ' } as any, t)).toContainEqual({
      label: t('bulletin.facts.selected'),
      value: t('common.none')
    });

    expect(buildBulletinFacts({ totalElements: 8, content: [] } as any, null, t)).toContainEqual({
      label: t('bulletin.facts.selected'),
      value: t('common.none')
    });
  });

  it('builds bulletin rows', () => {
    expect(
      buildBulletinRows(
        [
          { id: 7, name: 'Ops board', app: 'checkout', monitorIds: [1, 2], creator: 'ops', gmtUpdate: 1712730000000 }
        ] as any,
        t,
        formatAt
      )
    ).toEqual([
      {
        key: '7',
        title: 'Ops board',
        copy: `checkout · ${t('bulletin.list.monitors')} 2`,
        meta: `${formattedAt} · ${t('bulletin.list.creator')} ops`
      }
    ]);
  });

  it('builds selected bulletin summary rows', () => {
    expect(
      buildBulletinSelectionRows(
        { id: 7, name: 'Ops board', app: 'checkout', monitorIds: [1, 2], fields: { a: 1 }, gmtUpdate: 1712730000000 } as any,
        t,
        formatAt
      )
    ).toEqual([
      { title: 'Ops board', copy: `checkout · ${t('bulletin.list.monitors')} 2`, meta: 'id 7' },
      { title: t('bulletin.selected.fields'), copy: '1', meta: `${t('common.updated')} ${formattedAt}` }
    ]);
  });

  it('renders missing bulletin facts with the localized empty fallback', () => {
    expect(
      buildBulletinRows(
        [{ id: 9, name: 'Fallback board', app: ' ', monitorIds: [], creator: '' }] as any,
        t,
        formatAt
      )
    ).toEqual([
      {
        key: '9',
        title: 'Fallback board',
        copy: `${t('common.none')} · ${t('bulletin.list.monitors')} 0`,
        meta: `${formattedAt} · ${t('bulletin.list.creator')} ${t('common.none')}`
      }
    ]);

    expect(
      buildBulletinSelectionRows(
        { id: 9, name: 'Fallback board', app: ' ', monitorIds: [], fields: {} } as any,
        t,
        formatAt
      )[0]
    ).toEqual({ title: 'Fallback board', copy: `${t('common.none')} · ${t('bulletin.list.monitors')} 0`, meta: 'id 9' });

    expect(buildBulletinSelectionRows(null, t, formatAt)[0]).toEqual({
      title: t('bulletin.selected.empty.title'),
      copy: t('bulletin.selected.empty.copy'),
      meta: t('common.none')
    });
  });

  it('renders missing bulletin titles with the localized empty fallback', () => {
    expect(
      buildBulletinRows(
        [{ id: 9, name: ' ', app: 'checkout', monitorIds: [], creator: 'ops' }] as any,
        t,
        formatAt
      )[0].title
    ).toBe(t('common.none'));

    expect(
      buildBulletinSelectionRows(
        { id: 9, name: '', app: 'checkout', monitorIds: [], fields: {} } as any,
        t,
        formatAt
      )[0].title
    ).toBe(t('common.none'));
  });

  it('picks the explicit selection and falls back to the first row', () => {
    expect(pickSelectedBulletin([{ id: 7 }, { id: 8 }] as any, 8)).toEqual({ id: 8 });
    expect(pickSelectedBulletin([{ id: 7 }, { id: 8 }] as any, 99)).toEqual({ id: 7 });
    expect(pickSelectedBulletin([] as any, null)).toBeNull();
  });

  it('builds the current query label and selected bulletin json', () => {
    expect(buildBulletinCurrentQueryLabel('  ', t)).toBe(t('bulletin.search.all'));
    expect(buildBulletinCurrentQueryLabel('checkout', t)).toBe('checkout');
    expect(buildSelectedBulletinJson({ id: 7, name: 'Ops board' } as any)).toBe('{\n  "id": 7,\n  "name": "Ops board"\n}');
    expect(buildSelectedBulletinJson(null)).toBeNull();
  });

  it('builds tabs and refresh presets for the bulletin desk', () => {
    expect(buildBulletinTabs([{ id: 7, name: 'Ops board' }, { id: 8, name: 'DB board' }] as any, 8)).toEqual([
      { key: '7', label: 'Ops board', active: false },
      { key: '8', label: 'DB board', active: true }
    ]);

    expect(buildBulletinRefreshLabel(30, 12, t)).toBe(t('monitor.detail.auto-refresh', { time: 12 }));
    expect(buildBulletinRefreshLabel(-1, -1, t)).toBe(t('monitor.detail.close-refresh'));
    expect(buildBulletinRefreshPresets(30, t)).toEqual([
      { value: 10, active: false, label: t('monitor.detail.config-refresh', { time: 10 }) },
      { value: 30, active: true, label: t('monitor.detail.config-refresh', { time: 30 }) },
      { value: 60, active: false, label: t('monitor.detail.config-refresh', { time: 60 }) },
      { value: 300, active: false, label: t('monitor.detail.config-refresh', { time: 300 }) },
      { value: -1, active: false, label: t('monitor.detail.close-refresh') }
    ]);
  });

  it('builds the metrics state for data and empty/error branches', () => {
    expect(buildBulletinMetricsState({ activeMonitors: 3 } as any, null, t)).toEqual({
      kind: 'data',
      content: '{\n  "activeMonitors": 3\n}'
    });

    expect(buildBulletinMetricsState(null, null, t)).toEqual({
      kind: 'empty',
      title: t('bulletin.metrics.empty.title'),
      copy: t('bulletin.metrics.empty.copy'),
      tone: 'default'
    });

    expect(buildBulletinMetricsState(null, 'boom', t)).toEqual({
      kind: 'empty',
      title: t('bulletin.metrics.error.title'),
      copy: 'boom',
      tone: 'danger'
    });
  });

  it('builds grouped bulletin metric columns and resolves cell values', () => {
    const data = {
      content: [
        {
          monitorId: 1,
          monitorName: 'api-1',
          host: '127.0.0.1',
          metrics: [
            {
              name: 'summary',
              fields: [
                [
                  { key: 'responseTime', unit: 'ms', value: '154' },
                  { key: 'status', unit: '', value: '200' }
                ],
                [
                  { key: 'responseTime', unit: 'ms', value: '162' },
                  { key: 'status', unit: '', value: 'NO_DATA' }
                ]
              ]
            }
          ]
        }
      ]
    } as any;

    expect(buildBulletinMetricColumns(data, 'website', t)).toEqual([
      {
        key: 'summary',
        label: 'summary',
        fields: [
          { key: 'responseTime', label: 'responseTime' },
          { key: 'status', label: 'status' }
        ]
      }
    ]);

    expect(buildBulletinMetricCellValues(data.content[0], 'summary', 'responseTime')).toEqual([
      { value: '154', unit: 'ms', isNoData: false },
      { value: '162', unit: 'ms', isNoData: false }
    ]);
    expect(buildBulletinMetricCellValues(data.content[0], 'summary', 'status')).toEqual([
      { value: '200', unit: '', isNoData: false },
      { value: 'NO_DATA', unit: '', isNoData: true }
    ]);
  });

  it('builds and validates bulletin form drafts', () => {
    expect(
      buildBulletinFormDraft({ id: 7, name: 'Ops board', app: 'mysql', monitorIds: [1, 2], fields: { cpu: ['usage'] } } as any)
    ).toEqual({
      id: 7,
      name: 'Ops board',
      app: 'mysql',
      monitorIdsText: '1, 2',
      fieldsJson: '{\n  "cpu": [\n    "usage"\n  ]\n}'
    });

    expect(validateBulletinForm({ name: '', app: '', monitorIdsText: '', fieldsJson: '{}' }, t)).toBe(t('bulletin.validation.name'));
    expect(validateBulletinForm({ name: 'Ops', app: '', monitorIdsText: '', fieldsJson: '{}' }, t)).toBe(t('bulletin.validation.app'));
    expect(validateBulletinForm({ name: 'Ops', app: 'mysql', monitorIdsText: '', fieldsJson: '{}' }, t)).toBe(t('bulletin.validation.monitors'));
    expect(validateBulletinForm({ name: 'Ops', app: 'mysql', monitorIdsText: '1,2', fieldsJson: '{oops' }, t)).toBe(t('bulletin.validation.fields'));
    expect(validateBulletinForm({ name: 'Ops', app: 'mysql', monitorIdsText: '1,2', fieldsJson: '[]' }, t)).toBe(t('bulletin.validation.fields'));
    expect(validateBulletinForm({ name: 'Ops', app: 'mysql', monitorIdsText: '1,2', fieldsJson: '{}' }, t)).toBe(t('bulletin.validation.fields-empty'));
    expect(validateBulletinForm({ name: 'Ops', app: 'mysql', monitorIdsText: '1,2', fieldsJson: '{"cpu":["usage"]}' }, t)).toBeNull();
  });
});
