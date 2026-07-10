// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../../test/i18n-test-helper';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
const mockSearchParams = vi.hoisted(() => ({
  value: new URLSearchParams()
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams.value
}));

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
  SettingsFormField: ({ label, children, help, requirement, inputMode }: any) => (
    <label data-settings-form-field="cold-form-field" data-settings-form-label={label}>
      <span>{label}</span>
      {help ? (
        <span data-settings-form-field-help="hertzbeat-ui-field-tooltip" aria-label={help.label}>
          <span>{help.body}</span>
          <span>{help.impact}</span>
        </span>
      ) : null}
      {requirement ? (
        <span data-settings-form-field-requirement={requirement.tone}>{requirement.label}</span>
      ) : null}
      {inputMode ? (
        <span data-settings-form-field-input-mode={inputMode.mode}>{inputMode.label}</span>
      ) : null}
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
  SettingsFormActionHelp: ({ id, label, body, impact }: any) => (
    <span data-settings-form-action-help={id} aria-label={label}>
      <span>{body}</span>
      <span>{impact}</span>
    </span>
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

vi.mock('@hertzbeat/ui', () => ({
  HzInlineFeedback: ({ title, description, ...props }: any) => (
    <div data-hz-ui="inline-feedback" {...props}>
      {title}
      {description}
    </div>
  )
}));

describe('setting config page', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    mockState.lastLoad = null;
    apiMessageGet.mockReset()
      .mockResolvedValueOnce(mockState.renderData.config)
      .mockResolvedValueOnce(mockState.renderData.timezones);
    apiMessagePost.mockReset();
    setLocale.mockClear();
    mockSearchParams.value = new URLSearchParams();
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    container?.remove();
    root = null;
    container = null;
  });

  function setControlledSelectValue(select: HTMLSelectElement, value: string) {
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
    valueSetter?.call(select, value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  it('renders the constrained locale, timezone, and theme selectors on the shared settings console contract', async () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    const { default: SettingConfigPage } = await import('./page');
    const html = renderToStaticMarkup(<SettingConfigPage />);

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain(`data-loading-copy="${t('setting.settings.config.loading')}"`);
    expect(html).toContain('data-settings-console-title="true"');
    expect(html).toContain(t('settings.system-config'));
    expect(html).toContain('data-setting-config-surface="otlp-hertzbeat-ui-system-config"');
    expect(html).toContain('data-setting-config-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-setting-config-layout="full-width-settings-form"');
    expect(html).toContain('data-setting-config-form="hertzbeat-ui-settings-form"');
    expect(html).toContain('data-setting-config-form-nesting-contract="flat-inside-settings-console-content"');
    expect(html).toContain('class="min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"');
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
    expect(html.match(/data-settings-form-field-help="hertzbeat-ui-field-tooltip"/g) ?? []).toHaveLength(3);
    expect(html.match(/data-settings-form-field-requirement="required"/g) ?? []).toHaveLength(3);
    expect(html.match(/data-settings-form-field-requirement="optional"/g) ?? []).toHaveLength(0);
    expect(html.match(/data-settings-form-field-input-mode="selection"/g) ?? []).toHaveLength(3);
    expect(html.match(/data-settings-form-field-input-mode="manual"/g) ?? []).toHaveLength(0);
    expect(html).toContain(t('settings.form.field.requirement.required'));
    expect(html).toContain(t('settings.form.field.input-mode.selection'));
    expect(html).toContain('data-setting-config-actions="standard-equal-buttons"');
    expect(html).toContain('data-setting-config-command-action="discard"');
    expect(html).toContain('data-setting-config-command-action="apply"');
    expect(html).toContain('data-settings-form-action-help="system-config-apply"');
    expect(html).toContain('data-settings-form-action-help="system-config-discard"');
    expect(html).toContain(t('settings.system-config.action.apply.help'));
    expect(html).toContain(t('settings.system-config.action.apply.impact'));
    expect(html).toContain(t('settings.system-config.action.discard'));
    expect(html).toContain(t('settings.system-config.action.discard.help'));
    expect(html).toContain(t('settings.system-config.action.discard.impact'));
    expect(html).toContain('data-settings-form-owner="cold-settings-form-owner"');
    expect(html).toContain(t('settings.system-config.locale'));
    expect(html).toContain(t('settings.system-config.timezone'));
    expect(html).toContain(t('settings.system-config.theme'));
    expect(html).toContain(t('settings.system-config.locale.help'));
    expect(html).toContain(t('settings.system-config.locale.impact'));
    expect(html).toContain(t('settings.system-config.timezone.help'));
    expect(html).toContain(t('settings.system-config.timezone.impact'));
    expect(html).toContain(t('settings.system-config.theme.help'));
    expect(html).toContain(t('settings.system-config.theme.impact'));
    expect(html).toContain(t('settings.system-config.locale.en_US'));
    expect(html).toContain(t('settings.system-config.locale.zh_CN'));
    expect(html).toContain(t('settings.system-config.theme.dark'));
    expect(html).toContain(t('settings.system-config.theme.compact'));
    expect(html).toContain('Asia/Shanghai (+08:00) Shanghai');
    expect(html).toContain(t('settings.system-config.ok'));
    expect(html).not.toContain('data-setting-config-surface="angular-system-config"');
    expect(html).not.toContain('data-setting-config-form="angular-vertical-form"');
    expect(html).not.toContain('data-setting-config-summary-rail=');
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

  it('explains the MCP compatibility focus when users enter through the MCP settings route', async () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    mockSearchParams.value = new URLSearchParams('focus=mcp');
    const { default: SettingConfigPage } = await import('./page');
    const html = renderToStaticMarkup(<SettingConfigPage />);

    expect(html).toContain('data-setting-config-focus-feedback="mcp-compat-route"');
    expect(html).toContain('data-setting-config-focus-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain(t('settings.system-config.mcp-focus.title'));
    expect(html).toContain(t('settings.system-config.mcp-focus.description'));
  });

  it('keeps the save path on the Angular apply notification and reload contract', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/setting/settings/config/setting-config-page.tsx'), 'utf8');

    expect(source).toContain("t('common.notify.apply-success')");
    expect(source).toContain("t('common.notify.apply-fail')");
    expect(source).toContain('readAndClearSystemConfigApplyFeedback');
    expect(source).toContain("writeSystemConfigApplyFeedback(applySuccessMessage, 'success')");
    expect(source).toContain('data-setting-config-apply-contract="angular-apply-notify-reload"');
    expect(source).toContain('data-setting-config-form-nesting-contract="flat-inside-settings-console-content"');
    expect(source).toContain('className="min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"');
    expect(source).toContain('data-setting-config-runtime-locale="underscore-to-hyphen"');
    expect(source).toContain('data-setting-config-select-contract="angular-400px-centered-bold"');
    expect(source).toContain('data-setting-config-discard="local-draft-reset"');
    expect(source).toContain('data-setting-config-command-action="discard"');
    expect(source).toContain('data-setting-config-command-action="apply"');
    expect(source).toContain('data-setting-config-discard-dirty={isDirty ?');
    expect(source).toContain('data-setting-config-discard-disabled-reason={!isDirty ?');
    expect(source).toContain('function systemConfigDiscardHelp');
    expect(source).toContain('systemConfigDiscardHelp(t)');
    expect(source).toContain("t('settings.system-config.action.discard')");
    expect(source).toContain("t('settings.system-config.action.discard.help')");
    expect(source).toContain("t('settings.system-config.action.discard.impact')");
    expect(source).toContain('disabled={saving || !isDirty}');
    expect(source).toContain('setDraft(null);');
    expect(source).toContain('setSaveMessage(null);');
    expect(source).toContain('setSaveTone(null);');
    expect(source).toContain('systemConfigFieldHelp');
    expect(source).toContain('systemConfigApplyHelp');
    expect(source).toContain('function systemConfigRequirement');
    expect(source).toContain('function systemConfigInputMode');
    expect(source).toContain("t(`settings.form.field.requirement.${tone}`)");
    expect(source).toContain("t(`settings.form.field.input-mode.${mode}`)");
    expect(source).toContain("requirement={systemConfigRequirement(t, 'required')}");
    expect(source).toContain("inputMode={systemConfigInputMode(t, 'selection')}");
    expect(source).toContain("t('settings.system-config.field.help-aria'");
    expect(source).toContain("t('settings.system-config.action.help-aria'");
    expect(source).toContain('SettingsFormActionHelp id="system-config-apply"');
    expect(source).toContain('data-setting-config-timezone-search-contract="angular-nz-show-search"');
    expect(source).toContain('data-setting-config-timezone-dropdown-width-contract="angular-dropdown-match-select-width-false"');
    expect(source).toContain('searchable');
    expect(source).toContain('data-setting-config-apply-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('reloadWorkbenchWindow(window.location);');
  });

  it('blocks unchanged system config saves and enables save after a real change', async () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    const { default: SettingConfigPage } = await import('./page');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<SettingConfigPage />);
      await Promise.resolve();
    });

    const unchangedSave = container.querySelector<HTMLButtonElement>('[data-setting-config-command-action="apply"]');
    expect(unchangedSave?.disabled).toBe(true);
    expect(unchangedSave?.getAttribute('data-setting-config-save-dirty')).toBe('unchanged');
    expect(unchangedSave?.getAttribute('data-setting-config-save-disabled-reason')).toBe('unchanged');
    expect(container.querySelector('[data-setting-config-unchanged-feedback]')?.textContent).toContain(
      t('settings.system-config.no-changes')
    );

    await act(async () => {
      unchangedSave?.click();
      await Promise.resolve();
    });
    expect(apiMessagePost).not.toHaveBeenCalled();

    const timezoneSelect = container.querySelector<HTMLSelectElement>('[data-setting-config-select-kind="timezone"]');
    expect(timezoneSelect).not.toBeNull();
    await act(async () => {
      setControlledSelectValue(timezoneSelect as HTMLSelectElement, 'UTC');
      await Promise.resolve();
    });

    const changedSave = container.querySelector<HTMLButtonElement>('[data-setting-config-command-action="apply"]');
    expect(changedSave?.disabled).toBe(false);
    expect(changedSave?.getAttribute('data-setting-config-save-dirty')).toBe('changed');
    expect(changedSave?.getAttribute('data-setting-config-save-disabled-reason')).toBeNull();
    expect(container.querySelector('[data-setting-config-unchanged-feedback]')).toBeNull();

    await act(async () => {
      (container?.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(apiMessagePost).toHaveBeenCalledWith('/config/system', {
      locale: 'zh_CN',
      theme: 'dark-ops',
      timeZoneId: 'UTC'
    });
  });

  it('lets a user discard an exploratory system config draft without saving', async () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    const { default: SettingConfigPage } = await import('./page');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<SettingConfigPage />);
      await Promise.resolve();
    });

    const discardButton = container.querySelector<HTMLButtonElement>('[data-setting-config-command-action="discard"]');
    expect(discardButton?.disabled).toBe(true);
    expect(discardButton?.getAttribute('data-setting-config-discard-dirty')).toBe('unchanged');
    expect(discardButton?.getAttribute('data-setting-config-discard-disabled-reason')).toBe('unchanged');

    const themeSelect = container.querySelector<HTMLSelectElement>('[data-setting-config-select-kind="theme"]');
    expect(themeSelect).not.toBeNull();
    await act(async () => {
      setControlledSelectValue(themeSelect as HTMLSelectElement, 'light-ops');
      await Promise.resolve();
    });

    const changedDiscardButton = container.querySelector<HTMLButtonElement>('[data-setting-config-command-action="discard"]');
    expect(changedDiscardButton?.disabled).toBe(false);
    expect(changedDiscardButton?.getAttribute('data-setting-config-discard-dirty')).toBe('changed');
    expect(container.querySelector<HTMLSelectElement>('[data-setting-config-select-kind="theme"]')?.value).toBe('light-ops');

    await act(async () => {
      changedDiscardButton?.click();
      await Promise.resolve();
    });

    expect(container.querySelector<HTMLSelectElement>('[data-setting-config-select-kind="theme"]')?.value).toBe('dark-ops');
    expect(container.querySelector<HTMLButtonElement>('[data-setting-config-command-action="discard"]')?.disabled).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('[data-setting-config-command-action="apply"]')?.disabled).toBe(true);
    expect(container.querySelector('[data-setting-config-unchanged-feedback]')?.textContent).toContain(
      t('settings.system-config.no-changes')
    );
    expect(apiMessagePost).not.toHaveBeenCalled();
  });

  it('keeps the changed system config draft visible when apply fails', async () => {
    apiMessagePost.mockRejectedValueOnce(new Error('backend refused config'));
    const { default: SettingConfigPage } = await import('./page');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<SettingConfigPage />);
      await Promise.resolve();
    });

    const themeSelect = container.querySelector<HTMLSelectElement>('[data-setting-config-select-kind="theme"]');
    expect(themeSelect).not.toBeNull();
    await act(async () => {
      setControlledSelectValue(themeSelect as HTMLSelectElement, 'light-ops');
      await Promise.resolve();
    });

    await act(async () => {
      (container?.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(apiMessagePost).toHaveBeenCalledWith('/config/system', {
      locale: 'zh_CN',
      theme: 'light-ops',
      timeZoneId: 'Asia/Shanghai'
    });
    expect(container.querySelector<HTMLSelectElement>('[data-setting-config-select-kind="theme"]')?.value).toBe('light-ops');
    expect(container.querySelector('[data-setting-config-apply-feedback="angular-apply-notify"]')?.textContent).toContain('backend refused config');
    expect(container.querySelector<HTMLButtonElement>('[data-setting-config-command-action="discard"]')?.disabled).toBe(false);
    expect(container.querySelector<HTMLButtonElement>('[data-setting-config-command-action="apply"]')?.disabled).toBe(false);
  });
});
