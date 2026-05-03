import React from 'react';
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
      locale: 'en-US',
      overrides: {
        'settings.system-config': '系统配置',
        'settings.system-config.locale': '系统语言',
        'settings.system-config.timezone': '系统时区',
        'settings.system-config.theme': '系统主题',
        'settings.system-config.ok': '确认更新',
        'settings.system-config.locale.en_US': '英语(en_US)',
        'settings.system-config.locale.zh_CN': '简体中文(zh_CN)',
        'settings.system-config.locale.zh_TW': '繁體中文(zh_TW)',
        'settings.system-config.locale.ja-JP': '日语(ja_JP)',
        'settings.system-config.locale.pt_BR': '葡萄牙语(pt_BR)',
        'settings.system-config.theme.default': '默认主题',
        'settings.system-config.theme.dark': '深色主题',
        'settings.system-config.theme.compact': '紧凑主题'
      }
    }),
    setLocale
  })
}));

vi.mock('../../../../components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
  }) => {
    mockState.lastLoad = load;
    return <div data-client-workbench="true">{children(mockState.renderData)}</div>;
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
  SettingsFormSelect: ({ children, ...props }: any) => <select data-settings-form-control="cold-select-control" {...props}>{children}</select>,
  SettingsFormActions: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SettingsFormFeedback: ({ children }: any) => <div data-settings-form-feedback="true">{children}</div>
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
    expect(html).toContain('data-settings-console-title="true"');
    expect(html).toContain('系统配置');
    expect(html).toContain('data-setting-config-surface="otlp-cold-system-config"');
    expect(html).toContain('data-setting-config-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-setting-config-layout="full-width-settings-form"');
    expect(html).toContain('data-setting-config-form="cold-settings-form"');
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
});
