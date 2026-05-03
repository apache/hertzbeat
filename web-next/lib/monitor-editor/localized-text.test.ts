import { describe, expect, it } from 'vitest';
import { resolveLocalizedText } from './localized-text';

describe('resolveLocalizedText', () => {
  it('returns locale-specific text from localized objects', () => {
    expect(
      resolveLocalizedText(
        { 'zh-CN': '目标Host', 'en-US': 'Target Host', 'ja-JP': '目標ホスト' },
        'zh-CN',
        'host'
      )
    ).toBe('目标Host');
  });

  it('falls back across supported locales and then fallback text', () => {
    expect(resolveLocalizedText({ 'en-US': 'Target Host' }, 'zh-CN', 'host')).toBe('Target Host');
    expect(resolveLocalizedText(undefined, 'zh-CN', 'host')).toBe('host');
  });
});
