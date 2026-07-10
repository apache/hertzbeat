// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../../test/i18n-test-helper';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    email: {
      emailHost: 'smtp.example.com',
      emailPort: 587,
      emailUsername: 'ops',
      emailPassword: 'hidden',
      emailSsl: true,
      emailStarttls: false,
      enable: true
    },
    sms: {
      type: 'tencent',
      enable: false,
      tencent: {
        secretId: 'old-id',
        secretKey: 'old-key',
        signName: 'old-sign',
        appId: '10001',
        templateId: 'tpl-old'
      }
    }
  }
}));

const apiMessageGet = vi.hoisted(() => vi.fn());
const apiMessagePost = vi.hoisted(() => vi.fn());

vi.mock('../../../../components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({ locale: 'zh-CN' })
  })
}));

vi.mock('../../../../components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load,
    loadingCopy
  }: {
    children: (data: unknown) => React.ReactNode;
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

vi.mock('../../../../components/settings/settings-summary-list', () => ({
  SettingsSummaryList: ({
    className,
    items
  }: {
    className?: string;
    items: Array<{
      key: string;
      title: React.ReactNode;
      lines: React.ReactNode[];
      actionLabel: string;
      actionAriaLabel?: string;
      actionHelp?: { label: string; body: React.ReactNode; impact?: React.ReactNode };
      actionButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
      onAction: () => void;
    }>;
  }) => (
    <div
      data-settings-summary-list="true"
      data-settings-summary-list-owner="cold-settings-summary-owner"
      data-settings-summary-list-style="cold-dense-summary-list"
      className={className}
    >
      {items.map(item => (
        <section key={item.key} data-settings-summary-item={item.key} data-settings-summary-row-style="cold-summary-row">
          <h2>{item.title}</h2>
          <div>{item.lines.map((line, index) => <div key={`${item.key}-${index}`}>{line}</div>)}</div>
          <button
            type="button"
            data-settings-summary-action={item.key}
            data-settings-summary-action-style="cold-compact-action"
            aria-label={item.actionAriaLabel}
            {...item.actionButtonProps}
            onClick={item.onAction}
          >
            {item.actionLabel}
          </button>
          {item.actionHelp ? (
            <span data-settings-summary-action-help={item.key} aria-label={item.actionHelp.label}>
              <span>{item.actionHelp.body}</span>
              <span>{item.actionHelp.impact}</span>
            </span>
          ) : null}
        </section>
      ))}
    </div>
  )
}));

vi.mock('../../../../components/settings/settings-form', () => ({
  SettingsFormFeedback: ({ children, tone = 'info', ...props }: any) => (
    <div data-settings-form-feedback="hertzbeat-ui-settings-feedback" data-settings-form-feedback-tone={tone} {...props}>
      {children}
    </div>
  )
}));

vi.mock('../../../../components/workbench/overlay-dialog', () => ({
  OverlayDialog: ({
    open,
    title,
    footer,
    children,
    maxWidthClassName,
    overlayProps
  }: {
    open: boolean;
    title: React.ReactNode;
    footer?: React.ReactNode;
    children: React.ReactNode;
    maxWidthClassName?: string;
    overlayProps?: React.HTMLAttributes<HTMLDivElement>;
  }) => (
    <section
      data-overlay-dialog="true"
      data-open={open ? 'true' : 'false'}
      data-overlay-dialog-title={title}
      data-overlay-dialog-max-width={maxWidthClassName}
      {...overlayProps}
    >
      <header>{title}</header>
      <div>{children}</div>
      <footer>{footer}</footer>
    </section>
  )
}));

vi.mock('../../../../components/settings/settings-dialog-form', () => ({
  SettingsDialogForm: ({ children, ...props }: React.FormHTMLAttributes<HTMLFormElement>) => (
    <form data-settings-dialog-form="true" {...props}>{children}</form>
  ),
  SettingsDialogActionHelp: ({ id, label, body, impact }: any) => (
    <span data-settings-dialog-action-help={id} aria-label={label}>
      <span>{body}</span>
      <span>{impact}</span>
    </span>
  ),
  SettingsDialogField: ({
    label,
    children,
    help,
    required,
    requirement,
    inputMode
  }: {
    label: string;
    children: React.ReactNode;
    help?: { label: string; body: React.ReactNode; impact?: React.ReactNode };
    required?: boolean;
    requirement?: { tone: string; label: string };
    inputMode?: { mode: string; label: string };
  }) => (
    <label data-settings-dialog-field={label} data-settings-dialog-field-layout="angular-label-7-control-12">
      <span data-settings-dialog-label-span="7">{label}</span>
      {help ? (
        <span data-settings-dialog-field-help="hertzbeat-ui-field-tooltip" aria-label={help.label}>
          <span>{help.body}</span>
          <span>{help.impact}</span>
        </span>
      ) : null}
      {required ? (
        <span data-settings-dialog-field-required="true">*</span>
      ) : null}
      {requirement ? (
        <span data-settings-dialog-field-requirement={requirement.tone}>{requirement.label}</span>
      ) : null}
      {inputMode ? (
        <span data-settings-dialog-field-input-mode={inputMode.mode}>{inputMode.label}</span>
      ) : null}
      <div data-settings-dialog-control-span="12">{children}</div>
    </label>
  ),
  SettingsDialogInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  SettingsDialogSelect: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props}>{children}</select>
  ),
  SettingsDialogToggle: ({ checked }: { checked: boolean }) => <button type="button" role="switch" aria-checked={checked} />,
  SettingsDialogFooter: ({ children }: { children: React.ReactNode }) => <div data-settings-dialog-footer="true">{children}</div>
}));

