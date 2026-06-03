import { describe, expect, it } from 'vitest';
import { interpolate } from './i18n';
import { SUPPLEMENTAL_MESSAGES } from './i18n-runtime-messages';

describe('interpolate', () => {
  it('replaces double-brace placeholders', () => {
    expect(interpolate('Monitor {{name}} is {{state}}', { name: 'api', state: 'up' })).toBe('Monitor api is up');
  });

  it('replaces single-brace placeholders from Angular locale bundles', () => {
    expect(interpolate('Platform setup {percent}%', { percent: 83 })).toBe('Platform setup 83%');
  });

  it('drops placeholders when the value is missing', () => {
    expect(interpolate('Hello {name}', {})).toBe('Hello ');
  });

  it('keeps the zh-CN setup progress copy available in the Next runtime catalog', () => {
    const zhCnMessages = SUPPLEMENTAL_MESSAGES['zh-CN'] ?? {};
    const expectedHeadline =
      String.fromCodePoint(0x4f60, 0x5df2, 0x5b8c, 0x6210) +
      ' {percent}% ' +
      String.fromCodePoint(0x7684, 0x5e73, 0x53f0, 0x914d, 0x7f6e);
    expect(zhCnMessages['layout.setup.progress.headline']).toBe(expectedHeadline);
  });
});
