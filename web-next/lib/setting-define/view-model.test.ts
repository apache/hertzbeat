import { describe, expect, it, vi } from 'vitest';
import { buildDefineFacts, buildDefineRows, buildPreviewRows } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('setting define view model', () => {
  it('builds facts from define list and datasource status', () => {
    expect(buildDefineFacts({ totalElements: 8, content: [1, 2, 3] } as any, { code: 0 }, t)).toEqual([
      { label: '工作区', value: 'setting/define' },
      { label: '总量', value: '8' },
      { label: '当前页', value: '3' },
      { label: '数据源', value: '就绪' }
    ]);
  });

  it('builds list rows for defines', () => {
    expect(
      buildDefineRows(
        [
          {
            id: 1,
            name: 'cpu-alert',
            type: 'realtime_metric',
            datasource: 'promql',
            enable: true,
            period: 60,
            gmtUpdate: 1712730000000
          }
        ] as any,
        t,
        () => '2026-04-10 18:00:00'
      )
    ).toEqual([
      {
        key: '1',
        title: 'cpu-alert',
        copy: '指标实时 · promql · 已启用',
        meta: '周期 60 秒 · 更新 2026-04-10 18:00:00'
      }
    ]);
  });

  it('builds preview summary rows for the selected define', () => {
    expect(
      buildPreviewRows(
        {
          name: 'cpu-alert',
          expr: 'up == 0',
          datasource: 'promql',
          type: 'realtime_metric'
        } as any,
        t
      )
    ).toEqual([
      {
        title: 'cpu-alert',
        copy: 'up == 0',
        meta: 'promql · 指标实时'
      }
    ]);
  });

  it('keeps the empty preview state in Chinese when optional translation keys are missing', () => {
    expect(buildPreviewRows(null, t)).toEqual([
      {
        title: '未选择定义',
        copy: '从左侧列表选择一条定义。',
        meta: '-'
      }
    ]);
  });
});