vi.mock('../../../../components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>
}));

vi.mock('@hertzbeat/ui', () => ({
  HzInlineFeedback: ({ title, ...props }: any) => (
    <div data-hz-ui="inline-feedback" {...props}>
      {title}
    </div>
  )
}));

vi.mock('../../../../lib/api-client', () => ({
  apiMessageGet,
  apiMessagePost
}));

describe('setting server page', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    mockState.lastLoad = null;
    mockState.renderData = {
      email: {
        emailHost: 'smtp.example.com',
        emailPort: 587,
        emailUsername: 'ops',
        emailPassword: 'hidden',
        emailSsl: true,
        emailStarttls: false,
        enable: true
      },
      sms: {
        type: 'tencent',
        enable: false,
        tencent: {
          secretId: 'old-id',
          secretKey: 'old-key',
          signName: 'old-sign',
          appId: '10001',
          templateId: 'tpl-old'
        }
      }
    };
    apiMessageGet.mockReset()
      .mockResolvedValueOnce(mockState.renderData.email)
      .mockResolvedValueOnce(mockState.renderData.sms);
    apiMessagePost.mockReset();
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

  function setControlledInputValue(input: HTMLInputElement, value: string) {
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  it('renders the localized summary list and message-server dialog wiring on the shared settings console contract', async () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    const { default: SettingServerPage } = await import('./page');
    const html = renderToStaticMarkup(<SettingServerPage />);

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain(`data-loading-copy="${t('setting.settings.server.loading')}"`);
    expect(html).toContain('data-settings-console-title="true"');
    expect(html).toContain('data-settings-server-page="otlp-hertzbeat-ui-message-server"');
    expect(html).toContain('data-settings-server-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-settings-server-layout="full-width-settings-summary"');
    expect(html).toContain('data-settings-server-dialog-width-contract="angular-width-40-percent"');
    expect(html).toContain('data-settings-server-dialog-field-layout-contract="angular-label-7-control-12"');
    expect(html).toContain('data-settings-server-summary="hertzbeat-ui-summary-list"');
    expect(html).toContain('data-settings-server-summary-nesting-contract="flat-inside-settings-console-content"');
    expect(html).toContain('class="border-0 bg-transparent shadow-none"');
    expect(html).toContain('data-settings-summary-list="true"');
    expect(html).toContain('data-settings-summary-list-owner="cold-settings-summary-owner"');
    expect(html).toContain('data-settings-summary-list-style="cold-dense-summary-list"');
    expect(html).toContain('data-settings-summary-row-style="cold-summary-row"');
    expect(html).toContain('data-settings-summary-item="email"');
    expect(html).toContain('data-settings-summary-item="sms"');
    expect(html).toContain('data-settings-summary-action="email"');
    expect(html).toContain('data-settings-summary-action="sms"');
    expect(html).toContain('data-settings-server-command-action="open-email"');
    expect(html).toContain('data-settings-server-command-action="open-sms"');
    expect(html).toContain('data-settings-summary-action-help="email"');
    expect(html).toContain('data-settings-summary-action-help="sms"');
    expect(html).toContain('data-settings-summary-action-style="cold-compact-action"');
    expect(html).toContain(`aria-label="${t('settings.server.summary.configure-action', { title: t('settings.server.email') })}"`);
    expect(html).toContain(`aria-label="${t('settings.server.summary.configure-action', { title: t('settings.server.sms') })}"`);
    expect(html).toContain(t('settings.server'));
    expect(html).toContain(t('settings.server.email'));
    expect(html).toContain(t('settings.server.sms'));
    expect(html).toContain(`${t('alert.notice.sender.mail.host')}: smtp.example.com`);
    expect(html).toContain(`${t('alert.notice.sender.mail.username')}: ops`);
    expect(html).toContain(`${t('alert.notice.sender.mail.enable')}: ${t('common.yes')}`);
    expect(html).toContain(`${t('alert.notice.sender.sms.tencent.appId')}: 10001`);
    expect(html).toContain(`${t('alert.notice.sender.sms.tencent.signName')}: old-sign`);
    expect(html).toContain(`${t('common.enable')}: ${t('common.no')}`);
    expect(html).toContain(t('settings.server.action.email.configure.help'));
    expect(html).toContain(t('settings.server.action.email.configure.impact'));
    expect(html).toContain(t('settings.server.action.sms.configure.help'));
    expect(html).toContain(t('settings.server.action.sms.configure.impact'));
    expect(html).toContain(`data-overlay-dialog-title="${t('settings.server.email.setting')}"`);
    expect(html).toContain(`data-overlay-dialog-title="${t('settings.server.sms.setting')}"`);
    expect(html).toContain('data-overlay-dialog-max-width="w-[min(92vw,520px)] md:w-[40vw] md:max-w-[40vw]"');
    expect(html).toContain('data-settings-server-email-dialog-width="angular-width-40-percent"');
    expect(html).toContain('data-settings-server-email-dialog-mask="angular-mask-closable-false"');
    expect(html).toContain('data-settings-server-sms-dialog-width="angular-width-40-percent"');
    expect(html).toContain('data-settings-server-sms-dialog-mask="angular-mask-closable-false"');
    expect(html).toContain('data-settings-dialog-field-layout="angular-label-7-control-12"');
    expect(html).toContain('data-settings-dialog-label-span="7"');
    expect(html).toContain('data-settings-dialog-control-span="12"');
    expect(html.match(/data-settings-dialog-field-help="hertzbeat-ui-field-tooltip"/g) ?? []).toHaveLength(10);
    expect(html.match(/data-settings-dialog-field-required="true"/g) ?? []).toHaveLength(9);
    expect(html.match(/data-settings-dialog-field-requirement="required"/g) ?? []).toHaveLength(0);
    expect(html.match(/data-settings-dialog-field-requirement="optional"/g) ?? []).toHaveLength(0);
    expect(html.match(/data-settings-dialog-field-input-mode="manual"/g) ?? []).toHaveLength(0);
    expect(html.match(/data-settings-dialog-field-input-mode="selection"/g) ?? []).toHaveLength(0);
    expect(html).toContain('data-settings-server-email-apply-contract="angular-apply-notify"');
    expect(html).toContain('data-settings-server-sms-apply-contract="angular-apply-notify"');
    expect(html).toContain('data-settings-server-command-action="email-cancel"');
    expect(html).toContain('data-settings-server-command-action="email-save"');
    expect(html).toContain('data-settings-server-command-action="sms-cancel"');
    expect(html).toContain('data-settings-server-command-action="sms-save"');
    expect(html).toContain('data-settings-dialog-action-help="email-save"');
    expect(html).toContain('data-settings-dialog-action-help="sms-save"');
    expect(html).toContain(t('settings.server.action.email.save.help'));
    expect(html).toContain(t('settings.server.action.email.save.impact'));
    expect(html).toContain(t('settings.server.action.sms.save.help'));
    expect(html).toContain(t('settings.server.action.sms.save.impact'));
    expect(html).toContain(t('alert.notice.sender.mail.password'));
    expect(html).toContain(t('alert.notice.sender.sms.type'));
    expect(html).toContain(t('alert.notice.sender.sms.type.tencent'));
    expect(html).toContain(t('settings.server.field.email.host.help'));
    expect(html).toContain(t('settings.server.field.email.port.impact'));
    expect(html).toContain(t('settings.server.field.email.password.help'));
    expect(html).toContain(t('settings.server.field.sms.type.help'));
    expect(html).toContain(t('settings.server.field.sms.type.impact'));
    expect(html).toContain(t('settings.server.field.sms.tencent.secretId.help'));
    expect(html).toContain(t('settings.server.field.sms.tencent.secretKey.impact'));
    expect(html).toContain(t('settings.server.field.sms.tencent.templateId.help'));
    expect(html).toContain('Twilio Sms');
    expect(html).toContain(t('common.button.cancel'));
    expect(html).toContain(t('common.button.save'));
    expect(html).toContain(t('common.button.setting'));
    expect(html).not.toContain('data-settings-server-page="angular-message-server"');
    expect(html).not.toContain('data-settings-server-summary-rail=');
    expect(html).not.toContain('data-settings-summary-list-style="angular-nz-list"');
    expect(html).not.toContain('Message Server Setting');
    expect(html).not.toContain('Email Server Address');
    expect(html).not.toContain('Setting</button>');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenNthCalledWith(1, '/config/email');
    expect(apiMessageGet).toHaveBeenNthCalledWith(2, '/config/sms');
  }, 15000);

  it('keeps the server route on the cold settings-console summary owner', () => {
    const source = readFileSync(resolve(__dirname, 'setting-server-page.tsx'), 'utf8');

    expect(source).toContain('hzOpsCatalogVisual');
    expect(source).toContain('data-settings-server-page="otlp-hertzbeat-ui-message-server"');
    expect(source).toContain('data-settings-server-style-baseline={coldServerVisual.canvasName}');
    expect(source).toContain('data-settings-server-layout="full-width-settings-summary"');
    expect(source).toContain('data-settings-server-dialog-width-contract="angular-width-40-percent"');
    expect(source).toContain('data-settings-server-dialog-field-layout-contract="angular-label-7-control-12"');
    expect(source).toContain('data-settings-server-summary="hertzbeat-ui-summary-list"');
    expect(source).toContain('data-settings-server-summary-nesting-contract="flat-inside-settings-console-content"');
    expect(source).toContain('className="border-0 bg-transparent shadow-none"');
    expect(source).toContain('maxWidthClassName="w-[min(92vw,520px)] md:w-[40vw] md:max-w-[40vw]"');
    expect(source).toContain("'data-settings-server-email-dialog-width': 'angular-width-40-percent'");
    expect(source).toContain("'data-settings-server-sms-dialog-width': 'angular-width-40-percent'");
    expect(source).toContain("'data-settings-server-email-dialog-mask': 'angular-mask-closable-false'");
    expect(source).toContain("'data-settings-server-sms-dialog-mask': 'angular-mask-closable-false'");
    expect(source).toContain('data-settings-server-email-apply-contract="angular-apply-notify"');
    expect(source).toContain('data-settings-server-sms-apply-contract="angular-apply-notify"');
    expect(source).toContain("t('common.notify.apply-success')");
    expect(source).toContain("t('common.notify.apply-fail')");
    expect(source).toContain('SettingsFormFeedback');
    expect(source).toContain("tone={messageTone === 'success' ? 'success' : messageTone === 'info' ? 'info' : 'error'}");
    expect(source).toContain('data-settings-server-apply-feedback-owner="hertzbeat-ui-settings-feedback"');
    expect(source).toContain('data-settings-server-apply-feedback="angular-apply-notify"');
    expect(source).toContain('SettingsSummaryList');
    expect(source).toContain('serverSummaryActionHelp');
    expect(source).toContain('serverSaveActionHelp');
    expect(source).toContain('buildEmailSenderMissingFields(email, t)');
    expect(source).toContain('buildSmsSenderMissingFields(sms, t)');
    expect(source).toContain('data-settings-server-email-validation-summary="missing-required-fields"');
    expect(source).toContain('data-settings-server-sms-validation-summary="missing-required-fields"');
    expect(source).toContain('data-settings-server-validation-summary-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('data-settings-server-validation-summary-layout="wrapped-description"');
    expect(source).toContain('data-settings-server-email-validation-fields="wrapped-field-list"');
    expect(source).toContain('data-settings-server-sms-validation-fields="wrapped-field-list"');
    expect(source).toContain("t('settings.server.validation.required-fields-title'");
    expect(source).toContain('SettingsDialogActionHelp id="email-save"');
    expect(source).toContain('SettingsDialogActionHelp id="sms-save"');
    expect(source).toContain('serverDialogFieldHelp');
    expect(source).toContain('function serverRequiredDialogMeta');
    expect(source).not.toContain('function serverDialogRequirement');
    expect(source).not.toContain('function serverDialogInputMode');
    expect(source).not.toContain("t(`settings.form.field.requirement.${tone}`)");
    expect(source).not.toContain("t(`settings.form.field.input-mode.${mode}`)");
    expect(source).not.toContain('inputMode: serverDialogInputMode');
    expect(source).not.toContain("{...serverRequiredDialogMeta(t, 'manual')}");
    expect(source).not.toContain("{...serverRequiredDialogMeta(t, 'selection')}");
    expect(source).toContain('{...serverRequiredDialogMeta()}');
    expect(source).toContain("t('settings.server.action.help-aria'");
    expect(source).toContain("t('settings.server.field.help-aria'");
    expect(source).toContain("'sms.alibaba.accessKeySecret'");
    expect(source).toContain("'sms.unisms.authMode'");
    expect(source).toContain("'sms.smslocal.apiKey'");
    expect(source).toContain("'sms.aws.region'");
    expect(source).toContain("'sms.twilio.authToken'");
    expect(source).not.toContain('data-settings-server-summary-rail');
    expect(source).not.toContain('angular-message-server');
    expect(source).not.toContain('angular-nz-list');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('@/components/observability');
  });

  it('uses the shared cold number stepper for the email port field', async () => {
    const { default: SettingServerPage } = await import('./page');
    const html = renderToStaticMarkup(<SettingServerPage />);
    const source = readFileSync(resolve(__dirname, 'setting-server-page.tsx'), 'utf8');

    expect(source).toContain("from '../../../../components/ui/number-stepper'");
    expect(source).toContain('data-settings-server-email-port-stepper="hertzbeat-ui-number-stepper"');
    expect(source).not.toContain('type="number"');
    expect(html).toContain('data-settings-server-email-port-stepper="hertzbeat-ui-number-stepper"');
    expect(html).toContain('data-hz-number-stepper-owner="hertzbeat-ui-number-stepper"');
    expect(html).toContain('data-hz-number-stepper-input="true"');
    expect(html).toContain('data-hz-number-stepper-action="decrement"');
    expect(html).toContain('data-hz-number-stepper-action="increment"');
    expect(html).toContain('value="587"');
  });

  it('keeps message-server remounts on a short settled cache window while email and SMS saves invalidate it', () => {
    const source = readFileSync(resolve(__dirname, 'setting-server-page.tsx'), 'utf8');

    expect(source).toContain('SETTING_SERVER_SETTLED_CACHE_TTL_MS = 10_000');
    expect(source).toContain("['setting-server', '/config/email', '/config/sms', reloadVersion].join(':')");
    expect(source).toContain('void reloadVersion');
    expect(source).toContain('[reloadVersion]');
    expect(source).toContain('await saveEmailConfig(apiMessagePost, email);');
    expect(source).toContain('await saveSmsConfig(apiMessagePost, sms);');
    expect(source.match(/setReloadVersion\(version => version \+ 1\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('cacheKey={settingServerCacheKey}');
    expect(source).toContain('cacheSettledTtlMs={SETTING_SERVER_SETTLED_CACHE_TTL_MS}');
  });

  it('asks before discarding a dirty email server draft and restores the summary only after confirmation', async () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    const { default: SettingServerPage } = await import('./page');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<SettingServerPage />);
      await Promise.resolve();
    });

    const emailSummary = container.querySelector('[data-settings-summary-item="email"]');
    expect(emailSummary?.textContent).toContain(`${t('alert.notice.sender.mail.host')}: smtp.example.com`);

    const emailAction = container.querySelector<HTMLButtonElement>('[data-settings-server-command-action="open-email"]');
    expect(emailAction).not.toBeNull();
    await act(async () => {
      emailAction?.click();
      await Promise.resolve();
    });

    const emailDialog = container.querySelector<HTMLElement>('[data-settings-server-email-dialog-width="angular-width-40-percent"]');
    expect(emailDialog?.getAttribute('data-open')).toBe('true');
    const hostInput = emailDialog?.querySelector<HTMLInputElement>('input');
    expect(hostInput).not.toBeNull();

    await act(async () => {
      setControlledInputValue(hostInput as HTMLInputElement, 'smtp.cancel.invalid');
      await Promise.resolve();
    });

    expect(container.querySelector('[data-settings-summary-item="email"]')?.textContent).toContain(
      `${t('alert.notice.sender.mail.host')}: smtp.cancel.invalid`
    );

    const cancelButton = emailDialog?.querySelector<HTMLButtonElement>('[data-settings-server-command-action="email-cancel"]');
    expect(cancelButton).not.toBeUndefined();

    await act(async () => {
      cancelButton?.click();
      await Promise.resolve();
    });

    expect(container.querySelector('[data-settings-server-unsaved-cancel]')?.getAttribute('data-settings-server-unsaved-cancel-state')).toBe('email');
    expect(container.textContent).toContain(t('settings.server.email.unsaved-cancel.title'));
    expect(container.querySelector('[data-settings-summary-item="email"]')?.textContent).toContain(
      `${t('alert.notice.sender.mail.host')}: smtp.cancel.invalid`
    );
    expect(emailDialog?.getAttribute('data-open')).toBe('true');

    const keepEditingButton = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      button => button.textContent?.trim() === t('settings.server.email.unsaved-cancel.keep-editing')
    );
    expect(keepEditingButton).not.toBeUndefined();

    await act(async () => {
      keepEditingButton?.click();
      await Promise.resolve();
    });

    expect(container.querySelector('[data-settings-server-unsaved-cancel]')?.getAttribute('data-settings-server-unsaved-cancel-state')).toBe('closed');
    expect(emailDialog?.getAttribute('data-open')).toBe('true');
    expect((hostInput as HTMLInputElement).value).toBe('smtp.cancel.invalid');

    await act(async () => {
      cancelButton?.click();
      await Promise.resolve();
    });

    const discardButton = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      button => button.textContent?.trim() === t('settings.server.email.unsaved-cancel.discard')
    );
    expect(discardButton).not.toBeUndefined();

    await act(async () => {
      discardButton?.click();
      await Promise.resolve();
    });

    expect(emailDialog?.getAttribute('data-open')).toBe('false');
    expect(container.querySelector('[data-settings-server-unsaved-cancel]')?.getAttribute('data-settings-server-unsaved-cancel-state')).toBe('closed');
    expect(container.querySelector('[data-settings-summary-item="email"]')?.textContent).toContain(
      `${t('alert.notice.sender.mail.host')}: smtp.example.com`
    );
    expect(container.querySelector('[data-settings-summary-item="email"]')?.textContent).not.toContain('smtp.cancel.invalid');
    expect(apiMessagePost).not.toHaveBeenCalled();
  });

  it('asks before discarding a dirty SMS provider draft', async () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    const { default: SettingServerPage } = await import('./page');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<SettingServerPage />);
      await Promise.resolve();
    });

    const smsAction = container.querySelector<HTMLButtonElement>('[data-settings-server-command-action="open-sms"]');
    expect(smsAction).not.toBeNull();
    await act(async () => {
      smsAction?.click();
      await Promise.resolve();
    });

    const smsDialog = container.querySelector<HTMLElement>('[data-settings-server-sms-dialog-width="angular-width-40-percent"]');
    expect(smsDialog?.getAttribute('data-open')).toBe('true');
    const secretIdInput = smsDialog?.querySelector<HTMLInputElement>('input');
    expect(secretIdInput).not.toBeNull();

    await act(async () => {
      setControlledInputValue(secretIdInput as HTMLInputElement, 'new-secret-id');
      await Promise.resolve();
    });

    const cancelButton = smsDialog?.querySelector<HTMLButtonElement>('[data-settings-server-command-action="sms-cancel"]');
    expect(cancelButton).not.toBeUndefined();

    await act(async () => {
      cancelButton?.click();
      await Promise.resolve();
    });

    expect(container.querySelector('[data-settings-server-unsaved-cancel]')?.getAttribute('data-settings-server-unsaved-cancel-state')).toBe('sms');
    expect(container.textContent).toContain(t('settings.server.sms.unsaved-cancel.title'));
    expect(smsDialog?.getAttribute('data-open')).toBe('true');
    expect((secretIdInput as HTMLInputElement).value).toBe('new-secret-id');

    const discardButton = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      button => button.textContent?.trim() === t('settings.server.sms.unsaved-cancel.discard')
    );
    expect(discardButton).not.toBeUndefined();

    await act(async () => {
      discardButton?.click();
      await Promise.resolve();
    });

    expect(smsDialog?.getAttribute('data-open')).toBe('false');
    expect(container.querySelector('[data-settings-server-unsaved-cancel]')?.getAttribute('data-settings-server-unsaved-cancel-state')).toBe('closed');
    expect(container.querySelector('[data-settings-summary-item="sms"]')?.textContent).toContain(
      `${t('alert.notice.sender.sms.tencent.appId')}: 10001`
    );
    expect(apiMessagePost).not.toHaveBeenCalled();
  });

  it('blocks unchanged email saves and enables save only after a real field change', async () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    const { default: SettingServerPage } = await import('./page');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<SettingServerPage />);
      await Promise.resolve();
    });

    const emailAction = container.querySelector<HTMLButtonElement>('[data-settings-server-command-action="open-email"]');
    await act(async () => {
      emailAction?.click();
      await Promise.resolve();
    });

    const emailDialog = container.querySelector<HTMLElement>('[data-settings-server-email-dialog-width="angular-width-40-percent"]');
    const unchangedSave = emailDialog?.querySelector<HTMLButtonElement>('[data-settings-server-command-action="email-save"]');
    expect(unchangedSave?.disabled).toBe(true);
    expect(unchangedSave?.getAttribute('data-settings-server-email-save-dirty')).toBe('unchanged');
    expect(unchangedSave?.getAttribute('data-settings-server-email-save-disabled-reason')).toBe('unchanged');
    expect(emailDialog?.textContent).toContain(t('settings.server.no-changes'));
    expect(apiMessagePost).not.toHaveBeenCalled();

    const hostInput = emailDialog?.querySelector<HTMLInputElement>('input');
    await act(async () => {
      setControlledInputValue(hostInput as HTMLInputElement, 'smtp.changed.example.com');
      await Promise.resolve();
    });

    const changedSave = emailDialog?.querySelector<HTMLButtonElement>('[data-settings-server-command-action="email-save"]');
    expect(changedSave?.disabled).toBe(false);
    expect(changedSave?.getAttribute('data-settings-server-email-save-dirty')).toBe('changed');
    expect(changedSave?.getAttribute('data-settings-server-email-save-disabled-reason')).toBeNull();
  });

  it('saves a changed email server draft, closes the dialog, and shows apply feedback', async () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    apiMessagePost.mockResolvedValueOnce('ok');
    const { default: SettingServerPage } = await import('./page');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<SettingServerPage />);
      await Promise.resolve();
    });

    const emailAction = container.querySelector<HTMLButtonElement>('[data-settings-server-command-action="open-email"]');
    await act(async () => {
      emailAction?.click();
      await Promise.resolve();
    });

    const emailDialog = container.querySelector<HTMLElement>('[data-settings-server-email-dialog-width="angular-width-40-percent"]');
    const hostInput = emailDialog?.querySelector<HTMLInputElement>('input');
    await act(async () => {
      setControlledInputValue(hostInput as HTMLInputElement, 'smtp.apply.example.com');
      await Promise.resolve();
    });

    const saveButton = emailDialog?.querySelector<HTMLButtonElement>('[data-settings-server-command-action="email-save"]');
    expect(saveButton?.disabled).toBe(false);

    await act(async () => {
      saveButton?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(apiMessagePost).toHaveBeenCalledTimes(1);
    expect(apiMessagePost).toHaveBeenCalledWith('/config/email', expect.objectContaining({
      emailHost: 'smtp.apply.example.com',
      emailPort: 587,
      emailUsername: 'ops',
      emailPassword: 'hidden',
      enable: true
    }));
    expect(emailDialog?.getAttribute('data-open')).toBe('false');
    expect(container.querySelector('[data-settings-server-unsaved-cancel]')?.getAttribute('data-settings-server-unsaved-cancel-state')).toBe('closed');
    expect(container.querySelector('[data-settings-server-apply-feedback="angular-apply-notify"]')?.textContent).toContain(
      t('common.notify.apply-success')
    );
  });

  it('explains missing required fields when a clean backend config cannot be saved yet', async () => {
    const previousRenderData = mockState.renderData;
    mockState.renderData = {
      email: {
        emailHost: '',
        emailPort: undefined,
        emailUsername: '',
        emailPassword: '',
        emailSsl: true,
        emailStarttls: false,
        enable: false
      },
      sms: {
        type: 'tencent',
        enable: false,
        tencent: {
          secretId: '',
          secretKey: '',
          signName: '',
          appId: '',
          templateId: ''
        }
      }
    };

    try {
      const t = createTranslatorMock({ locale: 'zh-CN' });
      const { default: SettingServerPage } = await import('./page');
      const html = renderToStaticMarkup(<SettingServerPage />);

      expect(html).toContain('data-settings-server-email-validation-summary="missing-required-fields"');
      expect(html).toContain('data-settings-server-sms-validation-summary="missing-required-fields"');
      expect(html).toContain('data-settings-server-validation-summary-layout="wrapped-description"');
      expect(html).toContain(t('settings.server.validation.required-fields-title', { count: 4 }));
      expect(html).toContain(t('settings.server.validation.required-fields-title', { count: 5 }));
      [
        t('alert.notice.sender.mail.host'),
        t('alert.notice.sender.mail.port'),
        t('alert.notice.sender.mail.username'),
        t('alert.notice.sender.mail.password'),
        t('alert.notice.sender.sms.tencent.secretId'),
        t('alert.notice.sender.sms.tencent.secretKey'),
        t('alert.notice.sender.sms.tencent.signName'),
        t('alert.notice.sender.sms.tencent.appId'),
        t('alert.notice.sender.sms.tencent.templateId')
      ].forEach(field => {
        expect(html).toContain(field);
      });
      expect(html).toContain('data-settings-server-email-save-disabled-reason="invalid"');
      expect(html).toContain('data-settings-server-sms-save-disabled-reason="invalid"');
    } finally {
      mockState.renderData = previousRenderData;
    }
  });

  it('warns when email SSL and STARTTLS are both enabled before saving', async () => {
    const previousRenderData = mockState.renderData;
    mockState.renderData = {
      ...previousRenderData,
      email: {
        ...previousRenderData.email,
        emailSsl: true,
        emailStarttls: true
      }
    };

    try {
      const t = createTranslatorMock({ locale: 'zh-CN' });
      const { default: SettingServerPage } = await import('./page');
      const html = renderToStaticMarkup(<SettingServerPage />);

      expect(html).toContain('data-settings-server-email-tls-conflict="ssl-and-starttls-enabled"');
      expect(html).toContain('data-settings-server-email-tls-conflict-owner="hertzbeat-ui-inline-feedback"');
      expect(html).toContain(t('settings.server.email.tls-conflict.title'));
    } finally {
      mockState.renderData = previousRenderData;
    }
  });

  it('blocks unchanged SMS saves and enables save after provider credentials change', async () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    const { default: SettingServerPage } = await import('./page');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<SettingServerPage />);
      await Promise.resolve();
    });

    const smsAction = container.querySelector<HTMLButtonElement>('[data-settings-server-command-action="open-sms"]');
    await act(async () => {
      smsAction?.click();
      await Promise.resolve();
    });

    const smsDialog = container.querySelector<HTMLElement>('[data-settings-server-sms-dialog-width="angular-width-40-percent"]');
    const unchangedSave = smsDialog?.querySelector<HTMLButtonElement>('[data-settings-server-command-action="sms-save"]');
    expect(unchangedSave?.disabled).toBe(true);
    expect(unchangedSave?.getAttribute('data-settings-server-sms-save-dirty')).toBe('unchanged');
    expect(unchangedSave?.getAttribute('data-settings-server-sms-save-disabled-reason')).toBe('unchanged');
    expect(smsDialog?.textContent).toContain(t('settings.server.no-changes'));

    const smsInputs = smsDialog?.querySelectorAll<HTMLInputElement>('input');
    expect(smsInputs?.length).toBeGreaterThan(0);
    await act(async () => {
      setControlledInputValue((smsInputs as NodeListOf<HTMLInputElement>)[0], 'new-secret-id');
      await Promise.resolve();
    });

    const changedSave = smsDialog?.querySelector<HTMLButtonElement>('[data-settings-server-command-action="sms-save"]');
    expect(changedSave?.disabled).toBe(false);
    expect(changedSave?.getAttribute('data-settings-server-sms-save-dirty')).toBe('changed');
    expect(changedSave?.getAttribute('data-settings-server-sms-save-disabled-reason')).toBeNull();
  });
});
