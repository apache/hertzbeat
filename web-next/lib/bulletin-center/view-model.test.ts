import { describe, expect, it, vi } from 'vitest';
import { buildBulletinCurrentQueryLabel, buildBulletinFacts, buildBulletinFormDraft, buildBulletinMetricCellValues, buildBulletinMetricColumns, buildBulletinMetricsState, buildBulletinRefreshLabel, buildBulletinRefreshPresets, buildBulletinRows, buildBulletinSelectionRows, buildBulletinTabs, buildSelectedBulletinJson, pickSelectedBulletin, validateBulletinForm } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('bulletin view model', () => {
  it('builds facts from list state and selection', () => {
    expect(buildBulletinFacts({ totalElements: 8, content: [1, 2] } as any, { name: 'Ops board' } as any, t)).toEqual([
      { label: '工作区', value: 'bulletin' },
      { label: '总量', value: '8' },
      { label: '当前页', value: '2' },
      { label: '当前选中', value: 'Ops board' }
    ]);
  });

  it('builds bulletin rows', () => {
    expect(
      buildBulletinRows(
        [
          { id: 7, name: 'Ops board', app: 'checkout', monitorIds: [1, 2], creator: 'ops', gmtUpdate: 1712730000000 }
        ] as any,
        t,
        () => '2026-04-10 18:00:00'
      )
    ).toEqual([
      {
        key: '7',
        title: 'Ops board',
        copy: 'checkout · monitors 2',
        meta: '2026-04-10 18:00:00 · creator ops'
      }
    ]);
  });

  it('builds selected bulletin summary rows', () => {
    expect(
      buildBulletinSelectionRows(
        { id: 7, name: 'Ops board', app: 'checkout', monitorIds: [1, 2], fields: { a: 1 }, gmtUpdate: 1712730000000 } as any,
        t,
        () => '2026-04-10 18:00:00'
      )
    ).toEqual([
      { title: 'Ops board', copy: 'checkout · monitors 2', meta: 'id 7' },
      { title: 'fields', copy: '1', meta: '更新时间 2026-04-10 18:00:00' }
    ]);
  });

  it('picks the explicit selection and falls back to the first row', () => {
    expect(pickSelectedBulletin([{ id: 7 }, { id: 8 }] as any, 8)).toEqual({ id: 8 });
    expect(pickSelectedBulletin([{ id: 7 }, { id: 8 }] as any, 99)).toEqual({ id: 7 });
    expect(pickSelectedBulletin([] as any, null)).toBeNull();
  });

  it('builds the current query label and selected bulletin json', () => {
    expect(buildBulletinCurrentQueryLabel('  ', t)).toBe('all bulletins');
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
      title: 'No metrics',
      copy: 'No metrics are available yet.',
      tone: 'default'
    });

    expect(buildBulletinMetricsState(null, 'boom', t)).toEqual({
      kind: 'empty',
      title: 'Metrics unavailable',
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

    expect(validateBulletinForm({ name: '', app: '', monitorIdsText: '', fieldsJson: '{}' }, t)).toBe('Bulletin name is required');
    expect(validateBulletinForm({ name: 'Ops', app: '', monitorIdsText: '', fieldsJson: '{}' }, t)).toBe('App is required');
    expect(validateBulletinForm({ name: 'Ops', app: 'mysql', monitorIdsText: '', fieldsJson: '{}' }, t)).toBe('At least one monitor id is required');
    expect(validateBulletinForm({ name: 'Ops', app: 'mysql', monitorIdsText: '1,2', fieldsJson: '{oops' }, t)).toBe('bulletin.validation.fields');
    expect(validateBulletinForm({ name: 'Ops', app: 'mysql', monitorIdsText: '1,2', fieldsJson: '{}' }, t)).toBeNull();
  });
});
