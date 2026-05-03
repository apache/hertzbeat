import { describe, expect, it, vi } from 'vitest';
import { buildOpsFacts, buildOpsStatusRows } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('ops surface view model', () => {
  it('builds ops facts', () => {
    expect(buildOpsFacts('Actions', '入口工作台', ['workflow', 'queue'], t)).toEqual([
      { label: '工作区', value: 'actions' },
      { label: 'Focus', value: '入口工作台' },
      { label: 'Mode', value: 'entry surface' },
      { label: 'Signals', value: '2' }
    ]);
  });

  it('builds shared status rows', () => {
    expect(buildOpsStatusRows(t)).toEqual([
      { title: 'Shared shell', copy: '入口页沿用同一套壳层和信息层级。' },
      { title: 'Focused scope', copy: '只承接导航、上下文和下一跳。' }
    ]);
  });
});
