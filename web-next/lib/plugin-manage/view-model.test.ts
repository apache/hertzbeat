import { describe, expect, it, vi } from 'vitest';
import { buildPluginFacts, buildPluginMetrics, buildPluginRows, buildPluginTableRows } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('plugin view model', () => {
  it('builds plugin facts', () => {
    expect(buildPluginFacts({ totalElements: 8, content: [1, 2] } as any, { search: 'smtp' }, t)).toEqual([
      { label: t('common.workspace'), value: 'setting/plugins' },
      { label: t('common.total'), value: '8' },
      { label: t('common.current-page-count'), value: '2' },
      { label: t('setting.plugins.fact.query'), value: 'smtp' }
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
      { label: t('setting.plugins.metric.enabled-page'), value: '1', tone: 'success' },
      { label: t('setting.plugins.metric.disabled-page'), value: '1', tone: 'warning' },
      { label: t('setting.plugins.metric.params-page'), value: '3' }
    ]);
  });

  it('builds plugin rows', () => {
    expect(
      buildPluginRows([
        { name: 'smtp', items: [{ type: 'notice' }, { type: 'email' }], enableStatus: true, paramCount: 2 },
        { name: 'slack', items: [], enableStatus: false, paramCount: 0 }
      ] as any, t)
    ).toEqual([
      { title: 'smtp', copy: 'notice · email', meta: `${t('common.enabled')} · ${t('setting.plugins.row.params', { count: 2 })}` },
      { title: 'slack', copy: t('setting.plugins.row.item-fallback'), meta: `${t('common.disabled')} · ${t('setting.plugins.row.params', { count: 0 })}` }
    ]);
  });

  it('builds plugin table rows', () => {
    expect(
      buildPluginTableRows([
        { id: 1, name: 'smtp', items: [{ type: 'POST_ALERT' }, { type: 'POST_COLLECT' }], enableStatus: true, paramCount: 2 },
        { id: 2, name: 'slack', items: [{ type: 'POST_ALERT' }], enableStatus: false, paramCount: 0 },
        { id: 3, name: 'legacy', items: [{ type: 'POST_COLLECT' }], enableStatus: true }
      ] as any, t)
    ).toEqual([
      {
        key: '1',
        name: 'smtp',
        typeLabels: ['POST_ALERT', 'POST_COLLECT'],
        statusLabel: t('common.enabled'),
        paramCount: 2,
        canEditParams: true
      },
      {
        key: '2',
        name: 'slack',
        typeLabels: ['POST_ALERT'],
        statusLabel: t('common.disabled'),
        paramCount: 0,
        canEditParams: false
      },
      {
        key: '3',
        name: 'legacy',
        typeLabels: ['POST_COLLECT'],
        statusLabel: t('common.enabled'),
        paramCount: 0,
        canEditParams: true
      }
    ]);
  });
});
