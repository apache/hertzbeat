import { describe, expect, it, vi } from 'vitest';
import { buildPluginFacts, buildPluginMetrics, buildPluginRows, buildPluginTableRows } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('plugin view model', () => {
  it('builds plugin facts', () => {
    expect(buildPluginFacts({ totalElements: 8, content: [1, 2] } as any, { search: 'smtp' }, t)).toEqual([
      { label: '工作区', value: 'setting/plugins' },
      { label: '总量', value: '8' },
      { label: '当前页', value: '2' },
      { label: 'setting.plugins.fact.query', value: 'smtp' }
    ]);
  });

  it('builds plugin metrics', () => {
    expect(
      buildPluginMetrics(
        [
          { enableStatus: true, paramCount: 2 },
          { enableStatus: false, paramCount: 1 }
        ] as any,
        t
      )
    ).toEqual([
      { label: 'enabled in page', value: '1', tone: 'success' },
      { label: 'disabled in page', value: '1', tone: 'warning' },
      { label: 'params in page', value: '3' }
    ]);
  });

  it('builds plugin rows', () => {
    expect(
      buildPluginRows([
        { name: 'smtp', items: [{ type: 'notice' }, { type: 'email' }], enableStatus: true, paramCount: 2 }
      ] as any)
    ).toEqual([
      { title: 'smtp', copy: 'notice · email', meta: 'enabled · params 2' }
    ]);
  });

  it('builds plugin table rows', () => {
    expect(
      buildPluginTableRows([
        { id: 1, name: 'smtp', items: [{ type: 'POST_ALERT' }, { type: 'POST_COLLECT' }], enableStatus: true, paramCount: 2 },
        { id: 2, name: 'slack', items: [{ type: 'POST_ALERT' }], enableStatus: false, paramCount: 0 }
      ] as any)
    ).toEqual([
      {
        key: '1',
        name: 'smtp',
        typeLabels: ['POST_ALERT', 'POST_COLLECT'],
        statusLabel: 'enabled',
        paramCount: 2,
        canEditParams: true
      },
      {
        key: '2',
        name: 'slack',
        typeLabels: ['POST_ALERT'],
        statusLabel: 'disabled',
        paramCount: 0,
        canEditParams: false
      }
    ]);
  });
});
