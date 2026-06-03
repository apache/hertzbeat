import { describe, expect, it } from 'vitest';
import { resolveLocalizedText } from './localized-text';

describe('resolveLocalizedText', () => {
  it('returns locale-specific text from localized objects', () => {
    const targetHost = `${String.fromCodePoint(0x76ee, 0x6807)}Host`;
    const jaTargetHost = `${String.fromCodePoint(0x76ee, 0x6a19)}Host`;
    expect(
      resolveLocalizedText(
        { 'zh-CN': targetHost, 'en-US': 'Target Host', 'ja-JP': jaTargetHost },
        'zh-CN',
        'host'
      )
    ).toBe(targetHost);
  });

  it('falls back across supported locales and then fallback text', () => {
    expect(resolveLocalizedText({ 'en-US': 'Target Host' }, 'zh-CN', 'host')).toBe('Target Host');
    expect(resolveLocalizedText(undefined, 'zh-CN', 'host')).toBe('host');
  });
});
