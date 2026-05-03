import { describe, expect, it, vi } from 'vitest';
import { buildLabelRows, statusLabel } from './display-mapping';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('monitor display mapping', () => {
  it('maps status values to display labels', () => {
    expect(statusLabel(1, t)).toBe('运行中');
    expect(statusLabel(2, t)).toBe('异常');
    expect(statusLabel(0, t)).toBe('已暂停');
  });

  it('maps labels into row objects', () => {
    expect(buildLabelRows({ region: 'cn', team: 'ops' }, t)).toEqual([
      { title: 'region', copy: 'cn', meta: 'label' },
      { title: 'team', copy: 'ops', meta: 'label' }
    ]);
  });
});
