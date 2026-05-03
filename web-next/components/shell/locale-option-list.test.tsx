import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleOptionList } from './locale-option-list';

const t = vi.fn((key: string) => {
  const labels: Record<string, string> = {
    'settings.system-config.locale.en_US': 'English(en_US)',
    'settings.system-config.locale.zh_CN': '简体中文(zh_CN)'
  };
  return labels[key] || key;
});

vi.mock('../providers/i18n-provider', () => ({
  useI18n: () => ({ t })
}));

describe('LocaleOptionList', () => {
  beforeEach(() => {
    t.mockClear();
  });

  it('renders locale options and marks the active locale', () => {
    const html = renderToStaticMarkup(
      <LocaleOptionList
        locale="zh-CN"
        locales={[
          { code: 'en-US', labelKey: 'settings.system-config.locale.en_US', abbr: '🇬🇧' },
          { code: 'zh-CN', labelKey: 'settings.system-config.locale.zh_CN', abbr: '🇨🇳' }
        ]}
        onSelect={vi.fn()}
      />
    );

    expect(html).toContain('English(en_US)');
    expect(html).toContain('简体中文(zh_CN)');
    expect(html).toContain('✓');
    expect(t).toHaveBeenCalledWith('settings.system-config.locale.en_US');
    expect(t).toHaveBeenCalledWith('settings.system-config.locale.zh_CN');
  });
});
