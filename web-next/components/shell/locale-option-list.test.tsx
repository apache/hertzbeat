import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { LocaleOptionList } from './locale-option-list';

const t = createTranslatorMock({ locale: 'zh-CN' });

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

    expect(html).toContain(t('settings.system-config.locale.en_US'));
    expect(html).toContain(t('settings.system-config.locale.zh_CN'));
    expect(html).toContain('✓');
    expect(html).toContain('data-hz-ui="locale-menu-option"');
    expect(html).toContain('data-hz-locale-menu-option-owner="hertzbeat-ui-locale-menu-option"');
    expect(html).toContain('data-hz-locale-menu-option-density="angular-header-locale-item"');
    expect(html).toContain('data-hz-locale-menu-option-selected="true"');
    expect(html).toContain('data-app-frame-locale-option="zh-CN"');
    expect(t).toHaveBeenCalledWith('settings.system-config.locale.en_US');
    expect(t).toHaveBeenCalledWith('settings.system-config.locale.zh_CN');
  });
});
