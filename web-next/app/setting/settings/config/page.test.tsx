import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../../test/i18n-test-helper';

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    config: {
      locale: 'zh-CN',
      theme: 'dark',
      timeZoneId: 'Asia/Shanghai'
    },
    timezones: [
      { zoneId: 'Asia/Shanghai', offset: '+08:00', displayName: 'Shanghai' },
      { zoneId: 'UTC', offset: '+00:00', displayName: 'UTC' }
    ]
  }
}));

const apiMessageGet = vi.hoisted(() => vi.fn());
const apiMessagePost = vi.hoisted(() => vi.fn());
const setLocale = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('../../../../components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({
      locale: 'zh-CN'
    }),
    setLocale
  })
}));

vi.mock('../../../../components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load,
    loadingCopy
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
    loadingCopy?: string;
  }) => {
    mockState.lastLoad = load;
    return <div data-client-workbench="true" data-loading-copy={loadingCopy}>{children(mockState.renderData)}</div>;
  }
}));

vi.mock('../../../../components/settings/settings-console-shell', () => ({
  SettingsConsoleTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-settings-console-title="true">{children}</div>
  )
}));

vi.mock('../../../../components/settings/settings-form', () => ({
  SettingsForm: ({ children, ...props }: any) => <form data-settings-form-owner="cold-settings-form-owner" {...props}>{children}</form>,
  SettingsFormField: ({ label, children }: any) => (
    <label data-settings-form-field="cold-form-field" data-settings-form-label={label}>
      <span>{label}</span>
      {children}
    </label>
  ),
  SettingsFormSelect: ({ children, searchable, searchPlaceholder, ...props }: any) => (
    <select
      data-settings-form-control="cold-select-control"
      data-settings-form-select-width="angular-400px"
      data-settings-form-select-style="angular-centered-bold"
      data-settings-form-select-dropdown-style="angular-bold-larger"
      data-cold-select-search={searchable ? 'angular-nz-show-search' : undefined}
      data-cold-select-search-placeholder={searchPlaceholder}
      {...props}
    >
      {children}
    </select>
  ),
  SettingsFormActions: ({ children, ...props }: any) => <div {...props}>{children}</div>
}));

vi.mock('../../../../components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('../../../../lib/api-client', () => ({
  apiMessageGet,
  apiMessagePost
}));

vi.mock('../../../../lib/workbench-theme', () => ({
  applyWorkbenchTheme: vi.fn(),
  reloadWorkbenchWindow: vi.fn()
}));

describe('setting config page', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    apiMessageGet.mockReset()
      .mockResolvedValueOnce(mockState.renderData.config)
      .mockResolvedValueOnce(mockState.renderData.timezones);
    apiMessagePost.mockReset();
    setLocale.mockClear();
  });

  it('renders the constrained locale, timezone, and theme selectors on the shared settings console contract', async () => {
    const { default: SettingConfigPage } = await import('./page');
    const html = renderToStaticMarkup(<SettingConfigPage />);

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-loading-copy="正在加载系统配置。"');
    expect(html).toContain('data-settings-console-title="true"');
    expect(html).toContain('系统配置');
    expect(html).toContain('data-setting-config-surface="otlp-cold-system-config"');
    expect(html).toContain('data-setting-config-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-setting-config-layout="full-width-settings-form"');
    expect(html).toContain('data-setting-config-form="cold-settings-form"');
    expect(html).toContain('data-setting-config-apply-contract="angular-apply-notify-reload"');
    expect(html).toContain('data-setting-config-runtime-locale="underscore-to-hyphen"');
    expect(html).toContain('data-setting-config-select-contract="angular-400px-centered-bold"');
    expect(html).toContain('data-settings-form-select-width="angular-400px"');
    expect(html).toContain('data-settings-form-select-style="angular-centered-bold"');
    expect(html).toContain('data-settings-form-select-dropdown-style="angular-bold-larger"');
    expect(html).toContain('data-setting-config-timezone-search-contract="angular-nz-show-search"');
    expect(html).toContain('data-cold-select-search="angular-nz-show-search"');
    expect(html).toContain('data-setting-config-timezone-dropdown-width-contract="angular-dropdown-match-select-width-false"');
    expect(html).toContain('data-setting-config-select-kind="locale"');
    expect(html).toContain('data-setting-config-select-kind="timezone"');
    expect(html).toContain('data-setting-config-select-kind="theme"');
    expect(html).toContain('data-setting-config-actions="standard-equal-buttons"');
    expect(html).toContain('data-settings-form-owner="cold-settings-form-owner"');
    expect(html).toContain('系统语言');
    expect(html).toContain('系统时区');
    expect(html).toContain('系统主题');
    expect(html).toContain('英语(en_US)');
    expect(html).toContain('简体中文(zh_CN)');
    expect(html).toContain('深色主题');
    expect(html).toContain('紧凑主题');
    expect(html).toContain('Asia/Shanghai (+08:00) Shanghai');
    expect(html).toContain('确认更新');
    expect(html).not.toContain('data-setting-config-surface="angular-system-config"');
    expect(html).not.toContain('data-setting-config-form="angular-vertical-form"');
    expect(html).not.toContain('data-setting-config-summary-rail=');
    expect(html).not.toContain('系统配置摘要');
    expect(html).not.toContain('当前系统配置');
    expect(html).not.toContain('System Configuration');
    expect(html).not.toContain('System Language');
    expect(html).not.toContain('Save');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenNthCalledWith(1, '/config/system');
    expect(apiMessageGet).toHaveBeenNthCalledWith(2, '/config/timezones');
  });

  it('keeps setting config remounts on a short settled cache window while saves invalidate it', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/setting/settings/config/setting-config-page.tsx'), 'utf8');

    expect(source).toContain('SETTING_CONFIG_SETTLED_CACHE_TTL_MS = 10_000');
    expect(source).toContain("['setting-config', '/config/system', '/config/timezones', reloadVersion].join(':')");
    expect(source).toContain('void reloadVersion');
    expect(source).toContain('[reloadVersion]');
    expect(source).toContain('setReloadVersion(version => version + 1)');
    expect(source).toContain('cacheKey={settingConfigCacheKey}');
    expect(source).toContain('cacheSettledTtlMs={SETTING_CONFIG_SETTLED_CACHE_TTL_MS}');
  });

  it('keeps the save path on the Angular apply notification and reload contract', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/setting/settings/config/setting-config-page.tsx'), 'utf8');

    expect(source).toContain("t('common.notify.apply-success')");
    expect(source).toContain("t('common.notify.apply-fail')");
    expect(source).toContain('data-setting-config-apply-contract="angular-apply-notify-reload"');
    expect(source).toContain('data-setting-config-runtime-locale="underscore-to-hyphen"');
    expect(source).toContain('data-setting-config-select-contract="angular-400px-centered-bold"');
    expect(source).toContain('data-setting-config-timezone-search-contract="angular-nz-show-search"');
    expect(source).toContain('data-setting-config-timezone-dropdown-width-contract="angular-dropdown-match-select-width-false"');
    expect(source).toContain('searchable');
    expect(source).toContain('data-setting-config-apply-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('reload: () => reloadWorkbenchWindow(window.location)');
  });
});
