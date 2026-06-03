import { describe, expect, it, vi } from 'vitest';
import { buildOpsFacts, buildOpsStatusRows } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('ops surface view model', () => {
  it('builds ops facts', () => {
    const focus = 'Entry workspace';

    expect(buildOpsFacts('Actions', focus, ['workflow', 'queue'], t)).toEqual([
      { label: t('common.workspace'), value: 'actions' },
      { label: t('ops.surface.fact.focus-label'), value: focus },
      { label: t('ops.surface.fact.mode-label'), value: t('ops.surface.fact.mode-entry') },
      { label: t('ops.surface.fact.signals-label'), value: '2' }
    ]);
  });

  it('builds shared status rows', () => {
    expect(buildOpsStatusRows(t)).toEqual([
      { title: t('ops.surface.shared-shell.title'), copy: t('ops.surface.shared-shell.copy') },
      { title: t('ops.surface.focused-scope.title'), copy: t('ops.surface.focused-scope.copy') }
    ]);
  });
});
