import { describe, expect, it, vi } from 'vitest';
import { buildLabelRows, statusBadgeVariant, statusLabel } from './display-mapping';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('monitor display mapping', () => {
  it('maps status values to display labels', () => {
    expect(statusLabel(1, t)).toBe('正常');
    expect(statusLabel(2, t)).toBe('宕机');
    expect(statusLabel(0, t)).toBe('暂停');
  });

  it('uses runtime English fallbacks when no translator is supplied', () => {
    expect(statusLabel(1)).toBe('Up');
    expect(statusLabel(2)).toBe('Down');
    expect(statusLabel(0)).toBe('Paused');
  });

  it('maps status values to badge variants', () => {
    expect(statusBadgeVariant(1)).toBe('success');
    expect(statusBadgeVariant(2)).toBe('danger');
    expect(statusBadgeVariant(0)).toBe('default');
    expect(statusBadgeVariant(null)).toBe('default');
  });

  it('maps labels into row objects', () => {
    expect(buildLabelRows({ region: 'cn', team: 'ops' }, t)).toEqual([
      { title: 'region', copy: 'cn', meta: 'label' },
      { title: 'team', copy: 'ops', meta: 'label' }
    ]);
  });
});
